export type FoodFamily = 'meat' | 'fruit' | 'veg' | 'grain';

export type FoodType =
  // meats/mains (original set)
  | 'pork'
  | 'fish'
  | 'chicken'
  | 'rice'
  | 'pitha'
  // fruits
  | 'mango'
  | 'banana'
  | 'jackfruit'
  | 'lychee'
  | 'pineapple'
  | 'watermelon'
  // vegetables
  | 'eggplant'
  | 'pumpkin'
  | 'chili'
  | 'okra'
  | 'corn';

export const ALL_FOOD_TYPES: FoodType[] = [
  'pork',
  'fish',
  'chicken',
  'rice',
  'pitha',
  'mango',
  'banana',
  'jackfruit',
  'lychee',
  'pineapple',
  'watermelon',
  'eggplant',
  'pumpkin',
  'chili',
  'okra',
  'corn',
];

export interface FoodMeta {
  type: FoodType;
  label: string;
  emoji: string;
  color: string;
  family: FoodFamily;
}

// Colors are grouped by family (meat = warm reds/oranges, fruit = bright
// pinks/yellows, veg = greens/purples, grain = pale neutrals) so a player can
// tell a tile's family apart at a glance even before reading the emoji.
export const FOOD_META: Record<FoodType, FoodMeta> = {
  pork: { type: 'pork', label: 'Pork', emoji: '🥩', color: '#C1502E', family: 'meat' },
  fish: { type: 'fish', label: 'Fish', emoji: '🐟', color: '#3B7EA6', family: 'meat' },
  chicken: { type: 'chicken', label: 'Chicken', emoji: '🍗', color: '#DB8A12', family: 'meat' },
  rice: { type: 'rice', label: 'Rice', emoji: '🍚', color: '#E9DFC6', family: 'grain' },
  pitha: { type: 'pitha', label: 'Pitha', emoji: '🥮', color: '#8A5A2B', family: 'grain' },
  mango: { type: 'mango', label: 'Mango', emoji: '🥭', color: '#F5A524', family: 'fruit' },
  banana: { type: 'banana', label: 'Banana', emoji: '🍌', color: '#F2CB05', family: 'fruit' },
  jackfruit: { type: 'jackfruit', label: 'Jackfruit', emoji: '🍈', color: '#9FBF3B', family: 'fruit' },
  lychee: { type: 'lychee', label: 'Lychee', emoji: '🍒', color: '#D6336C', family: 'fruit' },
  pineapple: { type: 'pineapple', label: 'Pineapple', emoji: '🍍', color: '#E0A400', family: 'fruit' },
  watermelon: { type: 'watermelon', label: 'Watermelon', emoji: '🍉', color: '#E23D5C', family: 'fruit' },
  eggplant: { type: 'eggplant', label: 'Eggplant', emoji: '🍆', color: '#6C3483', family: 'veg' },
  pumpkin: { type: 'pumpkin', label: 'Pumpkin', emoji: '🎃', color: '#D9720B', family: 'veg' },
  chili: { type: 'chili', label: 'Chili', emoji: '🌶️', color: '#C0392B', family: 'veg' },
  okra: { type: 'okra', label: 'Okra', emoji: '🫛', color: '#4C8C4A', family: 'veg' },
  corn: { type: 'corn', label: 'Corn', emoji: '🌽', color: '#F1C40F', family: 'veg' },
};

/**
 * Powerup tiles never enter the tray — clicking/dropping one fires its
 * effect immediately and removes just that tile. They're always generated
 * already-uncovered (see generateBoard) so a player can always reach one.
 */
export type PowerupKind = 'wild' | 'bomb' | 'freeze';

export interface PowerupMeta {
  kind: PowerupKind;
  label: string;
  emoji: string;
  color: string;
  description: string;
}

export const POWERUP_META: Record<PowerupKind, PowerupMeta> = {
  wild: {
    kind: 'wild',
    label: 'Wild',
    emoji: '🔀',
    color: '#B389E0',
    description: 'Clears a matching pair already sitting in your tray.',
  },
  bomb: {
    kind: 'bomb',
    label: 'Bomb',
    emoji: '💣',
    color: '#E74C3C',
    description: 'Blasts the top tile off the tallest stack on the board.',
  },
  freeze: {
    kind: 'freeze',
    label: 'Freeze',
    emoji: '❄️',
    color: '#5DC8E0',
    description: 'Adds 15 seconds to the clock.',
  },
};

export interface BoardTile {
  id: string;
  type: FoodType;
  row: number;
  col: number;
  layer: number;
  removed: boolean;
  /** Set only for bonus powerup tiles layered on top of a stack. */
  powerup?: PowerupKind;
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
  powerupCount: number;
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
  powerupsUsed: number;
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
