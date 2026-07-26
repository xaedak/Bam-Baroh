import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SaveData, SettingsState } from '../types/game';
import { loadSave, writeSave } from './save';
import { TOTAL_LEVELS } from '../data/levels';
import { Achievement, findNewlyUnlocked } from '../data/achievements';
import { useAuth } from './AuthContext';
import { fetchSave, pushSave } from '../multiplayer/api';

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
  powerupsUsed: number;
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

/** Applies a raw incoming blob (from the server) on top of local defaults, the
 * same way loadSave() does for localStorage, so a partial/older shape can't
 * crash the app if the SaveData interface has grown new fields since. */
function mergeIncomingSave(incoming: unknown): SaveData | null {
  if (!incoming || typeof incoming !== 'object') return null;
  const base = loadSave();
  const parsed = incoming as Partial<SaveData>;
  return {
    ...base,
    ...parsed,
    settings: { ...base.settings, ...(parsed.settings ?? {}) },
    stats: { ...base.stats, ...(parsed.stats ?? {}) },
    daily: { ...base.daily, ...(parsed.daily ?? {}) },
    achievements: { ...(parsed.achievements ?? {}) },
    seenAchievementIds: Array.isArray(parsed.seenAchievementIds) ? parsed.seenAchievementIds : [],
  };
}

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const { token, viaDiscord, discordChecked, discordSave } = useAuth();
  const hydratedRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    writeSave(save);
  }, [save]);

  // Cross-server progression: once Discord auth resolves, load whatever
  // this account already has saved server-side (a returning player picking
  // up on a new server) and use it as the source of truth. If the account
  // has no save yet (first time linking), push the current local save up
  // instead, so it isn't lost.
  useEffect(() => {
    if (!discordChecked || !viaDiscord || !token || hydratedRef.current) return;
    hydratedRef.current = true;

    if (discordSave) {
      const merged = mergeIncomingSave(discordSave);
      if (merged) {
        setSave(merged);
        return;
      }
    }
    // No prior server save for this account (or fetch/shape failed) —
    // fall back to whatever fetchSave reports, and if that's also empty,
    // bootstrap the account with the current local progress.
    fetchSave(token).then((res) => {
      const merged = res.ok ? mergeIncomingSave(res.data?.save) : null;
      if (merged) {
        setSave(merged);
      } else {
        setSave((prev) => {
          pushSave(token, prev);
          return prev;
        });
      }
    });
  }, [discordChecked, viaDiscord, token, discordSave]);

  // Debounced push of any local progression change up to the account,
  // while signed in via Discord. Skipped for the hydration write itself
  // (nothing has "changed" from the player's perspective there).
  useEffect(() => {
    if (!viaDiscord || !token || !hydratedRef.current) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      pushSave(token, save);
    }, 1500);
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [save, viaDiscord, token]);

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
      stats.powerupsUsed += input.powerupsUsed;

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
