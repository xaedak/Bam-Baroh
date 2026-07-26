import { io, Socket } from 'socket.io-client';
import { isDiscordActivity, DISCORD_PROXY_PREFIX } from '../discord/network';

const SERVER_URL_KEY = 'bam-baroh-mp-server-url';

const DEFAULT_SERVER_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SOCKET_URL ||
  'http://localhost:3001';

export function getStoredServerUrl(): string {
  try {
    return localStorage.getItem(SERVER_URL_KEY) || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export function setStoredServerUrl(url: string) {
  try {
    localStorage.setItem(SERVER_URL_KEY, url);
  } catch {
    // storage unavailable - fail silently, connection will just use the given url
  }
}

let socket: Socket | null = null;
let socketKey: string | null = null;

/**
 * Lazily creates (or recreates, if the target changed) the shared socket
 * instance.
 *
 * Inside a Discord Activity, a direct WebSocket connection to an external
 * host (like `url`) is blocked by Discord's CSP - same restriction as REST
 * fetches. It has to go out through the mapped Discord proxy instead: same
 * origin as the page itself, with the proxy prefix folded into Socket.IO's
 * handshake path (Discord strips the prefix before forwarding to the real
 * server, which is still just listening on its normal default
 * `/socket.io/` path - no server-side changes needed).
 */
export function getSocket(url: string): Socket {
  const inDiscord = isDiscordActivity();
  const key = inDiscord ? `discord:${DISCORD_PROXY_PREFIX}` : url;
  if (socket && socketKey === key) return socket;
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
  }
  socketKey = key;
  socket = inDiscord
    ? io(window.location.origin, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        path: `/.proxy${DISCORD_PROXY_PREFIX}/socket.io/`,
      })
    : io(url, { autoConnect: false, transports: ['websocket', 'polling'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
}
