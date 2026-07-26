import { io, Socket } from 'socket.io-client';

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
let socketUrl: string | null = null;

/** Lazily creates (or recreates, if the server URL changed) the shared socket instance. */
export function getSocket(url: string): Socket {
  if (socket && socketUrl === url) return socket;
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
  }
  socketUrl = url;
  socket = io(url, { autoConnect: false, transports: ['websocket', 'polling'] });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
}
