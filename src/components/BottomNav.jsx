import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import './BottomNav.css';

const TABS = [
  { id: 'build', label: 'Build', icon: '⚔️' },
  { id: 'inventory', label: 'Bag', icon: '🎒' },
  { id: 'zodiac', label: 'Zodiac', icon: '⭐' },
  { id: 'dungeon', label: 'Dungeon', icon: '🗺️' },
  { id: 'crafting', label: 'Craft', icon: '⚗️' },
  { id: 'simulator', label: 'Sim', icon: '🎯' },
];

export default function BottomNav() {
  const { state, dispatch } = useGame();
  return (
    <nav className="bottom-nav bottom-nav-six">
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
