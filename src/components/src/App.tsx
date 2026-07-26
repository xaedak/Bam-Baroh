import React, { useEffect, useRef, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { Settings } from './components/Settings';
import { Tutorial } from './components/Tutorial';
import { MultiplayerPlayScreen } from './components/MultiplayerPlayScreen';
import { AccountScreen } from './components/AccountScreen';
import { Leaderboard } from './components/Leaderboard';
import { Achievements } from './components/Achievements';
import { Statistics } from './components/Statistics';
import { Legal } from './components/Legal';
import { DailyRewards } from './components/DailyRewards';
import { AchievementToast } from './components/AchievementToast';
import { RemoteAchievementBanner } from './components/RemoteAchievementBanner';
import { useSave } from './state/SaveContext';
import { useAuth } from './state/AuthContext';
import { MultiplayerProvider, useMultiplayer } from './state/MultiplayerContext';
import { getActivityChannelKey, isDiscordActivity } from './discord/sdk';

type Screen =
  | 'menu'
  | 'table'
  | 'settings'
  | 'tutorial'
  | 'account'
  | 'leaderboard'
  | 'achievements'
  | 'statistics'
  | 'legal';

const NAME_KEY = 'bam-baroh-mp-name';

function loadStoredName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || 'Player';
  } catch {
    return 'Player';
  }
}

function storeName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // ignore
  }
}

function AppInner() {
  const { save, markTutorialSeen, isDailyRewardAvailable } = useSave();
  const { token, profile, discordChecked } = useAuth();
  const { room, connecting, joinTable } = useMultiplayer();
  const [screen, setScreen] = useState<Screen>(save.hasSeenTutorial ? 'menu' : 'tutorial');
  const [showDaily, setShowDaily] = useState(false);
  const joinedOnce = useRef(false);

  // The one and only way onto a table: as soon as we know whether Discord
  // auto-signed us in (or that we're just in a browser tab), quietly join
  // the shared table for this channel in the background - no menu step, no
  // code, no create/join choice. Whoever else opens the game from the same
  // Discord channel lands on this exact same table, any time, mid-level or
  // not.
  useEffect(() => {
    if (!discordChecked || joinedOnce.current) return;
    joinedOnce.current = true;
    const name = profile?.username || loadStoredName();
    storeName(name);
    joinTable(getActivityChannelKey(), name, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discordChecked]);

  // Offer the daily reward once, shortly after landing on the main menu
  // (but only once the tutorial has already been seen, so first-time
  // players aren't hit with two modals back to back).
  useEffect(() => {
    if (screen === 'menu' && save.hasSeenTutorial && isDailyRewardAvailable()) {
      const t = window.setTimeout(() => setShowDaily(true), 500);
      return () => window.clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  return (
    <div className="font-body">
      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('table')}
          onSettings={() => setScreen('settings')}
          onTutorial={() => setScreen('tutorial')}
          onAccount={() => setScreen('account')}
          onLeaderboard={() => setScreen('leaderboard')}
          onAchievements={() => setScreen('achievements')}
          onStatistics={() => setScreen('statistics')}
          onDaily={() => setShowDaily(true)}
          onLegal={() => setScreen('legal')}
          tableLevel={room?.level ?? null}
          tablePlayerCount={room?.players.length ?? null}
        />
      )}

      {screen === 'table' &&
        (room ? (
          <MultiplayerPlayScreen onExit={() => setScreen('menu')} />
        ) : (
          <ConnectingScreen connecting={connecting} onBack={() => setScreen('menu')} />
        ))}

      {screen === 'settings' && <Settings onBack={() => setScreen('menu')} />}

      {screen === 'tutorial' && (
        <Tutorial
          onBack={() => {
            markTutorialSeen();
            setScreen('menu');
          }}
        />
      )}

      {screen === 'account' && (
        <AccountScreen onBack={() => setScreen('menu')} onLeaderboard={() => setScreen('leaderboard')} />
      )}

      {screen === 'leaderboard' && <Leaderboard onBack={() => setScreen('menu')} />}

      {screen === 'achievements' && <Achievements onBack={() => setScreen('menu')} />}

      {screen === 'statistics' && <Statistics onBack={() => setScreen('menu')} />}

      {screen === 'legal' && <Legal onBack={() => setScreen('menu')} />}

      {showDaily && <DailyRewards onClose={() => setShowDaily(false)} />}

      <AchievementToast />
      <RemoteAchievementBanner />
    </div>
  );
}

const ConnectingScreen: React.FC<{ connecting: boolean; onBack: () => void }> = ({ connecting, onBack }) => (
  <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-dusk-800 dark:bg-dusk-950 text-cream-100 px-6 text-center">
    <div className="text-5xl animate-pulse" aria-hidden="true">
      🏮
    </div>
    <p className="font-display text-xl text-marigold-400">
      {connecting ? 'Pulling up a seat at your table…' : "Couldn't reach the table"}
    </p>
    <p className="font-body text-sm text-cream-200/60 max-w-xs">
      {isDiscordActivity()
        ? "You'll join the same table as everyone else in this channel automatically."
        : 'Playing outside Discord connects you to a shared local table instead.'}
    </p>
    <button
      onClick={onBack}
      className="mt-2 rounded-full border-2 border-cream-100/20 text-cream-100 font-body text-sm px-5 py-2 active:scale-95 transition-transform hover:bg-cream-100/5"
    >
      Back to Menu
    </button>
  </div>
);

export default function App() {
  return (
    <MultiplayerProvider>
      <AppInner />
    </MultiplayerProvider>
  );
}
