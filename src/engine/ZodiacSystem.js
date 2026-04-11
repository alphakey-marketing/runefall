// ZodiacSystem.js — Placeholder for future zodiac/passive tree implementation
export const ZODIAC_NODES = [];

export function applyZodiacBonuses(allocatedNodes) {
  const bonuses = {};
  allocatedNodes.forEach(nodeId => {
    const node = ZODIAC_NODES.find(n => n.id === nodeId);
    if (!node) return;
    Object.entries(node.bonuses || {}).forEach(([key, val]) => {
      bonuses[key] = (bonuses[key] || 0) + val;
    });
  });
  return bonuses;
}
