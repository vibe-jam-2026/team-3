// All tuning numbers in one place — tweak these while playtesting.

export const PLAYER = {
  radius: 16,
  speed: 208,          // px per second (was 260, -20%)
  maxHp: 120,          // starting hp (was 150, -20%)
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
//   speed: multiplier on ENEMY.baseSpeed · hits: chain hits needed to kill it
export const ENEMY_TYPES = {
  egg:     { tier: 1, radius: 12, hp: 25, damage: 10, speed: 1, hits: 1 },
  chicken: { tier: 2, radius: 17, hp: 50, damage: 18, speed: 1, hits: 2 },
  rooster: { tier: 3, radius: 22, hp: 90, damage: 28, speed: 1, hits: 3 },
  // Neutral: never hurts players, hunts eggs instead (see RATS and rat.js)
  rat:     { tier: 0, radius: 10, hp: 15, damage: 0, speed: 1, hits: 1, neutral: true },
};

// Rats spawn on their own timer, separate from the waves of hostile enemies.
export const RATS = {
  fromWave: 1,
  interval: 6,     // seconds between rat spawns
  maxAlive: 4,     // never more than this many rats at once
  speed: 105,      // px/s when running to an egg (half speed when wandering)
  eatTime: 2.5,    // seconds a rat sits still eating after cracking an egg
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
  spawnRate: 1.2,            // x more enemies than the interval above gives (1.2 = +20%)
};

// Boss: a big dinosaur every few waves (see boss.js)
export const BOSS = {
  everyWaves: 5,     // waves 5, 10, 15, ...
  spawnAt: 5,        // seconds into the wave (boss waves don't end until it's dead)
  radius: 46,
  hits: 5,           // chain hits needed to kill it
  hitCooldown: 0.3,  // seconds between hits that count
  damage: 35,        // per touch (grows x1.05 per wave like other enemies)
  walkSpeed: 55,     // px/s while stomping toward the players
  walkTime: 2.5,     // seconds of walking between charges
  aimTime: 1,        // seconds the arrow is shown before the charge
  chargeSpeed: 620,  // px/s while charging
  recoverTime: 1.2,  // seconds dazed after hitting a wall
  enemySpawnRate: 0.25, // while the boss is alive, other enemies spawn at this rate (0.25 = 75% fewer)
};

// The "Max All" gimmick button in the shop secretly means "Max All enemies":
// the next wave spawns a flood of enemies that can't be killed.
export const CURSE = {
  spawnInterval: 0.04, // seconds between spawns (normal wave 1 is 1.1)
  maxEnemies: 300,     // stop adding more once this many are alive
};

// Coins dropped by enemies (per tier). The team shares one wallet.
export const COINS = {
  dropByTier: { 0: 1, 1: 1, 2: 3, 3: 6, 4: 25 }, // tier 0 = rat, tier 4 = boss
  dropRate: 0.8,       // multiplier on the drops above (0.8 = 20% less; fractions are a chance of one more coin)
  radius: 7,
  pickupDelay: 1,      // seconds after dropping before a coin can be collected
  magnetRadius: 40,    // px beyond the player's edge that pulls coins in (upgradable)
  magnetSpeed: 260,    // px/s pull speed (faster closer to the player)
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
