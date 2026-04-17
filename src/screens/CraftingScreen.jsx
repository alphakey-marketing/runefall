import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import affixPool from '../data/affixPool.json';
import { weightedRandom } from '../utils/FormulaHelpers.js';
import './CraftingScreen.css';

const MAX_AFFIX_ROLL_ATTEMPTS = 20;
const MAX_AFFIXES = { magic: 2, rare: 6, legendary: 8 };
const AUGMENT_COST = { magic: 30, rare: 30, legendary: 80 };
const LEGENDARY_CRAFT_COST = 500;
const MAX_RUNE_TIER = 10;

function rollAffix(rarity) {
  const eligible = affixPool.filter(a => a.tiers.includes(rarity));
  if (eligible.length === 0) return null;
  const a = weightedRandom(eligible);
  const min = (rarity === 'legendary' && a.legendaryMinValue != null) ? a.legendaryMinValue : a.minValue;
  const max = (rarity === 'legendary' && a.legendaryMaxValue != null) ? a.legendaryMaxValue : a.maxValue;
  const value = Math.round(min + Math.random() * (max - min));
  return {
    id: a.id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    sourceId: a.id,
    name: a.name,
    statKey: a.statKey,
    value,
    unit: a.unit,
  };
}

export default function CraftingScreen() {
  const { state: playerState, dispatch } = usePlayer();
  const { inventory, runeDust, skillSlots, equippedGear } = playerState;
  const [selectedItem, setSelectedItem] = useState(null);
  const [legendarySlots, setLegendarySlots] = useState([null, null, null]);
  const [message, setMessage] = useState('');
  const [selectedAffixIndex, setSelectedAffixIndex] = useState(null);

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const refreshSelected = (newItem) => {
    setSelectedItem(newItem);
  };

  const isEquipped = selectedItem && Object.values(equippedGear).some(g => g?.id === selectedItem.id);

  const handleReroll = () => {
    if (!selectedItem || selectedItem.rarity !== 'rare') return;
    if (runeDust < 50) { flash('Not enough Rune Dust (need 50)'); return; }
    const affixes = [...(selectedItem.affixes || [])];
    if (affixes.length === 0) { flash('No affixes to reroll'); return; }
    if (selectedAffixIndex === null) { flash('Select an affix to reroll first'); return; }
    const removeIdx = selectedAffixIndex;
    const existing = affixes.map(a => a.sourceId || a.id);
    let newAffix = null;
    let attempts = 0;
    while (!newAffix || existing.includes(newAffix.sourceId || newAffix.id)) {
      newAffix = rollAffix('rare');
      if (++attempts > MAX_AFFIX_ROLL_ATTEMPTS) break;
    }
    if (!newAffix) { flash('Failed to find new affix'); return; }
    affixes.splice(removeIdx, 1, newAffix);
    const newItem = { ...selectedItem, affixes };
    dispatch({ type: 'CRAFT_REROLL', itemId: selectedItem.id, newItem });
    refreshSelected(newItem);
    setSelectedAffixIndex(null);
    flash('Affix rerolled!');
  };

  const handleAugment = () => {
    if (!selectedItem) return;
    if (!['magic', 'rare', 'legendary'].includes(selectedItem.rarity)) {
      flash('Can only augment magic, rare, or legendary items'); return;
    }
    const currentCount = (selectedItem.affixes || []).length;
    const cap = MAX_AFFIXES[selectedItem.rarity] || 6;
    if (currentCount >= cap) { flash(`Item is at max affixes (${cap})`); return; }
    const cost = AUGMENT_COST[selectedItem.rarity] || 30;
    if (runeDust < cost) { flash(`Not enough Rune Dust (need ${cost})`); return; }
    const existing = (selectedItem.affixes || []).map(a => a.sourceId || a.id);
    let newAffix = null;
    let attempts = 0;
    const rollRarity = selectedItem.rarity === 'magic' ? 'magic' : selectedItem.rarity;
    while (!newAffix || existing.includes(newAffix.sourceId || newAffix.id)) {
      newAffix = rollAffix(rollRarity);
      if (++attempts > MAX_AFFIX_ROLL_ATTEMPTS) break;
    }
    if (!newAffix) { flash('No new affixes available'); return; }
    const affixes = [...(selectedItem.affixes || []), newAffix];
    let rarity = selectedItem.rarity;
    if (rarity === 'magic' && affixes.length >= 2) rarity = 'rare';
    const newItem = { ...selectedItem, affixes, rarity };
    dispatch({ type: 'CRAFT_AUGMENT', itemId: selectedItem.id, newItem });
    refreshSelected(newItem);
    flash(`Augmented!${rarity !== selectedItem.rarity ? ' Item upgraded to Rare!' : ''}`);
  };

  const handleCorrupt = () => {
    if (!selectedItem || selectedItem.rarity === 'normal' || selectedItem.rarity === 'unique') return;
    if (runeDust < 100) { flash('Not enough Rune Dust (need 100)'); return; }
    const roll = Math.ceil(Math.random() * 6);
    let newItem = { ...selectedItem };
    let outcome = '';
    if (roll === 1) {
      const bonus = rollAffix('legendary');
      if (bonus) { newItem = { ...newItem, affixes: [...(newItem.affixes || []), bonus], corrupted: true }; }
      outcome = 'Powerful implicit added!';
    } else if (roll === 2) {
      newItem = { ...newItem, corrupted: true };
      outcome = 'Nothing happened... but the item is now corrupted.';
    } else if (roll === 3) {
      const affixes = [...(newItem.affixes || [])];
      if (affixes.length > 0) affixes.splice(Math.floor(Math.random() * affixes.length), 1);
      newItem = { ...newItem, affixes, corrupted: true };
      outcome = 'Lost one affix!';
    } else if (roll === 4) {
      const a = rollAffix(newItem.rarity);
      if (a) newItem = { ...newItem, affixes: [...(newItem.affixes || []), a], corrupted: true };
      outcome = 'Gained one affix!';
    } else if (roll === 5) {
      const count = (newItem.affixes || []).length;
      const newAffixes = Array.from({ length: count }, () => rollAffix(newItem.rarity)).filter(Boolean);
      newItem = { ...newItem, affixes: newAffixes, corrupted: true };
      outcome = 'All affixes rerolled!';
    } else {
      newItem = { ...newItem, rarity: 'magic', corrupted: true };
      outcome = 'Item became Magic!';
    }
    dispatch({ type: 'CRAFT_CORRUPT', itemId: selectedItem.id, newItem });
    refreshSelected(newItem);
    flash(`Corruption: ${outcome}`);
  };

  const handleUpgradeRune = (slotIndex) => {
    const slot = skillSlots[slotIndex];
    if (!slot?.skillRune) return;
    const tier = slot.skillRune.tier || 1;
    if (tier >= MAX_RUNE_TIER) { flash('Rune is already at max tier!'); return; }
    const cost = 200 * tier;
    if (runeDust < cost) { flash(`Not enough Rune Dust (need ${cost})`); return; }
    dispatch({ type: 'UPGRADE_RUNE', slotIndex });
    flash(`Rune upgraded to Tier ${tier + 1}!`);
  };

  const addToLegendarySlot = (item) => {
    const emptyIdx = legendarySlots.findIndex(s => s === null);
    if (emptyIdx === -1) { flash('Legendary slots full'); return; }
    const slots = [...legendarySlots];
    slots[emptyIdx] = item;
    setLegendarySlots(slots);
  };

  const handleLegendaryCraft = () => {
    const filled = legendarySlots.filter(Boolean);
    if (filled.length < 3) { flash('Need 3 rare items'); return; }
    if (!filled.every(i => i.rarity === 'rare')) { flash('All 3 items must be Rare'); return; }
    const slotTypes = [...new Set(filled.map(i => i.slot))];
    if (slotTypes.length > 1) { flash(`All 3 items must be the same slot (found: ${slotTypes.join(', ')})`); return; }
    if (runeDust < LEGENDARY_CRAFT_COST) { flash(`Not enough Rune Dust (need ${LEGENDARY_CRAFT_COST})`); return; }
    const itemIds = filled.map(i => i.id);
    const success = Math.random() < 0.25;
    if (success) {
      const base = filled[0];
      const newItem = {
        ...base,
        id: 'legendary_' + Date.now(),
        name: 'Ancient ' + base.name,
        rarity: 'legendary',
        gearScore: Math.round(base.gearScore * 1.5),
        affixes: [rollAffix('legendary'), rollAffix('legendary'), rollAffix('legendary')].filter(Boolean),
      };
      dispatch({ type: 'CRAFT_LEGENDARY_RESULT', itemIds, newItem });
      flash('🌟 Legendary item created!');
    } else {
      const base = filled[0];
      const newItem = { ...base, id: 'magic_' + Date.now(), rarity: 'magic', affixes: [rollAffix('magic')].filter(Boolean) };
      dispatch({ type: 'CRAFT_LEGENDARY_RESULT', itemIds, newItem });
      flash(`The ritual failed... "${newItem.name}" was returned to inventory.`);
      setSelectedItem(newItem);
    }
    setLegendarySlots([null, null, null]);
    if (success) setSelectedItem(null);
  };

  const rarityClass = (r) => `rarity-${r || 'normal'}`;

  return (
    <div className="crafting-screen">
      <div className="craft-header">
        <h2>⚗️ Crafting Bench</h2>
        <div className="craft-dust">🔮 {runeDust} Rune Dust</div>
      </div>

      {message && <div className="craft-message">{message}</div>}

      <div className="craft-layout">
        <div className="craft-inventory">
          <h3>Inventory</h3>
          <div className="craft-item-list">
            {inventory.length === 0 && <p className="craft-empty">No items</p>}
            {inventory.map(item => (
              <div
                key={item.id}
                className={`craft-item ${selectedItem?.id === item.id ? 'selected' : ''} ${rarityClass(item.rarity)}`}
                onClick={() => { setSelectedItem(selectedItem?.id === item.id ? null : item); setSelectedAffixIndex(null); }}
              >
                <span className="ci-name">{item.name}</span>
                <span className="ci-gs">GS{item.gearScore}</span>
                {item.corrupted && <span className="ci-corrupt">☠</span>}
                {item.rarity !== 'unique' && (
                  <button className="ci-leg-btn" onClick={(e) => { e.stopPropagation(); addToLegendarySlot(item); }} title="Add to legendary recipe">+</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="craft-main">
          {selectedItem ? (
            <div className="craft-detail">
              <div className={`cd-name ${rarityClass(selectedItem.rarity)}`}>{selectedItem.name}</div>
              <div className="cd-meta">{selectedItem.slot} · GS {selectedItem.gearScore} · {selectedItem.rarity}</div>
              {selectedItem.corrupted && <div className="cd-corrupt">⚠️ Corrupted (cannot craft further)</div>}
              <div className="cd-affixes">
                {(selectedItem.affixes || []).map((a, i) => (
                  <div
                    key={i}
                    className={`cd-affix${selectedItem.rarity === 'rare' && selectedAffixIndex === i ? ' affix-targeted' : ''}`}
                    onClick={() => selectedItem.rarity === 'rare' && !selectedItem.corrupted && setSelectedAffixIndex(i)}
                    title={selectedItem.rarity === 'rare' && !selectedItem.corrupted ? 'Click to target for reroll' : ''}
                  >
                    +{a.value}{a.unit} {a.name}
                  </div>
                ))}
                {(!selectedItem.affixes || selectedItem.affixes.length === 0) && <div className="cd-affix dim">No affixes</div>}
              </div>

              {selectedItem.rarity === 'unique' ? (
                <div className="craft-unique-lock">
                  {selectedItem.flavourText && (
                    <div className="unique-flavour">"{selectedItem.flavourText}"</div>
                  )}
                  {selectedItem.uniqueEffect && (
                    <div className="unique-effect">✦ {selectedItem.uniqueEffect.description}</div>
                  )}
                  <div className="craft-locked-msg">⚠️ Unique items cannot be modified.</div>
                </div>
              ) : !selectedItem.corrupted ? (
                <div className="craft-ops">
                  {selectedItem.rarity === 'rare' && (
                    <button className="craft-btn" onClick={handleReroll} disabled={selectedAffixIndex === null}>
                      Reroll Affix <span className="cost">50 Dust</span>
                    </button>
                  )}
                  {['magic', 'rare', 'legendary'].includes(selectedItem.rarity) && (
                    <button className="craft-btn" onClick={handleAugment} disabled={(selectedItem.affixes || []).length >= (MAX_AFFIXES[selectedItem.rarity] || 6)}>
                      Augment <span className="cost">{AUGMENT_COST[selectedItem.rarity] || 30} Dust</span>
                    </button>
                  )}
                  {selectedItem.rarity !== 'normal' && (
                    <button
                      className="craft-btn craft-corrupt-btn"
                      onClick={handleCorrupt}
                      title={isEquipped ? '⚠️ This item is currently equipped!' : ''}
                    >
                      Corrupt {isEquipped && '⚠️'} <span className="cost">100 Dust</span>
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="craft-placeholder">← Select an item to craft</div>
          )}

          <div className="craft-rune-upgrade">
            <h3>Upgrade Skill Rune</h3>
            <div className="rune-slots">
              {skillSlots.map((slot, i) => {
                if (!slot.skillRune) return <div key={i} className="rune-slot-row empty">Slot {i + 1}: Empty</div>;
                const tier = slot.skillRune.tier || 1;
                const cost = 200 * tier;
                const atMax = tier >= MAX_RUNE_TIER;
                return (
                  <div key={i} className="rune-slot-row">
                    <span>{slot.skillRune.name} (Tier {tier}{atMax ? ' — MAX' : ''})</span>
                    <button
                      className="craft-btn small"
                      onClick={() => handleUpgradeRune(i)}
                      disabled={atMax}
                    >
                      {atMax ? 'Maxed' : `Upgrade (${cost} Dust)`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="craft-legendary-section">
        <h3>🌟 Legendary Recipe</h3>
        <p className="legend-desc">Add 3 Rare items of the same slot for a 25% chance at a Legendary.</p>
        <div className="legend-slots">
          {legendarySlots.map((item, i) => (
            <div key={i} className="legend-slot" onClick={() => {
              if (item) { const s = [...legendarySlots]; s[i] = null; setLegendarySlots(s); }
            }}>
              {item ? (
                <span className={rarityClass(item.rarity)}>{item.name} <span className="remove-x">×</span></span>
              ) : (
                <span className="dim">Empty (click item +)</span>
              )}
            </div>
          ))}
        </div>
        <button
          className="craft-btn legend-btn"
          disabled={legendarySlots.filter(Boolean).length < 3 || new Set(legendarySlots.filter(Boolean).map(i => i.slot)).size > 1 || runeDust < LEGENDARY_CRAFT_COST}
          onClick={handleLegendaryCraft}
        >
          Craft Legendary ({LEGENDARY_CRAFT_COST} Dust)
        </button>
      </div>
    </div>
  );
}
