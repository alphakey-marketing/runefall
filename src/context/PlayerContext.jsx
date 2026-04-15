import React, { createContext, useContext, useReducer } from 'react';
import { getBaseStats, calculatePlayerStats } from '../utils/StatsCalculator.js';
import { computeZodiacBonuses, isNodeAllocatable, isNodeRemovable } from '../engine/ZodiacSystem.js';
import challengesData from '../data/challenges.json';

const STARTER_SKILL_RUNE = { id: "frost_arrow", name: "Frost Arrow", type: "ranged", element: "ice", baseDamage: 45, baseManaCost: 20, baseCooldown: 1, baseHits: 1, statusEffect: "chill", unlockLevel: 1, description: "Fires a frost-tipped projectile that chills enemies" };
const STARTER_LINK_RUNE = { id: "more_damage", name: "More Damage", effect: "damage", value: 1.45, unlockLevel: 1, description: "+45% flat damage multiplier", manaCostMultiplier: 1.2, cooldownMultiplier: 1 };
const STARTER_WEAPON = { id: "starter_iron_sword", name: "Iron Sword", slot: "weapon", rarity: "normal", gearScore: 10, affixes: [] };

const PlayerContext = createContext(null);

const initialState = {
  name: 'Hunter',
  level: 1,
  xp: 0,
  runeDust: 50,
  skillSlots: [
    { skillRune: STARTER_SKILL_RUNE, links: [STARTER_LINK_RUNE, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
    { skillRune: null, links: [null, null, null, null, null, null] },
  ],
  equippedGear: { weapon: STARTER_WEAPON, helmet: null, chest: null, gloves: null, boots: null },
  inventory: [],
  zodiacPoints: 0,
  allocatedNodes: [],
  levelUpPending: false,
  baseStats: getBaseStats(),
  tutorialComplete: false,
  // FIX: replaced _bagFull (state pollution) with bagFullNotification
  bagFullNotification: false,
  records: {
    highestTier: 0,
    mostDamageHit: 0,
    fastestClear: null,
    totalEnemiesSlain: 0,
    totalRuneDustSpent: 0,
    favouriteSkillRune: null,
  },
  completedChallenges: [],
  challenges: challengesData.map(c => ({ id: c.id, progress: 0, completed: false })),
  dailyLastCompleted: null,
  ascendancy: null,
  tierKeys: [],
  unlockedSkins: [],
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
      const prevItem = state.equippedGear[action.item.slot];
      const equippedGear = { ...state.equippedGear, [action.item.slot]: action.item };
      const inventory = state.inventory.filter(i => i.id !== action.item.id);
      // Return the previously equipped item to the bag
      const finalInventory = prevItem ? [...inventory, prevItem] : inventory;
      return { ...state, equippedGear, inventory: finalInventory };
    }
    case 'UNEQUIP_ITEM': {
      const equippedGear = { ...state.equippedGear, [action.slot]: null };
      const prevItem = state.equippedGear[action.slot];
      const inventory = prevItem ? [...state.inventory, prevItem] : state.inventory;
      return { ...state, equippedGear, inventory };
    }
    // FIX: Use bagFullNotification instead of _bagFull to avoid polluting saved state
    case 'ADD_TO_INVENTORY': {
      if (state.inventory.length >= 20) return { ...state, bagFullNotification: true };
      return { ...state, inventory: [...state.inventory, action.item], bagFullNotification: false };
    }
    case 'CLEAR_BAG_NOTIFICATION': {
      return { ...state, bagFullNotification: false };
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
    // FIX: Track oldLevel to detect level-up; use `leveledUp || state.levelUpPending`
    // so a second ADD_XP fired before DISMISS_LEVEL_UP doesn't reset the pending flag
    // to false, which was causing zodiacPoints to appear not to add.
    case 'ADD_XP': {
      let { xp, level, zodiacPoints } = state;
      const oldLevel = level;
      xp += action.amount;
      while (xp >= Math.floor(100 * Math.pow(level, 1.5))) {
        xp -= Math.floor(100 * Math.pow(level, 1.5));
        level++;
        zodiacPoints++;
      }
      const leveledUp = level > oldLevel;
      return {
        ...state,
        xp,
        level,
        zodiacPoints,
        levelUpPending: leveledUp || state.levelUpPending,
      };
    }
    case 'DISMISS_LEVEL_UP': return { ...state, levelUpPending: false };
    case 'ALLOCATE_NODE': {
      if (state.zodiacPoints <= 0) return state;
      if (state.allocatedNodes.includes(action.nodeId)) return state;
      if (!isNodeAllocatable(action.nodeId, state.allocatedNodes)) return state;
      return {
        ...state,
        allocatedNodes: [...state.allocatedNodes, action.nodeId],
        zodiacPoints: state.zodiacPoints - 1,
      };
    }
    // FIX: Added isNodeRemovable guard inside the reducer (was only in UI before),
    // preventing any future malformed dispatch from breaking tree path requirements.
    case 'RESPEC_NODE': {
      const dustCost = 50;
      if (state.runeDust < dustCost) return state;
      if (!state.allocatedNodes.includes(action.nodeId)) return state;
      if (!isNodeRemovable(action.nodeId, state.allocatedNodes)) return state;
      return {
        ...state,
        allocatedNodes: state.allocatedNodes.filter(n => n !== action.nodeId),
        zodiacPoints: state.zodiacPoints + 1,
        runeDust: state.runeDust - dustCost,
      };
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
      const upgradedRune = {
        ...slot.skillRune,
        tier: (slot.skillRune.tier || 1) + 1,
        baseDamage: Math.round(slot.skillRune.baseDamage * 1.1),
      };
      slots[action.slotIndex] = { ...slot, skillRune: upgradedRune };
      return { ...state, skillSlots: slots, runeDust: state.runeDust - 200 };
    }
    case 'ADD_RUNE_DUST': return { ...state, runeDust: state.runeDust + action.amount };
    case 'SET_ASCENDANCY': return { ...state, ascendancy: action.path };
    case 'UPDATE_RECORDS': {
      const r = { ...state.records };
      if (action.highestTier && action.highestTier > r.highestTier) r.highestTier = action.highestTier;
      if (action.mostDamageHit && action.mostDamageHit > r.mostDamageHit) r.mostDamageHit = action.mostDamageHit;
      if (action.fastestClear && (!r.fastestClear || action.fastestClear < r.fastestClear)) r.fastestClear = action.fastestClear;
      if (action.totalEnemiesSlain) r.totalEnemiesSlain += action.totalEnemiesSlain;
      if (action.totalRuneDustSpent) r.totalRuneDustSpent += action.totalRuneDustSpent;
      if (action.favouriteSkillRune) r.favouriteSkillRune = action.favouriteSkillRune;
      return { ...state, records: r };
    }
    case 'COMPLETE_CHALLENGE': {
      const ch = challengesData.find(c => c.id === action.challengeId);
      if (!ch) return state;
      if (state.completedChallenges.includes(action.challengeId)) return state;
      const challenges = state.challenges.map(c =>
        c.id === action.challengeId ? { ...c, completed: true, progress: ch.target } : c
      );
      return {
        ...state,
        completedChallenges: [...state.completedChallenges, action.challengeId],
        challenges,
        runeDust: state.runeDust + (ch.reward || 0),
      };
    }
    case 'UPDATE_CHALLENGE_PROGRESS': {
      const challenges = state.challenges.map(c =>
        c.id === action.challengeId
          ? { ...c, progress: Math.min(c.progress + (action.amount || 1), challengesData.find(d => d.id === c.id)?.target || c.progress) }
          : c
      );
      return { ...state, challenges };
    }
    case 'ADD_TIER_KEY': return { ...state, tierKeys: [...state.tierKeys, action.key] };
    case 'USE_TIER_KEY': {
      const idx = state.tierKeys.findIndex(k => k.id === action.keyId);
      if (idx === -1) return state;
      const tierKeys = [...state.tierKeys];
      tierKeys.splice(idx, 1);
      return { ...state, tierKeys };
    }
    case 'SET_DAILY_COMPLETED': return { ...state, dailyLastCompleted: action.date };
    case 'SET_TUTORIAL_COMPLETE': return { ...state, tutorialComplete: true };
    case 'UNLOCK_SKIN':
      if (state.unlockedSkins.includes(action.skinId)) return state;
      return { ...state, unlockedSkins: [...state.unlockedSkins, action.skinId] };
    case 'LOAD_SAVE': {
      const s = action.savedState;
      if (!s || typeof s !== 'object') return state;
      if (
        typeof s.level !== 'number' ||
        typeof s.xp !== 'number' ||
        typeof s.runeDust !== 'number' ||
        !Array.isArray(s.skillSlots) ||
        !Array.isArray(s.allocatedNodes) ||
        typeof s.equippedGear !== 'object' ||
        !Array.isArray(s.inventory)
      ) return state;
      return {
        ...initialState,
        ...s,
        records: { ...initialState.records, ...(s.records || {}) },
        challenges: s.challenges || initialState.challenges,
        completedChallenges: s.completedChallenges || [],
        ascendancy: s.ascendancy || null,
        tierKeys: s.tierKeys || [],
        unlockedSkins: s.unlockedSkins || [],
        tutorialComplete: s.tutorialComplete || false,
        dailyLastCompleted: s.dailyLastCompleted || null,
        bagFullNotification: false,
      };
    }
    case 'RESET_SAVE': return { ...initialState };
    default: return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const zodiacBonuses = computeZodiacBonuses(state.allocatedNodes);
  const playerStats = calculatePlayerStats(state.baseStats, state.equippedGear, zodiacBonuses, state);
  return (
    <PlayerContext.Provider value={{ state, dispatch, playerStats, zodiacBonuses }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
