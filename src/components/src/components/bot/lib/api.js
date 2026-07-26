const BASE_URL = process.env.GAME_SERVER_URL || 'http://localhost:3001';
const API_KEY = process.env.BOT_API_KEY;

async function botFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-bot-api-key': API_KEY || '' },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.ok) {
    const error = body?.error || `Request failed (${res.status})`;
    throw new Error(error);
  }
  return body;
}

/** Full profile + save-blob bundle for a linked Discord account, or null if that Discord user has never signed into Bam Baroh. */
export async function fetchProfile(discordId) {
  try {
    return await botFetch(`/api/bot/profile/${encodeURIComponent(discordId)}`);
  } catch (err) {
    if (String(err.message).includes('No linked')) return null;
    throw err;
  }
}

/** sort: 'xp' | 'wins' | 'streak' | 'playtime' */
export async function fetchLeaderboard(sort = 'xp', limit = 100) {
  const body = await botFetch(`/api/bot/leaderboard?sort=${encodeURIComponent(sort)}&limit=${limit}`);
  return body.entries;
}
