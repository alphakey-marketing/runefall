// BattleRenderer.js — Canvas 2D rendering utilities for the battle scene
export function drawBattleScene(ctx, w, h, result) {
  ctx.clearRect(0, 0, w, h);

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0d0d1a');
  bg.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Ground
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(0, h - 30, w, 30);

  // Player sprite (left side)
  drawCharacter(ctx, w * 0.2, h - 50, '#4a9eff', result === 'defeat' ? 0.4 : 1.0, '🧙');

  // Enemy sprite (right side)
  drawCharacter(ctx, w * 0.8, h - 50, '#ff4a4a', result === 'victory' ? 0.2 : 1.0, '💀');

  // VS text in center
  ctx.fillStyle = '#c4a3ff';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️', w / 2, h / 2);
}

function drawCharacter(ctx, x, y, color, opacity, emoji) {
  ctx.globalAlpha = opacity;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 20, 22, 0, Math.PI * 2);
  ctx.fill();

  // Emoji
  ctx.globalAlpha = opacity;
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.fillText(emoji, x, y - 10);

  ctx.globalAlpha = 1;
}
