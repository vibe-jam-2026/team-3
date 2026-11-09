// Enemies: spawn at the arena edge, chase the nearest living player.

import { ENEMY } from './config.js';

export function spawnEnemy(game) {
  const { width, height, wave } = game;
  const r = ENEMY.radius;
  // Pick a random point on the arena edge, just inside it
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * width; y = r; }
  else if (side === 1) { x = width - r; y = Math.random() * height; }
  else if (side === 2) { x = Math.random() * width; y = height - r; }
  else { x = r; y = Math.random() * height; }

  const hp = ENEMY.baseHp + ENEMY.hpPerWave * (wave - 1);
  game.enemies.push({
    x, y, r,
    vx: 0, vy: 0,          // knockback velocity
    hp, maxHp: hp,
    speed: ENEMY.baseSpeed + ENEMY.speedPerWave * (wave - 1),
    hitCooldown: 0,
    flash: 0,
    spawnAnim: 0.4,        // fade-in; harmless while spawning
    dead: false,
  });
}

export function updateEnemies(game, dt) {
  const enemies = game.enemies;

  for (const e of enemies) {
    e.hitCooldown = Math.max(0, e.hitCooldown - dt);
    e.flash = Math.max(0, e.flash - dt);
    e.spawnAnim = Math.max(0, e.spawnAnim - dt);

    // Chase nearest player
    const target = nearest(game.players, e);
    if (target) {
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
    }

    // Knockback
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const f = Math.exp(-ENEMY.knockbackFriction * dt);
    e.vx *= f; e.vy *= f;
  }

  // Push overlapping enemies apart so they form a crowd, not a single blob
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.r + b.r;
      const dSq = dx * dx + dy * dy;
      if (dSq >= min * min || dSq === 0) continue;
      const d = Math.sqrt(dSq);
      const push = (min - d) / 2;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
    }
  }

  for (const e of enemies) {
    e.x = Math.max(e.r, Math.min(game.width - e.r, e.x));
    e.y = Math.max(e.r, Math.min(game.height - e.r, e.y));
  }
}

function nearest(players, e) {
  let best = null;
  let bestD = Infinity;
  for (const p of players) {
    const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export function drawEnemies(ctx, enemies) {
  for (const e of enemies) {
    ctx.globalAlpha = 1 - e.spawnAnim / 0.4 * 0.8;
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#e5534b';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();

    // Health bar once damaged
    if (e.hp < e.maxHp) {
      const w = e.r * 2;
      ctx.fillStyle = '#3a1d1d';
      ctx.fillRect(e.x - e.r, e.y - e.r - 7, w, 3);
      ctx.fillStyle = '#ff8a80';
      ctx.fillRect(e.x - e.r, e.y - e.r - 7, w * (e.hp / e.maxHp), 3);
    }
  }
  ctx.globalAlpha = 1;
}
