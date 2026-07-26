// A smoother, more granular complement to the rank ladder in ranks.js:
// ranks are a handful of named tiers, this is a numbered level that ticks up
// every ~120 XP (rising slightly each level so early levels come quickly and
// later ones take longer) - the classic "Lv 14" readout players expect
// alongside a named rank. Purely a function of the xp column that already
// exists; nothing new is stored.
const BASE_XP_PER_LEVEL = 120;
const GROWTH_PER_LEVEL = 18;

/** Total XP required to have fully completed `level` (level 1 = 0). */
function xpForLevel(level) {
  // Sum of an arithmetic series: level-1 steps, each a bit bigger than the
  // last.
  const n = Math.max(0, level - 1);
  return Math.round(n * BASE_XP_PER_LEVEL + (GROWTH_PER_LEVEL * n * (n - 1)) / 2);
}

/**
 * Resolves the player level for a given XP total, plus progress toward the
 * next level.
 */
export function getLevelInfo(xp) {
  const total = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  // Levels are unbounded but this is plenty of headroom for a linear scan -
  // XP totals realistically won't get anywhere near needing a closed-form
  // solve.
  while (xpForLevel(level + 1) <= total && level < 9999) level += 1;

  const currentFloor = xpForLevel(level);
  const nextFloor = xpForLevel(level + 1);
  const span = nextFloor - currentFloor;
  const progress = span > 0 ? Math.min(1, (total - currentFloor) / span) : 1;

  return {
    level,
    xpIntoLevel: total - currentFloor,
    xpForNextLevel: span,
    progress,
  };
}
