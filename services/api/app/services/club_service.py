from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from ea_client import FC26API
from ingest.parser import club_summary_from_search
from ingest.players import aggregate_squad
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Club, Match
from app.services.cache import (
    get_cached_search,
    is_club_sync_cached,
    mark_club_synced,
    set_cached_search,
)
from app.services.club_repository import (
    club_to_search_result,
    is_metadata_fresh,
    search_clubs_from_db,
    upsert_club_from_search_result,
)
from shared.schemas import ClubResponse, ClubSearchResult, ClubSummary, MatchRecord, PlayerStats, ResponseMeta

api_client = FC26API()
RECENT_MATCHES_LIMIT = 5


def _match_to_record(match: Match, club: Club) -> MatchRecord:
    raw = match.raw_json or {}
    return MatchRecord(
        match_id=match.ea_match_id,
        timestamp=raw.get("timestamp"),
        date=match.played_at,
        match_type=match.match_type,
        club_id=club.ea_club_id,
        club_name=club.name,
        club_goals=match.club_goals,
        opponent_id=match.opponent_ea_id,
        opponent_name=match.opponent_name,
        opponent_goals=match.opponent_goals,
        result=match.result,
        score=f"{match.club_goals}-{match.opponent_goals}",
        stadium=club.stadium,
    )


def _stats_from_matches(matches: List[Match]) -> dict:
    if not matches:
        return {}
    return {
        "wins": sum(1 for m in matches if m.result == "V"),
        "losses": sum(1 for m in matches if m.result == "D"),
        "ties": sum(1 for m in matches if m.result == "E"),
        "games_played": len(matches),
        "goals": sum(m.club_goals for m in matches),
        "goals_against": sum(m.opponent_goals for m in matches),
        "clean_sheets": sum(1 for m in matches if m.opponent_goals == 0),
    }


def _summary_needs_db_fallback(summary_data: dict, match_count: int) -> bool:
    if match_count == 0:
        return False
    return (
        summary_data.get("wins", 0) == 0
        and summary_data.get("losses", 0) == 0
        and summary_data.get("ties", 0) == 0
    )


def _search_clubs_from_ea(query: str, limit: int = 10) -> List[ClubSearchResult]:
    df = api_client.search_club_by_name(query, limit=limit)
    if api_client.last_error:
        raise RuntimeError(f"EA API indisponível: {api_client.last_error}")
    if df is None or df.empty:
        return []
    results: List[ClubSearchResult] = []
    for _, row in df.iterrows():
        summary = club_summary_from_search(row)
        results.append(
            ClubSearchResult(
                club_id=summary["club_id"],
                name=summary["name"],
                current_division=summary.get("current_division", 0),
                wins=summary.get("wins", 0),
                losses=summary.get("losses", 0),
                ties=summary.get("ties", 0),
                platform=summary.get("platform", "common-gen5"),
            )
        )
    return results


def _db_search_is_fresh(db: Session, results: List[ClubSearchResult], now: datetime) -> bool:
    if not results:
        return False
    for result in results:
        club = db.query(Club).filter(Club.ea_club_id == result.club_id).first()
        if not club or not is_metadata_fresh(club, settings.search_cache_ttl_seconds, now):
            return False
    return True


def search_clubs(db: Session, query: str, limit: int = 10) -> List[ClubSearchResult]:
    """Search clubs: Redis → DB → EA, with upsert on stale metadata."""
    cached = get_cached_search(query, limit)
    if cached is not None:
        return cached

    now = datetime.now(timezone.utc)
    db_results = search_clubs_from_db(db, query, limit)

    if db_results and _db_search_is_fresh(db, db_results, now):
        results = db_results[:limit]
        set_cached_search(query, limit, results, settings.search_cache_ttl_seconds)
        return results

    ea_results = _search_clubs_from_ea(query, limit)
    for result in ea_results:
        upsert_club_from_search_result(db, result)
    db.commit()

    if not ea_results:
        results = db_results[:limit]
        set_cached_search(query, limit, results, settings.search_cache_ttl_seconds)
        return results

    seen = {result.club_id for result in ea_results}
    merged = ea_results + [result for result in db_results if result.club_id not in seen]
    results = merged[:limit]
    set_cached_search(query, limit, results, settings.search_cache_ttl_seconds)
    return results


def _matches_need_player_backfill(db: Session, club: Club) -> bool:
    matches = db.query(Match).filter(Match.club_id == club.id).limit(50).all()
    if not matches:
        return False
    return any(not (m.raw_json or {}).get("players") for m in matches)


