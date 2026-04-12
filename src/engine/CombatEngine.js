// CombatEngine.js — Pure function combat simulation with StatusEngine integration
import { applyStatus, tickStatuses, checkInteractions, isFrozen, getAttackSpeedMult, getShockDamageMult } from './StatusEngine.js';

const MAX_TICKS = 200;

function applyElementBonus(damage, element, playerStats) {
  const bonusMap = {
    fire: playerStats.fireDamageBonus || 0,
    ice: playerStats.iceDamageBonus || 0,
    lightning: playerStats.lightningDamageBonus || 0,
    physical: playerStats.physicalDamageBonus || 0,
    poison: playerStats.poisonDamageBonus || 0,
    chaos: playerStats.chaosDamageBonus || 0,
  };
  return damage * (1 + (bonusMap[element] || 0) / 100);
}

function applyTypeBonus(damage, type, playerStats) {
  const typeMap = {
    spell: playerStats.spellDamageBonus || 0,
    melee: playerStats.meleeDamageBonus || 0,
    ranged: playerStats.rangedDamageBonus || 0,
  };
  return damage * (1 + (typeMap[type] || 0) / 100);
}

function calcFinalDamage(baseDamage, skill, playerStats, enemy, isCrit = false) {
  const allBonus = (playerStats.allDamageBonus || 0) / 100;
  let dmg = baseDamage * (1 + allBonus);
  dmg = applyElementBonus(dmg, skill.element, playerStats);
  dmg = applyTypeBonus(dmg, skill.type, playerStats);

  dmg = dmg * getShockDamageMult(enemy, playerStats);

  const resist = (enemy.resistances?.[skill.element] || 0) / 100;
  const penetration = skill.penetration || 0;
  const effectiveResist = Math.max(0, resist - penetration);
  dmg = dmg * (1 - effectiveResist);

  if (skill.element === 'physical') {
    const armorReduction = (enemy.armor || 0) / ((enemy.armor || 0) + 100);
    dmg = dmg * (1 - armorReduction);
  }

  if (isCrit) {
    const critMult = (playerStats.critMultiplier || 150) / 100;
    dmg = dmg * critMult;
  }

  const skillEffectBonus = 1 + (playerStats.skillEffect || 0) / 100;
  dmg = dmg * skillEffectBonus;

  return Math.max(1, Math.round(dmg));
}

function rollCrit(playerStats, hitCounter = 0) {
  if (playerStats.fortunesEdge && hitCounter > 0 && hitCounter % 5 === 0) return true;
  return Math.random() * 100 < (playerStats.critChance || 5);
}

