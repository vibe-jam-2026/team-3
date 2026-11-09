// Energy shots fired by the alien boss.
// - A shot hurts a player it touches.
// - The chain bounces shots (no swing needed). A bounced shot turns blue,
//   speeds up, and from then on hurts enemies and bosses instead of players.
// - Shots disappear at the arena wall or after a few seconds.

import { ALIEN, DEBUG, PLAYER } from './config.js';
import { distToSegmentSq } from './chain.js';
import { hitBoss } from './boss.js';

export function fireProjectile(game, x, y, vx, vy, damage) {
  game.projectiles.push({ x, y, vx, vy, damage, r: ALIEN.projectileRadius, reflected: false, age: 0, bounceCooldown: 0 });
}

function closestOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq ? ((px - ax) * abx + (py - ay) * aby) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return [ax + abx * t, ay + aby * t];
}

export function updateProjectiles(game, dt) {
  const pts = game.chain.points;
  const keep = [];

  for (const s of game.projectiles) {
    s.age += dt;
    s.bounceCooldown = Math.max(0, s.bounceCooldown - dt);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    let gone = s.age > ALIEN.projectileLife ||
      s.x < -s.r || s.y < -s.r || s.x > game.width + s.r || s.y > game.height + s.r;

    // Bounce off the chain
    if (!gone && s.bounceCooldown <= 0) {
      const reach = s.r + 3;
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        if (distToSegmentSq(s.x, s.y, p.x, p.y, q.x, q.y) >= reach * reach) continue;
        const [cx, cy] = closestOnSegment(s.x, s.y, p.x, p.y, q.x, q.y);
        let nx = s.x - cx;
        let ny = s.y - cy;
        let nl = Math.hypot(nx, ny);
        if (nl < 0.001) { nx = -s.vx; ny = -s.vy; nl = Math.hypot(nx, ny) || 1; }
        nx /= nl; ny /= nl;
        const dot = s.vx * nx + s.vy * ny;
        if (dot < 0) { s.vx -= 2 * dot * nx; s.vy -= 2 * dot * ny; }
        // Bounced shots get faster (once)
        if (!s.reflected) { s.vx *= ALIEN.reflectSpeedMult; s.vy *= ALIEN.reflectSpeedMult; }
        s.reflected = true;
        s.age = 0; // fresh lifetime after a bounce
        s.bounceCooldown = 0.08;
        s.x = cx + nx * (reach + 1);
        s.y = cy + ny * (reach + 1);
        game.effects.push({ kind: 'puff', x: s.x, y: s.y, r: 5, vx: 0, vy: 0, angle: 0, spin: 0, life: 0.15, maxLife: 0.15 });
        break;
      }
    }

    if (!gone && !s.reflected) {
      // Alien shot hits a player
      for (const p of game.players) {
        if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 > (p.r + s.r) ** 2) continue;
        if (p.invuln <= 0 && !DEBUG.god) {
          p.hp = Math.max(0, p.hp - s.damage);
          p.invuln = PLAYER.invulnTime;
        }
        gone = true;
        break;
      }
    } else if (!gone) {
      // Bounced shot hits an enemy or a boss
      for (const e of game.enemies) {
        if (e.dead || e.hp <= 0 || e.spawnAnim > 0) continue;
        if ((e.x - s.x) ** 2 + (e.y - s.y) ** 2 > (e.r + s.r) ** 2) continue;
        e.flash = 0.1;
        e.lastHitVx = s.vx; e.lastHitVy = s.vy;
        if (!e.invincible) {
          if (e.boss) {
            if (e.hitCooldown <= 0) hitBoss(e);
          } else {
            e.hitsLeft -= 1;
            if (e.hitsLeft <= 0) e.hp = 0;
            e.vx += s.vx * 0.3; e.vy += s.vy * 0.3;
          }
        }
        gone = true;
        break;
      }
    }

    if (!gone) keep.push(s);
  }
  game.projectiles = keep;
}

export function drawProjectiles(ctx, projectiles) {
  for (const s of projectiles) {
    const color = s.reflected ? '#4fc3f7' : '#7cff9c';
    const sp = Math.hypot(s.vx, s.vy) || 1;
    // Short glowing trail
    ctx.strokeStyle = s.reflected ? 'rgba(79, 195, 247, 0.35)' : 'rgba(124, 255, 156, 0.35)';
    ctx.lineWidth = s.r * 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - (s.vx / sp) * s.r * 3, s.y - (s.vy / sp) * s.r * 3);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}
