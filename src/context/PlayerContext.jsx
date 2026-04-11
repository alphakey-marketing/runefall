import React, { createContext, useContext, useReducer } from 'react';
import { getBaseStats, calculatePlayerStats } from '../utils/StatsCalculator.js';

const PlayerContext = createContext(null);

const initialState = {
  name: 'Hunter',
  level: 1,
  xp: 0,
  runeDust: 0,
  skillSlots: [
    { skillRune: null, links: [null, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
  ],
  equippedGear: {
    weapon: null,
    helmet: null,
    chest: null,
    gloves: null,
    boots: null,
  },
  inventory: [],
  zodiacPoints: 0,
  allocatedNodes: [],
  baseStats: getBaseStats(),
};

function playerReducer(state, action) {
  switch (action.type) {
    case 'SET_SKILL_RUNE': {
      const slots = [...state.skillSlots];
      slots[action.slotIndex] = { ...slots[action.slotIndex], skillRune: action.rune };
      return { ...state, skillSlots: slots };
    }
    case 'SET_LINK_RUNE': {
      const slots = [...state.skillSlots];
      const links = [...slots[action.slotIndex].links];
      links[action.linkIndex] = action.link;
      slots[action.slotIndex] = { ...slots[action.slotIndex], links };
      return { ...state, skillSlots: slots };
    }
    case 'EQUIP_ITEM': {
      const equippedGear = { ...state.equippedGear, [action.item.slot]: action.item };
      const inventory = state.inventory.filter(i => i.id !== action.item.id);
      return { ...state, equippedGear, inventory };
    }
    case 'UNEQUIP_ITEM': {
      const equippedGear = { ...state.equippedGear, [action.slot]: null };
      const prevItem = state.equippedGear[action.slot];
      const inventory = prevItem ? [...state.inventory, prevItem] : state.inventory;
      return { ...state, equippedGear, inventory };
    }
    case 'ADD_TO_INVENTORY': {
      if (state.inventory.length >= 20) return state;
      return { ...state, inventory: [...state.inventory, action.item] };
    }
    case 'SALVAGE_ITEM': {
      const dustGain = action.item.gearScore + 5;
      return {
        ...state,
        inventory: state.inventory.filter(i => i.id !== action.item.id),
        runeDust: state.runeDust + dustGain,
      };
    }
    case 'ADD_XP': {
      let { xp, level, zodiacPoints } = state;
      xp += action.amount;
      const xpReq = Math.floor(100 * Math.pow(level, 1.5));
      if (xp >= xpReq) {
        level++;
        xp -= xpReq;
        zodiacPoints++;
      }
      return { ...state, xp, level, zodiacPoints };
    }
    case 'ADD_RUNE_DUST':
      return { ...state, runeDust: state.runeDust + action.amount };
    default:
      return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  const playerStats = calculatePlayerStats(state.baseStats, state.equippedGear);

  return (
    <PlayerContext.Provider value={{ state, dispatch, playerStats }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
