export const DEFAULT_CLUB_ID = "898181";
export const DEFAULT_CLUB_NAME = "Vibe ES";

function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return "/backend";
  }
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

export type ClubSummary = {
  club_id: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  games_played: number;
  goals: number;
  goals_against: number;
  clean_sheets: number;
  points: number;
  current_division: number;
  best_division: number;
  reputation_tier: number;
  promotions: number;
  relegations: number;
  stadium: string;
  platform: string;
  slug?: string | null;
  crest_url?: string | null;
  trophy_count?: number;
};

export type MatchRecord = {
  match_id: string;
  id?: string | null;
  timestamp?: string | number | null;
  date?: string | null;
  match_type: string;
  club_id: string;
  club_name: string;
  club_goals: number;
  opponent_id: string;
  opponent_name: string;
  opponent_goals: number;
  result: string;
  score: string;
  stadium: string;
  status?: string;
  source?: string;
  screenshot_path?: string | null;
};

export type PlayerStats = {
  player_id: string;
  name: string;
  pos: string;
  positions?: Record<string, number>;
  appearances: number;
  goals: number;
  assists: number;
  passes_made: number;
  pass_attempts: number;
  pass_accuracy: number;
  tackles_made: number;
  tackle_attempts?: number;
  tackle_accuracy?: number;
  saves: number;
  shots: number;
  mom: number;
  red_cards: number;
  avg_rating: number;
  is_active?: boolean;
  position_override?: string | null;
};

export type ClubResponse = {
  club_id: string;
  summary: ClubSummary;
  details: Record<string, unknown>;
  matches: MatchRecord[];
  meta: {
    tier: "free" | "authenticated";
    filtered_to?: string | null;
    last_synced_at?: string | null;
    total_matches: number;
    pending_matches?: number;
    approved_matches?: number;
    rejected_matches?: number;
    role?: string | null;
  };
  squad?: PlayerStats[];
};

export type ClubAnalytics = {
  wins: number;
  draws: number;
  losses: number;
  matches: number;
  win_rate: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  clean_sheets: number;
  goals_per_game: number;
  shots_per_game: number;
  pass_accuracy: number;
  duel_accuracy: number;
  offensiveness: number;
  best_streak: number;
  opponent_averages: {
    opponent_name: string;
    matches: number;
    avg_goals_for: number;
    avg_goals_against: number;
  }[];
  match_bars: {
    match_id: string;
    date?: string | null;
    score: string;
    result: string;
    club_goals: number;
    opponent_goals: number;
    rating?: number | null;
  }[];
  squad: PlayerStats[];
};

export type ScheduledMatch = {
  id: string;
  opponent_name: string;
  scheduled_at: string;
  league: string;
  stage: string;
  is_cup: boolean;
  notes?: string | null;
};

export type Trophy = {
  id: string;
  title: string;
  organization: string;
  won_at?: string | null;
  scope: string;
  final_opponent?: string | null;
  final_score_for?: number | null;
  final_score_against?: number | null;
  champions: string[];
};

export type ClubSearchResult = {
  club_id: string;
  name: string;
  current_division: number;
  wins: number;
  losses: number;
  ties: number;
  platform: string;
};

export type PeriodFilter = {
  last_n?: number | null;
  date_from?: string;
  date_to?: string;
};

const API_UNAVAILABLE =
  "API indisponível. Inicie o backend: docker compose --project-directory . -f infra/docker-compose.yml up api -d";

async function apiFetch<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new Error(API_UNAVAILABLE);
  }

  if (!res.ok) {
    let body = await res.text();
    try {
      const parsed = JSON.parse(body) as { detail?: string };
      body = parsed.detail || body;
    } catch {
      // keep raw body
    }
    throw new Error(body || res.statusText);
  }
  return res.json();
}