export function runCombat(playerStats, skills, enemies) {
  const log = [];
  let tick = 0;

  const enemyStates = enemies.map(e => ({
    ...e,
    hp: e.hp,
    maxHp: e.hp,
    statuses: {},
    cooldownTimer: 1.0 / (e.attackSpeed || 1.0),
    _deathLogged: false,
  }));

  const player = {
    hp: playerStats.maxHp || 200,
    maxHp: playerStats.maxHp || 200,
    mana: playerStats.maxMana || 100,
    maxMana: playerStats.maxMana || 100,
    statuses: {},
  };

  const skillTimers = skills.map(() => 0);
  const hitCounters = skills.map(() => 0);

  log.push({ type: 'start', text: `Combat started! ${enemyStates.length} enemy(ies) present.` });

  while (tick < MAX_TICKS) {
    tick++;

    player.mana = Math.min(player.maxMana, player.mana + (playerStats.manaRegen || 5) * 0.5);
    player.hp = Math.min(player.maxHp, player.hp + (playerStats.hpRegen || 1) * 0.5);

    const aliveEnemies = enemyStates.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) break;

    const isFullMana = player.mana >= player.maxMana;

    skills.forEach((skill, i) => {
      if (!skill) return;
      const cdrBonus = (playerStats.cooldownReduction || 0) / 100;
      let effectiveCooldown = skill.cooldown * (1 - cdrBonus);
      const atkSpeedBonus = (playerStats.attackSpeedBonus || 0) / 100;
      effectiveCooldown = effectiveCooldown / (1 + atkSpeedBonus);

      if (skillTimers[i] > 0) { skillTimers[i] -= 0.5; return; }
      skillTimers[i] = effectiveCooldown;

      let manaCost = skill.manaCost;
      if (playerStats.blademaster && skill.type === 'melee') manaCost = 0;

      let hpCost = 0;
      if (playerStats.bloodMage && manaCost > 0) {
        hpCost = manaCost;
        manaCost = 0;
      }

      if (player.mana < manaCost) {
        log.push({ type: 'no_mana', text: `${skill.name} — not enough mana (${Math.floor(player.mana)}/${manaCost})` });
        return;
      }
      if (hpCost > 0 && player.hp <= hpCost) {
        log.push({ type: 'no_mana', text: `${skill.name} — not enough HP for Blood Mage cost` });
        return;
      }

      player.mana -= manaCost;
      let activeSkill = skill;
      if (hpCost > 0) {
        player.hp = Math.max(1, player.hp - hpCost);
        activeSkill = { ...skill, damage: skill.damage + hpCost };
      }

      const fireCount = (playerStats.windstep && effectiveCooldown < 1.0) ? 2 : 1;
      for (let f = 0; f < fireCount; f++) {
        fireSkill(activeSkill, aliveEnemies, player, playerStats, log, hitCounters, i);
      }

      if (isFullMana && skill.triggerOnFullMana) {
        log.push({ type: 'trigger', text: `TRIGGER: Full Mana — ${skill.name} fires bonus shot!` });
        fireSkill(activeSkill, aliveEnemies, player, playerStats, log, hitCounters, i, true);
      }

      if (player.hp / player.maxHp < 0.30 && skill.triggerOnLowHp) {
        log.push({ type: 'trigger', text: `TRIGGER: Low HP — ${skill.name} fires in desperation!` });
        fireSkill(activeSkill, aliveEnemies, player, playerStats, log, hitCounters, i, true);
      }
    });

    const aliveAfterSkills = enemyStates.filter(e => e.hp > 0);
    aliveAfterSkills.forEach(e => {
      tickStatuses(e, log, e.name, playerStats);
    });

    const justDefeated = enemyStates.filter(e => e.hp <= 0 && !e._deathLogged);
    justDefeated.forEach(e => {
      e._deathLogged = true;
      log.push({ type: 'defeated', text: `${e.name} has been DEFEATED!`, target: e.name });

      if (playerStats.pandemic && e.statuses?.poison) {
        const remaining = enemyStates.filter(en => en.hp > 0);
        remaining.forEach(en => {
          applyStatus(en, 'poison', 4);
          log.push({ type: 'status_applied', text: `PANDEMIC: Poison spreads to ${en.name}!`, status: 'poison', target: en.name });
        });
      }

      const remaining = enemyStates.filter(en => en.hp > 0);
      if (remaining.length > 0) {
        skills.forEach((skill, i) => {
          if (skill?.triggerOnKill) {
            log.push({ type: 'trigger', text: `TRIGGER: On Kill — ${skill.name} fires!` });
            fireSkill(skill, remaining, player, playerStats, log, hitCounters, i, true);
          }
        });
      }
    });

    const stillAlive = enemyStates.filter(e => e.hp > 0);
    if (stillAlive.length === 0) break;

    stillAlive.forEach(enemy => {
      if (isFrozen(enemy)) {
        log.push({ type: 'frozen', text: `${enemy.name} is FROZEN — skips attack`, target: enemy.name });
        if (enemy.statuses.freeze) enemy.statuses.freeze.duration -= 0.5;
        return;
      }

      const attackSpeedMult = getAttackSpeedMult(enemy);
      enemy.cooldownTimer = (enemy.cooldownTimer || 0) - 0.5 * attackSpeedMult;
      if (enemy.cooldownTimer > 0) return;
      const attackInterval = 1.0 / (enemy.attackSpeed || 1.0);
      enemy.cooldownTimer = attackInterval;

      const armorReduction = (playerStats.armor || 0) / ((playerStats.armor || 0) + 100);
      const rawDmg = enemy.attackDamage || 10;
      let mitigated = Math.max(1, Math.round(rawDmg * (1 - armorReduction)));

      if (enemy.mechanic === 'enrage' && enemy.hp / enemy.maxHp < 0.3) {
        mitigated = Math.round(mitigated * 1.5);
        log.push({ type: 'enemy_attack', text: `${enemy.name} ENRAGES! Attack empowered!`, attacker: enemy.name });
      }

      player.hp = Math.max(0, player.hp - mitigated);

      if (playerStats.ironWill) {
        const manaGain = Math.round(mitigated * 0.2);
        player.mana = Math.min(player.maxMana, player.mana + manaGain);
      }

      log.push({
        type: 'enemy_attack',
        text: `${enemy.name} attacks player for ${mitigated} damage (${player.hp}/${player.maxHp} HP)`,
        damage: mitigated, attacker: enemy.name,
      });

      if (enemy.onHitStatus) {
        applyStatus(player, enemy.onHitStatus);
        log.push({ type: 'status_applied', text: `${enemy.name} applies ${enemy.onHitStatus.toUpperCase()} to player!`, status: enemy.onHitStatus });
      }
    });

    tickStatuses(player, log, 'Player');

    if (player.hp <= 0) {
      log.push({ type: 'defeat', text: `DEFEAT — The player has fallen!` });
      return { result: 'defeat', log, ticks: tick };
    }

    const remainingEnemies = enemyStates.filter(e => e.hp > 0);
    if (remainingEnemies.length === 0) {
      log.push({ type: 'victory', text: `VICTORY — All enemies defeated in ${tick} ticks!` });
      return { result: 'victory', log, ticks: tick };
    }
  }

  log.push({ type: 'timeout', text: 'Combat timed out after maximum ticks.' });
  return { result: 'timeout', log, ticks: tick };
}

