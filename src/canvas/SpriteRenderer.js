const ELEMENT_COLORS = {
  fire: '#ff6622', ice: '#44aaff', lightning: '#ffe033',
  physical: '#aaaaaa', poison: '#44ff88', chaos: '#cc44ff', default: '#ffffff'
};

function getElementColor(element) {
  return ELEMENT_COLORS[element] || ELEMENT_COLORS.default;
}

export function drawPlayer(ctx, x, y, hpRatio, element = 'physical') {
  const color = getElementColor(element);
  const opacity = Math.max(0.2, hpRatio);

  ctx.globalAlpha = opacity * 0.3;
  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.globalAlpha = opacity;
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧙', x, y);

  ctx.globalAlpha = 1;
}

export function drawEnemy(ctx, x, y, hpRatio, archetype = 'humanoid', element = 'physical') {
  const color = getElementColor(element);
  const opacity = Math.max(0.1, hpRatio);

  ctx.globalAlpha = opacity;

  if (archetype === 'humanoid') {
    ctx.fillStyle = color;
    ctx.fillRect(x - 14, y - 28, 28, 40);
    ctx.beginPath();
    ctx.arc(x, y - 36, 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  } else if (archetype === 'beast') {
    ctx.fillStyle = color;
    ctx.fillRect(x - 22, y - 16, 44, 22);
    ctx.beginPath();
    ctx.arc(x + 18, y - 16, 10, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y - 14, 22, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = opacity * 0.4;
    ctx.beginPath();
    ctx.arc(x, y - 14, 30, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.globalAlpha = opacity;
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(archetype === 'beast' ? '🐺' : archetype === 'elemental' ? '🔮' : '💀', x, y - 14);

  ctx.globalAlpha = 1;
}

export function drawHpBar(ctx, cx, y, width, ratio, color) {
  const x = cx - width / 2;
  const barH = 7;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x, y, width, barH);
  ctx.fillStyle = ratio > 0.5 ? color : ratio > 0.25 ? '#ffaa00' : '#ff3333';
  ctx.fillRect(x, y, Math.max(0, width * Math.min(1, ratio)), barH);
  ctx.globalAlpha = 1;
}

export function drawFloatingNumber(ctx, x, y, text, color, alpha) {
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = color;
  ctx.font = `bold ${alpha > 0.7 ? 16 : 13}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}
