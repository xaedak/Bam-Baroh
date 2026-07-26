import { generateBoard, getLevelConfig, isTileCovered } from './levels.js';

// Generous headroom since joining is now "be in the same Discord channel",
// not a deliberately-shared 4-char code - there's no reason to gate it as
// tightly as the old code-based rooms did.
export const MAX_PLAYERS = 32;

/** @type {Map<string, Session>} */
const sessions = new Map();

class Session {
  constructor(channelKey, level) {
    this.channelKey = channelKey;
    this.level = level;
    this.config = getLevelConfig(level);
    this.board = generateBoard(this.config);
    this.tray = [];
    // Always 'playing', 'won', or 'lost' - there is no 'lobby' state. A
    // table starts the moment it's created and never waits for a manual
    // "Start" - that's the whole point of "always multiplayer on".
    this.status = 'playing';
    this.score = 0;
    this.combo = 0;
    this.matches = 0;
    this.moves = 0;
    this.lastMatchType = null;
    /** @type {Map<string, {id:string, name:string, username:string|null, clicks:number, matchClicks:number}>} */
    this.players = new Map();
    this.hostId = null;
    this.startedAt = Date.now();
    this.statsRecorded = false;
    /** ms timestamp the table will auto-advance at, or null if not pending. Purely informational for clients (a countdown), the actual advance is driven server-side by a timer in index.js. */
    this.advanceAt = null;
  }

