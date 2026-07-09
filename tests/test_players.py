"""Tests for player extraction and aggregation."""

from ingest.parser import extract_club_players
from ingest.players import aggregate_squad


def test_extract_club_players_from_sample():
    match = {
        "players": {
            "240": {
                "1977467285": {
                    "playername": "I iSoapedU I",
                    "pos": "forward",
                    "rating": "6.50",
                    "goals": "1",
                    "assists": "0",
                    "passesmade": "10",
                    "passattempts": "12",
                    "tacklesmade": "2",
                    "gameTime": "5527",
                    "mom": "0",
                    "redcards": "0",
                    "saves": "0",
                    "shots": "3",
                }
            }
        }
    }
    players = extract_club_players(match, "240")
    assert len(players) == 1
    assert players[0]["name"] == "I iSoapedU I"
    assert players[0]["goals"] == 1


def test_aggregate_squad():
    raw_matches = [
        {
            "players": [
                {"player_id": "1", "name": "Player A", "pos": "forward", "goals": 1, "assists": 0, "rating": 7.0, "passes_made": 5, "pass_attempts": 6, "tackles_made": 1, "saves": 0, "shots": 2, "mom": 0, "red_cards": 0, "game_time": 5000},
            ]
        },
        {
            "players": [
                {"player_id": "1", "name": "Player A", "pos": "forward", "goals": 2, "assists": 1, "rating": 8.0, "passes_made": 8, "pass_attempts": 10, "tackles_made": 0, "saves": 0, "shots": 3, "mom": 1, "red_cards": 0, "game_time": 5000},
            ]
        },
    ]
    squad = aggregate_squad(raw_matches)
    assert len(squad) == 1
    assert squad[0]["appearances"] == 2
    assert squad[0]["goals"] == 3
    assert squad[0]["avg_rating"] == 7.5
    assert squad[0]["pos"] == "forward"
    assert squad[0]["positions"] == {"forward": 10000}


def test_aggregate_squad_picks_position_by_time_played():
    raw_matches = [
        {
            "players": [
                {
                    "player_id": "1",
                    "name": "Player A",
                    "pos": "forward",
                    "goals": 0,
                    "assists": 0,
                    "rating": 7.0,
                    "passes_made": 0,
                    "pass_attempts": 0,
                    "tackles_made": 0,
                    "saves": 0,
                    "shots": 0,
                    "mom": 0,
                    "red_cards": 0,
                    "game_time": 1000,
                },
            ]
        },
        {
            "players": [
                {
                    "player_id": "1",
                    "name": "Player A",
                    "pos": "defender",
                    "goals": 0,
                    "assists": 0,
                    "rating": 8.0,
                    "passes_made": 0,
                    "pass_attempts": 0,
                    "tackles_made": 0,
                    "saves": 0,
                    "shots": 0,
                    "mom": 0,
                    "red_cards": 0,
                    "game_time": 5000,
                },
            ]
        },
    ]
    squad = aggregate_squad(raw_matches)
    assert squad[0]["pos"] == "defender"
    assert squad[0]["positions"] == {"defender": 5000, "forward": 1000}
