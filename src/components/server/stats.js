import { db } from './db.js';
import { getRankInfo } from './ranks.js';

function toProfile(row) {
  if (!row) return null;
  return {
    username: row.username,
    xp: row.xp,
    wins: row.wins,
    matches: row.matches,
    accuracy: Math.round(row.accuracy * 10) / 10,
    speed: Math.round(row.speed * 10) / 10,
    rank: getRankInfo(row.xp),
  };
}

export function getProfile(username) {
  const row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
  return toProfile(row);
}

export function getLeaderboard(limit = 50) {
  const rows = db
    .prepare('SELECT * FROM accounts ORDER BY xp DESC, wins DESC LIMIT ?')
    .all(Math.max(1, Math.min(200, limit)));
  return rows.map((row, i) => ({ ...toProfile(row), position: i + 1 }));
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
