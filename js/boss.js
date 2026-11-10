// Boss: a big dinosaur that shows up every few waves.
// It stomps toward the players, then picks one, shows a red arrow for 1 second
// and charges across the arena in that direction. It takes BOSS.hits chain hits to kill.
//
// States: 'walk' -> 'aim' (arrow shown) -> 'charge' (until it reaches a wall) -> 'recover' -> 'walk'

import { BOSS, ENEMY } from './config.js';
import { arcade, pixel } from './fonts.js';

const SKIN = '#4f8a3c';
const SKIN_DARK = '#356428';
const BELLY = '#a8c77a';
const SPOTS = '#3d6e2e';

export function spawnBoss(game) {
  const r = BOSS.radius;
  // Enter from the left or right edge, at a random height
  const fromLeft = Math.random() < 0.5;
  const x = fromLeft ? r : game.width - r;
  const y = r + Math.random() * Math.max(1, game.height - r * 2);
  game.enemies.push({
    type: 'dino', boss: true, tier: 4,
    x, y, r,
    damage: BOSS.damage * ENEMY.damageGrowth ** (game.wave - 1),
    vx: 0, vy: 0,
    hp: 1, maxHp: 1,               // not used: the boss counts hits instead
    hitsLeft: BOSS.hits, maxHits: BOSS.hits,
    speed: BOSS.walkSpeed,
    hitCooldown: 0, flash: 0, spawnAnim: 0.4,
    roll: 0, speckles: [], walk: 0,
    facing: fromLeft ? 1 : -1,
    dead: false, neutral: false,
    invincible: game.wave === game.cursedWave,
    state: 'walk', stateTime: BOSS.walkTime,
    chargeX: 0, chargeY: 0,
  });
}

