#!/usr/bin/env python3
"""Probe EA API history depth: maxResultCount and pagination params."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "packages" / "ea-client"))

from ea_client import FC26API, FC26APIError  # noqa: E402

DEFAULT_CLUB_ID = "240"
OFFSET_CANDIDATES = ["offset", "start", "page", "pageIndex", "startIndex", "cursor"]


def probe_max_results(api: FC26API, club_id: str, match_type: str) -> dict:
    results: dict = {}
    for count in [10, 20, 50, 100]:
        try:
            matches = api.fetch_matches_raw(club_id, match_type, max_result_count=count)
            results[str(count)] = len(matches)
        except FC26APIError as exc:
            results[str(count)] = f"error: {exc}"
    return results


def probe_offset_params(api: FC26API, club_id: str, match_type: str) -> dict:
    baseline = api.fetch_matches_raw(club_id, match_type, max_result_count=10)
    baseline_ids = [m.get("matchId") for m in baseline]
    results: dict = {}

    for param in OFFSET_CANDIDATES:
        for value in [1, 10]:
            try:
                matches = api.fetch_matches_raw(
                    club_id,
                    match_type,
                    max_result_count=10,
                    extra_params={param: value},
                )
                ids = [m.get("matchId") for m in matches]
                results[f"{param}={value}"] = {
                    "count": len(matches),
                    "same_as_baseline": ids == baseline_ids,
                    "first_id": ids[0] if ids else None,
                }
            except FC26APIError as exc:
                results[f"{param}={value}"] = f"error: {exc}"
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe EA match history API limits")
    parser.add_argument("--club-id", default=DEFAULT_CLUB_ID)
    parser.add_argument("--match-type", default="friendlyMatch")
    parser.add_argument("--json", action="store_true", help="Output JSON only")
    args = parser.parse_args()

    api = FC26API()
    report = {
        "club_id": args.club_id,
        "match_type": args.match_type,
        "max_result_counts": probe_max_results(api, args.club_id, args.match_type),
        "offset_probes": probe_offset_params(api, args.club_id, args.match_type),
        "conclusion": (
            "EA returns at most ~10 matches per type; no documented pagination. "
            "Full history must be accumulated in DB over time."
        ),
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("=== EA History Probe ===")
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
