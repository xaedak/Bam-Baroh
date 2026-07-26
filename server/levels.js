// Ported from ../src/data/levels.ts (getLevelConfig, generateBoard,
// isTileCovered only - multiplayer rooms don't need hint/magic-solve).
// Kept byte-for-byte equivalent in logic so a given level number produces
// the exact same board as single-player would.
import { mulberry32, seedFromLevel, shuffleWithRng } from './rng.js';

export const ALL_FOOD_TYPES = ['pork', 'fish', 'chicken', 'rice', 'pitha'];
export const TOTAL_LEVELS = 999_999;
export const TRAY_SIZE = 7;
const DIFFICULTY_RAMP = 420;

function difficultyProgress(level) {
  return level / (level + DIFFICULTY_RAMP);
}

export function getLevelConfig(level) {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  const progress = difficultyProgress(clamped);
  const overtime = Math.log10(1 + clamped / 1000);

  const rows = Math.min(9, 5 + Math.floor(progress * 4.2));
  const cols = Math.min(11, 6 + Math.floor(progress * 5.2));
  const layers = Math.min(5, 1 + Math.floor(progress * 4.8));

  const typeCount = Math.min(5, 3 + Math.floor(progress * 2.4));
  const tileTypes = ALL_FOOD_TYPES.slice(0, typeCount);

  let capacity = 0;
  for (let l = 0; l < layers; l++) {
    const r = rows - 2 * l;
    const c = cols - 2 * l;
    if (r < 2 || c < 2) break;
    capacity += r * c;
  }

  let desired = Math.round(18 + progress * 96 + overtime * 12);
  desired = Math.floor(desired / 3) * 3;
  const fillRatio = Math.min(0.82, 0.62 + overtime * 0.06);
  const maxByCapacity = Math.floor((capacity * fillRatio) / 3) * 3;
  let totalTiles = Math.min(desired, maxByCapacity);
  totalTiles = Math.max(totalTiles, 18);

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
  };
}

function computeLayerCells(rows, cols, layers) {
  const byLayer = [];
  for (let l = 0; l < layers; l++) {
    const r0 = l;
    const r1 = rows - 1 - l;
    const c0 = l;
    const c1 = cols - 1 - l;
    if (r1 - r0 < 1 || c1 - c0 < 1) break;
    const cells = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        cells.push({ row: r, col: c, layer: l });
      }
    }
    byLayer.push(cells);
  }
  return byLayer;
}

export function generateBoard(config) {
  const rng = mulberry32(seedFromLevel(config.level));
  const byLayer = computeLayerCells(config.rows, config.cols, config.layers);

  const orderedCells = [];
  for (const layerCells of byLayer) {
    orderedCells.push(...shuffleWithRng(layerCells, rng));
  }

  const chosenCells = orderedCells.slice(0, config.totalTiles);

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

  return tiles;
}

export function isTileCovered(tile, board) {
  return board.some(
    (t) => !t.removed && t.id !== tile.id && t.row === tile.row && t.col === tile.col && t.layer > tile.layer
  );
}
