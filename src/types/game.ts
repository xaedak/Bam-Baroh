export type FoodType = 'pork' | 'fish' | 'chicken' | 'rice' | 'pitha';

export const ALL_FOOD_TYPES: FoodType[] = ['pork', 'fish', 'chicken', 'rice', 'pitha'];

export interface FoodMeta {
  type: FoodType;
  label: string;
  emoji: string;
  color: string;
}

export const FOOD_META: Record<FoodType, FoodMeta> = {
  pork: { type: 'pork', label: 'Pork', emoji: '🥩', color: '#C1502E' },
  fish: { type: 'fish', label: 'Fish', emoji: '🐟', color: '#3B7EA6' },
  chicken: { type: 'chicken', label: 'Chicken', emoji: '🍗', color: '#DB8A12' },
  rice: { type: 'rice', label: 'Rice', emoji: '🍚', color: '#E9DFC6' },
  pitha: { type: 'pitha', label: 'Pitha', emoji: '🥮', color: '#4C8C4A' },
};

export interface BoardTile {
  id: string;
  type: FoodType;
  row: number;
  col: number;
  layer: number;
  removed: boolean;
}

export interface LevelConfig {
  level: number;
  rows: number;
  cols: number;
  layers: number;
  tileTypes: FoodType[];
  totalTiles: number;
  traySize: number;
  timeLimitSeconds: number | null;
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface LevelStars {
  [level: number]: number;
}

export interface SettingsState {
  darkMode: boolean;
  musicOn: boolean;
  sfxOn: boolean;
  /** 0-1 mixer levels for the file-based AudioManager. */
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface StatsData {
  levelsPlayed: number;
  levelsWon: number;
  levelsLost: number;
  totalMoves: number;
  totalMatches: number;
  totalScore: number;
  bestScore: number;
  bestCombo: number;
  totalStars: number;
  threeStarLevels: number;
  hintsUsed: number;
  magicSolvesUsed: number;
  totalPlayTimeSeconds: number;
  currentWinStreak: number;
  bestWinStreak: number;
  fastestWinSeconds: number | null;
  multiplayerWins: number;
  multiplayerGamesPlayed: number;
  porkTilesMatched: number;
  joinedInProgressGames: number;
}

export interface DailyRewardState {
  lastClaimDate: string | null; // YYYY-MM-DD, local date of last claim
  streak: number;
  totalClaims: number;
}

export interface SaveData {
  unlockedLevel: number;
  levelStars: LevelStars;
  settings: SettingsState;
  hasSeenTutorial: boolean;
  tokens: number;
  stats: StatsData;
  daily: DailyRewardState;
  achievements: Record<string, number>;
  seenAchievementIds: string[];
}
