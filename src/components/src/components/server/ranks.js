// Rank ladder, ordered lowest -> highest. XP thresholds are the minimum XP
// required to hold that rank.
export const RANKS = [
  { name: 'Cook', minXp: 0 },
  { name: 'Junior Cook', minXp: 250 },
  { name: 'Chef', minXp: 750 },
  { name: 'Master Chef', minXp: 1800 },
  { name: 'Village Feast Leader', minXp: 4000 },
  { name: 'Royal Cook', minXp: 8000 },
  { name: 'Bam Baroh Legend', minXp: 15000 },
];

/**
 * Resolves the rank for a given XP total, plus progress toward the next rank.
 * @param {number} xp
 */
export function getRankInfo(xp) {
  const total = Math.max(0, Math.floor(xp || 0));
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (total >= RANKS[i].minXp) index = i;
    else break;
  }
  const current = RANKS[index];
  const next = RANKS[index + 1] || null;
  const progress = next
    ? Math.min(1, (total - current.minXp) / (next.minXp - current.minXp))
    : 1;

  return {
    name: current.name,
    index,
    minXp: current.minXp,
    nextRank: next?.name ?? null,
    nextXp: next?.minXp ?? null,
    progress,
  };
}
