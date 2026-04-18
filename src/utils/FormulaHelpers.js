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

// Loot drop tier roll — tier-scaled so early game heavily favours normal/magic items.
// tierNumber = null uses legacy flat rates (used by simulator / non-dungeon contexts).
// Progression: Tier 0 → 78% normal; Tier 10 → 64% normal; Tier 15 → 57% normal.
export function rollLootTier(luck = 0, tierNumber = null) {
  const roll = Math.random() * 100 + luck * 0.5;

  if (tierNumber === null) {
    // Legacy flat distribution — unchanged for simulator and debug tools
    if (roll > 98) return 'legendary';
    if (roll > 88) return 'rare';
    if (roll > 60) return 'magic';
    return 'normal';
  }

  // Clamp tier between 0 and 15 for threshold calculation
  const t = Math.min(15, Math.max(0, tierNumber));
  // Thresholds slide downward as tier increases, making better items gradually more likely
  const legendaryThreshold = 99.5 - t * 0.17;  // 99.5 at T0 → 97.0 at T15  (0.5% → 3%)
  const rareThreshold      = 95   - t * 0.60;  // 95   at T0 → 86.0 at T15  (4.5% → 11%)
  const magicThreshold     = 78   - t * 1.40;  // 78   at T0 → 57.0 at T15  (17% → 29%)

  if (roll > legendaryThreshold) return 'legendary';
  if (roll > rareThreshold)      return 'rare';
  if (roll > magicThreshold)     return 'magic';
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
