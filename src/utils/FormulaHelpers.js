// XP required to reach a level
export function xpRequired(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// Monster HP scaling by tier — 10% per tier keeps endgame challenging without being impossible
export function monsterHp(baseHp, tier) {
  return Math.floor(baseHp * Math.pow(1.10, tier - 1));
}

// Monster damage scaling by tier — 7% per tier, gentler than HP so players can survive longer
export function monsterDamage(baseDmg, tier) {
  return Math.floor(baseDmg * Math.pow(1.07, tier - 1));
}

// Loot drop tier roll
export function rollLootTier(luck = 0) {
  const roll = Math.random() * 100 + luck * 0.5;
  if (roll > 98) return 'legendary';
  if (roll > 88) return 'rare';
  if (roll > 60) return 'magic';
  return 'normal';
}

// Gear score from affixes
export function calcGearScore(affixes) {
  return affixes.reduce((sum, a) => sum + Math.floor(a.value), 0);
}

// Weighted random pick from a pool — each item may have a `weight` field (default 10)
export function weightedRandom(pool) {
  const total = pool.reduce((sum, item) => sum + (item.weight || 10), 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= (item.weight || 10);
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}
