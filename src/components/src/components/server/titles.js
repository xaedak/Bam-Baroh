// Titles are flavor text unlocked by crossing existing stat thresholds -
// there is no separate "titles" table or currency, they're computed on the
// fly from the same xp/wins/matches/accuracy columns ranks.js already reads.
// Ordered lowest -> highest; a player holds every title they qualify for,
// and their "current" title (shown on the profile card) is the highest one.
const TITLE_LADDER = [
  { id: 'newcomer', name: 'Newcomer', test: () => true },
  { id: 'apprentice_cook', name: 'Apprentice Cook', test: (a) => a.wins >= 5 },
  { id: 'plate_clearer', name: 'Plate Clearer', test: (a) => a.wins >= 25 },
  { id: 'market_regular', name: 'Market Regular', test: (a) => a.wins >= 75 },
  { id: 'stack_digger', name: 'Stack Digger', test: (a) => a.matches >= 150 },
  { id: 'sharp_eye', name: 'Sharp Eye', test: (a) => a.matches >= 40 && a.accuracy >= 70 },
  { id: 'quickest_hands', name: 'Quickest Hands', test: (a) => a.matches >= 40 && a.speed >= 45 },
  { id: 'feast_champion', name: 'Feast Champion', test: (a) => a.wins >= 150 },
  { id: 'legend_of_the_table', name: 'Legend of the Table', test: (a) => a.xp >= 15000 },
];

/**
 * @param {{ xp: number, wins: number, matches: number, accuracy: number, speed: number }} account
 * @returns {{ unlocked: {id:string,name:string}[], current: {id:string,name:string} }}
 */
export function getTitleInfo(account) {
  const a = {
    xp: account?.xp || 0,
    wins: account?.wins || 0,
    matches: account?.matches || 0,
    accuracy: account?.accuracy || 0,
    speed: account?.speed || 0,
  };
  const unlocked = TITLE_LADDER.filter((t) => t.test(a)).map((t) => ({ id: t.id, name: t.name }));
  return {
    unlocked,
    current: unlocked[unlocked.length - 1] ?? { id: 'newcomer', name: 'Newcomer' },
  };
}

export { TITLE_LADDER };
