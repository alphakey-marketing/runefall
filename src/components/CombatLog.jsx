import React, { useEffect, useRef } from 'react';
import './CombatLog.css';

const TYPE_COLOR = {
  damage:         '#e8e8e8',
  crit:           '#ffd700',
  enemy_attack:   '#ff8888',
  echo:           '#cc88ff',
  totem:          '#88ccff',
  cull:           '#ff5500',
  status_applied: '#88ffcc',
  trigger:        '#ffcc44',
  no_mana:        '#888888',
  frozen:         '#aaddff',
  defeated:       '#ff6666',
  victory:        '#00ff88',
  defeat:         '#ff4444',
  start:          '#888888',
  room_clear:     '#c4a3ff',
};

const MAX_VISIBLE = 80;

export default function CombatLog({ entries = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const visibleEntries = entries.slice(-MAX_VISIBLE);
  const hasHidden = entries.length > MAX_VISIBLE;

  return (
    <div className="combat-log">
      {hasHidden && (
        <div className="log-phase-sep">── (older entries hidden) ──</div>
      )}
      {visibleEntries.map((entry, i) => entry ? (
        <React.Fragment key={entries.length - MAX_VISIBLE + i}>
          {i > 0 && i % 10 === 0 && (
            <div className="log-phase-sep">── Round {Math.floor(i / 10) + 1} ──</div>
          )}
          <div
            className={`log-entry log-entry-${entry.type}`}
            style={{ color: TYPE_COLOR[entry.type] || '#ccc' }}
          >
            <span className="log-text">{entry.text}</span>
            {entry.isCrit && <span className="log-crit-badge">CRIT</span>}
          </div>
        </React.Fragment>
      ) : null)}
      <div ref={bottomRef} />
    </div>
  );
}
