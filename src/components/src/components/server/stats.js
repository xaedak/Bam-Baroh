import { db } from './db.js';
import { getRankInfo } from './ranks.js';
import { getLevelInfo } from './leveling.js';
import { getTitleInfo } from './titles.js';
import { getAllSavesWithAccounts } from './saves.js';

function toProfile(row) {
  if (!row) return null;
  return {
    username: row.username,
    discordId: row.discord_id,
    xp: row.xp,
    wins: row.wins,
    matches: row.matches,
    accuracy: Math.round(row.accuracy * 10) / 10,
    speed: Math.round(row.speed * 10) / 10,
    rank: getRankInfo(row.xp),
    levelInfo: getLevelInfo(row.xp),
    titles: getTitleInfo(row),
  };
}

export function getProfile(username) {
  const row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
  return toProfile(row);
}

/** Bot-facing lookup: slash commands only ever have the caller's Discord user id, never a username/password. */
export function getProfileByDiscordId(discordId) {
  const row = db.prepare('SELECT * FROM accounts WHERE discord_id = ?').get(discordId);
  return toProfile(row);
}

export function getLeaderboard(limit = 50) {
  const rows = db
    .prepare('SELECT * FROM accounts ORDER BY xp DESC, wins DESC LIMIT ?')
    .all(Math.max(1, Math.min(200, limit)));
  return rows.map((row, i) => ({ ...toProfile(row), position: i + 1 }));
}

/** Same accounts, ranked by total wins instead of xp - backs /bb-winboard. */
export function getWinboard(limit = 50) {
  const rows = db
    .prepare('SELECT * FROM accounts ORDER BY wins DESC, xp DESC LIMIT ?')
    .all(Math.max(1, Math.min(200, limit)));
  return rows.map((row, i) => ({ ...toProfile(row), position: i + 1 }));
}

/**
 * Read-only boards for stats that live inside each player's client-synced
 * save blob rather than the accounts table (longest win streak, total
 * playtime). Computed by scanning every save row - fine at this scale, and
 * since it's read-only there's no risk of racing the client's writes.
 */
export function getStreakboard(limit = 50) {
  const all = getAllSavesWithAccounts()
    .map(({ username, discordId, data }) => ({
      username,
      discordId,
      bestWinStreak: data?.stats?.bestWinStreak ?? 0,
      currentWinStreak: data?.stats?.currentWinStreak ?? 0,
    }))
    .filter((r) => r.bestWinStreak > 0)
    .sort((a, b) => b.bestWinStreak - a.bestWinStreak)
    .slice(0, Math.max(1, Math.min(200, limit)));
  return all.map((r, i) => ({ ...r, position: i + 1 }));
}

export function getPlaytimeboard(limit = 50) {
  const all = getAllSavesWithAccounts()
    .map(({ username, discordId, data }) => ({
      username,
      discordId,
      totalPlayTimeSeconds: data?.stats?.totalPlayTimeSeconds ?? 0,
    }))
    .filter((r) => r.totalPlayTimeSeconds > 0)
    .sort((a, b) => b.totalPlayTimeSeconds - a.totalPlayTimeSeconds)
    .slice(0, Math.max(1, Math.min(200, limit)));
  return all.map((r, i) => ({ ...r, position: i + 1 }));
}

/**
 * Bundles the accounts-table profile with the read-only bits of the save
 * blob useful for a detailed /bb-stats or /bb-achievements card (tokens,
 * unlocked achievement ids, daily streak, playtime, combo, multiplayer
 * counts, powerups used). Read-only - never written back.
 */
export function getFullBundle(discordId) {
  const row = db.prepare('SELECT * FROM accounts WHERE discord_id = ?').get(discordId);
  if (!row) return null;
  const profile = toProfile(row);
  const saveRow = db.prepare('SELECT data FROM saves WHERE account_id = ?').get(row.id);
  let save = null;
  try {
    save = saveRow ? JSON.parse(saveRow.data) : null;
  } catch {
    save = null;
  }
  return {
    profile,
    tokens: save?.tokens ?? 0,
    achievements: save?.achievements ? Object.keys(save.achievements) : [],
    daily: save?.daily ?? { streak: 0, lastClaimDate: null, totalClaims: 0 },
    stats: save?.stats ?? null,
  };
}

/**
 * Persists the outcome of one finished multiplayer match for a player.
 * accuracyPct: 0-100, percentage of that player's clicks that completed a match.
 * clicksPerMinute: that player's clicks during the match, normalized per minute.
 * matchesContributed: number of triplet matches that player personally completed.
 * won: whether the room's shared game ended in a win.
 * level: the level that was played (used for a small XP bonus).
 */
export function recordGameResult(username, { won, level, accuracyPct, clicksPerMinute, matchesContributed }) {
  const row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
  if (!row) return null;

  const xpEarned =
    20 + (won ? 50 : 0) + Math.min(level || 1, 100) * 2 + Math.max(0, matchesContributed || 0) * 5;

  const prevMatches = row.matches;
  const newMatches = prevMatches + 1;
  const newAccuracy = (row.accuracy * prevMatches + (accuracyPct || 0)) / newMatches;
  const newSpeed = (row.speed * prevMatches + (clicksPerMinute || 0)) / newMatches;

  db.prepare(
    `UPDATE accounts SET
       xp = xp + ?,
       wins = wins + ?,
       matches = ?,
       accuracy = ?,
       speed = ?
     WHERE username = ?`
  ).run(xpEarned, won ? 1 : 0, newMatches, newAccuracy, newSpeed, username);

  return toProfile(db.prepare('SELECT * FROM accounts WHERE username = ?').get(username));
}
