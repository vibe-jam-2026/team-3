// Rats: neutral critters. They never hurt the players, but they hunt eggs:
// a rat runs to the nearest egg, cracks it in one bite, then sits and eats it for
// a couple of seconds. The chain kills rats like any other enemy.

import { RATS } from './config.js';

const FUR = '#8d8a93';
const FUR_DARK = '#6c6873';
const BELLY = '#b9b5bf';
const PINK = '#f2a7b5';

/** Rat behaviour for one step. Called from updateEnemies instead of "chase a player". */
export function updateRat(game, e, dt) {
  if (e.state === 'eat') {
    e.eatTimer -= dt;
    if (e.eatTimer <= 0) e.state = 'seek';
    return;
  }

  // Find the nearest egg that is fully spawned
  let egg = null;
  let best = Infinity;
  for (const o of game.enemies) {
    if (o.type !== 'egg' || o.dead || o.hp <= 0 || o.spawnAnim > 0) continue;
    const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
    if (d < best) { best = d; egg = o; }
  }

  let tx, ty;
  if (egg) {
    tx = egg.x; ty = egg.y;
    // Bite!
    if (Math.sqrt(best) < e.r + egg.r + 2) {
      egg.hp = 0;
      egg.killedBy = 'rat';
      egg.lastHitVx = (egg.x - e.x) * 3;
      egg.lastHitVy = (egg.y - e.y) * 3;
      e.state = 'eat';
      e.eatTimer = RATS.eatTime;
      return;
    }
  } else {
    // No eggs: scurry around, changing direction now and then
    e.wanderTimer -= dt;
    if (e.wanderTimer <= 0) {
      e.wanderAngle = Math.random() * Math.PI * 2;
      e.wanderTimer = 0.8 + Math.random() * 1.2;
    }
    tx = e.x + Math.cos(e.wanderAngle) * 100;
    ty = e.y + Math.sin(e.wanderAngle) * 100;
  }

  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const speed = egg ? e.speed : e.speed * 0.5;
  e.x += (dx / d) * speed * dt;
  e.y += (dy / d) * speed * dt;

  // Bounce off the arena walls while wandering
  if (!egg && (e.x < e.r * 2 || e.x > game.width - e.r * 2 || e.y < e.r * 2 || e.y > game.height - e.r * 2)) {
    e.wanderAngle = Math.atan2(game.height / 2 - e.y, game.width / 2 - e.x);
  }
}

/** Side view, flipped to face the way it moves. Bobs its head while eating. */
export function drawRat(ctx, e, scale = 1) {
  const r = e.r;
  const eating = e.state === 'eat';
  const step = Math.sin(e.walk * 3);
  const flash = e.flash > 0;

  ctx.save();
  ctx.translate(e.x, e.y);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.75, r * 1.0 * scale, r * 0.25 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(e.facing * scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Tail: a long pink curve that swishes
  const swish = eating ? Math.sin(performance.now() / 150) * 0.3 : step * 0.25;
  ctx.strokeStyle = PINK;
  ctx.lineWidth = Math.max(1.5, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, r * 0.2);
  ctx.quadraticCurveTo(-r * 1.7, r * (0.6 + swish), -r * 2.1, r * (-0.1 + swish));
  ctx.stroke();

  // Feet
  ctx.strokeStyle = PINK;
  ctx.lineWidth = Math.max(1.2, r * 0.12);
  for (const side of [-1, 1]) {
    const sw = eating ? 0 : step * side * r * 0.2;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.4, r * 0.4);
    ctx.lineTo(side * r * 0.4 + sw, r * 0.7);
    ctx.stroke();
  }

  // Body
  ctx.fillStyle = flash ? '#fff' : FUR;
  ctx.strokeStyle = '#3f3c45';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, r * 0.05, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = flash ? '#fff' : BELLY;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.3, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head (dips down to nibble while eating)
  const nod = eating ? Math.abs(Math.sin(performance.now() / 90)) * r * 0.2 : 0;
  ctx.save();
  ctx.translate(r * 0.85, -r * 0.05 + nod);
  ctx.fillStyle = flash ? '#fff' : FUR;
  ctx.strokeStyle = '#3f3c45';
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.35);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.35, r * 0.7, r * 0.05); // pointy snout
  ctx.quadraticCurveTo(r * 0.3, r * 0.35, -r * 0.35, r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ear
  ctx.fillStyle = flash ? '#fff' : FUR_DARK;
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.4, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PINK;
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.4, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  // Nose + eye
  ctx.fillStyle = '#e57389';
  ctx.beginPath();
  ctx.arc(r * 0.7, r * 0.05, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(r * 0.2, -r * 0.08, Math.max(1, r * 0.08), 0, Math.PI * 2);
  ctx.fill();
  // Whiskers
  ctx.strokeStyle = 'rgba(30, 30, 30, 0.6)';
  ctx.lineWidth = 0.8;
  for (const w of [-0.12, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.6, r * 0.05);
    ctx.lineTo(r * 1.05, r * (0.05 + w * 1.8));
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();

  // Little yolk-coloured crumbs while it eats
  if (eating) {
    ctx.fillStyle = '#ffc93c';
    const t = performance.now() / 120;
    for (let i = 0; i < 3; i++) {
      const a = t + i * 2.1;
      ctx.fillRect(e.x + e.facing * r * 1.3 + Math.cos(a) * 4, e.y + r * 0.4 + Math.sin(a * 1.3) * 2, 2, 2);
    }
  }
}

/** Death effect: a puff and a few grey tufts of fur (uses the shared feather effect). */
export function furBurst(effects, e, hitVx = 0, hitVy = 0) {
  effects.push({
    kind: 'puff', x: e.x, y: e.y, r: e.r,
    vx: 0, vy: 0, angle: 0, spin: 0,
    life: 0.25, maxLife: 0.25,
  });
  const colors = [FUR, FUR_DARK, BELLY];
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 100;
    effects.push({
      kind: 'feather',
      x: e.x, y: e.y,
      vx: Math.cos(a) * spd + hitVx * 0.12,
      vy: Math.sin(a) * spd + hitVy * 0.12,
      drag: 3,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 6,
      size: e.r * (0.25 + Math.random() * 0.15),
      color: colors[i % colors.length],
      life: 0.7 + Math.random() * 0.4, maxLife: 1.1,
    });
  }
}
