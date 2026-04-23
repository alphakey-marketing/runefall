import React, { useEffect, useRef, useState } from 'react';
import './BattleArena.css';

// Unique visual identity per skill id — emoji shown in arena center during player attack
const SKILL_VISUAL_MAP = {
  frost_arrow:     { emoji: '🏹', fxClass: 'skill-fx-ice',       label: 'Frost Arrow' },
  fireball:        { emoji: '🔥', fxClass: 'skill-fx-fire',      label: 'Fireball' },
  ground_slash:    { emoji: '⚔️', fxClass: 'skill-fx-physical',  label: 'Ground Slash' },
  chain_lightning: { emoji: '⚡', fxClass: 'skill-fx-lightning',  label: 'Chain Lightning' },
  bone_spear:      { emoji: '🗡️', fxClass: 'skill-fx-physical',  label: 'Bone Spear' },
  poison_nova:     { emoji: '☠️', fxClass: 'skill-fx-poison',    label: 'Poison Nova' },
  shadow_step:     { emoji: '👤', fxClass: 'skill-fx-physical',  label: 'Shadow Step' },
  frozen_orb:      { emoji: '🔮', fxClass: 'skill-fx-ice',       label: 'Frozen Orb' },
  chaos_bolt:      { emoji: '🌀', fxClass: 'skill-fx-chaos',     label: 'Chaos Bolt' },
  smoke_bomb:      { emoji: '💨', fxClass: 'skill-fx-physical',  label: 'Smoke Bomb' },
  summon_wraith:   { emoji: '👻', fxClass: 'skill-fx-chaos',     label: 'Summon Wraith' },
  venom_strike:    { emoji: '🐍', fxClass: 'skill-fx-poison',    label: 'Venom Strike' },
};

// Fallback FX class by element when skillId is not in the map
const ELEMENT_FX_CLASS = {
  fire:      'skill-fx-fire',
  ice:       'skill-fx-ice',
  lightning: 'skill-fx-lightning',
  physical:  'skill-fx-physical',
  poison:    'skill-fx-poison',
  chaos:     'skill-fx-chaos',
};

const SKILL_FX_DURATION = 650; // ms — matches the CSS animation duration for skill FX burst
let floatIdCounter = 0;

