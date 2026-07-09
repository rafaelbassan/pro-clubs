from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user, get_current_user_optional
from app.db.models import Club, User, UserTrackedClub
from app.db.session import get_db
from app.services.club_service import build_club_response, get_or_sync_club, search_clubs
from ea_client import FC26API
from ingest.sync import SyncService
from app.db.session import SessionLocal
from shared.schemas import ClubResponse, ClubSearchResult, SyncResult

router = APIRouter(prefix="/clubs", tags=["clubs"])
api_client = FC26API()


@router.get("/search", response_model=list[ClubSearchResult])
def search_clubs_endpoint(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
):
    return search_clubs(db, q)


@router.get("/{club_id}", response_model=ClubResponse)
def get_club(
    club_id: str,
    db: Session = Depends(get_db),
):
    try:
        return build_club_response(db, club_id, authenticated=False, history=False)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{club_id}/matches", response_model=ClubResponse)
def get_club_matches_today(
    club_id: str,
    db: Session = Depends(get_db),
):
    try:
        return build_club_response(db, club_id, authenticated=False, history=False)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{club_id}/matches/history", response_model=ClubResponse)
def get_club_matches_history(
    club_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        return build_club_response(db, club_id, authenticated=True, history=True)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{club_id}/sync", response_model=SyncResult)
def sync_club(
    club_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sync = SyncService(api_client, SessionLocal)
    try:
        added, total = sync.sync_club(club_id)
        club = db.query(Club).filter(Club.ea_club_id == club_id).first()
        if club:
            from datetime import datetime, timezone
            club.last_synced_at = datetime.now(timezone.utc)
            db.commit()
        return SyncResult(club_id=club_id, added=added, total=total)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
