// Wormhole: in any normal (non-boss) wave there's a WORMHOLE.chance that a swirling
// wormhole opens somewhere in the arena for a few seconds. If a worm head touches it,
// the worm is pulled through to the other dimension: a different sky, and enemies
// that look a little different. The enemies (and shots) left behind stay behind.
// A wormhole in the other dimension leads back home.

import { WORMHOLE, DEBUG } from './config.js';
import { playWhoosh } from './audio.js';
import { prepareSpace } from './space.js';

/** Decide at the start of a wave whether (and when) a wormhole opens. */
export function rollWormhole(game, isBossWave) {
  game.wormhole = null;
  game.wormholeAt = null;
  if (isBossWave) return;
  const chance = DEBUG.wormhole ? 1 : WORMHOLE.chance;
  if (Math.random() >= chance) return;
  game.wormholeAt = DEBUG.wormhole
    ? 2
    : WORMHOLE.appearMin + Math.random() * (WORMHOLE.appearMax - WORMHOLE.appearMin);
}

function placeWormhole(game) {
  const m = WORMHOLE.radius * 2;
  // Somewhere not right on top of the worm
  let best = null;
  for (let i = 0; i < 20; i++) {
    const x = m + Math.random() * (game.width - m * 2);
    const y = m + Math.random() * (game.height - m * 2);
    const d = Math.min(...game.players.map((p) => Math.hypot(p.x - x, p.y - y)));
    if (!best || d > best.d) best = { x, y, d };
    if (d > 180) break;
  }
  game.wormhole = { x: best.x, y: best.y, r: WORMHOLE.radius, age: 0, life: WORMHOLE.duration };
  // Get the sky on the other side ready now, while the wormhole is opening
  setTimeout(() => prepareSpace(game.width, game.height, game.dimension === 1 ? 0 : 1), 0);
}

export function updateWormhole(game, dt) {
  game.dimensionFlash = Math.max(0, (game.dimensionFlash || 0) - dt);

  if (game.wormholeAt !== null && !game.wormhole && game.waveTime >= game.wormholeAt) {
    game.wormholeAt = null;
    placeWormhole(game);
  }
  const w = game.wormhole;
  if (!w) return;
  w.age += dt;
  if (w.age >= w.life) {
    game.wormhole = null; // closed without anyone going through
    return;
  }
  // A worm head touching the centre goes through
  const open = Math.min(1, w.age / 0.5);
  for (const p of game.players) {
    if (Math.hypot(p.x - w.x, p.y - w.y) < w.r * 0.7 * open + p.r * 0.5) {
      enterWormhole(game);
      return;
    }
  }
}

function enterWormhole(game) {
  game.dimension = game.dimension === 1 ? 0 : 1;
  game.wormhole = null;
  game.dimensionFlash = 0.9;
  // Everything in the old dimension stays behind
  game.enemies = game.enemies.filter((e) => e.boss);
  game.projectiles = [];
  for (const p of game.players) p.invuln = Math.max(p.invuln, 1);
  playWhoosh();
}

/** The swirling wormhole. Grows in when it opens and shrinks away when it closes. */
export function drawWormhole(ctx, game) {
  const w = game.wormhole;
  if (!w) return;
  const t = performance.now() / 1000;
  const grow = Math.min(1, w.age / 0.5) * Math.min(1, (w.life - w.age) / 0.6);
  const r = w.r * grow;
  if (r <= 0.5) return;
  const toOther = game.dimension !== 1; // colours hint where it leads
  const c1 = toOther ? [80, 255, 170] : [170, 120, 255];
  const c2 = toOther ? [255, 80, 200] : [80, 180, 255];

  ctx.save();
  ctx.translate(w.x, w.y);

  // Outer glow
  const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.2);
  glow.addColorStop(0, `rgba(${c1.join(',')}, 0.35)`);
  glow.addColorStop(1, `rgba(${c1.join(',')}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Dark centre
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  core.addColorStop(0, 'rgba(0, 0, 0, 1)');
  core.addColorStop(0.6, 'rgba(10, 0, 25, 0.95)');
  core.addColorStop(1, `rgba(${c2.join(',')}, 0.5)`);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Spiral arms
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 4; arm++) {
    const base = t * 3 + (arm * Math.PI) / 2;
    ctx.strokeStyle = `rgba(${(arm % 2 ? c2 : c1).join(',')}, 0.85)`;
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      const a = base + k * 3.2;
      const rr = r * (1.15 - k);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Sparks being sucked in
  for (let i = 0; i < 12; i++) {
    const k = ((t * 0.7 + i / 12) % 1);
    const a = i * 2.4 + t * 2;
    const rr = r * (1.9 - 1.6 * k);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * k})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Closing soon: blink the rim
  if (w.life - w.age < 2.5 && Math.floor(t * 6) % 2 === 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Full-screen swirl flash right after going through. */
export function drawDimensionFlash(ctx, game) {
  const f = game.dimensionFlash || 0;
  if (f <= 0) return;
  const k = f / 0.9;
  const cx = game.width / 2;
  const cy = game.height / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(game.width, game.height) * (0.3 + (1 - k)));
  g.addColorStop(0, `rgba(255, 255, 255, ${0.9 * k})`);
  g.addColorStop(0.4, `rgba(140, 255, 200, ${0.6 * k})`);
  g.addColorStop(1, `rgba(200, 80, 255, ${0.3 * k})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, game.width, game.height);
}
