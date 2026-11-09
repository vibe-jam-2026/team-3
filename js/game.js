// Game state: players, chain, enemies and waves.
// main.js decides which screen is shown; this file only runs one wave at a time
// and reports game.status = 'playing' | 'waveComplete' | 'dead'.

import { moveVector } from './input.js';
import { PLAYER, CHAIN, WAVES, DEBUG } from './config.js';
import { createChain, springPlayers, constrainPlayers, updateChain, chainHits, drawChain } from './chain.js';
import { spawnEnemy, updateEnemies, drawEnemies } from './enemies.js';
import { crackEgg, updateEffects, drawFloorEffects, drawAirEffects } from './egg.js';
import { featherBurst } from './chicken.js';

export const PLAYER_COLORS = ['#4fc3f7', '#ffb74d'];

export function createGame(width, height) {
  const gap = Math.min(CHAIN.maxLength * 0.6, width * 0.3);
  const players = [
    makePlayer(0, width / 2 - gap / 2, height / 2),
    makePlayer(1, width / 2 + gap / 2, height / 2),
  ];
  const game = {
    width,
    height,
    time: 0,        // total time survived
    kills: 0,
    wave: DEBUG.startWave,
    waveKills: 0,
    waveTime: 0,
    spawnTimer: 0,
    status: 'playing',
    players,
    chain: createChain(players[0], players[1]),
    enemies: [],
    effects: [],    // cracked shells, yolk splats
  };
  return game;
}

function makePlayer(index, x, y) {
  return {
    index, x, y,
    r: PLAYER.radius,
    color: PLAYER_COLORS[index],
    hp: PLAYER.maxHp,
    invuln: 0,
  };
}

/** Called from the between-waves menu: clear the arena and begin the next wave. */
export function startNextWave(game) {
  game.wave += 1;
  game.waveTime = 0;
  game.waveKills = 0;
  game.spawnTimer = 0;
  game.enemies = [];
  game.status = 'playing';
  for (const p of game.players) {
    p.hp = Math.min(PLAYER.maxHp, p.hp + WAVES.healBetweenWaves);
    p.invuln = 1; // a moment of safety at the start of the wave
  }
}

export function waveTimeLeft(game) {
  return Math.max(0, WAVES.duration - game.waveTime);
}

/** Keep the arena the size of the window; pull everything back inside if it shrinks. */
export function resizeGame(game, width, height) {
  game.width = width;
  game.height = height;
  for (const p of game.players) clampToArena(game, p);
}

function spawnInterval(wave) {
  return Math.max(
    WAVES.minSpawnInterval,
    WAVES.firstSpawnInterval * WAVES.spawnIntervalFactor ** (wave - 1),
  );
}

export function updateGame(game, dt) {
  if (game.status !== 'playing') return;
  game.time += dt;
  game.waveTime += dt;

  // --- Players ---
  for (const p of game.players) {
    const dir = moveVector(p.index);
    p.x += dir.x * PLAYER.speed * dt;
    p.y += dir.y * PLAYER.speed * dt;
    p.invuln = Math.max(0, p.invuln - dt);
  }
  const [a, b] = game.players;
  springPlayers(a, b, dt);
  constrainPlayers(a, b);
  for (const p of game.players) clampToArena(game, p);

  // --- Chain ---
  updateChain(game.chain, a, b, game.width, game.height);

  // --- Spawning ---
  game.spawnTimer -= dt;
  while (game.spawnTimer <= 0) {
    spawnEnemy(game);
    game.spawnTimer += spawnInterval(game.wave);
  }

  // --- Enemies ---
  updateEnemies(game, dt);

  // Chain hurts enemies
  chainHits(game.chain, game.enemies, dt, (e, speed, vx, vy) => {
    if (e.hitCooldown > 0 || e.spawnAnim > 0) return;
    e.hp -= CHAIN.oneHitKill ? e.hp : speed * CHAIN.damagePerSpeed;
    e.hitCooldown = CHAIN.hitCooldown;
    e.flash = 0.08;
    e.lastHitVx = vx; e.lastHitVy = vy;
    e.vx += vx * CHAIN.knockback;
    e.vy += vy * CHAIN.knockback;
  });

  // Enemies hurt players, and can't walk through them
  for (const e of game.enemies) {
    if (e.spawnAnim > 0) continue;
    for (const p of game.players) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = e.r + p.r;
      if (d >= min) continue;
      e.x = p.x + (dx / d) * min;
      e.y = p.y + (dy / d) * min;
      if (p.invuln <= 0 && !DEBUG.god) {
        p.hp = Math.max(0, p.hp - e.damage);
        p.invuln = PLAYER.invulnTime;
      }
    }
  }

  // Remove dead enemies
  for (const e of game.enemies) {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      game.kills += 1;
      game.waveKills += 1;
      if (e.type === 'egg') crackEgg(game.effects, e, e.lastHitVx, e.lastHitVy);
      else featherBurst(game.effects, e, e.lastHitVx, e.lastHitVy);
    }
  }
  game.enemies = game.enemies.filter((e) => !e.dead);

  game.effects = updateEffects(game.effects, dt);

  // --- Win / lose ---
  if (game.players.some((p) => p.hp <= 0)) {
    game.status = 'dead';
  } else if (game.waveTime >= WAVES.duration) {
    game.status = 'waveComplete';
  }
}

function clampToArena(game, p) {
  p.x = Math.max(p.r, Math.min(game.width - p.r, p.x));
  p.y = Math.max(p.r, Math.min(game.height - p.r, p.y));
}

// ---------- Drawing ----------
export function drawGame(ctx, game) {
  // Arena
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, game.width, game.height);
  ctx.strokeStyle = '#2c313c';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, game.width - 4, game.height - 4);

  drawFloorEffects(ctx, game.effects);
  drawEnemies(ctx, game.enemies);
  drawChain(ctx, game.chain);
  drawAirEffects(ctx, game.effects);

  for (const p of game.players) drawPlayer(ctx, p);

  drawHud(ctx, game);
}

function drawPlayer(ctx, p) {
  // Blink while invulnerable
  if (p.invuln > 0 && Math.floor(p.invuln * 15) % 2 === 0) ctx.globalAlpha = 0.4;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111318';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`P${p.index + 1}`, p.x, p.y + 1);
  ctx.globalAlpha = 1;

  // Health bar under the player
  const w = 40;
  const x = p.x - w / 2;
  const y = p.y + p.r + 6;
  ctx.fillStyle = '#2c313c';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = p.hp > 30 ? '#66bb6a' : '#ef5350';
  ctx.fillRect(x, y, w * (p.hp / PLAYER.maxHp), 5);
}

function drawHud(ctx, game) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8e6e1';

  ctx.textAlign = 'center';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText(`Wave ${game.wave}`, game.width / 2, 14);
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.fillText(String(Math.ceil(waveTimeLeft(game))), game.width / 2, 36);

  ctx.textAlign = 'left';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`Kills: ${game.kills}`, 18, 16);

  ctx.textAlign = 'right';
  ctx.fillText(`Time: ${formatTime(game.time)}`, game.width - 18, 16);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
