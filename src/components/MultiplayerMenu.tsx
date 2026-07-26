import React, { useState } from 'react';
import { useMultiplayer } from '../state/MultiplayerContext';
import { useAuth } from '../state/AuthContext';

interface MultiplayerMenuProps {
  onBack: () => void;
  onEnterLobby: () => void;
  onAccount?: () => void;
}

const NAME_KEY = 'bam-baroh-mp-name';

function loadStoredName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

function storeName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // ignore
  }
}

export const MultiplayerMenu: React.FC<MultiplayerMenuProps> = ({ onBack, onEnterLobby, onAccount }) => {
  const { serverUrl, setServerUrl, connecting, error, clearError, createRoom, joinRoom } = useMultiplayer();
  const { token, profile } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState(profile?.username || loadStoredName);
  const [code, setCode] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [urlDraft, setUrlDraft] = useState(serverUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim() || 'Player';
    storeName(trimmedName);
    const ok =
      mode === 'create'
        ? await createRoom(trimmedName, 1, token)
        : await joinRoom(code, trimmedName, token);
    if (ok) onEnterLobby();
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-dusk-800 dark:bg-dusk-950 text-cream-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-betel-500/15 blur-3xl animate-glow" />
      </div>

      <header className="relative z-10 flex items-center px-4 pt-4 sm:px-6">
        <button
          onClick={onBack}
          aria-label="Back to menu"
          className="w-10 h-10 rounded-full bg-dusk-700/70 border border-cream-100/10 flex items-center justify-center text-xl active:scale-90 transition-transform"
        >
          ←
        </button>
        <h1 className="flex-1 text-center font-display text-2xl text-marigold-400 pr-10">Multiplayer</h1>
      </header>

      <div className="relative z-10 flex-1 flex flex-col items-center px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="w-full max-w-sm rounded-3xl bg-dusk-700/40 border border-cream-100/10 p-5">
          {onAccount && (
            <button
              type="button"
              onClick={onAccount}
              className="w-full text-left mb-4 rounded-xl bg-dusk-800/60 border border-cream-100/10 px-3 py-2 flex items-center justify-between"
            >
              <span className="font-mono text-[11px] text-cream-200/70">
                {profile ? `Signed in as ${profile.username} · ${profile.rank.name}` : 'Not signed in — stats won\u2019t be saved'}
              </span>
              <span className="font-mono text-[10px] text-marigold-400">Account →</span>
            </button>
          )}
          <div className="flex rounded-full bg-dusk-800/70 border border-cream-100/10 p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('create');
                clearError();
              }}
              className={[
                'flex-1 rounded-full font-display text-sm py-2 transition-colors',
                mode === 'create' ? 'bg-marigold-500 text-dusk-950' : 'text-cream-200/70',
              ].join(' ')}
            >
              Create Room
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('join');
                clearError();
              }}
              className={[
                'flex-1 rounded-full font-display text-sm py-2 transition-colors',
                mode === 'join' ? 'bg-marigold-500 text-dusk-950' : 'text-cream-200/70',
              ].join(' ')}
            >
              Join Room
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-left">
              <span className="font-mono text-[11px] uppercase tracking-wide text-cream-200/60">Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="e.g. Mikun"
                className="mt-1 w-full rounded-xl bg-dusk-800/70 border border-cream-100/15 text-cream-100 font-body text-sm px-3 py-2.5 outline-none focus:border-marigold-400"
              />
            </label>

            {mode === 'join' && (
              <label className="text-left">
                <span className="font-mono text-[11px] uppercase tracking-wide text-cream-200/60">Room code</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  placeholder="e.g. F7QK"
                  className="mt-1 w-full rounded-xl bg-dusk-800/70 border border-cream-100/15 text-cream-100 font-mono text-lg tracking-[0.3em] text-center px-3 py-2.5 outline-none focus:border-marigold-400 uppercase"
                />
              </label>
            )}

            {error && (
              <p className="text-clay-500 text-xs font-body bg-clay-500/10 border border-clay-500/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={connecting || (mode === 'join' && code.trim().length < 4)}
              className="mt-1 rounded-full bg-marigold-500 hover:bg-marigold-600 disabled:opacity-40 text-dusk-950 font-display text-lg py-3 shadow-tile active:scale-95 transition-transform"
            >
              {connecting ? 'Connecting…' : mode === 'create' ? 'Create Room' : 'Join Room'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-4 font-mono text-[11px] text-cream-200/50 underline decoration-dotted"
          >
            {showAdvanced ? 'Hide' : 'Show'} server settings
          </button>
          {showAdvanced && (
            <div className="mt-2 flex gap-2">
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="http://localhost:3001"
                className="flex-1 rounded-xl bg-dusk-800/70 border border-cream-100/15 text-cream-100 font-mono text-xs px-3 py-2 outline-none focus:border-marigold-400"
              />
              <button
                type="button"
                onClick={() => setServerUrl(urlDraft)}
                className="rounded-xl bg-dusk-700/70 border border-cream-100/15 text-cream-100 font-mono text-xs px-3 py-2 active:scale-95 transition-transform"
              >
                Save
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 max-w-sm text-center font-body text-xs text-cream-200/50">
          Play the shared board together in real time — up to 8 players per room. The host controls
          starting, restarting, and kicking players.
        </p>
      </div>
    </div>
  );
};
