import React from 'react';
import { useSave } from '../state/SaveContext';
import { ACHIEVEMENTS, AchievementRarity } from '../data/achievements';

interface AchievementsProps {
  onBack: () => void;
}

const RARITY_LABEL_STYLES: Record<AchievementRarity, string> = {
  common: 'bg-cream-100/15 text-cream-100',
  rare: 'bg-sky-400/15 text-sky-300',
  epic: 'bg-purple-400/15 text-purple-300',
  legendary: 'bg-marigold-500/20 text-marigold-400',
  mythic: 'bg-clay-500/20 text-clay-500',
};

export const Achievements: React.FC<AchievementsProps> = ({ onBack }) => {
  const { save } = useSave();
  const unlockedCount = ACHIEVEMENTS.filter((a) => save.achievements[a.id] !== undefined).length;

  return (
    <div className="min-h-[100dvh] bg-dusk-800 dark:bg-dusk-950 text-cream-100 px-4 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-4 max-w-md mx-auto">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="font-display text-2xl text-marigold-400">Achievements</h1>
      </header>

      <div className="max-w-md mx-auto flex flex-col gap-3">
        <div className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 p-3 flex items-center justify-between">
          <p className="font-mono text-xs text-cream-200/60">
            {unlockedCount} / {ACHIEVEMENTS.length} unlocked
          </p>
          <div className="w-32 h-2 rounded-full bg-dusk-800/70 overflow-hidden">
            <div
              className="h-full bg-marigold-500"
              style={{ width: `${Math.round((unlockedCount / ACHIEVEMENTS.length) * 100)}%` }}
            />
          </div>
        </div>

        {ACHIEVEMENTS.map((a) => {
          const unlockedAt = save.achievements[a.id];
          const unlocked = unlockedAt !== undefined;
          const progress = unlocked ? 1 : a.progress(save.stats, save);
          return (
            <div
              key={a.id}
              className={[
                'rounded-2xl border p-4 flex items-center gap-3',
                unlocked ? 'bg-marigold-500/10 border-marigold-500/40' : 'bg-dusk-700/40 border-cream-100/10',
              ].join(' ')}
            >
              <div
                className={[
                  'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
                  unlocked ? 'bg-marigold-500/20' : 'bg-dusk-800/60 grayscale opacity-50',
                ].join(' ')}
                aria-hidden="true"
              >
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={['font-display text-sm', unlocked ? 'text-marigold-400' : 'text-cream-100'].join(' ')}>
                    {a.title}
                  </p>
                  <span className="font-mono text-[10px] text-cream-200/50 flex-shrink-0">🪙 {a.tokenReward}</span>
                </div>
                <p className="font-body text-xs text-cream-200/60 mt-0.5">{a.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={[
                      'font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                      RARITY_LABEL_STYLES[a.rarity],
                    ].join(' ')}
                  >
                    {a.rarity}
                  </span>
                  <span className="font-mono text-[10px] text-cream-200/50">+{a.xpReward} XP</span>
                </div>
                {!unlocked && (
                  <div className="mt-2 w-full h-1.5 rounded-full bg-dusk-800/70 overflow-hidden">
                    <div
                      className="h-full bg-betel-500"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
