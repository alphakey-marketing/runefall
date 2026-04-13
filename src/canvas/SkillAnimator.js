const ELEMENT_COLORS = {
  fire: '#ff6622', ice: '#44aaff', lightning: '#ffe033',
  physical: '#cccccc', poison: '#44ff88', chaos: '#cc44ff', default: '#ffffff'
};

export function createSkillAnimation(element, fromX, fromY, toX, toY) {
  return {
    type: 'projectile',
    x: fromX, y: fromY,
    targetX: toX, targetY: toY,
    element,
    progress: 0,
    duration: 400,
    alpha: 1,
    color: ELEMENT_COLORS[element] || ELEMENT_COLORS.default,
  };
}

export function createDamageNumber(x, y, damage, isCrit = false, isStatus = false, element = 'physical') {
  const color = isCrit ? '#ffd700' : isStatus ? (ELEMENT_COLORS[element] || '#ffffff') : '#ffffff';
  return {
    type: 'damageNumber',
    x: x + (Math.random() - 0.5) * 30,
    y,
    text: isCrit ? `${damage}!` : `${damage}`,
    color,
    alpha: 1,
    progress: 0,
    duration: 600,
    isCrit,
    isStatus,
    fontSize: isCrit ? 18 : isStatus ? 12 : 15,
  };
}

export function updateAnimations(animations, deltaMs) {
  for (let i = animations.length - 1; i >= 0; i--) {
    const anim = animations[i];
    anim.progress += deltaMs / anim.duration;
    if (anim.type === 'damageNumber') {
      anim.y -= deltaMs * 0.04;
      anim.alpha = Math.max(0, 1 - anim.progress);
    } else if (anim.type === 'projectile') {
      anim.alpha = anim.progress > 0.8 ? Math.max(0, 1 - (anim.progress - 0.8) * 5) : 1;
    }
    if (anim.progress >= 1) {
      animations.splice(i, 1);
    }
  }
}

export function drawAnimations(ctx, animations) {
  for (const anim of animations) {
    if (anim.type === 'projectile') {
      const px = anim.x + (anim.targetX - anim.x) * anim.progress;
      const py = anim.y + (anim.targetY - anim.y) * anim.progress;
      ctx.globalAlpha = anim.alpha;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = anim.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.strokeStyle = anim.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = anim.alpha * 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (anim.type === 'damageNumber') {
      ctx.globalAlpha = anim.alpha;
      ctx.fillStyle = anim.color;
      ctx.font = `bold ${anim.fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(anim.text, anim.x, anim.y);
      ctx.globalAlpha = 1;
    }
  }
}
