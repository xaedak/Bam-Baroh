import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { MAX_PLAYERS, getOrCreateSession, getSession, deleteSession, findSessionByPlayer } from './rooms.js';
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
  findOrCreateDiscordAccount,
} from './auth.js';
import {
  getProfile,
  getLeaderboard,
  getWinboard,
  getStreakboard,
  getPlaytimeboard,
  getFullBundle,
  recordGameResult,
} from './stats.js';
import { exchangeDiscordCode, isDiscordConfigured } from './discord.js';
import { getAccountIdForUsername, loadSave, writeSave } from './saves.js';

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

// Primary login path when running as a Discord Activity: the client
// obtains a one-time `code` via the Embedded App SDK's authorize command
// and sends it here. We exchange it for the player's real Discord
// identity, find-or-create their account (deduped on discord_id so the
// same player never gets two rows no matter which server they launch
// from), and return a normal session token — same shape as the
// username/password flow, so multiplayer/leaderboard code needs no
// changes downstream.
app.post('/api/auth/discord', async (req, res) => {
  if (!isDiscordConfigured()) {
    return res.status(503).json({
      ok: false,
      error: 'Discord login is not configured on this server (DISCORD_CLIENT_ID/DISCORD_CLIENT_SECRET missing).',
    });
  }
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing Discord auth code.' });
  }
  try {
    const discordUser = await exchangeDiscordCode(code);
    const account = findOrCreateDiscordAccount(discordUser.id, discordUser.username, discordUser.avatar);
    const token = createSession(account.username);
    const save = loadSave(account.id);
    res.json({
      ok: true,
      token,
      profile: getProfile(account.username),
      save: save?.data ?? null,
    });
  } catch (err) {
    console.error('Discord auth failed:', err.message);
    res.status(502).json({ ok: false, error: 'Could not verify Discord account. Please try again.' });
  }
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

// discordId is included in profile payloads for the bot's guild-scoped
// leaderboard filtering and for a player looking at their own account, but
// has no business being exposed on these public, unauthenticated routes.
function omitDiscordId(profile) {
  if (!profile) return profile;
  const { discordId, ...rest } = profile;
  return rest;
}

app.get('/api/profile/:username', (req, res) => {
  const profile = getProfile(req.params.username);
  if (!profile) return res.status(404).json({ ok: false, error: 'Player not found.' });
  res.json({ ok: true, profile: omitDiscordId(profile) });
});

app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json({ ok: true, leaderboard: getLeaderboard(limit).map(omitDiscordId) });
});

// ---- Cross-server progression sync -------------------------------------
// Backs the "play on any Discord server, pick up where you left off"
// requirement: unlockedLevel, stars, achievements, stats, tokens, and
// settings all live here, keyed by account id (which is itself keyed by
// discord_id). Guests (no session) keep using localStorage only.

app.get('/api/save', authMiddleware, (req, res) => {
  if (!req.username) return res.status(401).json({ ok: false, error: 'Not signed in.' });
  const accountId = getAccountIdForUsername(req.username);
  if (!accountId) return res.status(404).json({ ok: false, error: 'Account not found.' });
  const save = loadSave(accountId);
  res.json({ ok: true, save: save?.data ?? null, updatedAt: save?.updatedAt ?? null });
});

app.put('/api/save', authMiddleware, (req, res) => {
  if (!req.username) return res.status(401).json({ ok: false, error: 'Not signed in.' });
  const accountId = getAccountIdForUsername(req.username);
  if (!accountId) return res.status(404).json({ ok: false, error: 'Account not found.' });
  const { save } = req.body || {};
  if (!save || typeof save !== 'object') {
    return res.status(400).json({ ok: false, error: 'Missing save payload.' });
  }
  try {
    const updatedAt = writeSave(accountId, save);
    res.json({ ok: true, updatedAt });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'Could not save progress.' });
  }
});

