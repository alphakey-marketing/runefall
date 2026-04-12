import React from 'react';
import { useGame } from './context/GameContext.jsx';
import { usePlayer } from './context/PlayerContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import BuildScreen from './screens/BuildScreen.jsx';
import InventoryScreen from './screens/InventoryScreen.jsx';
import DungeonScreen from './screens/DungeonScreen.jsx';
import BattleScreen from './screens/BattleScreen.jsx';
import ZodiacScreen from './screens/ZodiacScreen.jsx';
import CraftingScreen from './screens/CraftingScreen.jsx';
import SimulatorScreen from './screens/SimulatorScreen.jsx';
import './App.css';

function ScreenRouter() {
  const { state } = useGame();
  switch (state.currentScreen) {
    case 'build': return <BuildScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'dungeon': return <DungeonScreen />;
    case 'battle': return <BattleScreen />;
    case 'zodiac': return <ZodiacScreen />;
    case 'crafting': return <CraftingScreen />;
    case 'simulator': return <SimulatorScreen />;
    default: return <BuildScreen />;
  }
}

function XPBar({ xp, level }) {
  const xpReq = Math.floor(100 * Math.pow(level, 1.5));
  const pct = Math.min(100, Math.round((xp / xpReq) * 100));
  return (
    <div className="xp-bar-wrapper" title={`${xp} / ${xpReq} XP`}>
      <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function App() {
  const { state: gameState } = useGame();
  const { state: playerState } = usePlayer();

  return (
    <div className="app">
      <header className="app-header">
        <span className="game-title">RUNEFALL</span>
        <div className="header-stats">
          <span className="header-level">Lv.{playerState.level}</span>
          <XPBar xp={playerState.xp} level={playerState.level} />
          <span className="header-dust">🔮 {playerState.runeDust}</span>
        </div>
      </header>
      <main className="app-main">
        <ScreenRouter />
      </main>
      {gameState.currentScreen !== 'battle' && <BottomNav />}
    </div>
  );
}
