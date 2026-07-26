import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { MAX_PLAYERS, createRoom, getRoom, deleteRoom, findRoomByPlayer } from './rooms.js';
import {
  isValidUsername,
  isValidPassword,
  createAccount,
  verifyLogin,
  accountExists,
  createSession,
  getSessionUsername,
  destroySession,
  authMiddleware,
} from './auth.js';
import { getProfile, getLeaderboard, recordGameResult } from './stats.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- Accounts API -----------------------------------------------------

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!isValidUsername(username)) {
    return res
      .status(400)
      .json({ ok: false, error: 'Username must be 3-20 characters: letters, numbers, underscore.' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters.' });
  }
  if (accountExists(username)) {
    return res.status(409).json({ ok: false, error: 'That username is already taken.' });
  }
  createAccount(username, password);
  const token = createSession(username);
  res.json({ ok: true, token, profile: getProfile(username) });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!verifyLogin(username, password)) {
    return res.status(401).json({ ok: false, error: 'Incorrect username or password.' });
  }
  const token = createSession(username);
  res.json({ ok: true, token, profile: getProfile(username) });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  if (req.token) destroySession(req.token);
  res.json({ ok: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  if (!req.username) return res.status(401).json({ ok: false, error: 'Not signed in.' });
  const profile = getProfile(req.username);
  if (!profile) return res.status(404).json({ ok: false, error: 'Account not found.' });
  res.json({ ok: true, profile });
});

app.get('/api/profile/:username', (req, res) => {
  const profile = getProfile(req.params.username);
  if (!profile) return res.status(404).json({ ok: false, error: 'Player not found.' });
  res.json({ ok: true, profile });
});

app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json({ ok: true, leaderboard: getLeaderboard(limit) });
});

// ---- Realtime game server ----------------------------------------------

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

function broadcastState(room) {
  io.to(room.code).emit('room:state', room.toJSON());
}

function safeName(name) {
  return String(name || '').trim().slice(0, 20) || 'Player';
}

/** If the game just ended, persist per-player XP/wins/matches/accuracy/speed once. */
function maybeRecordStats(room) {
  if (room.statsRecorded) return;
  if (room.status !== 'won' && room.status !== 'lost') return;
  room.statsRecorded = true;

  const summary = room.getGameSummary();
  for (const p of summary) {
    if (!p.username) continue; // guest players don't have persistent stats
    recordGameResult(p.username, {
      won: room.status === 'won',
      level: room.level,
      accuracyPct: p.accuracyPct,
      clicksPerMinute: p.clicksPerMinute,
      matchesContributed: p.matchesContributed,
    });
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ name, level, token } = {}, ack) => {
    const username = getSessionUsername(token);
    const room = createRoom(socket.id, safeName(name), level, username);
    socket.join(room.code);
    ack?.({ ok: true, room: room.toJSON(), selfId: socket.id });
  });

  socket.on('room:join', ({ code, name, token } = {}, ack) => {
    const room = getRoom(code);
    if (!room) return ack?.({ ok: false, error: 'Room not found.' });
    if (room.players.size >= MAX_PLAYERS) return ack?.({ ok: false, error: 'Room is full (8/8 players).' });
    if (room.status !== 'lobby') return ack?.({ ok: false, error: 'This game has already started.' });

    const username = getSessionUsername(token);
    room.addPlayer(socket.id, safeName(name), username);
    socket.join(room.code);
    ack?.({ ok: true, room: room.toJSON(), selfId: socket.id });
    broadcastState(room);
  });

  socket.on('room:start', ({ level } = {}) => {
    const room = findRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.size < 1) return;
    room.startOrRestart(level);
    broadcastState(room);
  });

  socket.on('room:restart', () => {
    const room = findRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;
    room.startOrRestart();
    broadcastState(room);
  });

  socket.on('room:kick', ({ playerId } = {}) => {
    const room = findRoomByPlayer(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (!playerId || playerId === socket.id) return;
    if (!room.players.has(playerId)) return;
    room.removePlayer(playerId);
    io.to(playerId).emit('room:kicked');
    io.sockets.sockets.get(playerId)?.leave(room.code);
    broadcastState(room);
  });

  socket.on('room:leave', () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    room.removePlayer(socket.id);
    socket.leave(room.code);
    if (room.players.size === 0) {
      deleteRoom(room.code);
    } else {
      broadcastState(room);
    }
  });

  socket.on('tile:click', ({ tileId } = {}) => {
    const room = findRoomByPlayer(socket.id);
    if (!room || !tileId) return;
    const result = room.clickTile(socket.id, tileId);
    if (result.ok) {
      maybeRecordStats(room);
      broadcastState(room);
    }
  });

  // Relays an achievement unlock to everyone else currently in the same
  // room, for the smaller "player unlocked X" toast on their screens. Purely
  // a passthrough - it doesn't touch room/game state.
  socket.on('achievement:announce', ({ title, icon, playerName } = {}) => {
    const room = findRoomByPlayer(socket.id);
    if (!room || !title) return;
    socket.to(room.code).emit('achievement:announce', {
      title: String(title).slice(0, 60),
      icon: String(icon || '🏆').slice(0, 8),
      playerName: safeName(playerName),
    });
  });

  socket.on('disconnect', () => {
    const room = findRoomByPlayer(socket.id);
    if (!room) return;
    room.removePlayer(socket.id);
    if (room.players.size === 0) {
      deleteRoom(room.code);
    } else {
      broadcastState(room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Bam Baroh multiplayer server listening on :${PORT}`);
});
