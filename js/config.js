// All tuning numbers in one place — tweak these while playtesting.

export const PLAYER = {
  radius: 16,
  speed: 260,          // px per second
  maxHp: 150,          // was 100 (x1.5)
  invulnTime: 0.6,     // seconds of invulnerability after being hit
};

export const CHAIN = {
  links: 14,           // number of points in the chain (more = smoother, heavier)
  maxLength: 200,      // px; players can't be further apart than this
  springStart: 0.7,    // spring starts pulling at this fraction of maxLength
  springStrength: 3,   // how hard the spring pulls players back together (higher = stronger)
  iterations: 10,      // constraint solver passes (more = stiffer)
  damping: 0.97,       // 1 = no friction, lower = chain settles faster
  thickness: 4,        // px, also the hit width
  minHitSpeed: 120,    // px/s a link must move to hurt an enemy
  oneHitKill: true,    // chain kills any enemy in one hit, whatever its hp
  damagePerSpeed: 0.06,// used when oneHitKill is false: damage = speed * this (400 px/s -> 24)
  hitCooldown: 0.25,   // seconds before the same enemy can be hit again
  knockback: 0.35,     // fraction of link velocity transferred to the enemy
};

export const ENEMY = {
  hpPerWave: 6,        // extra hp per wave (all tiers)
  baseSpeed: 56,       // px/s in wave 1 (was 70, x0.8)
  speedGrowth: 1.05,   // enemy speed x1.05 every wave
  damageGrowth: 1.05,  // enemy damage x1.05 every wave
  knockbackFriction: 6, // how quickly knockback wears off
};

// Enemy tiers. Bigger tiers are larger and hit harder; no special abilities yet.
//   radius: size in px · hp: base hp · damage: hp taken by a player per touch
//   speed: multiplier on ENEMY.baseSpeed
export const ENEMY_TYPES = {
  egg:     { tier: 1, radius: 12, hp: 25, damage: 10, speed: 1 },
  chicken: { tier: 2, radius: 17, hp: 50, damage: 18, speed: 1 },
  rooster: { tier: 3, radius: 22, hp: 90, damage: 28, speed: 1 },
};

// Which tiers spawn in which wave. Chance = perWave * (wave - fromWave + 1), capped at max.
export const TIER_SPAWNS = {
  chicken: { fromWave: 2, perWave: 0.15, max: 0.45 },
  rooster: { fromWave: 3, perWave: 0.10, max: 0.30 },
};

export const WAVES = {
  duration: 30,              // seconds per wave
  firstSpawnInterval: 1.1,   // seconds between spawns in wave 1
  spawnIntervalFactor: 0.82, // each wave multiplies the interval by this
  minSpawnInterval: 0.15,
  healBetweenWaves: Infinity, // hp restored to each player after a wave (Infinity = full heal)
};

// Coins dropped by enemies (per tier). The team shares one wallet.
export const COINS = {
  dropByTier: { 1: 1, 2: 3, 3: 6 },
  radius: 7,
};

// Debug options from the URL, for testing:
//   ?god          players can't take damage
//   ?wave=5       waves last 5 seconds instead of WAVES.duration
//   ?start=4      begin at wave 4 (to test later waves and enemy tiers)
//   ?coins=200    start with 200 coins (to test upgrades)
const params = new URLSearchParams(window.location.search);
export const DEBUG = {
  god: params.has('god'),
  startWave: Math.max(1, Math.floor(Number(params.get('start')) || 1)),
  startCoins: Math.max(0, Math.floor(Number(params.get('coins')) || 0)),
};
if (params.has('wave')) WAVES.duration = Number(params.get('wave')) || WAVES.duration;
