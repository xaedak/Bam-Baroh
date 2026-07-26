// Thin wrapper around @discord/embedded-app-sdk.
//
// Bam Baroh can run two ways:
//  1. As a Discord Activity, embedded in an iframe inside the Discord
//     client. Discord loads it with a `frame_id` query param and proxies
//     all network requests through the SDK.
//  2. As a plain website (dev/testing, or a browser tab), where there is no
//     Discord context at all.
//
// Everything here is a no-op that resolves to `null` in case (2), so the
// rest of the app (AuthContext) can fall back to the existing
// username/password flow without any special-casing.
//
// Setup required (not something this code can do for you):
//   1. Create/open your app at https://discord.com/developers/applications
//   2. Set VITE_DISCORD_CLIENT_ID (in a .env file, client-side, public) to
//      its Application ID.
//   3. Set DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET on the *server*
///     (server/.env or your host's env vars) to the same app's ID/secret.
//   4. Under Activities -> URL Mappings, map your root URL ("/") to
//      wherever this client is deployed, per Discord's Activities docs.
//   5. ALSO under URL Mappings, add a second mapping (e.g. prefix
//      "/proxy-server") pointing at the multiplayer server's host (no
//      protocol, just the domain, e.g. `bam-baroh.onrender.com`). Discord
//      blocks every direct request to an external domain from inside the
//      Activity iframe - REST calls and the Socket.IO connection both have
//      to go through this mapped proxy path instead (see
//      `discord/network.ts`, `multiplayer/api.ts`, `multiplayer/socket.ts`).
//      If VITE_DISCORD_PROXY_PREFIX isn't set, the client assumes
//      "/proxy-server" - keep the Portal mapping and the env var in sync.
//
// This can only be exercised for real inside the Discord client itself —
// it cannot be tested from a plain browser tab or from this sandbox.

import type { Profile } from '../multiplayer/api';
import { loginWithDiscord } from '../multiplayer/api';
import { isDiscordActivity } from './network';

export { isDiscordActivity };

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

export interface DiscordAuthResult {
  token: string;
  profile: Profile;
  save: unknown | null;
}

let sdkPromise: Promise<DiscordAuthResult | null> | null = null;

/**
 * Runs the Discord authorize -> exchange -> authenticate handshake once.
 * Safe to call multiple times (e.g. React StrictMode double-invoke) — the
 * work only happens once per page load. Returns null if we're not inside
 * Discord, or if anything about the flow fails (network, missing config,
 * user declined authorization, etc) so the app can fall back gracefully.
 */
export function initDiscordAuth(): Promise<DiscordAuthResult | null> {
  if (!isDiscordActivity()) return Promise.resolve(null);
  if (!CLIENT_ID) {
    console.warn('[discord] Running inside a Discord Activity but VITE_DISCORD_CLIENT_ID is not set.');
    return Promise.resolve(null);
  }
  if (!sdkPromise) {
    sdkPromise = runDiscordHandshake(CLIENT_ID).catch((err) => {
      console.error('[discord] Auth handshake failed:', err);
      return null;
    });
  }
  return sdkPromise;
}

async function runDiscordHandshake(clientId: string): Promise<DiscordAuthResult | null> {
  // Dynamically imported so the (fairly large) SDK never ends up in the
  // bundle for people playing outside Discord.
  const { DiscordSDK } = await import('@discord/embedded-app-sdk');
  const discordSdk = new DiscordSDK(clientId);
  await discordSdk.ready();

  const { code } = await discordSdk.commands.authorize({
    client_id: clientId,
    response_type: 'code',
    state: '',
    prompt: 'none',
    scope: ['identify'],
  });

  // The actual token exchange happens on our backend (needs the client
  // secret, which must never ship to the browser). This is also what
  // establishes our own app session/progression — it is sufficient on its
  // own, independent of the note below.
  const exchanged = await loginWithDiscord(code);
  if (!exchanged.ok || !exchanged.data) {
    throw new Error(exchanged.error || 'Discord code exchange failed.');
  }

  // NOTE: discordSdk.commands.authenticate() is intentionally not called
  // here. It requires Discord's own OAuth access_token, and our backend
  // deliberately does not forward that back to the client (no reason to
  // widen its exposure beyond the server). Skipping it only means the
  // Discord client doesn't mark this Activity session as "authenticated"
  // for *its own* SDK commands (e.g. participant lists); our identify-based
  // login above is unaffected and is all this app currently needs. If a
  // future feature needs those SDK commands, have /api/auth/discord also
  // return the Discord access_token and call authenticate() with it here.

  return exchanged.data;
}
