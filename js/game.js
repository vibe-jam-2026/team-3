// Game state: players, chain, enemies and waves.
// main.js decides which screen is shown; this file only runs one wave at a time
// and reports game.status = 'playing' | 'waveComplete' | 'dead'.

import { moveVector } from './input.js';
import { PLAYER, CHAIN, WAVES, DEBUG, RATS, CURSE, BOSS, ALIEN } from './config.js';
import { createChain, springPlayers, constrainPlayers, updateChain, chainHits } from './chain.js';
import { drawWormBody, drawWormHead } from './worm.js';
import { drawSpace } from './space.js';
import { rollWormhole, updateWormhole, drawWormhole, drawDimensionFlash } from './wormhole.js';
import { voiceStatus } from './voice.js';
import { POWERS } from './config.js';
import { createPowers, updatePowers, drawCraters, drawBeams, drawMeteor, drawImpactFlash } from './powers.js';
import { spawnEnemy, updateEnemies, drawEnemies } from './enemies.js';
import { crackEgg, updateEffects, drawFloorEffects, drawAirEffects } from './egg.js';
import { featherBurst } from './chicken.js';
import { furBurst } from './rat.js';
import { spawnBoss, hitBoss, drawBossArrows, drawBossBar, bossBurst } from './boss.js';
import { playRoar } from './audio.js';
import { spawnAlien, alienBurst } from './alien.js';
import { updateProjectiles, drawProjectiles } from './projectiles.js';
import { applyDevStartUpgrades } from './upgrades.js';
import { dropCoins, updateCoins, drawCoins, drawCoinIcon, drawMagnetFields } from './coins.js';
import { createUpgradeLevels, applyStats } from './upgrades.js';

export const PLAYER_COLORS = ['#4fc3f7', '#ffb74d'];

/** Where the two worm heads start: side by side in the middle of the arena. */
function startPositions(width, height) {
  const gap = Math.min(CHAIN.maxLength * 0.6, width * 0.3);
  return [
    { x: width / 2 - gap / 2, y: height / 2 },
    { x: width / 2 + gap / 2, y: height / 2 },
  ];
}

export function createGame(width, height) {
  const start = startPositions(width, height);
  const players = [
    makePlayer(0, start[0].x, start[0].y),
    makePlayer(1, start[1].x, start[1].y),
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
    bossSpawned: false, // has this wave's boss appeared yet?
    dimension: 0,   // 0 = normal space, 1 = the other dimension (through a wormhole)
    wormhole: null, // the open wormhole, if any
    wormholeAt: null, // when this wave's wormhole opens (seconds), or null
    dimensionFlash: 0,
    cursedWave: 0,  // set by the "Max All" button: that wave is a flood of unkillable enemies
    ratTimer: 2,    // first rat shows up a little into the wave
    status: 'playing',
    players,
    chain: createChain(players[0], players[1]),
    enemies: [],
    effects: [],    // cracked shells, yolk splats, feathers
    coins: DEBUG.startCoins, // the team's shared wallet
    waveCoins: 0,
    floorCoins: [], // dropped coins waiting to be picked up
    projectiles: [], // alien shots
    powers: createPowers(), // voice powers: beam + meteor
    upgrades: createUpgradeLevels(),
    stats: null,
  };
  applyStats(game);
  rollWormhole(game, !!bossForWave(game.wave));
  if (DEBUG.startWave > 1) applyDevStartUpgrades(game, DEBUG.startWave);
  return game;
}

function makePlayer(index, x, y) {
  return {
    index, x, y,
    r: PLAYER.radius,
    color: PLAYER_COLORS[index],
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    invuln: 0,
  };
}

