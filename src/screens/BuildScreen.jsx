import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { buildSkillFromSlot } from '../engine/SkillResolver.js';
import RunePicker from '../components/RunePicker.jsx';
import { encodeBuild } from '../utils/BuildCodec.js';
import skillRunesData from '../data/skillRunes.json';
import linkRunesData from '../data/linkRunes.json';
import './BuildScreen.css';

export default function BuildScreen() {
  const { state, dispatch, playerStats } = usePlayer();
  const [picker, setPicker] = useState(null); // { type: 'skill'|'link', slotIndex, linkIndex? }

  const handleSelectSkillRune = (rune) => {
    dispatch({ type: 'SET_SKILL_RUNE', slotIndex: picker.slotIndex, rune });
    setPicker(null);
  };

  const handleSelectLinkRune = (rune) => {
    dispatch({ type: 'SET_LINK_RUNE', slotIndex: picker.slotIndex, linkIndex: picker.linkIndex, link: rune });
    setPicker(null);
  };

  const handleClearSlot = (slotIndex) => {
    dispatch({ type: 'SET_SKILL_RUNE', slotIndex, rune: null });
  };

  const handleClearLink = (slotIndex, linkIndex) => {
    dispatch({ type: 'SET_LINK_RUNE', slotIndex, linkIndex, link: null });
  };

  const handleCopyBuildCode = () => {
    const code = encodeBuild(state);
    navigator.clipboard.writeText(code).then(() => {
      alert('Build code copied! Share with friends.');
    }).catch(() => {
      prompt('Copy this build code:', code);
    });
  };

  useEffect(() => {
    const handler = (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5 && !picker) {
        setPicker({ type: 'skill', slotIndex: num - 1 });
      }
      if (e.key === 'Escape') setPicker(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [picker]);

  const playerLevel = state.level;
  const unlockedSkillRunes = skillRunesData.filter(r => (r.unlockLevel || 1) <= playerLevel);
  const lockedSkillRunes = skillRunesData.filter(r => (r.unlockLevel || 1) > playerLevel);
  const unlockedLinkRunes = linkRunesData.filter(r => (r.unlockLevel || 1) <= playerLevel);
  const lockedLinkRunes = linkRunesData.filter(r => (r.unlockLevel || 1) > playerLevel);

  return (
    <div className="build-screen">
      <h2 className="screen-title">⚔️ Build</h2>

      <div className="player-stats-mini">
        <span>HP: {playerStats.maxHp}</span>
        <span>Mana: {playerStats.maxMana}</span>
        <span>Crit: {playerStats.critChance}%</span>
        <span>Dust: {state.runeDust}</span>
      </div>

      <div className="build-toolbar">
        <button className="build-code-btn" onClick={handleCopyBuildCode} title="Copy shareable build code">
          📋 Copy Build Code
        </button>
        <div className="keyboard-hint">Press 1-5 to quickly open skill slot</div>
      </div>

      <div className="skill-slots">
        {state.skillSlots.map((slot, si) => {
          const resolved = buildSkillFromSlot(slot);
          return (
            <div key={si} className="skill-slot-card">
              <div className="skill-slot-header">
                <span className="slot-label">Skill {si + 1}</span>
                {slot.skillRune && (
                  <button className="clear-btn" onClick={() => handleClearSlot(si)}>✕</button>
                )}
              </div>

              {slot.skillRune ? (
                <div className="skill-info" onClick={() => setPicker({ type: 'skill', slotIndex: si })}>
                  <div className="skill-name">{slot.skillRune.name}</div>
                  <div className="skill-element">{slot.skillRune.element} / {slot.skillRune.type}</div>
                  {resolved && (
                    <div className="skill-resolved">
                      <span>DMG: {resolved.damage}</span>
                      <span>Mana: {resolved.manaCost}</span>
                      <span>CD: {resolved.cooldown.toFixed(1)}s</span>
                      <span>Hits: {resolved.hits}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-skill" onClick={() => setPicker({ type: 'skill', slotIndex: si })}>
                  + Equip Skill Rune
                </div>
              )}

              <div className="link-sockets">
                {slot.links.map((link, li) => (
                  <div
                    key={li}
                    className={`link-socket ${link ? 'filled' : 'empty'}`}
                    onClick={() => slot.skillRune && setPicker({ type: 'link', slotIndex: si, linkIndex: li })}
                    title={link ? `${link.name}: ${link.description}` : 'Empty socket'}
                  >
                    {link ? (
                      <>
                        <span className="link-name">{link.name}</span>
                        <button className="link-clear" onClick={(e) => { e.stopPropagation(); handleClearLink(si, li); }}>✕</button>
                      </>
                    ) : (
                      <span className="socket-placeholder">○</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {picker?.type === 'skill' && (
        <RunePicker
          title="Select Skill Rune"
          runes={unlockedSkillRunes}
          lockedRunes={lockedSkillRunes}
          onSelect={handleSelectSkillRune}
          onClose={() => setPicker(null)}
        />
      )}
      {picker?.type === 'link' && (
        <RunePicker
          title="Select Link Rune"
          runes={unlockedLinkRunes}
          lockedRunes={lockedLinkRunes}
          onSelect={handleSelectLinkRune}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
