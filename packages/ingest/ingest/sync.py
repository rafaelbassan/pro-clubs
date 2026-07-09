from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from ea_client import FC26API, MATCH_TYPES
from ingest.parser import club_summary_from_search, json_safe, parse_match


def extract_club_from_ea(
    api: FC26API,
    club_id: str,
    club_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Fetch club data from EA API without persisting."""
    details_df = api.get_club_details(club_id)
    details: Dict[str, Any] = {}
    if details_df is not None and not details_df.empty:
        details = details_df.iloc[0].to_dict()

    resolved_name = club_name or details.get("name")
    search_df = api.search_club_by_name(resolved_name) if resolved_name else None
    if search_df is None or search_df.empty:
        summary: Dict[str, Any] = {
            "club_id": club_id,
            "name": club_name or details.get("name") or club_id,
        }
    else:
        row = search_df[search_df["clubInfoclubId"].astype(str) == str(club_id)]
        if row.empty:
            row = search_df.iloc[[0]]
        else:
            row = row.iloc[[0]]
        summary = club_summary_from_search(row.iloc[0])

    if details.get("name"):
        summary["name"] = details["name"]
    stadium = details.get("customKit", {}).get("stadName") if isinstance(details.get("customKit"), dict) else None
    if stadium:
        summary["stadium"] = stadium

    all_matches: List[Dict[str, Any]] = []
    matches_by_type: Dict[str, List[Dict[str, Any]]] = {}

    for match_type in MATCH_TYPES:
        raw_list = api.fetch_matches_raw(club_id, match_type)
        parsed: List[Dict[str, Any]] = []
        for match in raw_list:
            record = parse_match(match, club_id)
            record["match_type"] = match_type
            parsed.append(record)
        matches_by_type[match_type] = parsed
        all_matches.extend(parsed)

    return {
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "club_id": club_id,
        "summary": summary,
        "details": details,
        "matches": all_matches,
        "matches_by_type": matches_by_type,
        "stats": {
            "total_matches_extracted": len(all_matches),
            "friendly_matches": len(matches_by_type.get("friendlyMatch", [])),
            "league_matches": len(matches_by_type.get("leagueMatch", [])),
            "playoff_matches": len(matches_by_type.get("playoffMatch", [])),
        },
    }


class SyncService:
    """Fetch from EA and upsert into the database."""

    def __init__(self, api: FC26API, session_factory) -> None:
        self.api = api
        self.session_factory = session_factory

    def sync_club(self, ea_club_id: str, club_name: Optional[str] = None) -> Tuple[int, int]:
        from app.db.models import Club, Match, SyncJob

        payload = extract_club_from_ea(self.api, ea_club_id, club_name)
        summary = payload["summary"]
        added = 0

        with self.session_factory() as db:
            job = SyncJob(club_ea_id=ea_club_id, status="running")
            db.add(job)
            db.flush()

            club = db.query(Club).filter(Club.ea_club_id == ea_club_id).first()
            if not club:
                club = Club(ea_club_id=ea_club_id)
                db.add(club)

            club.name = summary.get("name", club.name or ea_club_id)
            club.division = summary.get("current_division", 0)
            club.stadium = summary.get("stadium", "")
            club.summary_json = summary
            club.updated_at = datetime.now(timezone.utc)
            db.flush()

            existing_ids = {
                row[0]
                for row in db.query(Match.ea_match_id)
                .filter(Match.club_id == club.id)
                .all()
            }

            for record in payload["matches"]:
                match_id = str(record.get("match_id", ""))
                if not match_id:
                    continue

                played_at = record.get("date")
                if hasattr(played_at, "to_pydatetime"):
                    played_at = played_at.to_pydatetime()
                if played_at and played_at.tzinfo is None:
                    played_at = played_at.replace(tzinfo=timezone.utc)

                safe_record = json_safe(record)
                existing = (
                    db.query(Match)
                    .filter(Match.ea_match_id == match_id, Match.club_id == club.id)
                    .first()
                )
                if existing:
                    existing.raw_json = safe_record
                    existing.opponent_name = record.get("opponent_name", existing.opponent_name)
                    existing.club_goals = record.get("club_goals", existing.club_goals)
                    existing.opponent_goals = record.get("opponent_goals", existing.opponent_goals)
                    existing.result = record.get("result", existing.result)
                    continue
                if match_id in existing_ids:
                    continue

                db.add(
                    Match(
                        ea_match_id=match_id,
                        club_id=club.id,
                        opponent_ea_id=str(record.get("opponent_id", "")),
                        opponent_name=record.get("opponent_name", ""),
                        match_type=record.get("match_type", "unknown"),
                        played_at=played_at,
                        club_goals=record.get("club_goals", 0),
                        opponent_goals=record.get("opponent_goals", 0),
                        result=record.get("result", ""),
                        raw_json=safe_record,
                    )
                )
                existing_ids.add(match_id)
                added += 1

            total = db.query(Match).filter(Match.club_id == club.id).count()
            club.last_synced_at = datetime.now(timezone.utc)
            job.club_id = club.id
            job.status = "completed"
            job.matches_added = added
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            return added, total
