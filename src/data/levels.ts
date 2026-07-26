import { ALL_FOOD_TYPES, BoardTile, FoodType, LevelConfig, PowerupKind } from '../types/game';
import { mulberry32, seedFromLevel, shuffleWithRng } from './rng';

// The level generator has no precomputed data or hard ceiling on how many
// levels exist - every level's board is derived on demand from its level
// number via a seeded RNG (see generateBoard below), so generation is
// effectively infinite. TOTAL_LEVELS is only a very large soft cap used to
// keep level numbers finite for save data / UI purposes; it is never reached
// in practice.
export const TOTAL_LEVELS = 999_999;
// A 4-slot tray (down from 7) means a single wrong dig can overflow you much
// faster - this is the main lever that makes the game "hard from level one"
// as requested, independent of board size/stacking.
export const TRAY_SIZE = 4;

/**
 * Difficulty scales smoothly and *indefinitely* with level number using an
 * asymptotic "progress" curve (progress = level / (level + RAMP)) instead of
 * a hard 0->1 ramp over a fixed level count. This means:
 * - progress keeps climbing well past level 1000, so the game keeps getting
 *   meaningfully harder for 1000+ levels instead of maxing out at level 100.
 * - board size / stack height / food-type variety still asymptote toward the
 *   same sane maximums (so boards never become unplayably huge).
 * - time limits and tile density keep tightening slowly for very high
 *   levels via an unbounded "overtime" term derived from log(level), giving
 *   endless levels a genuine long-tail difficulty curve.
 */
const DIFFICULTY_RAMP = 260; // higher = slower climb toward max difficulty

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

  const rows = Math.min(9, 6 + Math.floor(progress * 3.2));
  const cols = Math.min(11, 7 + Math.floor(progress * 4.2));
  // "layers" is the max height a single stack of tiles can be piled to on
  // one board cell - the core puzzle mechanic, borrowed straight from
  // classic mahjong solitaire: every tile you see may have others buried
  // underneath it that are untouchable until it's cleared. Starts at 3 (real
  // stacking from level 1, not just a cosmetic peek) and climbs to
  // genuinely deep digging puzzles at higher levels.
  const layers = Math.min(9, 3 + Math.floor(progress * 7));

  // More tile families in play at once from the very start (a 4-slot tray
  // with only 3 families would be trivial) climbing toward the full roster
  // of meats/fruit/veg/grain as levels progress.
  const typeCount = Math.min(ALL_FOOD_TYPES.length, 6 + Math.floor(progress * (ALL_FOOD_TYPES.length - 6)));
  const tileTypes = ALL_FOOD_TYPES.slice(0, typeCount);

  // Capacity is just the physical number of tile slots on the board now
  // that stacks aren't inset into a shrinking pyramid - every cell can hold
  // up to `layers` tiles.
  const capacity = rows * cols * layers;

  // Base density ramps with progress, then a small unbounded bonus (via
  // overtime) nudges density even higher on very late levels, still capped
  // by board capacity so boards stay solvable-sized.
  let desired = Math.round(18 + progress * 96 + overtime * 12);
  desired = Math.floor(desired / 3) * 3;
  const fillRatio = Math.min(0.82, 0.62 + overtime * 0.06);
  const maxByCapacity = Math.floor((capacity * fillRatio) / 3) * 3;
  let totalTiles = Math.min(desired, maxByCapacity);
  totalTiles = Math.max(totalTiles, 18);

  // The clock now runs from level 1 (previously it only kicked in once
  // progress > 0.12) so there's real time pressure immediately, tightening
  // as levels get harder and never fully flattening out thanks to overtime.
  const timeLimitSeconds = Math.max(25, Math.round(160 - progress * 90 - overtime * 22));

  // A small, steady trickle of powerup tiles - present from level 1 as
  // helpful "escape valves" against the tighter 4-slot tray, growing slowly
  // with difficulty so later, harder boards hand out a few more.
  const powerupCount = Math.min(6, 1 + Math.floor(progress * 5));

  return {
    level: clamped,
    rows,
    cols,
    layers,
    tileTypes,
    totalTiles,
    traySize: TRAY_SIZE,
    timeLimitSeconds,
    powerupCount,
  };
}

/**
 * Chooses which (row, col) cells get a tile stack and how tall each stack
 * is, then expands every stack into individual {row, col, layer} slots
 * (layer 0 = bottom/first-placed, increasing upward). Stacks are placed on
 * an ordinary rows x cols grid - no shrinking pyramid - so a tall stack can
 * appear anywhere on the board and multiple stacks can be adjacent, which is
 * what makes "dig down through this exact pile" a real puzzle rather than a
 * cosmetic offset.
 *
 * Stack heights are biased toward `maxHeight` more strongly as `progress`
 * increases, so higher levels have more tall piles rather than lots of
 * shallow ones - the actual source of extra difficulty at high levels,
 * beyond just "more tiles".
 */
function pickStackCells(
  rows: number,
  cols: number,
  maxHeight: number,
  totalTiles: number,
  progress: number,
  rng: () => number
): { row: number; col: number; layer: number }[] {
  const allCells: { row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) allCells.push({ row: r, col: c });
  }
  const shuffled = shuffleWithRng(allCells, rng);

  // Exponent < 1 skews Math.pow(rng(), exp) toward 1, so lower exponents
  // (higher progress) produce taller stacks more often.
  const biasExp = Math.max(0.35, 1 - progress * 0.65);

  const heights = new Map<string, number>();
  const usedOrder: { row: number; col: number }[] = [];
  const key = (r: number, c: number) => `${r},${c}`;

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

  // Rare fallback (only if the grid is too small for the requested tile
  // count at this max height): deepen already-used stacks up to the cap.
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

  const cells: { row: number; col: number; layer: number }[] = [];
  for (const [k, h] of heights) {
    const [r, c] = k.split(',').map(Number);
    for (let l = 0; l < h; l++) cells.push({ row: r, col: c, layer: l });
  }
  return cells;
}

export function generateBoard(config: LevelConfig): BoardTile[] {
  const rng = mulberry32(seedFromLevel(config.level));
  const progress = difficultyProgress(config.level);
  const chosenCells = pickStackCells(config.rows, config.cols, config.layers, config.totalTiles, progress, rng);

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

  // Layer a handful of powerup tiles directly on top of existing stacks, one
  // extra tile above whatever was already the tallest at that cell - so a
  // powerup is always already uncovered and reachable the moment the board
  // loads, never requiring the player to dig for it first.
  const stackTops = new Map<string, { row: number; col: number; layer: number }>();
  for (const cell of chosenCells) {
    const key = `${cell.row},${cell.col}`;
    const existing = stackTops.get(key);
    if (!existing || cell.layer > existing.layer) {
      stackTops.set(key, cell);
    }
  }
  const candidateCells = shuffleWithRng(Array.from(stackTops.values()), rng);
  const powerupKinds: PowerupKind[] = ['wild', 'bomb', 'freeze'];
  const powerupTiles: BoardTile[] = [];
  for (let i = 0; i < Math.min(config.powerupCount, candidateCells.length); i++) {
    const cell = candidateCells[i];
    const kind = powerupKinds[Math.floor(rng() * powerupKinds.length)];
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

    // Powerup tiles never join a 3-of-a-kind match - they're removed the
    // instant they're reachable, same as a player would tap one for the
    // free effect. Handle them first so they never get mistaken for part of
    // a type triplet below.
    const freePowerup = uncovered.find((t) => t.powerup);
    if (freePowerup) {
      order.push(freePowerup.id);
      pool = pool.filter((t) => t.id !== freePowerup.id);
      continue;
    }

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
