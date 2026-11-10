// Space background: a deep-space gradient, faint nebulas, a starfield and a few planets.
// The still parts are painted once into an offscreen canvas (redone when the window
// size changes); only a handful of twinkling stars are drawn every frame.

import { dpr as screenScale } from './display.js';

// Two looks: dimension 0 is normal space; dimension 1 is the "other dimension"
// you reach through a wormhole (greenish sky, different planets).
const THEMES = [
  {
    seed: 1337,
    bg: ['#0b0d1f', '#10122a', '#1a0f2b'],
    nebulas: ['rgba(120, 60, 180, 0.16)', 'rgba(40, 110, 190, 0.14)', 'rgba(190, 70, 130, 0.08)'],
    stars: ['#ffe9c4', '#c9dcff', '#ffffff'],
    ringed: { light: '#e8b36b', dark: '#8a4f25', ring: [230, 200, 150], ring2: [180, 140, 90] },
    banded: ['#4fa3d9', '#1d4f7a'],
    moon: ['#c9c3b8', '#6f6a62'],
    glow: [160, 200, 255],
    twinkle: '#ffffff',
  },
  {
    seed: 4242,
    bg: ['#04140f', '#0b2420', '#240a1e'],
    nebulas: ['rgba(40, 200, 120, 0.16)', 'rgba(220, 60, 160, 0.14)', 'rgba(240, 160, 40, 0.10)'],
    stars: ['#b8ffd9', '#ffc4f0', '#e8fff4'],
    ringed: { light: '#b07cf0', dark: '#3d1a6e', ring: [140, 255, 200], ring2: [80, 180, 140] },
    banded: ['#ff6b6b', '#7a1d2d'],
    moon: ['#9cf7a8', '#2f6b3a'],
    glow: [140, 255, 200],
    twinkle: '#c8ffe6',
  },
];

const caches = [null, null]; // per dimension: { w, h, dpr, canvas, twinklers }

// Seeded random so the sky looks the same every time for a given window size
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function build(w, h, dpr, T) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rand = rng(T.seed);

  // Deep space
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, T.bg[0]);
  bg.addColorStop(0.55, T.bg[1]);
  bg.addColorStop(1, T.bg[2]);
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);

  // Nebula clouds
  const nebulas = [
    [w * 0.2, h * 0.75, Math.max(w, h) * 0.35, T.nebulas[0]],
    [w * 0.85, h * 0.2, Math.max(w, h) * 0.3, T.nebulas[1]],
    [w * 0.6, h * 0.65, Math.max(w, h) * 0.22, T.nebulas[2]],
  ];
  for (const [x, y, r, col] of nebulas) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  // Stars
  const count = Math.round((w * h) / 2200);
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const big = rand() < 0.08;
    const r = big ? 1.1 + rand() * 0.8 : 0.4 + rand() * 0.7;
    const tint = rand();
    c.fillStyle = tint < 0.15 ? T.stars[0] : tint < 0.3 ? T.stars[1] : T.stars[2];
    c.globalAlpha = 0.35 + rand() * 0.65;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // Planets
  if (T === THEMES[0]) {
    drawRingedPlanet(c, w * 0.82, h * 0.78, Math.min(w, h) * 0.11, T);
    drawPlanet(c, w * 0.12, h * 0.22, Math.min(w, h) * 0.07, T.banded[0], T.banded[1], true, T.glow);
    drawPlanet(c, w * 0.62, h * 0.12, Math.min(w, h) * 0.025, T.moon[0], T.moon[1], false, T.glow);
  } else {
    // The other dimension: planets in different places
    drawRingedPlanet(c, w * 0.16, h * 0.74, Math.min(w, h) * 0.1, T);
    drawPlanet(c, w * 0.86, h * 0.2, Math.min(w, h) * 0.08, T.banded[0], T.banded[1], true, T.glow);
    drawPlanet(c, w * 0.4, h * 0.1, Math.min(w, h) * 0.03, T.moon[0], T.moon[1], false, T.glow);
    drawPlanet(c, w * 0.47, h * 0.13, Math.min(w, h) * 0.018, T.moon[0], T.moon[1], false, T.glow);
  }

  // Stars that twinkle (drawn live)
  const twinklers = [];
  for (let i = 0; i < 40; i++) {
    twinklers.push({ x: rand() * w, y: rand() * h, r: 0.8 + rand() * 1.2, phase: rand() * 6.28, speed: 1 + rand() * 2.5 });
  }
  return { w, h, dpr, canvas, twinklers };
}

