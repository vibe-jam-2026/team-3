// Coins: dropped by enemies, collected by running over them with either player.
// The team shares one wallet (game.coins). Coins left on the floor are lost when the wave ends.

import { COINS } from './config.js';

export function dropCoins(game, e) {
  const value = COINS.dropByTier[e.tier] ?? 1;
  // One coin per point of value, scattered a little
  for (let i = 0; i < value; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = value > 1 ? 40 + Math.random() * 90 : 0;
    game.floorCoins.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      spin: Math.random() * Math.PI * 2,
      age: 0,
    });
  }
}

export function updateCoins(game, dt) {
  const keep = [];
  for (const c of game.floorCoins) {
    c.age += dt;
    c.spin += dt * 5;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    const f = Math.exp(-6 * dt);
    c.vx *= f; c.vy *= f;
    c.x = Math.max(COINS.radius, Math.min(game.width - COINS.radius, c.x));
    c.y = Math.max(COINS.radius, Math.min(game.height - COINS.radius, c.y));

    let picked = null;
    if (c.age > 0.15) {
      for (const p of game.players) {
        const r = COINS.radius + p.r; // touching the player
        if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < r * r) { picked = p; break; }
      }
    }
    if (picked) {
      game.coins += 1;
      game.waveCoins += 1;
      game.effects.push({
        kind: 'coinpop', x: c.x, y: c.y, vx: 0, vy: -40, angle: 0, spin: 0,
        drag: 1, life: 0.35, maxLife: 0.35,
      });
    } else {
      keep.push(c);
    }
  }
  game.floorCoins = keep;
}

export function drawCoins(ctx, coins) {
  const r = COINS.radius;
  for (const c of coins) {
    const w = Math.abs(Math.cos(c.spin)); // spinning: squash horizontally
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(c.x + 1, c.y + r * 0.9, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffca28';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, Math.max(1.5, r * w), r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (w > 0.4) {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.ellipse(c.x - r * 0.25 * w, c.y - r * 0.3, r * 0.25 * w, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Small "+1" that floats up when a coin is collected (drawn by the effects code). */
export function drawCoinPop(ctx, f) {
  ctx.fillStyle = '#ffd54f';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+1', 0, 0);
}

/** Coin icon for the HUD. */
export function drawCoinIcon(ctx, x, y, r) {
  ctx.fillStyle = '#ffca28';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
