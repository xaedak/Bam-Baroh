import React, { useEffect, useState } from 'react';
import { fetchLeaderboard, LeaderboardEntry } from '../multiplayer/api';
import { useAuth } from '../state/AuthContext';

interface LeaderboardProps {
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(50).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setEntries(res.data.leaderboard);
      else setError(res.error ?? 'Could not load the leaderboard.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dusk-800 dark:bg-dusk-950 text-cream-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-marigold-500/15 blur-3xl animate-glow" />
      </div>

      <header className="relative z-10 flex items-center px-4 pt-4 sm:px-6">
        <button
          onClick={onBack}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="flex-1 text-center font-display text-2xl text-marigold-400 pr-10">🏆 Leaderboard</h1>
      </header>

      <div className="relative z-10 flex-1 min-h-0 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="max-w-md mx-auto h-full rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-3 sm:p-4 flex flex-col min-h-0">
          {error && (
            <p className="text-clay-500 text-xs font-body bg-clay-500/10 border border-clay-500/30 rounded-xl px-3 py-2 mb-2">
              {error}
            </p>
          )}
          {!entries && !error && (
            <p className="font-mono text-xs text-cream-200/50 text-center py-6">Loading…</p>
          )}
          {entries && entries.length === 0 && (
            <p className="font-mono text-xs text-cream-200/50 text-center py-6">
              No ranked players yet — be the first!
            </p>
          )}
          {entries && entries.length > 0 && (
            <ul className="overflow-y-auto flex flex-col gap-1.5 pr-1">
              {entries.map((entry) => {
                const isSelf = profile?.username === entry.username;
                return (
                  <li
                    key={entry.username}
                    className={[
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 border',
                      isSelf
                        ? 'bg-marigold-500/10 border-marigold-500/40'
                        : 'bg-dusk-800/60 border-cream-100/10',
                    ].join(' ')}
                  >
                    <span className="font-mono text-sm w-7 text-center text-cream-200/60">
                      {entry.position <= 3 ? ['🥇', '🥈', '🥉'][entry.position - 1] : entry.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-cream-100 truncate">
                        {entry.username}
                        {isSelf && <span className="font-mono text-[10px] text-cream-200/40 ml-1">(you)</span>}
                      </p>
                      <p className="font-mono text-[10px] text-betel-500 uppercase tracking-wide">
                        {entry.rank.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-marigold-400 text-sm">{entry.xp} XP</p>
                      <p className="font-mono text-[10px] text-cream-200/50">{entry.wins}W · {entry.matches}M</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
