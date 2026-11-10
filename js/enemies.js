// Enemies: eggs (tier 1), chickens (tier 2) and roosters (tier 3).
// They spawn at the arena edge and chase the nearest player.

import { ENEMY, ENEMY_TYPES, TIER_SPAWNS, RATS } from './config.js';
import { drawEgg, drawEggBody, SPECKLE_SETS } from './egg.js';
import { sprite, blit } from './sprites.js';
import { tintedContext } from './palette.js';
import { drawChicken } from './chicken.js';
import { playCluck, playCrow, playSqueak } from './audio.js';
import { updateRat, drawRat } from './rat.js';
import { updateBoss, drawBoss } from './boss.js';
import { updateAlien, drawAlien } from './alien.js';

/** Pick which kind of enemy to spawn this wave. */
function pickType(wave) {
  let roll = Math.random();
  for (const type of ['rooster', 'chicken']) {
    const t = TIER_SPAWNS[type];
    if (wave < t.fromWave) continue;
    const chance = Math.min(t.max, t.perWave * (wave - t.fromWave + 1));
    if (roll < chance) return type;
    roll -= chance;
  }
  return 'egg';
}

export function spawnEnemy(game, forcedType = null) {
  const { width, height, wave } = game;
  const type = forcedType ?? pickType(wave);
  const def = ENEMY_TYPES[type];
  const r = def.radius;
  // Pick a random point on the arena edge, just inside it
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * width; y = r; }
  else if (side === 1) { x = width - r; y = Math.random() * height; }
  else if (side === 2) { x = Math.random() * width; y = height - r; }
  else { x = r; y = Math.random() * height; }

  const hp = def.hp + ENEMY.hpPerWave * (wave - 1);
  game.enemies.push({
    type, tier: def.tier,
    x, y, r,
    damage: def.damage * ENEMY.damageGrowth ** (wave - 1),
    vx: 0, vy: 0,          // knockback velocity
    hp, maxHp: hp,
    hitsLeft: def.hits ?? 1, maxHits: def.hits ?? 1, // chain hits needed to kill it
    speed: ENEMY.baseSpeed * ENEMY.speedGrowth ** (wave - 1) * def.speed,
    hitCooldown: 0,
    flash: 0,
    spawnAnim: 0.4,        // fade-in; harmless while spawning
    roll: Math.random() * Math.PI * 2, // current rotation as it rolls
    speckleId: Math.floor(Math.random() * SPECKLE_SETS.length),
    speckles: null, // set just below from speckleId
    facing: Math.random() < 0.5 ? -1 : 1, // chickens look left or right
    walk: Math.random() * 10,             // walk-cycle phase
    dead: false,
    neutral: !!def.neutral,
    invincible: wave === game.cursedWave && !def.neutral, // "Max All" curse
  });
  const e = game.enemies[game.enemies.length - 1];
  e.speckles = SPECKLE_SETS[e.speckleId];
  if (type === 'rat') {
    e.hitsLeft = e.maxHits = game.stats.ratHits; // Rat health upgrade
    e.speed = RATS.speed;
    e.state = 'seek';
    e.eatTimer = 0;
    e.wanderAngle = Math.random() * Math.PI * 2;
    e.wanderTimer = 0;
  }

  // Announce the bigger enemies
  if (type === 'chicken') playCluck();
  else if (type === 'rat') playSqueak();
  else if (type === 'rooster') playCrow();
}

