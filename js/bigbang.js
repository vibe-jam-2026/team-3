// Big Bang title screen.
// On load: a blinding flash from a single point, shockwave rings and a burst of
// hot matter streaking outward. Afterwards the universe keeps expanding: a glowing
// core pulses in the middle and new streaks keep flying out from it.
// Call bigBangTime() to know how long ago the bang happened (title text times its
// entrance from that), and drawBigBang() every frame.

import { drawSpace } from './space.js';

const COLORS = ['#ffffff', '#fff3c4', '#ffd54f', '#ffb74d', '#ff8a65', '#f06292', '#ba68c8', '#7986cb', '#4fc3f7'];

let start = null;
let last = null;
let particles = [];
let spawnAcc = 0;

function emit(cx, cy, speedMin, speedMax, life) {
  const a = Math.random() * Math.PI * 2;
  const sp = speedMin + Math.random() * (speedMax - speedMin);
  particles.push({
    x: cx, y: cy,
    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    width: 0.6 + Math.random() * 1.8,
    age: 0, life,
  });
}

/** Seconds since the bang (the bang happens the first time the title is drawn). */
export function bigBangTime() {
  return start === null ? 0 : (performance.now() - start) / 1000;
}

/** Start the bang again (e.g. when coming back to the title). */
export function resetBigBang() {
  start = null;
}

export function drawBigBang(ctx, w, h) {
  const now = performance.now();
  if (start === null) {
    start = now;
    last = now;
    particles = [];
    // The initial explosion
    for (let i = 0; i < 700; i++) emit(w / 2, h / 2, 120, 1100, 2.5 + Math.random() * 1.5);
  }
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = (now - start) / 1000;
  const cx = w / 2;
  const cy = h / 2;

  // The universe slowly "appears" behind the bang
  drawSpace(ctx, w, h);
  ctx.fillStyle = `rgba(4, 3, 10, ${Math.max(0.15, 0.85 - t * 0.35)})`;
  ctx.fillRect(0, 0, w, h);

  // Glowing core (pulses gently once things settle)
  const pulse = 1 + 0.08 * Math.sin(t * 2.2);
  const coreR = Math.max(w, h) * (t < 0.4 ? 0.1 + t * 1.2 : 0.42) * pulse;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  const heat = Math.max(0, 1 - t / 2.5);
  core.addColorStop(0, `rgba(255, 245, 220, ${0.35 + 0.6 * heat})`);
  core.addColorStop(0.15, `rgba(255, 190, 110, ${0.22 + 0.5 * heat})`);
  core.addColorStop(0.45, `rgba(200, 80, 160, ${0.12 + 0.25 * heat})`);
  core.addColorStop(1, 'rgba(60, 30, 120, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  // Shockwave rings
  ctx.lineWidth = 3;
  for (const t0 of [0, 0.12, 0.3]) {
    const age = t - t0;
    if (age < 0 || age > 1.6) continue;
    const r = age * Math.max(w, h) * 0.9;
    ctx.strokeStyle = `rgba(255, 230, 190, ${0.6 * (1 - age / 1.6)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Keep the universe expanding: a steady stream of new matter from the centre
  spawnAcc += dt * (t < 1 ? 0 : 90);
  while (spawnAcc >= 1) {
    spawnAcc -= 1;
    emit(cx, cy, 40, 260, 3 + Math.random() * 2);
  }

  // Move and draw the streaks (they speed up as they fly out, like expanding space)
  ctx.lineCap = 'round';
  const keep = [];
  for (const p of particles) {
    p.age += dt;
    const grow = 1 + dt * 0.9;
    p.vx *= grow;
    p.vy *= grow;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.age > p.life || p.x < -50 || p.y < -50 || p.x > w + 50 || p.y > h + 50) continue;
    keep.push(p);
    const fadeIn = Math.min(1, p.age * 4);
    const fadeOut = 1 - p.age / p.life;
    ctx.globalAlpha = Math.max(0, Math.min(fadeIn, fadeOut));
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.width;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  particles = keep;

  // Blinding flash at the very start
  if (t < 0.7) {
    ctx.fillStyle = `rgba(255, 252, 240, ${1 - t / 0.7})`;
    ctx.fillRect(0, 0, w, h);
  }
}