/** Called from the between-waves menu: clear the arena and begin the next wave. */
export function startNextWave(game) {
  game.wave += 1;
  // Every wave starts with the worm back in its starting position
  const start = startPositions(game.width, game.height);
  game.players.forEach((p, i) => {
    p.x = start[i].x;
    p.y = start[i].y;
    p.lookX = p.lookY = undefined; // eyes face outward again, like at the start
  });
  const maxLength = game.chain.maxLength;
  game.chain = createChain(game.players[0], game.players[1]);
  game.chain.maxLength = maxLength; // keep the chain-length upgrade
  game.chain.segLength = maxLength / (game.chain.points.length - 1);
  game.waveTime = 0;
  game.waveKills = 0;
  game.waveCoins = 0;
  game.spawnTimer = 0;
  game.ratTimer = 2;
  game.bossSpawned = false;
  game.enemies = [];
  game.powers.beamTime = 0;   // powers don't carry over between waves (cooldowns do)
  game.powers.meteor = null;
  game.powers.craters = [];
  game.powers.fx = [];
  game.powers.rings = [];
  game.powers.boom = 0;
  game.projectiles = [];
  rollWormhole(game, !!bossForWave(game.wave));
  game.floorCoins = []; // uncollected coins are lost
  game.status = 'playing';
  for (const p of game.players) {
    p.hp = Math.min(p.maxHp, p.hp + WAVES.healBetweenWaves);
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
    // Remember which way the worm head is facing (for its eyes)
    if (dir.x || dir.y) { p.lookX = dir.x; p.lookY = dir.y; }
    p.x += dir.x * game.stats.speed * dt;
    p.y += dir.y * game.stats.speed * dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.hp = Math.min(p.maxHp, p.hp + game.stats.regen * dt);
  }
  const [a, b] = game.players;
  springPlayers(a, b, dt, game.chain.maxLength);
  constrainPlayers(a, b, game.chain.maxLength);
  for (const p of game.players) clampToArena(game, p);

  // --- Chain ---
  updateChain(game.chain, a, b, game.width, game.height);

  // --- Spawning ---
  const cursed = game.wave === game.cursedWave;
  // Fewer regular enemies while the boss is around
  const bossAlive = game.enemies.some((e) => e.boss);
  const rate = WAVES.spawnRate * (bossAlive ? BOSS.enemySpawnRate : 1);
  game.spawnTimer -= dt;
  while (game.spawnTimer <= 0) {
    if (!cursed || game.enemies.length < CURSE.maxEnemies) spawnEnemy(game);
    game.spawnTimer += cursed ? CURSE.spawnInterval : spawnInterval(game.wave) / rate;
  }

  // Boss waves: every 10th wave the alien, otherwise every 5th the dinosaur
  const boss = bossForWave(game.wave);
  if (boss === 'alien' && !game.bossSpawned && game.waveTime >= ALIEN.spawnAt) {
    game.bossSpawned = true;
    spawnAlien(game);
  } else if (boss === 'dino' && !game.bossSpawned && game.waveTime >= BOSS.spawnAt) {
    game.bossSpawned = true;
    spawnBoss(game);
    playRoar();
  }

  // Rats (neutral egg hunters) on their own timer
  if (game.wave >= RATS.fromWave) {
    game.ratTimer -= dt;
    if (game.ratTimer <= 0) {
      game.ratTimer = RATS.interval;
      if (game.enemies.filter((e) => e.type === 'rat').length < RATS.maxAlive) spawnEnemy(game, 'rat');
    }
  }

  // --- Enemies ---
  updateEnemies(game, dt);

  updateProjectiles(game, dt);
  updateWormhole(game, dt);
  updatePowers(game, dt);

  // Chain hurts enemies
  chainHits(game.chain, game.enemies, dt, (e, speed, vx, vy) => {
    if (e.hitCooldown > 0 || e.spawnAnim > 0) return;
    if (e.boss) {
      if (!e.invincible) hitBoss(e);
      else e.flash = 0.08;
      return;
    }
    if (!e.invincible) {
      e.hitsLeft -= 1;
      if (e.hitsLeft <= 0) e.hp = 0;
    }
    e.hitCooldown = CHAIN.hitCooldown;
    e.flash = 0.08;
    e.lastHitVx = vx; e.lastHitVy = vy;
    e.vx += vx * CHAIN.knockback;
    e.vy += vy * CHAIN.knockback;
  });

  // Enemies hurt players, and can't walk through them
  for (const e of game.enemies) {
    if (e.spawnAnim > 0 || e.neutral) continue; // rats don't hurt (or block) players
    for (const p of game.players) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = e.r + p.r;
      if (d >= min) continue;
      if (e.boss) {
        // Too heavy to stop: the boss shoves the player aside instead
        p.x = e.x - (dx / d) * min;
        p.y = e.y - (dy / d) * min;
        clampToArena(game, p);
      } else {
        e.x = p.x + (dx / d) * min;
        e.y = p.y + (dy / d) * min;
      }
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
      if (e.type === 'egg') crackEgg(game.effects, e, e.lastHitVx, e.lastHitVy);
      else if (e.type === 'alien') alienBurst(game.effects, e);
      else if (e.boss) bossBurst(game.effects, e);
      else if (e.type === 'rat') furBurst(game.effects, e, e.lastHitVx, e.lastHitVy);
      else featherBurst(game.effects, e, e.lastHitVx, e.lastHitVy);
      // An egg eaten by a rat is gone: no kill and no coins for the players
      if (e.killedBy === 'rat') continue;
      game.kills += 1;
      game.waveKills += 1;
      dropCoins(game, e);
    }
  }
  game.enemies = game.enemies.filter((e) => !e.dead);

  updateCoins(game, dt);
  game.effects = updateEffects(game.effects, dt);

  // --- Win / lose ---
  if (game.players.some((p) => p.hp <= 0)) {
    game.status = 'dead';
  } else if (game.waveTime >= WAVES.duration && !bossWaveUnfinished(game)) {
    game.status = 'waveComplete';
  }
}

