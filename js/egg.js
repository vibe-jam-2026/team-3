// Egg enemies: drawing the egg and the "crack" effect when one dies.

const SHELL = '#f4ecd8';
const SHELL_SHADE = '#d9cdb0';
const SPECKLE = '#b9a27a';
const YOLK = '#ffc93c';
const WHITE = 'rgba(255, 255, 255, 0.85)';

// Egg proportions relative to the enemy radius r
const W = 0.9;   // half width
const TOP = 1.2; // pointy end
const BOT = 0.9; // round end

/** Random speckles so every egg looks a little different. Positions in units of r. */
export function makeSpeckles() {
  const list = [];
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    list.push({
      x: (Math.random() - 0.5) * 1.1,
      y: (Math.random() - 0.5) * 1.4,
      s: 0.07 + Math.random() * 0.07,
    });
  }
  return list;
}

function eggPath(ctx, r) {
  ctx.beginPath();
  ctx.ellipse(0, 0, r * W, r * TOP, 0, Math.PI, Math.PI * 2); // top half (pointy)
  ctx.ellipse(0, 0, r * W, r * BOT, 0, 0, Math.PI);           // bottom half (round)
  ctx.closePath();
}

/** Draw an egg centred on (x, y), rotated by `angle` (it rolls as it moves). */
export function drawEgg(ctx, x, y, r, angle, speckles, flash = false, scale = 1) {
  ctx.save();
  ctx.translate(x, y);

  // Shadow stays on the ground (not rotated)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(2, r * 0.9, r * 0.9 * scale, r * 0.35 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(angle);
  ctx.scale(scale, scale);

  eggPath(ctx, r);
  ctx.fillStyle = flash ? '#ffffff' : SHELL;
  ctx.fill();

  if (!flash) {
    // Shading on one side so the rolling is visible
    ctx.save();
    eggPath(ctx, r);
    ctx.clip();
    ctx.fillStyle = SHELL_SHADE;
    ctx.beginPath();
    ctx.ellipse(r * 0.55, r * 0.25, r * 0.6, r * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = SPECKLE;
    for (const s of speckles) {
      ctx.beginPath();
      ctx.arc(s.x * r, s.y * r, s.s * r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#8a7b5c';
  ctx.lineWidth = 1.2;
  eggPath(ctx, r);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Crack effect: the egg splits into two shell halves that fly apart and spin,
// a few small shell shards scatter, and a yolk splat stays on the floor.
// ---------------------------------------------------------------------------

const ZIGZAG = [-1, -0.6, -0.2, 0.2, 0.6, 1]; // x positions of the crack line (units of half width)

export function crackEgg(effects, e, hitVx = 0, hitVy = 0) {
  // Direction the halves fly: mostly away from each other, pushed by the hit
  const ang = e.roll + Math.PI / 2;
  const sepX = Math.cos(ang) * 70;
  const sepY = Math.sin(ang) * 70;
  const pushX = hitVx * 0.15;
  const pushY = hitVy * 0.15;

  for (const half of ['top', 'bottom']) {
    const dir = half === 'top' ? -1 : 1;
    effects.push({
      kind: 'half', half,
      x: e.x, y: e.y, r: e.r,
      vx: sepX * dir + pushX, vy: sepY * dir + pushY,
      angle: e.roll, spin: (Math.random() * 6 + 4) * dir,
      speckles: e.speckles,
      life: 0.55, maxLife: 0.55,
    });
  }

  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 140;
    effects.push({
      kind: 'shard',
      x: e.x, y: e.y,
      vx: Math.cos(a) * spd + pushX, vy: Math.sin(a) * spd + pushY,
      angle: Math.random() * 6, spin: (Math.random() - 0.5) * 20,
      size: 2 + Math.random() * 3,
      life: 0.45, maxLife: 0.45,
    });
  }

  effects.push({
    kind: 'yolk',
    x: e.x, y: e.y, r: e.r,
    blob: Array.from({ length: 9 }, () => 0.75 + Math.random() * 0.5),
    life: 2.5, maxLife: 2.5,
  });
}

export function updateEffects(effects, dt) {
  for (const f of effects) {
    f.life -= dt;
    if (f.kind === 'yolk') continue;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const drag = Math.exp(-5 * dt);
    f.vx *= drag; f.vy *= drag;
    f.angle += f.spin * dt;
  }
  return effects.filter((f) => f.life > 0);
}

/** Yolk splats go under everything else. */
export function drawFloorEffects(ctx, effects) {
  for (const f of effects) {
    if (f.kind !== 'yolk') continue;
    const t = f.life / f.maxLife;
    const grow = Math.min(1, (f.maxLife - f.life) / 0.12); // quick splat-out
    ctx.globalAlpha = Math.min(1, t * 2);

    // Egg white: wobbly blob
    ctx.fillStyle = WHITE;
    // Smooth wobbly outline: curve through the midpoints between blob points
    const n = f.blob.length;
    const pt = (i) => {
      const a = (i / n) * Math.PI * 2;
      const rr = f.r * 1.35 * f.blob[i % n] * grow;
      return [f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr];
    };
    ctx.beginPath();
    let [px, py] = pt(0);
    let [qx, qy] = pt(1);
    ctx.moveTo((px + qx) / 2, (py + qy) / 2);
    for (let i = 1; i <= n; i++) {
      [px, py] = pt(i);
      [qx, qy] = pt(i + 1);
      ctx.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
    }
    ctx.fill();

    // Yolk
    ctx.fillStyle = YOLK;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * 0.55 * grow, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Shell halves and shards go above enemies. */
export function drawAirEffects(ctx, effects) {
  for (const f of effects) {
    if (f.kind === 'yolk') continue;
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);

    if (f.kind === 'shard') {
      ctx.fillStyle = SHELL;
      ctx.beginPath();
      ctx.moveTo(-f.size, -f.size * 0.6);
      ctx.lineTo(f.size, -f.size * 0.3);
      ctx.lineTo(0, f.size);
      ctx.closePath();
      ctx.fill();
    } else {
      drawHalf(ctx, f.r, f.half, f.speckles);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** One half of the egg, with a zigzag crack edge. */
function drawHalf(ctx, r, half, speckles) {
  const w = r * W;
  ctx.beginPath();
  if (half === 'top') {
    ctx.ellipse(0, 0, w, r * TOP, 0, Math.PI, Math.PI * 2);
    // zigzag back from right to left
    for (let i = ZIGZAG.length - 1; i >= 0; i--) {
      ctx.lineTo(ZIGZAG[i] * w, (i % 2 ? 0.18 : -0.12) * r);
    }
  } else {
    ctx.ellipse(0, 0, w, r * BOT, 0, 0, Math.PI);
    for (let i = 0; i < ZIGZAG.length; i++) {
      ctx.lineTo(ZIGZAG[i] * w, (i % 2 ? 0.18 : -0.12) * r);
    }
  }
  ctx.closePath();
  ctx.fillStyle = SHELL;
  ctx.fill();
  ctx.strokeStyle = '#8a7b5c';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = SPECKLE;
  for (const s of speckles) {
    ctx.beginPath();
    ctx.arc(s.x * r, s.y * r, s.s * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
