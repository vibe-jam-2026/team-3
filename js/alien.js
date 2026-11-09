// Alien boss (every 10th wave): a space cat flying a saucer.
// It glides around the arena and fires volleys of energy shots in the players'
// general direction (not aimed exactly). The chain can bounce shots back;
// bounced shots hurt enemies and the alien itself (see projectiles.js).

import { ALIEN, ENEMY } from './config.js';
import { fireProjectile } from './projectiles.js';
import { playPew } from './audio.js';

export function spawnAlien(game) {
  const r = ALIEN.radius;
  const fromLeft = Math.random() < 0.5;
  game.enemies.push({
    type: 'alien', boss: true, tier: 4,
    x: fromLeft ? r : game.width - r,
    y: r + Math.random() * Math.max(1, game.height * 0.4),
    r,
    damage: ALIEN.damage * ENEMY.damageGrowth ** (game.wave - 1),
    vx: 0, vy: 0,
    hp: 1, maxHp: 1,
    hitsLeft: ALIEN.hits, maxHits: ALIEN.hits,
    speed: ALIEN.moveSpeed,
    hitCooldown: 0, flash: 0, spawnAnim: 0.4,
    roll: 0, speckles: [], walk: 0, facing: 1,
    dead: false, neutral: false,
    invincible: game.wave === game.cursedWave,
    // Movement: glide to a point, pause, pick another
    tx: game.width / 2, ty: game.height * 0.3, pause: 0,
    // Shooting: volleys of a few shots, a short gap between shots
    volleyTimer: 1.5, shotsLeft: 0, shotTimer: 0, aimX: 0, aimY: 0,
  });
}

function pickSpot(game, e) {
  const m = e.r + 20;
  e.tx = m + Math.random() * (game.width - m * 2);
  e.ty = m + Math.random() * (game.height - m * 2);
}

export function updateAlien(game, e, dt) {
  const slow = game.stats.enemySpeedMult;

  // Glide around
  if (e.pause > 0) {
    e.pause -= dt;
  } else {
    const dx = e.tx - e.x;
    const dy = e.ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      e.pause = 0.6 + Math.random() * 0.8;
      pickSpot(game, e);
    } else {
      const step = Math.min(d, e.speed * slow * dt);
      e.x += (dx / d) * step;
      e.y += (dy / d) * step;
    }
  }

  // Shooting
  e.volleyTimer -= dt;
  if (e.volleyTimer <= 0 && e.shotsLeft === 0) {
    const [min, max] = ALIEN.shotsPerVolley;
    e.shotsLeft = min + Math.floor(Math.random() * (max - min + 1));
    e.shotTimer = 0;
    e.volleyTimer = ALIEN.volleyInterval;
    // General direction: toward the middle of the two players
    const mx = (game.players[0].x + game.players[1].x) / 2;
    const my = (game.players[0].y + game.players[1].y) / 2;
    e.aimAngle = Math.atan2(my - e.y, mx - e.x);
  }
  if (e.shotsLeft > 0) {
    e.shotTimer -= dt;
    if (e.shotTimer <= 0) {
      const ang = e.aimAngle + (Math.random() * 2 - 1) * ALIEN.spread;
      const sx = e.x + Math.cos(ang) * e.r * 0.9;
      const sy = e.y + Math.sin(ang) * e.r * 0.6;
      const speed = ALIEN.projectileSpeed * slow;
      fireProjectile(game, sx, sy, Math.cos(ang) * speed, Math.sin(ang) * speed,
        ALIEN.projectileDamage * ENEMY.damageGrowth ** (game.wave - 1));
      playPew();
      e.shotsLeft -= 1;
      e.shotTimer = ALIEN.shotGap;
      e.recoil = 0.1;
    }
  }
  e.recoil = Math.max(0, (e.recoil || 0) - dt);
}

// ---------------------------------------------------------------------------
// Drawing: saucer seen slightly from the side, alien in a glass dome on top
// ---------------------------------------------------------------------------