export default function BattleArena({ visibleLog, combatResult, playerMaxHp, enemyMaxHp }) {
  const [playerState, setPlayerState] = useState('idle');  // idle | attacking | hurt | dead
  const [enemyState, setEnemyState]   = useState('idle');  // idle | attacking | hurt | dead
  const [floatingDmg, setFloatingDmg] = useState([]);
  const [playerHp, setPlayerHp]       = useState(playerMaxHp);
  const [enemyHp, setEnemyHp]         = useState(enemyMaxHp);
  const [activeSkillFx, setActiveSkillFx] = useState(null); // { fxClass, emoji }
  const prevLogLen = useRef(0);

  // Reset when a new combat starts (visibleLog goes to 0)
  useEffect(() => {
    if (visibleLog.length === 0) {
      prevLogLen.current = 0;
      setPlayerHp(playerMaxHp);
      setEnemyHp(enemyMaxHp);
      setPlayerState('idle');
      setEnemyState('idle');
      setFloatingDmg([]);
      setActiveSkillFx(null);
    }
  }, [visibleLog.length, playerMaxHp, enemyMaxHp]);

  useEffect(() => {
    if (!visibleLog.length) return;
    if (visibleLog.length === prevLogLen.current) return;
    prevLogLen.current = visibleLog.length;

    const latest = visibleLog[visibleLog.length - 1];
    if (!latest) return;

    // Update HP from structured fields (Package 1)
    if (latest.playerHpAfter != null) setPlayerHp(Math.max(0, latest.playerHpAfter));
    if (latest.enemyHpAfter  != null) setEnemyHp(Math.max(0, latest.enemyHpAfter));

    // Player attacks / skill FX
    if (['damage', 'crit', 'echo', 'totem', 'cull'].includes(latest.type)) {
      setPlayerState('attacking');
      setEnemyState('hurt');

      // Determine skill FX — prefer per-skill visual, fall back to element
      const skillVisual = latest.skillId ? SKILL_VISUAL_MAP[latest.skillId] : null;
      const fxClass = skillVisual?.fxClass ?? ELEMENT_FX_CLASS[latest.skillElement] ?? 'skill-fx-physical';
      const fxEmoji = skillVisual?.emoji ?? null;
      setActiveSkillFx({ fxClass, emoji: fxEmoji, key: floatIdCounter });
      setTimeout(() => setActiveSkillFx(null), SKILL_FX_DURATION);

      if (latest.damage) {
        const id = floatIdCounter++;
        setFloatingDmg(prev => [...prev, { id, value: latest.damage, isCrit: latest.isCrit }]);
        setTimeout(() => setFloatingDmg(prev => prev.filter(f => f.id !== id)), 1100);
      }

      setTimeout(() => {
        setPlayerState(s => s === 'attacking' ? 'idle' : s);
        setEnemyState(s => s === 'hurt' ? 'idle' : s);
      }, 450);
    }

    if (latest.type === 'enemy_attack') {
      setEnemyState('attacking');
      setPlayerState('hurt');

      if (latest.damage) {
        const id = floatIdCounter++;
        setFloatingDmg(prev => [...prev, { id, value: latest.damage, isCrit: false, isPlayer: true }]);
        setTimeout(() => setFloatingDmg(prev => prev.filter(f => f.id !== id)), 1100);
      }

      setTimeout(() => {
        setEnemyState(s => s === 'attacking' ? 'idle' : s);
        setPlayerState(s => s === 'hurt' ? 'idle' : s);
      }, 450);
    }
  }, [visibleLog.length]);

  // Final result overrides
  useEffect(() => {
    if (combatResult === 'defeat') setPlayerState('dead');
    if (combatResult === 'victory') setEnemyState('dead');
  }, [combatResult]);

  const pMax = playerMaxHp || 200;
  const eMax = enemyMaxHp  || 100;
  const playerHpPct = Math.max(0, Math.min(1, playerHp / pMax));
  const enemyHpPct  = Math.max(0, Math.min(1, enemyHp  / eMax));

  const hpColor = (pct) => {
    if (pct > 0.6) return '#00cc66';
    if (pct > 0.3) return '#ffaa00';
    return '#ff3333';
  };

  return (
    <div className="battle-arena">
      {/* Background layers */}
      <div className="arena-bg" aria-hidden="true" />
      <div className="arena-ground" aria-hidden="true" />

      {/* Player side */}
      <div className="arena-side arena-player-side">
        <div className="avatar-hp-bar-wrap">
          <div className="avatar-hp-label">🧙 {Math.ceil(playerHp)}/{pMax}</div>
          <div className="avatar-hp-track">
            <div
              className={`avatar-hp-fill${playerHpPct < 0.3 ? ' hp-critical' : ''}`}
              style={{ width: `${playerHpPct * 100}%`, backgroundColor: hpColor(playerHpPct) }}
            />
          </div>
        </div>

        <div className={`avatar avatar-player avatar-${playerState}`}>
          <div className="avatar-body">🧙</div>
          <div className="avatar-shadow" aria-hidden="true" />
        </div>

        {floatingDmg.filter(f => f.isPlayer).map(fd => (
          <div key={fd.id} className="float-dmg float-dmg-player">
            -{fd.value}
          </div>
        ))}
      </div>

      {/* Center — VS or active skill FX */}
      <div className="arena-center">
        {activeSkillFx ? (
          <>
            <div className={`skill-fx ${activeSkillFx.fxClass}`} key={activeSkillFx.key} />
            {activeSkillFx.emoji && (
              <div className="arena-skill-emoji" key={`e-${activeSkillFx.key}`}>
                {activeSkillFx.emoji}
              </div>
            )}
          </>
        ) : (
          <div className="arena-vs">⚔️</div>
        )}
      </div>

      {/* Enemy side */}
      <div className="arena-side arena-enemy-side">
        <div className="avatar-hp-bar-wrap">
          <div className="avatar-hp-label">💀 {Math.ceil(enemyHp)}/{eMax}</div>
          <div className="avatar-hp-track">
            <div
              className="avatar-hp-fill"
              style={{ width: `${enemyHpPct * 100}%`, backgroundColor: hpColor(enemyHpPct) }}
            />
          </div>
        </div>

        <div className={`avatar avatar-enemy avatar-${enemyState}`}>
          <div className="avatar-body">👹</div>
          <div className="avatar-shadow" aria-hidden="true" />
        </div>

        {floatingDmg.filter(f => !f.isPlayer).map(fd => (
          <div key={fd.id} className={`float-dmg${fd.isCrit ? ' float-dmg-crit' : ''}`}>
            {fd.isCrit ? `⚡${fd.value}!` : fd.value}
          </div>
        ))}
      </div>
    </div>
  );
}
