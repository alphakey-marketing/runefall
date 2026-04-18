// CombatEngine.js — Pure function combat simulation with StatusEngine integration
import { applyStatus, tickStatuses, checkInteractions, isFrozen, getAttackSpeedMult, getShockDamageMult } from './StatusEngine.js';
import uniqueItems from '../data/uniqueItems.json';

// UNIQUE_EFFECTS — canonical registry of every unique item effect.
// trigger: which combat event activates the effect.
// apply: pure function returning a result object (used by external callers / UI summary).
// The actual in-loop implementation lives in runCombat / fireSkill below.
export const UNIQUE_EFFECTS = {
  // Weapons
  cindersurge: {
    trigger: 'onStatusTick',
    apply: (_player, tickDmg) => ({ damage: tickDmg * 2 }),
    description: 'Burn stacks deal 2× their normal tick damage.',
  },
  boneshatter: {
    trigger: 'onHit',
    apply: (_player, hits, target) => ({ hits: !Object.keys(target.statuses || {}).length ? hits + 1 : hits }),
    description: 'Bone Spear gains +1 hit when striking a target with no active status effects.',
  },
  thornreflect: {
    trigger: 'onMeleeDamage',
    apply: (_player, damage) => ({ damage: Math.round(damage * 1.25) }),
    description: 'While any enemy has 3+ Bleed stacks, melee skills deal +25% damage.',
  },
  wraithfrenzy: {
    trigger: 'onKill',
    apply: (_player) => ({ extraWraithCast: true }),
    description: 'Summon Wraith persists 50% longer and auto-triggers once on any enemy kill.',
  },
  voidrift: {
    trigger: 'onSkillCast',
    apply: (_player, damage) => ({ damage: Math.round(damage * (1.4 + Math.random() * 0.6)) }),
    description: 'Chaos Bolt variable damage always rolls 140–200% of base (floor raised from 80%).',
  },
  // Helmets
  ashenburst: {
    trigger: 'onCrit',
    apply: (_player, _target) => ({ applyStatus: { type: 'burn', duration: 3 } }),
    description: 'Critical hits automatically apply Burn to the target for 3 seconds.',
  },
  flashfreeze: {
    trigger: 'onStatusApply',
    apply: (_player, status) => ({ extraApply: status === 'chill' }),
    description: 'Chill stacks accumulate 2× per hit; Freeze threshold reached in 2 hits instead of 3.',
  },
  sepsis_amp: {
    trigger: 'onInteraction',
    apply: (player, entity) => ({ damage: Math.round(entity.maxHp * 0.03) }),
    description: 'Sepsis interaction (Bleed + Poison) deals 3% max HP/tick instead of base 1%.',
  },
  overload: {
    trigger: 'onDamageCalc',
    apply: (_player, damage) => ({ damage: Math.round(damage * 1.35) }),
    description: 'Shocked enemies take 35% increased damage (up from 20%). Requires 2+ Shock stacks.',
  },
  shadowmark: {
    trigger: 'onSkillCast',
    apply: (_player, target) => ({ markTarget: target, markDuration: 3 }),
    description: 'Shadow Step marks the target for 3 seconds. All hits against marked target deal +40% damage.',
  },
  // Chests
  lifedrain: {
    trigger: 'onSkillDamage',
    apply: (_player, damage) => ({ healAmount: Math.floor(damage * 0.05) }),
    description: 'Skills heal you for 5% of damage dealt.',
  },
  bloodfortify: {
    trigger: 'onStatCalc',
    apply: (player) => {
      const missingHpPct = 1 - (player.hp / player.maxHp);
      const stacks = Math.floor(missingHpPct * 10);
      return { bonusArmor: stacks * 8 };
    },
    description: 'Gain +8 Armor per 10% HP missing (max +80 Armor at critical HP).',
  },
  chaosecho: {
    trigger: 'onSkillCast',
    apply: (_player, damage) => ({ echoChance: 0.20, echoDamageMult: 0.50 }),
    description: '20% chance on any skill cast to repeat it for free at 50% damage.',
  },
  sporecloud: {
    trigger: 'onPlayerHit',
    apply: (_player) => ({ poisonNova: true, damageMult: 0.30, icd: 5 }),
    description: 'When you take damage, release a Poison Nova at 30% base damage (5-second ICD).',
  },
  auto_shatter: {
    trigger: 'onInteraction',
    apply: (_player, entity) => ({ damage: Math.round(entity.maxHp * 0.25) }),
    description: 'Shatter interaction triggers automatically without the Shatter zodiac node.',
  },
  // Gloves
  voidstrike: {
    trigger: 'onSkillCast',
    apply: (_player, damage, castCount) => ({
      damage: castCount % 4 === 0 ? damage * 2 : damage,
    }),
    description: 'Every 4th skill cast deals double damage.',
  },
  executioner: {
    trigger: 'onHit',
    apply: (_player, target) => ({ cullingThreshold: 0.25 }),
    description: 'Culling Strike threshold raised from 15% HP to 25% HP.',
  },
  hemorrhage: {
    trigger: 'onInteraction',
    apply: (_player, entity) => ({ damage: Math.round(entity.statuses?.bleed?.stacks * entity.maxHp * 0.05) }),
    description: 'Hemorrhage interaction triggers automatically without the Hemorrhage zodiac node.',
  },
  permafrost: {
    trigger: 'onStatusApply',
    apply: (_player) => ({ freezeDuration: 4 }),
    description: 'Frozen enemies stay frozen for 4 seconds instead of 2.',
  },
  totem_echo: {
    trigger: 'onTotemFire',
    apply: (_player, damage) => ({ damage: Math.round(damage * 0.75) }),
    description: 'Totems spawned by the Totem link rune fire at 75% damage instead of 50%.',
  },
  // Boots
  stardash: {
    trigger: 'onFirstCast',
    apply: (_player) => ({ manaCostOverride: 0 }),
    description: 'The first skill cast upon entering a new dungeon room costs zero mana.',
  },
  killchain: {
    trigger: 'onKill',
    apply: (_player) => ({ triggerOnKillCount: 2 }),
    description: 'The first kill in each room triggers 2 free Trigger On Kill casts instead of 1.',
  },
  trailblaze: {
    trigger: 'onCombatStart',
    apply: (player, enemies, fireDmgBonus) => ({
      burnStacks: 2 + Math.floor((fireDmgBonus || 0) / 50),
    }),
    description: 'Enemies start combat with 2 Burn stacks. +1 stack per 50% Fire Damage bonus.',
  },
  staticcharge: {
    trigger: 'onSkillCast',
    apply: (_player, damage) => ({ damage: Math.round(damage * 1.80) }),
    description: 'If a skill was on cooldown last tick, the next cast deals +80% increased damage.',
  },
  soulwake: {
    trigger: 'onWraithSummon',
    apply: (_player, damage) => ({ wraiths: 2, damageMult: 0.60 }),
    description: 'Summon Wraith spawns 2 wraiths at 60% damage each instead of 1 at 100%.',
  },
};

