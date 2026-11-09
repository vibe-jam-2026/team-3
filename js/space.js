// Space background: a deep-space gradient, faint nebulas, a starfield and a few planets.
// The still parts are painted once into an offscreen canvas (redone when the window
// size changes); only a handful of twinkling stars are drawn every frame.

let cache = null; // { w, h, dpr, canvas, twinklers }

// Seeded random so the sky looks the same every time for a given window size
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function build(w, h, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rand = rng(1337);

  // Deep space
  const bg = c.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#0b0d1f');
  bg.addColorStop(0.55, '#10122a');
  bg.addColorStop(1, '#1a0f2b');
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);

  // Nebula clouds
  const nebulas = [
    [w * 0.2, h * 0.75, Math.max(w, h) * 0.35, 'rgba(120, 60, 180, 0.16)'],
    [w * 0.85, h * 0.2, Math.max(w, h) * 0.3, 'rgba(40, 110, 190, 0.14)'],
    [w * 0.6, h * 0.65, Math.max(w, h) * 0.22, 'rgba(190, 70, 130, 0.08)'],
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
    c.fillStyle = tint < 0.15 ? '#ffe9c4' : tint < 0.3 ? '#c9dcff' : '#ffffff';
    c.globalAlpha = 0.35 + rand() * 0.65;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // Planets
  drawRingedPlanet(c, w * 0.82, h * 0.78, Math.min(w, h) * 0.11);
  drawPlanet(c, w * 0.12, h * 0.22, Math.min(w, h) * 0.07, '#4fa3d9', '#1d4f7a', true);
  drawPlanet(c, w * 0.62, h * 0.12, Math.min(w, h) * 0.025, '#c9c3b8', '#6f6a62', false);

  // Stars that twinkle (drawn live)
  const twinklers = [];
  for (let i = 0; i < 40; i++) {
    twinklers.push({ x: rand() * w, y: rand() * h, r: 0.8 + rand() * 1.2, phase: rand() * 6.28, speed: 1 + rand() * 2.5 });
  }
  return { w, h, dpr, canvas, twinklers };
}

function drawPlanet(c, x, y, r, light, dark, bands) {
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
  glow.addColorStop(0, 'rgba(160, 200, 255, 0.18)');
  glow.addColorStop(1, 'rgba(160, 200, 255, 0)');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(x, y, r * 1.35, 0, Math.PI * 2);
  c.fill();
}

function drawRingedPlanet(c, x, y, r) {
  const tilt = -0.35;
  // Back half of the ring
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.strokeStyle = 'rgba(230, 200, 150, 0.55)';
  c.lineWidth = r * 0.12;
  c.beginPath();
  c.ellipse(0, 0, r * 1.75, r * 0.45, 0, Math.PI, Math.PI * 2);
  c.stroke();
  c.restore();

  drawPlanet(c, x, y, r, '#e8b36b', '#8a4f25', true);

  // Front half of the ring
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.strokeStyle = 'rgba(240, 215, 170, 0.75)';
  c.lineWidth = r * 0.12;
  c.beginPath();
  c.ellipse(0, 0, r * 1.75, r * 0.45, 0, 0, Math.PI);
  c.stroke();
  c.strokeStyle = 'rgba(180, 140, 90, 0.5)';
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.ellipse(0, 0, r * 1.5, r * 0.38, 0, 0, Math.PI);
  c.stroke();
  c.restore();
}

/** Draw the space background filling w x h. */
export function drawSpace(ctx, w, h) {
  const dpr = window.devicePixelRatio || 1;
  if (!cache || cache.w !== w || cache.h !== h || cache.dpr !== dpr) cache = build(w, h, dpr);
  ctx.drawImage(cache.canvas, 0, 0, w, h);

  const t = performance.now() / 1000;
  ctx.fillStyle = '#ffffff';
  for (const s of cache.twinklers) {
    const a = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = a * a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