// ---- Discord bot API ----------------------------------------------------
// A small, strictly read-only surface for the companion Discord bot (see
// /bot). Slash commands only ever have the calling user's Discord id, never
// a username/password, so these are keyed by discord_id instead. Gated by a
// shared secret (BOT_API_KEY) rather than a player session token, since the
// bot process isn't a signed-in player - it's calling on behalf of whoever
// ran the command. Deliberately read-only: the client remains the sole
// writer of save-blob data (tokens, achievements, daily streak - see
// SaveContext.tsx's debounced push), so nothing here mutates that blob;
// doing so would just get silently overwritten by the next client save.
function botAuthMiddleware(req, res, next) {
  const key = process.env.BOT_API_KEY;
  if (!key) {
    return res.status(503).json({ ok: false, error: 'Bot API is not configured on this server (BOT_API_KEY missing).' });
  }
  if (req.get('x-bot-api-key') !== key) {
    return res.status(401).json({ ok: false, error: 'Invalid bot API key.' });
  }
  next();
}

app.get('/api/bot/profile/:discordId', botAuthMiddleware, (req, res) => {
  const bundle = getFullBundle(req.params.discordId);
  if (!bundle) return res.status(404).json({ ok: false, error: 'No linked Bam Baroh account for this Discord user.' });
  res.json({ ok: true, ...bundle });
});

app.get('/api/bot/leaderboard', botAuthMiddleware, (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const sort = req.query.sort || 'xp';
  if (sort === 'wins') return res.json({ ok: true, sort, entries: getWinboard(limit) });
  if (sort === 'streak') return res.json({ ok: true, sort, entries: getStreakboard(limit) });
  if (sort === 'playtime') return res.json({ ok: true, sort, entries: getPlaytimeboard(limit) });
  res.json({ ok: true, sort: 'xp', entries: getLeaderboard(limit) });
});

// ---- Realtime game server ----------------------------------------------

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

function broadcastState(session) {
  io.to(session.channelKey).emit('table:state', session.toJSON());
}

function safeName(name) {
  return String(name || '').trim().slice(0, 20) || 'Player';
}

/** If the level just ended, persist per-player XP/wins/matches/accuracy/speed once. */
function maybeRecordStats(session) {
  if (session.statsRecorded) return;
  if (session.status !== 'won' && session.status !== 'lost') return;
  session.statsRecorded = true;

  const summary = session.getGameSummary();
  for (const p of summary) {
    if (!p.username) continue; // guest players don't have persistent stats
    recordGameResult(p.username, {
      won: session.status === 'won',
      level: session.level,
      accuracyPct: p.accuracyPct,
      clicksPerMinute: p.clicksPerMinute,
      matchesContributed: p.matchesContributed,
    });
  }
}

// Auto-advance timers, keyed by channelKey - lets a table keep itself
// flowing (win -> next level, lose -> retry the same level) without any
// player having to press a button, "just like in single player" but for
// the whole table at once. A manual table:restart can always short-circuit
// the wait.
const ADVANCE_DELAY_MS = 2600;
/** @type {Map<string, NodeJS.Timeout>} */
const advanceTimers = new Map();

function scheduleAdvance(session) {
  if (session.status !== 'won' && session.status !== 'lost') return;
  const existing = advanceTimers.get(session.channelKey);
  if (existing) clearTimeout(existing);

  session.advanceAt = Date.now() + ADVANCE_DELAY_MS;
  broadcastState(session);

  const timer = setTimeout(() => {
    advanceTimers.delete(session.channelKey);
    const current = getSession(session.channelKey);
    if (!current || current.players.size === 0) return; // table emptied out - nothing to advance
    if (current.status === 'won') current.startOrRestart(current.level + 1);
    else if (current.status === 'lost') current.startOrRestart(current.level);
    else return; // someone already force-restarted manually
    broadcastState(current);
  }, ADVANCE_DELAY_MS);
  advanceTimers.set(session.channelKey, timer);
}

function clearAdvanceTimer(channelKey) {
  const existing = advanceTimers.get(channelKey);
  if (existing) {
    clearTimeout(existing);
    advanceTimers.delete(channelKey);
  }
}

