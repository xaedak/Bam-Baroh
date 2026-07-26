import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, getStoredServerUrl, setStoredServerUrl } from '../multiplayer/socket';
import { JoinTableAck, RoomState } from '../multiplayer/types';

export interface RemoteAchievementEvent {
  key: string;
  playerName: string;
  title: string;
  icon: string;
}

export interface RemoteDrag {
  playerId: string;
  playerName: string;
}

interface MultiplayerContextValue {
  serverUrl: string;
  setServerUrl: (url: string) => void;
  connecting: boolean;
  room: RoomState | null;
  selfId: string | null;
  error: string | null;
  isHost: boolean;
  /** True if the most recent table:join landed at a table whose level was
   * already underway (rather than freshly created) - drives the
   * "Helping Hand" achievement and the "you joined mid-game" toast. */
  joinedInProgress: boolean;
  clearError: () => void;
  /**
   * The one and only way to play: joins (creating if necessary) the single
   * persistent table for `channelKey` - normally the current Discord
   * Activity instance id, so everyone in the same voice/text channel lands
   * on the same table automatically. No code, no invite link, no separate
   * create-vs-join choice.
   */
  joinTable: (channelKey: string, name: string, token?: string | null) => Promise<boolean>;
  leaveTable: () => void;
  /** Skips the auto-advance countdown and jumps to the next level / retry immediately. Any player at the table can call this - there's no host gate on it. */
  restartGame: () => void;
  kickPlayer: (playerId: string) => void;
  clickTile: (tileId: string) => void;
  /** Tell everyone else at the table a tile is being picked up/dropped, for
   * real-time "someone is holding this tile" visuals - never touches game
   * state on its own. */
  broadcastTileDrag: (tileId: string, active: boolean) => void;
  /** tileId -> who is currently holding it, from other players only. */
  remoteDrags: Record<string, RemoteDrag>;
  /** Tell everyone else currently at the table that an achievement unlocked. */
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
  const [remoteDrags, setRemoteDrags] = useState<Record<string, RemoteDrag>>({});
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
      s.off('table:state');
      s.off('table:kicked');
      s.off('disconnect');
      s.off('achievement:announce');
      s.off('tile:drag');
      s.on('table:state', (next: RoomState) => setRoom(next));
      s.on('table:kicked', () => {
        setRoom(null);
        setSelfId(null);
        setError('You were removed from the table by the host.');
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
      s.on(
        'tile:drag',
        (payload: { tileId?: string; active?: boolean; playerId?: string; playerName?: string }) => {
          if (!payload.tileId) return;
          setRemoteDrags((prev) => {
            const next = { ...prev };
            if (payload.active) {
              next[payload.tileId!] = { playerId: payload.playerId ?? '', playerName: payload.playerName || 'Player' };
            } else {
              delete next[payload.tileId!];
            }
            return next;
          });
        }
      );
    }
    if (!s.connected) s.connect();
    return s;
  }, [serverUrlState]);

  const joinTable = useCallback(
    (channelKey: string, name: string, token?: string | null) =>
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
        s.emit('table:join', { channelKey, name, token }, (ack: JoinTableAck) => {
          s.off('connect_error', onConnectError);
          setConnecting(false);
          if (ack.ok && ack.room) {
            setRoom(ack.room);
            setSelfId(ack.selfId ?? s.id ?? null);
            setJoinedInProgress(!!ack.joinedInProgress);
            resolve(true);
          } else {
            setError(ack.error ?? 'Could not join the table.');
            resolve(false);
          }
        });
      }),
    [ensureSocket, serverUrlState]
  );

  const leaveTable = useCallback(() => {
    socketRef.current?.emit('table:leave');
    setRoom(null);
    setSelfId(null);
    setRemoteDrags({});
  }, []);

  const restartGame = useCallback(() => {
    socketRef.current?.emit('table:restart');
  }, []);

  const kickPlayer = useCallback((playerId: string) => {
    socketRef.current?.emit('table:kick', { playerId });
  }, []);

  const clickTile = useCallback((tileId: string) => {
    socketRef.current?.emit('tile:click', { tileId });
  }, []);

  const broadcastTileDrag = useCallback((tileId: string, active: boolean) => {
    socketRef.current?.emit('tile:drag', { tileId, active });
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
      joinTable,
      leaveTable,
      restartGame,
      kickPlayer,
      clickTile,
      broadcastTileDrag,
      remoteDrags,
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
      joinTable,
      leaveTable,
      restartGame,
      kickPlayer,
      clickTile,
      broadcastTileDrag,
      remoteDrags,
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
