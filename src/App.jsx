import React from 'react';
import { useGame } from './context/GameContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import BuildScreen from './screens/BuildScreen.jsx';
import InventoryScreen from './screens/InventoryScreen.jsx';
import DungeonScreen from './screens/DungeonScreen.jsx';
import BattleScreen from './screens/BattleScreen.jsx';
import './App.css';

function ScreenRouter() {
  const { state } = useGame();
  switch (state.currentScreen) {
    case 'build': return <BuildScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'dungeon': return <DungeonScreen />;
    case 'battle': return <BattleScreen />;
    default: return <BuildScreen />;
  }
}

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="game-title">RUNEFALL</span>
      </header>
      <main className="app-main">
        <ScreenRouter />
      </main>
      <BottomNav />
    </div>
  );
}
