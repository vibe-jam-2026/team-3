// The players are two worms whose tails are tied together in a knot.
// Each player is one worm's head; the chain between the players is drawn as the two
// worm bodies (each tapering from its head to its tail) meeting in a knot in the middle.
// This is only the look: the chain physics and hits are the same as before.

import { arcade, pixel } from './fonts.js';

// Per worm: skin, darker rings, outline (P1 rosy pink, P2 peachy pink)
const LOOKS = [
  { skin: '#f29fc0', dark: '#d77aa0', outline: '#7a3552' },
  { skin: '#f7b39a', dark: '#dd8d70', outline: '#7a3f2c' },
];
const BODY_WIDTH = 15; // px at the head end (visual only; hits use CHAIN.thickness)
const TAIL_WIDTH = 7;  // px where it reaches the knot

/** Smooth sample points through a list of points (Catmull-Rom), `steps` per segment. */
function smooth(pts, steps = 4) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
  return out;
}

/** Draw a tapered tube along samples (head first): width goes from w0 to w1. */
function tube(ctx, S, w0, w1, style, extra = 0, dx = 0, dy = 0) {
  ctx.strokeStyle = style;
  for (let i = 0; i < S.length - 1; i++) {
    const k = i / (S.length - 1);
    ctx.lineWidth = w0 + (w1 - w0) * k + extra;
    ctx.beginPath();
    ctx.moveTo(S[i].x + dx, S[i].y + dy);
    ctx.lineTo(S[i + 1].x + dx, S[i + 1].y + dy);
    ctx.stroke();
  }
}

/** One worm body from its head to the knot. */
function drawOneWorm(ctx, S, look, t, phase) {
  tube(ctx, S, BODY_WIDTH, TAIL_WIDTH, 'rgba(0, 0, 0, 0.25)', 0, 2, 5); // shadow
  tube(ctx, S, BODY_WIDTH, TAIL_WIDTH, look.outline, 3);
  tube(ctx, S, BODY_WIDTH, TAIL_WIDTH, look.skin);
  tube(ctx, S, BODY_WIDTH * 0.3, TAIL_WIDTH * 0.25, 'rgba(255, 255, 255, 0.28)', 0, 0, -BODY_WIDTH * 0.15);

  // Segment rings that "breathe"
  ctx.strokeStyle = look.dark;
  ctx.lineWidth = 2;
  for (let i = 3; i < S.length - 3; i += 3) {
    const k = i / (S.length - 1);
    let dx = S[i + 1].x - S[i - 1].x;
    let dy = S[i + 1].y - S[i - 1].y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const half = ((BODY_WIDTH + (TAIL_WIDTH - BODY_WIDTH) * k) / 2) * (0.85 + 0.15 * Math.sin(t * 4 + i * 0.3 + phase));
    ctx.beginPath();
    ctx.moveTo(S[i].x - dy * half, S[i].y + dx * half);
    ctx.lineTo(S[i].x + dy * half, S[i].y - dx * half);
    ctx.stroke();
  }
}

/** A loop of tail wrapped around the knot (an ellipse arc), outline + skin. */
function loop(ctx, x, y, rx, ry, rot, a0, a1, look) {
  for (const [w, col] of [[TAIL_WIDTH + 3, look.outline], [TAIL_WIDTH, look.skin]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, a0, a1);
    ctx.stroke();
  }
}

