import affixPool from '../data/affixPool.json';
import { rollLootTier, calcGearScore } from '../utils/FormulaHelpers.js';

const GEAR_SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots'];

const AFFIX_COUNT = { normal: 0, magic: 2, rare: 4, legendary: 3 };

export function generateItem(tierOverride = null, slotOverride = null, luck = 0) {
  const slot = slotOverride || GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  const rarity = tierOverride || rollLootTier(luck);
  const affixCount = AFFIX_COUNT[rarity] || 0;

  const eligibleAffixes = affixPool.filter(a => a.tiers.includes(rarity));
  const selectedAffixes = [];

  for (let i = 0; i < affixCount && eligibleAffixes.length > 0; i++) {
    const idx = Math.floor(Math.random() * eligibleAffixes.length);
    const affixDef = eligibleAffixes.splice(idx, 1)[0];
    const value = Math.floor(affixDef.minValue + Math.random() * (affixDef.maxValue - affixDef.minValue + 1));
    selectedAffixes.push({
      id: affixDef.id,
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

  return drops;
}
