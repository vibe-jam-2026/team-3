// Coins: dropped where an enemy dies. After a short delay they can be collected by
// touching a player, touching the chain, or by drifting into a player's magnet field.
// The team shares one wallet (game.coins). Coins left on the floor are lost when the wave ends.

import { COINS } from './config.js';
import { distToSegmentSq } from './chain.js';
import { arcade, pixel } from './fonts.js';
import { sprite, blit } from './sprites.js';

export function dropCoins(game, e) {
  // e.g. 3 coins x 0.8 = 2.4 -> 2 coins, plus a 40% chance of a third
  const exact = (COINS.dropByTier[e.tier] ?? 1) * COINS.dropRate * COINS.dropGrowth ** (game.wave - 1);
  const value = Math.floor(exact) + (Math.random() < exact % 1 ? 1 : 0);
  // Coins land on the spot where the enemy died (spread inside its body)
  for (let i = 0; i < value; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = value > 1 ? Math.sqrt(Math.random()) * e.r * 0.8 : 0;
    game.floorCoins.push({
      x: e.x + Math.cos(a) * d,
      y: e.y + Math.sin(a) * d,
      spin: Math.random() * Math.PI * 2,
      age: 0,
    });
  }
}

function collectible(c) {
  return c.age >= COINS.pickupDelay;
}

export function updateCoins(game, dt) {
  const magnet = game.stats.magnetRadius;
  const pts = game.chain.points;
  const chainReach = COINS.radius + 3;
  const keep = [];

  for (const c of game.floorCoins) {
    c.age += dt;
    c.spin += dt * 5;

    let picked = false;
    if (collectible(c)) {
      // Magnet: pull toward the nearest player inside the field, faster when closer
      let near = null;
      let nearD = Infinity;
      for (const p of game.players) {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d < nearD) { nearD = d; near = p; }
      }
      if (near && nearD > 0 && nearD < magnet + near.r) {
        const pull = COINS.magnetSpeed * (1.5 - nearD / (magnet + near.r));
        const step = Math.min(nearD, pull * dt);
        c.x += ((near.x - c.x) / nearD) * step;
        c.y += ((near.y - c.y) / nearD) * step;
        nearD -= step;
      }
      if (near && nearD < COINS.radius + near.r) picked = true;

      // The chain sweeps coins up too
      if (!picked) {
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i];
          const q = pts[i + 1];
          if (distToSegmentSq(c.x, c.y, p.x, p.y, q.x, q.y) < chainReach * chainReach) {
            picked = true;
            break;
          }
        }
      }
    }

    if (picked) {
      game.coins += 1;
      game.waveCoins += 1;
      game.effects.push({
        kind: 'coinpop', x: c.x, y: c.y, vx: 0, vy: -40, angle: 0, spin: 0,
        drag: 1, life: 0.35, maxLife: 0.35,
      });
    } else {
      keep.push(c);
    }
  }
  game.floorCoins = keep;
}

const SPIN_FRAMES = 12;

/** One coin at a given spin frame, centred, at full size (cached as a sprite). */
function coinSprite(frame) {
  const r = COINS.radius;
  return sprite(`coin|${r}|${frame}`, r * 2 + 6, (c, h) => {
    const w = Math.abs(Math.cos((frame / SPIN_FRAMES) * Math.PI)); // squash as it spins
    c.fillStyle = '#ffca28';
    c.strokeStyle = '#b8860b';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(h, h, Math.max(1.5, r * w), r, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    if (w > 0.4) {
      c.fillStyle = '#fff3c4';
      c.beginPath();
      c.ellipse(h - r * 0.25 * w, h - r * 0.3, r * 0.25 * w, r * 0.2, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
}

export function drawCoins(ctx, coins) {
  const r = COINS.radius;
  // All shadows in one path, then the coins as cached sprites
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  for (const c of coins) {
    const size = r * (0.4 + 0.6 * Math.min(1, c.age / 0.2));
    ctx.moveTo(c.x + 1 + size * 0.8, c.y + size * 0.9);
    ctx.ellipse(c.x + 1, c.y + size * 0.9, size * 0.8, size * 0.3, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  for (const c of coins) {
    // Not collectible yet: pops in and stays dim
    ctx.globalAlpha = collectible(c) ? 1 : 0.5;
    const grow = 0.4 + 0.6 * Math.min(1, c.age / 0.2);
    const frame = Math.floor(((c.spin / Math.PI) % 1) * SPIN_FRAMES) % SPIN_FRAMES;
    blit(ctx, coinSprite(frame), c.x, c.y, grow);
  }
  ctx.globalAlpha = 1;
}

/** Faint ring showing each player's magnet field. */
export function drawMagnetFields(ctx, game) {
  const R = game.stats.magnetRadius;
  ctx.strokeStyle = 'rgba(255, 213, 79, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 6]);
  for (const p of game.players) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, R + p.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/** Small "+1" that floats up when a coin is collected (drawn by the effects code). */
export function drawCoinPop(ctx, f) {
  ctx.fillStyle = '#ffd54f';
  ctx.font = arcade(10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+1', 0, 0);
}

/** Coin icon for the HUD. */
export function drawCoinIcon(ctx, x, y, r) {
  ctx.fillStyle = '#ffca28';
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
