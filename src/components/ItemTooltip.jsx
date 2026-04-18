import React from 'react';
import './ItemTooltip.css';

const RARITY_COLORS = {
  normal: '#aaa',
  magic: '#4fc3f7',
  rare: '#ffd700',
  legendary: '#ff9800',
  unique: '#c084fc',
};

const ITEM_TYPE_ICONS = {
  weapon: '⚔️',
  helmet: '⛑️',
  chest: '🛡️',
  gloves: '🧤',
  boots: '👢',
};

export function ItemTypeIcon({ slot }) {
  const icon = ITEM_TYPE_ICONS[slot] || '📦';
  return (
    <span className="item-type-icon" title={slot}>
      {icon}
    </span>
  );
}

export default function ItemTooltip({ item, equippedItem = null }) {
  if (!item) return null;

  const rarityColor = RARITY_COLORS[item.rarity] || '#aaa';
  const isUnique = item.rarity === 'unique';

  return (
    <div className="item-tooltip" style={{ borderColor: rarityColor }}>
      <div className="tooltip-name" style={{ color: rarityColor }}>
        {item.name}
        <span className="tooltip-rarity"> [{item.rarity}]</span>
      </div>
      <div className="tooltip-slot">Slot: {item.slot}</div>
      <div className="tooltip-score">Gear Score: {item.gearScore}</div>
      <div className="tooltip-affixes">
        {(item.affixes || []).map((a, i) => (
          <div key={i} className={`tooltip-affix${isUnique && i < (item._fixedAffixCount ?? 3) ? ' tooltip-affix-fixed' : ''}`}>
            +{a.value}{a.unit} {a.name}
          </div>
        ))}
        {(!item.affixes || item.affixes.length === 0) && <div className="tooltip-affix dim">No affixes</div>}
      </div>
      {isUnique && item.flavourText && (
        <div className="tooltip-flavour">"{item.flavourText}"</div>
      )}
      {isUnique && item.uniqueEffect && (
        <div className="tooltip-unique-effect">
          <span className="unique-effect-icon">✦</span> {item.uniqueEffect.description}
        </div>
      )}
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
