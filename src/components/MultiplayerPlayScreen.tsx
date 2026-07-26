import React, { useEffect, useRef, useState } from 'react';
import { Tile } from './Tile';
import { Tray } from './Tray';
import { useMultiplayer } from '../state/MultiplayerContext';
import { isTileCovered } from '../data/levels';
import { useSave } from '../state/SaveContext';

interface MultiplayerPlayScreenProps {
  onExit: () => void;
}

export const MultiplayerPlayScreen: React.FC<MultiplayerPlayScreenProps> = ({ onExit }) => {
  const { room, selfId, isHost, clickTile, restartGame, kickPlayer, leaveRoom } = useMultiplayer();
  const { recordMultiplayerResult } = useSave();
  const [showPlayers, setShowPlayers] = useState(false);
  const resultRecorded = useRef(false);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'lobby' || room.status === 'playing') {
      resultRecorded.current = false;
      return;
    }
    if (resultRecorded.current) return;
    resultRecorded.current = true;
    recordMultiplayerResult({ won: room.status === 'won' });
  }, [room?.status, room, recordMultiplayerResult]);

  if (!room) return null;

  const handleLeave = () => {
    leaveRoom();
    onExit();
  };

  const visibleTiles = room.board.filter((t) => !t.removed);
  const ended = room.status === 'won' || room.status === 'lost';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dusk-800 dark:bg-dusk-950 text-cream-100 relative overflow-hidden">
      <header className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6">
        <button
          onClick={handleLeave}
          aria-label="Leave game"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <div className="text-center">
          <p className="font-display text-lg sm:text-xl text-marigold-400">
            Room {room.code} · Lv {room.level}
          </p>
          <p className="font-mono text-[11px] text-cream-200/60">{visibleTiles.length} tiles left</p>
        </div>
        <button
          onClick={() => setShowPlayers((v) => !v)}
          aria-label="Players"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center font-mono text-xs active:scale-90 transition-transform"
        >
          👥{room.players.length}
        </button>
      </header>

      <div className="relative z-10 flex items-center justify-center px-4 pt-2 sm:px-6">
        <p className="font-mono text-xs text-cream-200/70">
          Score <span className="text-marigold-400 font-semibold">{room.score}</span>
          {room.combo > 1 && <span className="ml-2 text-betel-500 font-semibold">Combo x{room.combo}</span>}
        </p>
      </div>

      {showPlayers && (
        <div className="relative z-20 mx-4 sm:mx-6 mt-2 rounded-2xl bg-dusk-700/80 border border-cream-100/10 p-3">
          <ul className="flex flex-col gap-1.5">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-1">
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
      )}

      <main className="relative z-10 flex-1 flex flex-col px-3 pt-3 pb-2 sm:px-6 min-h-0">
        <div className="relative flex-1 min-h-0 rounded-3xl bg-[#3a2a1c]/60 border-2 border-black/20 shadow-inner overflow-hidden">
          <div
            className="relative w-full h-full mx-auto"
            style={{ maxWidth: `${(room.config.cols / room.config.rows) * 640}px` }}
          >
            <div className="relative w-full" style={{ paddingTop: `${(room.config.rows / room.config.cols) * 100}%` }}>
              <div className="absolute inset-0">
                {room.board.map((tile) =>
                  tile.removed ? null : (
                    <Tile
                      key={tile.id}
                      tile={tile}
                      covered={isTileCovered(tile, room.board)}
                      cols={room.config.cols}
                      rows={room.config.rows}
                      onClick={(id) => (ended ? undefined : clickTile(id))}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 sm:px-6">
        <Tray tray={room.tray} traySize={room.config.traySize} shake={false} />
      </footer>

      {ended && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dusk-950/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-cream-100 dark:bg-dusk-800 border-2 border-marigold-500/50 shadow-signboard p-6 text-center animate-popIn">
            <div className="text-5xl mb-2" aria-hidden="true">
              {room.status === 'won' ? '🏮' : '💨'}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-dusk-900 dark:text-cream-100">
              {room.status === 'won' ? 'Plate Cleared!' : 'Tray Overflowed'}
            </h2>
            <p className="font-body text-sm text-dusk-700 dark:text-cream-200/70 mt-1">
              Level {room.level} · {room.moves} moves · Score {room.score}
            </p>

            <div className="flex flex-col gap-2 mt-5">
              {isHost ? (
                <button
                  onClick={restartGame}
                  className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg py-2.5 shadow-tile transition-colors"
                >
                  Restart
                </button>
              ) : (
                <p className="font-mono text-xs text-dusk-700 dark:text-cream-200/60">
                  Waiting for the host to restart…
                </p>
              )}
              <button
                onClick={handleLeave}
                className="rounded-full border-2 border-dusk-700/30 dark:border-cream-100/20 text-dusk-800 dark:text-cream-100 font-body text-sm py-2 transition-colors hover:bg-dusk-700/5 dark:hover:bg-cream-100/5"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
