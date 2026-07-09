from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List

from ingest.parser import to_float, to_int


def _pick_primary_position(pos_times: Dict[str, int]) -> str:
    if not pos_times:
        return ""
    return max(pos_times.items(), key=lambda item: (item[1], item[0]))[0]


def aggregate_squad(matches_raw: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Aggregate player stats across multiple match raw_json records."""
    aggregated: Dict[str, Dict[str, Any]] = {}

    for raw in matches_raw:
        for player in raw.get("players", []):
            key = player.get("player_id") or player.get("name", "")
            if not key:
                continue

            if key not in aggregated:
                aggregated[key] = {
                    "player_id": player.get("player_id", key),
                    "name": player.get("name", key),
                    "pos": "",
                    "positions": {},
                    "appearances": 0,
                    "goals": 0,
                    "assists": 0,
                    "passes_made": 0,
                    "pass_attempts": 0,
                    "tackles_made": 0,
                    "saves": 0,
                    "shots": 0,
                    "mom": 0,
                    "red_cards": 0,
                    "rating_sum": 0.0,
                    "rating_count": 0,
                    "pos_times": defaultdict(int),
                }

            row = aggregated[key]
            row["appearances"] += 1
            row["goals"] += to_int(player.get("goals"))
            row["assists"] += to_int(player.get("assists"))
            row["passes_made"] += to_int(player.get("passes_made"))
            row["pass_attempts"] += to_int(player.get("pass_attempts"))
            row["tackles_made"] += to_int(player.get("tackles_made"))
            row["saves"] += to_int(player.get("saves"))
            row["shots"] += to_int(player.get("shots"))
            row["mom"] += to_int(player.get("mom"))
            row["red_cards"] += to_int(player.get("red_cards"))

            rating = to_float(player.get("rating"))
            if rating > 0:
                row["rating_sum"] += rating
                row["rating_count"] += 1

            pos = player.get("pos", "")
            if pos:
                weight = to_int(player.get("game_time")) or 1
                row["pos_times"][pos] += weight

    squad: List[Dict[str, Any]] = []
    for row in aggregated.values():
        rating_count = row.pop("rating_count")
        rating_sum = row.pop("rating_sum")
        pos_times: Dict[str, int] = dict(row.pop("pos_times"))
        row["positions"] = dict(sorted(pos_times.items(), key=lambda item: (-item[1], item[0])))
        row["pos"] = _pick_primary_position(pos_times)
        row["avg_rating"] = round(rating_sum / rating_count, 2) if rating_count else 0.0
        row["pass_accuracy"] = (
            round(row["passes_made"] / row["pass_attempts"] * 100, 1)
            if row["pass_attempts"] > 0
            else 0.0
        )
        squad.append(row)

    squad.sort(key=lambda p: (-p["appearances"], -p["goals"], -p["avg_rating"]))
    return squad
