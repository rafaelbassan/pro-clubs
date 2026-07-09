from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: UUID | str) -> Optional[User]:
    uid = user_id if isinstance(user_id, UUID) else UUID(str(user_id))
    return db.query(User).filter(User.id == uid).first()


def get_or_create_google_user(db: Session, email: str, google_id: str) -> User:
    user = db.query(User).filter(
        (User.email == email) | (User.google_id == google_id)
    ).first()
    if user:
        if not user.google_id:
            user.google_id = google_id
            db.commit()
            db.refresh(user)
        return user
    user = User(email=email, google_id=google_id, plan="authenticated")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_email_user(db: Session, email: str, password: str) -> User:
    existing = get_user_by_email(db, email)
    if existing:
        raise ValueError("Email already registered")
    user = User(email=email, password_hash=hash_password(password), plan="authenticated")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
