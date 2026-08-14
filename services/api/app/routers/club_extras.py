from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional  # noqa: F401 — used in annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user_optional
from app.db.models import Club, ClubPlayer, Match, User
from app.db.session import get_db
from app.services.analytics import build_analytics
from app.services.club_service import get_or_sync_club
from app.services.membership import get_user_role
from shared.schemas import (
    ClubAnalytics,
    ClubPlayerUpdate,
    ClubSettingsOut,
    ClubSettingsUpdate,
    MatchCreateManual,
    MatchRecord,
    MatchUpdate,
    PlayerStats,
)

router = APIRouter(prefix="/clubs", tags=["clubs"])

UPLOAD_ROOT = Path("/tmp/proclubs-uploads")


def _resolve_result(club_goals: int, opponent_goals: int) -> str:
    if club_goals > opponent_goals:
        return "V"
    if club_goals < opponent_goals:
        return "D"
    return "E"


def _match_record(match: Match, club: Club) -> MatchRecord:
    raw = match.raw_json or {}
    return MatchRecord(
        match_id=match.ea_match_id,
        id=str(match.id),
        timestamp=raw.get("timestamp"),
        date=match.played_at,
        match_type=match.match_type,
        club_id=club.ea_club_id,
        club_name=club.name,
        club_goals=match.club_goals,
        opponent_id=match.opponent_ea_id,
        opponent_name=match.opponent_name,
        opponent_goals=match.opponent_goals,
        result=match.result,
        score=f"{match.club_goals}-{match.opponent_goals}",
        stadium=club.stadium,
        status=match.status or "approved",
        source=match.source or "ea",
        screenshot_path=match.screenshot_path,
    )


