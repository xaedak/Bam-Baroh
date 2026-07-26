import { ALL_FOOD_TYPES, BoardTile, FoodType, LevelConfig } from '../types/game';
import { mulberry32, seedFromLevel, shuffleWithRng } from './rng';

// The level generator has no precomputed data or hard ceiling on how many
// levels exist - every level's board is derived on demand from its level
// number via a seeded RNG (see generateBoard below), so generation is
// effectively infinite. TOTAL_LEVELS is only a very large soft cap used to
// keep level numbers finite for save data / UI purposes; it is never reached
// in practice.
export const TOTAL_LEVELS = 999_999;
export const TRAY_SIZE = 7;

/**
 * Difficulty scales smoothly and *indefinitely* with level number using an
 * asymptotic "progress" curve (progress = level / (level + RAMP)) instead of
 * a hard 0->1 ramp over a fixed level count. This means:
 * - progress keeps climbing well past level 1000, so the game keeps getting
 *   meaningfully harder for 1000+ levels instead of maxing out at level 100.
 * - board size / layers / food-type variety still asymptote toward the same
 *   sane maximums (so boards never become unplayably huge).
 * - time limits and tile density keep tightening slowly for very high
 *   levels via an unbounded "overtime" term derived from log(level), giving
 *   endless levels a genuine long-tail difficulty curve.
 */
const DIFFICULTY_RAMP = 420; // higher = slower climb toward max difficulty

function difficultyProgress(level: number): number {
  // Approaches 1 as level -> infinity, but never reaches it.
  return level / (level + DIFFICULTY_RAMP);
}

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(level)));
  const progress = difficultyProgress(clamped); // 0 -> 1 (asymptotic)
  // Extra, unbounded difficulty term that keeps growing slowly forever past
  // level 1000, so endless play never truly plateaus.
  const overtime = Math.log10(1 + clamped / 1000);

  const rows = Math.min(9, 5 + Math.floor(progress * 4.2));
  const cols = Math.min(11, 6 + Math.floor(progress * 5.2));
  const layers = Math.min(5, 1 + Math.floor(progress * 4.8));

  const typeCount = Math.min(5, 3 + Math.floor(progress * 2.4));
  const tileTypes = ALL_FOOD_TYPES.slice(0, typeCount);

  // Pyramid capacity: layer L (0-indexed) is inset by L cells on each side.
  let capacity = 0;
  for (let l = 0; l < layers; l++) {
    const r = rows - 2 * l;
    const c = cols - 2 * l;
    if (r < 2 || c < 2) break;
    capacity += r * c;
  }

  // Base density ramps with progress, then a small unbounded bonus (via
  // overtime) nudges density even higher on very late levels, still capped
  // by board capacity so boards stay solvable-sized.
  let desired = Math.round(18 + progress * 96 + overtime * 12);
  desired = Math.floor(desired / 3) * 3;
  const fillRatio = Math.min(0.82, 0.62 + overtime * 0.06);
  const maxByCapacity = Math.floor((capacity * fillRatio) / 3) * 3;
  let totalTiles = Math.min(desired, maxByCapacity);
  totalTiles = Math.max(totalTiles, 18);

  // Time limits keep tightening slowly forever past the point where the
  // progress curve alone would have flattened out, down to a hard floor.
  const timeLimitSeconds =
    progress > 0.35
      ? Math.max(30, Math.round(240 - progress * 90 - overtime * 22))
      : null;

  return {
    level: clamped,
    rows,
    cols,
    layers,
    tileTypes,
    totalTiles,
    traySize: TRAY_SIZE,
    timeLimitSeconds,
  };
}

function computeLayerCells(rows: number, cols: number, layers: number) {
  const byLayer: { row: number; col: number; layer: number }[][] = [];
  for (let l = 0; l < layers; l++) {
    const r0 = l;
    const r1 = rows - 1 - l;
    const c0 = l;
    const c1 = cols - 1 - l;
    if (r1 - r0 < 1 || c1 - c0 < 1) break;
    const cells: { row: number; col: number; layer: number }[] = [];
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        cells.push({ row: r, col: c, layer: l });
      }
    }
    byLayer.push(cells);
  }
  return byLayer;
}

