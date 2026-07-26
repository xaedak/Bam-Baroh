import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TOTAL_LEVELS } from '../data/levels';

interface LevelPathProps {
  unlockedLevel: number;
  levelStars: Record<number, number>;
  onPlay: (level: number) => void;
}

const ROW_HEIGHT = 108; // vertical spacing between level nodes, px
const AMPLITUDE = 92; // horizontal sway of the S-curve, px
const CHUNK_SIZE = 30; // levels are grouped into pages of 30 (1-30, 31-60, ...)
const MILESTONE_EVERY = 10;

function xOffset(index: number): number {
  return Math.sin(index * 0.7) * AMPLITUDE;
}

export const LevelPath: React.FC<LevelPathProps> = ({ unlockedLevel, levelStars, onPlay }) => {
  const totalChunks = Math.ceil(Math.min(TOTAL_LEVELS, unlockedLevel + CHUNK_SIZE) / CHUNK_SIZE);
  const unlockedChunk = Math.floor((unlockedLevel - 1) / CHUNK_SIZE);

  const [chunk, setChunk] = useState(unlockedChunk);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentNodeRef = useRef<HTMLButtonElement | null>(null);
  const lastCenteredChunk = useRef<number | null>(null);

  const chunkStart = chunk * CHUNK_SIZE + 1;
  const chunkEnd = Math.min(TOTAL_LEVELS, chunkStart + CHUNK_SIZE - 1);
  const levels = useMemo(
    () => Array.from({ length: chunkEnd - chunkStart + 1 }, (_, i) => chunkStart + i),
    [chunkStart, chunkEnd]
  );

  // Scroll the current level into view, but ONLY within this component's own
  // scroll box - never let it escape to the page/window scroll (that was the
  // bug that made the whole app open scrolled down into the level list
  // instead of showing the menu on top).
  const centerOnCurrent = (behavior: ScrollBehavior) => {
    const container = scrollRef.current;
    const node = currentNodeRef.current;
    if (!container || !node) return;
    const target = node.offsetTop - container.clientHeight / 2 + node.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, target), behavior });
  };

  useEffect(() => {
    if (chunk !== unlockedChunk) return; // only auto-land on the player's own chunk
    if (lastCenteredChunk.current === chunk) return;
    lastCenteredChunk.current = chunk;
    // Wait a tick so the node has actually laid out before measuring it.
    const id = window.requestAnimationFrame(() => centerOnCurrent('auto'));
    return () => window.cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunk, levels.length]);

  const zoomToCurrent = () => {
    if (chunk !== unlockedChunk) {
      setChunk(unlockedChunk);
      lastCenteredChunk.current = null;
    } else {
      centerOnCurrent('smooth');
    }
  };

  const totalStars = useMemo(
    () => Object.values(levelStars).reduce((sum, s) => sum + s, 0),
    [levelStars]
  );

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-2 px-1 mb-2">
        <div>
          <p className="font-display text-marigold-400 text-sm tracking-wide">Your journey</p>
          <p className="font-mono text-[10px] text-cream-200/50">
            Level {unlockedLevel} · {totalStars.toLocaleString()} ⭐ collected
          </p>
        </div>
        <button
          type="button"
          onClick={zoomToCurrent}
          aria-label="Jump to current level"
          className="flex items-center gap-1 rounded-full bg-dusk-800/80 border border-marigold-400/40 px-3 py-1.5 text-[11px] font-mono text-marigold-400 active:scale-95 transition-transform hover:bg-dusk-800"
        >
          🎯 Current
        </button>
      </div>

      {/* Chunk navigator - levels are shown 30 at a time instead of one long
          endless list, so the board never has to render (or the player
          scroll through) thousands of nodes at once. */}
      <div className="flex items-center justify-between gap-2 px-1 mb-2">
        <button
          type="button"
          onClick={() => setChunk((c) => Math.max(0, c - 1))}
          disabled={chunk === 0}
          aria-label="Previous levels"
          className="w-8 h-8 rounded-full bg-dusk-800/80 border border-cream-100/15 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-transform"
        >
          ‹
        </button>
        <p className="font-mono text-[11px] text-cream-200/60">
          Levels {chunkStart}–{chunkEnd}
        </p>
        <button
          type="button"
          onClick={() => setChunk((c) => Math.min(totalChunks - 1, c + 1))}
          disabled={chunk >= totalChunks - 1 || chunkStart > unlockedLevel}
          aria-label="Next levels"
          className="w-8 h-8 rounded-full bg-dusk-800/80 border border-cream-100/15 flex items-center justify-center text-sm disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-transform"
        >
          ›
        </button>
      </div>

      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-3xl bg-dusk-700/40 border border-cream-100/10 [scrollbar-width:thin]"
      >
        <div
          className="relative flex flex-col-reverse items-center py-10"
          style={{ minHeight: `${levels.length * ROW_HEIGHT + 80}px` }}
        >
          {levels.map((level, idx) => {
            const nextIdx = idx + 1;
            const hasNext = nextIdx < levels.length;
            const dx = hasNext ? xOffset(nextIdx) - xOffset(idx) : 0;
            return (
              <div
                key={level}
                className="relative flex items-center justify-center"
                style={{ height: `${ROW_HEIGHT}px`, width: '100%' }}
              >
                {hasNext && (
                  <div
                    aria-hidden="true"
                    className={[
                      'absolute rounded-full',
                      level < unlockedLevel ? 'bg-marigold-500/50' : 'bg-cream-100/10',
                    ].join(' ')}
                    style={{
                      width: '5px',
                      height: `${ROW_HEIGHT + 6}px`,
                      left: `calc(50% + ${xOffset(idx)}px)`,
                      top: `${-ROW_HEIGHT / 2}px`,
                      transform: `translateX(-50%) rotate(${Math.atan2(ROW_HEIGHT, -dx) - Math.PI / 2}rad)`,
                      transformOrigin: 'top center',
                    }}
                  />
                )}
                <LevelNode
                  level={level}
                  offsetX={xOffset(idx)}
                  locked={level > unlockedLevel}
                  isCurrent={level === unlockedLevel}
                  stars={levelStars[level] ?? 0}
                  milestone={level % MILESTONE_EVERY === 0}
                  onPlay={onPlay}
                  registerCurrentRef={level === unlockedLevel ? currentNodeRef : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface LevelNodeProps {
  level: number;
  offsetX: number;
  locked: boolean;
  isCurrent: boolean;
  stars: number;
  milestone: boolean;
  onPlay: (level: number) => void;
  registerCurrentRef?: React.Ref<HTMLButtonElement>;
}

const LevelNode: React.FC<LevelNodeProps> = React.memo(
  ({ level, offsetX, locked, isCurrent, stars, milestone, onPlay, registerCurrentRef }) => {
    const size = milestone ? 'w-16 h-16' : 'w-14 h-14';
    return (
      <button
        ref={registerCurrentRef}
        type="button"
        disabled={locked}
        onClick={() => onPlay(level)}
        aria-label={locked ? `Level ${level}, locked` : `Play level ${level}`}
        style={{ transform: `translateX(${offsetX}px)` }}
        className={[
          'relative flex flex-col items-center justify-center rounded-full font-display font-semibold',
          size,
          'transition-transform active:scale-90',
          locked
            ? 'bg-dusk-800/70 border-2 border-cream-100/10 text-cream-200/25 cursor-not-allowed'
            : isCurrent
              ? 'bg-marigold-500 border-4 border-marigold-300 text-dusk-950 shadow-signboard animate-hintPulse'
              : milestone
                ? 'bg-clay-500 border-2 border-clay-600 text-cream-100 shadow-tile hover:brightness-110'
                : 'bg-betel-500/90 border-2 border-betel-600 text-cream-100 shadow-tile hover:brightness-110',
        ].join(' ')}
      >
        {locked ? (
          <span aria-hidden="true" className="text-lg">
            🔒
          </span>
        ) : milestone && !isCurrent ? (
          <span aria-hidden="true" className="text-xl">
            🏆
          </span>
        ) : (
          <span className="text-sm">{level}</span>
        )}
        {!locked && stars > 0 && (
          <span className="absolute -bottom-2.5 text-[10px] text-marigold-400 drop-shadow-signboard">
            {'★'.repeat(stars)}
          </span>
        )}
        {isCurrent && (
          <span className="absolute -top-6 whitespace-nowrap font-mono text-[9px] uppercase tracking-wide text-marigold-400">
            You are here
          </span>
        )}
      </button>
    );
  }
);

LevelNode.displayName = 'LevelNode';
