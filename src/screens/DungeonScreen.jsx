import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import { runCombat } from '../engine/CombatEngine.js';
import { buildSkillFromSlot } from '../engine/SkillResolver.js';
import { generateDungeonLoot } from '../engine/LootSystem.js';
import dungeonTiers from '../data/dungeonTiers.json';
import monsterTemplates from '../data/monsterTemplates.json';
import { monsterHp, monsterDamage } from '../utils/FormulaHelpers.js';
import './DungeonScreen.css';

const monsterMap = Object.fromEntries(monsterTemplates.map(m => [m.id, m]));

function scaledMonster(monsterId, tier) {
  const base = monsterMap[monsterId];
  if (!base) return null;
  return {
    ...base,
    hp: monsterHp(base.hp, tier),
    maxHp: monsterHp(base.hp, tier),
    attackDamage: monsterDamage(base.attackDamage, tier),
  };
}

export default function DungeonScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { state: playerState, dispatch: playerDispatch, playerStats } = usePlayer();

  const handleEnterDungeon = (tierData) => {
    const skills = playerState.skillSlots
      .map(slot => buildSkillFromSlot(slot))
      .filter(Boolean);

    if (skills.length === 0) {
      alert('You need at least one Skill Rune equipped!');
      return;
    }

    const allEnemies = [];
    tierData.rooms.forEach(room => {
      room.enemies.forEach(mId => {
        const m = scaledMonster(mId, tierData.tier);
        if (m) allEnemies.push(m);
      });
    });

    const result = runCombat(playerStats, skills, allEnemies);

    gameDispatch({ type: 'SET_COMBAT_RESULT', result: result.result, log: result.log });

    if (result.result === 'victory') {
      const loot = generateDungeonLoot(tierData, tierData.rooms, playerStats.luck || 0);
      gameDispatch({ type: 'SET_PENDING_LOOT', loot });
      const nextTier = tierData.tier + 1;
      gameDispatch({ type: 'UNLOCK_TIER', tier: nextTier });

      const xpGain = Math.floor(tierData.rooms.reduce((sum, r) => {
        return sum + r.enemies.reduce((s, mId) => {
          const m = monsterMap[mId];
          return s + (m?.xpReward || 10);
        }, 0);
      }, 0) * (tierData.xpMultiplier || 1));

      playerDispatch({ type: 'ADD_XP', amount: xpGain });
    }

    gameDispatch({ type: 'NAVIGATE', screen: 'battle' });
  };

  return (
    <div className="dungeon-screen">
      <h2 className="screen-title">🗺️ Dungeon</h2>
      <p className="dungeon-subtitle">Select a tier and enter the dungeon</p>

      <div className="tier-list">
        {dungeonTiers.map(tier => {
          const unlocked = gameState.unlockedTiers.includes(tier.tier);
          return (
            <div key={tier.tier} className={`tier-card ${unlocked ? 'unlocked' : 'locked'}`}>
              <div className="tier-header">
                <span className="tier-number">Tier {tier.tier}</span>
                {!unlocked && <span className="lock-icon">🔒</span>}
              </div>
              <div className="tier-name">{tier.name}</div>

              {tier.modifiers.length > 0 && (
                <div className="tier-modifiers">
                  {tier.modifiers.map((mod, i) => (
                    <div key={i} className="modifier-tag">{mod}</div>
                  ))}
                </div>
              )}

              <div className="tier-info">
                <span>Rooms: {tier.rooms.length}</span>
                <span>Loot: ×{tier.lootMultiplier}</span>
                <span>XP: ×{tier.xpMultiplier}</span>
              </div>

              <button
                className="enter-btn"
                onClick={() => unlocked && handleEnterDungeon(tier)}
                disabled={!unlocked}
              >
                {unlocked ? 'Enter Dungeon' : 'Locked'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
