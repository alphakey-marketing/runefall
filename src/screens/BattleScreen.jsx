import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import CombatLog from '../components/CombatLog.jsx';
import ItemTooltip from '../components/ItemTooltip.jsx';
import './BattleScreen.css';

export default function BattleScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { state: playerState, dispatch: playerDispatch } = usePlayer();
  const canvasRef = useRef(null);
  const [visibleLog, setVisibleLog] = useState([]);
  const [showLoot, setShowLoot] = useState(false);
  const [hoveredLoot, setHoveredLoot] = useState(null);
  const [bagFullMsg, setBagFullMsg] = useState(false);

  const { combatLog, combatResult, pendingLoot } = gameState;

  // Animate log entries with delay
  useEffect(() => {
    setVisibleLog([]);
    setShowLoot(false);
    if (!combatLog || combatLog.length === 0) return;

    let i = 0;
    const interval = setInterval(() => {
      if (i >= combatLog.length) {
        clearInterval(interval);
        if (combatResult === 'victory') {
          setTimeout(() => setShowLoot(true), 500);
        }
        return;
      }
      setVisibleLog(prev => [...prev, combatLog[i]]);
      i++;
    }, 150);

    return () => clearInterval(interval);
  }, [combatLog, combatResult]);

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
    const nextState = { ...playerState, inventory: [...playerState.inventory, item] };
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
    gameDispatch({ type: 'NAVIGATE', screen: 'dungeon' });
    gameDispatch({ type: 'CLEAR_PENDING_LOOT' });
    setShowLoot(false);
  };

  return (
    <div className="battle-screen">
      <canvas ref={canvasRef} width={600} height={180} className="battle-canvas" />

      <div className="battle-result-label">
        {combatResult === 'victory' && <span className="result-victory">⚔️ VICTORY</span>}
        {combatResult === 'defeat' && <span className="result-defeat">💀 DEFEAT</span>}
        {combatResult === 'timeout' && <span className="result-timeout">⏱ TIMEOUT</span>}
      </div>

      {bagFullMsg && <div className="bag-full-toast">🎒 Bag is full! Salvage an item first.</div>}

      <CombatLog entries={visibleLog} />

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

      <button className="return-btn" onClick={handleReturnToDungeon}>
        Return to Dungeon
      </button>
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
