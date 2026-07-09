from __future__ import annotations

import json
from typing import Any, List, Optional

from app.config import settings
from shared.schemas import ClubSearchResult

_client: Any = None
_client_checked = False


def _get_client() -> Any | None:
    global _client, _client_checked
    if not settings.redis_url:
        return None
    if _client_checked:
        return _client
    _client_checked = True
    try:
        import redis

        client = redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        _client = client
    except Exception:
        _client = None
    return _client


def redis_status() -> str:
    if not settings.redis_url:
        return "disabled"
    return "ok" if _get_client() else "unavailable"


def _search_key(query: str, limit: int) -> str:
    return f"search:{query.strip().lower()}:{limit}"


def _club_sync_key(ea_club_id: str) -> str:
    return f"club:synced:{ea_club_id}"


def get_cached_search(query: str, limit: int) -> Optional[List[ClubSearchResult]]:
    client = _get_client()
    if not client:
        return None
    try:
        raw = client.get(_search_key(query, limit))
        if not raw:
            return None
        data = json.loads(raw)
        if not data:
            client.delete(_search_key(query, limit))
            return None
        return [ClubSearchResult.model_validate(item) for item in data]
    except Exception:
        return None


def set_cached_search(query: str, limit: int, results: List[ClubSearchResult], ttl_seconds: int) -> None:
    client = _get_client()
    if not client or ttl_seconds <= 0 or not results:
        return
    try:
        payload = json.dumps([result.model_dump() for result in results])
        client.setex(_search_key(query, limit), ttl_seconds, payload)
    except Exception:
        return


def is_club_sync_cached(ea_club_id: str) -> bool:
    client = _get_client()
    if not client:
        return False
    try:
        return bool(client.exists(_club_sync_key(ea_club_id)))
    except Exception:
        return False


def mark_club_synced(ea_club_id: str, ttl_seconds: int) -> None:
    client = _get_client()
    if not client or ttl_seconds <= 0:
        return
    try:
        client.setex(_club_sync_key(ea_club_id), ttl_seconds, "1")
    except Exception:
        return
