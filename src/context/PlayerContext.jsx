import React, { createContext, useContext, useReducer } from 'react';
import { getBaseStats, calculatePlayerStats } from '../utils/StatsCalculator.js';
import { computeZodiacBonuses, isNodeAllocatable } from '../engine/ZodiacSystem.js';

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
  levelUpPending: false,
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
      if (state.inventory.length >= 20) return { ...state, _bagFull: true };
      return { ...state, inventory: [...state.inventory, action.item], _bagFull: false };
    }
    case 'SALVAGE_ITEM': {
      const dustGain = action.item.gearScore + 5;
      const equippedGear = { ...state.equippedGear };
      Object.keys(equippedGear).forEach(slot => {
        if (equippedGear[slot]?.id === action.item.id) equippedGear[slot] = null;
      });
      return {
        ...state,
        equippedGear,
        inventory: state.inventory.filter(i => i.id !== action.item.id),
        runeDust: state.runeDust + dustGain,
      };
    }
    case 'ADD_XP': {
      let { xp, level, zodiacPoints } = state;
      const oldLevel = level;
      xp += action.amount;
      while (xp >= Math.floor(100 * Math.pow(level, 1.5))) {
        const xpReq = Math.floor(100 * Math.pow(level, 1.5));
        xp -= xpReq;
        level++;
        zodiacPoints++;
      }
      const leveledUp = level > oldLevel;
      return { ...state, xp, level, zodiacPoints, levelUpPending: leveledUp };
    }
    case 'DISMISS_LEVEL_UP':
      return { ...state, levelUpPending: false };
    case 'ALLOCATE_NODE': {
      if (state.zodiacPoints <= 0) return state;
      if (state.allocatedNodes.includes(action.nodeId)) return state;
      if (!isNodeAllocatable(action.nodeId, state.allocatedNodes)) return state;
      return { ...state, allocatedNodes: [...state.allocatedNodes, action.nodeId], zodiacPoints: state.zodiacPoints - 1 };
    }
    case 'RESPEC_NODE': {
      const dustCost = 50;
      if (state.runeDust < dustCost) return state;
      if (!state.allocatedNodes.includes(action.nodeId)) return state;
      return { ...state, allocatedNodes: state.allocatedNodes.filter(n => n !== action.nodeId), zodiacPoints: state.zodiacPoints + 1, runeDust: state.runeDust - dustCost };
    }
    case 'CRAFT_REROLL': {
      if (state.runeDust < 50) return state;
      const allItems = [...state.inventory, ...Object.values(state.equippedGear).filter(Boolean)];
      const item = allItems.find(i => i.id === action.itemId);
      if (!item || item.rarity !== 'rare') return state;
      const inventory = state.inventory.map(i => i.id === action.itemId ? action.newItem : i);
      const equippedGear = { ...state.equippedGear };
      Object.keys(equippedGear).forEach(slot => {
        if (equippedGear[slot]?.id === action.itemId) equippedGear[slot] = action.newItem;
      });
      return { ...state, inventory, equippedGear, runeDust: state.runeDust - 50 };
    }
    case 'CRAFT_AUGMENT': {
      if (state.runeDust < 30) return state;
      const inventory = state.inventory.map(i => i.id === action.itemId ? action.newItem : i);
      const equippedGear = { ...state.equippedGear };
      Object.keys(equippedGear).forEach(slot => {
        if (equippedGear[slot]?.id === action.itemId) equippedGear[slot] = action.newItem;
      });
      return { ...state, inventory, equippedGear, runeDust: state.runeDust - 30 };
    }
    case 'CRAFT_CORRUPT': {
      if (state.runeDust < 100) return state;
      const inventory = state.inventory.map(i => i.id === action.itemId ? action.newItem : i);
      const equippedGear = { ...state.equippedGear };
      Object.keys(equippedGear).forEach(slot => {
        if (equippedGear[slot]?.id === action.itemId) equippedGear[slot] = action.newItem;
      });
      return { ...state, inventory, equippedGear, runeDust: state.runeDust - 100 };
    }
    case 'CRAFT_LEGENDARY_RESULT': {
      const filteredInv = state.inventory.filter(i => !(action.itemIds || []).includes(i.id));
      if (action.newItem) filteredInv.push(action.newItem);
      return { ...state, inventory: filteredInv };
    }
    case 'UPGRADE_RUNE': {
      if (state.runeDust < 200) return state;
      const slots = [...state.skillSlots];
      const slot = slots[action.slotIndex];
      if (!slot?.skillRune) return state;
      const upgradedRune = { ...slot.skillRune, tier: (slot.skillRune.tier || 1) + 1, baseDamage: Math.round(slot.skillRune.baseDamage * 1.1) };
      slots[action.slotIndex] = { ...slot, skillRune: upgradedRune };
      return { ...state, skillSlots: slots, runeDust: state.runeDust - 200 };
    }
    case 'ADD_RUNE_DUST':
      return { ...state, runeDust: state.runeDust + action.amount };
    case 'LOAD_SAVE': {
      const s = action.savedState;
      if (!s || typeof s !== 'object') return state;
      // Validate required fields to guard against malformed saves
      if (
        typeof s.level !== 'number' ||
        typeof s.xp !== 'number' ||
        typeof s.runeDust !== 'number' ||
        !Array.isArray(s.skillSlots) ||
        !Array.isArray(s.allocatedNodes) ||
        typeof s.equippedGear !== 'object' ||
        !Array.isArray(s.inventory)
      ) return state;
      return { ...initialState, ...s };
    }
    default:
      return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);

  const zodiacBonuses = computeZodiacBonuses(state.allocatedNodes);
  const playerStats = calculatePlayerStats(state.baseStats, state.equippedGear, zodiacBonuses);

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
