import React, { useRef } from 'react';
import { useGame } from './context/GameContext.jsx';
import { usePlayer } from './context/PlayerContext.jsx';
import BottomNav from './components/BottomNav.jsx';
import BuildScreen from './screens/BuildScreen.jsx';
import InventoryScreen from './screens/InventoryScreen.jsx';
import DungeonScreen from './screens/DungeonScreen.jsx';
import BattleScreen from './screens/BattleScreen.jsx';
import ZodiacScreen from './screens/ZodiacScreen.jsx';
import CraftingScreen from './screens/CraftingScreen.jsx';
import SimulatorScreen from './screens/SimulatorScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import AscendancyModal from './screens/AscendancyModal.jsx';
import TrialResultScreen from './screens/TrialResultScreen.jsx';
import { decodeBuild } from './utils/BuildCodec.js';
import './App.css';

function ScreenRouter() {
  const { state } = useGame();
  switch (state.currentScreen) {
    case 'build': return <BuildScreen />;
    case 'inventory': return <InventoryScreen />;
    case 'dungeon': return <DungeonScreen />;
    case 'battle': return <BattleScreen />;
    case 'zodiac': return <ZodiacScreen />;
    case 'crafting': return <CraftingScreen />;
    case 'simulator': return <SimulatorScreen />;
    case 'settings': return <SettingsScreen />;
    case 'trialResult': return <TrialResultScreen />;
    default: return <BuildScreen />;
  }
}

function XPBar({ xp, level }) {
  const xpReq = Math.floor(100 * Math.pow(level, 1.5));
  const pct = Math.min(100, Math.round((xp / xpReq) * 100));
  return (
    <div className="xp-bar-wrapper" title={`${xp} / ${xpReq} XP`}>
      <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function LevelUpPopup() {
  const { state: playerState, dispatch: playerDispatch } = usePlayer();
  const { dispatch: gameDispatch } = useGame();

  if (!playerState.levelUpPending) return null;

  return (
    <div className="level-up-popup-overlay" onClick={() => playerDispatch({ type: 'DISMISS_LEVEL_UP' })}>
      <div className="level-up-popup" onClick={e => e.stopPropagation()}>
        <div className="level-up-popup-icon">⬆️</div>
        <div className="level-up-popup-title">LEVEL UP!</div>
        <div className="level-up-popup-msg">You are now Level {playerState.level}!</div>
        <div className="level-up-popup-sub">+1 Zodiac Point earned</div>
        <div className="level-up-popup-btns">
          <button className="level-up-goto-zodiac" onClick={() => { playerDispatch({ type: 'DISMISS_LEVEL_UP' }); gameDispatch({ type: 'NAVIGATE', screen: 'zodiac' }); }}>
            Open Zodiac ⭐
          </button>
          <button className="level-up-dismiss-btn" onClick={() => playerDispatch({ type: 'DISMISS_LEVEL_UP' })}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { state: gameState } = useGame();
  const { state: playerState, dispatch: playerDispatch } = usePlayer();
  const importRef = useRef(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const buildCode = params.get('build');
    if (buildCode) {
      const decoded = decodeBuild(buildCode);
      if (decoded) console.log('Imported build from URL:', decoded);
    }
  }, []);

  const handleExport = () => {
    const json = JSON.stringify(playerState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'runefall-save.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const savedState = JSON.parse(evt.target.result);
        playerDispatch({ type: 'LOAD_SAVE', savedState });
      } catch {
        alert('Invalid save file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="game-title">RUNEFALL</span>
        <div className="header-stats">
          <span className="header-level">Lv.{playerState.level}</span>
          <XPBar xp={playerState.xp} level={playerState.level} />
          <span className="header-dust">🔮 {playerState.runeDust}</span>
          <button className="save-btn" onClick={handleExport} title="Export save">💾</button>
          <button className="save-btn" onClick={() => importRef.current?.click()} title="Import save">📂</button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </header>
      <main className="app-main">
        <ScreenRouter />
      </main>
      {gameState.currentScreen !== 'battle' && <BottomNav />}
      <AscendancyModal />
      <LevelUpPopup />
    </div>
  );
}
