import { DailyRewardState, SaveData, StatsData } from '../types/game';

const SAVE_KEY = 'bam-baroh-save-v1';

const DEFAULT_STATS: StatsData = {
  levelsPlayed: 0,
  levelsWon: 0,
  levelsLost: 0,
  totalMoves: 0,
  totalMatches: 0,
  totalScore: 0,
  bestScore: 0,
  bestCombo: 0,
  totalStars: 0,
  threeStarLevels: 0,
  hintsUsed: 0,
  magicSolvesUsed: 0,
  totalPlayTimeSeconds: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  fastestWinSeconds: null,
  multiplayerWins: 0,
  multiplayerGamesPlayed: 0,
  porkTilesMatched: 0,
  joinedInProgressGames: 0,
  powerupsUsed: 0,
};

const DEFAULT_DAILY: DailyRewardState = {
  lastClaimDate: null,
  streak: 0,
  totalClaims: 0,
};

const DEFAULT_SAVE: SaveData = {
  unlockedLevel: 1,
  levelStars: {},
  settings: {
    darkMode: true,
    musicOn: true,
    sfxOn: true,
    masterVolume: 1,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    muted: false,
  },
  hasSeenTutorial: false,
  tokens: 0,
  stats: DEFAULT_STATS,
  daily: DEFAULT_DAILY,
  achievements: {},
  seenAchievementIds: [],
};

function cloneDefault(): SaveData {
  return {
    ...DEFAULT_SAVE,
    levelStars: {},
    settings: { ...DEFAULT_SAVE.settings },
    stats: { ...DEFAULT_STATS },
    daily: { ...DEFAULT_DAILY },
    achievements: {},
    seenAchievementIds: [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw);
    return {
      ...cloneDefault(),
      ...parsed,
      settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings ?? {}) },
      stats: { ...DEFAULT_STATS, ...(parsed.stats ?? {}) },
      daily: { ...DEFAULT_DAILY, ...(parsed.daily ?? {}) },
      achievements: { ...(parsed.achievements ?? {}) },
      seenAchievementIds: Array.isArray(parsed.seenAchievementIds) ? parsed.seenAchievementIds : [],
    };
  } catch {
    return cloneDefault();
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (e.g. private mode) - fail silently
  }
}
