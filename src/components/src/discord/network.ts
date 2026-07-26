// Discord Activities run inside a sandboxed iframe that blocks direct
// network requests (fetch AND WebSocket) to any external domain - even ones
// that work fine in a normal browser tab. Every request has to be routed
// through Discord's own proxy as a relative path like `/.proxy/<prefix>/...`,
// which Discord then forwards to whatever host you mapped that prefix to in
// the Developer Portal (Activities -> URL Mappings).
//
// Set VITE_DISCORD_PROXY_PREFIX to whatever prefix you configured there
// (defaults to "/proxy-server" if you don't set one - just make sure the
// Developer Portal mapping and this env var agree).

/** True when we appear to be running inside the Discord client as an Activity. */
export function isDiscordActivity(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('frame_id') || window.location.hostname.endsWith('.discordsays.com');
}

const RAW_PREFIX =
  (import.meta.env.VITE_DISCORD_PROXY_PREFIX as string | undefined) || '/proxy-server';

/** Always starts with exactly one leading slash, no trailing slash. */
export const DISCORD_PROXY_PREFIX = `/${RAW_PREFIX.replace(/^\/+/, '').replace(/\/+$/, '')}`;

/** `/.proxy/<prefix>` - the same-origin base every REST call must use while running as a Discord Activity. */
export const DISCORD_PROXY_BASE = `/.proxy${DISCORD_PROXY_PREFIX}`;
