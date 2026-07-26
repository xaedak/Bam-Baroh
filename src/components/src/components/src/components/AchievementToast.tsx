import React, { useEffect, useRef } from 'react';
import { useSave } from '../state/SaveContext';
import { useAudio } from '../hooks/useAudio';
import { useAuth } from '../state/AuthContext';
import { useMultiplayer } from '../state/MultiplayerContext';
import { AchievementRarity } from '../data/achievements';
import { Particles, ParticlesHandle } from './Particles';

const DISPLAY_MS = 4500;
const NAME_KEY = 'bam-baroh-mp-name';

const RARITY_STYLES: Record<
  AchievementRarity,
  { ring: string; text: string; glow: string; badgeBg: string; particleColors: string[] }
> = {
  common: {
    ring: 'border-cream-100/40',
    text: 'text-cream-100',
    glow: 'shadow-[0_0_18px_2px_rgba(244,238,223,0.25)]',
    badgeBg: 'bg-cream-100/15',
    particleColors: ['#F4EEDF', '#E9DFC6'],
  },
  rare: {
    ring: 'border-sky-400/70',
    text: 'text-sky-300',
    glow: 'shadow-[0_0_22px_4px_rgba(56,189,248,0.35)]',
    badgeBg: 'bg-sky-400/15',
    particleColors: ['#38BDF8', '#7DD3FC', '#F4EEDF'],
  },
  epic: {
    ring: 'border-purple-400/70',
    text: 'text-purple-300',
    glow: 'shadow-[0_0_24px_5px_rgba(192,132,252,0.4)]',
    badgeBg: 'bg-purple-400/15',
    particleColors: ['#C084FC', '#E879F9', '#F4EEDF'],
  },
  legendary: {
    ring: 'border-marigold-400/80',
    text: 'text-marigold-400',
    glow: 'shadow-[0_0_28px_6px_rgba(255,200,87,0.45)]',
    badgeBg: 'bg-marigold-500/20',
    particleColors: ['#FFC857', '#F5A524', '#F4EEDF'],
  },
  mythic: {
    ring: 'border-clay-500/80',
    text: 'text-clay-500',
    glow: 'shadow-[0_0_32px_8px_rgba(193,80,46,0.5)]',
    badgeBg: 'bg-clay-500/20',
    particleColors: ['#C1502E', '#FFC857', '#E879F9', '#38BDF8'],
  },
};

function getDisplayName(
  profileUsername: string | null | undefined,
  room: ReturnType<typeof useMultiplayer>['room'],
  selfId: string | null
): string {
  if (room && selfId) {
    const me = room.players.find((p) => p.id === selfId);
    if (me?.name) return me.name;
  }
  if (profileUsername) return profileUsername;
  try {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) return stored;
  } catch {
    // ignore
  }
  return 'Player';
}

export const AchievementToast: React.FC = () => {
  const { pendingAchievements, dismissAchievement } = useSave();
  const audio = useAudio();
  const { profile } = useAuth();
  const { room, selfId, announceAchievement } = useMultiplayer();
  const current = pendingAchievements[0] ?? null;
  const shownIdRef = useRef<string | null>(null);
  const particlesRef = useRef<ParticlesHandle>(null);

  useEffect(() => {
    if (!current || shownIdRef.current === current.id) return;
    shownIdRef.current = current.id;
    audio.playAchievementUnlock();

    // Small celebratory burst near the top of the screen where the toast lands.
    const burstX = window.innerWidth / 2;
    const burstY = 90;
    const style = RARITY_STYLES[current.rarity];
    particlesRef.current?.burst(burstX, burstY, style.particleColors, 26);

    // Let everyone else currently in the room know, too (smaller toast on
    // their end - see RemoteAchievementBanner).
    if (room) {
      const name = getDisplayName(profile?.username, room, selfId);
      announceAchievement(current.title, current.icon, name);
    }

    const t = window.setTimeout(() => dismissAchievement(current.id), DISPLAY_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const style = RARITY_STYLES[current.rarity];
  const playerName = getDisplayName(profile?.username, room, selfId);

  return (
    <>
      <Particles ref={particlesRef} />
      <div
        key={current.id}
        role="status"
        aria-live="polite"
        className="fixed inset-x-0 mx-auto bottom-[calc(env(safe-area-inset-bottom)+16px)] z-[60] w-[calc(100%-2rem)] max-w-sm animate-achievementSlideUp"
      >
        <div
          className={[
            'rounded-2xl bg-dusk-900/95 dark:bg-dusk-950/95 border-2 px-4 py-3 flex items-center gap-3 backdrop-blur',
            style.ring,
            style.glow,
          ].join(' ')}
        >
          <div
            className={[
              'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 animate-glow',
              style.badgeBg,
            ].join(' ')}
            aria-hidden="true"
          >
            {current.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className={['font-mono text-[10px] uppercase tracking-wide', style.text].join(' ')}>
              🏆 {playerName} unlocked
            </p>
            <p className="font-display text-base text-cream-100 truncate uppercase tracking-wide">{current.title}</p>
            <p className="font-body text-xs text-cream-200/60 truncate">{current.description}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className={[
                'font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                style.badgeBg,
                style.text,
              ].join(' ')}
            >
              {current.rarity}
            </span>
            <span className="font-mono text-xs text-marigold-400">+{current.xpReward} XP</span>
          </div>
        </div>
      </div>
    </>
  );
};
