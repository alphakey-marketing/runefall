import React from 'react';
import './ItemTooltip.css';

const RARITY_COLORS = {
  normal: '#aaa',
  magic: '#4fc3f7',
  rare: '#ffd700',
  legendary: '#ff9800',
};

export default function ItemTooltip({ item, equippedItem = null }) {
  if (!item) return null;

  const rarityColor = RARITY_COLORS[item.rarity] || '#aaa';

  return (
    <div className="item-tooltip">
      <div className="tooltip-name" style={{ color: rarityColor }}>
        {item.name}
        <span className="tooltip-rarity"> [{item.rarity}]</span>
      </div>
      <div className="tooltip-slot">Slot: {item.slot}</div>
      <div className="tooltip-score">Gear Score: {item.gearScore}</div>
      <div className="tooltip-affixes">
        {item.affixes.map((a, i) => (
          <div key={i} className="tooltip-affix">
            +{a.value}{a.unit} {a.name}
          </div>
        ))}
        {item.affixes.length === 0 && <div className="tooltip-affix">No affixes</div>}
      </div>
      {equippedItem && (
        <div className="tooltip-compare">
          <div className="compare-title">Equipped: {equippedItem.name}</div>
          <div className="compare-score">
            GS: {equippedItem.gearScore}
            <span className={item.gearScore >= equippedItem.gearScore ? 'delta-pos' : 'delta-neg'}>
              {' '}({item.gearScore >= equippedItem.gearScore ? '+' : ''}{item.gearScore - equippedItem.gearScore})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
