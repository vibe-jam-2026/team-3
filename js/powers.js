// Voice-activated powers (keyboard fallback: B and K).
//
// BEAM:   both worm heads fire a huge laser beam the way they're facing for a few
//         seconds. It destroys every enemy and alien shot it touches, and chips
//         hits off bosses. Rats (neutral) are spared.
// METEOR: a meteor streaks in and slams into the arena: every non-boss enemy dies,
//         bosses lose a couple of hits, all alien shots are wiped out.

import { POWERS } from './config.js';
import { hitBoss } from './boss.js';
import { playBeam, playMeteorFall, playBoom } from './audio.js';
import { arcade, pixel } from './fonts.js';

export function createPowers() {
  // fx: meteor particles (embers, smoke, debris) · rings: shockwaves · boom: impact text timer
  return { beamCd: 0, meteorCd: 0, beamTime: 0, meteor: null, flash: 0, craters: [], fx: [], rings: [], boom: 0, boomAt: null };
}

/** Try to use a power. Returns true if it fired (false while it's cooling down). */
export function usePower(game, kind) {
  const P = game.powers;
  if (kind === 'beam' && P.beamCd <= 0) {
    P.beamTime = POWERS.beamDuration;
    P.beamCd = POWERS.beamCooldown;
    playBeam(POWERS.beamDuration);
    return true;
  }
  if (kind === 'meteor' && P.meteorCd <= 0 && !P.meteor) {
    const tx = game.width * (0.3 + Math.random() * 0.4);
    const ty = game.height * (0.35 + Math.random() * 0.3);
    P.meteor = { sx: tx - game.width * 0.7, sy: -220, tx, ty, t: 0, spin: Math.random() * 6 };
    P.meteorCd = POWERS.meteorCooldown;
    playMeteorFall(POWERS.meteorFallTime);
    return true;
  }
  return false;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq ? ((px - ax) * abx + (py - ay) * aby) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + abx * t - px, ay + aby * t - py);
}

function beamLine(game, p) {
  const lx = p.lookX ?? (p.index === 0 ? -1 : 1);
  const ly = p.lookY ?? 0;
  const len = Math.hypot(game.width, game.height);
  return { ax: p.x, ay: p.y, bx: p.x + lx * len, by: p.y + ly * len, lx, ly };
}

function zap(e, vx, vy) {
  if (e.neutral || e.dead || e.hp <= 0 || e.invincible) return;
  e.flash = 0.1;
  e.lastHitVx = vx; e.lastHitVy = vy;
  if (e.boss) {
    if (e.hitCooldown <= 0) hitBoss(e);
  } else {
    e.hitsLeft = 0;
    e.hp = 0;
  }
}

export function updatePowers(game, dt) {
  const P = game.powers;
  P.beamCd = Math.max(0, P.beamCd - dt);
  P.meteorCd = Math.max(0, P.meteorCd - dt);
  P.flash = Math.max(0, P.flash - dt);
  for (const c of P.craters) c.life -= dt;
  P.craters = P.craters.filter((c) => c.life > 0);

  // Beam
  if (P.beamTime > 0) {
    P.beamTime -= dt;
    const half = POWERS.beamWidth / 2;
    for (const p of game.players) {
      const L = beamLine(game, p);
      for (const e of game.enemies) {
        if (distToSegment(e.x, e.y, L.ax, L.ay, L.bx, L.by) < half + e.r) zap(e, L.lx * 600, L.ly * 600);
      }
      game.projectiles = game.projectiles.filter((s) => distToSegment(s.x, s.y, L.ax, L.ay, L.bx, L.by) > half + s.r);
    }
  }

  // Meteor
  const m = P.meteor;
  if (m) {
    m.t += dt;
    m.spin += dt * 4;
    // Embers and smoke streaming off the falling rock
    const pos = meteorPos(m);
    const size = meteorSize(m);
    for (let n = 0; n < 6; n++) {
      P.fx.push({
        kind: 'ember',
        x: pos.x + (Math.random() - 0.5) * size, y: pos.y + (Math.random() - 0.5) * size,
        vx: -pos.ux * (80 + Math.random() * 160) + (Math.random() - 0.5) * 80,
        vy: -pos.uy * (80 + Math.random() * 160) + (Math.random() - 0.5) * 80,
        r: 1.5 + Math.random() * 3, life: 0.5 + Math.random() * 0.5, maxLife: 1,
        color: ['#fff3c4', '#ffd54f', '#ff9800', '#ff5722'][Math.floor(Math.random() * 4)],
      });
    }
    if (Math.random() < 0.6) {
      P.fx.push({
        kind: 'smoke', x: pos.x - pos.ux * size, y: pos.y - pos.uy * size,
        vx: -pos.ux * 30, vy: -pos.uy * 30, r: size * 0.4, grow: 40,
        life: 1.2, maxLife: 1.2,
      });
    }
    if (m.t >= POWERS.meteorFallTime) impact(game, m);
  }

  // Meteor particles
  P.boom = Math.max(0, P.boom - dt);
  for (const f of P.fx) {
    f.life -= dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const drag = Math.exp(-(f.kind === 'debris' ? 2 : f.kind === 'smoke' ? 1.5 : 3) * dt);
    f.vx *= drag; f.vy *= drag;
    if (f.grow) f.r += f.grow * dt;
    if (f.spin) f.angle += f.spin * dt;
  }
  P.fx = P.fx.filter((f) => f.life > 0);
  for (const r of P.rings) r.t += dt;
  P.rings = P.rings.filter((r) => r.t < r.dur);
}