export function getEquippedUniqueEffect(equippedGear, trigger) {
  return Object.values(equippedGear)
    .filter(Boolean)
    .filter(item => item.rarity === 'unique' && item.uniqueEffect)
    .map(item => UNIQUE_EFFECTS[item.uniqueEffect.id])
    .filter(effect => effect && effect.trigger === trigger);
}

const MAX_TICKS = 200;

// fortunesEdge: every 5th hit is guaranteed crit at +200% bonus crit multiplier
// Base crit multiplier is 150% (1.5×). +200% bonus means 150 + 200 = 350% = 3.5× total.
const FORTUNES_EDGE_CRIT_MULT = 3.5;

// necromancersMark: on-kill, spectral minion deals this % of the dead enemy's maxHP to all remaining
const NECROMANCERS_MARK_DMG_PCT = 0.15;
const NECROMANCERS_MARK_FALLBACK_HP = 20;

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

function calcFinalDamage(baseDamage, skill, playerStats, enemy, isCrit = false, isFortuneCrit = false) {
  const allBonus = (playerStats.allDamageBonus || 0) / 100;
  let dmg = baseDamage * (1 + allBonus);
  dmg = applyElementBonus(dmg, skill.element, playerStats);
  dmg = applyTypeBonus(dmg, skill.type, playerStats);

  // blademaster: melee skills deal +50% damage
  if (playerStats.blademaster && skill.type === 'melee') {
    dmg = dmg * 1.5;
  }

  // hexblade: melee skills deal +30% chaos damage
  if (playerStats.hexblade && skill.type === 'melee') {
    dmg = dmg * 1.3;
  }

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
    // fortunesEdge every-5th-hit uses FORTUNES_EDGE_CRIT_MULT (3.5×) instead of normal critMultiplier
    const critMult = isFortuneCrit ? FORTUNES_EDGE_CRIT_MULT : (playerStats.critMultiplier || 150) / 100;
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

function isFortunesEdgeHit(playerStats, hitCounter) {
  return playerStats.fortunesEdge && hitCounter > 0 && hitCounter % 5 === 0;
}

export function runCombat(playerStats, skills, enemies, playerCurrentHp = null) {
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
    hp: playerCurrentHp !== null ? Math.min(playerCurrentHp, playerStats.maxHp || 200) : (playerStats.maxHp || 200),
    maxHp: playerStats.maxHp || 200,
    mana: playerStats.maxMana || 100,
    maxMana: playerStats.maxMana || 100,
    statuses: {},
  };

  const skillTimers = skills.map(() => 0);
  const hitCounters = skills.map(() => 0);
  // voidstrike: cast counter per skill slot (every 4th cast = double damage)
  const castCounters = skills.map(() => 0);
  // staticcharge: track whether each skill was on cooldown last tick
  const wasOnCooldown = skills.map(() => false);
  // stardash: first cast costs 0 mana (first room entry)
  let stardashUsed = false;
  // sporecloud: Poison Nova on taking damage (5s ICD = 10 ticks)
  let sporeCloudCooldown = 0;
  // killchain: first kill in this room triggers 2 trigger-on-kill casts instead of 1
  let killchainUsed = false;
  // shadowmark: track which enemy is currently marked and for how long
  let markedTarget = null;
  let markTicksRemaining = 0;

  log.push({ type: 'start', text: `Combat started! ${enemyStates.length} enemy(ies) present.` });

  // trailblaze (Cinderwalkers): enemies enter combat with 2+ Burn stacks pre-applied
  if (playerStats.trailblaze) {
    const burnStacks = 2 + Math.floor((playerStats.fireDamageBonus || 0) / 50);
    enemyStates.forEach(e => {
      for (let s = 0; s < burnStacks; s++) applyStatus(e, 'burn', 4);
      log.push({ type: 'status_applied', text: `TRAILBLAZE: ${e.name} enters combat with ${burnStacks} Burn stacks!`, status: 'burn', target: e.name });
    });
  }

  while (tick < MAX_TICKS) {
    tick++;

    // decay mark duration
    if (markTicksRemaining > 0) markTicksRemaining--;
    if (markTicksRemaining <= 0) markedTarget = null;

    if (sporeCloudCooldown > 0) sporeCloudCooldown--;

    player.mana = Math.min(player.maxMana, player.mana + (playerStats.manaRegen || 5) * 0.5);
    player.hp = Math.min(player.maxHp, player.hp + (playerStats.hpRegen || 1) * 0.5);

    const aliveEnemies = enemyStates.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) {
      log.push({ type: 'victory', text: `VICTORY — All enemies defeated in ${tick} ticks!` });
      return { result: 'victory', log, ticks: tick, playerHpRemaining: player.hp };
    }

    const isFullMana = player.mana >= player.maxMana;

    skills.forEach((skill, i) => {
      if (!skill) return;
      const cdrBonus = (playerStats.cooldownReduction || 0) / 100;
      let effectiveCooldown = skill.cooldown * (1 - cdrBonus);
      const atkSpeedBonus = (playerStats.attackSpeedBonus || 0) / 100;
      effectiveCooldown = effectiveCooldown / (1 + atkSpeedBonus);

      // staticcharge: track if this skill is currently on cooldown before we decrement
      const onCooldownThisTick = skillTimers[i] > 0;
      if (skillTimers[i] > 0) {
        wasOnCooldown[i] = true;
        skillTimers[i] -= 0.5;
        return;
      }
      skillTimers[i] = effectiveCooldown;

      let manaCost = skill.manaCost;
      if (playerStats.blademaster && skill.type === 'melee') manaCost = 0;

      // stardash: first cast in this room costs 0 mana
      if (playerStats.stardash && !stardashUsed) {
        manaCost = 0;
        stardashUsed = true;
        log.push({ type: 'trigger', text: `STARDASH: ${skill.name} costs 0 mana (first cast)!` });
      }

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

      // voidstrike: increment cast counter; if 4th cast, double damage
      castCounters[i] = (castCounters[i] || 0) + 1;
      let voidstrikeDamageMult = 1;
      if (playerStats.voidstrike && castCounters[i] % 4 === 0) {
        voidstrikeDamageMult = 2;
        log.push({ type: 'trigger', text: `VOIDSTRIKE: ${skill.name} — 4th cast deals DOUBLE damage!` });
      }

      // staticcharge: +80% damage if this skill was on cooldown last tick
      let staticChargeMult = 1;
      if (playerStats.staticcharge && wasOnCooldown[i]) {
        staticChargeMult = 1.80;
        log.push({ type: 'trigger', text: `STATICCHARGE: ${skill.name} — charged cast deals +80% damage!` });
      }
      wasOnCooldown[i] = false;

      const combinedDamageMult = voidstrikeDamageMult * staticChargeMult;
      const fireSkillWithMult = combinedDamageMult !== 1
        ? { ...activeSkill, damage: Math.round(activeSkill.damage * combinedDamageMult) }
        : activeSkill;

      // shadowmark: if Shadow Step, mark the primary target
      if (playerStats.shadowmark && skill.id === 'shadow_step') {
        const target = aliveEnemies[0];
        if (target) {
          markedTarget = target;
          markTicksRemaining = 6; // 3 seconds at 0.5s per tick
          log.push({ type: 'trigger', text: `SHADOWMARK: ${target.name} is MARKED for 3 seconds (+40% damage)!`, target: target.name });
        }
      }

      const fireCount = (playerStats.windstep && effectiveCooldown < 1.0) ? 2 : 1;
      for (let f = 0; f < fireCount; f++) {
        fireSkill(fireSkillWithMult, aliveEnemies, player, playerStats, log, hitCounters, i, false, markedTarget);
      }

      // wraithfrenzy: Summon Wraith + auto-trigger on kill (handled below); also summon wraith persists 50% longer (conceptual — wraith is a continuous skill)
      // soulwake: Summon Wraith fires as 2 wraiths at 60% each
      if (playerStats.soulwake && skill.id === 'summon_wraith') {
        const wraith2Skill = { ...skill, damage: Math.round(skill.damage * 0.60) };
        log.push({ type: 'trigger', text: `SOULWAKE: Second wraith summoned at 60% damage!` });
        fireSkill(wraith2Skill, aliveEnemies, player, playerStats, log, hitCounters, i, true, markedTarget);
      }

      // chaosecho: 20% chance to recast any skill at 50% damage
      if (playerStats.chaosecho && !skill._isEcho && Math.random() < 0.20) {
        const echoSkill = { ...activeSkill, damage: Math.round(activeSkill.damage * 0.50), _isEcho: true };
        log.push({ type: 'trigger', text: `CHAOSECHO: ${skill.name} echoes for free at 50% damage!` });
        fireSkill(echoSkill, aliveEnemies, player, playerStats, log, hitCounters, i, true, markedTarget);
      }

      if (isFullMana && skill.triggerOnFullMana) {
        log.push({ type: 'trigger', text: `TRIGGER: Full Mana — ${skill.name} fires bonus shot!` });
        fireSkill(activeSkill, aliveEnemies, player, playerStats, log, hitCounters, i, true, markedTarget);
      }

      if (player.hp / player.maxHp < 0.30 && skill.triggerOnLowHp) {
        log.push({ type: 'trigger', text: `TRIGGER: Low HP — ${skill.name} fires in desperation!` });
        fireSkill(activeSkill, aliveEnemies, player, playerStats, log, hitCounters, i, true, markedTarget);
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

      // necromancersMark: on-kill, summon a spectral minion that strikes all remaining enemies
      if (playerStats.necromancersMark) {
        const remaining = enemyStates.filter(en => en.hp > 0);
        if (remaining.length > 0) {
          const minionDmg = Math.max(1, Math.round((e.maxHp || NECROMANCERS_MARK_FALLBACK_HP) * NECROMANCERS_MARK_DMG_PCT));
          remaining.forEach(en => {
            en.hp = Math.max(0, en.hp - minionDmg);
            log.push({ type: 'damage', text: `Spectral Minion → ${en.name}: ${minionDmg} chaos damage [Necromancer's Mark]${en.hp <= 0 ? ' [KILLED]' : ` (${en.hp}/${en.maxHp} HP)`}`, damage: minionDmg, target: en.name });
          });
        }
      }

      const remaining = enemyStates.filter(en => en.hp > 0);
      if (remaining.length > 0) {
        // killchain: first kill in room triggers 2 trigger-on-kill casts; subsequent kills: 1
        const killTriggerCount = (playerStats.killchain && !killchainUsed) ? 2 : 1;
        if (playerStats.killchain && !killchainUsed) {
          killchainUsed = true;
          log.push({ type: 'trigger', text: `KILLCHAIN: First kill — 2 Trigger On Kill casts fire!` });
        }
        skills.forEach((skill, i) => {
          if (skill?.triggerOnKill) {
            for (let k = 0; k < killTriggerCount; k++) {
              log.push({ type: 'trigger', text: `TRIGGER: On Kill — ${skill.name} fires!` });
              fireSkill(skill, remaining, player, playerStats, log, hitCounters, i, true, markedTarget);
            }
          }
        });
        // wraithfrenzy: auto-fire Summon Wraith on any kill (if equipped)
        if (playerStats.wraithfrenzy) {
          const wraithSkill = skills.find(s => s?.id === 'summon_wraith');
          if (wraithSkill) {
            log.push({ type: 'trigger', text: `WRAITHFRENZY: Wraith auto-triggers on kill!` });
            const wraith = playerStats.soulwake
              ? { ...wraithSkill, damage: Math.round(wraithSkill.damage * 0.60) }
              : wraithSkill;
            fireSkill(wraith, remaining, player, playerStats, log, hitCounters, 0, true, markedTarget);
          }
        }
      }
    });

    const stillAlive = enemyStates.filter(e => e.hp > 0);
    if (stillAlive.length === 0) {
      log.push({ type: 'victory', text: `VICTORY — All enemies defeated in ${tick} ticks!` });
      return { result: 'victory', log, ticks: tick, playerHpRemaining: player.hp };
    }

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

      // bloodfortify: apply bonus armor based on missing HP
      if (playerStats.bloodfortify) {
        const missingHpPct = 1 - (player.hp / player.maxHp);
        const fortifyArmor = Math.floor(missingHpPct * 10) * 8;
        if (fortifyArmor > 0) {
          log.push({ type: 'trigger', text: `BLOODFORTIFY: +${fortifyArmor} bonus Armor from missing HP` });
        }
      }

      if (playerStats.ironWill) {
        const manaGain = Math.round(mitigated * 0.2);
        player.mana = Math.min(player.maxMana, player.mana + manaGain);
      }

      log.push({
        type: 'enemy_attack',
        text: `${enemy.name} attacks player for ${mitigated} damage (${player.hp}/${player.maxHp} HP)`,
        damage: mitigated,
        attacker: enemy.name,
        playerHpAfter: player.hp,
        playerMaxHp: player.maxHp,
      });

      if (enemy.onHitStatus) {
        applyStatus(player, enemy.onHitStatus);
        log.push({ type: 'status_applied', text: `${enemy.name} applies ${enemy.onHitStatus.toUpperCase()} to player!`, status: enemy.onHitStatus });
      }

      // sporecloud (Venom-Sown Robe): release Poison Nova on taking damage (5s ICD = 10 ticks)
      if (playerStats.sporecloud && sporeCloudCooldown <= 0) {
        sporeCloudCooldown = 10;
        const sporeNovaSkill = { id: 'poison_nova', name: 'Poison Nova [Sporecloud]', type: 'spell', element: 'poison', hits: 4, damage: 9, statusEffect: 'poison' };
        const sporeDmgBase = 30 * 0.30; // 30% of poison_nova base damage (30)
        const sporeTargets = enemyStates.filter(e => e.hp > 0);
        sporeTargets.forEach(st => {
          const sporeDmg = Math.max(1, Math.round(sporeDmgBase * (1 + (playerStats.poisonDamageBonus || 0) / 100)));
          st.hp = Math.max(0, st.hp - sporeDmg);
          applyStatus(st, 'poison');
          log.push({ type: 'damage', text: `SPORECLOUD: Poison Nova → ${st.name}: ${sporeDmg} poison damage${st.hp <= 0 ? ' [KILLED]' : ` (${st.hp}/${st.maxHp} HP)`}`, damage: sporeDmg, target: st.name, skillElement: 'poison', enemyHpAfter: st.hp, enemyMaxHp: st.maxHp, playerHpAfter: player.hp, playerMaxHp: player.maxHp });
        });
      }
    });

    tickStatuses(player, log, 'Player');

    // Bug 3 fix: also catch death caused by player DoT (status tick after enemy attacks)
    if (player.hp <= 0) {
      log.push({ type: 'defeat', text: `DEFEAT — The player has fallen!` });
      return { result: 'defeat', log, ticks: tick, playerHpRemaining: 0 };
    }

    const remainingEnemies = enemyStates.filter(e => e.hp > 0);
    if (remainingEnemies.length === 0) {
      log.push({ type: 'victory', text: `VICTORY — All enemies defeated in ${tick} ticks!` });
      return { result: 'victory', log, ticks: tick, playerHpRemaining: player.hp };
    }
  }

  log.push({ type: 'timeout', text: 'Combat timed out after maximum ticks.' });
  return { result: 'timeout', log, ticks: tick, playerHpRemaining: player.hp };
}