function drawPlanet(c, x, y, r, light, dark, bands, glowRgb = [160, 200, 255]) {
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  if (bands) {
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.clip();
    c.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (const [oy, th] of [[-0.35, 0.12], [0.05, 0.18], [0.45, 0.1]]) {
      c.fillRect(x - r, y + oy * r, r * 2, th * r);
    }
    c.restore();
  } else {
    // Craters
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (const [ox, oy, cr] of [[-0.3, -0.2, 0.22], [0.35, 0.25, 0.16], [0.05, 0.45, 0.12]]) {
      c.beginPath();
      c.arc(x + ox * r, y + oy * r, cr * r, 0, Math.PI * 2);
      c.fill();
    }
  }
  // Soft atmosphere glow
  const glow = c.createRadialGradient(x, y, r * 0.95, x, y, r * 1.35);
  glow.addColorStop(0, `rgba(${glowRgb.join(', ')}, 0.18)`);
  glow.addColorStop(1, `rgba(${glowRgb.join(', ')}, 0)`);
  c.fillStyle = glow;
  c.beginPath();
  c.arc(x, y, r * 1.35, 0, Math.PI * 2);
  c.fill();
}

function drawRingedPlanet(c, x, y, r, T) {
  const P = T.ringed;
  const tilt = -0.35;
  // Back half of the ring
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.strokeStyle = `rgba(${P.ring.join(', ')}, 0.55)`;
  c.lineWidth = r * 0.12;
  c.beginPath();
  c.ellipse(0, 0, r * 1.75, r * 0.45, 0, Math.PI, Math.PI * 2);
  c.stroke();
  c.restore();

  drawPlanet(c, x, y, r, P.light, P.dark, true, T.glow);

  // Front half of the ring
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.strokeStyle = `rgba(${P.ring.join(', ')}, 0.75)`;
  c.lineWidth = r * 0.12;
  c.beginPath();
  c.ellipse(0, 0, r * 1.75, r * 0.45, 0, 0, Math.PI);
  c.stroke();
  c.strokeStyle = `rgba(${P.ring2.join(', ')}, 0.5)`;
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.ellipse(0, 0, r * 1.5, r * 0.38, 0, 0, Math.PI);
  c.stroke();
  c.restore();
}

/** Build a dimension's sky ahead of time (so switching to it doesn't stutter). */
export function prepareSpace(w, h, dimension) {
  const dpr = screenScale();
  const c = caches[dimension];
  if (!c || c.w !== w || c.h !== h || c.dpr !== dpr) caches[dimension] = build(w, h, dpr, THEMES[dimension]);
}

/** Draw the space background filling w x h. dimension 0 = normal, 1 = the other dimension. */
export function drawSpace(ctx, w, h, dimension = 0) {
  const dpr = screenScale();
  const T = THEMES[dimension] || THEMES[0];
  let cache = caches[dimension];
  if (!cache || cache.w !== w || cache.h !== h || cache.dpr !== dpr) {
    cache = caches[dimension] = build(w, h, dpr, T);
  }
  ctx.drawImage(cache.canvas, 0, 0, w, h);

  const t = performance.now() / 1000;
  ctx.fillStyle = T.twinkle;
  for (const s of cache.twinklers) {
    const a = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = a * a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
