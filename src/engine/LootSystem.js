import affixPool from '../data/affixPool.json';
import uniqueItems from '../data/uniqueItems.json';
import { rollLootTier, calcGearScore, weightedRandom } from '../utils/FormulaHelpers.js';

const GEAR_SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots'];

function rollAffixCount(rarity) {
  switch (rarity) {
    case 'normal':    return 1;                                          // 1 basic stat — not junk, but clearly inferior to magic
    case 'magic':     return 1 + Math.floor(Math.random() * 3);         // 1, 2, or 3
    case 'rare':      return 3 + Math.floor(Math.random() * 3);         // 3, 4, or 5
    case 'legendary': return 4 + Math.floor(Math.random() * 3);         // 4, 5, or 6
    default: return 0;
  }
}

export function generateItem(tierOverride = null, slotOverride = null, luck = 0, tierNumber = null) {
  const slot = slotOverride || GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  const rarity = tierOverride || rollLootTier(luck, tierNumber);
  const affixCount = rollAffixCount(rarity);

  const eligibleAffixes = affixPool.filter(a => a.tiers.includes(rarity));
  const selectedAffixes = [];
  const usedIds = [];

  for (let i = 0; i < affixCount && eligibleAffixes.length > 0; i++) {
    const pool = eligibleAffixes.filter(a => !usedIds.includes(a.id));
    if (pool.length === 0) break;
    const affixDef = weightedRandom(pool);
    usedIds.push(affixDef.id);
    // Value range: legendary overrides → normal overrides → base magic/rare range
    const min = rarity === 'legendary' && affixDef.legendaryMinValue != null ? affixDef.legendaryMinValue
               : rarity === 'normal'    && affixDef.normalMinValue    != null ? affixDef.normalMinValue
               : affixDef.minValue;
    const max = rarity === 'legendary' && affixDef.legendaryMaxValue != null ? affixDef.legendaryMaxValue
               : rarity === 'normal'    && affixDef.normalMaxValue    != null ? affixDef.normalMaxValue
               : affixDef.maxValue;
    const value = Math.floor(min + Math.random() * (max - min + 1));
    selectedAffixes.push({
      id: affixDef.id,
      sourceId: affixDef.id,
      name: affixDef.name,
      statKey: affixDef.statKey,
      value,
      unit: affixDef.unit,
    });
  }

  const gearScore = calcGearScore(selectedAffixes);

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    slot,
    rarity,
    name: generateItemName(slot, rarity),
    affixes: selectedAffixes,
    gearScore,
  };
}

function generateItemName(slot, rarity) {
  const slotNames = {
    weapon: ['Blade', 'Staff', 'Wand', 'Axe', 'Bow'],
    helmet: ['Helm', 'Crown', 'Circlet', 'Hood', 'Mask'],
    chest: ['Robe', 'Plate', 'Vest', 'Cuirass', 'Coat'],
    gloves: ['Gauntlets', 'Gloves', 'Grips', 'Wraps', 'Claws'],
    boots: ['Boots', 'Greaves', 'Slippers', 'Treads', 'Sabatons'],
  };
  const prefixes = {
    normal: ['Plain', 'Simple', 'Basic'],
    magic: ['Enchanted', 'Arcane', 'Mystic'],
    rare: ['Runic', 'Ancient', 'Cursed', 'Shadow'],
    legendary: ['Legendary', 'Divine', 'Mythic'],
  };
  const names = slotNames[slot] || ['Item'];
  const pre = prefixes[rarity] || prefixes.normal;
  return `${pre[Math.floor(Math.random() * pre.length)]} ${names[Math.floor(Math.random() * names.length)]}`;
}

export function generateDungeonLoot(tier, rooms, luck = 0) {
  const drops = [];
  const lootMult = tier.lootMultiplier || 1;
  const baseDrops = Math.floor(2 + lootMult);
  const tierNumber = tier.tier || 0;

  for (let i = 0; i < baseDrops; i++) {
    drops.push(generateItem(null, null, luck, tierNumber));
  }

  // Tier 13+ chance to drop a unique item
  const unique = maybeDropUnique(tierNumber);
  if (unique) drops.push(unique);

  return drops;
}

const UNIQUE_DROP_MIN_TIER = 13;
const UNIQUE_DROP_CHANCE = 0.10; // 10% chance per run completion at Tier 13+
const MAX_UNIQUE_AFFIX_ATTEMPTS = 40; // enough attempts to fill 3 slots from a large pool

// Drop a unique item from Tier 13+, 10% chance per run completion
// Unique items carry their 3 fixed affixes plus 3 random legendary-quality bonus affixes.
export function maybeDropUnique(tierNumber) {
  if (tierNumber < UNIQUE_DROP_MIN_TIER) return null;
  if (Math.random() > UNIQUE_DROP_CHANCE) return null;
  const pool = uniqueItems.filter(u => u.slot);
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Roll 3 random legendary-quality bonus affixes distinct from the fixed ones
  const legAffixes = affixPool.filter(a => a.tiers.includes('legendary'));
  const fixedSourceIds = (template.affixes || []).map(a => a.sourceId);
  const rolledAffixes = [];
  let attempts = 0;
  while (rolledAffixes.length < 3 && attempts < MAX_UNIQUE_AFFIX_ATTEMPTS) {
    const candidate = legAffixes[Math.floor(Math.random() * legAffixes.length)];
    if (
      !fixedSourceIds.includes(candidate.id) &&
      !rolledAffixes.some(r => r.sourceId === candidate.id)
    ) {
      const min = candidate.legendaryMinValue ?? candidate.minValue;
      const max = candidate.legendaryMaxValue ?? candidate.maxValue;
      const value = Math.floor(min + Math.random() * (max - min + 1));
      rolledAffixes.push({
        id: `${candidate.id}_rnd_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        sourceId: candidate.id,
        name: candidate.name,
        statKey: candidate.statKey,
        value,
        unit: candidate.unit,
      });
    }
    attempts++;
  }

  const allAffixes = [...(template.affixes || []), ...rolledAffixes];
  return {
    ...template,
    id: `unique_${template.id}_${Date.now()}`,
    affixes: allAffixes,
    gearScore: calcGearScore(allAffixes),
    _fixedAffixCount: (template.affixes || []).length,
  };
}

const TIER_KEY_MODIFIERS = ['amplified', 'volatile', 'haunted', 'enriched', 'cursed', 'empowered', 'fractured'];

export function maybeDropTierKey(tier) {
  if (Math.random() > 0.30) return null;
  const mod = TIER_KEY_MODIFIERS[Math.floor(Math.random() * TIER_KEY_MODIFIERS.length)];
  return {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type: 'tierKey',
    tier: tier + 1,
    modifier: mod,
    name: `Tier ${tier + 1} Key (${mod})`,
  };
}
