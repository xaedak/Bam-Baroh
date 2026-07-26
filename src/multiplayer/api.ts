import { getStoredServerUrl } from './socket';

export interface RankInfo {
  name: string;
  index: number;
  minXp: number;
  nextRank: string | null;
  nextXp: number | null;
  progress: number;
}

export interface Profile {
  username: string;
  xp: number;
  wins: number;
  matches: number;
  accuracy: number;
  speed: number;
  rank: RankInfo;
}

export interface LeaderboardEntry extends Profile {
  position: number;
}

interface ApiResult<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${getStoredServerUrl()}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      return { ok: false, error: json.error || `Request failed (${res.status}).` };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: `Couldn't reach the server at ${getStoredServerUrl()}.` };
  }
}

export function registerAccount(username: string, password: string) {
  return request<{ token: string; profile: Profile }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function loginAccount(username: string, password: string) {
  return request<{ token: string; profile: Profile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchMe(token: string) {
  return request<{ profile: Profile }>('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function fetchProfile(username: string) {
  return request<{ profile: Profile }>(`/api/profile/${encodeURIComponent(username)}`);
}

export function fetchLeaderboard(limit = 50) {
  return request<{ leaderboard: LeaderboardEntry[] }>(`/api/leaderboard?limit=${limit}`);
}

/** Exchanges a Discord OAuth `code` (from the Embedded App SDK) for a session. */
export function loginWithDiscord(code: string) {
  return request<{ token: string; profile: Profile; save: unknown | null }>('/api/auth/discord', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/** Fetches this account's cross-server progression blob (unlocked level, stars, achievements, etc). */
export function fetchSave(token: string) {
  return request<{ save: unknown | null; updatedAt: number | null }>('/api/save', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Pushes the local progression blob up to the account so it follows the player across servers. */
export function pushSave(token: string, save: unknown) {
  return request<{ updatedAt: number }>('/api/save', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ save }),
  });
}
