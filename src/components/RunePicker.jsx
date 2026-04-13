import React from 'react';
import './RunePicker.css';

export default function RunePicker({ runes, lockedRunes = [], onSelect, onClose, title = 'Select Rune' }) {
  return (
    <div className="rune-picker-overlay" onClick={onClose}>
      <div className="rune-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="rune-picker-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="rune-picker-list">
          {runes.length === 0 && lockedRunes.length === 0 && <p className="no-runes">No runes available</p>}
          {runes.map(rune => (
            <div key={rune.id} className="rune-item" onClick={() => { onSelect(rune); onClose(); }}>
              <div className="rune-name">{rune.name}</div>
              <div className="rune-desc">{rune.description}</div>
              {rune.baseDamage && (
                <div className="rune-stats">
                  DMG: {rune.baseDamage} | Mana: {rune.baseManaCost} | CD: {rune.baseCooldown}s
                </div>
              )}
              {rune.effect && (
                <div className="rune-stats">Effect: {rune.effect} ({rune.value})</div>
              )}
            </div>
          ))}
          {lockedRunes.map(rune => (
            <div key={rune.id} className="rune-item rune-locked">
              <div className="rune-name">{rune.name}</div>
              <div className="rune-desc">{rune.description}</div>
              <div className="rune-unlock-label">🔒 Unlocks at Lv. {rune.unlockLevel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
