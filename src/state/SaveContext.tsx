import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SaveData, SettingsState } from '../types/game';
import { loadSave, writeSave } from './save';
import { TOTAL_LEVELS } from '../data/levels';
import { Achievement, findNewlyUnlocked } from '../data/achievements';

/** Token rewards for a 7-day daily-reward cycle; the cycle repeats after day 7. */
export const DAILY_REWARD_TABLE = [10, 15, 20, 30, 40, 55, 100];

export interface LevelResultInput {
  level: number;
  status: 'won' | 'lost';
  stars: number;
  moves: number;
  matches: number;
  score: number;
  bestCombo: number;
  elapsedSeconds: number;
  autoSolved: boolean;
  hintsUsed: number;
  magicSolvesUsed: number;
  porkMatches: number;
}

export interface MultiplayerResultInput {
  won: boolean;
}

export interface DailyClaimResult {
  reward: number;
  streak: number;
}

interface SaveContextValue {
  save: SaveData;
  unlockLevel: (level: number) => void;
  setLevelStars: (level: number, stars: number) => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
  markTutorialSeen: () => void;
  resetProgress: () => void;
  recordLevelResult: (input: LevelResultInput) => void;
  recordMultiplayerResult: (input: MultiplayerResultInput) => void;
  isDailyRewardAvailable: () => boolean;
  claimDailyReward: () => DailyClaimResult | null;
  pendingAchievements: Achievement[];
  dismissAchievement: (id: string) => void;
  recordHelpingHand: () => void;
}

const SaveContext = createContext<SaveContextValue | null>(null);

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isYesterday(dateKey: string): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const ym = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  return dateKey === ym;
}

/** Applies any newly-met achievements to a save, granting their token
 * rewards. Returns the updated save plus the list of achievements that were
 * just unlocked (for toast display). */
