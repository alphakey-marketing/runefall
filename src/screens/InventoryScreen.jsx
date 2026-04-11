import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { generateItem } from '../engine/LootSystem.js';
import ItemTooltip from '../components/ItemTooltip.jsx';
import './InventoryScreen.css';

const SLOTS = ['weapon', 'helmet', 'chest', 'gloves', 'boots'];
const RARITY_COLORS = { normal: '#aaa', magic: '#4fc3f7', rare: '#ffd700', legendary: '#ff9800' };

export default function InventoryScreen() {
  const { state, dispatch } = usePlayer();
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleEquip = (item) => {
    dispatch({ type: 'EQUIP_ITEM', item });
  };

  const handleUnequip = (slot) => {
    dispatch({ type: 'UNEQUIP_ITEM', slot });
  };

  const handleSalvage = (item) => {
    dispatch({ type: 'SALVAGE_ITEM', item });
  };

  const handleDropTest = () => {
    const item = generateItem();
    dispatch({ type: 'ADD_TO_INVENTORY', item });
  };

  return (
    <div className="inventory-screen">
      <h2 className="screen-title">🎒 Inventory</h2>

      <div className="rune-dust-display">Rune Dust: <span>{state.runeDust}</span></div>

      <h3>Equipped Gear</h3>
      <div className="equipped-slots">
        {SLOTS.map(slot => {
          const item = state.equippedGear[slot];
          return (
            <div
              key={slot}
              className="gear-slot"
              onMouseEnter={() => item && setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="slot-name">{slot}</div>
              {item ? (
                <div
                  className="item-card equipped"
                  style={{ borderColor: RARITY_COLORS[item.rarity] }}
                >
                  <div className="item-name" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
                  <div className="item-gs">GS: {item.gearScore}</div>
                  <button className="unequip-btn" onClick={() => handleUnequip(slot)}>Unequip</button>
                </div>
              ) : (
                <div className="empty-slot">Empty</div>
              )}
            </div>
          );
        })}
      </div>

      <h3>Bag ({state.inventory.length}/20)</h3>
      <div className="bag-grid">
        {state.inventory.map(item => (
          <div
            key={item.id}
            className="item-card bag-item"
            style={{ borderColor: RARITY_COLORS[item.rarity] }}
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="item-name" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</div>
            <div className="item-gs">GS: {item.gearScore}</div>
            <div className="item-actions">
              <button className="equip-btn" onClick={() => handleEquip(item)}>Equip</button>
              <button className="salvage-btn" onClick={() => handleSalvage(item)}>Salvage</button>
            </div>
          </div>
        ))}
        {state.inventory.length === 0 && <div className="empty-bag">Bag is empty</div>}
      </div>

      {hoveredItem && (
        <div className="tooltip-float">
          <ItemTooltip item={hoveredItem} equippedItem={state.equippedGear[hoveredItem.slot]} />
        </div>
      )}

      <button className="drop-test-btn" onClick={handleDropTest}>
        🎲 Drop Test (Dev)
      </button>
    </div>
  );
}
