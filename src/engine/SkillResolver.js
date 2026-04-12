// Resolves a skill rune + array of link runes into a damage profile
export function resolveSkill(skillRune, links = []) {
  if (!skillRune) return null;

  let resolved = {
    id: skillRune.id,
    name: skillRune.name,
    type: skillRune.type,
    element: skillRune.element,
    damage: skillRune.baseDamage,
    manaCost: skillRune.baseManaCost,
    cooldown: skillRune.baseCooldown,
    hits: skillRune.baseHits,
    statusEffect: skillRune.statusEffect,
    additionalStatuses: [],
    multicast: 1,
    multicastDamageMultiplier: 1.0,
    echoChance: 0,
    hasTotem: false,
    totemDamageMultiplier: 0,
    hasCulling: false,
    cullingThreshold: 0,
    penetration: 0,
    manaLeech: 0,
    triggerOnKill: false,
    triggerOnHit: false,
    triggerOnLowHp: false,
    triggerOnFullMana: false,
  };

  links.forEach(link => {
    if (!link) return;
    const cost = link.manaCostMultiplier || 1;
    resolved.manaCost *= cost;
    const cdMult = link.cooldownMultiplier || 1;
    resolved.cooldown *= cdMult;

    switch (link.effect) {
      case 'hits':
        resolved.hits += link.value;
        break;
      case 'multicast':
        resolved.multicast = link.value;
        resolved.multicastDamageMultiplier = link.damageMultiplier || 0.6;
        break;
      case 'damage':
        resolved.damage *= link.value;
        break;
      case 'addStatus':
        if (!resolved.additionalStatuses.includes(link.value)) {
          resolved.additionalStatuses.push(link.value);
        }
        break;
      case 'echo':
        resolved.echoChance = link.value;
        break;
      case 'totem':
        resolved.hasTotem = true;
        resolved.totemDamageMultiplier = link.value;
        break;
      case 'triggerOnKill':
        resolved.triggerOnKill = true;
        break;
      case 'triggerOnHit':
        resolved.triggerOnHit = true;
        break;
      case 'triggerOnLowHp':
        resolved.triggerOnLowHp = true;
        break;
      case 'triggerOnFullMana':
        resolved.triggerOnFullMana = true;
        break;
      case 'cooldown_reduction':
        resolved.cooldown *= (1 - (link.value || 0.25));
        break;
      case 'manaLeech':
        resolved.manaLeech = link.value;
        break;
      case 'culling':
        resolved.hasCulling = true;
        resolved.cullingThreshold = link.value;
        break;
      case 'penetration':
        resolved.penetration = link.value;
        break;
    }
  });

  resolved.manaCost = Math.round(resolved.manaCost);
  resolved.damage = Math.round(resolved.damage);

  return resolved;
}

export function buildSkillFromSlot(slot) {
  if (!slot || !slot.skillRune) return null;
  return resolveSkill(slot.skillRune, slot.links || []);
}
