import React, { useState, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { ZODIAC_NODES, ZODIAC_CONSTELLATIONS, isNodeAllocatable, isNodeRemovable } from '../engine/ZodiacSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import './ZodiacScreen.css';

/** Build the ordered node chain for a constellation (gateway → minors → keystone) */
function buildChain(constellation) {
  const conNodes = ZODIAC_NODES.filter(n => n.constellation === constellation.id);
  const nodeById = Object.fromEntries(conNodes.map(n => [n.id, n]));
  const gateway = conNodes.find(n => n.type === 'gateway');
  if (!gateway) return conNodes;

  const chain = [];
  const visited = new Set();
  let current = gateway;
  while (current) {
    chain.push(current);
    visited.add(current.id);
    const next = current.connections
      .map(id => nodeById[id])
      .find(n => n && !visited.has(n.id));
    current = next || null;
  }
  return chain;
}

/** Format bonus value for display */
function formatBonus(key, val) {
  if (typeof val === 'boolean') return 'Keystone ability';
  const unit = key.includes('Bonus') || key.includes('Chance') || key.includes('Multiplier') ? '%' : '';
  return `+${val}${unit} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
}

/** Single node circle button — tooltip is lifted to parent via onShowTip/onHideTip */
function ZodiacNode({ node, nodeState, color, onClick, onRespec, canRespec, onShowTip, onHideTip }) {
  const isKeystone = node.type === 'keystone';
  const isGateway = node.type === 'gateway';
  const isAllocated = nodeState === 'allocated';
  const isAllocatable = nodeState === 'allocatable';

  const handleMouseEnter = (e) => {
    onShowTip(node, nodeState, color, canRespec, e.clientX, e.clientY);
  };
  const handleMouseMove = (e) => {
    onShowTip(node, nodeState, color, canRespec, e.clientX, e.clientY);
  };

  return (
    <div
      className="zn-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={onHideTip}
    >
      <button
        className={`zn-btn zn-${nodeState}${isKeystone ? ' zn-keystone' : ''}${isGateway ? ' zn-gateway' : ''}`}
        style={{ '--node-color': color }}
        onClick={onClick}
        disabled={!isAllocatable && !isAllocated}
        aria-label={node.name}
      >
        {isKeystone ? '★' : isGateway ? '◎' : isAllocated ? '●' : isAllocatable ? '○' : '·'}
      </button>

      {isAllocated && node.type !== 'origin' && canRespec && (
        <button className="zn-respec-btn" onClick={onRespec} title="Respec (50 🔮)">↩</button>
      )}
    </div>
  );
}

/** One constellation card showing its linear chain */
function ConstellationCard({ constellation, allocatedNodes, zodiacPoints, runeDust, dispatch, onShowTip, onHideTip, onRequestAlloc }) {
  const chain = buildChain(constellation);
  const allocatedCount = chain.filter(n => allocatedNodes.includes(n.id)).length;
  const keystoneNode = chain.find(n => n.type === 'keystone');
  const keystoneAllocated = keystoneNode && allocatedNodes.includes(keystoneNode.id);

  const getNodeState = (node) => {
    if (allocatedNodes.includes(node.id)) return 'allocated';
    if (isNodeAllocatable(node.id, allocatedNodes)) return 'allocatable';
    return 'locked';
  };

  const handleClick = (node) => {
    const ns = getNodeState(node);
    if (ns === 'allocatable' && zodiacPoints > 0) {
      onRequestAlloc(node, constellation.color);
    }
  };

  const handleRespec = (node) => {
    if (allocatedNodes.includes(node.id) && node.type !== 'origin' && runeDust >= 50) {
      if (isNodeRemovable(node.id, allocatedNodes)) {
        dispatch({ type: 'RESPEC_NODE', nodeId: node.id });
      }
    }
  };

  return (
    <div className={`constellation-card${keystoneAllocated ? ' con-card-active' : ''}`}>
      <div className="con-card-header" style={{ borderColor: constellation.color }}>
        <span className="con-card-name" style={{ color: constellation.color }}>{constellation.name}</span>
        <span className="con-card-theme">{constellation.theme}</span>
        <span className="con-card-progress">{allocatedCount}/{chain.length}</span>
      </div>

      <div className="con-chain">
        {chain.map((node, i) => (
          <React.Fragment key={node.id}>
            {i > 0 && (
              <div className={`con-connector${allocatedNodes.includes(chain[i - 1].id) && allocatedNodes.includes(node.id) ? ' con-connector-active' : ''}`}
                style={{ '--node-color': constellation.color }} />
            )}
            <ZodiacNode
              node={node}
              nodeState={getNodeState(node)}
              color={constellation.color}
              onClick={() => handleClick(node)}
              onRespec={() => handleRespec(node)}
              canRespec={runeDust >= 50}
              onShowTip={onShowTip}
              onHideTip={onHideTip}
            />
          </React.Fragment>
        ))}
      </div>

      {keystoneAllocated && keystoneNode && (
        <div className="con-keystone-active" style={{ color: constellation.color }}>
          ★ {keystoneNode.description}
        </div>
      )}
    </div>
  );
}

/** Fixed-position tooltip rendered at the ZodiacScreen level, escapes all overflow clipping */
function ZodiacTooltip({ tip }) {
  if (!tip.visible || !tip.node) return null;

  const { node, nodeState, color, canRespec } = tip;
  const bonusLines = node.bonuses
    ? Object.entries(node.bonuses).map(([k, v]) => formatBonus(k, v))
    : [];
  const isAllocated = nodeState === 'allocated';
  const isAllocatable = nodeState === 'allocatable';

  // Place tooltip above cursor, nudged to stay on-screen
  const TOOLTIP_W = 220;
  const TOOLTIP_OFFSET = 16;
  let left = tip.x + TOOLTIP_OFFSET;
  let top = tip.y - TOOLTIP_OFFSET;
  if (left + TOOLTIP_W > window.innerWidth - 8) {
    left = tip.x - TOOLTIP_W - TOOLTIP_OFFSET;
  }
  if (top < 8) top = tip.y + TOOLTIP_OFFSET;

  return (
    <div
      className="zn-tooltip-fixed"
      style={{ left, top, '--tip-color': color }}
    >
      <div className="zn-tt-name" style={{ color }}>{node.name}</div>
      {node.description && <div className="zn-tt-desc">{node.description}</div>}
      {bonusLines.map((b, i) => <div key={i} className="zn-tt-bonus">{b}</div>)}
      {isAllocatable && <div className="zn-tt-hint">Click to allocate (1 point)</div>}
      {isAllocated && node.type !== 'origin' && canRespec && (
        <div className="zn-tt-respec">Tap ↩ to respec (50 🔮)</div>
      )}
      {nodeState === 'locked' && <div className="zn-tt-locked">🔒 Allocate previous node first</div>}
    </div>
  );
}

export default function ZodiacScreen() {
  const { state: playerState, dispatch } = usePlayer();
  const { allocatedNodes, zodiacPoints, runeDust } = playerState;

  const [tip, setTip] = useState({ visible: false, x: 0, y: 0, node: null, nodeState: '', color: '', canRespec: false });
  const [pendingAlloc, setPendingAlloc] = useState(null); // { node, color }

  const handleShowTip = useCallback((node, nodeState, color, canRespec, x, y) => {
    setTip({ visible: true, node, nodeState, color, canRespec, x, y });
  }, []);

  const handleHideTip = useCallback(() => {
    setTip(t => ({ ...t, visible: false }));
  }, []);

  const handleRequestAlloc = useCallback((node, color) => {
    setPendingAlloc({ node, color });
    setTip(t => ({ ...t, visible: false }));
  }, []);

  const handleConfirmAlloc = () => {
    if (!pendingAlloc) return;
    dispatch({ type: 'ALLOCATE_NODE', nodeId: pendingAlloc.node.id });
    AudioManager.play(pendingAlloc.node.type === 'keystone' ? 'keystoneAlloc' : 'nodeAlloc');
    setPendingAlloc(null);
  };

  const handleCancelAlloc = () => {
    setPendingAlloc(null);
  };

  // Compute active bonuses summary
  const activeBonuses = {};
  allocatedNodes.forEach(nodeId => {
    const node = ZODIAC_NODES.find(n => n.id === nodeId);
    if (!node || !node.bonuses) return;
    Object.entries(node.bonuses).forEach(([k, v]) => {
      if (typeof v === 'boolean') activeBonuses[k] = true;
      else activeBonuses[k] = (activeBonuses[k] || 0) + v;
    });
  });
  const bonusSummary = Object.entries(activeBonuses);

  return (
    <div className="zodiac-screen">
      {/* Confirm allocation modal */}
      {pendingAlloc && (
        <div className="zn-confirm-overlay" onClick={handleCancelAlloc}>
          <div className="zn-confirm-modal" style={{ '--tip-color': pendingAlloc.color }} onClick={e => e.stopPropagation()}>
            <div className="zn-confirm-title" style={{ color: pendingAlloc.color }}>Allocate Node?</div>
            <div className="zn-confirm-name">{pendingAlloc.node.name}</div>
            {pendingAlloc.node.description && (
              <div className="zn-confirm-desc">{pendingAlloc.node.description}</div>
            )}
            {pendingAlloc.node.bonuses && (
              <div className="zn-confirm-bonuses">
                {Object.entries(pendingAlloc.node.bonuses).map(([k, v]) => (
                  <div key={k} className="zn-confirm-bonus">{formatBonus(k, v)}</div>
                ))}
              </div>
            )}
            <div className="zn-confirm-cost">Cost: 1 Zodiac Point (you have {zodiacPoints})</div>
            <div className="zn-confirm-btns">
              <button className="zn-confirm-btn-ok" onClick={handleConfirmAlloc}>✔ Confirm</button>
              <button className="zn-confirm-btn-cancel" onClick={handleCancelAlloc}>✕ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Info bar */}
      <div className="zodiac-info-bar">
        <div className="zodiac-info-left">
          <span className="zodiac-points-badge">⭐ {zodiacPoints} {zodiacPoints === 1 ? 'Point' : 'Points'}</span>
          <span className="zodiac-dust-badge">🔮 {runeDust} Dust</span>
          <span className="zodiac-nodes-badge">🌟 {allocatedNodes.length - 1} nodes</span>
        </div>
        <div className="zodiac-info-hint">
          {zodiacPoints > 0
            ? `${zodiacPoints} point${zodiacPoints > 1 ? 's' : ''} to spend — click a highlighted node`
            : 'Level up to earn Zodiac Points · Respec costs 50 Rune Dust'}
        </div>
      </div>

      {/* Active bonuses summary */}
      {bonusSummary.length > 0 && (
        <div className="zodiac-bonuses-bar">
          <span className="zb-label">Active:</span>
          {bonusSummary.map(([k, v]) => (
            <span key={k} className={`zb-tag${typeof v === 'boolean' ? ' zb-tag-keystone' : ''}`}>
              {typeof v === 'boolean' ? `★ ${k}` : `+${v} ${k.replace(/([A-Z])/g, ' $1').replace('Bonus', '').trim()}`}
            </span>
          ))}
        </div>
      )}

      {/* Constellation cards */}
      <div className="zodiac-cards">
        {ZODIAC_CONSTELLATIONS.map(constellation => (
          <ConstellationCard
            key={constellation.id}
            constellation={constellation}
            allocatedNodes={allocatedNodes}
            zodiacPoints={zodiacPoints}
            runeDust={runeDust}
            dispatch={dispatch}
            onShowTip={handleShowTip}
            onHideTip={handleHideTip}
            onRequestAlloc={handleRequestAlloc}
          />
        ))}
      </div>

      {/* Single fixed-position tooltip, escapes all overflow clipping */}
      <ZodiacTooltip tip={tip} />
    </div>
  );
}
