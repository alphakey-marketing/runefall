import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import { runCombat } from '../engine/CombatEngine.js';
import { buildSkillFromSlot } from '../engine/SkillResolver.js';
import { generateDungeonLoot } from '../engine/LootSystem.js';
import dungeonTiers from '../data/dungeonTiers.json';
import monsterTemplates from '../data/monsterTemplates.json';
import challengesData from '../data/challenges.json';
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

function ChallengesTab({ challenges, completedChallenges }) {
  return (
    <div className="challenges-list">
      {challengesData.map(ch => {
        const prog = challenges.find(c => c.id === ch.id);
        const isCompleted = completedChallenges.includes(ch.id);
        const progress = prog?.progress || 0;
        const pct = Math.min(100, Math.round((progress / ch.target) * 100));
        return (
          <div key={ch.id} className={`challenge-card ${isCompleted ? 'completed' : ''}`}>
            <div className="challenge-header">
              <span className="challenge-name">{isCompleted ? '✓ ' : ''}{ch.name}</span>
              <span className="challenge-reward">+{ch.reward} dust</span>
            </div>
            <div className="challenge-desc">{ch.description}</div>
            {!isCompleted && (
              <div className="challenge-progress-bar">
                <div className="challenge-progress-fill" style={{ width: `${pct}%` }} />
                <span className="challenge-progress-text">{progress}/{ch.target}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecordsTab({ records }) {
  return (
    <div className="records-list">
      <div className="record-row"><span>Highest Tier Cleared</span><strong>Tier {records.highestTier}</strong></div>
      <div className="record-row"><span>Biggest Single Hit</span><strong>{records.mostDamageHit}</strong></div>
      <div className="record-row"><span>Fastest Clear (ticks)</span><strong>{records.fastestClear ?? '—'}</strong></div>
      <div className="record-row"><span>Total Enemies Slain</span><strong>{records.totalEnemiesSlain}</strong></div>
      <div className="record-row"><span>Total Rune Dust Spent</span><strong>{records.totalRuneDustSpent}</strong></div>
      <div className="record-row"><span>Favourite Skill</span><strong>{records.favouriteSkillRune ?? '—'}</strong></div>
    </div>
  );
}

export default function DungeonScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { state: playerState, dispatch: playerDispatch, playerStats } = usePlayer();
  const [activeTab, setActiveTab] = useState('tiers');

  const handleEnterDungeon = (tierData) => {
    const skills = playerState.skillSlots
      .map(slot => buildSkillFromSlot(slot))
      .filter(Boolean);

    if (skills.length === 0) {
      alert('You need at least one Skill Rune equipped!');
      return;
    }

    gameDispatch({ type: 'RESET_COMBAT' });
    gameDispatch({ type: 'SET_CURRENT_TIER', tier: tierData.tier });

    let combinedLog = [];
    let playerHpRemaining = playerStats.maxHp || 200;
    let finalResult = 'victory';

    for (const room of tierData.rooms) {
      const enemies = room.enemies
        .map(mId => scaledMonster(mId, tierData.tier))
        .filter(Boolean);

      if (enemies.length === 0) continue;

      const roomResult = runCombat(playerStats, skills, enemies, playerHpRemaining);
      combinedLog = [...combinedLog, ...roomResult.log];
      playerHpRemaining = roomResult.playerHpRemaining ?? 0;

      if (roomResult.result !== 'victory') {
        finalResult = roomResult.result;
        break;
      }

      combinedLog.push({ type: 'room_clear', text: `— Room cleared! HP remaining: ${Math.ceil(playerHpRemaining)} —` });
    }

    gameDispatch({ type: 'SET_COMBAT_RESULT', result: finalResult, log: combinedLog });

    if (finalResult === 'victory') {
      const loot = generateDungeonLoot(tierData, tierData.rooms, playerStats.luck || 0);
      gameDispatch({ type: 'SET_PENDING_LOOT', loot });
      const nextTier = tierData.tier + 1;
      gameDispatch({ type: 'UNLOCK_TIER', tier: nextTier });

      // Track chapter completion for chapter-advance screen
      const chapterFinalTiers = { 1: 20, 2: 40 };
      if (chapterFinalTiers[tierData.chapter] === tierData.tier) {
        gameDispatch({ type: 'SET_LAST_COMPLETED_TIER', tier: tierData.tier, chapter: tierData.chapter });
      }

      const xpGain = Math.floor(tierData.rooms.reduce((sum, r) => {
        return sum + r.enemies.reduce((s, mId) => {
          const m = monsterMap[mId];
          return s + (m?.xpReward || 10);
        }, 0);
      }, 0) * (tierData.xpMultiplier || 1));

      playerDispatch({ type: 'ADD_XP', amount: xpGain });

      // Tutorial completion
      if (tierData.isTutorial && !playerState.tutorialComplete) {
        playerDispatch({ type: 'SET_TUTORIAL_COMPLETE' });
        playerDispatch({ type: 'ADD_RUNE_DUST', amount: 100 });
      }

      // Complete "First Blood" challenge
      if (!playerState.completedChallenges.includes(1)) {
        playerDispatch({ type: 'COMPLETE_CHALLENGE', challengeId: 1 });
      }

      // Update records
      playerDispatch({ type: 'UPDATE_RECORDS', highestTier: tierData.tier });
    }

    gameDispatch({ type: 'NAVIGATE', screen: 'battle' });
  };

  const tabs = [
    { id: 'tiers', label: '🗺️ Tiers' },
    { id: 'challenges', label: '🏆 Challenges' },
    { id: 'records', label: '📊 Records' },
  ];

  // Group tiers by chapter
  const ch1Tiers = dungeonTiers.filter(t => t.chapter === 1 || !t.chapter);
  const ch2Tiers = dungeonTiers.filter(t => t.chapter === 2);
  const ch2Unlocked = ch2Tiers.some(t => gameState.unlockedTiers.includes(t.tier));

  const renderTierCard = (tier) => {
    const unlocked = gameState.unlockedTiers.includes(tier.tier);
    return (
      <div key={tier.tier} className={`tier-card ${unlocked ? 'unlocked' : 'locked'} ${tier.isTutorial ? 'tutorial' : ''} ${tier.chapter === 2 ? 'ch2' : ''}`}>
        <div className="tier-header">
          <span className="tier-number">{tier.isTutorial ? '⭐ Tutorial' : `Tier ${tier.tier}`}</span>
          {!unlocked && <span className="lock-icon">🔒</span>}
          {tier.isTutorial && unlocked && playerState.tutorialComplete && <span className="tutorial-done">✓</span>}
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
          {unlocked ? (tier.isTutorial ? 'Enter Tutorial' : 'Enter Dungeon') : 'Locked'}
        </button>
      </div>
    );
  };

  return (
    <div className="dungeon-screen">
      <h2 className="screen-title">🗺️ Dungeon</h2>

      <div className="dungeon-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`dungeon-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'tiers' && (
        <>
          <p className="dungeon-subtitle">Select a tier and enter the dungeon</p>

          {/* Chapter 1 */}
          <div className="chapter-header ch1-header">
            <span className="chapter-icon">⚔️</span>
            <span className="chapter-title">Chapter 1: The Runefall</span>
            <span className="chapter-range">Tiers 1–20</span>
          </div>
          <div className="tier-list">
            {ch1Tiers.map(renderTierCard)}
          </div>

          {/* Chapter 2 — shown once at least one tier 21+ is unlocked */}
          {ch2Unlocked && (
            <>
              <div className="chapter-header ch2-header">
                <span className="chapter-icon">🔥</span>
                <span className="chapter-title">Chapter 2: Abyssal Throne</span>
                <span className="chapter-range">Tiers 21–40</span>
              </div>
              <div className="tier-list">
                {ch2Tiers.map(renderTierCard)}
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'challenges' && (
        <ChallengesTab
          challenges={playerState.challenges}
          completedChallenges={playerState.completedChallenges}
        />
      )}

      {activeTab === 'records' && (
        <RecordsTab records={playerState.records} />
      )}
    </div>
  );
}
