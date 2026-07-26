// Ported from ../src/data/levels.ts (getLevelConfig, generateBoard,
// isTileCovered only - multiplayer rooms don't need hint/magic-solve).
// Kept in sync with the client generator so a given level number produces
// the exact same board (including powerup placement) as single-player would.
import { mulberry32, seedFromLevel, shuffleWithRng } from './rng.js';

export const ALL_FOOD_TYPES = [
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
export const POWERUP_KINDS = ['wild', 'bomb', 'freeze'];
export const TOTAL_LEVELS = 999_999;
// Kept in lockstep with TRAY_SIZE in src/data/levels.ts.
export const TRAY_SIZE = 6;
const DIFFICULTY_RAMP = 260;

function difficultyProgress(level) {
  return level / (level + DIFFICULTY_RAMP);
}

export function getLevelConfig(level) {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  const progress = difficultyProgress(clamped);
  const overtime = Math.log10(1 + clamped / 1000);

  const rows = Math.min(9, 6 + Math.floor(progress * 3.2));
  const cols = Math.min(11, 7 + Math.floor(progress * 4.2));
  // "layers" is the max height a single stack of tiles can be piled to on
  // one board cell - every tile may have others buried underneath it that
  // are untouchable until it's cleared. Starts at 3 so there's real digging
  // from level 1.
  const layers = Math.min(9, 3 + Math.floor(progress * 7));

  const typeCount = Math.min(ALL_FOOD_TYPES.length, 6 + Math.floor(progress * (ALL_FOOD_TYPES.length - 6)));
  const tileTypes = ALL_FOOD_TYPES.slice(0, typeCount);

  // Physical number of tile slots: every cell can hold up to `layers` tiles.
  const capacity = rows * cols * layers;

  let desired = Math.round(18 + progress * 96 + overtime * 12);
  desired = Math.floor(desired / 3) * 3;
  const fillRatio = Math.min(0.82, 0.62 + overtime * 0.06);
  const maxByCapacity = Math.floor((capacity * fillRatio) / 3) * 3;
  let totalTiles = Math.min(desired, maxByCapacity);
  totalTiles = Math.max(totalTiles, 18);

  const powerupCount = Math.min(6, 1 + Math.floor(progress * 5));

  return {
    level: clamped,
    rows,
    cols,
    layers,
    tileTypes,
    totalTiles,
    traySize: TRAY_SIZE,
    // Multiplayer co-op rooms run without a countdown timer for now -
    // players clear the shared board together at their own pace.
    timeLimitSeconds: null,
    powerupCount,
  };
}

/**
 * Chooses which (row, col) cells get a tile stack and how tall each stack
 * is, then expands every stack into individual {row, col, layer} slots.
 * Stacks sit on an ordinary rows x cols grid (no shrinking pyramid), so a
 * tall pile can appear anywhere - that's what makes digging down through a
 * specific stack a real puzzle. Heights are biased toward `maxHeight` more
 * as `progress` increases.
 */
function pickStackCells(rows, cols, maxHeight, totalTiles, progress, rng) {
  const allCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) allCells.push({ row: r, col: c });
  }
  const shuffled = shuffleWithRng(allCells, rng);

  const biasExp = Math.max(0.35, 1 - progress * 0.65);

  const heights = new Map();
  const usedOrder = [];
  const key = (r, c) => `${r},${c}`;

  let remaining = totalTiles;
  let cellIndex = 0;

  while (remaining > 0 && cellIndex < shuffled.length) {
    const cell = shuffled[cellIndex++];
    const h = Math.min(maxHeight, remaining, 1 + Math.floor(Math.pow(rng(), biasExp) * maxHeight));
    if (h <= 0) continue;
    heights.set(key(cell.row, cell.col), h);
    usedOrder.push(cell);
    remaining -= h;
  }

  let guard = 0;
  while (remaining > 0 && usedOrder.length > 0 && guard < 20000) {
    const cell = usedOrder[guard % usedOrder.length];
    const k = key(cell.row, cell.col);
    const h = heights.get(k) ?? 0;
    if (h < maxHeight) {
      heights.set(k, h + 1);
      remaining -= 1;
    }
    guard++;
  }

  const cells = [];
  for (const [k, h] of heights) {
    const [r, c] = k.split(',').map(Number);
    for (let l = 0; l < h; l++) cells.push({ row: r, col: c, layer: l });
  }
  return cells;
}

export function generateBoard(config) {
  const rng = mulberry32(seedFromLevel(config.level));
  const progress = difficultyProgress(config.level);
  const chosenCells = pickStackCells(config.rows, config.cols, config.layers, config.totalTiles, progress, rng);

  const groupCount = config.totalTiles / 3;
  const types = config.tileTypes;
  const counts = Object.fromEntries(types.map((t) => [t, 0]));

  for (let i = 0; i < groupCount; i++) {
    const t = types[i % types.length];
    counts[t] += 1;
  }
  const shuffledTypes = shuffleWithRng(types, rng);
  const bag = [];
  for (const t of shuffledTypes) {
    for (let i = 0; i < counts[t] * 3; i++) bag.push(t);
  }
  while (bag.length < chosenCells.length) bag.push(shuffledTypes[0]);
  const finalBag = shuffleWithRng(bag.slice(0, chosenCells.length), rng);

  const tiles = chosenCells.map((cell, i) => ({
    id: `L${config.level}-${cell.layer}-${cell.row}-${cell.col}-${i}`,
    type: finalBag[i],
    row: cell.row,
    col: cell.col,
    layer: cell.layer,
    removed: false,
  }));

  // Layer a handful of powerup tiles directly on top of existing stacks -
  // always already uncovered, mirroring src/data/levels.ts exactly so the
  // client and server boards match tile-for-tile.
  const stackTops = new Map();
  for (const cell of chosenCells) {
    const k = `${cell.row},${cell.col}`;
    const existing = stackTops.get(k);
    if (!existing || cell.layer > existing.layer) stackTops.set(k, cell);
  }
  const candidateCells = shuffleWithRng(Array.from(stackTops.values()), rng);
  const powerupTiles = [];
  for (let i = 0; i < Math.min(config.powerupCount, candidateCells.length); i++) {
    const cell = candidateCells[i];
    const kind = POWERUP_KINDS[Math.floor(rng() * POWERUP_KINDS.length)];
    powerupTiles.push({
      id: `L${config.level}-pw-${cell.row}-${cell.col}-${i}`,
      type: types[Math.floor(rng() * types.length)],
      row: cell.row,
      col: cell.col,
      layer: cell.layer + 1,
      removed: false,
      powerup: kind,
    });
  }

  return [...tiles, ...powerupTiles];
}

export function isTileCovered(tile, board) {
  return board.some(
    (t) => !t.removed && t.id !== tile.id && t.row === tile.row && t.col === tile.col && t.layer > tile.layer
  );
}
