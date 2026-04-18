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

// Legendary stays very rare even at high tiers — mostly a crafting reward.
// Rate rises from 0.1% at T0 to ~0.6% at T15 (slope = 0.033 per tier).
const LEGENDARY_THRESHOLD_BASE = 99.9;
const LEGENDARY_THRESHOLD_SLOPE = 0.033;

// Loot drop tier roll — tier-scaled so early game heavily favours normal/magic items.
// tierNumber = null uses legacy flat rates (used by simulator / non-dungeon contexts).
// Progression: Tier 0 → 78% normal; Tier 10 → 64% normal; Tier 15 → 57% normal.
// Legendary is intentionally very rare (0.1–0.6%) — primarily obtained via crafting bench.
export function rollLootTier(luck = 0, tierNumber = null) {
  const roll = Math.random() * 100 + luck * 0.5;

  if (tierNumber === null) {
    // Legacy flat distribution — unchanged for simulator and debug tools
    if (roll > 99.9) return 'legendary';
    if (roll > 88)   return 'rare';
    if (roll > 60)   return 'magic';
    return 'normal';
  }

  // Clamp tier between 0 and 15 for threshold calculation
  const t = Math.min(15, Math.max(0, tierNumber));
  const legendaryThreshold = LEGENDARY_THRESHOLD_BASE - t * LEGENDARY_THRESHOLD_SLOPE;
  // Other rarities slide downward as tier increases, making better items gradually more likely
  const rareThreshold      = 95   - t * 0.60;   // 95   at T0 → 86.0 at T15  (4.9% → 13%)
  const magicThreshold     = 78   - t * 1.40;   // 78   at T0 → 57.0 at T15  (17% → 29%)

  if (roll > legendaryThreshold) return 'legendary';
  if (roll > rareThreshold)      return 'rare';
  if (roll > magicThreshold)     return 'magic';
  return 'normal';
}

// Gear score from affixes
export function calcGearScore(affixes) {
  return affixes.reduce((sum, a) => sum + Math.floor(a.value), 0);
}

// Dust yield when salvaging an item — used by PlayerContext reducer and UI previews
export function calcSalvageDust(item) {
  if (!item) return 0;
  if (item.rarity === 'unique')     return 50;
  if (item.rarity === 'legendary')  return item.gearScore + 20;
  if (item.rarity === 'rare')       return Math.floor(item.gearScore * 0.8) + 10;
  if (item.rarity === 'magic')      return Math.floor(item.gearScore * 0.6) + 5;
  return Math.floor(item.gearScore * 0.5) + 3; // normal
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