function getEffectiveHits(skill, playerStats, target = null) {
  let hits = (skill.hits || 1) + (playerStats.runebound ? 1 : 0);
  // boneshatter (Marrowpiercer): +1 hit on Bone Spear vs status-free targets
  if (playerStats.boneshatter && skill.id === 'bone_spear' && target) {
    const hasNoStatuses = !target.statuses || Object.keys(target.statuses).length === 0;
    if (hasNoStatuses) hits += 1;
  }
  return hits;
}

function fireSkill(skill, targets, player, playerStats, log, hitCounters, skillIndex, isEcho = false, markedTarget = null) {
  const castLabel = isEcho ? ' [ECHO]' : '';
  const aliveTargets = targets.filter(t => t.hp > 0);
  if (aliveTargets.length === 0) return;

  // thornreflect (Thornwhip): +25% melee damage while any alive enemy has 3+ Bleed stacks
  const anyEnemyHeavyBleed = aliveTargets.some(t => (t.statuses?.bleed?.stacks || 0) >= 3);
  const thornreflectBonus = playerStats.thornreflect && skill.type === 'melee' && anyEnemyHeavyBleed ? 1.25 : 1;

  const castCount = skill.multicast || 1;
  for (let cast = 0; cast < castCount; cast++) {
    const dmgMult = cast === 0 ? 1 : (skill.multicastDamageMultiplier || 0.6);
    // For boneshatter the effective hit count is per-target, so compute per first target
    const primaryTarget = aliveTargets[0];
    const effectiveHits = getEffectiveHits(skill, playerStats, primaryTarget);
    const hitTargets = aliveTargets.slice(0, effectiveHits);

    hitTargets.forEach(target => {
      if (target.hp <= 0) return;

      // executioner (Graveclutch): culling threshold raised to 25%
      const cullingThreshold = playerStats.executioner ? 0.25 : (skill.cullingThreshold || 0.15);
      if (skill.hasCulling && target.hp / target.maxHp < cullingThreshold) {
        const culledHp = target.hp;
        target.hp = 0;
        log.push({ type: 'cull', text: `${skill.name}${castLabel} CULLS ${target.name}! (${culledHp} HP remaining)`, target: target.name, skillElement: skill.element, skillId: skill.id, enemyHpAfter: 0, enemyMaxHp: target.maxHp, playerHpAfter: player.hp, playerMaxHp: player.maxHp });
        return;
      }

      hitCounters[skillIndex] = (hitCounters[skillIndex] || 0) + 1;
      const fortuneCrit = isFortunesEdgeHit(playerStats, hitCounters[skillIndex]);
      const isCrit = fortuneCrit || rollCrit(playerStats, hitCounters[skillIndex]);

      // voidrift (Voidhunger): Chaos Bolt variable damage floors at 140% instead of 80%
      let rawDmg = Math.round(skill.damage * dmgMult);
      if (skill.variableDamage) {
        const minPct = playerStats.voidrift ? 1.40 : 0.80;
        rawDmg = Math.round(skill.damage * dmgMult * (minPct + Math.random() * (2.0 - minPct)));
      }

      // thornreflect multiplier applied to raw damage for melee skills
      const adjustedDmg = Math.round(rawDmg * thornreflectBonus);
      let finalDmg = calcFinalDamage(adjustedDmg, skill, playerStats, target, isCrit, fortuneCrit);

      // shadowmark: +40% damage to marked target
      if (markedTarget && target === markedTarget) {
        finalDmg = Math.round(finalDmg * 1.40);
      }

      target.hp = Math.max(0, target.hp - finalDmg);

      // lifedrain (Runefall Heart): heal 5% of skill damage dealt
      if (playerStats.lifedrain) {
        const healAmt = Math.floor(finalDmg * 0.05);
        if (healAmt > 0) {
          player.hp = Math.min(player.maxHp, player.hp + healAmt);
          log.push({ type: 'trigger', text: `LIFEDRAIN: healed ${healAmt} HP from ${skill.name}`, playerHpAfter: player.hp, playerMaxHp: player.maxHp });
        }
      }

      if (skill.manaLeech) {
        player.mana = Math.min(player.maxMana, player.mana + finalDmg * skill.manaLeech);
      }

      const multiLabel = castCount > 1 ? ` (cast ${cast + 1})` : '';
      const critLabel = isCrit ? ' CRITICAL HIT!' : '';
      const fortuneLabel = fortuneCrit ? " [Fortune's Edge]" : '';
      const markLabel = (markedTarget && target === markedTarget) ? ' [MARKED +40%]' : '';
      log.push({
        type: isCrit ? 'crit' : 'damage',
        text: `${skill.name}${castLabel}${multiLabel} → ${target.name}: ${finalDmg} ${skill.element} damage${critLabel}${fortuneLabel}${markLabel}${target.hp <= 0 ? ' [KILLED]' : ` (${target.hp}/${target.maxHp} HP)`}`,
        damage: finalDmg,
        isCrit,
        target: target.name,
        skill: skill.name,
        skillId: skill.id,
        skillElement: skill.element,
        enemyHpAfter: target.hp,
        enemyMaxHp: target.maxHp,
        playerHpAfter: player.hp,
        playerMaxHp: player.maxHp,
      });

      const allStatuses = [skill.statusEffect, ...(skill.additionalStatuses || [])].filter(Boolean);
      allStatuses.forEach(status => {
        applyStatus(target, status);
        // flashfreeze (Frostmind Helm): apply Chill twice per hit (double stack rate)
        if (playerStats.flashfreeze && status === 'chill') {
          applyStatus(target, status);
        }
        log.push({ type: 'status_applied', text: `${status.toUpperCase()} applied to ${target.name}`, status, target: target.name });
      });

      // ashenburst (Crown of Unmaking): apply Burn on crit
      if (isCrit && playerStats.ashenburst) {
        applyStatus(target, 'burn', 3);
        log.push({ type: 'status_applied', text: `ASHENBURST: Burn applied to ${target.name} on crit!`, status: 'burn', target: target.name });
      }

      checkInteractions(target, log, target.name, playerStats);

      // triggerOnHit: 30% chance to fire a bonus shot on every hit
      if (!isEcho && skill.triggerOnHit && Math.random() < 0.30) {
        log.push({ type: 'trigger', text: `TRIGGER: On Hit — ${skill.name} bonus shot!` });
        const bonusTarget = aliveTargets.find(t => t.hp > 0);
        if (bonusTarget) {
          const bonusDmg = calcFinalDamage(skill.damage, skill, playerStats, bonusTarget, false, false);
          bonusTarget.hp = Math.max(0, bonusTarget.hp - bonusDmg);
          log.push({
            type: 'damage',
            text: `${skill.name} [ON HIT] → ${bonusTarget.name}: ${bonusDmg} ${skill.element} damage${bonusTarget.hp <= 0 ? ' [KILLED]' : ` (${bonusTarget.hp}/${bonusTarget.maxHp} HP)`}`,
            damage: bonusDmg, target: bonusTarget.name, skill: skill.name,
            skillId: skill.id, skillElement: skill.element,
            enemyHpAfter: bonusTarget.hp, enemyMaxHp: bonusTarget.maxHp,
            playerHpAfter: player.hp, playerMaxHp: player.maxHp,
          });
        }
      }
    });
  }

  if (!isEcho && skill.echoChance && Math.random() < skill.echoChance) {
    const echoTarget = aliveTargets.find(e => e.hp > 0);
    if (echoTarget) {
      const echoDmg = calcFinalDamage(skill.damage, skill, playerStats, echoTarget, false, false);
      echoTarget.hp = Math.max(0, echoTarget.hp - echoDmg);
      log.push({ type: 'echo', text: `ECHO! ${skill.name} fires again → ${echoTarget.name}: ${echoDmg} damage${echoTarget.hp <= 0 ? ' [KILLED]' : ''}`, damage: echoDmg, skillElement: skill.element, skillId: skill.id, enemyHpAfter: echoTarget.hp, enemyMaxHp: echoTarget.maxHp, playerHpAfter: player.hp, playerMaxHp: player.maxHp });
    }
  }

  // stormbringer: lightning skills chain to 2 additional targets
  if (playerStats.stormbringer && skill.element === 'lightning' && !isEcho) {
    const baseHits = getEffectiveHits(skill, playerStats);
    const mainHitTargets = aliveTargets.slice(0, baseHits);
    const chainTargets = aliveTargets.filter(t => t.hp > 0 && !mainHitTargets.includes(t)).slice(0, 2);
    chainTargets.forEach(ct => {
      const chainDmg = calcFinalDamage(Math.round(skill.damage * 0.5), skill, playerStats, ct, false, false);
      ct.hp = Math.max(0, ct.hp - chainDmg);
      log.push({ type: 'damage', text: `${skill.name} [CHAIN] → ${ct.name}: ${chainDmg} lightning damage [Stormbringer]${ct.hp <= 0 ? ' [KILLED]' : ` (${ct.hp}/${ct.maxHp} HP)`}`, damage: chainDmg, target: ct.name, skillElement: skill.element, skillId: skill.id, enemyHpAfter: ct.hp, enemyMaxHp: ct.maxHp, playerHpAfter: player.hp, playerMaxHp: player.maxHp });
    });
  }

  if (skill.hasTotem) {
    const totemTarget = aliveTargets.find(e => e.hp > 0);
    if (totemTarget) {
      // totem_echo (Totemhands): totem fires at 75% damage instead of 50%
      const totemMult = playerStats.totem_echo ? 0.75 : (skill.totemDamageMultiplier || 0.5);
      const totemDmg = calcFinalDamage(Math.round(skill.damage * totemMult), skill, playerStats, totemTarget, false, false);
      totemTarget.hp = Math.max(0, totemTarget.hp - totemDmg);
      log.push({ type: 'totem', text: `TOTEM fires ${skill.name} → ${totemTarget.name}: ${totemDmg} damage${playerStats.totem_echo ? ' [TOTEM ECHO +75%]' : ''}`, damage: totemDmg, skillElement: skill.element, skillId: skill.id, enemyHpAfter: totemTarget.hp, enemyMaxHp: totemTarget.maxHp, playerHpAfter: player.hp, playerMaxHp: player.maxHp });
    }
  }
}
