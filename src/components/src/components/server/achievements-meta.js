// Mirrors src/data/achievements.ts (id/title/icon/rarity only). The client
// is the source of truth for *whether* an achievement is unlocked (it
// evaluates the isMet() conditions against live gameplay state and syncs the
// unlocked id set up via /api/save) - this file exists purely so the bot can
// turn that synced id set into a readable embed without duplicating any
// unlock logic. Keep in sync by hand if achievements.ts changes.
export const ACHIEVEMENT_META = {
  first_clear: { title: 'First Plate', icon: '🏮', rarity: 'common' },
  ten_levels: { title: 'Regular', icon: '🍜', rarity: 'common' },
  fifty_levels: { title: 'Market Regular', icon: '🥟', rarity: 'rare' },
  hundred_levels: { title: 'Century Chef', icon: '👨‍🍳', rarity: 'epic' },
  five_hundred_levels: { title: 'Night Market Legend', icon: '🏆', rarity: 'legendary' },
  combo_5: { title: 'Combo Cook', icon: '🔥', rarity: 'common' },
  combo_10: { title: 'On Fire', icon: '💥', rarity: 'rare' },
  three_star_10: { title: 'Perfect Plating', icon: '⭐', rarity: 'common' },
  three_star_50: { title: 'Master Plater', icon: '🌟', rarity: 'rare' },
  streak_5: { title: 'Hot Streak', icon: '🎯', rarity: 'common' },
  streak_20: { title: 'Unstoppable', icon: '⚡', rarity: 'epic' },
  matches_500: { title: 'Matchmaker', icon: '🍚', rarity: 'rare' },
  matches_5000: { title: 'Matching Machine', icon: '🍗', rarity: 'epic' },
  magician: { title: 'Market Magician', icon: '✨', rarity: 'common' },
  no_help_win: { title: 'No Help Needed', icon: '🧠', rarity: 'common' },
  daily_streak_3: { title: 'Coming Back', icon: '📅', rarity: 'common' },
  daily_streak_7: { title: 'Loyal Vendor', icon: '🗓️', rarity: 'rare' },
  daily_streak_30: { title: 'Market Fixture', icon: '🏵️', rarity: 'legendary' },
  multiplayer_win: { title: 'Crowd Favorite', icon: '🎮', rarity: 'common' },
  first_bite: { title: 'First Bite', icon: '🍽️', rarity: 'common' },
  combo_king: { title: 'Combo King', icon: '🔥', rarity: 'rare' },
  helping_hand: { title: 'Helping Hand', icon: '🤝', rarity: 'rare' },
  pork_master: { title: 'Pork Master', icon: '🥩', rarity: 'epic' },
  feast_together: { title: 'Feast Together', icon: '🍲', rarity: 'epic' },
  bam_baroh_legend: { title: 'Bam Baroh Legend', icon: '👑', rarity: 'legendary' },
  market_deity: { title: 'Market Deity', icon: '🌟', rarity: 'mythic' },
};

export const ACHIEVEMENT_COUNT = Object.keys(ACHIEVEMENT_META).length;
