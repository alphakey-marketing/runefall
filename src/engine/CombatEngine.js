// CombatEngine.js — Pure function combat simulation
// runCombat(playerStats, skills[], enemies[]) → combatLog[]

const TICK_MS = 500;
const MAX_TICKS = 200;

function applyElementBonus(damage, element, playerStats) {
  const bonusMap = {
    fire: playerStats.fireDamageBonus || 0,
    ice: playerStats.iceDamageBonus || 0,
    lightning: playerStats.lightningDamageBonus || 0,
    physical: playerStats.physicalDamageBonus || 0,
    poison: playerStats.poisonDamageBonus || 0,
  };
  const elementBonus = (bonusMap[element] || 0) / 100;
  return damage * (1 + elementBonus);
}

function applyTypeBonus(damage, type, playerStats) {
  const typeMap = {
    spell: playerStats.spellDamageBonus || 0,
    melee: playerStats.meleeDamageBonus || 0,
    ranged: playerStats.rangedDamageBonus || 0,
  };
  const typeBonus = (typeMap[type] || 0) / 100;
  return damage * (1 + typeBonus);
}

function calcFinalDamage(baseDamage, skill, playerStats, enemy, isCrit = false) {
  const allBonus = (playerStats.allDamageBonus || 0) / 100;
  let dmg = baseDamage * (1 + allBonus);
  dmg = applyElementBonus(dmg, skill.element, playerStats);
  dmg = applyTypeBonus(dmg, skill.type, playerStats);

  // Enemy resistance
  const resist = (enemy.resistances?.[skill.element] || 0) / 100;
  const penetration = skill.penetration || 0;
  const effectiveResist = Math.max(0, resist - penetration);
  dmg = dmg * (1 - effectiveResist);

  // Armor reduction (physical only)
  if (skill.element === 'physical') {
    const armorReduction = (enemy.armor || 0) / ((enemy.armor || 0) + 100);
    dmg = dmg * (1 - armorReduction);
  }

  if (isCrit) {
    const critMult = (playerStats.critMultiplier || 150) / 100;
    dmg = dmg * critMult;
  }

  return Math.max(1, Math.round(dmg));
}

function rollCrit(playerStats) {
  return Math.random() * 100 < (playerStats.critChance || 5);
}

function applyStatus(entity, status, duration = 4) {
  if (!entity.statuses) entity.statuses = {};
  if (!entity.statuses[status]) {
    entity.statuses[status] = { stacks: 1, duration };
  } else {
    entity.statuses[status].stacks = Math.min(entity.statuses[status].stacks + 1, 5);
    entity.statuses[status].duration = duration;
  }
}

function tickStatuses(entity, log, entityName) {
  if (!entity.statuses) return;
  for (const [status, data] of Object.entries(entity.statuses)) {
    if (data.duration <= 0) {
      delete entity.statuses[status];
      continue;
    }
    data.duration -= 0.5; // each tick is 500ms
    let tickDmg = 0;
    if (status === 'burn') {
      tickDmg = 5 * data.stacks;
    } else if (status === 'bleed') {
      tickDmg = Math.floor(entity.maxHp * 0.02 * data.stacks);
    } else if (status === 'poison') {
      tickDmg = 3 * data.stacks;
    }
    if (tickDmg > 0) {
      entity.hp = Math.max(0, entity.hp - tickDmg);
      log.push({ type: 'status', text: `${entityName} takes ${tickDmg} ${status} damage (${data.stacks} stack${data.stacks > 1 ? 's' : ''})`, damage: tickDmg, status });
    }
  }
}

