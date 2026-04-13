import zodiacTreeData from '../data/zodiacTree.json';

export const ZODIAC_NODES = zodiacTreeData.nodes;
export const ZODIAC_CONSTELLATIONS = zodiacTreeData.constellations;

export function getNode(nodeId) {
  return ZODIAC_NODES.find(n => n.id === nodeId);
}

export function isNodeAllocatable(nodeId, allocatedNodes) {
  if (nodeId === 'origin') return false;
  const node = getNode(nodeId);
  if (!node) return false;
  if (allocatedNodes.includes(nodeId)) return false;
  return node.connections.some(conn => allocatedNodes.includes(conn));
}

export function isNodeRemovable(nodeId, allocatedNodes) {
  if (nodeId === 'origin') return false;
  if (!allocatedNodes.includes(nodeId)) return false;
  const remaining = allocatedNodes.filter(n => n !== nodeId);
  return areAllReachable(remaining, 'origin');
}

function areAllReachable(allocatedNodes, startId) {
  if (!allocatedNodes.includes(startId)) return true;
  const visited = new Set();
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const node = getNode(current);
    if (!node) continue;
    node.connections.forEach(conn => {
      if (allocatedNodes.includes(conn) && !visited.has(conn)) {
        queue.push(conn);
      }
    });
  }
  return allocatedNodes.every(n => visited.has(n));
}

export function computeZodiacBonuses(allocatedNodes) {
  return applyZodiacBonuses(allocatedNodes);
}

export function applyZodiacBonuses(allocatedNodes) {
  const bonuses = {};
  allocatedNodes.forEach(nodeId => {
    const node = ZODIAC_NODES.find(n => n.id === nodeId);
    if (!node) return;
    Object.entries(node.bonuses || {}).forEach(([key, val]) => {
      if (typeof val === 'boolean') {
        bonuses[key] = val;
      } else {
        bonuses[key] = (bonuses[key] || 0) + val;
      }
    });
  });
  return bonuses;
}

export const KEYSTONE_EFFECTS = {
  conflagration: 'Burn stacks deal 200% increased damage',
  shatter: 'Frozen enemies explode for AoE damage',
  overcharge: 'Shock increases all damage taken by 40%',
  hemorrhage: 'Bleed stacks burst on skill cast',
  pandemic: 'Poison spreads on kill',
  ironWill: '20% of damage taken becomes mana',
  wither: 'Enemies lose 2% max HP/sec per chaos stack',
  windstep: 'Skills with cooldown <1s fire twice',
  bloodMage: 'Skills cost HP; gain bonus damage',
  blademaster: 'Melee: no mana cost; +50% damage',
  necromancersMark: 'On-kill triggers summon minions',
  fortunesEdge: 'Every 5th hit crits; +200% crit damage',
};