export function generateBoard(config: LevelConfig): BoardTile[] {
  const rng = mulberry32(seedFromLevel(config.level));
  const byLayer = computeLayerCells(config.rows, config.cols, config.layers);

  // Fill lower layers first so every tile above has physical support below it.
  const orderedCells: { row: number; col: number; layer: number }[] = [];
  for (const layerCells of byLayer) {
    orderedCells.push(...shuffleWithRng(layerCells, rng));
  }

  const chosenCells = orderedCells.slice(0, config.totalTiles);

  // Build a type multiset where every type count is a multiple of 3.
  const groupCount = config.totalTiles / 3;
  const types = config.tileTypes;
  const counts: Record<FoodType, number> = Object.fromEntries(
    types.map((t) => [t, 0])
  ) as Record<FoodType, number>;

  for (let i = 0; i < groupCount; i++) {
    const t = types[i % types.length];
    counts[t] += 1;
  }
  // Randomize which type gets any remainder bias by shuffling type order first
  const shuffledTypes = shuffleWithRng(types, rng);
  const bag: FoodType[] = [];
  for (const t of shuffledTypes) {
    for (let i = 0; i < counts[t] * 3; i++) bag.push(t);
  }
  // In case rounding left a mismatch, trim/pad defensively (should not happen).
  while (bag.length < chosenCells.length) bag.push(shuffledTypes[0]);
  const finalBag = shuffleWithRng(bag.slice(0, chosenCells.length), rng);

  const tiles: BoardTile[] = chosenCells.map((cell, i) => ({
    id: `L${config.level}-${cell.layer}-${cell.row}-${cell.col}-${i}`,
    type: finalBag[i],
    row: cell.row,
    col: cell.col,
    layer: cell.layer,
    removed: false,
  }));

  return tiles;
}

export function isTileCovered(tile: BoardTile, board: BoardTile[]): boolean {
  return board.some(
    (t) =>
      !t.removed &&
      t.id !== tile.id &&
      t.row === tile.row &&
      t.col === tile.col &&
      t.layer > tile.layer
  );
}

/**
 * Computes a full clear order for the remaining tiles on a board, used by
 * both Hint (peek at the next tile in the order) and Magic Solve (play the
 * whole order out). Because every food type's total count is generated as a
 * multiple of 3, and every removal only ever exposes more tiles, this order
 * always fully empties the board:
 * - whenever some uncovered type currently has 3+ copies free, those are
 *   queued first (a "real" match a player could make right now).
 * - otherwise the single uncovered tile that unblocks the most covered
 *   tiles underneath it is queued, to make progress toward the next match.
 */
export function computeSolveOrder(board: BoardTile[]): string[] {
  const remaining = board.filter((t) => !t.removed).map((t) => ({ ...t }));
  const order: string[] = [];

  const uncoveredOf = (tiles: typeof remaining) => {
    return tiles.filter(
      (t) =>
        !tiles.some(
          (o) => o.id !== t.id && o.row === t.row && o.col === t.col && o.layer > t.layer
        )
    );
  };

  let pool = remaining;
  while (pool.length > 0) {
    const uncovered = uncoveredOf(pool);
    const byType = new Map<FoodType, BoardTile[]>();
    for (const t of uncovered) {
      const list = byType.get(t.type) ?? [];
      list.push(t);
      byType.set(t.type, list);
    }

    let tripleType: FoodType | null = null;
    for (const [type, list] of byType) {
      if (list.length >= 3) {
        tripleType = type;
        break;
      }
    }

    if (tripleType) {
      const chosen = byType.get(tripleType)!.slice(0, 3);
      for (const t of chosen) order.push(t.id);
      const chosenIds = new Set(chosen.map((t) => t.id));
      pool = pool.filter((t) => !chosenIds.has(t.id));
      continue;
    }

    // No immediate triple available - free up the tile that unblocks the
    // most tiles beneath it, to make progress toward one.
    let best = uncovered[0];
    let bestScore = -1;
    for (const t of uncovered) {
      const blocksBelow = pool.filter(
        (o) => o.id !== t.id && o.row === t.row && o.col === t.col && o.layer < t.layer
      ).length;
      if (blocksBelow > bestScore) {
        bestScore = blocksBelow;
        best = t;
      }
    }
    order.push(best.id);
    pool = pool.filter((t) => t.id !== best.id);
  }

  return order;
}