/** The two worm bodies and the knot that ties their tails together. */
export function drawWormBody(ctx, chain) {
  const pts = chain.points;
  const t = performance.now() / 1000;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Split the chain in the middle: worm 1 runs from P1's head to the knot,
  // worm 2 from P2's head to the knot.
  const m = Math.floor((pts.length - 1) / 2);
  const knot = { x: (pts[m].x + pts[m + 1].x) / 2, y: (pts[m].y + pts[m + 1].y) / 2 };
  const half1 = smooth(pts.slice(0, m + 1).concat([knot]));
  const half2 = smooth(pts.slice(m + 1).reverse().concat([knot]));

  drawOneWorm(ctx, half1, LOOKS[0], t, 0);
  drawOneWorm(ctx, half2, LOOKS[1], t, 2);

  // Knot: each tail wraps once around the other, interlocked
  let dx = pts[m + 1].x - pts[m].x;
  let dy = pts[m + 1].y - pts[m].y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;
  const rot = Math.atan2(dy, dx);
  const wob = Math.sin(t * 3) * 0.08;
  const ax = knot.x - dx * 4;
  const ay = knot.y - dy * 4;
  const bx = knot.x + dx * 4;
  const by = knot.y + dy * 4;
  // back halves first, then front halves, so the loops look woven together
  loop(ctx, ax, ay, 9, 12, rot + wob, Math.PI * 0.5, Math.PI * 1.5, LOOKS[0]);
  loop(ctx, bx, by, 9, 12, rot - wob, -Math.PI * 0.5, Math.PI * 0.5, LOOKS[1]);
  loop(ctx, bx, by, 9, 12, rot - wob, Math.PI * 0.5, Math.PI * 1.5, LOOKS[1]);
  loop(ctx, ax, ay, 9, 12, rot + wob, -Math.PI * 0.5, Math.PI * 0.5, LOOKS[0]);

  // Little tail tips poking out of the knot
  const nx = -dy;
  const ny = dx;
  for (const [look, side] of [[LOOKS[0], 1], [LOOKS[1], -1]]) {
    const sx = knot.x + nx * side * 11;
    const sy = knot.y + ny * side * 11;
    const ex = sx + nx * side * 9 + dx * side * 4;
    const ey = sy + ny * side * 9 + dy * side * 4;
    for (const [w, col] of [[TAIL_WIDTH + 1, look.outline], [TAIL_WIDTH - 2, look.skin]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }
}

/**
 * One worm head in a space helmet. p.lookX/p.lookY is the direction it last moved in
 * (eyes look that way). The helmet's rim is in the player's colour, and a small
 * number above tells the two heads apart.
 */
export function drawWormHead(ctx, p, neck) {
  const look = LOOKS[p.index] || LOOKS[0]; // same colours as this player's worm body
  const r = p.r;
  const lx = p.lookX ?? (p.index === 0 ? -1 : 1);
  const ly = p.lookY ?? 0;
  const blink = p.invuln > 0 && Math.floor(p.invuln * 15) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x + 2, p.y + r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Which side the body (neck) is on
  const ca = Math.atan2(neck.y - p.y, neck.x - p.x);

  // Head
  ctx.fillStyle = look.skin;
  ctx.strokeStyle = look.outline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x - r * 0.3, p.y - r * 0.35, r * 0.25, r * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes: placed toward the look direction, pupils look that way
  const px = -ly;
  const py = lx;
  for (const side of [-1, 1]) {
    const ex = p.x + lx * r * 0.3 + px * side * r * 0.32;
    const ey = p.y + ly * r * 0.3 + py * side * r * 0.32 - r * 0.1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = look.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(ex + lx * r * 0.09, ey + ly * r * 0.09, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth: a small smile at the front
  ctx.strokeStyle = look.outline;
  ctx.lineWidth = 1.5;
  const mx = p.x + lx * r * 0.55;
  const my = p.y + ly * r * 0.55 + r * 0.15;
  const ma = Math.atan2(ly, lx);
  ctx.beginPath();
  ctx.arc(mx, my, r * 0.18, ma - 0.9, ma + 0.9);
  ctx.stroke();

  drawHelmet(ctx, p, ca);

  ctx.globalAlpha = 1;

  // Player number above the helmet, in the player's colour
  ctx.fillStyle = p.color;
  ctx.font = arcade(8);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`P${p.index + 1}`, p.x, p.y - r - 7);
}

/** Glass space-helmet bubble with a metal rim (in the player's colour) at the neck. */
function drawHelmet(ctx, p, neckAngle) {
  const R = p.r + 4;

  // Glass
  ctx.fillStyle = 'rgba(170, 215, 255, 0.14)';
  ctx.strokeStyle = 'rgba(210, 235, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Reflections
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(p.x, p.y, R - 4, Math.PI * 1.08, Math.PI * 1.42);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(p.x + R * 0.42, p.y - R * 0.5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Metal rim where the helmet meets the body
  ctx.strokeStyle = '#8f9aab';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R, neckAngle - 0.75, neckAngle + 0.75);
  ctx.stroke();
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R, neckAngle - 0.7, neckAngle + 0.7);
  ctx.stroke();
}