io.on('connection', (socket) => {
  // The one and only way into a game: be in the same Discord channel
  // (channelKey is that channel's Activity instance id, or a fixed default
  // outside Discord). No code to type, no invite link to click, no
  // create/join distinction - if the table doesn't exist yet this creates
  // it already mid-play at level 1; if it does, you drop straight into
  // whatever's happening right now.
  socket.on('table:join', ({ channelKey, name, token } = {}, ack) => {
    const key = String(channelKey || '').trim().slice(0, 120) || 'web-default-table';
    const session = getOrCreateSession(key, 1);
    if (session.players.size >= MAX_PLAYERS) return ack?.({ ok: false, error: 'This table is completely full.' });

    const username = getSessionUsername(token);
    const { joinedInProgress } = session.addPlayer(socket.id, safeName(name), username);
    socket.join(key);
    ack?.({ ok: true, room: session.toJSON(), selfId: socket.id, joinedInProgress });
    broadcastState(session);
  });

  // Anyone at the table can force an immediate restart/next-level rather
  // than waiting out the auto-advance countdown - there's no host gating
  // this, since "no single player, anyone can join anytime" means no one
  // player should be able to block the group either.
  socket.on('table:restart', () => {
    const session = findSessionByPlayer(socket.id);
    if (!session) return;
    clearAdvanceTimer(session.channelKey);
    session.startOrRestart(session.status === 'won' ? session.level + 1 : session.level);
    broadcastState(session);
  });

  socket.on('table:kick', ({ playerId } = {}) => {
    const session = findSessionByPlayer(socket.id);
    if (!session || session.hostId !== socket.id) return;
    if (!playerId || playerId === socket.id) return;
    if (!session.players.has(playerId)) return;
    session.removePlayer(playerId);
    io.to(playerId).emit('table:kicked');
    io.sockets.sockets.get(playerId)?.leave(session.channelKey);
    broadcastState(session);
  });

  socket.on('table:leave', () => {
    const session = findSessionByPlayer(socket.id);
    if (!session) return;
    session.removePlayer(socket.id);
    socket.leave(session.channelKey);
    if (session.players.size === 0) {
      clearAdvanceTimer(session.channelKey);
      deleteSession(session.channelKey);
    } else {
      broadcastState(session);
    }
  });

  socket.on('tile:click', ({ tileId } = {}) => {
    const session = findSessionByPlayer(socket.id);
    if (!session || !tileId) return;
    const result = session.clickTile(socket.id, tileId);
    if (result.ok) {
      maybeRecordStats(session);
      if (session.status === 'won' || session.status === 'lost') {
        scheduleAdvance(session);
      } else {
        broadcastState(session);
      }
    }
  });

  // Relays an achievement unlock to everyone else currently at the same
  // table, for the smaller "player unlocked X" toast on their screens.
  // Purely a passthrough - it doesn't touch table/game state.
  socket.on('achievement:announce', ({ title, icon, playerName } = {}) => {
    const session = findSessionByPlayer(socket.id);
    if (!session || !title) return;
    socket.to(session.channelKey).emit('achievement:announce', {
      title: String(title).slice(0, 60),
      icon: String(icon || '🏆').slice(0, 8),
      playerName: safeName(playerName),
    });
  });

  // Relays "I just picked up this tile" / "I let go of it" to everyone else
  // at the table, purely as a live cursor-style hint - it never touches
  // board/game state (the actual move still only lands via tile:click,
  // resolved authoritatively above). Lets every other player see a tile
  // lift and follow a player's drag in real time before it's dropped.
  socket.on('tile:drag', ({ tileId, active } = {}) => {
    const session = findSessionByPlayer(socket.id);
    if (!session || !tileId) return;
    const player = session.players.get(socket.id);
    socket.to(session.channelKey).emit('tile:drag', {
      tileId: String(tileId),
      active: !!active,
      playerId: socket.id,
      playerName: player?.name ?? 'Player',
    });
  });

  socket.on('disconnect', () => {
    const session = findSessionByPlayer(socket.id);
    if (!session) return;
    session.removePlayer(socket.id);
    if (session.players.size === 0) {
      clearAdvanceTimer(session.channelKey);
      deleteSession(session.channelKey);
    } else {
      broadcastState(session);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Bam Baroh multiplayer server listening on :${PORT}`);
});
