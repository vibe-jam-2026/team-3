// Yarn ball: a rare drop (YARN.dropChance per kill). When a worm head or the body
// touches it, a stampede of cats charges across the screen in lanes, wiping out
// every enemy in their way (and the lanes cover the whole arena). Bosses are too
// big to flatten: they lose a couple of hits instead.

import { YARN, DEBUG } from './config.js';
import { distToSegmentSq } from './chain.js';
import { hitBoss } from './boss.js';
import { playStampede } from './audio.js';
import { arcade, pixel } from './fonts.js';

const YARN_COLORS = ['#e53950', '#7e57c2', '#26a69a', '#ffa726'];
const CAT_COATS = [
  { body: '#f0a04b', dark: '#c9772a' }, // ginger
  { body: '#7d7f87', dark: '#55575e' }, // grey
  { body: '#2b2b30', dark: '#16161a' }, // black
  { body: '#f4f1ea', dark: '#cfc8b8' }, // white
  { body: '#a0785a', dark: '#6f4f38' }, // brown tabby
];

/** Maybe drop a yarn ball where an enemy died. */
export function maybeDropYarn(game, e) {
  const chance = DEBUG.yarn ? 0.25 : YARN.dropChance;
  if (Math.random() >= chance) return;
  game.yarns.push({
    x: e.x, y: e.y, age: 0,
    color: YARN_COLORS[Math.floor(Math.random() * YARN_COLORS.length)],
    spin: Math.random() * 6,
  });
}

