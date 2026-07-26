import { db } from './db.js';

const MAX_SAVE_BYTES = 200_000; // generous headroom over a real SaveData blob

export function getAccountIdForUsername(username) {
  const row = db.prepare('SELECT id FROM accounts WHERE username = ?').get(username);
  return row ? row.id : null;
}

export function loadSave(accountId) {
  const row = db.prepare('SELECT data, updated_at FROM saves WHERE account_id = ?').get(accountId);
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data), updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

/** Upserts the save blob for an account. Returns the stored updatedAt. */
export function writeSave(accountId, data) {
  const serialized = JSON.stringify(data ?? {});
  if (serialized.length > MAX_SAVE_BYTES) {
    throw new Error('Save data too large.');
  }
  const updatedAt = Date.now();
  db.prepare(
    `INSERT INTO saves (account_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).run(accountId, serialized, updatedAt);
  return updatedAt;
}