  addPlayer(id, name, username = null) {
    const isRejoin = this.players.has(id);
    this.players.set(id, {
      id,
      name: name.slice(0, 20) || 'Player',
      username: username || null,
      clicks: 0,
      matchClicks: 0,
    });
    if (!this.hostId) this.hostId = id;
    return { joinedInProgress: !isRejoin && this.moves > 0 };
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) {
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
    }
  }

  /** Generates a fresh board for `level` (or the next one) and puts the table back in play. Used both for the manual "restart now" action and for the automatic advance-after-a-few-seconds flow. */
  startOrRestart(level) {
    if (typeof level === 'number' && level >= 1) {
      this.level = level;
    }
    this.config = getLevelConfig(this.level);
    this.board = generateBoard(this.config);
    this.tray = [];
    this.status = 'playing';
    this.score = 0;
    this.combo = 0;
    this.matches = 0;
    this.moves = 0;
    this.lastMatchType = null;
    this.startedAt = Date.now();
    this.statsRecorded = false;
    this.advanceAt = null;
    for (const p of this.players.values()) {
      p.clicks = 0;
      p.matchClicks = 0;
    }
  }

  /** Mirrors applyTileRemoval()/applyPowerupEffect() in src/hooks/useGameEngine.ts */
  clickTile(playerId, tileId) {
    if (this.status !== 'playing') return { ok: false, reason: 'not-playing' };
    const player = this.players.get(playerId);
    if (!player) return { ok: false, reason: 'not-in-room' };
    const tile = this.board.find((t) => t.id === tileId);
    if (!tile || tile.removed) return { ok: false, reason: 'invalid-tile' };
    if (isTileCovered(tile, this.board)) return { ok: false, reason: 'covered' };

    player.clicks += 1;

    if (tile.powerup) {
      this.board = this.board.map((t) => (t.id === tile.id ? { ...t, removed: true } : t));
      this.moves += 1;
      this.score += 20;

      if (tile.powerup === 'wild') {
        const counts = {};
        for (const t of this.tray) counts[t.type] = (counts[t.type] ?? 0) + 1;
        const pairType = Object.keys(counts).find((k) => counts[k] >= 2);
        if (pairType) {
          let removedCount = 0;
          this.tray = this.tray.filter((t) => {
            if (t.type === pairType && removedCount < 2) {
              removedCount += 1;
              return false;
            }
            return true;
          });
          this.score += 40;
          this.combo += 1;
          player.matchClicks += 1;
        }
      } else if (tile.powerup === 'bomb') {
        const others = this.board.filter((t) => !t.removed && t.id !== tile.id);
        let target = null;
        for (const t of others) {
          const covered = others.some((o) => o.id !== t.id && o.row === t.row && o.col === t.col && o.layer > t.layer);
          if (covered) continue;
          if (!target || t.layer > target.layer) target = t;
        }
        if (target) {
          this.board = this.board.map((t) => (t.id === target.id ? { ...t, removed: true } : t));
        }
      }
      // 'freeze' is a score-only bonus in multiplayer rooms, which run
      // without a countdown timer.

      const remainingOnBoard = this.board.filter((t) => !t.removed).length;
      if (remainingOnBoard === 0) this.status = 'won';
      return { ok: true, matched: false, powerup: tile.powerup };
    }

    if (this.tray.length >= this.config.traySize) return { ok: false, reason: 'tray-full' };

    this.board = this.board.map((t) => (t.id === tile.id ? { ...t, removed: true } : t));
    let newTray = [...this.tray, tile];

    const counts = {};
    for (const t of newTray) counts[t.type] = (counts[t.type] ?? 0) + 1;
    const matchType = Object.keys(counts).find((k) => counts[k] >= 3) ?? null;

    let matched = false;
    if (matchType) {
      let removedCount = 0;
      newTray = newTray.filter((t) => {
        if (t.type === matchType && removedCount < 3) {
          removedCount += 1;
          return false;
        }
        return true;
      });
      matched = true;
      player.matchClicks += 1;
    }

    this.tray = newTray;
    this.moves += 1;

    const remainingOnBoard = this.board.filter((t) => !t.removed).length;
    if (remainingOnBoard === 0) this.status = 'won';
    else if (newTray.length >= this.config.traySize) this.status = 'lost';

    const combo = matched ? this.combo + 1 : 0;
    const comboBonus = matched ? 30 + Math.max(0, combo - 1) * 15 : 0;
    if (matched) {
      this.matches += 1;
      this.score += comboBonus;
      this.lastMatchType = matchType;
    }
    this.combo = combo;

    return { ok: true, matched };
  }

  /** Per-player accuracy/speed snapshot for the level that just ended. */
  getGameSummary() {
    const elapsedMs = this.startedAt ? Date.now() - this.startedAt : 0;
    const elapsedMinutes = Math.max(elapsedMs / 60000, 1 / 60);
    return Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      username: p.username,
      clicks: p.clicks,
      matchesContributed: p.matchClicks,
      accuracyPct: p.clicks > 0 ? (p.matchClicks / p.clicks) * 100 : 0,
      clicksPerMinute: p.clicks / elapsedMinutes,
    }));
  }

  toJSON() {
    return {
      channelKey: this.channelKey,
      hostId: this.hostId,
      players: Array.from(this.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username,
      })),
      maxPlayers: MAX_PLAYERS,
      level: this.level,
      config: this.config,
      board: this.board,
      tray: this.tray,
      status: this.status,
      score: this.score,
      combo: this.combo,
      matches: this.matches,
      moves: this.moves,
      lastMatchType: this.lastMatchType,
      advanceAt: this.advanceAt,
    };
  }
}

/**
 * Every Discord channel/Activity-instance gets exactly one persistent,
 * always-playing table. There is no create/join distinction from the
 * client's point of view - the first person in a channel to open the game
 * creates the table implicitly, and everyone after them just joins the
 * same one, whether that's before anything has happened or mid-level.
 */
export function getOrCreateSession(channelKey, level) {
  let session = sessions.get(channelKey);
  if (!session) {
    session = new Session(channelKey, level && level >= 1 ? level : 1);
    sessions.set(channelKey, session);
  }
  return session;
}

export function getSession(channelKey) {
  return sessions.get(channelKey);
}

export function deleteSession(channelKey) {
  sessions.delete(channelKey);
}

export function findSessionByPlayer(playerId) {
  for (const session of sessions.values()) {
    if (session.players.has(playerId)) return session;
  }
  return null;
}

export { Session };
