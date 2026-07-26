import React from 'react';
import { useSave } from '../state/SaveContext';

interface StatisticsProps {
  onBack: () => void;
}

export const Statistics: React.FC<StatisticsProps> = ({ onBack }) => {
  const { save } = useSave();
  const s = save.stats;

  const winRate = s.levelsPlayed > 0 ? Math.round((s.levelsWon / s.levelsPlayed) * 100) : 0;
  const avgScore = s.levelsWon > 0 ? Math.round(s.totalScore / s.levelsWon) : 0;

  return (
    <div className="min-h-[100dvh] bg-dusk-800 dark:bg-dusk-950 text-cream-100 px-4 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6 max-w-md mx-auto">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="font-display text-2xl text-marigold-400">Statistics</h1>
      </header>

      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div className="rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-5 text-center">
          <p className="font-display text-4xl text-marigold-400">{winRate}%</p>
          <p className="font-mono text-[11px] uppercase tracking-wide text-cream-200/50 mt-1">Win Rate</p>
          <p className="font-body text-xs text-cream-200/60 mt-2">
            {s.levelsWon} won · {s.levelsLost} lost · {s.levelsPlayed} played
          </p>
        </div>

        <Section title="Progress">
          <StatRow label="Total Score" value={s.totalScore.toLocaleString()} />
          <StatRow label="Best Score (single level)" value={s.bestScore.toLocaleString()} />
          <StatRow label="Average Score per Win" value={avgScore.toLocaleString()} />
          <StatRow label="Total Stars Earned" value={s.totalStars.toLocaleString()} />
          <StatRow label="Perfect (3★) Levels" value={s.threeStarLevels.toLocaleString()} />
        </Section>

        <Section title="Skill">
          <StatRow label="Best Combo" value={`x${s.bestCombo}`} />
          <StatRow label="Current Win Streak" value={s.currentWinStreak.toLocaleString()} />
          <StatRow label="Best Win Streak" value={s.bestWinStreak.toLocaleString()} />
          <StatRow
            label="Fastest Win"
            value={s.fastestWinSeconds !== null ? formatDuration(s.fastestWinSeconds) : '—'}
          />
        </Section>

        <Section title="Activity">
          <StatRow label="Total Matches" value={s.totalMatches.toLocaleString()} />
          <StatRow label="Total Moves" value={s.totalMoves.toLocaleString()} />
          <StatRow label="Time Played" value={formatDuration(s.totalPlayTimeSeconds)} />
          <StatRow label="Hints Used" value={s.hintsUsed.toLocaleString()} />
          <StatRow label="Magic Solves Used" value={s.magicSolvesUsed.toLocaleString()} />
        </Section>

        <Section title="Multiplayer">
          <StatRow label="Matches Played" value={s.multiplayerGamesPlayed.toLocaleString()} />
          <StatRow label="Matches Won" value={s.multiplayerWins.toLocaleString()} />
        </Section>

        <div className="rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-4 flex items-center justify-between">
          <div>
            <p className="font-display text-base text-cream-100">Market Tokens</p>
            <p className="font-body text-xs text-cream-200/60">Earned from achievements &amp; daily rewards</p>
          </div>
          <p className="font-display text-2xl text-marigold-400 flex items-center gap-1">
            🪙 {save.tokens.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-4">
    <p className="font-display text-sm text-marigold-400 mb-2">{title}</p>
    <div className="flex flex-col divide-y divide-cream-100/5">{children}</div>
  </div>
);

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
    <span className="font-body text-sm text-cream-200/70">{label}</span>
    <span className="font-mono text-sm text-cream-100 font-semibold">{value}</span>
  </div>
);
