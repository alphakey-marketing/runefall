import React, { useState } from 'react';
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

/** Single node circle button */
function ZodiacNode({ node, nodeState, color, onClick, onRespec, canRespec }) {
  const [showTip, setShowTip] = useState(false);

  const isKeystone = node.type === 'keystone';
  const isGateway = node.type === 'gateway';
  const isAllocated = nodeState === 'allocated';
  const isAllocatable = nodeState === 'allocatable';

  const bonusLines = node.bonuses
    ? Object.entries(node.bonuses).map(([k, v]) => formatBonus(k, v))
    : [];

  return (
    <div className="zn-wrapper" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <button
        className={`zn-btn zn-${nodeState}${isKeystone ? ' zn-keystone' : ''}${isGateway ? ' zn-gateway' : ''}`}
        style={{ '--node-color': color }}
        onClick={onClick}
        disabled={!isAllocatable && !isAllocated}
        aria-label={node.name}
      >
        {isKeystone ? '★' : isGateway ? '◎' : isAllocated ? '●' : isAllocatable ? '○' : '·'}
      </button>

      {showTip && (
        <div className="zn-tooltip">
          <div className="zn-tt-name">{node.name}</div>
          {node.description && <div className="zn-tt-desc">{node.description}</div>}
          {bonusLines.map((b, i) => <div key={i} className="zn-tt-bonus">{b}</div>)}
          {isAllocated && canRespec && (
            <div className="zn-tt-respec">Right-click / tap Respec to remove (50 🔮)</div>
          )}
          {isAllocatable && <div className="zn-tt-hint">Click to allocate (1 point)</div>}
          {nodeState === 'locked' && <div className="zn-tt-locked">🔒 Allocate previous node first</div>}
        </div>
      )}

      {isAllocated && node.type !== 'origin' && canRespec && (
        <button className="zn-respec-btn" onClick={onRespec} title="Respec (50 🔮)">↩</button>
      )}
    </div>
  );
}

/** One constellation card showing its linear chain */
function ConstellationCard({ constellation, allocatedNodes, zodiacPoints, runeDust, dispatch }) {
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
      dispatch({ type: 'ALLOCATE_NODE', nodeId: node.id });
      AudioManager.play(node.type === 'keystone' ? 'keystoneAlloc' : 'nodeAlloc');
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

export default function ZodiacScreen() {
  const { state: playerState, dispatch } = usePlayer();
  const { allocatedNodes, zodiacPoints, runeDust, level, levelUpPending } = playerState;

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
      {levelUpPending && (
        <div className="level-up-overlay">
          <div className="level-up-box">
            <span className="level-up-emoji">⬆️</span>
            <div className="level-up-title">LEVEL UP!</div>
            <div className="level-up-msg">You are now Level {level}! +1 Zodiac Point</div>
            <button className="level-up-dismiss" onClick={() => dispatch({ type: 'DISMISS_LEVEL_UP' })}>
              Dismiss
            </button>
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
          />
        ))}
      </div>
    </div>
  );
}
