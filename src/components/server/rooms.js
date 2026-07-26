import { generateBoard, getLevelConfig, isTileCovered } from './levels.js';

export const MAX_PLAYERS = 8;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I - avoids ambiguity
const CODE_LENGTH = 4;

/** @type {Map<string, Room>} */
const rooms = new Map();

function randomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function uniqueCode() {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();
  return code;
}

class Room {
  constructor(code, level) {
    this.code = code;
    this.level = level;
    this.config = getLevelConfig(level);
    this.board = [];
    this.tray = [];
    this.status = 'lobby'; // lobby | playing | won | lost
    this.score = 0;
    this.combo = 0;
    this.matches = 0;
    this.moves = 0;
    this.lastMatchType = null;
    /** @type {Map<string, {id:string, name:string, username:string|null, clicks:number, matchClicks:number}>} */
    this.players = new Map();
    this.hostId = null;
    this.startedAt = null;
    this.statsRecorded = false;
  }

  addPlayer(id, name, username = null) {
    this.players.set(id, {
      id,
      name: name.slice(0, 20) || 'Player',
      username: username || null,
      clicks: 0,
      matchClicks: 0,
    });
    if (!this.hostId) this.hostId = id;
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) {
      const next = this.players.keys().next();
      this.hostId = next.done ? null : next.value;
    }
  }

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
    for (const p of this.players.values()) {
      p.clicks = 0;
      p.matchClicks = 0;
    }
  }

  /** Mirrors applyTileRemoval() in src/hooks/useGameEngine.ts */
  clickTile(playerId, tileId) {
    if (this.status !== 'playing') return { ok: false, reason: 'not-playing' };
    const player = this.players.get(playerId);
    if (!player) return { ok: false, reason: 'not-in-room' };
    const tile = this.board.find((t) => t.id === tileId);
    if (!tile || tile.removed) return { ok: false, reason: 'invalid-tile' };
    if (isTileCovered(tile, this.board)) return { ok: false, reason: 'covered' };
    if (this.tray.length >= this.config.traySize) return { ok: false, reason: 'tray-full' };

    player.clicks += 1;

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

  /** Per-player accuracy/speed snapshot for the game that just ended. */
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
      code: this.code,
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
    };
  }
}

export function createRoom(hostId, hostName, level, hostUsername) {
  const code = uniqueCode();
  const room = new Room(code, level && level >= 1 ? level : 1);
  room.addPlayer(hostId, hostName, hostUsername);
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get((code || '').toUpperCase());
}

export function deleteRoom(code) {
  rooms.delete(code);
}

export function findRoomByPlayer(playerId) {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) return room;
  }
  return null;
}

export { Room };
