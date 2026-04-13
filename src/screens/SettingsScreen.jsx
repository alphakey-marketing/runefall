import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { usePlayer } from '../context/PlayerContext.jsx';
import { AudioManager } from '../systems/AudioManager.js';
import './SettingsScreen.css';

export default function SettingsScreen() {
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const { dispatch: playerDispatch } = usePlayer();
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleToggleSound = () => {
    gameDispatch({ type: 'TOGGLE_SOUND' });
    AudioManager.setMuted(!gameState.soundEnabled);
  };

  const handleSetSpeed = (speed) => {
    gameDispatch({ type: 'SET_COMBAT_SPEED', speed });
  };

  const handleToggleColorBlind = () => {
    gameDispatch({ type: 'TOGGLE_COLOR_BLIND' });
  };

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    if (window.confirm('Are you sure? This will erase all progress!')) {
      playerDispatch({ type: 'RESET_SAVE' });
      gameDispatch({ type: 'RESET_GAME' });
      setResetConfirm(false);
    } else {
      setResetConfirm(false);
    }
  };

  return (
    <div className="settings-screen">
      <h2 className="screen-title">⚙️ Settings</h2>

      <div className="settings-section">
        <h3 className="settings-section-title">Audio</h3>
        <div className="settings-row">
          <span className="settings-label">Sound Effects</span>
          <button
            className={`toggle-btn ${gameState.soundEnabled ? 'active' : ''}`}
            onClick={handleToggleSound}
          >
            {gameState.soundEnabled ? '🔊 On' : '🔇 Off'}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Combat</h3>
        <div className="settings-row">
          <span className="settings-label">Combat Speed</span>
          <div className="speed-btns">
            {[0.5, 1, 2].map(s => (
              <button
                key={s}
                className={`speed-btn ${gameState.combatSpeed === s ? 'active' : ''}`}
                onClick={() => handleSetSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Accessibility</h3>
        <div className="settings-row">
          <span className="settings-label">Color Blind Mode</span>
          <button
            className={`toggle-btn ${gameState.colorBlindMode ? 'active' : ''}`}
            onClick={handleToggleColorBlind}
          >
            {gameState.colorBlindMode ? '✓ On' : 'Off'}
          </button>
        </div>
      </div>

      <div className="settings-section settings-danger">
        <h3 className="settings-section-title">Data</h3>
        <div className="settings-row">
          <span className="settings-label">Reset All Progress</span>
          <button
            className={`reset-btn ${resetConfirm ? 'confirm' : ''}`}
            onClick={handleReset}
          >
            {resetConfirm ? '⚠️ Confirm Reset' : '🗑️ Reset Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
