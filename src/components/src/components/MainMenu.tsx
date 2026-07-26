import React, { useMemo } from 'react';
import { useSave } from '../state/SaveContext';
import { useAuth } from '../state/AuthContext';
import { TOTAL_LEVELS } from '../data/levels';
import { useAudio } from '../hooks/useAudio';
import { FloatingFoods } from './FloatingFoods';
import { LevelPath } from './LevelPath';

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
  const unlockedAchievementCount = useMemo(
    () => Object.keys(save.achievements).length,
    [save.achievements]
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dusk-900 dark:bg-dusk-950 text-cream-100 relative overflow-hidden">
      {/* Layered festival-night backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-dusk-950 via-dusk-900 to-dusk-800" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-marigold-500/20 blur-3xl animate-glow" />
        <div className="absolute bottom-10 -left-10 w-48 h-48 rounded-full bg-betel-500/15 blur-3xl animate-drift" />
        <div className="absolute bottom-24 -right-10 w-52 h-52 rounded-full bg-clay-500/15 blur-3xl animate-drift" />
        <div className="absolute top-1/3 right-0 w-40 h-40 rounded-full bg-marigold-400/10 blur-3xl animate-glow" />
      </div>
      <FloatingFoods />

      {/* Lantern accents — small festival touch, purely decorative */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-6 sm:px-10 z-[1]" aria-hidden="true">
        <span className="text-2xl sm:text-3xl opacity-70 animate-lanternSwing origin-top">🏮</span>
        <span className="text-2xl sm:text-3xl opacity-70 animate-lanternSwing origin-top" style={{ animationDelay: '1.2s' }}>
          🏮
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-10 pb-3 px-4">
        <img
          src="/branding/logo.png"
          alt="Bam Baroh — Eat Everything!"
          className="w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-signboard animate-logoEntrance"
        />
        <h1 className="sr-only">Bam Baroh</h1>
        <p
          className="font-body text-cream-200/70 text-sm sm:text-base mt-2 text-center max-w-xs animate-fadeUp"
          style={{ animationDelay: '150ms' }}
        >
          Clear the night market plate — match three of a kind before your tray fills up.
        </p>
        <p
          className="font-mono text-cream-200/40 text-[11px] mt-1 text-center animate-fadeUp"
          style={{ animationDelay: '250ms' }}
        >
          Endless procedurally generated levels — the feast never runs out.
        </p>
        <button
          onClick={onDaily}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-dusk-700/60 border border-marigold-400/30 px-3 py-1.5 active:scale-95 transition-all hover:bg-dusk-700 hover:border-marigold-400/60 hover:-translate-y-0.5 animate-fadeUp"
          style={{ animationDelay: '320ms' }}
          aria-label="Market tokens and daily reward"
        >
          <span className="font-mono text-xs text-marigold-400 font-semibold">🪙 {save.tokens}</span>
          <span className="w-px h-3 bg-cream-100/20" aria-hidden="true" />
          <span className="font-mono text-[11px] text-cream-200/80">🎁 Daily</span>
        </button>
      </div>

      <div className="relative z-10 flex justify-center px-4 mb-4 animate-fadeUp" style={{ animationDelay: '380ms' }}>
        <button
          onClick={() => onPlay(Math.min(save.unlockedLevel, TOTAL_LEVELS))}
          className={[
            'relative rounded-full font-display text-lg px-9 py-3.5 shadow-signboard active:scale-95',
            'transition-all hover:-translate-y-0.5 hover:shadow-tileup',
            'bg-gradient-to-r from-marigold-400 via-marigold-500 to-clay-500 text-dusk-950',
            'bg-[length:200%_100%] hover:animate-shimmer',
          ].join(' ')}
        >
          {save.unlockedLevel > 1 ? `Continue · Lv ${save.unlockedLevel}` : '▶ Play'}
        </button>
      </div>

      <div
        className="relative z-10 flex justify-center gap-2.5 px-4 mb-5 flex-wrap animate-fadeUp"
        style={{ animationDelay: '440ms' }}
      >
        <MenuChip icon="🎮" label="Multiplayer" onClick={onMultiplayer} accentClass="border-betel-500/50 hover:bg-betel-500/10" />
        <MenuChip
          icon="👤"
          label={profile ? profile.username : 'Account'}
          onClick={onAccount}
          accentClass="border-marigold-400/50 hover:bg-marigold-400/10"
        />
        <MenuChip icon="🏆" label="Leaderboard" onClick={onLeaderboard} />
        <MenuChip
          icon="🎖️"
          label="Achievements"
          onClick={onAchievements}
          badge={unlockedAchievementCount > 0 ? unlockedAchievementCount : undefined}
        />
        <MenuChip icon="📊" label="Statistics" onClick={onStatistics} />
        <MenuChip icon="📖" label="How to Play" onClick={onTutorial} />
        <MenuChip icon="⚙️" label="Settings" onClick={onSettings} />
      </div>

      <div className="relative z-10 flex-1 min-h-0 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="max-w-md mx-auto h-full rounded-3xl bg-dusk-700/30 border border-cream-100/10 p-3 sm:p-4 flex flex-col min-h-0 backdrop-blur-sm shadow-tile">
          <LevelPath unlockedLevel={save.unlockedLevel} levelStars={save.levelStars} onPlay={onPlay} />
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

interface MenuChipProps {
  icon: string;
  label: string;
  onClick: () => void;
  badge?: number;
  accentClass?: string;
}

const MenuChip: React.FC<MenuChipProps> = ({ icon, label, onClick, badge, accentClass }) => (
  <button
    onClick={onClick}
    className={[
      'rounded-full border-2 text-cream-100 font-body text-sm px-4 py-2 flex items-center gap-1.5',
      'active:scale-95 transition-all hover:-translate-y-0.5',
      accentClass || 'border-cream-100/20 hover:bg-cream-100/5',
    ].join(' ')}
  >
    <span aria-hidden="true">{icon}</span>
    <span className="max-w-[9rem] truncate">{label}</span>
    {badge !== undefined && <span className="font-mono text-[10px] text-marigold-400">{badge}</span>}
  </button>
);