/** Which boss (if any) this wave has: 'alien' every 10th wave, 'dino' every other 5th. */
export function bossForWave(wave) {
  if (wave % ALIEN.everyWaves === 0) return 'alien';
  if (wave % BOSS.everyWaves === 0) return 'dino';
  return null;
}

/** Boss waves keep going after the timer until the boss has appeared and been killed. */
function bossWaveUnfinished(game) {
  if (!bossForWave(game.wave)) return false;
  return !game.bossSpawned || game.enemies.some((e) => e.boss);
}

function clampToArena(game, p) {
  p.x = Math.max(p.r, Math.min(game.width - p.r, p.x));
  p.y = Math.max(p.r, Math.min(game.height - p.r, p.y));
}

// ---------- Drawing ----------
export function drawGame(ctx, game) {
  // Arena: open space with stars and planets
  drawSpace(ctx, game.width, game.height, game.dimension);
  ctx.strokeStyle = 'rgba(140, 160, 220, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, game.width - 4, game.height - 4);

  drawFloorEffects(ctx, game.effects);
  drawMagnetFields(ctx, game);
  drawCoins(ctx, game.floorCoins);
  drawBossArrows(ctx, game.enemies, game.width, game.height);
  drawCraters(ctx, game);
  drawWormhole(ctx, game);
  // In the other dimension the enemies look a little different: they're drawn on
  // their own layer, which gets one colour wash. (A per-shape canvas filter looked
  // similar but was far too slow with many enemies.)
  if (game.dimension === 1) drawTintedEnemies(ctx, game);
  else drawEnemies(ctx, game.enemies);
  drawWormBody(ctx, game.chain); // the chain is the worm's body
  drawAirEffects(ctx, game.effects);
  drawProjectiles(ctx, game.projectiles);

  const pts = game.chain.points;
  game.players.forEach((p, i) => drawPlayer(ctx, p, i === 0 ? pts[1] : pts[pts.length - 2]));

  drawBeams(ctx, game);
  drawMeteor(ctx, game);
  drawImpactFlash(ctx, game);
  drawDimensionFlash(ctx, game);
  drawHud(ctx, game);
}

function drawPlayer(ctx, p, neck) {
  drawWormHead(ctx, p, neck); // each player is one head of the worm

  // Health bar under the player
  const w = 40;
  const x = p.x - w / 2;
  const y = p.y + p.r + 6;
  ctx.fillStyle = '#2c313c';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = p.hp > p.maxHp * 0.3 ? '#66bb6a' : '#ef5350';
  ctx.fillRect(x, y, w * (p.hp / p.maxHp), 5);
}

