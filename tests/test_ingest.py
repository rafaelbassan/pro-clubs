"""Tests for ingest parser."""

import pandas as pd

from ingest.parser import club_summary_from_search, parse_match


def test_parse_match_result_from_goals():
    match = {
        "matchId": "123",
        "timestamp": 1783582121,
        "matchType": "friendlyMatch",
        "clubs": {
            "240": {"goals": "3", "details": {"name": "Real Madrid", "customKit": {"stadName": "Stadium"}}},
            "999": {"goals": "1", "details": {"name": "Opponent"}},
        },
    }
    parsed = parse_match(match, "240")
    assert parsed["result"] == "V"
    assert parsed["club_goals"] == 3
    assert parsed["opponent_goals"] == 1


def test_club_summary_from_search():
    row = pd.Series(
        {
            "clubInfoclubId": 240,
            "clubInfoname": "Real Madrid",
            "wins": "10",
            "losses": "2",
            "ties": "1",
            "gamesPlayed": "13",
            "goals": "30",
            "goalsAgainst": "12",
            "cleanSheets": "4",
            "points": "31",
            "currentDivision": "6",
            "bestDivision": "5",
            "reputationtier": "3",
            "promotions": "1",
            "relegations": "0",
            "clubInfocustomKit.stadName": "King Fahd Stadium",
            "platform": "common-gen5",
        }
    )
    summary = club_summary_from_search(row)
    assert summary["club_id"] == "240"
    assert summary["name"] == "Real Madrid"
    assert summary["wins"] == 10
