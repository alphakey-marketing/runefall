// StatusEngine.js — Status effect management and elemental interactions

const STATUS_DURATIONS = { burn: 4, chill: 3, shock: 3, bleed: 5, poison: 6 };
const MAX_STATUS_STACKS = 5;

export function applyStatus(entity, status, duration) {
  if (!entity.statuses) entity.statuses = {};
  const dur = duration || STATUS_DURATIONS[status] || 4;
  if (!entity.statuses[status]) {
    entity.statuses[status] = { stacks: 1, duration: dur };
  } else {
    entity.statuses[status].stacks = Math.min(entity.statuses[status].stacks + 1, MAX_STATUS_STACKS);
    entity.statuses[status].duration = dur;
  }
}

export function tickStatuses(entity, log, entityName, playerStats = {}) {
  if (!entity.statuses) return;

  for (const [status, data] of Object.entries(entity.statuses)) {
    if (data.duration <= 0) {
      delete entity.statuses[status];
      continue;
    }
    data.duration -= 0.5;
    let tickDmg = 0;

    if (status === 'burn') {
      // cindersurge: burn tick deals 2× normal damage
      const cindersurgeMult = playerStats.cindersurge ? 2 : 1;
      tickDmg = Math.round(5 * data.stacks * (playerStats.conflagration ? 3 : 1) * cindersurgeMult);
    } else if (status === 'bleed') {
      tickDmg = Math.floor(entity.maxHp * 0.02 * data.stacks);
    } else if (status === 'poison') {
      tickDmg = 3 * data.stacks;
    }

    if (tickDmg > 0) {
      entity.hp = Math.max(0, entity.hp - tickDmg);
      log.push({
        type: 'status',
        text: `${entityName} takes ${tickDmg} ${status} damage (${data.stacks} stack${data.stacks > 1 ? 's' : ''})`,
        damage: tickDmg,
        status
      });
    }
  }
}

export function checkInteractions(entity, log, entityName, playerStats = {}) {
  if (!entity.statuses) return;
  const statuses = entity.statuses;

  // permafrost: freeze lasts 4s instead of 2s
  const freezeDuration = playerStats.permafrost ? 4 : 2;
  // flashfreeze (Frostmind Helm): Freeze threshold is 2 chill stacks instead of 3
  const chillThreshold = playerStats.flashfreeze ? 2 : 3;

  if (statuses.chill && statuses.chill.stacks >= chillThreshold && !statuses.freeze) {
    statuses.freeze = { stacks: 1, duration: freezeDuration };
    log.push({ type: 'interaction', text: `${entityName} is FROZEN solid! (Chill ×${statuses.chill.stacks} stacks)`, status: 'freeze', target: entityName });
  }

  // auto_shatter (Mantle of Shattering): Shatter triggers without zodiac node
  if (statuses.shock && statuses.freeze && (playerStats.shatter || playerStats.auto_shatter)) {
    const shatterDmg = Math.round(entity.maxHp * 0.25);
    entity.hp = Math.max(0, entity.hp - shatterDmg);
    delete statuses.freeze;
    delete statuses.shock;
    log.push({ type: 'interaction', text: `Shock + Freeze → SHATTER on ${entityName} for ${shatterDmg} damage!`, damage: shatterDmg, target: entityName });
  }

  // hemorrhage: Bleedwraps unique auto-triggers Hemorrhage without zodiac node
  // (both playerStats.hemorrhage from zodiac AND from unique item are handled via StatsCalculator remap)
  if (statuses.burn && statuses.bleed && playerStats.hemorrhage) {
    const burstDmg = Math.round(statuses.bleed.stacks * entity.maxHp * 0.05);
    entity.hp = Math.max(0, entity.hp - burstDmg);
    log.push({ type: 'interaction', text: `Hemorrhage! Burn+Bleed burst on ${entityName} for ${burstDmg} damage!`, damage: burstDmg, target: entityName });
  }

  // sepsis_amp: Venomcrown — Sepsis deals 3% max HP/tick instead of base 1%
  if (statuses.bleed && statuses.poison) {
    const sepsisPct = playerStats.sepsis_amp ? 0.03 : 0.01;
    const sepsisDmg = Math.round(entity.maxHp * sepsisPct);
    entity.hp = Math.max(0, entity.hp - sepsisDmg);
    log.push({ type: 'interaction', text: `SEPSIS (Bleed+Poison): ${entityName} takes ${sepsisDmg} bonus damage`, damage: sepsisDmg, target: entityName });
  }

  // NEW: Frostbite — Chill 3+ stacks + Poison causes Poison to lock in (frostbite debuff)
  if (statuses.chill && statuses.chill.stacks >= 3 && statuses.poison && !statuses.frostbite) {
    statuses.frostbite = { stacks: 1, duration: 3 };
    log.push({
      type: 'interaction',
      text: `${entityName} suffers FROSTBITE — Poison is locked in by the cold!`,
      status: 'frostbite',
      target: entityName,
    });
  }

  // NEW: Shockbleed — Shock causes Bleed ticks to deal +20% bonus damage
  if (statuses.shock && statuses.bleed) {
    const shockbleedBonus = Math.round(statuses.bleed.stacks * entity.maxHp * 0.02 * 0.20);
    if (shockbleedBonus > 0) {
      entity.hp = Math.max(0, entity.hp - shockbleedBonus);
      log.push({
        type: 'interaction',
        text: `Shockbleed! Shock amplifies Bleed on ${entityName} for +${shockbleedBonus} bonus damage`,
        damage: shockbleedBonus,
        target: entityName,
      });
    }
  }
}

export function isFrozen(entity) {
  return entity.statuses?.freeze && entity.statuses.freeze.duration > 0;
}

export function isSlowed(entity) {
  return entity.statuses?.chill && entity.statuses.chill.stacks >= 1;
}

export function getAttackSpeedMult(entity) {
  if (!entity.statuses) return 1;
  if (entity.statuses.chill) {
    return 1 - 0.1 * Math.min(entity.statuses.chill.stacks, 3);
  }
  return 1;
}

export function getShockDamageMult(entity, playerStats = {}) {
  if (!entity.statuses?.shock) return 1;
  // overload (Stormweaver Circlet): 35% increased damage at 2+ shock stacks (vs 20% base)
  if (playerStats.overload && entity.statuses.shock.stacks >= 2) return 1.35;
  return playerStats.overcharge ? 1.40 : 1.20;
}