def _sync_is_stale(last_synced_at: Optional[datetime], ttl_seconds: int, now: datetime) -> bool:
    if last_synced_at is None:
        return True
    synced = last_synced_at
    if synced.tzinfo is None:
        synced = synced.replace(tzinfo=timezone.utc)
    return (now - synced).total_seconds() > ttl_seconds


def get_or_sync_club(db: Session, ea_club_id: str) -> Club:
    """Load club from DB; sync recent matches from EA only when cache is stale."""
    club = db.query(Club).filter(Club.ea_club_id == ea_club_id).first()
    now = datetime.now(timezone.utc)

    match_count = 0
    if club:
        match_count = db.query(Match).filter(Match.club_id == club.id).count()

    summary_stale = club and _summary_needs_db_fallback(club.summary_json or {}, match_count)
    players_stale = club and _matches_need_player_backfill(db, club)

    needs_sync = (
        club is None
        or not club.name
        or club.name == ea_club_id
        or match_count == 0
        or summary_stale
        or players_stale
        or (
            not is_club_sync_cached(ea_club_id)
            and _sync_is_stale(club.last_synced_at if club else None, settings.cache_ttl_seconds, now)
        )
    )
    if needs_sync:
        from ingest.sync import SyncService
        from app.db.session import SessionLocal

        existing_name = club.name if club and club.name and club.name != ea_club_id else None
        sync = SyncService(api_client, SessionLocal)
        sync.sync_club(ea_club_id, club_name=existing_name)
        db.expire_all()
        club = db.query(Club).filter(Club.ea_club_id == ea_club_id).first()
        if club:
            club.last_synced_at = now
            db.commit()
            db.refresh(club)
            mark_club_synced(ea_club_id, settings.cache_ttl_seconds)
    if not club:
        raise ValueError(f"Club {ea_club_id} not found")
    return club


def build_club_response(
    db: Session,
    ea_club_id: str,
    *,
    authenticated: bool = False,
    history: bool = False,
    auto_sync: bool = True,
) -> ClubResponse:
    if auto_sync:
        club = get_or_sync_club(db, ea_club_id)
    else:
        club = db.query(Club).filter(Club.ea_club_id == ea_club_id).first()
        if not club:
            raise ValueError(f"Club {ea_club_id} not found")

    all_db_matches = (
        db.query(Match)
        .filter(Match.club_id == club.id)
        .order_by(Match.played_at.desc())
        .all()
    )
    total = len(all_db_matches)

    summary_data = dict(club.summary_json or {})
    db_stats = _stats_from_matches(all_db_matches)
    if db_stats:
        summary_data.update(db_stats)
    elif _summary_needs_db_fallback(summary_data, total):
        summary_data.update(db_stats)

    summary = ClubSummary(
        club_id=club.ea_club_id,
        name=club.name or summary_data.get("name", ea_club_id),
        wins=summary_data.get("wins", 0),
        losses=summary_data.get("losses", 0),
        ties=summary_data.get("ties", 0),
        games_played=summary_data.get("games_played", 0) or total,
        goals=summary_data.get("goals", 0),
        goals_against=summary_data.get("goals_against", 0),
        clean_sheets=summary_data.get("clean_sheets", 0),
        points=summary_data.get("points", 0),
        current_division=club.division or summary_data.get("current_division", 0),
        best_division=summary_data.get("best_division", 0),
        reputation_tier=summary_data.get("reputation_tier", 0),
        promotions=summary_data.get("promotions", 0),
        relegations=summary_data.get("relegations", 0),
        stadium=club.stadium or summary_data.get("stadium", ""),
        platform=summary_data.get("platform", "common-gen5"),
    )

    if history and authenticated:
        display_matches = all_db_matches
        filtered_to = None
        tier = "authenticated"
    else:
        display_matches = all_db_matches[:RECENT_MATCHES_LIMIT]
        filtered_to = "last_5"
        tier = "free"

    matches = [_match_to_record(m, club) for m in display_matches]

    squad_raw = aggregate_squad([m.raw_json or {} for m in all_db_matches])
    squad = [PlayerStats(**player) for player in squad_raw]

    return ClubResponse(
        club_id=club.ea_club_id,
        summary=summary,
        details={},
        matches=matches,
        squad=squad,
        meta=ResponseMeta(
            tier=tier,
            filtered_to=filtered_to,
            last_synced_at=club.last_synced_at,
            total_matches=total,
        ),
    )
