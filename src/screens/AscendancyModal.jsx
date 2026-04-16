import React from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import './AscendancyModal.css';

const PATHS = [
  {
    id: 'runebound',
    name: 'Runebound',
    icon: '📜',
    description: 'Master of rune craft. Each skill gains +1 base hit, increasing your attack volume dramatically.',
    bonus: '+1 Hit per skill, enhanced multi-hit potential',
    color: '#c4a3ff',
  },
  {
    id: 'hexblade',
    name: 'Hexblade',
    icon: '🗡️',
    description: 'A dark warrior who channels chaos through melee. Melee skills deal +30% chaos damage.',
    bonus: 'Melee +30% Chaos Damage',
    color: '#cc44ff',
  },
  {
    id: 'stormbringer',
    name: 'Stormbringer',
    icon: '⚡',
    description: 'Command the storm. Lightning skills chain to 2 additional targets.',
    bonus: 'Lightning skills chain ×2 extra targets',
    color: '#ffe033',
  },
];

export default function AscendancyModal() {
  const { state, dispatch } = usePlayer();

  if (state.level < 15 || state.ascendancy !== null) return null;

  const handleChoose = (pathId) => {
    dispatch({ type: 'SET_ASCENDANCY', path: pathId });
  };

  return (
    <div className="ascendancy-overlay">
      <div className="ascendancy-modal">
        <h2 className="ascendancy-title">⚔️ Choose Your Ascendancy</h2>
        <p className="ascendancy-subtitle">You have reached Level 15. Choose a path — this cannot be undone.</p>
        <div className="ascendancy-paths">
          {PATHS.map(path => (
            <div key={path.id} className="ascendancy-card" style={{ '--path-color': path.color }}>
              <div className="ascendancy-icon">{path.icon}</div>
              <div className="ascendancy-name">{path.name}</div>
              <div className="ascendancy-desc">{path.description}</div>
              <div className="ascendancy-bonus">✦ {path.bonus}</div>
              <button
                className="ascendancy-choose-btn"
                onClick={() => handleChoose(path.id)}
              >
                Choose {path.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
