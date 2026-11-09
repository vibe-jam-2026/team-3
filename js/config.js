// All tuning numbers in one place — tweak these while playtesting.

export const PLAYER = {
  radius: 16,
  speed: 260,          // px per second
  maxHp: 100,
  hitDamage: 10,       // damage from one enemy touch
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
  radius: 12,
  baseHp: 25,
  hpPerWave: 6,
  baseSpeed: 70,
  speedPerWave: 7,
  knockbackFriction: 6, // how quickly knockback wears off
};

export const WAVES = {
  duration: 30,              // seconds per wave
  firstSpawnInterval: 1.1,   // seconds between spawns in wave 1
  spawnIntervalFactor: 0.82, // each wave multiplies the interval by this
  minSpawnInterval: 0.15,
  healBetweenWaves: Infinity, // hp restored to each player after a wave (Infinity = full heal)
};

// Debug options from the URL, for testing:
//   ?god          players can't take damage
//   ?wave=5       waves last 5 seconds instead of WAVES.duration
const params = new URLSearchParams(window.location.search);
export const DEBUG = {
  god: params.has('god'),
};
if (params.has('wave')) WAVES.duration = Number(params.get('wave')) || WAVES.duration;
