import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TOTAL_LEVELS } from '../data/levels';

interface LevelPathProps {
  unlockedLevel: number;
  levelStars: Record<number, number>;
  onPlay: (level: number) => void;
}

const ROW_HEIGHT = 108; // vertical spacing between level nodes, px
const AMPLITUDE = 92; // horizontal sway of the S-curve, px
const PAGE_SIZE = 60;
const RENDER_CAP = 3000; // keep the DOM size sane even with "endless" levels
const MILESTONE_EVERY = 10;

function xOffset(index: number): number {
  return Math.sin(index * 0.7) * AMPLITUDE;
}

export const LevelPath: React.FC<LevelPathProps> = ({ unlockedLevel, levelStars, onPlay }) => {
  const initialCount = useMemo(
    () => Math.min(RENDER_CAP, Math.max(PAGE_SIZE, Math.ceil((unlockedLevel + 30) / 20) * 20)),
    // Only recompute the starting window size once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const currentNodeRef = useRef<HTMLButtonElement | null>(null);
  const hasCenteredRef = useRef(false);

  const levels = useMemo(() => Array.from({ length: visibleCount }, (_, i) => i + 1), [visibleCount]);

  // Grow the window as the player scrolls further up (toward higher,
  // not-yet-rendered levels) instead of ever rendering all of TOTAL_LEVELS.
  useEffect(() => {
    const node = topSentinelRef.current;
    const root = scrollRef.current;
    if (!node || !root) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((v) => Math.min(RENDER_CAP, Math.min(TOTAL_LEVELS, v + PAGE_SIZE)));
        }
      },
      { root, rootMargin: '400px 0px 0px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Land on the player's current level on first render, so they aren't
  // dropped at level 1 every time they open the menu.
  useEffect(() => {
    if (hasCenteredRef.current) return;
    if (!currentNodeRef.current) return;
    hasCenteredRef.current = true;
    currentNodeRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [levels.length]);

  const zoomToCurrent = () => {
    currentNodeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

      <div
        ref={scrollRef}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-3xl bg-dusk-700/40 border border-cream-100/10 [scrollbar-width:thin]"
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
          <div ref={topSentinelRef} aria-hidden="true" className="h-1 w-full" />
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
