export type RecentClub = {
  club_id: string;
  name: string;
  division?: number;
};

const KEY = "pc-recent-clubs";
const MAX = 6;

export function getRecentClubs(): RecentClub[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as RecentClub[];
  } catch {
    return [];
  }
}

export function pushRecentClub(club: RecentClub) {
  if (typeof window === "undefined") return;
  const list = getRecentClubs().filter((c) => c.club_id !== club.club_id);
  list.unshift(club);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}
