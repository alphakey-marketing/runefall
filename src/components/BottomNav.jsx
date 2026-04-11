import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import './BottomNav.css';

const TABS = [
  { id: 'build', label: 'Build', icon: '⚔️' },
  { id: 'inventory', label: 'Inventory', icon: '🎒' },
  { id: 'dungeon', label: 'Dungeon', icon: '🗺️' },
];

export default function BottomNav() {
  const { state, dispatch } = useGame();
  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${state.currentScreen === tab.id ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'NAVIGATE', screen: tab.id })}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
