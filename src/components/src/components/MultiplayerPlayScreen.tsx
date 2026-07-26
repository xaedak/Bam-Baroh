import React, { useEffect, useRef, useState } from 'react';
import { Tile } from './Tile';
import { Tray } from './Tray';
import { useMultiplayer } from '../state/MultiplayerContext';
import { isTileCovered } from '../data/levels';
import { useSave } from '../state/SaveContext';
import { FOOD_META, POWERUP_META } from '../types/game';

interface MultiplayerPlayScreenProps {
  onExit: () => void;
}

interface FlyingGhost {
  id: string;
  emoji: string;
  color: string;
  from: { left: number; top: number; width: number; height: number };
  to: { left: number; top: number; width: number; height: number };
  fadeOnly?: boolean;
}

interface DragState {
  id: string;
  emoji: string;
  color: string;
  isPowerup: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
}

const DROP_TOLERANCE_PX = 28;

export const MultiplayerPlayScreen: React.FC<MultiplayerPlayScreenProps> = ({ onExit }) => {
  const { room, selfId, isHost, clickTile, restartGame, kickPlayer, leaveTable, broadcastTileDrag, remoteDrags } =
    useMultiplayer();
  const { recordMultiplayerResult } = useSave();
  const [showPlayers, setShowPlayers] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [ghosts, setGhosts] = useState<FlyingGhost[]>([]);
  const resultRecorded = useRef(false);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const traySlotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const trayWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'playing') {
      resultRecorded.current = false;
      return;
    }
    if (resultRecorded.current) return;
    resultRecorded.current = true;
    recordMultiplayerResult({ won: room.status === 'won' });
  }, [room?.status, room, recordMultiplayerResult]);

  const registerTileRef = (id: string, el: HTMLDivElement | null) => {
    if (el) tileRefs.current.set(id, el);
    else tileRefs.current.delete(id);
  };
  const registerSlotRef = (index: number, el: HTMLDivElement | null) => {
    traySlotRefs.current[index] = el;
  };
  const removeGhost = (id: string) => setGhosts((g) => g.filter((gh) => gh.id !== id));

  const isOverTray = (clientX: number, clientY: number) => {
    const rect = trayWrapRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return (
      clientX >= rect.left - DROP_TOLERANCE_PX &&
      clientX <= rect.right + DROP_TOLERANCE_PX &&
      clientY >= rect.top - DROP_TOLERANCE_PX &&
      clientY <= rect.bottom + DROP_TOLERANCE_PX
    );
  };

  const ended = room ? room.status === 'won' || room.status === 'lost' : false;
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  useEffect(() => {
    if (!ended || !room?.advanceAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((room.advanceAt! - Date.now()) / 1000));
      setCountdownSeconds(remaining);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [ended, room?.advanceAt]);

  const handlePickUp = (id: string, clientX: number, clientY: number) => {
    if (ended || dragRef.current || !room) return;
    const tile = room.board.find((t) => t.id === id);
    const srcEl = tileRefs.current.get(id);
    if (!tile || !srcEl) return;
    const rect = srcEl.getBoundingClientRect();
    const meta = FOOD_META[tile.type];
    const powerupMeta = tile.powerup ? POWERUP_META[tile.powerup] : null;
    const next: DragState = {
      id,
      emoji: powerupMeta ? powerupMeta.emoji : meta.emoji,
      color: powerupMeta ? powerupMeta.color : meta.color,
      isPowerup: !!tile.powerup,
      width: rect.width,
      height: rect.height,
      x: clientX,
      y: clientY,
      pointerOffsetX: clientX - (rect.left + rect.width / 2),
      pointerOffsetY: clientY - (rect.top + rect.height / 2),
    };
    dragRef.current = next;
    setDrag(next);
    // Let everyone else in the room see this tile lift immediately, before
    // the move is even resolved server-side.
    broadcastTileDrag(id, true);
  };

  const finishDrag = (clientX: number, clientY: number) => {
    const active = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!active || !room) return;
    broadcastTileDrag(active.id, false);

    const overTray = active.isPowerup || isOverTray(clientX, clientY);
    if (!overTray) return;

    if (active.isPowerup) {
      setGhosts((g) => [
        ...g,
        {
          id: `${active.id}-${Date.now()}`,
          emoji: active.emoji,
          color: active.color,
          from: { left: clientX - active.width / 2, top: clientY - active.height / 2, width: active.width, height: active.height },
          to: { left: clientX - active.width / 2, top: clientY - active.height / 2, width: active.width, height: active.height },
          fadeOnly: true,
        },
      ]);
    } else {
      const targetIndex = Math.min(room.tray.length, room.config.traySize - 1);
      const targetEl = traySlotRefs.current[targetIndex];
      if (targetEl) {
        const t = targetEl.getBoundingClientRect();
        setGhosts((g) => [
          ...g,
          {
            id: `${active.id}-${Date.now()}`,
            emoji: active.emoji,
            color: active.color,
            from: { left: clientX - active.width / 2, top: clientY - active.height / 2, width: active.width, height: active.height },
            to: { left: t.left, top: t.top, width: t.width, height: t.height },
          },
        ]);
      }
    }
    clickTile(active.id);
  };

  useEffect(() => {
    if (!drag) return;
    const handleMove = (e: PointerEvent) => {
      dragRef.current = dragRef.current ? { ...dragRef.current, x: e.clientX, y: e.clientY } : dragRef.current;
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };
    const handleUp = (e: PointerEvent) => finishDrag(e.clientX, e.clientY);
    const handleCancel = () => {
      if (dragRef.current) broadcastTileDrag(dragRef.current.id, false);
      dragRef.current = null;
      setDrag(null);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
    window.addEventListener('pointercancel', handleCancel, { once: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id]);

  if (!room) return null;

  const handleLeave = () => {
    leaveTable();
    onExit();
  };

  const visibleTiles = room.board.filter((t) => !t.removed);
  const draggingOverTray = drag ? !drag.isPowerup && isOverTray(drag.x, drag.y) : false;

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
            Your Table · Lv {room.level}
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
        <div
          className="relative flex-1 min-h-0 rounded-3xl bg-[#3a2a1c]/60 border-2 border-black/20 shadow-inner overflow-hidden"
          style={{ padding: `${8 + room.config.layers * 9}px` }}
        >
          <div
            className="relative w-full h-full mx-auto"
            style={{ maxWidth: `${(room.config.cols / room.config.rows) * 640}px` }}
          >
            <div className="relative w-full" style={{ paddingTop: `${(room.config.rows / room.config.cols) * 100}%` }}>
              <div className="absolute inset-0">
                {room.board.map((tile) => {
                  if (tile.removed) return null;
                  const heldByOther = remoteDrags[tile.id];
                  return (
                    <React.Fragment key={tile.id}>
                      <Tile
                        tile={tile}
                        covered={isTileCovered(tile, room.board)}
                        cols={room.config.cols}
                        rows={room.config.rows}
                        dragging={drag?.id === tile.id}
                        onPickUp={handlePickUp}
                        registerRef={registerTileRef}
                      />
                      {heldByOther && (
                        <div
                          className="absolute pointer-events-none z-30 flex items-start justify-center"
                          style={{
                            left: `calc(${(tile.col * 100) / room.config.cols}% - ${tile.layer * 11}px)`,
                            top: `calc(${(tile.row * 100) / room.config.rows}% - ${tile.layer * 9 + 18}px)`,
                            width: `${100 / room.config.cols}%`,
                          }}
                        >
                          <span className="rounded-full bg-dusk-950/85 border border-marigold-400/60 px-1.5 py-0.5 text-[9px] font-mono text-marigold-300 whitespace-nowrap animate-popIn">
                            ✋ {heldByOther.playerName}
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        ref={trayWrapRef}
        className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 sm:px-6"
      >
        <Tray
          tray={room.tray}
          traySize={room.config.traySize}
          shake={false}
          dropHighlight={draggingOverTray}
          registerSlotRef={registerSlotRef}
        />
      </footer>

      {drag && (
        <div
          className="fixed z-40 pointer-events-none rounded-xl sm:rounded-2xl border-2 border-white/70 shadow-tile flex items-center justify-center text-2xl"
          style={{
            left: drag.x - drag.pointerOffsetX - (drag.width * 1.3) / 2,
            top: drag.y - drag.pointerOffsetY - (drag.height * 1.3) / 2,
            width: drag.width * 1.3,
            height: drag.height * 1.3,
            transform: 'scale(1.15) rotate(-4deg)',
            background: `linear-gradient(155deg, ${drag.color}, ${drag.color}cc)`,
            boxShadow: '0 18px 30px -8px rgba(0,0,0,0.55)',
          }}
        >
          <span aria-hidden="true">{drag.emoji}</span>
        </div>
      )}

      {ghosts.map((ghost) => (
        <FlyingTile key={ghost.id} ghost={ghost} onDone={removeGhost} />
      ))}

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
            <p className="font-mono text-xs text-marigold-600 dark:text-marigold-400 mt-3 animate-pulse">
              {room.status === 'won' ? `Next level in ${countdownSeconds}s…` : `Retrying in ${countdownSeconds}s…`}
            </p>

            <div className="flex flex-col gap-2 mt-5">
              <button
                onClick={restartGame}
                className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg py-2.5 shadow-tile transition-colors"
              >
                {room.status === 'won' ? 'Next Level Now' : 'Retry Now'}
              </button>
              <button
                onClick={handleLeave}
                className="rounded-full border-2 border-dusk-700/30 dark:border-cream-100/20 text-dusk-800 dark:text-cream-100 font-body text-sm py-2 transition-colors hover:bg-dusk-700/5 dark:hover:bg-cream-100/5"
              >
                Leave Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FlyingTile: React.FC<{ ghost: FlyingGhost; onDone: (id: string) => void }> = ({ ghost, onDone }) => {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMoved(true));
    const t = window.setTimeout(() => onDone(ghost.id), 320);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghost.id]);

  const rect = ghost.fadeOnly ? ghost.from : moved ? ghost.to : ghost.from;
  const scale = ghost.fadeOnly ? (moved ? 1.6 : 1) : moved ? 0.72 : 1;

  return (
    <div
      className="fixed z-30 rounded-xl border-2 border-white/40 shadow-tile flex items-center justify-center text-xl pointer-events-none transition-all duration-300 ease-out"
      style={{
        left: rect.left,
        top: rect.top,
        width: ghost.from.width,
        height: ghost.from.height,
        transform: `scale(${scale}) rotate(${moved && !ghost.fadeOnly ? 10 : 0}deg)`,
        opacity: moved ? (ghost.fadeOnly ? 0 : 0.7) : 1,
        background: `linear-gradient(155deg, ${ghost.color}, ${ghost.color}cc)`,
      }}
    >
      <span aria-hidden="true">{ghost.emoji}</span>
    </div>
  );
};