export function runCombat(playerStats, skills, enemies) {
  const log = [];
  let tick = 0;

  // Deep clone enemies so we don't mutate originals
  const enemyStates = enemies.map(e => ({
    ...e,
    hp: e.hp,
    maxHp: e.hp,
    statuses: {},
    cooldownTimer: 0,
  }));

  const player = {
    hp: playerStats.maxHp || 200,
    maxHp: playerStats.maxHp || 200,
    mana: playerStats.maxMana || 100,
    maxMana: playerStats.maxMana || 100,
    statuses: {},
  };

  // Track skill cooldown timers
  const skillTimers = skills.map(() => 0);

  log.push({ type: 'start', text: `Combat started! ${enemyStates.length} enemy(ies) present.` });

  while (tick < MAX_TICKS) {
    tick++;
    const tickTime = tick * 0.5; // in seconds

    // Regen
    player.mana = Math.min(player.maxMana, player.mana + (playerStats.manaRegen || 5) * 0.5);
    player.hp = Math.min(player.maxHp, player.hp + (playerStats.hpRegen || 1) * 0.5);

    // Player skills fire
    const aliveEnemies = enemyStates.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) break;

    skills.forEach((skill, i) => {
      if (!skill) return;
      // Cooldown
      const cdrBonus = (playerStats.cooldownReduction || 0) / 100;
      const effectiveCooldown = skill.cooldown * (1 - cdrBonus);
      if (skillTimers[i] > 0) {
        skillTimers[i] -= 0.5;
        return;
      }
      skillTimers[i] = effectiveCooldown;

      // Check mana
      if (player.mana < skill.manaCost) {
        log.push({ type: 'no_mana', text: `${skill.name} — not enough mana (${Math.floor(player.mana)}/${skill.manaCost})` });
        return;
      }
      player.mana -= skill.manaCost;

      // Determine how many casts (multicast)
      const castCount = skill.multicast || 1;
      for (let cast = 0; cast < castCount; cast++) {
        const dmgMult = cast === 0 ? 1 : (skill.multicastDamageMultiplier || 0.6);
        const targets = aliveEnemies.slice(0, skill.hits || 1);

        targets.forEach(target => {
          if (target.hp <= 0) return;

          // Culling strike
          if (skill.hasCulling && target.hp / target.maxHp < skill.cullingThreshold) {
            const killedHp = target.hp;
            target.hp = 0;
            log.push({ type: 'cull', text: `${skill.name} CULLS ${target.name}! (${killedHp} HP remaining)`, target: target.name });
            return;
          }

          const isCrit = rollCrit(playerStats);
          const rawDmg = Math.round(skill.damage * dmgMult);
          const finalDmg = calcFinalDamage(rawDmg, skill, playerStats, target, isCrit);
          target.hp = Math.max(0, target.hp - finalDmg);

          // Mana leech
          if (skill.manaLeech) {
            player.mana = Math.min(player.maxMana, player.mana + finalDmg * skill.manaLeech);
          }

          const castLabel = castCount > 1 ? ` (cast ${cast + 1})` : '';
          const critLabel = isCrit ? ' CRITICAL HIT!' : '';
          log.push({
            type: isCrit ? 'crit' : 'damage',
            text: `${skill.name}${castLabel} → ${target.name}: ${finalDmg} ${skill.element} damage${critLabel}${target.hp <= 0 ? ' [KILLED]' : ` (${target.hp}/${target.maxHp} HP)`}`,
            damage: finalDmg,
            isCrit,
            target: target.name,
            skill: skill.name,
          });

          // Apply status effects
          const allStatuses = [skill.statusEffect, ...(skill.additionalStatuses || [])].filter(Boolean);
          allStatuses.forEach(status => {
            applyStatus(target, status);
            log.push({ type: 'status_applied', text: `${status.toUpperCase()} applied to ${target.name}`, status, target: target.name });
          });
        });
      }

      // Echo chance
      if (skill.echoChance && Math.random() < skill.echoChance) {
        const echoTarget = aliveEnemies.find(e => e.hp > 0);
        if (echoTarget) {
          const echoDmg = calcFinalDamage(skill.damage, skill, playerStats, echoTarget, false);
          echoTarget.hp = Math.max(0, echoTarget.hp - echoDmg);
          log.push({ type: 'echo', text: `ECHO! ${skill.name} fires again → ${echoTarget.name}: ${echoDmg} damage${echoTarget.hp <= 0 ? ' [KILLED]' : ''}`, damage: echoDmg });
        }
      }

      // Totem
      if (skill.hasTotem) {
        const totemTarget = aliveEnemies.find(e => e.hp > 0);
        if (totemTarget) {
          const totemDmg = calcFinalDamage(Math.round(skill.damage * skill.totemDamageMultiplier), skill, playerStats, totemTarget, false);
          totemTarget.hp = Math.max(0, totemTarget.hp - totemDmg);
          log.push({ type: 'totem', text: `TOTEM fires ${skill.name} → ${totemTarget.name}: ${totemDmg} damage`, damage: totemDmg });
        }
      }
    });

    // Tick statuses on enemies
    const aliveAfterSkills = enemyStates.filter(e => e.hp > 0);
    aliveAfterSkills.forEach(e => {
      if (e.hp > 0) tickStatuses(e, log, e.name);
    });

    // On-kill triggers
    const justKilled = enemyStates.filter(e => e.hp <= 0 && !e._deathLogged);
    justKilled.forEach(e => {
      e._deathLogged = true;
      log.push({ type: 'kill', text: `${e.name} has been DEFEATED!`, target: e.name });
    });

    // Enemy attacks
    const stillAlive = enemyStates.filter(e => e.hp > 0);
    if (stillAlive.length === 0) break;

    stillAlive.forEach(enemy => {
      const frozenStatus = enemy.statuses?.chill;
      if (frozenStatus && frozenStatus.stacks >= 3) {
        log.push({ type: 'frozen', text: `${enemy.name} is FROZEN — skips attack`, target: enemy.name });
        return;
      }

      enemy.cooldownTimer = (enemy.cooldownTimer || 0) - 0.5;
      if (enemy.cooldownTimer > 0) return;
      const attackInterval = 1.0 / (enemy.attackSpeed || 1.0);
      enemy.cooldownTimer = attackInterval;

      const armorReduction = (playerStats.armor || 0) / ((playerStats.armor || 0) + 100);
      const rawDmg = enemy.attackDamage || 10;
      const mitigated = Math.max(1, Math.round(rawDmg * (1 - armorReduction)));
      player.hp = Math.max(0, player.hp - mitigated);

      log.push({
        type: 'enemy_attack',
        text: `${enemy.name} attacks player for ${mitigated} damage (${player.hp}/${player.maxHp} HP)`,
        damage: mitigated,
        attacker: enemy.name,
      });
    });

    // Tick player statuses
    tickStatuses(player, log, 'Player');

    // Check win/lose
    if (player.hp <= 0) {
      log.push({ type: 'defeat', text: `DEFEAT — The player has fallen!` });
      return { result: 'defeat', log, ticks: tick };
    }

    const remainingEnemies = enemyStates.filter(e => e.hp > 0);
    if (remainingEnemies.length === 0) {
      log.push({ type: 'victory', text: `VICTORY — All enemies defeated!` });
      return { result: 'victory', log, ticks: tick };
    }
  }

  log.push({ type: 'timeout', text: 'Combat timed out after maximum ticks.' });
  return { result: 'timeout', log, ticks: tick };
}