export function updateYarn(game, dt) {
  // Pick-ups: a worm head or the body touching the ball
  const pts = game.chain.points;
  const keep = [];
  for (const y of game.yarns) {
    y.age += dt;
    if (y.age > YARN.lifetime) continue; // rolled away
    let picked = y.age > 0.4 && game.players.some((p) => Math.hypot(p.x - y.x, p.y - y.y) < p.r + YARN.radius);
    if (!picked && y.age > 0.4) {
      const reach = YARN.radius + 4;
      for (let i = 0; i < pts.length - 1 && !picked; i++) {
        picked = distToSegmentSq(y.x, y.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < reach * reach;
      }
    }
    if (picked) startStampede(game);
    else keep.push(y);
  }
  game.yarns = keep;

  // The stampede itself
  const S = game.stampede;
  if (!S) return;
  S.t += dt;
  for (const c of S.cats) {
    if (S.t < c.delay) continue;
    c.x += c.dir * c.speed * dt;
    c.step += dt * c.speed / 18;
    for (const e of game.enemies) {
      if (e.dead || e.hp <= 0 || e.invincible || e.spawnAnim > 0) continue;
      if (Math.abs(e.x - c.x) > c.size + e.r || Math.abs(e.y - c.y) > S.laneHalf + e.r * 0.5) continue;
      e.flash = 0.1;
      e.lastHitVx = c.dir * 700;
      e.lastHitVy = (Math.random() - 0.5) * 300;
      if (e.boss) {
        if (!c.hitBosses.has(e)) {
          c.hitBosses.add(e);
          if (!S.bossHits.has(e)) S.bossHits.set(e, 0);
          if (S.bossHits.get(e) < YARN.bossHits) {
            S.bossHits.set(e, S.bossHits.get(e) + 1);
            e.hitCooldown = 0;
            hitBoss(e);
          }
        }
      } else {
        e.hitsLeft = 0;
        e.hp = 0;
      }
    }
  }
  game.projectiles = game.projectiles.filter((s) => !S.cats.some((c) =>
    S.t >= c.delay && Math.abs(s.x - c.x) < c.size && Math.abs(s.y - c.y) < S.laneHalf));
  if (S.cats.every((c) => (c.dir > 0 ? c.x > game.width + c.size * 2 : c.x < -c.size * 2))) {
    game.stampede = null;
  }
}

function startStampede(game) {
  const n = YARN.cats;
  const laneH = game.height / n;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const size = Math.min(46, laneH * 0.75);
  const lanes = [...Array(n).keys()].sort(() => Math.random() - 0.5);
  const cats = lanes.map((lane, i) => ({
    y: laneH * (lane + 0.5),
    x: dir > 0 ? -size * 2 : game.width + size * 2,
    dir,
    speed: YARN.catSpeed * (0.9 + Math.random() * 0.25),
    delay: i * 0.06 + Math.random() * 0.1,
    size,
    step: Math.random() * 6,
    coat: CAT_COATS[Math.floor(Math.random() * CAT_COATS.length)],
    hitBosses: new Set(),
  }));
  game.stampede = { t: 0, cats, laneHalf: laneH / 2, bossHits: new Map() };
  playStampede();
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

export function drawYarns(ctx, game) {
  const t = performance.now() / 1000;
  for (const y of game.yarns) {
    const left = YARN.lifetime - y.age;
    if (left < 3 && Math.floor(t * 8) % 2 === 0) continue; // blink before it rolls away
    const r = YARN.radius;
    const bob = Math.sin(t * 4 + y.spin) * 2;
    // glow so it's easy to spot
    const g = ctx.createRadialGradient(y.x, y.y + bob, r * 0.5, y.x, y.y + bob, r * 2.6);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(y.x, y.y + bob, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(y.x, y.y + r * 0.95, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // ball
    ctx.fillStyle = y.color;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(y.x, y.y + bob, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // wound strands
    ctx.save();
    ctx.beginPath();
    ctx.arc(y.x, y.y + bob, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.3;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(y.x + i * r * 0.3, y.y + bob, r * 0.35, r * 1.1, 0.6 + y.spin * 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // loose thread
    ctx.strokeStyle = y.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(y.x + r * 0.7, y.y + bob + r * 0.6);
    ctx.quadraticCurveTo(y.x + r * 1.6, y.y + bob + r * 1.4, y.x + r * 2.2, y.y + bob + r * 0.8);
    ctx.stroke();
  }
}

function drawCat(ctx, c, laneHalf) {
  const s = c.size;
  const run = Math.sin(c.step);
  const bounce = Math.abs(Math.sin(c.step)) * s * 0.12;
  ctx.save();
  ctx.translate(c.x, c.y);
  // dust kicked up behind
  ctx.fillStyle = 'rgba(200, 190, 170, 0.25)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-c.dir * (s * 0.9 + i * s * 0.35), s * 0.45 - i * 3, s * (0.18 + i * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.55, s * 0.8, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(c.dir, 1);
  ctx.translate(0, -bounce);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const { body, dark } = c.coat;
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 1.5;

  // tail streaming behind
  ctx.strokeStyle = dark;
  ctx.lineWidth = s * 0.14;
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, -s * 0.05);
  ctx.quadraticCurveTo(-s * 0.95, -s * (0.45 + run * 0.1), -s * 1.15, -s * 0.2);
  ctx.stroke();
  // legs (stretched gallop)
  ctx.strokeStyle = dark;
  ctx.lineWidth = s * 0.13;
  for (const [x, ph] of [[-s * 0.35, 0], [-s * 0.2, 1], [s * 0.3, 2], [s * 0.45, 3]]) {
    const sw = Math.sin(c.step + ph) * s * 0.28;
    ctx.beginPath();
    ctx.moveTo(x, s * 0.12);
    ctx.lineTo(x + sw, s * 0.48);
    ctx.stroke();
  }
  // body
  ctx.fillStyle = body;
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.62, s * 0.26, -0.08 * run, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // stripes
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  for (const x of [-0.25, 0, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(s * x, -s * 0.24);
    ctx.lineTo(s * (x + 0.06), -s * 0.06);
    ctx.stroke();
  }
  // head
  ctx.fillStyle = body;
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s * 0.62, -s * 0.2, s * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // ears flattened back (it's in a hurry)
  for (const dx of [0.5, 0.66]) {
    ctx.beginPath();
    ctx.moveTo(s * dx, -s * 0.38);
    ctx.lineTo(s * (dx - 0.14), -s * 0.52);
    ctx.lineTo(s * (dx + 0.05), -s * 0.32);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();
    ctx.stroke();
  }
  // angry eye + open mouth
  ctx.fillStyle = '#c6ff6b';
  ctx.beginPath();
  ctx.ellipse(s * 0.7, -s * 0.24, s * 0.06, s * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(s * 0.695, -s * 0.28, s * 0.015, s * 0.08);
  ctx.fillStyle = '#e57389';
  ctx.beginPath();
  ctx.arc(s * 0.83, -s * 0.12, s * 0.05, 0, Math.PI);
  ctx.fill();
  // whiskers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1;
  for (const dy of [-0.16, -0.1]) {
    ctx.beginPath();
    ctx.moveTo(s * 0.8, -s * 0.15);
    ctx.lineTo(s * 1.05, -s * (0.15 - dy));
    ctx.stroke();
  }
  ctx.restore();
}

/** The stampede, drawn over the arena. */
export function drawStampede(ctx, game) {
  const S = game.stampede;
  if (!S) return;
  // Banner while they come through
  if (S.t < 1.6) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1.6 - S.t) * 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = arcade(28);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3a1d00';
    ctx.lineWidth = 8;
    ctx.strokeText('🧶 CAT STAMPEDE! 🧶', game.width / 2, game.height * 0.18);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('🧶 CAT STAMPEDE! 🧶', game.width / 2, game.height * 0.18);
    ctx.restore();
  }
  for (const c of S.cats) {
    if (S.t >= c.delay) drawCat(ctx, c, S.laneHalf);
  }
}