@router.get("/{club_id}/analytics", response_model=ClubAnalytics)
def club_analytics(
    club_id: str,
    last_n: Optional[int] = Query(None, ge=1, le=500),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        club = get_or_sync_club(db, club_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return build_analytics(db, club, last_n=last_n, date_from=date_from, date_to=date_to)


@router.get("/{club_id}/matches/manage", response_model=list[MatchRecord])
def list_matches_manage(
    club_id: str,
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    q = db.query(Match).filter(Match.club_id == club.id).order_by(Match.played_at.desc())
    if status:
        q = q.filter(Match.status == status)
    return [_match_record(m, club) for m in q.all()]


@router.post("/{club_id}/matches/manual", response_model=MatchRecord)
def create_manual_match(
    club_id: str,
    body: MatchCreateManual,
    db: Session = Depends(get_db),
):
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    match_id = f"manual-{uuid.uuid4().hex[:16]}"
    match = Match(
        ea_match_id=match_id,
        club_id=club.id,
        opponent_name=body.opponent_name,
        match_type=body.match_type,
        played_at=body.played_at or datetime.now(timezone.utc),
        club_goals=body.club_goals,
        opponent_goals=body.opponent_goals,
        result=_resolve_result(body.club_goals, body.opponent_goals),
        status=body.status,
        source="manual",
        raw_json={"players": [], "source": "manual"},
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return _match_record(match, club)


@router.patch("/{club_id}/matches/{match_id}", response_model=MatchRecord)
def update_match(
    club_id: str,
    match_id: str,
    body: MatchUpdate,
    db: Session = Depends(get_db),
):
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    match = (
        db.query(Match)
        .filter(Match.club_id == club.id, Match.ea_match_id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if body.opponent_name is not None:
        match.opponent_name = body.opponent_name
    if body.club_goals is not None:
        match.club_goals = body.club_goals
    if body.opponent_goals is not None:
        match.opponent_goals = body.opponent_goals
    if body.match_type is not None:
        match.match_type = body.match_type
    if body.played_at is not None:
        match.played_at = body.played_at
    if body.status is not None:
        match.status = body.status
    if body.result is not None:
        match.result = body.result
    elif body.club_goals is not None or body.opponent_goals is not None:
        match.result = _resolve_result(match.club_goals, match.opponent_goals)
    db.commit()
    db.refresh(match)
    return _match_record(match, club)


@router.post("/{club_id}/matches/upload", response_model=MatchRecord)
async def upload_match_screenshot(
    club_id: str,
    file: UploadFile = File(...),
    opponent_name: str = Form(""),
    club_goals: int = Form(0),
    opponent_goals: int = Form(0),
    db: Session = Depends(get_db),
):
    """Hybrid OCR path: store screenshot and create a pending match for review.

    OCR is best-effort — if text cannot be parsed, the provided form fields are used.
    """
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "shot.jpg").suffix or ".jpg"
    filename = f"{club.ea_club_id}-{uuid.uuid4().hex[:12]}{suffix}"
    dest = UPLOAD_ROOT / filename
    content = await file.read()
    dest.write_bytes(content)

    parsed_opponent = opponent_name
    parsed_for = club_goals
    parsed_against = opponent_goals
    ocr_notes = "manual_assisted"

    try:
        text = content.decode("utf-8", errors="ignore")
        # Lightweight heuristic for plain-text dumps / future OCR output
        score_match = re.search(r"(\d+)\s*[-xX:]\s*(\d+)", text)
        if score_match:
            parsed_for = int(score_match.group(1))
            parsed_against = int(score_match.group(2))
            ocr_notes = "regex_score"
    except Exception:
        pass

    match_id = f"ocr-{uuid.uuid4().hex[:16]}"
    match = Match(
        ea_match_id=match_id,
        club_id=club.id,
        opponent_name=parsed_opponent or "Adversário",
        match_type="leagueMatch",
        played_at=datetime.now(timezone.utc),
        club_goals=parsed_for,
        opponent_goals=parsed_against,
        result=_resolve_result(parsed_for, parsed_against),
        status="pending",
        source="ocr",
        screenshot_path=str(dest),
        raw_json={"players": [], "source": "ocr", "ocr_notes": ocr_notes},
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return _match_record(match, club)


@router.get("/{club_id}/report")
def generate_report(
    club_id: str,
    db: Session = Depends(get_db),
):
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    analytics = build_analytics(db, club)
    approved = (
        db.query(Match)
        .filter(Match.club_id == club.id, Match.status == "approved")
        .order_by(Match.played_at.desc())
        .all()
    )
    return {
        "club": club.name,
        "club_id": club.ea_club_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "analytics": analytics.model_dump(),
        "matches": [_match_record(m, club).model_dump() for m in approved],
    }


@router.patch("/{club_id}/players/{player_id}", response_model=PlayerStats)
def update_club_player(
    club_id: str,
    player_id: str,
    body: ClubPlayerUpdate,
    db: Session = Depends(get_db),
):
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    row = (
        db.query(ClubPlayer)
        .filter(ClubPlayer.club_id == club.id, ClubPlayer.ea_player_id == player_id)
        .first()
    )
    if not row:
        row = ClubPlayer(club_id=club.id, ea_player_id=player_id, name=player_id)
        db.add(row)
    if body.position_override is not None:
        row.position_override = body.position_override or None
    if body.is_active is not None:
        row.is_active = body.is_active
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    analytics = build_analytics(db, club)
    for player in analytics.squad:
        if player.player_id == player_id:
            return player
    return PlayerStats(
        player_id=player_id,
        name=row.name or player_id,
        pos=row.position_override or "",
        is_active=row.is_active,
        position_override=row.position_override,
    )


@router.get("/{club_id}/settings", response_model=ClubSettingsOut)
def get_settings(
    club_id: str,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    role = get_user_role(db, None, club)
    return ClubSettingsOut(
        club_id=club.ea_club_id,
        slug=club.slug,
        crest_url=club.crest_url,
        has_admin_pin=bool(club.admin_pin_hash),
        role=role,
    )


@router.patch("/{club_id}/settings", response_model=ClubSettingsOut)
def update_settings(
    club_id: str,
    body: ClubSettingsUpdate,
    db: Session = Depends(get_db),
):
    from app.auth.security import hash_password

    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    if body.slug is not None:
        slug = re.sub(r"[^a-z0-9-]", "", body.slug.lower())[:64]
        if slug:
            clash = db.query(Club).filter(Club.slug == slug, Club.id != club.id).first()
            if clash:
                raise HTTPException(status_code=409, detail="Slug already taken")
            club.slug = slug
    if body.crest_url is not None:
        club.crest_url = body.crest_url or None
    if body.admin_pin is not None:
        club.admin_pin_hash = hash_password(body.admin_pin) if body.admin_pin else None
    db.commit()
    return ClubSettingsOut(
        club_id=club.ea_club_id,
        slug=club.slug,
        crest_url=club.crest_url,
        has_admin_pin=bool(club.admin_pin_hash),
        role="admin",
    )


@router.post("/{club_id}/claim-admin")
def claim_admin(
    club_id: str,
    db: Session = Depends(get_db),
):
    """Open access — always returns owner for now."""
    club = db.query(Club).filter(Club.ea_club_id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return {"role": "owner"}
