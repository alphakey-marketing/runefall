// XP required to reach a level
export function xpRequired(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// Monster HP scaling by tier
export function monsterHp(baseHp, tier) {
  return Math.floor(baseHp * Math.pow(1.15, tier - 1));
}

// Monster damage scaling by tier
export function monsterDamage(baseDmg, tier) {
  return Math.floor(baseDmg * Math.pow(1.12, tier - 1));
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