function periodQuery(filter?: PeriodFilter) {
  const params = new URLSearchParams();
  if (filter?.last_n) params.set("last_n", String(filter.last_n));
  if (filter?.date_from) params.set("date_from", filter.date_from);
  if (filter?.date_to) params.set("date_to", filter.date_to);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function searchClubs(query: string) {
  return apiFetch<ClubSearchResult[]>(`/clubs/search?name=${encodeURIComponent(query)}`);
}

export function getClub(clubId: string, token?: string) {
  return apiFetch<ClubResponse>(`/clubs/${clubId}`, token);
}

export function getClubMatches(clubId: string, token?: string) {
  return apiFetch<ClubResponse>(`/clubs/${clubId}/matches`, token);
}

export function getClubHistory(clubId: string, token?: string) {
  return apiFetch<ClubResponse>(`/clubs/${clubId}/matches/history`, token);
}

export function getClubAnalytics(clubId: string, filter?: PeriodFilter, token?: string) {
  return apiFetch<ClubAnalytics>(`/clubs/${clubId}/analytics${periodQuery(filter)}`, token);
}

export function syncClub(clubId: string, token?: string) {
  return apiFetch<{ club_id: string; added: number; total: number }>(
    `/clubs/${clubId}/sync`,
    token,
    { method: "POST" },
  );
}

export function trackClub(clubId: string, token: string) {
  return apiFetch(`/users/me/clubs/${clubId}/track`, token, { method: "POST" });
}

export function listManageMatches(clubId: string, token?: string, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<MatchRecord[]>(`/clubs/${clubId}/matches/manage${q}`, token);
}

export function updateMatch(
  clubId: string,
  matchId: string,
  body: Partial<MatchRecord> & { status?: string },
  token?: string,
) {
  return apiFetch<MatchRecord>(`/clubs/${clubId}/matches/${matchId}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createManualMatch(
  clubId: string,
  body: {
    opponent_name: string;
    club_goals?: number;
    opponent_goals?: number;
    match_type?: string;
    played_at?: string;
    status?: string;
  },
  token?: string,
) {
  return apiFetch<MatchRecord>(`/clubs/${clubId}/matches/manual`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function uploadMatchScreenshot(
  clubId: string,
  file: File,
  fields: { opponent_name?: string; club_goals?: number; opponent_goals?: number },
  token?: string,
) {
  const form = new FormData();
  form.append("file", file);
  if (fields.opponent_name) form.append("opponent_name", fields.opponent_name);
  form.append("club_goals", String(fields.club_goals ?? 0));
  form.append("opponent_goals", String(fields.opponent_goals ?? 0));
  return apiFetch<MatchRecord>(`/clubs/${clubId}/matches/upload`, token, {
    method: "POST",
    body: form,
  });
}

export function generateReport(clubId: string, token?: string) {
  return apiFetch<Record<string, unknown>>(`/clubs/${clubId}/report`, token);
}

export function listSchedule(clubId: string) {
  return apiFetch<ScheduledMatch[]>(`/clubs/${clubId}/schedule`);
}

export function createSchedule(
  clubId: string,
  body: Omit<ScheduledMatch, "id">,
  token?: string,
) {
  return apiFetch<ScheduledMatch>(`/clubs/${clubId}/schedule`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteSchedule(clubId: string, eventId: string, token?: string) {
  return apiFetch(`/clubs/${clubId}/schedule/${eventId}`, token, { method: "DELETE" });
}

export function listTrophies(clubId: string) {
  return apiFetch<Trophy[]>(`/clubs/${clubId}/trophies`);
}

export function createTrophy(
  clubId: string,
  body: Omit<Trophy, "id">,
  token?: string,
) {
  return apiFetch<Trophy>(`/clubs/${clubId}/trophies`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTrophy(
  clubId: string,
  trophyId: string,
  body: Omit<Trophy, "id">,
  token?: string,
) {
  return apiFetch<Trophy>(`/clubs/${clubId}/trophies/${trophyId}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTrophy(clubId: string, trophyId: string, token?: string) {
  return apiFetch(`/clubs/${clubId}/trophies/${trophyId}`, token, { method: "DELETE" });
}

export function updateClubPlayer(
  clubId: string,
  playerId: string,
  body: { position_override?: string | null; is_active?: boolean },
  token?: string,
) {
  return apiFetch<PlayerStats>(`/clubs/${clubId}/players/${playerId}`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function getClubSettings(clubId: string, token?: string) {
  return apiFetch<{
    club_id: string;
    slug?: string | null;
    crest_url?: string | null;
    has_admin_pin: boolean;
    role?: string | null;
  }>(`/clubs/${clubId}/settings`, token);
}

export function updateClubSettings(
  clubId: string,
  body: { slug?: string; admin_pin?: string; crest_url?: string },
  token?: string,
) {
  return apiFetch(`/clubs/${clubId}/settings`, token, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function claimAdmin(clubId: string, token?: string) {
  return apiFetch<{ role: string }>(`/clubs/${clubId}/claim-admin`, token, { method: "POST" });
}

async function authFetch(path: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(API_UNAVAILABLE);
  }
  if (!res.ok) throw new Error((await res.text()) || "Auth request failed");
  return res.json() as Promise<{ access_token: string }>;
}

export function loginWithApi(email: string, password: string) {
  return authFetch("/auth/login", { email, password });
}

export function registerWithApi(email: string, password: string) {
  return authFetch("/auth/register", { email, password });
}

export function googleAuthWithApi(email: string, googleId: string) {
  return authFetch("/auth/google", { email, google_id: googleId });
}
