import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, getStoredServerUrl, setStoredServerUrl } from '../multiplayer/socket';
import { CreateRoomAck, JoinRoomAck, RoomState } from '../multiplayer/types';

export interface RemoteAchievementEvent {
  key: string;
  playerName: string;
  title: string;
  icon: string;
}

interface MultiplayerContextValue {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  connecting: boolean;
  room: RoomState | null;
  selfId: string | null;
  error: string | null;
  isHost: boolean;
  /** True if the most recent room:join landed in a room whose game was
   * already underway (rather than still in the lobby) - drives the
   * "Helping Hand" achievement. */
  joinedInProgress: boolean;
  clearError: () => void;
  createRoom: (name: string, level: number, token?: string | null) => Promise<boolean>;
  joinRoom: (code: string, name: string, token?: string | null) => Promise<boolean>;
  leaveRoom: () => void;
  startGame: (level?: number) => void;
  restartGame: () => void;
  kickPlayer: (playerId: string) => void;
  clickTile: (tileId: string) => void;
  /** Tell everyone else currently in the room that an achievement unlocked. */
  announceAchievement: (title: string, icon: string, playerName: string) => void;
  remoteAchievements: RemoteAchievementEvent[];
  dismissRemoteAchievement: (key: string) => void;
}

const MultiplayerContext = createContext<MultiplayerContextValue | null>(null);

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  const [serverUrlState, setServerUrlState] = useState(getStoredServerUrl());
  const [connecting, setConnecting] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinedInProgress, setJoinedInProgress] = useState(false);
  const [remoteAchievements, setRemoteAchievements] = useState<RemoteAchievementEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const setServerUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStoredServerUrl(trimmed);
    setServerUrlState(trimmed);
  }, []);

  const ensureSocket = useCallback((): Socket => {
    const s = getSocket(serverUrlState);
    if (socketRef.current !== s) {
      socketRef.current = s;
      s.off('room:state');
      s.off('room:kicked');
      s.off('disconnect');
      s.off('achievement:announce');
      s.on('room:state', (next: RoomState) => setRoom(next));
      s.on('room:kicked', () => {
        setRoom(null);
        setSelfId(null);
        setError('You were removed from the room by the host.');
      });
      s.on('disconnect', () => {
        setConnecting(false);
      });
      s.on('achievement:announce', (payload: { playerName?: string; title?: string; icon?: string }) => {
        setRemoteAchievements((prev) => [
          ...prev,
          {
            key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            playerName: payload.playerName || 'Player',
            title: payload.title || 'Achievement',
            icon: payload.icon || '🏆',
          },
        ]);
      });
    }
    if (!s.connected) s.connect();
    return s;
  }, [serverUrlState]);

  const createRoom = useCallback(
    (name: string, level: number, token?: string | null) =>
      new Promise<boolean>((resolve) => {
        setConnecting(true);
        setError(null);
        const s = ensureSocket();
        const onConnectError = () => {
          setConnecting(false);
          setError(`Couldn't reach the multiplayer server at ${serverUrlState}.`);
          resolve(false);
        };
        s.once('connect_error', onConnectError);
        s.emit('room:create', { name, level, token }, (ack: CreateRoomAck) => {
          s.off('connect_error', onConnectError);
          setConnecting(false);
          if (ack.ok && ack.room) {
            setRoom(ack.room);
            setSelfId(ack.selfId ?? s.id ?? null);
            resolve(true);
          } else {
            setError(ack.error ?? 'Could not create room.');
            resolve(false);
          }
        });
      }),
    [ensureSocket, serverUrlState]
  );

  const joinRoom = useCallback(
    (code: string, name: string, token?: string | null) =>
      new Promise<boolean>((resolve) => {
        setConnecting(true);
        setError(null);
        const s = ensureSocket();
        const onConnectError = () => {
          setConnecting(false);
          setError(`Couldn't reach the multiplayer server at ${serverUrlState}.`);
          resolve(false);
        };
        s.once('connect_error', onConnectError);
        s.emit('room:join', { code: code.trim().toUpperCase(), name, token }, (ack: JoinRoomAck) => {
          s.off('connect_error', onConnectError);
          setConnecting(false);
          if (ack.ok && ack.room) {
            setRoom(ack.room);
            setSelfId(ack.selfId ?? s.id ?? null);
            setJoinedInProgress(ack.room.status !== 'lobby');
            resolve(true);
          } else {
            setError(ack.error ?? 'Could not join room.');
            resolve(false);
          }
        });
      }),
    [ensureSocket, serverUrlState]
  );

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setRoom(null);
    setSelfId(null);
  }, []);

  const startGame = useCallback((level?: number) => {
    socketRef.current?.emit('room:start', { level });
  }, []);

  const restartGame = useCallback(() => {
    socketRef.current?.emit('room:restart');
  }, []);

  const kickPlayer = useCallback((playerId: string) => {
    socketRef.current?.emit('room:kick', { playerId });
  }, []);

  const clickTile = useCallback((tileId: string) => {
    socketRef.current?.emit('tile:click', { tileId });
  }, []);

  const announceAchievement = useCallback((title: string, icon: string, playerName: string) => {
    socketRef.current?.emit('achievement:announce', { title, icon, playerName });
  }, []);

  const dismissRemoteAchievement = useCallback((key: string) => {
    setRemoteAchievements((prev) => prev.filter((e) => e.key !== key));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const isHost = !!room && !!selfId && room.hostId === selfId;

  const value = useMemo<MultiplayerContextValue>(
    () => ({
      serverUrl: serverUrlState,
      setServerUrl,
      connecting,
      room,
      selfId,
      error,
      isHost,
      joinedInProgress,
      clearError,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      restartGame,
      kickPlayer,
      clickTile,
      announceAchievement,
      remoteAchievements,
      dismissRemoteAchievement,
    }),
    [
      serverUrlState,
      setServerUrl,
      connecting,
      room,
      selfId,
      error,
      isHost,
      joinedInProgress,
      clearError,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      restartGame,
      kickPlayer,
      clickTile,
      announceAchievement,
      remoteAchievements,
      dismissRemoteAchievement,
    ]
  );

  return <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>;
}

export function useMultiplayer(): MultiplayerContextValue {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be used within MultiplayerProvider');
  return ctx;
}
