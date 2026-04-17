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
  // Persist collapse state so it survives navigation back from battle
  const [ch1Collapsed, setCh1Collapsed] = useState(
    () => localStorage.getItem('dungeon_ch1_collapsed') === 'true'
  );
  const [ch2Collapsed, setCh2Collapsed] = useState(
    () => localStorage.getItem('dungeon_ch2_collapsed') === 'true'
  );

  const toggleCh1 = () => {
    const next = !ch1Collapsed;
    setCh1Collapsed(next);
    localStorage.setItem('dungeon_ch1_collapsed', String(next));
  };
  const toggleCh2 = () => {
    const next = !ch2Collapsed;
    setCh2Collapsed(next);
    localStorage.setItem('dungeon_ch2_collapsed', String(next));
  };

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
    let totalTicks = 0;
    let totalEnemiesSlain = 0;

    for (const room of tierData.rooms) {
      const enemies = room.enemies
        .map(mId => scaledMonster(mId, tierData.tier))
        .filter(Boolean);

      if (enemies.length === 0) continue;

      const roomResult = runCombat(playerStats, skills, enemies, playerHpRemaining);
      combinedLog = [...combinedLog, ...roomResult.log];
      playerHpRemaining = roomResult.playerHpRemaining ?? 0;
      totalTicks += roomResult.ticks || 0;

      if (roomResult.result !== 'victory') {
        finalResult = roomResult.result;
        break;
      }

      totalEnemiesSlain += enemies.length;
      combinedLog.push({ type: 'room_clear', text: `— Room cleared! HP remaining: ${Math.ceil(playerHpRemaining)} —` });
    }

    // Derive stats from log for records and challenges
    let biggestHit = 0;
    let playerTookDamage = false;
    combinedLog.forEach(entry => {
      if (entry?.damage && entry.damage > biggestHit) biggestHit = entry.damage;
      if (entry?.type === 'enemy_attack' && entry.damage > 0) playerTookDamage = true;
    });

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

      // ── Update records ──────────────────────────────────────────────────────
      playerDispatch({
        type: 'UPDATE_RECORDS',
        highestTier: tierData.tier,
        mostDamageHit: biggestHit,
        fastestClear: totalTicks,
        totalEnemiesSlain,
        favouriteSkillRune: skills[0]?.name ?? null,
      });

      // ── Evaluate and complete challenges ────────────────────────────────────
      const cc = playerState.completedChallenges;
      const equippedGearSlots = Object.values(playerState.equippedGear).filter(Boolean);
      const equippedSkills = playerState.skillSlots.filter(s => s.skillRune);
      const allSkillElements = [...new Set(equippedSkills.map(s => s.skillRune?.element).filter(Boolean))];
      const activeLinks = equippedSkills.reduce((acc, s) => acc + (s.links?.filter(Boolean).length || 0), 0);
      const maxLinksOnOneSkill = Math.max(0, ...equippedSkills.map(s => s.links?.filter(Boolean).length || 0));
      const hasHpGearAffix = equippedGearSlots.some(g =>
        g.affixes?.some(a => typeof a === 'string' ? a.toLowerCase().includes('hp') : (a.stat || '').toLowerCase().includes('hp'))
      );

      const completeIfNew = (id) => {
        if (!cc.includes(id)) playerDispatch({ type: 'COMPLETE_CHALLENGE', challengeId: id });
      };
      const updateProgress = (id, amount) => {
        // Auto-complete is now handled inside the reducer — no stale check here
        playerDispatch({ type: 'UPDATE_CHALLENGE_PROGRESS', challengeId: id, amount });
      };

      // id 1: First Blood — clear any dungeon
      completeIfNew(1);

      // id 2: Glass Cannon — clear Tier 3 with 0 HP gear affixes
      if (tierData.tier >= 3 && !hasHpGearAffix) completeIfNew(2);

      // id 3: Mono-Element — clear Tier 5 using only Fire skills
      if (tierData.tier >= 5 && allSkillElements.length === 1 && allSkillElements[0] === 'fire') completeIfNew(3);

      // id 4: The Untouchable — clear a dungeon without taking damage
      if (!playerTookDamage) completeIfNew(4);

      // id 5: Speed Runner — clear Tier 5 in under 30 ticks
      if (tierData.tier >= 5 && totalTicks < 30) completeIfNew(5);

      // id 8: One Rune Army — clear Tier 8 with only 1 skill rune
      if (tierData.tier >= 8 && equippedSkills.length === 1) completeIfNew(8);

      // id 10: True Ascendant — clear Tier 10 post-ascendancy
      if (tierData.tier >= 10 && playerState.ascendancy) completeIfNew(10);

      // id 11: Dungeon Diver — complete 10 dungeons total (track progress)
      updateProgress(11, 1);

      // id 13: Iron Will — clear Tier 5 without any gear
      if (tierData.tier >= 5 && equippedGearSlots.length === 0) completeIfNew(13);

      // id 14: Elemental Master — 5 different elements simultaneously
      if (allSkillElements.length >= 5) completeIfNew(14);

      // id 20: Tier 5 Conqueror — clear Tier 5
      if (tierData.tier >= 5) completeIfNew(20);

      // id 21: Tier 10 Conqueror — clear Tier 10
      if (tierData.tier >= 10) completeIfNew(21);

      // id 22: Mana Efficient — clear dungeon with 50+ mana remaining
      // Heuristic: no `no_mana` entries fired, meaning mana was never exhausted during the run.
      const hadNoMana = combinedLog.some(e => e?.type === 'no_mana');
      if (!hadNoMana) completeIfNew(22);

      // id 25: Survivalist — clear Tier 8 with >150 HP remaining
      if (tierData.tier >= 8 && playerHpRemaining > 150) completeIfNew(25);

      // id 26: Multi-Linker — equip 4 link runes on a single skill
      if (maxLinksOnOneSkill >= 4) completeIfNew(26);

      // id 28: No Mercy — clear Tier 7 without any status effects active (no status_applied entries from player side)
      if (tierData.tier >= 7 && !combinedLog.some(e => e?.type === 'status_applied')) completeIfNew(28);

      // id 30: Runefall Master — clear Tier 20 with all 5 slots filled
      if (tierData.tier >= 20 && equippedSkills.length >= 5) completeIfNew(30);

      // ── Recurring stat challenges (check thresholds) ────────────────────────
      // id 12: Rune Hoarder — accumulate 1000 Rune Dust (check current amount)
      if (playerState.runeDust >= 1000) completeIfNew(12);

      // id 15: Zodiac Scholar — allocate 10 zodiac nodes
      if (playerState.allocatedNodes.filter(n => n !== 'origin').length >= 10) completeIfNew(15);

      // id 29: Dual Ascendant — reach Level 20
      if (playerState.level >= 20) completeIfNew(29);
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
          <button
            className="chapter-header ch1-header chapter-toggle"
            onClick={toggleCh1}
            aria-expanded={!ch1Collapsed}
          >
            <span className="chapter-icon">⚔️</span>
            <span className="chapter-title">Chapter 1: The Runefall</span>
            <span className="chapter-range">Tiers 1–20</span>
            <span className="chapter-collapse-icon">{ch1Collapsed ? '▶' : '▼'}</span>
          </button>
          {!ch1Collapsed && (
            <div className="tier-list">
              {ch1Tiers.map(renderTierCard)}
            </div>
          )}

          {/* Chapter 2 — shown once at least one tier 21+ is unlocked */}
          {ch2Unlocked && (
            <>
              <button
                className="chapter-header ch2-header chapter-toggle"
                onClick={toggleCh2}
                aria-expanded={!ch2Collapsed}
              >
                <span className="chapter-icon">🔥</span>
                <span className="chapter-title">Chapter 2: Abyssal Throne</span>
                <span className="chapter-range">Tiers 21–40</span>
                <span className="chapter-collapse-icon">{ch2Collapsed ? '▶' : '▼'}</span>
              </button>
              {!ch2Collapsed && (
                <div className="tier-list">
                  {ch2Tiers.map(renderTierCard)}
                </div>
              )}
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
