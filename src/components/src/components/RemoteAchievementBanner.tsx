import React, { useEffect, useRef } from 'react';
import { useMultiplayer } from '../state/MultiplayerContext';

const DISPLAY_MS = 4000;

/**
 * Smaller, quieter counterpart to AchievementToast: shown to everyone else
 * in a multiplayer room when a teammate unlocks an achievement. Queues and
 * auto-dismisses the same way AchievementToast does, just scaled down.
 */
export const RemoteAchievementBanner: React.FC = () => {
  const { remoteAchievements, dismissRemoteAchievement } = useMultiplayer();
  const current = remoteAchievements[0] ?? null;
  const shownKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!current || shownKeyRef.current === current.key) return;
    shownKeyRef.current = current.key;
    const t = window.setTimeout(() => dismissRemoteAchievement(current.key), DISPLAY_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key]);

  if (!current) return null;

  return (
    <div
      key={current.key}
      role="status"
      aria-live="polite"
      className="fixed top-[calc(env(safe-area-inset-top)+12px)] right-3 z-[55] max-w-[260px] animate-popIn"
    >
      <div className="rounded-xl bg-dusk-900/90 dark:bg-dusk-950/90 border border-marigold-400/50 shadow-tile px-3 py-2 flex items-center gap-2 backdrop-blur">
        <span className="text-lg flex-shrink-0" aria-hidden="true">
          {current.icon}
        </span>
        <p className="font-body text-[11px] text-cream-100 leading-snug">
          🏆 <span className="text-marigold-400 font-semibold">{current.playerName}</span> unlocked{' '}
          <span className="uppercase font-display text-[10px] tracking-wide">{current.title}</span>
        </p>
      </div>
    </div>
  );
};
