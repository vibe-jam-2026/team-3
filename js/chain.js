// The chain between the players: a Verlet rope.
// Each point remembers its previous position; velocity is (pos - prev).
// Links only resist being stretched, so the chain can go slack.

import { CHAIN } from './config.js';

export function createChain(a, b) {
  const points = [];
  for (let i = 0; i < CHAIN.links; i++) {
    const t = i / (CHAIN.links - 1);
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    points.push({ x, y, px: x, py: y });
  }
  // maxLength can grow with the chain-length upgrade (see upgrades.js)
  return { points, maxLength: CHAIN.maxLength, segLength: CHAIN.maxLength / (CHAIN.links - 1) };
}

/**
 * Springy feel: once the players are further apart than springStart * maxLength,
 * gently pull them back toward each other. The pull grows the further they stretch it.
 */
export function springPlayers(a, b, dt, maxLength) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const start = maxLength * CHAIN.springStart;
  if (dist <= start || dist === 0) return;
  const pull = (dist - start) * CHAIN.springStrength * dt / 2;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x += nx * pull; a.y += ny * pull;
  b.x -= nx * pull; b.y -= ny * pull;
}

/** Keep the two players within the chain's max length (each takes half the correction). */
export function constrainPlayers(a, b, maxLength) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxLength || dist === 0) return false;
  const excess = (dist - maxLength) / 2;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x += nx * excess; a.y += ny * excess;
  b.x -= nx * excess; b.y -= ny * excess;
  return true;
}

export function updateChain(chain, a, b, width, height) {
  const pts = chain.points;
  const last = pts.length - 1;

  // Integrate (inner points only; the ends follow the players)
  for (let i = 1; i < last; i++) {
    const p = pts[i];
    const vx = (p.x - p.px) * CHAIN.damping;
    const vy = (p.y - p.py) * CHAIN.damping;
    p.px = p.x; p.py = p.y;
    p.x += vx; p.y += vy;
  }

  // Pin ends to players
  pin(pts[0], a);
  pin(pts[last], b);

  // Satisfy link constraints
  for (let k = 0; k < CHAIN.iterations; k++) {
    for (let i = 0; i < last; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= chain.segLength || dist === 0) continue; // slack is fine
      const diff = (dist - chain.segLength) / dist;
      const pFixed = i === 0;
      const qFixed = i + 1 === last;
      if (pFixed && qFixed) continue;
      const wp = pFixed ? 0 : qFixed ? 1 : 0.5;
      const wq = qFixed ? 0 : pFixed ? 1 : 0.5;
      p.x += dx * diff * wp; p.y += dy * diff * wp;
      q.x -= dx * diff * wq; q.y -= dy * diff * wq;
    }
    // Keep inside the arena
    for (let i = 1; i < last; i++) {
      const p = pts[i];
      p.x = Math.max(0, Math.min(width, p.x));
      p.y = Math.max(0, Math.min(height, p.y));
    }
  }
}

function pin(point, player) {
  point.px = point.x; point.py = point.y;
  point.x = player.x; point.y = player.y;
}

/**
 * Calls onHit(enemy, speed, vx, vy) for every enemy touching a chain segment
 * that is moving faster than CHAIN.minHitSpeed. Velocities are in px/s.
 */
export function chainHits(chain, enemies, dt, onHit) {
  const pts = chain.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const vx = ((p.x - p.px) + (q.x - q.px)) / 2 / dt;
    const vy = ((p.y - p.py) + (q.y - q.py)) / 2 / dt;
    const speed = Math.hypot(vx, vy);
    if (speed < CHAIN.minHitSpeed) continue;
    for (const e of enemies) {
      if (e.dead) continue;
      const reach = e.r + CHAIN.thickness / 2;
      if (distToSegmentSq(e.x, e.y, p.x, p.y, q.x, q.y) < reach * reach) {
        onHit(e, speed, vx, vy);
      }
    }
  }
}

export function distToSegmentSq(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq ? ((px - ax) * abx + (py - ay) * aby) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t - px;
  const cy = ay + aby * t - py;
  return cx * cx + cy * cy;
}

export function drawChain(ctx, chain) {
  const pts = chain.points;
  ctx.strokeStyle = '#c9ced8';
  ctx.lineWidth = CHAIN.thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  // Small "links" so the motion is easy to read
  ctx.fillStyle = '#8b92a1';
  for (let i = 1; i < pts.length - 1; i++) {
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, CHAIN.thickness * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}
