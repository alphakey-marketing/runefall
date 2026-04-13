// Merges base player stats + equipped gear + zodiac bonuses into final playerStats
export function calculatePlayerStats(baseStats, equippedGear, zodiacBonuses = {}, playerState = null) {
  const merged = { ...baseStats };

  // Apply gear affixes
  Object.values(equippedGear).forEach(item => {
    if (!item) return;
    (item.affixes || []).forEach(affix => {
      if (merged[affix.statKey] !== undefined) {
        merged[affix.statKey] += affix.value;
      } else {
        merged[affix.statKey] = affix.value;
      }
    });
  });

  // Apply zodiac bonuses
  Object.entries(zodiacBonuses).forEach(([key, val]) => {
    if (merged[key] !== undefined) {
      merged[key] += val;
    } else {
      merged[key] = val;
    }
  });

  // Apply ascendancy flags
  if (playerState?.ascendancy === 'runebound') merged.runebound = true;
  if (playerState?.ascendancy === 'hexblade') merged.hexblade = true;
  if (playerState?.ascendancy === 'stormbringer') merged.stormbringer = true;

  return merged;
}

export function getBaseStats() {
  return {
    maxHp: 200,
    currentHp: 200,
    maxMana: 100,
    currentMana: 100,
    armor: 0,
    attackSpeedBonus: 0,
    cooldownReduction: 0,
    critChance: 5,
    critMultiplier: 150,
    allDamageBonus: 0,
    fireDamageBonus: 0,
    iceDamageBonus: 0,
    lightningDamageBonus: 0,
    physicalDamageBonus: 0,
    poisonDamageBonus: 0,
    chaosDamageBonus: 0,
    spellDamageBonus: 0,
    meleeDamageBonus: 0,
    rangedDamageBonus: 0,
    itemRarity: 0,
    hpRegen: 1,
    manaRegen: 5,
    elementalResist: 0,
    skillEffect: 0,
    statusDuration: 0,
    luck: 0,
  };
}
