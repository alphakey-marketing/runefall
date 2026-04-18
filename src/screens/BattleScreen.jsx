import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import BattleArena from '../components/BattleArena.jsx';
import CombatLog from '../components/CombatLog.jsx';
import ItemTooltip from '../components/ItemTooltip.jsx';
import './BattleScreen.css';

const BAG_SIZE = 20;
const BAG_WARN_THRESHOLD = 16; // show warning at 16/20

export default function BattleScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { state: playerState, dispatch: playerDispatch, playerStats } = usePlayer();
  const [visibleLog, setVisibleLog] = useState([]);
  const [showLoot, setShowLoot] = useState(false);
  const [showDeathScreen, setShowDeathScreen] = useState(false);
  const [hoveredLoot, setHoveredLoot] = useState(null);
  const [bagFullMsg, setBagFullMsg] = useState(false);
  const [showChapterAdvance, setShowChapterAdvance] = useState(false);
  const [showInventorySalvage, setShowInventorySalvage] = useState(false);

  const { combatLog, combatResult, pendingLoot } = gameState;
  const invCount = playerState.inventory.length;
  const bagFull = invCount >= BAG_SIZE;
  const bagNearFull = invCount >= BAG_WARN_THRESHOLD && invCount < BAG_SIZE;

  // Derive initial enemy max HP from the first enriched log entry that carries it
  const initialEnemyMaxHp = useMemo(() => {
    if (!combatLog) return 100;
    for (const entry of combatLog) {
      if (entry?.enemyMaxHp != null) return entry.enemyMaxHp;
    }
    return 100;
  }, [combatLog]);

  // Animate log entries with delay
  useEffect(() => {
    setVisibleLog([]);
    setShowLoot(false);
    setShowDeathScreen(false);
    setShowChapterAdvance(false);
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

    return () => { clearInterval(interval); };
  }, [combatLog, combatResult]);

  const handlePickupItem = (item) => {
    if (!item) return;
    if (bagFull) {
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

  const handleSalvageInvItem = (item) => {
    playerDispatch({ type: 'SALVAGE_ITEM', item });
  };

  const handleReturnToDungeon = () => {
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
      {/* Arena — replaces canvas with animated CSS avatars */}
      <BattleArena
        visibleLog={visibleLog}
        combatResult={combatResult}
        playerMaxHp={playerStats.maxHp || 200}
        enemyMaxHp={initialEnemyMaxHp}
      />

      <div className="battle-result-label">
        {combatResult === 'victory' && <span className="result-victory">⚔️ VICTORY</span>}
        {combatResult === 'defeat' && <span className="result-defeat">💀 DEFEAT</span>}
        {combatResult === 'timeout' && <span className="result-timeout">⏱ TIMEOUT</span>}
      </div>

      {bagFullMsg && <div className="bag-full-toast">🎒 Bag is full ({BAG_SIZE}/{BAG_SIZE})! Salvage an item to make space.</div>}
      {bagNearFull && !bagFullMsg && (
        <div className="bag-warn-toast">⚠️ Bag almost full ({invCount}/{BAG_SIZE})</div>
      )}

      {/* In-battle speed control */}
      <div className="combat-speed-control">
        <label>⚡ Speed</label>
        <div className="battle-speed-btns">
          {[0.5, 1, 2, 3].map(s => (
            <button
              key={s}
              className={`battle-speed-btn${(gameState.combatSpeed || 1) === s ? ' battle-speed-btn-active' : ''}`}
              onClick={() => gameDispatch({ type: 'SET_COMBAT_SPEED', speed: s })}
            >
              {s}×
            </button>
          ))}
        </div>
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
          <div className="loot-panel-header">
            <h3>Loot Drops!</h3>
            <span className="bag-count-badge" style={{ color: bagFull ? '#ff7777' : bagNearFull ? '#ffaa44' : '#888' }}>
              🎒 {invCount}/{BAG_SIZE}
            </span>
          </div>
          {bagFull && (
            <div className="bag-full-inline">
              <div className="bag-full-inline-msg">Bag full — salvage an inventory item to make space</div>
              <button
                className="inv-salvage-toggle"
                onClick={() => setShowInventorySalvage(s => !s)}
              >
                {showInventorySalvage ? '▲ Hide Inventory' : '▼ Show Inventory to Salvage'}
              </button>
              {showInventorySalvage && (
                <div className="inv-salvage-list">
                  {playerState.inventory.length === 0 ? (
                    <div className="inv-salvage-empty">Inventory is empty</div>
                  ) : (
                    playerState.inventory.map(item => (
                      <div key={item.id} className="inv-salvage-row">
                        <span className={`inv-salvage-name rarity-${item.rarity}`}>{item.name}</span>
                        <span className="inv-salvage-gs">GS {item.gearScore}</span>
                        <button
                          className="inv-salvage-btn"
                          onClick={() => handleSalvageInvItem(item)}
                        >
                          Salvage (+{item.rarity === 'unique' ? 50 : item.gearScore + 5}🔮)
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
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
                  <button onClick={() => handlePickupItem(item)} disabled={bagFull}>Pick Up</button>
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

      {/* Chapter advance overlay */}
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