export function updateEnemies(game, dt) {
  const enemies = game.enemies;

  for (const e of enemies) {
    e.lastX = e.x;
    e.lastY = e.y;
    e.hitCooldown = Math.max(0, e.hitCooldown - dt);
    e.flash = Math.max(0, e.flash - dt);
    e.spawnAnim = Math.max(0, e.spawnAnim - dt);

    // Rats hunt eggs; everything else chases the nearest player
    const target = e.type === 'rat' || e.boss ? null : nearest(game.players, e);
    if (e.type === 'rat' && e.spawnAnim <= 0) updateRat(game, e, dt);
    if (e.boss && e.spawnAnim <= 0) {
      if (e.type === 'alien') updateAlien(game, e, dt);
      else updateBoss(game, e, dt);
    }
    if (target) {
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = e.speed * game.stats.enemySpeedMult; // enemy-slow upgrade
      e.x += (dx / d) * speed * dt;
      e.y += (dy / d) * speed * dt;
    }

    // Knockback
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    const f = Math.exp(-ENEMY.knockbackFriction * dt);
    e.vx *= f; e.vy *= f;
  }

  // Push overlapping enemies apart so they form a crowd, not a single blob
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = a.r + b.r;
      const dSq = dx * dx + dy * dy;
      if (dSq >= min * min || dSq === 0) continue;
      const d = Math.sqrt(dSq);
      const nx = dx / d, ny = dy / d;
      // The boss is too heavy to be pushed: it shoves the others out of the way
      const wa = a.boss ? 0 : b.boss ? 1 : 0.5;
      const wb = b.boss ? 0 : a.boss ? 1 : 0.5;
      a.x -= nx * (min - d) * wa; a.y -= ny * (min - d) * wa;
      b.x += nx * (min - d) * wb; b.y += ny * (min - d) * wb;
    }
  }

  for (const e of enemies) {
    e.x = Math.max(e.r, Math.min(game.width - e.r, e.x));
    e.y = Math.max(e.r, Math.min(game.height - e.r, e.y));

    // Roll: turn by the distance travelled (arc length / radius),
    // clockwise when moving right, counter-clockwise when moving left
    const dx = e.x - e.lastX;
    const dy = e.y - e.lastY;
    const dist = Math.hypot(dx, dy);
    const dirSign = dx + dy * 0.3 >= 0 ? 1 : -1;
    e.roll += (dist / e.r) * dirSign;
    e.walk += dist / e.r;
    if (Math.abs(dx) > 0.15) e.facing = dx > 0 ? 1 : -1;
  }
}

function nearest(players, e) {
  let best = null;
  let bestD = Infinity;
  for (const p of players) {
    const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// Walk-cycle frames cached per enemy look (more frames = smoother legs, more memory)
const WALK_FRAMES = 8;

/**
 * Draw all enemies. Eggs, chickens, roosters and walking rats come from the sprite
 * cache (see sprites.js); bosses and eating rats are drawn directly.
 * dimension 1 = the other dimension: everything is drawn with shifted colours.
 */
export function drawEnemies(ctx, enemies, dimension = 0) {
  const tinted = dimension === 1;
  const direct = tinted ? tintedContext(ctx) : ctx;
  const look = (c) => (tinted ? tintedContext(c) : c);
  for (const e of enemies) {
    const appear = 1 - e.spawnAnim / 0.4;           // 0 -> 1 while spawning
    ctx.globalAlpha = 0.3 + 0.7 * appear;
    const scale = 0.5 + 0.5 * appear;
    const flash = e.flash > 0;
    if (e.type === 'alien') drawAlien(direct, e, scale);
    else if (e.boss) drawBoss(direct, e, scale);
    else if (e.type === 'egg') {
      // Shadow on the ground, then the cached egg, rotated as it rolls
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x + 2, e.y + e.r * 0.9, e.r * 0.9 * scale, e.r * 0.35 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      const size = e.r * 2.8;
      const s = sprite(`egg|${e.r}|${e.speckleId}|${flash}|${dimension}`, size, (c, h) => {
        c.translate(h, h);
        drawEggBody(look(c), e.r, e.speckles, flash);
      });
      blit(ctx, s, e.x, e.y, scale, false, e.roll);
    } else if (e.type === 'rat' && e.state === 'eat') {
      drawRat(direct, e, scale); // animated by the clock while eating: drawn directly
    } else {
      // Chickens, roosters and walking rats: cached walk-cycle frames
      const isRat = e.type === 'rat';
      const speed = isRat ? 3 : 2.2;                // matches the legs' cycle in their draw code
      const cycle = (Math.PI * 2) / speed;
      const frame = Math.floor((((e.walk % cycle) + cycle) % cycle) / cycle * WALK_FRAMES);
      const size = e.r * (isRat ? 5 : 3.2);
      const s = sprite(`${e.type}|${e.r}|${frame}|${flash}|${dimension}`, size, (c, h) => {
        const pose = { x: h, y: h, r: e.r, facing: 1, walk: (frame / WALK_FRAMES) * cycle, flash: flash ? 1 : 0, state: e.state };
        if (isRat) drawRat(look(c), pose, 1);
        else drawChicken(look(c), pose, e.type === 'rooster', 1);
      });
      blit(ctx, s, e.x, e.y, scale, e.facing < 0);
    }
    ctx.globalAlpha = 1;

    // Hits-left bar once it has been hit (the boss has its own big bar)
    if (!e.boss && e.hitsLeft > 0 && e.hitsLeft < e.maxHits) {
      const w = e.r * 2;
      const y = e.y - e.r * 1.4 - 6;
      ctx.fillStyle = '#3a1d1d';
      ctx.fillRect(e.x - e.r, y, w, 4);
      ctx.fillStyle = '#ff8a80';
      ctx.fillRect(e.x - e.r, y, w * (e.hitsLeft / e.maxHits), 4);
    }
  }
}
