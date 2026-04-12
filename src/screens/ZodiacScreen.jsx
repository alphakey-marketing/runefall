import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext.jsx';
import { ZODIAC_NODES, ZODIAC_CONSTELLATIONS, isNodeAllocatable, isNodeRemovable } from '../engine/ZodiacSystem.js';
import './ZodiacScreen.css';

export default function ZodiacScreen() {
  const { state: playerState, dispatch } = usePlayer();
  const { allocatedNodes, zodiacPoints, runeDust, level, levelUpPending } = playerState;
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, node: null });

  const constellationMap = {};
  ZODIAC_CONSTELLATIONS.forEach(c => { constellationMap[c.id] = c; });

  const getNodeColor = (node) => {
    if (node.type === 'origin') return '#ffd700';
    const constellation = constellationMap[node.constellation];
    return constellation ? constellation.color : '#888';
  };

  const getNodeState = (node) => {
    if (allocatedNodes.includes(node.id)) return 'allocated';
    if (node.type === 'origin') return 'origin';
    if (isNodeAllocatable(node.id, allocatedNodes)) return 'allocatable';
    return 'locked';
  };

  const handleNodeClick = (node) => {
    const state = getNodeState(node);
    if (state === 'allocatable' && zodiacPoints > 0) {
      dispatch({ type: 'ALLOCATE_NODE', nodeId: node.id });
    }
  };

  const handleNodeRightClick = (e, node) => {
    e.preventDefault();
    if (allocatedNodes.includes(node.id) && node.type !== 'origin') {
      if (isNodeRemovable(node.id, allocatedNodes)) {
        if (runeDust >= 50) {
          dispatch({ type: 'RESPEC_NODE', nodeId: node.id });
        }
      }
    }
  };

  const handleNodeHover = (e, node) => {
    setHoveredNode(node);
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, node });
  };

  const handleNodeLeave = () => {
    setHoveredNode(null);
    setTooltip({ visible: false, x: 0, y: 0, node: null });
  };

  const drawnConnections = new Set();

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

      <div className="zodiac-info-bar">
        <span className="zodiac-points">⭐ {zodiacPoints} Zodiac Point{zodiacPoints !== 1 ? 's' : ''}</span>
        <span className="zodiac-dust">🔮 {runeDust} Rune Dust</span>
        <span className="zodiac-hint">Click allocatable node to spend a point · Right-click to respec (50 Dust)</span>
      </div>

      <div className="zodiac-svg-container">
        <svg viewBox="0 0 1200 800" className="zodiac-svg" preserveAspectRatio="xMidYMid meet">
          {/* Draw connections */}
          {ZODIAC_NODES.map(node =>
            node.connections.map(connId => {
              const connKey = [node.id, connId].sort().join('-');
              if (drawnConnections.has(connKey)) return null;
              drawnConnections.add(connKey);
              const connNode = ZODIAC_NODES.find(n => n.id === connId);
              if (!connNode) return null;
              const bothAllocated = allocatedNodes.includes(node.id) && allocatedNodes.includes(connId);
              return (
                <line
                  key={connKey}
                  x1={node.x} y1={node.y}
                  x2={connNode.x} y2={connNode.y}
                  className={`zodiac-line ${bothAllocated ? 'line-allocated' : 'line-inactive'}`}
                />
              );
            })
          )}

          {/* Draw nodes */}
          {ZODIAC_NODES.map(node => {
            const nodeState = getNodeState(node);
            const color = getNodeColor(node);
            const isKeystone = node.type === 'keystone';
            const isOrigin = node.type === 'origin';
            const r = isOrigin ? 14 : isKeystone ? 13 : 9;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className={`zodiac-node node-${nodeState}`}
                onClick={() => handleNodeClick(node)}
                onContextMenu={(e) => handleNodeRightClick(e, node)}
                onMouseEnter={(e) => handleNodeHover(e, node)}
                onMouseLeave={handleNodeLeave}
                style={{ cursor: nodeState === 'allocatable' ? 'pointer' : nodeState === 'allocated' && node.type !== 'origin' ? 'context-menu' : 'default' }}
              >
                {nodeState === 'allocated' && (
                  <circle r={r + 5} fill={color} opacity={0.2} />
                )}
                <circle
                  r={r}
                  fill={nodeState === 'locked' ? '#1a1a2e' : nodeState === 'allocated' ? color : nodeState === 'allocatable' ? '#2a2a5a' : color}
                  stroke={nodeState === 'locked' ? '#333' : color}
                  strokeWidth={nodeState === 'allocated' ? 3 : nodeState === 'allocatable' ? 2 : 1}
                  opacity={nodeState === 'locked' ? 0.4 : 1}
                />
                {isOrigin && (
                  <text textAnchor="middle" dy="5" fontSize="12" fill="#ffd700">✦</text>
                )}
                {isKeystone && nodeState === 'allocated' && (
                  <text textAnchor="middle" dy="5" fontSize="10" fill="#fff">★</text>
                )}
              </g>
            );
          })}

          {/* Constellation labels */}
          {ZODIAC_CONSTELLATIONS.map(constellation => {
            const keystoneNode = ZODIAC_NODES.find(n => n.id === constellation.keystoneId);
            if (!keystoneNode) return null;
            return (
              <text
                key={constellation.id}
                x={keystoneNode.x}
                y={keystoneNode.y - 20}
                textAnchor="middle"
                fontSize="10"
                fill={constellation.color}
                opacity={0.7}
                className="constellation-label"
              >
                {constellation.name}
              </text>
            );
          })}

          {/* Tooltip */}
          {tooltip.visible && tooltip.node && (
            <foreignObject
              x={Math.min(tooltip.x + 10, 980)}
              y={Math.min(tooltip.y - 10, 700)}
              width="200"
              height="120"
              className="zodiac-tooltip-fo"
            >
              <div className="zodiac-tooltip">
                <div className="tt-name">{tooltip.node.name}</div>
                {tooltip.node.description && (
                  <div className="tt-desc">{tooltip.node.description}</div>
                )}
                {tooltip.node.bonuses && Object.keys(tooltip.node.bonuses).length > 0 && (
                  <div className="tt-bonuses">
                    {Object.entries(tooltip.node.bonuses).map(([k, v]) => (
                      <div key={k} className="tt-bonus">+{typeof v === 'boolean' ? 'Keystone' : v} {k}</div>
                    ))}
                  </div>
                )}
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  );
}
