import affixPool from '../data/affixPool.json';
import uniqueItems from '../data/uniqueItems.json';
import { rollLootTier, calcGearScore, weightedRandom } from '../utils/FormulaHelpers.js';

const GEAR_SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots'];

function rollAffixCount(rarity) {
  switch (rarity) {
    case 'magic': return Math.random() < 0.5 ? 1 : 2;
    case 'rare': return 3 + Math.floor(Math.random() * 3);      // 3, 4, or 5
    case 'legendary': return 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
    default: return 0;
  }
}

export function generateItem(tierOverride = null, slotOverride = null, luck = 0) {
  const slot = slotOverride || GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  const rarity = tierOverride || rollLootTier(luck);
  const affixCount = rollAffixCount(rarity);

  const eligibleAffixes = affixPool.filter(a => a.tiers.includes(rarity));
  const selectedAffixes = [];
  const usedIds = [];

  for (let i = 0; i < affixCount && eligibleAffixes.length > 0; i++) {
    const pool = eligibleAffixes.filter(a => !usedIds.includes(a.id));
    if (pool.length === 0) break;
    const affixDef = weightedRandom(pool);
    usedIds.push(affixDef.id);
    const min = (rarity === 'legendary' && affixDef.legendaryMinValue != null) ? affixDef.legendaryMinValue : affixDef.minValue;
    const max = (rarity === 'legendary' && affixDef.legendaryMaxValue != null) ? affixDef.legendaryMaxValue : affixDef.maxValue;
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

  for (let i = 0; i < baseDrops; i++) {
    drops.push(generateItem(null, null, luck));
  }

  // Tier 11+ guarantee one legendary
  if ((tier.tier || 0) >= 11) {
    drops.push(generateItem('legendary', null, luck));
  }

  // Tier 15+ chance to drop a unique item
  const unique = maybeDropUnique(tier.tier || 0);
  if (unique) drops.push(unique);

  return drops;
}

const UNIQUE_DROP_MIN_TIER = 13;
const UNIQUE_DROP_CHANCE = 0.10; // 10% chance per run completion at Tier 15+

// Drop a unique item from Tier 15+, 10% chance per run completion
export function maybeDropUnique(tierNumber) {
  if (tierNumber < UNIQUE_DROP_MIN_TIER) return null;
  if (Math.random() > UNIQUE_DROP_CHANCE) return null;
  const pool = uniqueItems.filter(u => u.slot);
  const template = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...template,
    id: `unique_${template.id}_${Date.now()}`,
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
