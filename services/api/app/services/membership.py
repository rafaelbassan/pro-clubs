from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Club, User


def get_user_role(db: Session, user: Optional[User], club: Club) -> str:
    """Open access for now — no login or membership required."""
    del db, user, club
    return "owner"


def ensure_admin(db: Session, user: Optional[User], club: Club) -> str:
    """Open access for now — write endpoints are not gated."""
    del db, user, club
    return "owner"