function nearestPlayer(game, e) {
  let best = null;
  let bestD = Infinity;
  for (const p of game.players) {
    const d = (p.x - e.x) ** 2 + (p.y - e.y) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export function updateBoss(game, e, dt) {
  e.stateTime -= dt;
  const slow = game.stats.enemySpeedMult;

  if (e.state === 'walk') {
    const p = nearestPlayer(game, e);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * slow * dt;
    e.y += (dy / d) * e.speed * slow * dt;
    if (e.stateTime <= 0) {
      // Lock onto a random player and show the arrow
      const target = game.players[Math.floor(Math.random() * game.players.length)];
      const ax = target.x - e.x;
      const ay = target.y - e.y;
      const ad = Math.hypot(ax, ay) || 1;
      e.chargeX = ax / ad;
      e.chargeY = ay / ad;
      e.facing = e.chargeX >= 0 ? 1 : -1;
      e.state = 'aim';
      e.stateTime = BOSS.aimTime;
    }
  } else if (e.state === 'aim') {
    if (e.stateTime <= 0) {
      e.state = 'charge';
      e.stateTime = 5; // safety limit
    }
  } else if (e.state === 'charge') {
    const sp = BOSS.chargeSpeed * slow;
    e.x += e.chargeX * sp * dt;
    e.y += e.chargeY * sp * dt;
    // Charge until it slams into a wall
    const hitWall = e.x <= e.r || e.x >= game.width - e.r || e.y <= e.r || e.y >= game.height - e.r;
    if (hitWall || e.stateTime <= 0) {
      e.state = 'recover';
      e.stateTime = BOSS.recoverTime;
    }
  } else if (e.state === 'recover') {
    if (e.stateTime <= 0) {
      e.state = 'walk';
      e.stateTime = BOSS.walkTime;
    }
  }
}

/** A chain hit on the boss: one of its hits is used up (no knockback, it's too heavy). */
export function hitBoss(e) {
  e.hitsLeft -= 1;
  e.hitCooldown = BOSS.hitCooldown;
  e.flash = 0.12;
  if (e.hitsLeft <= 0) e.hp = 0;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Red arrow on the floor showing where the boss is about to charge. */
export function drawBossArrows(ctx, enemies, width, height) {
  for (const e of enemies) {
    if (!e.boss || e.state !== 'aim') continue;
    const len = Math.hypot(width, height); // all the way across the arena
    const pulse = 0.45 + 0.35 * Math.abs(Math.sin(performance.now() / 90));
    const ang = Math.atan2(e.chargeY, e.chargeX);
    const w = e.r * 1.4;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(ang);
    // Danger lane
    ctx.fillStyle = `rgba(229, 57, 53, ${pulse * 0.25})`;
    ctx.fillRect(0, -w / 2, len, w);
    // Arrow
    ctx.fillStyle = `rgba(255, 82, 82, ${pulse})`;
    ctx.beginPath();
    const start = e.r + 10;
    const head = start + 150;
    ctx.moveTo(start, -10);
    ctx.lineTo(head, -10);
    ctx.lineTo(head, -28);
    ctx.lineTo(head + 46, 0);
    ctx.lineTo(head, 28);
    ctx.lineTo(head, 10);
    ctx.lineTo(start, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Side-view T-rex, flipped to face the way it's going. */
export function drawBoss(ctx, e, scale = 1) {
  const r = e.r;
  const charging = e.state === 'charge';
  const aiming = e.state === 'aim';
  const dazed = e.state === 'recover';
  const step = Math.sin(e.walk * 1.6);
  const flash = e.flash > 0;
  const skin = flash ? '#ffffff' : SKIN;
  const dark = flash ? '#ffffff' : SKIN_DARK;

  ctx.save();
  ctx.translate(e.x, e.y);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.95, r * 1.2 * scale, r * 0.3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cursed boss: red aura
  if (e.invincible) {
    ctx.fillStyle = 'rgba(229, 57, 53, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.scale(e.facing * scale, scale);
  if (charging) ctx.rotate(0.18); // lean into the charge
  const bob = -Math.abs(step) * r * 0.05;
  ctx.translate(0, bob);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1f3a17';
  ctx.lineWidth = 2;

  // Back leg
  ctx.fillStyle = dark;
  ctx.save();
  ctx.translate(-r * 0.2, r * 0.3);
  ctx.rotate(-step * 0.35);
  ctx.fillRect(-r * 0.14, 0, r * 0.28, r * 0.6);
  ctx.fillRect(-r * 0.14, r * 0.5, r * 0.42, r * 0.14);
  ctx.restore();

  // Tail
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.35);
  ctx.quadraticCurveTo(-r * 1.4, -r * 0.3 + step * r * 0.08, -r * 1.9, r * 0.05 + step * r * 0.12);
  ctx.quadraticCurveTo(-r * 1.3, r * 0.15, -r * 0.5, r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.75, r * 0.55, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Belly
  ctx.fillStyle = flash ? '#fff' : BELLY;
  ctx.beginPath();
  ctx.ellipse(r * 0.18, r * 0.18, r * 0.45, r * 0.3, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // Spots
  if (!flash) {
    ctx.fillStyle = SPOTS;
    for (const [sx, sy, sr] of [[-0.3, -0.25, 0.09], [-0.05, -0.38, 0.07], [-0.55, -0.05, 0.07], [-1.0, -0.12, 0.06]]) {
      ctx.beginPath();
      ctx.arc(r * sx, r * sy, r * sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Front leg
  ctx.fillStyle = skin;
  ctx.save();
  ctx.translate(r * 0.25, r * 0.3);
  ctx.rotate(step * 0.35);
  ctx.fillRect(-r * 0.15, 0, r * 0.3, r * 0.62);
  ctx.fillRect(-r * 0.15, r * 0.5, r * 0.44, r * 0.15);
  ctx.strokeRect(-r * 0.15, 0, r * 0.3, r * 0.62);
  ctx.restore();

  // Neck + head
  const jaw = aiming || charging ? 0.45 : 0.12 + Math.abs(step) * 0.05; // mouth open when angry
  ctx.save();
  ctx.translate(r * 0.55, -r * 0.55);
  ctx.fillStyle = skin;
  // Upper head
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, r * 0.2);
  ctx.lineTo(-r * 0.2, -r * 0.3);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.45, r * 0.75, -r * 0.2);
  ctx.lineTo(r * 0.78, r * 0.02);
  ctx.lineTo(-r * 0.05, r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Teeth (upper)
  ctx.fillStyle = '#fffbe6';
  for (let i = 0; i < 5; i++) {
    const tx = r * (0.12 + i * 0.13);
    ctx.beginPath();
    ctx.moveTo(tx, r * 0.03);
    ctx.lineTo(tx + r * 0.05, r * 0.12);
    ctx.lineTo(tx + r * 0.1, r * 0.03);
    ctx.fill();
  }
  // Lower jaw (rotates open)
  ctx.save();
  ctx.translate(-r * 0.05, r * 0.08);
  ctx.rotate(jaw);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.75, -r * 0.02);
  ctx.lineTo(r * 0.7, r * 0.14);
  ctx.lineTo(0, r * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fffbe6';
  for (let i = 0; i < 4; i++) {
    const tx = r * (0.15 + i * 0.14);
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    ctx.lineTo(tx + r * 0.05, -r * 0.09);
    ctx.lineTo(tx + r * 0.1, 0);
    ctx.fill();
  }
  ctx.restore();
  // Eye (angry red when aiming/charging, spiral-ish when dazed)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.15, -r * 0.15, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = aiming || charging ? '#e53935' : '#111';
  ctx.beginPath();
  ctx.arc(r * 0.17, -r * 0.15, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Angry brow
  ctx.strokeStyle = '#1f3a17';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.02, -r * 0.3);
  ctx.lineTo(r * 0.3, -r * (aiming || charging ? 0.22 : 0.28));
  ctx.stroke();
  // Nostril
  ctx.fillStyle = '#1f3a17';
  ctx.beginPath();
  ctx.arc(r * 0.68, -r * 0.16, r * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tiny arms
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(r * 0.45, -r * 0.05);
  ctx.lineTo(r * 0.65, r * 0.08 + step * r * 0.04);
  ctx.lineTo(r * 0.72, r * 0.02);
  ctx.stroke();

  ctx.restore();

  // Dazed stars after slamming into a wall
  if (dazed) {
    const t = performance.now() / 200;
    ctx.fillStyle = '#ffd54f';
    ctx.font = `bold ${Math.round(r * 0.35)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const a = t + (i * Math.PI * 2) / 3;
      ctx.fillText('★', e.x + Math.cos(a) * r * 0.6, e.y - r * 1.2 + Math.sin(a) * r * 0.2);
    }
  }
}

/** Big health bar at the top of the screen while a boss is alive. */
export function drawBossBar(ctx, game) {
  const boss = game.enemies.find((e) => e.boss);
  if (!boss) return;
  const w = Math.min(420, game.width - 80);
  const x = (game.width - w) / 2;
  const y = 74;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x - 3, y - 3, w + 6, 16);
  ctx.fillStyle = '#3a1d1d';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = boss.invincible ? '#9e9e9e' : '#e53935';
  ctx.fillRect(x, y, w * (boss.hitsLeft / boss.maxHits), 10);
  ctx.fillStyle = '#e8e6e1';
  ctx.font = arcade(9);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const name = boss.type === 'alien' ? 'ALIEN BOSS' : 'DINO BOSS';
  ctx.fillText(`${name} · ${Math.max(0, boss.hitsLeft)} hits left`, game.width / 2, y + 14);
}

/** Death: a big puff and a burst of green scales (uses the shared feather effect). */
export function bossBurst(effects, e) {
  effects.push({
    kind: 'puff', x: e.x, y: e.y, r: e.r * 1.4,
    vx: 0, vy: 0, angle: 0, spin: 0,
    life: 0.5, maxLife: 0.5,
  });
  const colors = [SKIN, SKIN_DARK, BELLY, SPOTS];
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 80 + Math.random() * 260;
    effects.push({
      kind: 'feather',
      x: e.x + (Math.random() - 0.5) * e.r,
      y: e.y + (Math.random() - 0.5) * e.r,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      drag: 2.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 8,
      size: e.r * (0.12 + Math.random() * 0.12),
      color: colors[i % colors.length],
      life: 1 + Math.random() * 0.6, maxLife: 1.6,
    });
  }
}
