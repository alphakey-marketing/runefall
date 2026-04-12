import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { useGame } from '../context/GameContext.jsx';
import { runCombat } from '../engine/CombatEngine.js';
import { buildSkillFromSlot } from '../engine/SkillResolver.js';
import CombatLog from '../components/CombatLog.jsx';
import './SimulatorScreen.css';

const DEFAULT_DUMMY = {
  name: 'Test Dummy',
  hp: 1000,
  armor: 0,
  attackDamage: 15,
  attackSpeed: 1.0,
  resistances: { fire: 0, ice: 0, lightning: 0, physical: 0, poison: 0, chaos: 0 },
  xpReward: 0,
};

export default function SimulatorScreen() {
  const { playerStats, state: playerState } = usePlayer();
  const { state: gameState, dispatch: gameDispatch } = useGame();
  const [dummy, setDummy] = useState({ ...DEFAULT_DUMMY });
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);
  const [exportStr, setExportStr] = useState('');
  const [importStr, setImportStr] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    const skills = playerState.skillSlots.map(slot => buildSkillFromSlot(slot)).filter(Boolean);
    if (skills.length === 0) {
      setResult({ result: 'no_skills', log: [{ type: 'info', text: 'No skills equipped! Go to Build screen to add skills.' }], ticks: 0 });
      setLog([{ type: 'info', text: 'No skills equipped! Go to Build screen to add skills.' }]);
      setRunning(false);
      return;
    }
    const dummyEnemy = { ...dummy, hp: parseInt(dummy.hp) || 1000 };
    const combatResult = runCombat(playerStats, skills, [dummyEnemy]);
    setResult(combatResult);
    setLog(combatResult.log);
    gameDispatch({ type: 'SET_SIMULATOR_RESULT', result: combatResult.result, log: combatResult.log });
    setRunning(false);
  };

  const handleExport = () => {
    const buildData = {
      version: 1,
      skillSlots: playerState.skillSlots,
      allocatedNodes: playerState.allocatedNodes,
    };
    const encoded = btoa(JSON.stringify(buildData));
    setExportStr(encoded);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(encoded).catch(() => {});
    }
  };

  const handleImportPreview = () => {
    try {
      const decoded = JSON.parse(atob(importStr.trim()));
      setImportPreview(decoded);
    } catch {
      setImportPreview(null);
      alert('Invalid build code');
    }
  };

  const updateDummy = (field, value) => {
    setDummy(prev => ({ ...prev, [field]: value }));
  };

  const updateResist = (element, value) => {
    setDummy(prev => ({ ...prev, resistances: { ...prev.resistances, [element]: parseInt(value) || 0 } }));
  };

  const totalDamageDealt = log
    .filter(e => ['damage', 'crit', 'echo', 'totem', 'status', 'cull'].includes(e.type))
    .reduce((sum, e) => sum + (e.damage || 0), 0);

  return (
    <div className="simulator-screen">
      <h2 className="sim-title">🎯 Build Simulator</h2>

      <div className="sim-layout">
        <div className="sim-left">
          <div className="sim-section">
            <h3>Test Dummy</h3>
            <div className="sim-field">
              <label>HP</label>
              <input type="number" value={dummy.hp} min={1} max={100000} onChange={e => updateDummy('hp', parseInt(e.target.value) || 100)} />
            </div>
            <div className="sim-field">
              <label>Armor</label>
              <input type="number" value={dummy.armor} min={0} max={500} onChange={e => updateDummy('armor', parseInt(e.target.value) || 0)} />
            </div>
            <div className="sim-field">
              <label>Attack Dmg</label>
              <input type="number" value={dummy.attackDamage} min={0} max={500} onChange={e => updateDummy('attackDamage', parseInt(e.target.value) || 0)} />
            </div>
            <div className="sim-field">
              <label>Atk Speed</label>
              <input type="number" value={dummy.attackSpeed} min={0.1} max={5} step={0.1} onChange={e => updateDummy('attackSpeed', parseFloat(e.target.value) || 1)} />
            </div>
            <div className="sim-resists">
              <div className="resist-label">Resistances</div>
              {['fire', 'ice', 'lightning', 'physical', 'poison', 'chaos'].map(el => (
                <div key={el} className="sim-field resist">
                  <label>{el}</label>
                  <input
                    type="range" min={-50} max={100} step={5}
                    value={dummy.resistances[el] || 0}
                    onChange={e => updateResist(el, e.target.value)}
                  />
                  <span>{dummy.resistances[el] || 0}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sim-section">
            <h3>Player Stats Preview</h3>
            <div className="sim-stat-list">
              <div className="sim-stat">HP: {playerStats.maxHp}</div>
              <div className="sim-stat">Mana: {playerStats.maxMana}</div>
              <div className="sim-stat">Armor: {playerStats.armor}</div>
              <div className="sim-stat">Crit: {playerStats.critChance}%</div>
              <div className="sim-stat">All Dmg: +{playerStats.allDamageBonus}%</div>
            </div>
          </div>
        </div>

        <div className="sim-right">
          <button className="sim-run-btn" onClick={handleRun} disabled={running}>
            {running ? 'Simulating...' : '▶ Run Simulation'}
          </button>

          {result && (
            <div className={`sim-result result-${result.result}`}>
              <div className="sim-result-title">
                {result.result === 'victory' ? '⚔️ VICTORY' : result.result === 'defeat' ? '💀 DEFEAT' : '⏱ TIMEOUT'}
              </div>
              <div className="sim-result-stats">
                <span>Ticks: {result.ticks}</span>
                <span>Total Damage: {totalDamageDealt.toLocaleString()}</span>
                {result.ticks > 0 && <span>DPS: ~{Math.round(totalDamageDealt / (result.ticks * 0.5))}/s</span>}
              </div>
            </div>
          )}

          <div className="sim-log-container">
            <CombatLog entries={log} />
          </div>
        </div>
      </div>

      <div className="sim-build-io">
        <div className="sim-export">
          <h3>Export Build</h3>
          <button className="sim-btn" onClick={handleExport}>Export to Clipboard</button>
          {exportStr && (
            <textarea className="sim-code" readOnly value={exportStr} rows={3} />
          )}
        </div>
        <div className="sim-import">
          <h3>Import Build</h3>
          <textarea
            className="sim-code"
            value={importStr}
            onChange={e => setImportStr(e.target.value)}
            placeholder="Paste build code here..."
            rows={3}
          />
          <button className="sim-btn" onClick={handleImportPreview}>Preview Import</button>
          {importPreview && (
            <div className="sim-import-preview">
              <p>Build detected: {importPreview.skillSlots?.filter(s => s?.skillRune).length || 0} skills, {importPreview.allocatedNodes?.length || 0} zodiac nodes</p>
              <p className="sim-import-note">Note: Apply import through the Build screen (paste code there)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
