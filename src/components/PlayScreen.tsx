import React, { useEffect, useRef, useState } from 'react';
import { Tile } from './Tile';
import { Tray } from './Tray';
import { ResultModal } from './ResultModal';
import { Particles, ParticlesHandle } from './Particles';
import { useGameEngine, computeStars } from '../hooks/useGameEngine';
import { isTileCovered, TOTAL_LEVELS } from '../data/levels';
import { useSave } from '../state/SaveContext';
import { useAudio } from '../hooks/useAudio';
import { FOOD_META } from '../types/game';

interface PlayScreenProps {
  level: number;
  onExit: () => void;
  onChangeLevel: (level: number) => void;
}

interface FlyingGhost {
  id: string;
  emoji: string;
  color: string;
  from: { left: number; top: number; width: number; height: number };
  to: { left: number; top: number; width: number; height: number };
}

interface ComboPopup {
  key: number;
  combo: number;
}

const CONFETTI_COLORS = ['#FFC857', '#F5A524', '#4C8C4A', '#C1502E', '#3B7EA6'];

export const PlayScreen: React.FC<PlayScreenProps> = ({ level, onExit, onChangeLevel }) => {
  const { state, clickTile, restart, reset, undo, redo, hint, magicSolve, canUndo, canRedo, isSolving } =
    useGameEngine(level);
  const { unlockLevel, setLevelStars, recordLevelResult } = useSave();
  const audio = useAudio('gameplay', true);
  const [shake, setShake] = useState(false);
  const [ghosts, setGhosts] = useState<FlyingGhost[]>([]);
  const [comboPopups, setComboPopups] = useState<ComboPopup[]>([]);
  const prevMatchFlash = useRef(state.matchFlash);
  const prevLoseFlash = useRef(state.loseFlash);
  const prevComboFlash = useRef(state.comboFlash);
  const resultHandled = useRef(false);
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const traySlotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const trayWrapRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<ParticlesHandle>(null);
  const porkMatchesRef = useRef(0);

  useEffect(() => {
    resultHandled.current = false;
    porkMatchesRef.current = 0;
  }, [level]);

  useEffect(() => {
    if (state.matchFlash !== prevMatchFlash.current) {
      prevMatchFlash.current = state.matchFlash;
      audio.playMatch();
      if (state.lastMatchType === 'pork') {
        porkMatchesRef.current += 1;
      }
      const rect = trayWrapRef.current?.getBoundingClientRect();
      const meta = state.lastMatchType ? FOOD_META[state.lastMatchType] : null;
      const colors = meta ? [meta.color, '#FFC857', '#F4EEDF'] : ['#FFC857'];
      if (rect) {
        particlesRef.current?.burst(rect.left + rect.width / 2, rect.top + 16, colors, 22);
      }
    }
  }, [state.matchFlash, state.lastMatchType, audio]);

  useEffect(() => {
    if (state.comboFlash !== prevComboFlash.current) {
      prevComboFlash.current = state.comboFlash;
      audio.playCombo();
      setComboPopups((p) => [...p, { key: state.comboFlash, combo: state.combo }]);
    }
  }, [state.comboFlash, state.combo, audio]);

  useEffect(() => {
    if (state.loseFlash !== prevLoseFlash.current) {
      prevLoseFlash.current = state.loseFlash;
      audio.playTap();
      setShake(true);
      const t = window.setTimeout(() => setShake(false), 350);
      return () => window.clearTimeout(t);
    }
  }, [state.loseFlash, audio]);

  useEffect(() => {
    if (resultHandled.current) return;
    if (state.status === 'won') {
      resultHandled.current = true;
      const stars = computeStars(state);
      setLevelStars(level, stars);
      unlockLevel(level + 1);
      audio.playWin();
      particlesRef.current?.confetti(CONFETTI_COLORS);
    } else if (state.status === 'lost') {
      resultHandled.current = true;
      audio.playLose();
    }
    if (state.status === 'won' || state.status === 'lost') {
      const elapsedSeconds = Math.round((Date.now() - state.startedAt) / 1000);
      recordLevelResult({
        level,
        status: state.status,
        stars: state.status === 'won' ? computeStars(state) : 0,
        moves: state.moves,
        matches: state.matches,
        score: state.score,
        bestCombo: state.bestCombo,
        elapsedSeconds,
        autoSolved: state.autoSolved,
        hintsUsed: state.hintsUsedCount,
        magicSolvesUsed: state.magicSolvesUsedCount,
        porkMatches: porkMatchesRef.current,
      });
    }
  }, [state.status, level, setLevelStars, unlockLevel, audio, state, recordLevelResult]);

  const registerTileRef = (id: string, el: HTMLButtonElement | null) => {
    if (el) tileRefs.current.set(id, el);
    else tileRefs.current.delete(id);
  };

  const registerSlotRef = (index: number, el: HTMLDivElement | null) => {
    traySlotRefs.current[index] = el;
  };

  const removeGhost = (id: string) => {
    setGhosts((g) => g.filter((ghost) => ghost.id !== id));
  };

  const removeComboPopup = (key: number) => {
    setComboPopups((p) => p.filter((c) => c.key !== key));
  };

  const handleTileClick = (id: string) => {
    if (isSolving) return;
    const tile = state.board.find((t) => t.id === id);
    const srcEl = tileRefs.current.get(id);
    const targetIndex = Math.min(state.tray.length, state.config.traySize - 1);
    const targetEl = traySlotRefs.current[targetIndex];
    if (tile && srcEl && targetEl) {
      const s = srcEl.getBoundingClientRect();
      const t = targetEl.getBoundingClientRect();
      const meta = FOOD_META[tile.type];
      setGhosts((g) => [
        ...g,
        {
          id: `${id}-${Date.now()}`,
          emoji: meta.emoji,
          color: meta.color,
          from: { left: s.left, top: s.top, width: s.width, height: s.height },
          to: { left: t.left, top: t.top, width: t.width, height: t.height },
        },
      ]);
    }
    audio.playClick();
    clickTile(id);
  };

  const visibleTiles = state.board.filter((t) => !t.removed);
  const isLastLevel = level >= TOTAL_LEVELS;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dusk-800 dark:bg-dusk-950 text-cream-100 relative overflow-hidden">
      <BackgroundGlow />
      <Particles ref={particlesRef} />

      <header className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6">
        <button
          onClick={onExit}
          aria-label="Back to menu"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <div className="text-center">
          <p className="font-display text-lg sm:text-xl text-marigold-400">Level {level}</p>
          <p className="font-mono text-[11px] text-cream-200/60">{visibleTiles.length} tiles left</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center font-mono text-xs">
          {state.timeLeft !== null ? formatTime(state.timeLeft) : '∞'}
        </div>
      </header>

      <div className="relative z-10 flex items-center justify-between px-4 pt-2 sm:px-6">
        <p className="font-mono text-xs text-cream-200/70">
          Score <span className="text-marigold-400 font-semibold">{state.score}</span>
          {state.combo > 1 && (
            <span className="ml-2 text-betel-500 font-semibold">Combo x{state.combo}</span>
          )}
        </p>
        {isSolving && (
          <p className="font-mono text-[11px] text-marigold-400 animate-pulse">✨ Auto-solving…</p>
        )}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-2 px-4 pt-2 sm:px-6">
        <ToolbarButton label="Undo" icon="↺" onClick={undo} disabled={!canUndo || isSolving} />
        <ToolbarButton label="Redo" icon="↻" onClick={redo} disabled={!canRedo || isSolving} />
        <ToolbarButton label="Reset" icon="⟲" onClick={reset} disabled={isSolving} />
        <ToolbarButton
          label="Hint"
          icon="💡"
          onClick={hint}
          disabled={isSolving || state.status !== 'playing'}
        />
        <ToolbarButton
          label="Magic Solve"
          icon="✨"
          onClick={magicSolve}
          disabled={isSolving || state.status !== 'playing'}
          accent
        />
      </div>

      <main className="relative z-10 flex-1 flex flex-col px-3 pt-3 pb-2 sm:px-6 min-h-0">
        <div
          className="relative flex-1 min-h-0 rounded-3xl bg-[#3a2a1c]/60 border-2 border-black/20 shadow-inner overflow-hidden"
          style={{ padding: `${8 + state.config.layers * 7}px` }}
        >
          <div
            className="relative w-full h-full mx-auto"
            style={{ maxWidth: `${(state.config.cols / state.config.rows) * 640}px` }}
          >
            <div className="relative w-full" style={{ paddingTop: `${(state.config.rows / state.config.cols) * 100}%` }}>
              <div className="absolute inset-0">
                {state.board.map((tile) =>
                  tile.removed ? null : (
                    <Tile
                      key={tile.id}
                      tile={tile}
                      covered={isTileCovered(tile, state.board)}
                      cols={state.config.cols}
                      rows={state.config.rows}
                      onClick={handleTileClick}
                      hinted={tile.id === state.hintTileId}
                      registerRef={registerTileRef}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        ref={trayWrapRef}
        className="relative z-10 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 sm:px-6"
      >
        {comboPopups.map((c) => (
          <span
            key={c.key}
            onAnimationEnd={() => removeComboPopup(c.key)}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-2 font-display text-lg text-betel-500 drop-shadow-signboard animate-floatUp"
          >
            Combo x{c.combo}!
          </span>
        ))}
        <Tray tray={state.tray} traySize={state.config.traySize} shake={shake} registerSlotRef={registerSlotRef} />
      </footer>

      {ghosts.map((ghost) => (
        <FlyingTile key={ghost.id} ghost={ghost} onDone={removeGhost} />
      ))}

      {(state.status === 'won' || state.status === 'lost') && (
        <ResultModal
          status={state.status}
          level={level}
          stars={computeStars(state)}
          moves={state.moves}
          score={state.score}
          isLastLevel={isLastLevel}
          autoSolved={state.autoSolved}
          onRetry={restart}
          onNext={() => onChangeLevel(Math.min(level + 1, TOTAL_LEVELS))}
          onMenu={onExit}
        />
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const BackgroundGlow: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-marigold-500/20 blur-3xl animate-glow" />
    <div className="absolute top-1/3 -right-10 w-48 h-48 rounded-full bg-betel-500/10 blur-3xl animate-glow" />
    <div className="absolute bottom-0 left-1/4 w-36 h-36 rounded-full bg-clay-500/10 blur-3xl animate-glow" />
  </div>
);

interface ToolbarButtonProps {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, icon, onClick, disabled, accent }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={[
      'flex flex-col items-center justify-center gap-0.5 rounded-2xl px-2.5 py-1.5 min-w-[52px]',
      'border transition-transform active:scale-90',
      disabled
        ? 'opacity-35 cursor-not-allowed border-cream-100/10 bg-dusk-700/40'
        : accent
          ? 'border-marigold-400/60 bg-marigold-500/20 hover:bg-marigold-500/30'
          : 'border-cream-100/10 bg-dusk-700/70 hover:bg-dusk-700',
    ].join(' ')}
  >
    <span className="text-base leading-none" aria-hidden="true">
      {icon}
    </span>
    <span className="font-mono text-[9px] uppercase tracking-wide text-cream-200/70">{label}</span>
  </button>
);

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

  const rect = moved ? ghost.to : ghost.from;
  const scale = moved ? 0.72 : 1;

  return (
    <div
      className="fixed z-30 rounded-xl border-2 border-white/40 shadow-tile flex items-center justify-center text-xl pointer-events-none transition-all duration-300 ease-out"
      style={{
        left: rect.left,
        top: rect.top,
        width: ghost.from.width,
        height: ghost.from.height,
        transform: `scale(${scale}) rotate(${moved ? 10 : 0}deg)`,
        opacity: moved ? 0.7 : 1,
        background: `linear-gradient(155deg, ${ghost.color}, ${ghost.color}cc)`,
      }}
    >
      <span aria-hidden="true">{ghost.emoji}</span>
    </div>
  );
};
