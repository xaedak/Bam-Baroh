// Server-side half of the Discord Activities auth flow. The client (running
// inside Discord via the Embedded App SDK) obtains a one-time `code` and
// hands it to us — the exchange for an access token has to happen here
// because it requires DISCORD_CLIENT_SECRET, which must never reach the
// client bundle.
//
// Requires two environment variables, set to the values from
// https://discord.com/developers/applications -> your app -> OAuth2:
//   DISCORD_CLIENT_ID
//   DISCORD_CLIENT_SECRET

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

export function isDiscordConfigured() {
  return Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);
}

/**
 * Exchanges an OAuth `code` for an access token, then fetches the
 * authenticated user. Returns `{ id, username, avatar }` or throws.
 *
 * Discord Activities use the implicit "embedded" OAuth flow, which does not
 * send a redirect_uri in the token exchange (the SDK proxies everything
 * through discord.com), so it is intentionally omitted here — see
 * https://discord.com/developers/docs/activities/development-guides/setting-up-authentication
 */
export async function exchangeDiscordCode(code) {
  if (!isDiscordConfigured()) {
    throw new Error('Discord OAuth is not configured on this server (missing client id/secret).');
  }

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => '');
    throw new Error(`Discord token exchange failed (${tokenRes.status}): ${detail}`);
  }

  const tokenJson = await tokenRes.json();

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) {
    throw new Error(`Discord user lookup failed (${userRes.status}).`);
  }
  const user = await userRes.json();

  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;

  return {
    id: user.id,
    username: user.global_name || user.username,
    avatar,
  };
}
