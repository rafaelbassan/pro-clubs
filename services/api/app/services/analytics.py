from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import List, Optional

from ingest.players import aggregate_squad
from sqlalchemy.orm import Session

from app.db.models import Club, ClubPlayer, Match
from shared.schemas import (
    ClubAnalytics,
    MatchBar,
    OpponentAverage,
    PlayerStats,
)


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def filter_matches(
    matches: List[Match],
    *,
    last_n: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: str = "approved",
) -> List[Match]:
    filtered = [m for m in matches if (m.status or "approved") == status]
    start = _parse_date(date_from)
    end = _parse_date(date_to)
    if start:
        filtered = [m for m in filtered if m.played_at and m.played_at >= start]
    if end:
        filtered = [m for m in filtered if m.played_at and m.played_at <= end]
    filtered = sorted(
        filtered,
        key=lambda m: m.played_at or datetime.min,
        reverse=True,
    )
    if last_n and last_n > 0:
        filtered = filtered[:last_n]
    return filtered


def _best_win_streak(matches: List[Match]) -> int:
    ordered = sorted(matches, key=lambda m: m.played_at or datetime.min)
    best = current = 0
    for match in ordered:
        if match.result == "V":
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best


def _opponent_averages(matches: List[Match]) -> List[OpponentAverage]:
    buckets: dict[str, list[Match]] = defaultdict(list)
    for match in matches:
        name = (match.opponent_name or "Unknown").strip() or "Unknown"
        buckets[name].append(match)
    rows: List[OpponentAverage] = []
    for name, group in buckets.items():
        n = len(group)
        rows.append(
            OpponentAverage(
                opponent_name=name,
                matches=n,
                avg_goals_for=round(sum(m.club_goals for m in group) / n, 1),
                avg_goals_against=round(sum(m.opponent_goals for m in group) / n, 1),
            )
        )
    rows.sort(key=lambda r: (-r.avg_goals_for, -r.matches, r.opponent_name))
    return rows[:20]


def _match_bars(matches: List[Match]) -> List[MatchBar]:
    bars: List[MatchBar] = []
    for match in sorted(matches, key=lambda m: m.played_at or datetime.min)[-15:]:
        players = (match.raw_json or {}).get("players") or []
        ratings = [float(p.get("rating") or 0) for p in players if p.get("rating")]
        avg = round(sum(ratings) / len(ratings), 2) if ratings else None
        bars.append(
            MatchBar(
                match_id=match.ea_match_id,
                date=match.played_at.isoformat() if match.played_at else None,
                score=f"{match.club_goals}-{match.opponent_goals}",
                result=match.result,
                club_goals=match.club_goals,
                opponent_goals=match.opponent_goals,
                rating=avg,
            )
        )
    return bars


def _team_pass_duel_shots(matches: List[Match]) -> tuple[float, float, float, float]:
    passes_made = pass_attempts = tackles_made = tackle_attempts = shots = 0
    for match in matches:
        for player in (match.raw_json or {}).get("players") or []:
            passes_made += int(player.get("passes_made") or 0)
            pass_attempts += int(player.get("pass_attempts") or 0)
            tackles_made += int(player.get("tackles_made") or 0)
            tackle_attempts += int(player.get("tackle_attempts") or 0)
            shots += int(player.get("shots") or 0)
    n = len(matches) or 1
    pass_acc = round(passes_made / pass_attempts * 100, 1) if pass_attempts else 0.0
    duel_acc = round(tackles_made / tackle_attempts * 100, 1) if tackle_attempts else 0.0
    shots_pg = round(shots / n, 1)
    goals = sum(m.club_goals for m in matches)
    offensiveness = round(min(100.0, (goals / n) * 20 + shots_pg * 4), 0) if matches else 0.0
    return pass_acc, duel_acc, shots_pg, offensiveness


def apply_player_overrides(db: Session, club: Club, squad: List[dict]) -> List[PlayerStats]:
    overrides = {
        p.ea_player_id: p
        for p in db.query(ClubPlayer).filter(ClubPlayer.club_id == club.id).all()
    }
    result: List[PlayerStats] = []
    for row in squad:
        override = overrides.get(row["player_id"])
        pos = row.get("pos") or ""
        is_active = True
        position_override = None
        if override:
            if override.position_override:
                pos = override.position_override
                position_override = override.position_override
            is_active = override.is_active
        result.append(
            PlayerStats(
                **{
                    **row,
                    "pos": pos,
                    "is_active": is_active,
                    "position_override": position_override,
                }
            )
        )
    return result


def build_analytics(
    db: Session,
    club: Club,
    *,
    last_n: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> ClubAnalytics:
    all_matches = (
        db.query(Match)
        .filter(Match.club_id == club.id)
        .order_by(Match.played_at.desc())
        .all()
    )
    matches = filter_matches(
        all_matches, last_n=last_n, date_from=date_from, date_to=date_to, status="approved"
    )
    wins = sum(1 for m in matches if m.result == "V")
    draws = sum(1 for m in matches if m.result == "E")
    losses = sum(1 for m in matches if m.result == "D")
    n = len(matches)
    goals_for = sum(m.club_goals for m in matches)
    goals_against = sum(m.opponent_goals for m in matches)
    clean_sheets = sum(1 for m in matches if m.opponent_goals == 0)
    pass_acc, duel_acc, shots_pg, offensiveness = _team_pass_duel_shots(matches)
    squad_raw = aggregate_squad([m.raw_json or {} for m in matches])
    squad = apply_player_overrides(db, club, squad_raw)

    return ClubAnalytics(
        wins=wins,
        draws=draws,
        losses=losses,
        matches=n,
        win_rate=round(wins / n * 100, 1) if n else 0.0,
        goals_for=goals_for,
        goals_against=goals_against,
        goal_diff=goals_for - goals_against,
        clean_sheets=clean_sheets,
        goals_per_game=round(goals_for / n, 1) if n else 0.0,
        shots_per_game=shots_pg,
        pass_accuracy=pass_acc,
        duel_accuracy=duel_acc,
        offensiveness=offensiveness,
        best_streak=_best_win_streak(matches),
        opponent_averages=_opponent_averages(matches),
        match_bars=_match_bars(matches),
        squad=squad,
    )
