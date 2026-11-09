// Chickens (tier 2) and roosters (tier 3): drawing and the feather burst on death.
// Drawn from the side and flipped to face the way they walk, with a little bob and leg cycle.

const LOOK = {
  chicken: {
    body: '#f7f3ea', wing: '#e4dccb', neck: '#f7f3ea', outline: '#9c9078',
    tail: ['#efe8d8', '#e4dccb'], comb: '#e53935', combSize: 1,
    feathers: ['#ffffff', '#f3ecdc', '#e4dccb'],
  },
  rooster: {
    body: '#b5482a', wing: '#7f2f1c', neck: '#e8a33d', outline: '#4a1d10',
    tail: ['#1f4d3a', '#173328', '#2e6b4f'], comb: '#ff1f1f', combSize: 1.5,
    feathers: ['#b5482a', '#e8a33d', '#1f4d3a', '#7f2f1c'],
  },
};

const BEAK = '#ffa726';
const LEGS = '#f08c1a';

/** Draw a chicken or rooster enemy `e` (uses e.x, e.y, e.r, e.facing, e.walk, e.flash). */
export function drawChicken(ctx, e, isRooster, scale = 1) {
  const L = isRooster ? LOOK.rooster : LOOK.chicken;
  const r = e.r;
  const step = Math.sin(e.walk * 2.2);
  const bob = -Math.abs(step) * r * 0.08;
  const flash = e.flash > 0;

  ctx.save();
  ctx.translate(e.x, e.y);

  // Ground shadow (not flipped, not bobbing)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 0.85 * scale, r * 0.28 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.scale(e.facing * scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Legs (alternate while walking)
  ctx.strokeStyle = LEGS;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  for (const side of [-1, 1]) {
    const swing = step * side * r * 0.22;
    ctx.beginPath();
    ctx.moveTo(side * r * 0.18, r * 0.55);
    ctx.lineTo(side * r * 0.18 + swing, r * 0.95);
    ctx.lineTo(side * r * 0.18 + swing + r * 0.15, r * 0.95);
    ctx.stroke();
  }

  ctx.translate(0, bob);

  // Tail
  if (isRooster) {
    // Tall arcing tail feathers
    ctx.lineWidth = r * 0.16;
    L.tail.forEach((c, i) => {
      ctx.strokeStyle = flash ? '#fff' : c;
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.05);
      ctx.quadraticCurveTo(-r * (1.25 + i * 0.12), -r * (1.0 + i * 0.15), -r * (0.95 + i * 0.25), r * (0.1 + i * 0.12));
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = flash ? '#fff' : L.tail[0];
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.1);
    ctx.lineTo(-r * 1.0, -r * 0.55);
    ctx.lineTo(-r * 0.9, -r * 0.2);
    ctx.lineTo(-r * 1.05, -r * 0.1);
    ctx.lineTo(-r * 0.6, r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = L.outline;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Body
  ctx.fillStyle = flash ? '#fff' : L.body;
  ctx.strokeStyle = L.outline;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r * 0.8, r * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Neck + head
  ctx.fillStyle = flash ? '#fff' : L.neck;
  ctx.beginPath();
  ctx.ellipse(r * 0.45, -r * 0.25, r * 0.3, r * 0.4, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.6, -r * 0.55, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Wing (flaps a little with the walk)
  ctx.fillStyle = flash ? '#fff' : L.wing;
  ctx.beginPath();
  ctx.ellipse(-r * 0.08, r * 0.12, r * 0.45, r * 0.28, -0.15 + step * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Comb on top of the head
  ctx.fillStyle = L.comb;
  const cs = L.combSize;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(r * (0.45 + i * 0.13), -r * (0.82 + (i === 1 ? 0.06 : 0) * cs), r * 0.1 * cs, 0, Math.PI * 2);
    ctx.fill();
  }

  // Beak
  ctx.fillStyle = BEAK;
  ctx.beginPath();
  ctx.moveTo(r * 0.85, -r * 0.62);
  ctx.lineTo(r * 1.12, -r * 0.52);
  ctx.lineTo(r * 0.85, -r * 0.44);
  ctx.closePath();
  ctx.fill();

  // Wattle
  ctx.fillStyle = L.comb;
  ctx.beginPath();
  ctx.ellipse(r * 0.82, -r * 0.33, r * 0.07 * cs, r * 0.11 * cs, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath();
  ctx.arc(r * 0.68, -r * 0.6, Math.max(1.2, r * 0.06), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Death effect: a puff and a burst of slowly drifting, spinning feathers. */
export function featherBurst(effects, e, hitVx = 0, hitVy = 0) {
  const L = e.type === 'rooster' ? LOOK.rooster : LOOK.chicken;
  effects.push({
    kind: 'puff', x: e.x, y: e.y, r: e.r,
    vx: 0, vy: 0, angle: 0, spin: 0,
    life: 0.25, maxLife: 0.25,
  });
  const count = 8 + e.tier * 3;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 40 + Math.random() * 120;
    effects.push({
      kind: 'feather',
      x: e.x + (Math.random() - 0.5) * e.r,
      y: e.y + (Math.random() - 0.5) * e.r,
      vx: Math.cos(a) * spd + hitVx * 0.12,
      vy: Math.sin(a) * spd + hitVy * 0.12,
      drag: 2.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 6,
      size: e.r * (0.3 + Math.random() * 0.2),
      color: L.feathers[Math.floor(Math.random() * L.feathers.length)],
      life: 0.9 + Math.random() * 0.5, maxLife: 1.4,
    });
  }
}

/** One feather, drawn at the origin (caller has translated + rotated). */
export function drawFeather(ctx, f) {
  const s = f.size;
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, s, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-s * 1.1, 0);
  ctx.lineTo(s * 0.9, 0);
  ctx.stroke();
}
