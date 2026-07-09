from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ClubSummary(BaseModel):
    club_id: str
    name: str = ""
    wins: int = 0
    losses: int = 0
    ties: int = 0
    games_played: int = 0
    goals: int = 0
    goals_against: int = 0
    clean_sheets: int = 0
    points: int = 0
    current_division: int = 0
    best_division: int = 0
    reputation_tier: int = 0
    promotions: int = 0
    relegations: int = 0
    stadium: str = ""
    platform: str = "common-gen5"


class MatchRecord(BaseModel):
    match_id: str
    timestamp: Optional[Any] = None
    date: Optional[Any] = None
    match_type: str = "unknown"
    club_id: str
    club_name: str = ""
    club_goals: int = 0
    opponent_id: str = ""
    opponent_name: str = ""
    opponent_goals: int = 0
    result: str = ""
    score: str = ""
    stadium: str = ""


class ResponseMeta(BaseModel):
    tier: Literal["free", "authenticated"] = "free"
    filtered_to: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    total_matches: int = 0


class PlayerStats(BaseModel):
    player_id: str
    name: str
    pos: str = ""
    positions: Dict[str, int] = Field(default_factory=dict)
    appearances: int = 0
    goals: int = 0
    assists: int = 0
    passes_made: int = 0
    pass_attempts: int = 0
    pass_accuracy: float = 0.0
    tackles_made: int = 0
    saves: int = 0
    shots: int = 0
    mom: int = 0
    red_cards: int = 0
    avg_rating: float = 0.0


class ClubResponse(BaseModel):
    club_id: str
    summary: ClubSummary
    details: Dict[str, Any] = Field(default_factory=dict)
    matches: List[MatchRecord] = Field(default_factory=list)
    squad: List[PlayerStats] = Field(default_factory=list)
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


class ClubSearchResult(BaseModel):
    club_id: str
    name: str
    current_division: int = 0
    wins: int = 0
    losses: int = 0
    ties: int = 0
    platform: str = "common-gen5"


class SyncResult(BaseModel):
    club_id: str
    added: int
    total: int
    status: str = "completed"


class UserOut(BaseModel):
    id: str
    email: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
