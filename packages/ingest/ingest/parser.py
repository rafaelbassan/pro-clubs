from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def json_safe(value: Any) -> Any:
    """Convert pandas/numpy types to JSON-serializable values."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(v) for v in value]
    if pd.isna(value):
        return None
    return value


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_player(player_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    game_time = to_int(data.get("gameTime")) or to_int(data.get("secondsPlayed"))
    return {
        "player_id": str(player_id),
        "name": data.get("playername", ""),
        "pos": data.get("pos", ""),
        "rating": to_float(data.get("rating")),
        "goals": to_int(data.get("goals")),
        "assists": to_int(data.get("assists")),
        "passes_made": to_int(data.get("passesmade")),
        "pass_attempts": to_int(data.get("passattempts")),
        "tackles_made": to_int(data.get("tacklesmade")),
        "tackle_attempts": to_int(data.get("tackleattempts")),
        "saves": to_int(data.get("saves")),
        "shots": to_int(data.get("shots")),
        "mom": to_int(data.get("mom")),
        "game_time": game_time,
        "red_cards": to_int(data.get("redcards")),
    }


def extract_club_players(match: Dict[str, Any], club_id: str) -> List[Dict[str, Any]]:
    """Extract per-player stats for a club from a raw EA match payload."""
    players_block = match.get("players", {})
    club_players = players_block.get(str(club_id), {})
    result: List[Dict[str, Any]] = []
    for player_id, pdata in club_players.items():
        if not isinstance(pdata, dict):
            continue
        player = parse_player(str(player_id), pdata)
        if player["game_time"] <= 0 and player["goals"] == 0 and player["assists"] == 0:
            continue
        result.append(player)
    return result


def parse_match(match: Dict[str, Any], focus_club_id: str) -> Dict[str, Any]:
    """Transform a raw match record into tabular format."""
    clubs = match.get("clubs", {})
    club_ids = list(clubs.keys())[:2]
    home_id = club_ids[0] if club_ids else ""
    away_id = club_ids[1] if len(club_ids) > 1 else ""

    focus = clubs.get(str(focus_club_id), clubs.get(home_id, {}))
    opponent_id = away_id if str(home_id) == str(focus_club_id) else home_id
    opponent = clubs.get(str(opponent_id), {})

    club_goals = to_int(focus.get("goals"))
    opponent_goals = to_int(opponent.get("goals"))

    result_map = {"1": "V", "2": "D", "3": "E"}
    focus_result = result_map.get(str(focus.get("result", "")))
    if not focus_result:
        if club_goals > opponent_goals:
            focus_result = "V"
        elif club_goals < opponent_goals:
            focus_result = "D"
        else:
            focus_result = "E"

    return {
        "match_id": str(match.get("matchId", "")),
        "timestamp": match.get("timestamp"),
        "date": pd.to_datetime(match.get("timestamp"), unit="s", errors="coerce"),
        "match_type": match.get("matchType", "unknown"),
        "club_id": str(focus_club_id),
        "club_name": focus.get("details", {}).get("name", ""),
        "club_goals": club_goals,
        "opponent_id": str(opponent_id),
        "opponent_name": opponent.get("details", {}).get("name", ""),
        "opponent_goals": opponent_goals,
        "result": focus_result,
        "score": f"{focus.get('goals', 0)}-{opponent.get('goals', 0)}",
        "stadium": focus.get("details", {}).get("customKit", {}).get("stadName", ""),
        "players": extract_club_players(match, focus_club_id),
    }


def club_summary_from_search(row: pd.Series) -> Dict[str, Any]:
    return {
        "club_id": str(row.get("clubInfoclubId", row.get("clubId", ""))),
        "name": row.get("clubInfoname", row.get("clubName", "")),
        "wins": to_int(row.get("wins")),
        "losses": to_int(row.get("losses")),
        "ties": to_int(row.get("ties")),
        "games_played": to_int(row.get("gamesPlayed")),
        "goals": to_int(row.get("goals")),
        "goals_against": to_int(row.get("goalsAgainst")),
        "clean_sheets": to_int(row.get("cleanSheets")),
        "points": to_int(row.get("points")),
        "current_division": to_int(row.get("currentDivision")),
        "best_division": to_int(row.get("bestDivision")),
        "reputation_tier": to_int(row.get("reputationtier")),
        "promotions": to_int(row.get("promotions")),
        "relegations": to_int(row.get("relegations")),
        "stadium": row.get("clubInfocustomKit.stadName", ""),
        "platform": row.get("platform", "common-gen5"),
    }