export function drawAlien(ctx, e, scale = 1) {
  const r = e.r;
  const t = performance.now() / 1000;
  const hover = Math.sin(t * 3) * r * 0.06;
  const flash = e.flash > 0;
  const shooting = e.shotsLeft > 0 || e.recoil > 0;

  ctx.save();
  ctx.translate(e.x, e.y);

  // Shadow + tractor glow on the floor
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 1.0, r * 0.9 * scale, r * 0.25 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(124, 255, 156, 0.08)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.2);
  ctx.lineTo(r * 0.35, r * 0.2);
  ctx.lineTo(r * 0.8, r * 1.0);
  ctx.lineTo(-r * 0.8, r * 1.0);
  ctx.closePath();
  ctx.fill();

  if (e.invincible) {
    ctx.fillStyle = 'rgba(229, 57, 53, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.scale(scale, scale);
  ctx.translate(0, hover);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2b2f3a';

  // The pilot: a cat in the dome
  ctx.save();
  ctx.translate(0, -r * 0.14); // sit high enough that the whole face shows above the rim
  const fur = flash ? '#fff' : '#f0a04b';
  const furDark = flash ? '#fff' : '#c9772a';
  ctx.strokeStyle = '#5a3415';
  ctx.lineWidth = 1.5;
  // Ears (with pink insides)
  for (const s of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(s * r * 0.08, -r * 0.62);
    ctx.lineTo(s * r * 0.27, -r * 0.8);
    ctx.lineTo(s * r * 0.3, -r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = flash ? '#fff' : '#f7b6c2';
    ctx.beginPath();
    ctx.moveTo(s * r * 0.13, -r * 0.6);
    ctx.lineTo(s * r * 0.25, -r * 0.72);
    ctx.lineTo(s * r * 0.26, -r * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  // Head
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.42, r * 0.32, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Tabby stripes on the forehead
  ctx.strokeStyle = furDark;
  ctx.lineWidth = 2;
  for (const x of [-0.08, 0, 0.08]) {
    ctx.beginPath();
    ctx.moveTo(r * x, -r * 0.68);
    ctx.lineTo(r * x * 0.8, -r * 0.58);
    ctx.stroke();
  }
  // Eyes: green with slit pupils, glowing red while shooting
  for (const s of [-1, 1]) {
    ctx.fillStyle = shooting ? '#ff5252' : '#9be15d';
    ctx.beginPath();
    ctx.ellipse(s * r * 0.13, -r * 0.45, r * 0.08, r * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(s * r * 0.13, -r * 0.45, r * 0.02, r * 0.065, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s * r * 0.11, -r * 0.48, r * 0.015, 0, Math.PI * 2);
    ctx.fill();
  }
  // Nose and mouth
  ctx.fillStyle = flash ? '#fff' : '#f48fb1';
  ctx.beginPath();
  ctx.moveTo(-r * 0.035, -r * 0.36);
  ctx.lineTo(r * 0.035, -r * 0.36);
  ctx.lineTo(0, -r * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a3415';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-r * 0.035, -r * 0.31, r * 0.035, 0, Math.PI);
  ctx.arc(r * 0.035, -r * 0.31, r * 0.035, 0, Math.PI);
  ctx.stroke();
  // Whiskers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    for (const dy of [-0.03, 0.02]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.12, -r * 0.34);
      ctx.lineTo(s * r * 0.44, -r * (0.34 - dy * 2.5));
      ctx.stroke();
    }
  }

  ctx.restore();

  // Glass dome
  ctx.fillStyle = 'rgba(160, 220, 255, 0.28)';
  ctx.strokeStyle = 'rgba(200, 235, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.2, r * 0.52, r * 0.8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.22, -r * 0.55, r * 0.07, r * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Saucer body
  ctx.fillStyle = flash ? '#fff' : '#9aa4b5';
  ctx.strokeStyle = '#2b2f3a';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.08, r * 1.0, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = flash ? '#fff' : '#c9d1de';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.16, r * 0.85, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flash ? '#fff' : '#6c7587';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.12, r * 0.45, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Blinking lights around the rim
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI;
    const on = Math.floor(t * 6 + i) % 3 === 0;
    ctx.fillStyle = shooting ? '#ff5252' : on ? '#7cff9c' : '#3f6b4a';
    ctx.beginPath();
    ctx.arc(-Math.cos(a) * r * 0.8, -r * 0.02 + Math.sin(a) * r * 0.14, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Death: a big puff and a burst of metal bits and green goo. */
export function alienBurst(effects, e) {
  effects.push({
    kind: 'puff', x: e.x, y: e.y, r: e.r * 1.5,
    vx: 0, vy: 0, angle: 0, spin: 0,
    life: 0.5, maxLife: 0.5,
  });
  const colors = ['#9aa4b5', '#c9d1de', '#7cd67a', '#7cff9c', '#6c7587'];
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 280;
    effects.push({
      kind: 'feather',
      x: e.x + (Math.random() - 0.5) * e.r,
      y: e.y + (Math.random() - 0.5) * e.r * 0.5,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      drag: 2.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 10,
      size: e.r * (0.1 + Math.random() * 0.12),
      color: colors[i % colors.length],
      life: 1 + Math.random() * 0.6, maxLife: 1.6,
    });
  }
}
