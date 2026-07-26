import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSave } from '../state/SaveContext';
import { useAuth } from '../state/AuthContext';
import { TOTAL_LEVELS } from '../data/levels';
import { useAudio } from '../hooks/useAudio';

interface MainMenuProps {
  onPlay: (level: number) => void;
  onSettings: () => void;
  onTutorial: () => void;
  onMultiplayer: () => void;
  onAccount: () => void;
  onLeaderboard: () => void;
  onAchievements: () => void;
  onStatistics: () => void;
  onDaily: () => void;
  onLegal: () => void;
}

const PAGE_SIZE = 60;
const RENDER_CAP = 4000; // keep the level grid's DOM size sane even with "infinite" levels

export const MainMenu: React.FC<MainMenuProps> = ({
  onPlay,
  onSettings,
  onTutorial,
  onMultiplayer,
  onAccount,
  onLeaderboard,
  onAchievements,
  onStatistics,
  onDaily,
  onLegal,
}) => {
  const { save } = useSave();
  const { profile } = useAuth();
  useAudio('menu', true);
  const unlockedAchievementCount = React.useMemo(
    () => Object.keys(save.achievements).length,
    [save.achievements]
  );

  const initialCount = useMemo(
    () => Math.min(RENDER_CAP, Math.max(PAGE_SIZE, Math.ceil((save.unlockedLevel + 40) / 20) * 20)),
    // Only recompute the starting window size once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [jumpValue, setJumpValue] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll: reveal more of the (effectively endless) level list as
  // the player scrolls near the bottom of the grid, instead of ever trying
  // to render all of TOTAL_LEVELS at once.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((v) => Math.min(RENDER_CAP, Math.min(TOTAL_LEVELS, v + PAGE_SIZE)));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpValue, 10);
    if (Number.isNaN(parsed)) return;
    const target = Math.max(1, Math.min(save.unlockedLevel, parsed));
    onPlay(target);
    setJumpValue('');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dusk-800 dark:bg-dusk-950 text-cream-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-marigold-500/20 blur-3xl animate-glow" />
        <div className="absolute bottom-10 -left-10 w-40 h-40 rounded-full bg-betel-500/15 blur-3xl animate-drift" />
        <div className="absolute bottom-24 -right-10 w-44 h-44 rounded-full bg-clay-500/10 blur-3xl animate-drift" />
      </div>

      <div className="relative z-10 flex flex-col items-center pt-10 pb-4 px-4">
        <img
          src="/branding/logo.png"
          alt="Bam Baroh — Eat Everything!"
          className="w-40 h-40 sm:w-48 sm:h-48 object-contain drop-shadow-signboard"
        />
        <h1 className="sr-only">Bam Baroh</h1>
        <p className="font-body text-cream-200/70 text-sm sm:text-base mt-2 text-center max-w-xs">
          Clear the night market plate — match three of a kind before your tray fills up.
        </p>
        <p className="font-mono text-cream-200/40 text-[11px] mt-1 text-center">
          Endless procedurally generated levels — difficulty keeps climbing past level 1000.
        </p>
        <button
          onClick={onDaily}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-dusk-700/60 border border-marigold-400/30 px-3 py-1.5 active:scale-95 transition-transform hover:bg-dusk-700"
          aria-label="Market tokens and daily reward"
        >
          <span className="font-mono text-xs text-marigold-400 font-semibold">🪙 {save.tokens}</span>
          <span className="w-px h-3 bg-cream-100/20" aria-hidden="true" />
          <span className="font-mono text-[11px] text-cream-200/80">🎁 Daily</span>
        </button>
      </div>

      <div className="relative z-10 flex justify-center gap-3 px-4 mb-4">
        <button
          onClick={() => onPlay(Math.min(save.unlockedLevel, TOTAL_LEVELS))}
          className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg px-8 py-3 shadow-signboard active:scale-95 transition-transform"
        >
          {save.unlockedLevel > 1 ? `Continue · Lv ${save.unlockedLevel}` : 'Play'}
        </button>
      </div>

      <div className="relative z-10 flex justify-center gap-3 px-4 mb-6 flex-wrap">
        <button
          onClick={onMultiplayer}
          className="rounded-full border-2 border-betel-500/50 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-betel-500/10"
        >
          🎮 Multiplayer
        </button>
        <button
          onClick={onAccount}
          className="rounded-full border-2 border-marigold-400/50 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-marigold-400/10"
        >
          {profile ? `👤 ${profile.username}` : '👤 Account'}
        </button>
        <button
          onClick={onLeaderboard}
          className="rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-cream-100/5"
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={onAchievements}
          className="rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-cream-100/5"
        >
          🎖️ Achievements
          {unlockedAchievementCount > 0 && (
            <span className="ml-1 font-mono text-[10px] text-marigold-400">{unlockedAchievementCount}</span>
          )}
        </button>
        <button
          onClick={onStatistics}
          className="rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-cream-100/5"
        >
          📊 Statistics
        </button>
        <button
          onClick={onTutorial}
          className="rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-cream-100/5"
        >
          📖 How to Play
        </button>
        <button
          onClick={onSettings}
          className="rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-cream-100/5"
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="relative z-10 flex-1 min-h-0 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="max-w-md mx-auto h-full rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-3 sm:p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 px-1 mb-2">
            <p className="font-display text-marigold-400 text-sm tracking-wide">Choose a level</p>
            <form onSubmit={handleJump} className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={save.unlockedLevel}
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                placeholder={`1–${save.unlockedLevel}`}
                aria-label="Jump to level"
                className="w-20 rounded-full bg-dusk-800/70 border border-cream-100/15 text-cream-100 font-mono text-xs px-3 py-1.5 outline-none focus:border-marigold-400"
              />
              <button
                type="submit"
                className="rounded-full bg-marigold-500/90 hover:bg-marigold-400 text-dusk-950 font-mono text-xs font-semibold px-3 py-1.5 active:scale-95 transition-transform"
              >
                Go
              </button>
            </form>
          </div>
          <div className="overflow-y-auto grid grid-cols-5 gap-2 pr-1">
            {Array.from({ length: visibleCount }, (_, i) => i + 1).map((lvl) => (
              <LevelButton
                key={lvl}
                level={lvl}
                locked={lvl > save.unlockedLevel}
                stars={save.levelStars[lvl] ?? 0}
                onPlay={onPlay}
              />
            ))}
            <div ref={sentinelRef} className="col-span-5 h-1" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-1 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] px-4">
        <div className="flex items-center gap-3 font-mono text-[11px] text-cream-200/40">
          <button onClick={onLegal} className="underline decoration-dotted hover:text-cream-200/70 transition-colors">
            Terms
          </button>
          <span aria-hidden="true">·</span>
          <button onClick={onLegal} className="underline decoration-dotted hover:text-cream-200/70 transition-colors">
            Privacy
          </button>
        </div>
        <p className="font-mono text-[11px] text-cream-200/30 text-center">
          Developed by @Mikun190 on Discord
        </p>
      </div>
    </div>
  );
};

interface LevelButtonProps {
  level: number;
  locked: boolean;
  stars: number;
  onPlay: (level: number) => void;
}

const LevelButton: React.FC<LevelButtonProps> = React.memo(({ level, locked, stars, onPlay }) => (
  <button
    disabled={locked}
    onClick={() => onPlay(level)}
    className={[
      'aspect-square rounded-xl flex flex-col items-center justify-center font-mono text-sm relative',
      'active:scale-90 transition-transform',
      locked
        ? 'bg-dusk-800/60 text-cream-200/30 cursor-not-allowed'
        : 'bg-marigold-500/90 text-dusk-950 font-semibold shadow-tile hover:bg-marigold-400',
    ].join(' ')}
  >
    {locked ? '🔒' : level}
    {!locked && stars > 0 && (
      <span className="absolute -bottom-1 text-[9px] text-clay-600">{'★'.repeat(stars)}</span>
    )}
  </button>
));

LevelButton.displayName = 'LevelButton';
