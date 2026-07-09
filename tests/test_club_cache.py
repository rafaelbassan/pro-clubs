"""Tests for DB-backed club search and cache."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.db.models import Club
from app.services.club_repository import is_metadata_fresh, upsert_club_from_summary
from app.services.club_service import search_clubs
from shared.schemas import ClubSearchResult


def _club(name: str, club_id: str, updated_at: datetime) -> Club:
    return Club(
        id=uuid4(),
        ea_club_id=club_id,
        name=name,
        division=5,
        stadium="Arena",
        summary_json={
            "club_id": club_id,
            "name": name,
            "wins": 10,
            "losses": 2,
            "ties": 1,
            "platform": "common-gen5",
        },
        updated_at=updated_at,
        last_synced_at=updated_at,
    )


def test_is_metadata_fresh_respects_ttl():
    now = datetime.now(timezone.utc)
    club = _club("Vibe ES", "898181", now - timedelta(minutes=10))
    assert is_metadata_fresh(club, ttl_seconds=3600, now=now) is True
    assert is_metadata_fresh(club, ttl_seconds=300, now=now) is False


def test_search_returns_db_results_when_fresh():
    now = datetime.now(timezone.utc)
    club = _club("Vibe ES", "898181", now - timedelta(minutes=5))
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [club]
    db.query.return_value.filter.return_value.first.return_value = club

    with patch("app.services.club_service._search_clubs_from_ea") as ea_search:
        results = search_clubs(db, "Vibe", limit=10)

    ea_search.assert_not_called()
    assert len(results) == 1
    assert results[0].club_id == "898181"
    assert results[0].name == "Vibe ES"


def test_search_hits_ea_and_upserts_when_db_is_stale():
    now = datetime.now(timezone.utc)
    stale_club = _club("Vibe ES", "898181", now - timedelta(hours=5))
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [
        stale_club
    ]
    db.query.return_value.filter.return_value.first.return_value = stale_club

    ea_result = ClubSearchResult(
        club_id="898181",
        name="Vibe ES",
        current_division=6,
        wins=12,
        losses=2,
        ties=1,
        platform="common-gen5",
    )

    with patch("app.services.club_service._search_clubs_from_ea", return_value=[ea_result]) as ea_search:
        with patch("app.services.club_service.upsert_club_from_search_result", return_value=stale_club) as upsert:
            results = search_clubs(db, "Vibe", limit=10)

    ea_search.assert_called_once_with("Vibe", 10)
    upsert.assert_called_once()
    db.commit.assert_called_once()
    assert results[0].club_id == "898181"


def test_search_returns_redis_cache_without_hitting_db():
    cached = [
        ClubSearchResult(
            club_id="898181",
            name="Vibe ES",
            current_division=5,
            wins=10,
            losses=2,
            ties=1,
            platform="common-gen5",
        )
    ]
    db = MagicMock()

    with patch("app.services.club_service.get_cached_search", return_value=cached) as redis_get:
        with patch("app.services.club_service.search_clubs_from_db") as db_search:
            results = search_clubs(db, "Vibe", limit=10)

    redis_get.assert_called_once_with("Vibe", 10)
    db_search.assert_not_called()
    assert results[0].club_id == "898181"


    db = MagicMock()
    existing = Club(
        id=uuid4(),
        ea_club_id="898181",
        name="Old Name",
        division=4,
        stadium="",
        summary_json={"wins": 1},
        updated_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.query.return_value.filter.return_value.first.return_value = existing

    upsert_club_from_summary(
        db,
        {
            "club_id": "898181",
            "name": "Vibe ES",
            "current_division": 6,
            "wins": 12,
            "losses": 2,
            "ties": 1,
            "stadium": "King Fahd Stadium",
            "platform": "common-gen5",
        },
    )

    assert existing.name == "Vibe ES"
    assert existing.division == 6
    assert existing.stadium == "King Fahd Stadium"
    assert existing.summary_json["wins"] == 12
