import React, { useState } from 'react';
import { useSave, DAILY_REWARD_TABLE } from '../state/SaveContext';
import { useAudio } from '../hooks/useAudio';

interface DailyRewardsProps {
  onClose: () => void;
}

export const DailyRewards: React.FC<DailyRewardsProps> = ({ onClose }) => {
  const { save, claimDailyReward, isDailyRewardAvailable } = useSave();
  const audio = useAudio();
  const [justClaimed, setJustClaimed] = useState<{ reward: number; streak: number } | null>(null);

  const available = isDailyRewardAvailable();
  const effectiveStreak = justClaimed ? justClaimed.streak : save.daily.streak;
  const todayDay = justClaimed ? justClaimed.streak : available ? save.daily.streak + 1 : save.daily.streak;
  const upcomingDay = todayDay;

  const handleClaim = () => {
    const result = claimDailyReward();
    if (result) {
      setJustClaimed(result);
      audio.playReward();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dusk-950/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-3xl bg-cream-100 dark:bg-dusk-800 border-2 border-marigold-500/50 shadow-signboard p-6 text-center animate-popIn">
        <div className="text-5xl mb-1" aria-hidden="true">
          🎁
        </div>
        <h2 className="font-display text-2xl text-dusk-900 dark:text-cream-100">Daily Reward</h2>
        <p className="font-body text-sm text-dusk-700 dark:text-cream-200/70 mt-1">
          {justClaimed
            ? `Day ${justClaimed.streak} claimed — come back tomorrow!`
            : available
              ? `Day ${upcomingDay} is ready to claim`
              : 'Already claimed today — come back tomorrow!'}
        </p>

        <div className="grid grid-cols-7 gap-1.5 my-5">
          {DAILY_REWARD_TABLE.map((reward, i) => {
            const day = i + 1;
            // A cell within the current 7-day cycle is "done" if this day
            // number is at or before how far the streak has progressed.
            const cyclePos = ((effectiveStreak - 1) % DAILY_REWARD_TABLE.length) + 1;
            const done = day <= cyclePos;
            const isTodayCell = day === cyclePos && (justClaimed !== null || !available);
            const isReadyCell = day === (((todayDay - 1) % DAILY_REWARD_TABLE.length) + 1) && available && !justClaimed;
            return (
              <div
                key={day}
                className={[
                  'rounded-lg py-2 flex flex-col items-center justify-center gap-0.5 border',
                  isTodayCell
                    ? 'bg-marigold-500 border-marigold-400 text-dusk-950'
                    : isReadyCell
                      ? 'border-marigold-400 bg-marigold-500/15 text-dusk-900 dark:text-cream-100 animate-glow'
                      : done
                        ? 'bg-betel-500/20 border-betel-500/40 text-betel-500'
                        : 'bg-dusk-700/10 dark:bg-dusk-700/40 border-cream-100/10 text-dusk-700/60 dark:text-cream-200/50',
                ].join(' ')}
              >
                <span className="font-mono text-[9px]">D{day}</span>
                <span className="text-xs">{done || isTodayCell ? '✓' : '🪙'}</span>
                <span className="font-mono text-[9px]">{reward}</span>
              </div>
            );
          })}
        </div>

        {justClaimed ? (
          <p className="font-display text-lg text-marigold-500 mb-3">+{justClaimed.reward} 🪙 Tokens!</p>
        ) : (
          <p className="font-mono text-xs text-dusk-700/70 dark:text-cream-200/50 mb-3">
            Streak: {save.daily.streak} day{save.daily.streak === 1 ? '' : 's'}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {available && !justClaimed && (
            <button
              onClick={handleClaim}
              className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg py-2.5 shadow-tile active:scale-95 transition-transform"
            >
              Claim Reward
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full border-2 border-dusk-700/30 dark:border-cream-100/20 text-dusk-800 dark:text-cream-100 font-body text-sm py-2 transition-colors hover:bg-dusk-700/5 dark:hover:bg-cream-100/5"
          >
            {justClaimed || !available ? 'Close' : 'Maybe Later'}
          </button>
        </div>
      </div>
    </div>
  );
};