function meteorPos(m) {
  const k = Math.min(1, m.t / POWERS.meteorFallTime);
  const e = k * k; // speeds up as it falls
  const dx = m.tx - m.sx;
  const dy = m.ty - m.sy;
  const d = Math.hypot(dx, dy);
  return { x: m.sx + dx * e, y: m.sy + dy * e, ux: dx / d, uy: dy / d, k };
}

function meteorSize(m) {
  return 30 + 45 * Math.min(1, m.t / POWERS.meteorFallTime);
}

function impact(game, m) {
  const P = game.powers;
  P.meteor = null;
  P.flash = 0.9;
  P.boom = 1;
  P.boomAt = { x: m.tx, y: m.ty };
  P.craters.push({ x: m.tx, y: m.ty, life: 9, maxLife: 9 });
  // Three shockwaves
  for (let i = 0; i < 3; i++) P.rings.push({ x: m.tx, y: m.ty, t: -i * 0.09, dur: 0.9 + i * 0.15, width: 14 - i * 4 });
  // Fireball
  P.fx.push({ kind: 'fireball', x: m.tx, y: m.ty, vx: 0, vy: 0, r: 40, grow: 260, life: 0.7, maxLife: 0.7 });
  // Rock debris
  for (let i = 0; i < 36; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 250 + Math.random() * 650;
    P.fx.push({
      kind: 'debris', x: m.tx, y: m.ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 4 + Math.random() * 9, angle: Math.random() * 6, spin: (Math.random() - 0.5) * 14,
      life: 0.9 + Math.random() * 0.8, maxLife: 1.7,
    });
  }
  // Sparks
  for (let i = 0; i < 140; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 150 + Math.random() * 900;
    P.fx.push({
      kind: 'ember', x: m.tx, y: m.ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 1.5 + Math.random() * 3, life: 0.5 + Math.random() * 0.9, maxLife: 1.4,
      color: ['#ffffff', '#fff3c4', '#ffd54f', '#ff9800', '#ff5722'][Math.floor(Math.random() * 5)],
    });
  }
  // Smoke clouds rolling outward
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
    const sp = 60 + Math.random() * 120;
    P.fx.push({
      kind: 'smoke', x: m.tx + Math.cos(a) * 30, y: m.ty + Math.sin(a) * 30,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 30 + Math.random() * 20, grow: 50,
      life: 2 + Math.random(), maxLife: 3,
    });
  }

  game.projectiles = [];
  for (const e of game.enemies) {
    if (e.neutral || e.dead || e.invincible) continue;
    const vx = (e.x - m.tx) * 3;
    const vy = (e.y - m.ty) * 3;
    if (e.boss) {
      for (let i = 0; i < POWERS.meteorBossHits; i++) { e.hitCooldown = 0; hitBoss(e); }
      e.lastHitVx = vx; e.lastHitVy = vy;
    } else {
      zap(e, vx, vy);
    }
  }
  playBoom();
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Scorched craters on the floor (under everything): a molten centre that cools down. */
export function drawCraters(ctx, game) {
  for (const c of game.powers.craters) {
    const age = c.maxLife - c.life;
    const fade = Math.min(1, c.life / 2);
    const heat = Math.max(0, 1 - age / 4); // glowing hot for the first few seconds
    // Scorch mark
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 130);
    g.addColorStop(0, `rgba(15, 6, 3, ${0.75 * fade})`);
    g.addColorStop(0.55, `rgba(70, 25, 8, ${0.45 * fade})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 130, 0, Math.PI * 2);
    ctx.fill();
    // Rim
    ctx.strokeStyle = `rgba(40, 18, 8, ${0.6 * fade})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 55, 0, Math.PI * 2);
    ctx.stroke();
    // Molten core
    if (heat > 0) {
      const flicker = 0.85 + 0.15 * Math.sin(performance.now() / 60 + c.x);
      const m = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 50);
      m.addColorStop(0, `rgba(255, 240, 180, ${heat * flicker})`);
      m.addColorStop(0.4, `rgba(255, 120, 30, ${0.8 * heat * flicker})`);
      m.addColorStop(1, 'rgba(120, 20, 0, 0)');
      ctx.fillStyle = m;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 50, 0, Math.PI * 2);
      ctx.fill();
      // Glowing cracks radiating out
      ctx.strokeStyle = `rgba(255, 140, 40, ${0.8 * heat})`;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7 + c.x * 0.01;
        ctx.beginPath();
        ctx.moveTo(c.x + Math.cos(a) * 30, c.y + Math.sin(a) * 30);
        ctx.lineTo(c.x + Math.cos(a + 0.15) * 70, c.y + Math.sin(a + 0.15) * 70);
        ctx.lineTo(c.x + Math.cos(a - 0.05) * 100, c.y + Math.sin(a - 0.05) * 100);
        ctx.stroke();
      }
    }
  }
}

