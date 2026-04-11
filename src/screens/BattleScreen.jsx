import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import CombatLog from '../components/CombatLog.jsx';
import ItemTooltip from '../components/ItemTooltip.jsx';
import './BattleScreen.css';

export default function BattleScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { dispatch: playerDispatch } = usePlayer();
  const canvasRef = useRef(null);
  const [visibleLog, setVisibleLog] = useState([]);
  const [showLoot, setShowLoot] = useState(false);
  const [hoveredLoot, setHoveredLoot] = useState(null);

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

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawBattleScene(ctx, canvas.width, canvas.height, combatResult);
  }, [combatResult]);

  const handlePickupItem = (item) => {
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

function drawBattleScene(ctx, w, h, result) {
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
  drawCharacter(ctx, w * 0.2, h - 50, '#4a9eff', result === 'defeat' ? 0.4 : 1.0, '🧙');

  // Enemy sprite (right side)
  drawCharacter(ctx, w * 0.8, h - 50, '#ff4a4a', result === 'victory' ? 0.2 : 1.0, '💀');

  // VS text in center
  ctx.fillStyle = '#c4a3ff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️', w / 2, h / 2);
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
