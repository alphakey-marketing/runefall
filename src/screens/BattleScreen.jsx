import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import CombatLog from '../components/CombatLog.jsx';
import ItemTooltip from '../components/ItemTooltip.jsx';
import './BattleScreen.css';

export default function BattleScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { state: playerState, dispatch: playerDispatch, playerStats } = usePlayer();
  const canvasRef = useRef(null);
  const [visibleLog, setVisibleLog] = useState([]);
  const [showLoot, setShowLoot] = useState(false);
  const [showDeathScreen, setShowDeathScreen] = useState(false);
  const [hoveredLoot, setHoveredLoot] = useState(null);
  const [bagFullMsg, setBagFullMsg] = useState(false);
  const [showChapterAdvance, setShowChapterAdvance] = useState(false);
  const [battleStats, setBattleStats] = useState({ playerHp: null, playerMaxHp: null, enemyHp: null, enemyMaxHp: null, lastPlayerDamage: null });

  const { combatLog, combatResult, pendingLoot } = gameState;

  // Animate log entries with delay
  useEffect(() => {
    setVisibleLog([]);
    setShowLoot(false);
    setShowDeathScreen(false);
    setShowChapterAdvance(false);
    setBattleStats({ playerHp: null, playerMaxHp: null, enemyHp: null, enemyMaxHp: null, lastPlayerDamage: null });
    if (!combatLog || combatLog.length === 0) return;

    let i = 0;
    const interval = setInterval(() => {
      if (i >= combatLog.length) {
        clearInterval(interval);
        if (combatResult === 'victory') {
          setTimeout(() => setShowLoot(true), 500);
        } else if (combatResult === 'defeat') {
          setTimeout(() => setShowDeathScreen(true), 500);
        }
        return;
      }
      setVisibleLog(prev => [...prev, combatLog[i]]);
      i++;
    }, Math.round(150 / (gameState.combatSpeed || 1)));

    return () => {
      clearInterval(interval);
      // Note: do NOT reset showDeathScreen here — it would clear the overlay before it renders
    };
  }, [combatLog, combatResult]);

  // Track live battle stats from log entries for the HP display bar
  useEffect(() => {
    if (!visibleLog.length) return;
    let pHp = null, pMaxHp = null, eHp = null, eMaxHp = null, lastDmg = null;

    for (let i = visibleLog.length - 1; i >= 0; i--) {
      const entry = visibleLog[i];
      if (!entry) continue;

      if (pHp === null && entry.type === 'enemy_attack') {
        const m = entry.text?.match(/\((\d+)\/(\d+) HP\)/);
        if (m) { pHp = parseInt(m[1]); pMaxHp = parseInt(m[2]); }
      }

      if (eHp === null && (entry.type === 'damage' || entry.type === 'crit' || entry.type === 'echo' || entry.type === 'totem')) {
        const m = entry.text?.match(/\((\d+)\/(\d+) HP\)/);
        if (m) { eHp = parseInt(m[1]); eMaxHp = parseInt(m[2]); }
        if (lastDmg === null && entry.damage) lastDmg = entry.damage;
      }

      if (pHp !== null && eHp !== null && lastDmg !== null) break;
    }

    setBattleStats(prev => ({
      playerHp: pHp ?? prev.playerHp,
      playerMaxHp: pMaxHp ?? prev.playerMaxHp,
      enemyHp: combatResult === 'victory' ? 0 : (eHp ?? prev.enemyHp),
      enemyMaxHp: eMaxHp ?? prev.enemyMaxHp,
      lastPlayerDamage: lastDmg ?? prev.lastPlayerDamage,
    }));
  }, [visibleLog, combatResult]);

  // Canvas drawing — redraws on each new log entry to reflect live HP changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Derive HP ratios from the most recent relevant log entries
    let playerHpRatio = 1;
    let enemyHpRatio = 1;
    let flashPlayer = false;
    let flashEnemy = false;

    for (let i = visibleLog.length - 1; i >= 0; i--) {
      const entry = visibleLog[i];
      if (!entry) continue;
      if (!flashEnemy && (entry.type === 'damage' || entry.type === 'crit' || entry.type === 'echo' || entry.type === 'totem' || entry.type === 'cull' || entry.type === 'status')) {
        // Parse HP from text like "(42/150 HP)" or set 0 if "[KILLED]"
        const hpMatch = entry.text?.match(/\((\d+)\/(\d+) HP\)/);
        if (hpMatch) {
          enemyHpRatio = parseInt(hpMatch[1]) / parseInt(hpMatch[2]);
        } else if (entry.text?.includes('[KILLED]') || entry.text?.includes('CULLS')) {
          enemyHpRatio = 0;
        }
        flashEnemy = true;
      }
      if (!flashPlayer && entry.type === 'enemy_attack') {
        const hpMatch = entry.text?.match(/\((\d+)\/(\d+) HP\)/);
        if (hpMatch) {
          playerHpRatio = parseInt(hpMatch[1]) / parseInt(hpMatch[2]);
        }
        flashPlayer = true;
      }
      if (flashEnemy && flashPlayer) break;
    }

    // Override ratios on final result
    if (combatResult === 'defeat') playerHpRatio = 0;
    if (combatResult === 'victory') enemyHpRatio = 0;

    drawBattleScene(ctx, canvas.width, canvas.height, combatResult, playerHpRatio, enemyHpRatio);
  }, [visibleLog.length, combatResult]);

  const handlePickupItem = (item) => {
    if (playerState.inventory.length >= 20) {
      setBagFullMsg(true);
      setTimeout(() => setBagFullMsg(false), 2500);
      return;
    }
    playerDispatch({ type: 'ADD_TO_INVENTORY', item });
    gameDispatch({ type: 'SET_PENDING_LOOT', loot: pendingLoot.filter(i => i.id !== item.id) });
  };

  const handleSalvageItem = (item) => {
    playerDispatch({ type: 'SALVAGE_ITEM', item });
    gameDispatch({ type: 'SET_PENDING_LOOT', loot: pendingLoot.filter(i => i.id !== item.id) });
  };

  const handleReturnToDungeon = () => {
    // If a chapter was just completed, show the advance screen first (Issue 6)
    if (gameState.lastCompletedTier && !showChapterAdvance) {
      setShowChapterAdvance(true);
      return;
    }
    gameDispatch({ type: 'RESET_COMBAT' });
    gameDispatch({ type: 'NAVIGATE', screen: 'dungeon' });
    gameDispatch({ type: 'CLEAR_PENDING_LOOT' });
    setShowLoot(false);
    setShowDeathScreen(false);
    setShowChapterAdvance(false);
  };

  // No combat data edge case
  if (combatResult === null && (!combatLog || combatLog.length === 0)) {
    return (
      <div className="battle-screen">
        <div className="no-combat-msg">
          <p>No combat data — return to dungeon</p>
          <button className="return-btn" onClick={handleReturnToDungeon}>Return to Dungeon</button>
        </div>
      </div>
    );
  }

  return (
    <div className="battle-screen">
      {/* HP + damage stats bar (Issue 4) */}
      <div className="battle-stats-bar">
        <span className="bs-player">
          🧙 {battleStats.playerHp ?? playerStats.maxHp}/{battleStats.playerMaxHp ?? playerStats.maxHp} HP
        </span>
        {battleStats.lastPlayerDamage && (
          <span className="bs-damage">⚔️ {battleStats.lastPlayerDamage}</span>
        )}
        <span className="bs-enemy">
          💀 {battleStats.enemyHp != null ? battleStats.enemyHp : '?'}/{battleStats.enemyMaxHp != null ? battleStats.enemyMaxHp : '?'} HP
        </span>
      </div>

      <canvas ref={canvasRef} width={600} height={180} className="battle-canvas" />

      <div className="battle-result-label">
        {combatResult === 'victory' && <span className="result-victory">⚔️ VICTORY</span>}
        {combatResult === 'defeat' && <span className="result-defeat">💀 DEFEAT</span>}
        {combatResult === 'timeout' && <span className="result-timeout">⏱ TIMEOUT</span>}
      </div>

      {bagFullMsg && <div className="bag-full-toast">🎒 Bag is full! Salvage an item first.</div>}

      <div className="combat-speed-indicator">
        Combat Speed: {gameState.combatSpeed || 1}×
        <span className="speed-tip">(Change in Settings)</span>
      </div>

      <CombatLog entries={visibleLog} />

      {showDeathScreen && (
        <div className="death-overlay">
          <span className="death-skull">💀</span>
          <div className="death-title">YOU HAVE FALLEN</div>
          <div className="death-msg">Your journey ends here... for now.</div>
          <button className="return-btn" onClick={handleReturnToDungeon}>Return to Dungeon</button>
        </div>
      )}

      {showLoot && pendingLoot.length === 0 && (
        <div className="no-loot-msg">Nothing dropped this run.</div>
      )}

      {showLoot && pendingLoot.length > 0 && (
        <div className="loot-panel">
          <h3>Loot Drops!</h3>
          <div className="loot-grid">
            {pendingLoot.map(item => (
              <div
                key={item.id}
                className="loot-item"
                onMouseEnter={() => setHoveredLoot(item)}
                onMouseLeave={() => setHoveredLoot(null)}
              >
                <div className={`loot-name rarity-${item.rarity}`}>{item.name}</div>
                <div className="loot-gs">GS: {item.gearScore}</div>
                <div className="loot-actions">
                  <button onClick={() => handlePickupItem(item)}>Pick Up</button>
                  <button onClick={() => handleSalvageItem(item)}>Salvage</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hoveredLoot && (
        <div className="tooltip-float">
          <ItemTooltip item={hoveredLoot} />
        </div>
      )}

      {/* Chapter advance overlay (Issue 6) — only shown when player clicks Return after a chapter-final tier */}
      {showChapterAdvance && (
        <div className="chapter-advance-overlay">
          <div className="chapter-advance-icon">
            {gameState.lastCompletedChapter === 1 ? '🔥' : '🏆'}
          </div>
          <div className="chapter-advance-title">
            Chapter {gameState.lastCompletedChapter} Complete!
          </div>
          <div className="chapter-advance-sub">
            {gameState.lastCompletedChapter === 1
              ? 'You have conquered the Runefall. Chapter 2: Abyssal Throne now awaits...'
              : 'You have defeated the ultimate challenge. The Runebreaker is no more.'}
          </div>
          {gameState.lastCompletedChapter === 1 && (
            <div className="chapter-advance-unlock">🔓 Chapter 2 Unlocked — Tiers 21–40</div>
          )}
          <button className="chapter-advance-btn" onClick={() => {
            gameDispatch({ type: 'RESET_COMBAT' });
            gameDispatch({ type: 'NAVIGATE', screen: 'dungeon' });
            gameDispatch({ type: 'CLEAR_PENDING_LOOT' });
            setShowChapterAdvance(false);
          }}>
            ⚔️ Continue to Dungeon
          </button>
        </div>
      )}

      {!showDeathScreen && !showChapterAdvance && (
        <button className="return-btn" onClick={handleReturnToDungeon}>
          Return to Dungeon
        </button>
      )}
    </div>
  );
}

function drawBattleScene(ctx, w, h, result, playerHpRatio = 1, enemyHpRatio = 1) {
  ctx.clearRect(0, 0, w, h);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0d0d1a');
  bg.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Ground
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(0, h - 30, w, 30);

  // Player sprite (left side)
  const playerOpacity = result === 'defeat' ? 0.4 : Math.max(0.2, playerHpRatio);
  drawCharacter(ctx, w * 0.2, h - 50, '#4a9eff', playerOpacity, '🧙');
  drawHpBar(ctx, w * 0.2, h - 80, 80, playerHpRatio, '#4a9eff');

  // Enemy sprite (right side)
  const enemyOpacity = result === 'victory' ? 0.2 : Math.max(0.2, enemyHpRatio);
  drawCharacter(ctx, w * 0.8, h - 50, '#ff4a4a', enemyOpacity, '💀');
  drawHpBar(ctx, w * 0.8, h - 80, 80, enemyHpRatio, '#ff4a4a');

  // VS text in center
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#c4a3ff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️', w / 2, h / 2);
}

function drawHpBar(ctx, cx, y, barWidth, ratio, color) {
  const x = cx - barWidth / 2;
  const barH = 6;
  ctx.globalAlpha = 0.8;
  // Background
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, barWidth, barH);
  // Fill
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, barWidth * Math.min(1, ratio)), barH);
  ctx.globalAlpha = 1;
}

function drawCharacter(ctx, x, y, color, opacity, emoji) {
  ctx.globalAlpha = opacity;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 20, 22, 0, Math.PI * 2);
  ctx.fill();

  // Emoji
  ctx.globalAlpha = opacity;
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText(emoji, x, y - 10);

  ctx.globalAlpha = 1;
}