export function drawBeams(ctx, game) {
  const P = game.powers;
  if (P.beamTime <= 0) return;
  const t = performance.now() / 1000;
  const fadeIn = Math.min(1, (POWERS.beamDuration - P.beamTime) / 0.15);
  const fadeOut = Math.min(1, P.beamTime / 0.3);
  const k = Math.min(fadeIn, fadeOut);
  const W = POWERS.beamWidth * (0.9 + 0.1 * Math.sin(t * 40)) * k;
  ctx.save();
  ctx.lineCap = 'round';
  for (const p of game.players) {
    const L = beamLine(game, p);
    const layers = [
      [W * 1.6, `${p.color}33`],
      [W, `${p.color}aa`],
      [W * 0.55, 'rgba(255, 255, 255, 0.9)'],
      [W * 0.2, '#ffffff'],
    ];
    for (const [width, col] of layers) {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1, width);
      ctx.beginPath();
      ctx.moveTo(L.ax, L.ay);
      ctx.lineTo(L.bx, L.by);
      ctx.stroke();
    }
    // Glowing ball at the mouth
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, W);
    g.addColorStop(0, 'rgba(255, 255, 255, 1)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, W, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function rockPath(ctx, x, y, size, angle) {
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const a = angle + (i / 12) * Math.PI * 2;
    const rr = size * (0.82 + 0.18 * Math.sin(i * 2.7 + 1.3));
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** The falling meteor, its warning, its particles and the impact (drawn on top). */
export function drawMeteor(ctx, game) {
  const P = game.powers;
  const m = P.meteor;
  const t = performance.now() / 1000;

  if (m) {
    const pos = meteorPos(m);
    const size = meteorSize(m);
    const k = pos.k;

    // The sky turns red as it comes in
    ctx.fillStyle = `rgba(120, 10, 0, ${0.32 * k})`;
    ctx.fillRect(0, 0, game.width, game.height);

    // Glow growing on the ground where it will hit
    const gg = ctx.createRadialGradient(m.tx, m.ty, 0, m.tx, m.ty, 160);
    gg.addColorStop(0, `rgba(255, 120, 40, ${0.5 * k})`);
    gg.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(m.tx, m.ty, 160, 0, Math.PI * 2);
    ctx.fill();

    // Rotating crosshair locked on the target
    ctx.save();
    ctx.translate(m.tx, m.ty);
    ctx.rotate(t * 2);
    const R = 90 - 35 * k;
    ctx.strokeStyle = `rgba(255, 60, 60, ${0.6 + 0.4 * Math.abs(Math.sin(t * 14))})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(R - 18, 0);
      ctx.lineTo(R + 18, 0);
      ctx.stroke();
    }
    ctx.restore();

    // INCOMING!
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = arcade(30);
    ctx.shadowColor = 'rgba(255, 60, 0, 0.9)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ffffff' : '#ffcc80';
    ctx.globalAlpha = 0.9;
    ctx.fillText('☄ INCOMING! ☄', game.width / 2, game.height * 0.22);
    ctx.restore();

    // Heat halo
    const halo = ctx.createRadialGradient(pos.x, pos.y, size * 0.5, pos.x, pos.y, size * 3);
    halo.addColorStop(0, 'rgba(255, 200, 100, 0.55)');
    halo.addColorStop(0.4, 'rgba(255, 100, 20, 0.25)');
    halo.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Long fire trail
    const len = size * 9;
    const tr = ctx.createLinearGradient(pos.x, pos.y, pos.x - pos.ux * len, pos.y - pos.uy * len);
    tr.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
    tr.addColorStop(0.15, 'rgba(255, 200, 80, 0.85)');
    tr.addColorStop(0.45, 'rgba(255, 90, 20, 0.5)');
    tr.addColorStop(1, 'rgba(120, 20, 0, 0)');
    ctx.fillStyle = tr;
    const px = -pos.uy;
    const py = pos.ux;
    ctx.beginPath();
    ctx.moveTo(pos.x + px * size * 0.95, pos.y + py * size * 0.95);
    ctx.lineTo(pos.x - pos.ux * len, pos.y - pos.uy * len);
    ctx.lineTo(pos.x - px * size * 0.95, pos.y - py * size * 0.95);
    ctx.closePath();
    ctx.fill();
  }

  // Particles behind the rock: smoke, then embers
  for (const f of P.fx) {
    if (f.kind !== 'smoke') continue;
    const a = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = `rgba(60, 50, 50, ${0.35 * a})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (m) {
    // The rock: dark, spinning, with glowing molten cracks
    const pos = meteorPos(m);
    const size = meteorSize(m);
    const rg = ctx.createRadialGradient(pos.x + pos.ux * size * 0.3, pos.y + pos.uy * size * 0.3, size * 0.1, pos.x, pos.y, size);
    rg.addColorStop(0, '#ffcc80');
    rg.addColorStop(0.35, '#a0441a');
    rg.addColorStop(1, '#2b1209');
    ctx.fillStyle = rg;
    rockPath(ctx, pos.x, pos.y, size, m.spin);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 170, 60, 0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    rockPath(ctx, pos.x, pos.y, size, m.spin);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 190, 80, 0.85)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      const a = m.spin + i * 1.3;
      ctx.beginPath();
      ctx.moveTo(pos.x + Math.cos(a) * size * 0.1, pos.y + Math.sin(a) * size * 0.1);
      ctx.lineTo(pos.x + Math.cos(a + 0.4) * size * 0.55, pos.y + Math.sin(a + 0.4) * size * 0.55);
      ctx.lineTo(pos.x + Math.cos(a + 0.2) * size, pos.y + Math.sin(a + 0.2) * size);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Fireball, debris and embers
  for (const f of P.fx) {
    const a = Math.max(0, f.life / f.maxLife);
    if (f.kind === 'fireball') {
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(255, 255, 230, ${a})`);
      g.addColorStop(0.3, `rgba(255, 200, 80, ${0.9 * a})`);
      g.addColorStop(0.7, `rgba(255, 90, 20, ${0.6 * a})`);
      g.addColorStop(1, 'rgba(150, 20, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.kind === 'debris') {
      ctx.globalAlpha = Math.min(1, a * 1.5);
      ctx.fillStyle = '#3a1a0c';
      rockPath(ctx, f.x, f.y, f.r, f.angle);
      ctx.fill();
      ctx.strokeStyle = '#ff8a3d';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.kind === 'ember') {
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Shockwave rings
  for (const r of P.rings) {
    if (r.t < 0) continue;
    const k = r.t / r.dur;
    const rad = (1 - (1 - k) ** 2) * Math.hypot(game.width, game.height) * 0.75;
    ctx.strokeStyle = `rgba(255, 230, 190, ${0.85 * (1 - k)})`;
    ctx.lineWidth = r.width * (1 - k * 0.6);
    ctx.beginPath();
    ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
    ctx.stroke();
  }

  // BOOM!
  if (P.boom > 0 && P.boomAt) {
    const k = 1 - P.boom; // 0 -> 1
    const scale = k < 0.15 ? 0.4 + (k / 0.15) * 0.9 : 1.3 - Math.min(0.3, (k - 0.15) * 0.6);
    ctx.save();
    ctx.translate(P.boomAt.x, P.boomAt.y - 90);
    ctx.rotate(-0.12);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.min(1, P.boom * 2.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = arcade(56);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3a0d00';
    ctx.lineWidth = 12;
    ctx.strokeText('BOOM!', 0, 0);
    const tg = ctx.createLinearGradient(0, -40, 0, 40);
    tg.addColorStop(0, '#fff59d');
    tg.addColorStop(0.5, '#ffb300');
    tg.addColorStop(1, '#ff3d00');
    ctx.fillStyle = tg;
    ctx.fillText('BOOM!', 0, 0);
    ctx.restore();
  }
}

/** Impact flash over everything: white-hot first, then fading through orange. */
export function drawImpactFlash(ctx, game) {
  const f = game.powers.flash;
  if (f <= 0) return;
  const k = f / 0.9; // 1 -> 0
  const color = k > 0.7 ? '255, 255, 245' : '255, 150, 60';
  ctx.fillStyle = `rgba(${color}, ${k > 0.7 ? 0.95 : k * 0.7})`;
  ctx.fillRect(0, 0, game.width, game.height);
}
