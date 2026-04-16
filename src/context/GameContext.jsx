import React, { createContext, useContext, useReducer } from 'react';

const GameContext = createContext(null);

const initialState = {
  currentScreen: 'build',
  currentTier: 1,
  unlockedTiers: [0, 1],
  combatResult: null,
  combatLog: [],
  pendingLoot: [],
  simulatorResult: null,
  simulatorLog: [],
  combatSpeed: 1,
  colorBlindMode: false,
  soundEnabled: true,
  currentMode: 'normal',
  trialId: null,
  trialFloor: 0,
  trialTotalDamage: 0,
  lastCompletedTier: null,
  lastCompletedChapter: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, currentScreen: action.screen };
    case 'SET_COMBAT_RESULT':
      return { ...state, combatResult: action.result, combatLog: action.log };
    case 'SET_PENDING_LOOT':
      return { ...state, pendingLoot: action.loot };
    case 'CLEAR_PENDING_LOOT':
      return { ...state, pendingLoot: [] };
    case 'UNLOCK_TIER':
      if (state.unlockedTiers.includes(action.tier)) return state;
      return { ...state, unlockedTiers: [...state.unlockedTiers, action.tier] };
    case 'SET_CURRENT_TIER':
      return { ...state, currentTier: action.tier };
    case 'SET_LAST_COMPLETED_TIER':
      return { ...state, lastCompletedTier: action.tier, lastCompletedChapter: action.chapter };
    case 'CLEAR_LAST_COMPLETED_TIER':
      return { ...state, lastCompletedTier: null, lastCompletedChapter: null };
    case 'RESET_COMBAT':
      return { ...state, combatResult: null, combatLog: [], pendingLoot: [], lastCompletedTier: null, lastCompletedChapter: null };
    case 'SET_SIMULATOR_RESULT':
      return { ...state, simulatorResult: action.result, simulatorLog: action.log };
    case 'SET_COMBAT_SPEED':
      return { ...state, combatSpeed: action.speed };
    case 'TOGGLE_COLOR_BLIND':
      return { ...state, colorBlindMode: !state.colorBlindMode };
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'RESET_GAME':
      return { ...initialState };
    case 'LOAD_GAME_PROGRESS': {
      const tiers = action.unlockedTiers;
      if (!Array.isArray(tiers)) return state;
      // Merge: keep any already-unlocked tiers plus all from save
      const merged = Array.from(new Set([...state.unlockedTiers, ...tiers]));
      return { ...state, unlockedTiers: merged };
    }
    case 'SET_TRIAL_MODE':
      return { ...state, currentMode: 'trial', trialId: action.trialId, trialFloor: 0, trialTotalDamage: 0 };
    case 'ADVANCE_TRIAL_FLOOR':
      return { ...state, trialFloor: state.trialFloor + 1, trialTotalDamage: state.trialTotalDamage + (action.damage || 0) };
    case 'RESET_TRIAL':
      return { ...state, currentMode: 'normal', trialId: null, trialFloor: 0, trialTotalDamage: 0 };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