function drawHud(ctx, game) {
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8e6e1';

  ctx.textAlign = 'center';
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText(`Wave ${game.wave}`, game.width / 2, 14);
  ctx.font = '700 28px system-ui, sans-serif';
  if (waveTimeLeft(game) > 0) {
    ctx.fillText(String(Math.ceil(waveTimeLeft(game))), game.width / 2, 36);
  } else if (bossWaveUnfinished(game)) {
    // Overtime: the boss wave only ends when the boss is dead
    ctx.fillStyle = '#ff8a80';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('Kill the boss!', game.width / 2, 38);
    ctx.fillStyle = '#e8e6e1';
  }

  ctx.textAlign = 'left';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`Kills: ${game.kills}`, 18, 16);
  drawCoinIcon(ctx, 26, 50, 7);
  ctx.fillStyle = '#ffd54f';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(game.coins), 40, 51);
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#e8e6e1';

  ctx.textAlign = 'right';
  ctx.fillText(`Time: ${formatTime(game.time)}`, game.width - 18, 16);
  if (DEBUG.god) {
    // Reminder that this is a test run
    ctx.fillStyle = '#ffd54f';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('GOD MODE', game.width - 18, 40);
  }
  if (game.dimension === 1) {
    ctx.fillStyle = '#7dffb8';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('OTHER DIMENSION', 18, 70);
  }

  drawBossBar(ctx, game);
  drawPowersHud(ctx, game);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Bottom-left: voice status and the two powers' cooldowns. */
function drawPowersHud(ctx, game) {
  const P = game.powers;
  const v = voiceStatus();
  const x = 18;
  let y = game.height - 18;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font = '600 13px system-ui, sans-serif';

  const pill = (label, cd, total, word) => {
    const ready = cd <= 0;
    const w = 150;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x, y - 18, w, 18);
    ctx.fillStyle = ready ? 'rgba(255, 213, 79, 0.85)' : 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x, y - 18, w * (ready ? 1 : 1 - cd / total), 18);
    ctx.fillStyle = ready ? '#1b1b1b' : '#e8e6e1';
    ctx.fillText(ready ? `Shout "${word}"!` : `${label} ${Math.ceil(cd)}s`, x + 6, y - 3);
    y -= 24;
  };
  pill('METEOR', P.meteorCd, POWERS.meteorCooldown, 'METEOR');
  pill('BEAM', P.beamCd, POWERS.beamCooldown, 'BEAM');

  const label = {
    on: '🎤 Listening (V to turn off)',
    starting: '🎤 Starting microphone… allow it if the browser asks',
    off: '🎤 Voice off (V to turn on)',
    denied: '🎤 Microphone blocked: allow it in the address bar, then press V',
    unsupported: '🎤 This browser has no speech recognition: use Chrome or Edge',
    network: '🎤 Speech service unreachable (needs internet)',
    nomic: '🎤 No microphone found',
    error: '🎤 Voice error (press V twice to retry)',
  }[v.status];
  ctx.fillStyle = v.status === 'on' ? '#7dffb8' : '#ffb4a8';
  ctx.fillText(label, x, y);
  // What the game heard, so players can see why a word did or didn't count
  const now = performance.now();
  if (v.status === 'on' && v.lastHeard && now - v.lastHeardAt < 3000) {
    ctx.fillStyle = 'rgba(232, 230, 225, 0.65)';
    ctx.font = 'italic 12px system-ui, sans-serif';
    const hit = v.lastMatch && now - v.lastMatchAt < 1500 ? `  → ${v.lastMatch.toUpperCase()}!` : '';
    ctx.fillText(`heard: "${v.lastHeard.slice(-40)}"${hit}`, x, y - 17);
  }
}

// ---------- Other-dimension enemy layer ----------
let layer = null;
let layerCtx = null;

function drawTintedEnemies(ctx, game) {
  const dpr = window.devicePixelRatio || 1;
  const pw = Math.round(game.width * dpr);
  const ph = Math.round(game.height * dpr);
  if (!layer || layer.width !== pw || layer.height !== ph) {
    layer = document.createElement('canvas');
    layer.width = pw;
    layer.height = ph;
    layerCtx = layer.getContext('2d');
  }
  const L = layerCtx;
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.clearRect(0, 0, pw, ph);
  L.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawEnemies(L, game.enemies);
  // Wash a colour over only the enemy pixels
  L.globalCompositeOperation = 'source-atop';
  L.fillStyle = 'rgba(90, 255, 190, 0.42)';
  L.fillRect(0, 0, game.width, game.height);
  L.fillStyle = 'rgba(200, 60, 255, 0.18)';
  L.fillRect(0, 0, game.width, game.height);
  L.globalCompositeOperation = 'source-over';
  ctx.drawImage(layer, 0, 0, game.width, game.height);
}
