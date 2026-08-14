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
    slug: Optional[str] = None
    crest_url: Optional[str] = None
    trophy_count: int = 0


class MatchRecord(BaseModel):
    match_id: str
    id: Optional[str] = None
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
    status: str = "approved"
    source: str = "ea"
    screenshot_path: Optional[str] = None


class ResponseMeta(BaseModel):
    tier: Literal["free", "authenticated"] = "free"
    filtered_to: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    total_matches: int = 0
    pending_matches: int = 0
    approved_matches: int = 0
    rejected_matches: int = 0
    role: Optional[str] = None


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
    tackle_attempts: int = 0
    tackle_accuracy: float = 0.0
    saves: int = 0
    shots: int = 0
    mom: int = 0
    red_cards: int = 0
    avg_rating: float = 0.0
    is_active: bool = True
    position_override: Optional[str] = None


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


class OpponentAverage(BaseModel):
    opponent_name: str
    matches: int
    avg_goals_for: float
    avg_goals_against: float


class MatchBar(BaseModel):
    match_id: str
    date: Optional[str] = None
    score: str
    result: str
    club_goals: int
    opponent_goals: int
    rating: Optional[float] = None


class ClubAnalytics(BaseModel):
    wins: int = 0
    draws: int = 0
    losses: int = 0
    matches: int = 0
    win_rate: float = 0.0
    goals_for: int = 0
    goals_against: int = 0
    goal_diff: int = 0
    clean_sheets: int = 0
    goals_per_game: float = 0.0
    shots_per_game: float = 0.0
    pass_accuracy: float = 0.0
    duel_accuracy: float = 0.0
    offensiveness: float = 0.0
    best_streak: int = 0
    opponent_averages: List[OpponentAverage] = Field(default_factory=list)
    match_bars: List[MatchBar] = Field(default_factory=list)
    squad: List[PlayerStats] = Field(default_factory=list)


class MatchUpdate(BaseModel):
    opponent_name: Optional[str] = None
    club_goals: Optional[int] = None
    opponent_goals: Optional[int] = None
    result: Optional[str] = None
    match_type: Optional[str] = None
    played_at: Optional[datetime] = None
    status: Optional[Literal["pending", "approved", "rejected"]] = None


class MatchCreateManual(BaseModel):
    opponent_name: str
    club_goals: int = 0
    opponent_goals: int = 0
    match_type: str = "leagueMatch"
    played_at: Optional[datetime] = None
    status: Literal["pending", "approved"] = "pending"


class ScheduledMatchIn(BaseModel):
    opponent_name: str
    scheduled_at: datetime
    league: str = ""
    stage: str = ""
    is_cup: bool = False
    notes: Optional[str] = None


class ScheduledMatchOut(BaseModel):
    id: str
    opponent_name: str
    scheduled_at: datetime
    league: str = ""
    stage: str = ""
    is_cup: bool = False
    notes: Optional[str] = None


class TrophyIn(BaseModel):
    title: str
    organization: str = ""
    won_at: Optional[datetime] = None
    scope: Literal["regional", "nacional", "national", "internacional"] = "regional"
    final_opponent: Optional[str] = None
    final_score_for: Optional[int] = None
    final_score_against: Optional[int] = None
    champions: List[str] = Field(default_factory=list)


class TrophyOut(BaseModel):
    id: str
    title: str
    organization: str = ""
    won_at: Optional[datetime] = None
    scope: str = "regional"
    final_opponent: Optional[str] = None
    final_score_for: Optional[int] = None
    final_score_against: Optional[int] = None
    champions: List[str] = Field(default_factory=list)


class ClubPlayerUpdate(BaseModel):
    position_override: Optional[str] = None
    is_active: Optional[bool] = None


class ClubSettingsUpdate(BaseModel):
    slug: Optional[str] = None
    admin_pin: Optional[str] = None
    crest_url: Optional[str] = None


class ClubSettingsOut(BaseModel):
    club_id: str
    slug: Optional[str] = None
    crest_url: Optional[str] = None
    has_admin_pin: bool = False
    role: Optional[str] = None