function fireSkill(skill, targets, player, playerStats, log, hitCounters, skillIndex, isEcho = false) {
  const castLabel = isEcho ? ' [ECHO]' : '';
  const aliveTargets = targets.filter(t => t.hp > 0);
  if (aliveTargets.length === 0) return;

  const castCount = skill.multicast || 1;
  for (let cast = 0; cast < castCount; cast++) {
    const dmgMult = cast === 0 ? 1 : (skill.multicastDamageMultiplier || 0.6);
    const hitTargets = aliveTargets.slice(0, skill.hits || 1);

    hitTargets.forEach(target => {
      if (target.hp <= 0) return;

      if (skill.hasCulling && target.hp / target.maxHp < (skill.cullingThreshold || 0.15)) {
        const culledHp = target.hp;
        target.hp = 0;
        log.push({ type: 'cull', text: `${skill.name}${castLabel} CULLS ${target.name}! (${culledHp} HP remaining)`, target: target.name });
        return;
      }

      hitCounters[skillIndex] = (hitCounters[skillIndex] || 0) + 1;
      const isCrit = rollCrit(playerStats, hitCounters[skillIndex]);
      const rawDmg = Math.round(skill.damage * dmgMult);
      const finalDmg = calcFinalDamage(rawDmg, skill, playerStats, target, isCrit);
      target.hp = Math.max(0, target.hp - finalDmg);

      if (skill.manaLeech) {
        player.mana = Math.min(player.maxMana, player.mana + finalDmg * skill.manaLeech);
      }

      const multiLabel = castCount > 1 ? ` (cast ${cast + 1})` : '';
      const critLabel = isCrit ? ' CRITICAL HIT!' : '';
      const fortuneLabel = playerStats.fortunesEdge && isCrit ? " [Fortune's Edge]" : '';
      log.push({
        type: isCrit ? 'crit' : 'damage',
        text: `${skill.name}${castLabel}${multiLabel} → ${target.name}: ${finalDmg} ${skill.element} damage${critLabel}${fortuneLabel}${target.hp <= 0 ? ' [KILLED]' : ` (${target.hp}/${target.maxHp} HP)`}`,
        damage: finalDmg, isCrit, target: target.name, skill: skill.name,
      });

      const allStatuses = [skill.statusEffect, ...(skill.additionalStatuses || [])].filter(Boolean);
      allStatuses.forEach(status => {
        applyStatus(target, status);
        log.push({ type: 'status_applied', text: `${status.toUpperCase()} applied to ${target.name}`, status, target: target.name });
      });

      checkInteractions(target, log, target.name, playerStats);
    });
  }

  if (!isEcho && skill.echoChance && Math.random() < skill.echoChance) {
    const echoTarget = aliveTargets.find(e => e.hp > 0);
    if (echoTarget) {
      const echoDmg = calcFinalDamage(skill.damage, skill, playerStats, echoTarget, false);
      echoTarget.hp = Math.max(0, echoTarget.hp - echoDmg);
      log.push({ type: 'echo', text: `ECHO! ${skill.name} fires again → ${echoTarget.name}: ${echoDmg} damage${echoTarget.hp <= 0 ? ' [KILLED]' : ''}`, damage: echoDmg });
    }
  }

  if (skill.hasTotem) {
    const totemTarget = aliveTargets.find(e => e.hp > 0);
    if (totemTarget) {
      const totemDmg = calcFinalDamage(Math.round(skill.damage * (skill.totemDamageMultiplier || 0.5)), skill, playerStats, totemTarget, false);
      totemTarget.hp = Math.max(0, totemTarget.hp - totemDmg);
      log.push({ type: 'totem', text: `TOTEM fires ${skill.name} → ${totemTarget.name}: ${totemDmg} damage`, damage: totemDmg });
    }
  }
}
