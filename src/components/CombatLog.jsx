import React, { useEffect, useRef } from 'react';
import './CombatLog.css';

function getLogClass(entry) {
  if (!entry) return 'log-normal';
  switch (entry.type) {
    case 'crit': return 'log-crit';
    case 'kill': return 'log-kill';
    case 'defeat': return 'log-defeat';
    case 'victory': return 'log-victory';
    case 'room_clear': return 'log-room-clear';
    case 'status_applied': return 'log-status';
    case 'enemy_attack': return 'log-enemy';
    case 'echo': return 'log-echo';
    case 'totem': return 'log-totem';
    case 'no_mana': return 'log-no-mana';
    default: return 'log-normal';
  }
}

export default function CombatLog({ entries = [] }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="combat-log">
      {entries.map((entry, i) => entry ? (
        <div key={i} className={`log-entry ${getLogClass(entry)}`}>
          {entry.text}
        </div>
      ) : null)}
      <div ref={bottomRef} />
    </div>
  );
}