function applyAchievementUnlocks(save: SaveData): { save: SaveData; unlocked: Achievement[] } {
  const unlocked = findNewlyUnlocked(save);
  if (unlocked.length === 0) return { save, unlocked };
  const achievements = { ...save.achievements };
  let tokens = save.tokens;
  for (const a of unlocked) {
    achievements[a.id] = Date.now();
    tokens += a.tokenReward;
  }
  return { save: { ...save, achievements, tokens }, unlocked };
}

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    writeSave(save);
  }, [save]);

  useEffect(() => {
    const root = document.documentElement;
    if (save.settings.darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [save.settings.darkMode]);

  const unlockLevel = useCallback((level: number) => {
    setSave((prev) => ({
      ...prev,
      unlockedLevel: Math.max(prev.unlockedLevel, Math.min(level, TOTAL_LEVELS)),
    }));
  }, []);

  const setLevelStars = useCallback((level: number, stars: number) => {
    setSave((prev) => ({
      ...prev,
      levelStars: {
        ...prev.levelStars,
        [level]: Math.max(prev.levelStars[level] ?? 0, stars),
      },
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<SettingsState>) => {
    setSave((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const markTutorialSeen = useCallback(() => {
    setSave((prev) => ({ ...prev, hasSeenTutorial: true }));
  }, []);

  const resetProgress = useCallback(() => {
    setSave((prev) => ({
      ...prev,
      unlockedLevel: 1,
      levelStars: {},
    }));
  }, []);

  const recordLevelResult = useCallback((input: LevelResultInput) => {
    setSave((prev) => {
      const stats = { ...prev.stats };
      stats.levelsPlayed += 1;
      stats.totalMoves += input.moves;
      stats.totalMatches += input.matches;
      stats.totalScore += input.score;
      stats.bestScore = Math.max(stats.bestScore, input.score);
      stats.bestCombo = Math.max(stats.bestCombo, input.bestCombo);
      stats.hintsUsed += input.hintsUsed;
      stats.magicSolvesUsed += input.magicSolvesUsed;
      stats.totalPlayTimeSeconds += Math.max(0, input.elapsedSeconds);
      stats.porkTilesMatched += input.porkMatches;

      if (input.status === 'won') {
        stats.levelsWon += 1;
        stats.totalStars += input.stars;
        if (input.stars >= 3) stats.threeStarLevels += 1;
        stats.currentWinStreak += 1;
        stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
        if (
          !input.autoSolved &&
          (stats.fastestWinSeconds === null || input.elapsedSeconds < stats.fastestWinSeconds) &&
          input.elapsedSeconds > 0
        ) {
          stats.fastestWinSeconds = input.elapsedSeconds;
        }
      } else {
        stats.levelsLost += 1;
        stats.currentWinStreak = 0;
      }

      let next: SaveData = { ...prev, stats };

      // Directly-granted achievement: winning without using any helpers.
      if (
        input.status === 'won' &&
        input.hintsUsed === 0 &&
        input.magicSolvesUsed === 0 &&
        !input.autoSolved &&
        next.achievements['no_help_win'] === undefined
      ) {
        next = {
          ...next,
          achievements: { ...next.achievements, no_help_win: Date.now() },
          tokens: next.tokens + 20,
        };
      }

      const { save: withUnlocks, unlocked } = applyAchievementUnlocks(next);
      if (unlocked.length > 0) {
        setPendingAchievements((p) => [...p, ...unlocked]);
      }
      return withUnlocks;
    });
  }, []);

  const recordMultiplayerResult = useCallback((input: MultiplayerResultInput) => {
    setSave((prev) => {
      const stats = { ...prev.stats };
      stats.multiplayerGamesPlayed += 1;
      if (input.won) stats.multiplayerWins += 1;
      const next: SaveData = { ...prev, stats };
      const { save: withUnlocks, unlocked } = applyAchievementUnlocks(next);
      if (unlocked.length > 0) {
        setPendingAchievements((p) => [...p, ...unlocked]);
      }
      return withUnlocks;
    });
  }, []);

  const isDailyRewardAvailable = useCallback(() => {
    return save.daily.lastClaimDate !== todayKey();
  }, [save.daily.lastClaimDate]);

  const claimDailyReward = useCallback((): DailyClaimResult | null => {
    const today = todayKey();
    if (save.daily.lastClaimDate === today) return null;

    const continuing = save.daily.lastClaimDate !== null && isYesterday(save.daily.lastClaimDate);
    const streak = continuing ? save.daily.streak + 1 : 1;
    const reward = DAILY_REWARD_TABLE[(streak - 1) % DAILY_REWARD_TABLE.length];

    setSave((prev) => {
      const next: SaveData = {
        ...prev,
        tokens: prev.tokens + reward,
        daily: {
          lastClaimDate: today,
          streak,
          totalClaims: prev.daily.totalClaims + 1,
        },
      };
      const { save: withUnlocks, unlocked } = applyAchievementUnlocks(next);
      if (unlocked.length > 0) {
        setPendingAchievements((p) => [...p, ...unlocked]);
      }
      return withUnlocks;
    });

    return { reward, streak };
  }, [save.daily]);

  const recordHelpingHand = useCallback(() => {
    setSave((prev) => {
      const stats = { ...prev.stats, joinedInProgressGames: prev.stats.joinedInProgressGames + 1 };
      const next: SaveData = { ...prev, stats };
      const { save: withUnlocks, unlocked } = applyAchievementUnlocks(next);
      if (unlocked.length > 0) {
        setPendingAchievements((p) => [...p, ...unlocked]);
      }
      return withUnlocks;
    });
  }, []);

  const dismissAchievement = useCallback((id: string) => {
    setPendingAchievements((p) => p.filter((a) => a.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      save,
      unlockLevel,
      setLevelStars,
      updateSettings,
      markTutorialSeen,
      resetProgress,
      recordLevelResult,
      recordMultiplayerResult,
      isDailyRewardAvailable,
      claimDailyReward,
      pendingAchievements,
      dismissAchievement,
      recordHelpingHand,
    }),
    [
      save,
      unlockLevel,
      setLevelStars,
      updateSettings,
      markTutorialSeen,
      resetProgress,
      recordLevelResult,
      recordMultiplayerResult,
      isDailyRewardAvailable,
      claimDailyReward,
      pendingAchievements,
      dismissAchievement,
      recordHelpingHand,
    ]
  );

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave(): SaveContextValue {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error('useSave must be used within SaveProvider');
  return ctx;
}
