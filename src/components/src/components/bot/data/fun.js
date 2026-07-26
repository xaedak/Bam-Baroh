export const FOOD_FACTS = [
  'Lechon (whole roast pork) gets its crackling skin from repeatedly basting it while it slow-turns over charcoal for hours.',
  'Pancit noodles are traditionally served at birthdays in the Philippines for long life - tradition says you\'re not supposed to cut them.',
  'Bagoong (fermented shrimp paste) can take weeks to months to ferment, and different regions swear by wildly different recipes.',
  'A proper night market lechon manok (roast chicken) is basted in a citrus-soy marinade, not just salt and pepper.',
  'Halo-halo means "mix-mix" - the whole point is stirring every colorful layer together before you eat it.',
  'Adobo has no single "correct" recipe - practically every family\'s version differs in vinegar-to-soy ratio.',
  'Pitha (rice cakes) come in dozens of regional shapes across South and Southeast Asia, often tied to specific festivals.',
  'Okra was originally cultivated in Africa before spreading through trade routes to South Asia and the Americas.',
  'Jackfruit is the largest tree-borne fruit in the world - a single fruit can weigh over 40kg (about 90lbs).',
  'Mango varieties can range from tart and green to honey-sweet - some cultures eat unripe mango dipped in chili-salt.',
];

export const RANDOM_DISHES = [
  '🍜 Beef noodle soup with charred scallions',
  '🥟 Steamed pork dumplings with black vinegar',
  '🍗 Citrus-marinated grilled chicken skewers',
  '🐟 Whole fried fish with tamarind glaze',
  '🍚 Garlic fried rice with a fried egg on top',
  '🥩 Slow-roasted pork belly with crackling skin',
  '🍆 Smoky grilled eggplant with chili oil',
  '🌽 Charred corn on the cob with lime and chili powder',
  '🎃 Pumpkin and coconut milk stew',
  '🍒 Chilled lychee dessert soup',
];

export const TIPS = [
  'Pick off powerup tiles the moment you see them - they never take up a tray slot, so there\'s no downside to grabbing them early.',
  'Before you dig into a tall stack, scan for a shorter one with the same visible tile - clearing it costs you way less tray space.',
  'The 💣 Bomb powerup always clears the tallest reachable stack on the board - save it for the pile that\'s blocking you the most.',
  'The 🔀 Wild powerup only helps if you already have a matching pair sitting in your tray - try to line one up before using it.',
  'With only 4 tray slots, don\'t uncover a new tile type unless you can see a path to matching it soon - an empty slot is a resource.',
  'Watch for tiles of the same color family (fruit vs. veg vs. meat) - it\'s a fast visual cue before you even read the emoji.',
];

export const MEMES = [
  'Me: I\'ll just clear one more stack.\nAlso me, 45 minutes later: still digging through mahjong tiles at 2am.',
  'Nobody:\nMy tray with 3 slots full of different tiles: "we could be friends but nah."',
  'Powerup tile appears.\nMe: finally, an escape valve.\nBoard: laughs in 9 layers.',
  'When you drop the tile in the tray and it\'s the wrong one you\'ve been avoiding this whole level 💀',
];

export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}
