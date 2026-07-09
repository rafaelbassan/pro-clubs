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
};

export type MatchRecord = {
  match_id: string;
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
  saves: number;
  shots: number;
  mom: number;
  red_cards: number;
  avg_rating: number;
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
  };
  squad?: PlayerStats[];
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

const API_UNAVAILABLE =
  "API indisponível. Inicie o backend: docker compose --project-directory . -f infra/docker-compose.yml up api -d";

async function apiFetch<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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

export function searchClubs(query: string) {
  return apiFetch<ClubSearchResult[]>(`/clubs/search?q=${encodeURIComponent(query)}`);
}

export function getClub(clubId: string, token?: string) {
  return apiFetch<ClubResponse>(`/clubs/${clubId}`, token);
}

export function getClubMatches(clubId: string, token?: string) {
  return apiFetch<ClubResponse>(`/clubs/${clubId}/matches`, token);
}

export function getClubHistory(clubId: string, token: string) {
  return apiFetch<ClubResponse>(`/clubs/${clubId}/matches/history`, token);
}

export function syncClub(clubId: string, token: string) {
  return apiFetch<{ club_id: string; added: number; total: number }>(
    `/clubs/${clubId}/sync`,
    token,
    { method: "POST" },
  );
}

export function trackClub(clubId: string, token: string) {
  return apiFetch(`/users/me/clubs/${clubId}/track`, token, { method: "POST" });
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
  if (!res.ok) throw new Error(await res.text() || "Auth request failed");
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
