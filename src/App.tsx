import React, { useEffect, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { PlayScreen } from './components/PlayScreen';
import { Settings } from './components/Settings';
import { Tutorial } from './components/Tutorial';
import { MultiplayerMenu } from './components/MultiplayerMenu';
import { MultiplayerLobby } from './components/MultiplayerLobby';
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
import { MultiplayerProvider, useMultiplayer } from './state/MultiplayerContext';

type Screen =
  | 'menu'
  | 'play'
  | 'settings'
  | 'tutorial'
  | 'multiplayerMenu'
  | 'multiplayerRoom'
  | 'account'
  | 'leaderboard'
  | 'achievements'
  | 'statistics'
  | 'legal';

function AppInner() {
  const { save, markTutorialSeen, isDailyRewardAvailable } = useSave();
  const [screen, setScreen] = useState<Screen>(save.hasSeenTutorial ? 'menu' : 'tutorial');
  const [level, setLevel] = useState(1);
  const [showDaily, setShowDaily] = useState(false);
  const { room } = useMultiplayer();

  // If the room disappears while we're in the multiplayer flow (kicked, host
  // closed it, disconnected, etc.), fall back to the multiplayer menu.
  useEffect(() => {
    if (screen === 'multiplayerRoom' && !room) {
      setScreen('multiplayerMenu');
    }
  }, [screen, room]);

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

  const goPlay = (lvl: number) => {
    setLevel(lvl);
    setScreen('play');
  };

  return (
    <div className="font-body">
      {screen === 'menu' && (
        <MainMenu
          onPlay={goPlay}
          onSettings={() => setScreen('settings')}
          onTutorial={() => setScreen('tutorial')}
          onMultiplayer={() => setScreen('multiplayerMenu')}
          onAccount={() => setScreen('account')}
          onLeaderboard={() => setScreen('leaderboard')}
          onAchievements={() => setScreen('achievements')}
          onStatistics={() => setScreen('statistics')}
          onDaily={() => setShowDaily(true)}
          onLegal={() => setScreen('legal')}
        />
      )}

      {screen === 'play' && (
        <PlayScreen level={level} onExit={() => setScreen('menu')} onChangeLevel={goPlay} />
      )}

      {screen === 'settings' && <Settings onBack={() => setScreen('menu')} />}

      {screen === 'tutorial' && (
        <Tutorial
          onBack={() => {
            markTutorialSeen();
            setScreen('menu');
          }}
        />
      )}

      {screen === 'multiplayerMenu' && (
        <MultiplayerMenu
          onBack={() => setScreen('menu')}
          onEnterLobby={() => setScreen('multiplayerRoom')}
          onAccount={() => setScreen('account')}
        />
      )}

      {screen === 'multiplayerRoom' && room?.status === 'lobby' && (
        <MultiplayerLobby onLeave={() => setScreen('menu')} />
      )}

      {screen === 'multiplayerRoom' && room && room.status !== 'lobby' && (
        <MultiplayerPlayScreen onExit={() => setScreen('menu')} />
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

export default function App() {
  return (
    <MultiplayerProvider>
      <AppInner />
    </MultiplayerProvider>
  );
}

