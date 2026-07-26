import React, { useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { isDiscordActivity } from '../discord/sdk';

interface AccountScreenProps {
  onBack: () => void;
  onLeaderboard: () => void;
}

export const AccountScreen: React.FC<AccountScreenProps> = ({ onBack, onLeaderboard }) => {
  const { token, profile, loading, error, clearError, login, register, logout, viaDiscord } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') await login(username.trim(), password);
    else await register(username.trim(), password);
  };

  const signedIn = !!token && !!profile;

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
        <h1 className="flex-1 text-center font-display text-2xl text-marigold-400 pr-10">
          {signedIn ? 'Profile' : 'Account'}
        </h1>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {!signedIn && !isDiscordActivity() && (
          <div className="w-full max-w-sm rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-5">
            <div className="flex rounded-full bg-dusk-800/70 border border-cream-100/10 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
                className={[
                  'flex-1 rounded-full font-display text-sm py-2 transition-colors',
                  mode === 'login' ? 'bg-marigold-500 text-dusk-950' : 'text-cream-200/70',
                ].join(' ')}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  clearError();
                }}
                className={[
                  'flex-1 rounded-full font-display text-sm py-2 transition-colors',
                  mode === 'register' ? 'bg-marigold-500 text-dusk-950' : 'text-cream-200/70',
                ].join(' ')}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label className="text-left">
                <span className="font-mono text-[11px] uppercase tracking-wide text-cream-200/60">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  placeholder="e.g. Mikun"
                  autoComplete="username"
                  className="mt-1 w-full rounded-xl bg-dusk-800/70 border border-cream-100/15 text-cream-100 font-body text-sm px-3 py-2.5 outline-none focus:border-marigold-400"
                />
              </label>
              <label className="text-left">
                <span className="font-mono text-[11px] uppercase tracking-wide text-cream-200/60">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  maxLength={100}
                  placeholder="At least 6 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="mt-1 w-full rounded-xl bg-dusk-800/70 border border-cream-100/15 text-cream-100 font-body text-sm px-3 py-2.5 outline-none focus:border-marigold-400"
                />
              </label>

              {error && (
                <p className="text-clay-500 text-xs font-body bg-clay-500/10 border border-clay-500/30 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || username.trim().length < 3 || password.length < 6}
                className="mt-1 rounded-full bg-marigold-500 hover:bg-marigold-600 disabled:opacity-40 text-dusk-950 font-display text-lg py-3 shadow-tile active:scale-95 transition-transform"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        {!signedIn && isDiscordActivity() && (
          <div className="w-full max-w-sm rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-6 text-center">
            <div className="text-4xl mb-2 animate-pulse" aria-hidden="true">
              🔗
            </div>
            <p className="font-body text-sm text-cream-200/70">
              Signing you in with your Discord account… no username or password needed here — your progress
              and rank are tied to your Discord identity automatically.
            </p>
          </div>
        )}

        {signedIn && profile && (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <div className="rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-5 text-center">
              <p className="font-display text-3xl text-marigold-400">{profile.username}</p>
              <p className="font-mono text-xs uppercase tracking-wide text-betel-500 mt-1">{profile.rank.name}</p>
              {viaDiscord && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-dusk-800/70 border border-cream-100/10 px-2.5 py-1 font-mono text-[10px] text-cream-200/60">
                  🔗 Synced via Discord — progress follows you to any server
                </p>
              )}

              <div className="mt-4">
                <div className="w-full h-2 rounded-full bg-dusk-800/70 overflow-hidden">
                  <div
                    className="h-full bg-marigold-500"
                    style={{ width: `${Math.round(profile.rank.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-cream-200/50">
                  {profile.rank.nextRank
                    ? `${profile.xp} / ${profile.rank.nextXp} XP to ${profile.rank.nextRank}`
                    : `${profile.xp} XP · Max rank reached`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="XP" value={profile.xp} />
              <StatCard label="Wins" value={profile.wins} />
              <StatCard label="Matches Played" value={profile.matches} />
              <StatCard
                label="Win Rate"
                value={profile.matches > 0 ? `${Math.round((profile.wins / profile.matches) * 100)}%` : '—'}
              />
              <StatCard label="Accuracy" value={`${profile.accuracy}%`} />
              <StatCard label="Speed" value={`${profile.speed}/min`} />
            </div>

            <button
              type="button"
              onClick={onLeaderboard}
              className="rounded-full bg-marigold-500 hover:bg-marigold-600 text-dusk-950 font-display text-lg py-3 shadow-tile active:scale-95 transition-transform"
            >
              🏆 View Leaderboard
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm py-2.5 active:scale-95 transition-transform hover:bg-cream-100/5"
            >
              Sign Out
            </button>
          </div>
        )}

        {!signedIn && (
          <button
            type="button"
            onClick={onLeaderboard}
            className="mt-4 font-mono text-[11px] text-cream-200/50 underline decoration-dotted"
          >
            View global leaderboard →
          </button>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-2xl bg-dusk-700/40 border border-cream-100/10 px-3 py-3 text-center">
    <p className="font-display text-xl text-marigold-400">{value}</p>
    <p className="font-mono text-[10px] uppercase tracking-wide text-cream-200/50 mt-0.5">{label}</p>
  </div>
);
