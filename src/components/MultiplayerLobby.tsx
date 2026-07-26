import React, { useEffect, useRef, useState } from 'react';
import { useMultiplayer } from '../state/MultiplayerContext';
import { useSave } from '../state/SaveContext';
import { useAudio } from '../hooks/useAudio';

interface MultiplayerLobbyProps {
  onLeave: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onLeave }) => {
  const { room, selfId, isHost, startGame, kickPlayer, leaveRoom, joinedInProgress } = useMultiplayer();
  const { recordHelpingHand } = useSave();
  const audio = useAudio();
  const [levelDraft, setLevelDraft] = useState('1');
  const helpingHandRecorded = useRef(false);
  const prevPlayerCount = useRef<number | null>(null);

  // "Helping Hand": credit this once per lobby visit, the first time we
  // land in a room whose game was already underway.
  useEffect(() => {
    if (joinedInProgress && !helpingHandRecorded.current) {
      helpingHandRecorded.current = true;
      recordHelpingHand();
    }
  }, [joinedInProgress, recordHelpingHand]);

  // Play a friendly chime whenever the room's player count grows (skips the
  // very first render so we don't chime for ourselves on entry).
  useEffect(() => {
    const count = room?.players.length ?? 0;
    if (prevPlayerCount.current !== null && count > prevPlayerCount.current) {
      audio.playPlayerJoined();
    }
    prevPlayerCount.current = count;
  }, [room?.players.length, audio]);

  if (!room) return null;

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  const handleStart = () => {
    const parsed = parseInt(levelDraft, 10);
    startGame(Number.isNaN(parsed) || parsed < 1 ? 1 : parsed);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dusk-800 dark:bg-dusk-950 text-cream-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-marigold-500/15 blur-3xl animate-glow" />
      </div>

      <header className="relative z-10 flex items-center px-4 pt-4 sm:px-6">
        <button
          onClick={handleLeave}
          aria-label="Leave room"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="flex-1 text-center font-display text-2xl text-marigold-400 pr-10">Lobby</h1>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="text-center mb-6">
          <p className="font-mono text-[11px] uppercase tracking-wide text-cream-200/60">Room code</p>
          <p className="font-display text-5xl tracking-[0.25em] text-marigold-400 drop-shadow-signboard mt-1">
            {room.code}
          </p>
          <p className="font-body text-xs text-cream-200/50 mt-2">Share this code so friends can join</p>
        </div>

        <div className="w-full max-w-sm rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="font-display text-sm text-marigold-400 tracking-wide">
              Players ({room.players.length}/{room.maxPlayers})
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {room.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-dusk-800/60 border border-cream-100/10 px-3 py-2"
              >
                <span className="font-body text-sm text-cream-100 flex items-center gap-2">
                  {p.name}
                  {p.id === room.hostId && (
                    <span className="font-mono text-[9px] uppercase tracking-wide text-marigold-400 border border-marigold-400/40 rounded-full px-1.5 py-0.5">
                      Host
                    </span>
                  )}
                  {p.id === selfId && <span className="font-mono text-[10px] text-cream-200/40">(you)</span>}
                </span>
                {isHost && p.id !== selfId && (
                  <button
                    type="button"
                    onClick={() => kickPlayer(p.id)}
                    className="font-mono text-[10px] uppercase tracking-wide text-clay-500 border border-clay-500/40 rounded-full px-2 py-1 active:scale-90 transition-transform hover:bg-clay-500/10"
                  >
                    Kick
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <div className="w-full max-w-sm mt-5 flex flex-col gap-3">
            <label className="flex items-center justify-between rounded-xl bg-dusk-700/40 border border-cream-100/10 px-3 py-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-cream-200/60">Level</span>
              <input
                type="number"
                min={1}
                value={levelDraft}
                onChange={(e) => setLevelDraft(e.target.value)}
                className="w-20 rounded-lg bg-dusk-800/70 border border-cream-100/15 text-cream-100 font-mono text-sm px-2 py-1 text-right outline-none focus:border-marigold-400"
              />
            </label>
            <button
              type="button"
              onClick={handleStart}
              className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg py-3 shadow-tile active:scale-95 transition-transform"
            >
              Start Game
            </button>
          </div>
        ) : (
          <p className="mt-5 font-mono text-xs text-cream-200/50 animate-pulse">Waiting for the host to start…</p>
        )}
      </div>
    </div>
  );
};
