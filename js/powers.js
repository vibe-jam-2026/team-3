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

export function createPowers() {
  return { beamCd: 0, meteorCd: 0, beamTime: 0, meteor: null, flash: 0, craters: [] };
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
    P.meteor = { sx: tx - game.width * 0.7, sy: -150, tx, ty, t: 0 };
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
    if (m.t >= POWERS.meteorFallTime) {
      P.meteor = null;
      P.flash = 0.6;
      P.craters.push({ x: m.tx, y: m.ty, life: 6, maxLife: 6 });
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
      game.effects.push({ kind: 'puff', x: m.tx, y: m.ty, r: 60, vx: 0, vy: 0, angle: 0, spin: 0, life: 0.6, maxLife: 0.6 });
      playBoom();
    }
  }
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Scorched craters on the floor (under everything). */
export function drawCraters(ctx, game) {
  for (const c of game.powers.craters) {
    const a = Math.min(1, c.life / 2) * 0.55;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 90);
    g.addColorStop(0, `rgba(20, 8, 4, ${a})`);
    g.addColorStop(0.6, `rgba(90, 30, 10, ${a * 0.6})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 90, 0, Math.PI * 2);
    ctx.fill();
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

export function drawMeteor(ctx, game) {
  const m = game.powers.meteor;
  if (!m) return;
  const k = m.t / POWERS.meteorFallTime;
  const e = k * k; // speeds up as it falls
  const x = m.sx + (m.tx - m.sx) * e;
  const y = m.sy + (m.ty - m.sy) * e;
  const size = 26 + 30 * k;

  // Target marker on the ground
  ctx.strokeStyle = `rgba(255, 82, 82, ${0.4 + 0.4 * Math.abs(Math.sin(m.t * 12))})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(m.tx, m.ty, 70 * (1 - k * 0.5), 0, Math.PI * 2);
  ctx.stroke();

  // Fiery trail
  const dx = m.tx - m.sx;
  const dy = m.ty - m.sy;
  const d = Math.hypot(dx, dy);
  const ux = dx / d;
  const uy = dy / d;
  const trail = ctx.createLinearGradient(x, y, x - ux * size * 6, y - uy * size * 6);
  trail.addColorStop(0, 'rgba(255, 230, 150, 0.95)');
  trail.addColorStop(0.3, 'rgba(255, 120, 40, 0.7)');
  trail.addColorStop(1, 'rgba(255, 60, 20, 0)');
  ctx.strokeStyle = trail;
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - ux * size * 6, y - uy * size * 6);
  ctx.stroke();

  // Rock
  const g = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, size * 0.1, x, y, size);
  g.addColorStop(0, '#ffd180');
  g.addColorStop(0.4, '#b5541f');
  g.addColorStop(1, '#4a2310');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i <= 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rr = size * (0.85 + 0.15 * Math.sin(i * 2.7));
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.fill();
}

/** White impact flash over everything. */
export function drawImpactFlash(ctx, game) {
  const f = game.powers.flash;
  if (f <= 0) return;
  ctx.fillStyle = `rgba(255, 240, 210, ${f / 0.6 * 0.85})`;
  ctx.fillRect(0, 0, game.width, game.height);
}
