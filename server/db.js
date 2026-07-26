import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'bam-baroh.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    salt TEXT,
    discord_id TEXT UNIQUE,
    discord_avatar TEXT,
    xp INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    matches INTEGER NOT NULL DEFAULT 0,
    accuracy REAL NOT NULL DEFAULT 0,
    speed REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- One row per account: the full client-side progression blob (unlocked
  -- level, stars, achievements, stats, tokens, settings) serialized as
  -- JSON. Keyed by account id so it travels with the player's Discord
  -- identity across every server/guild they open the Activity from,
  -- instead of being trapped in one device's localStorage.
  CREATE TABLE IF NOT EXISTS saves (
    account_id INTEGER PRIMARY KEY REFERENCES accounts(id),
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// Lightweight migration for DBs created before discord_id/discord_avatar
// existed, and before password columns became optional. better-sqlite3 has
// no "ADD COLUMN IF NOT EXISTS", so check pragma first.
const columns = db.prepare(`PRAGMA table_info(accounts)`).all().map((c) => c.name);
if (!columns.includes('discord_id')) {
  db.exec(`ALTER TABLE accounts ADD COLUMN discord_id TEXT`);
}
if (!columns.includes('discord_avatar')) {
  db.exec(`ALTER TABLE accounts ADD COLUMN discord_avatar TEXT`);
}
// Enforced separately (rather than inline on the column) so it also covers
// tables that went through the ALTER-TABLE migration path above.
db.exec(
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_discord_id ON accounts(discord_id) WHERE discord_id IS NOT NULL`
);

export default db;
