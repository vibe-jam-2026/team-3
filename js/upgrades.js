// Upgrades bought between waves with the coins the team collects.
// Upgrades are shared: they apply to both players (and the chain between them).

import { PLAYER, CHAIN, COINS, DEV_START } from './config.js';

// Tune here. Costs follow a Fibonacci sequence from firstCosts: 3, 5, 8, 13, 21, 34, ...
// maxLevel: Infinity = no cap (set a number to cap an upgrade)
export const UPGRADES = [
  {
    id: 'chain', name: 'Chain length', icon: '⛓',
    desc: (lvl) => `+${30} px chain (now ${Math.round(CHAIN.maxLength + 30 * lvl)} px)`,
    firstCosts: [3, 5], maxLevel: Infinity,
  },
  {
    id: 'hp', name: 'Max health', icon: '❤',
    desc: (lvl) => `+25 max hp each (now ${PLAYER.maxHp + 25 * lvl})`,
    firstCosts: [3, 5], maxLevel: Infinity,
  },
  {
    id: 'regen', name: 'Health regen', icon: '✚',
    desc: (lvl) => `+1 hp/s each (now ${lvl} hp/s)`,
    firstCosts: [3, 5], maxLevel: Infinity,
  },
  {
    id: 'speed', name: 'Move speed', icon: '➤',
    desc: (lvl) => `+8% speed (now +${8 * lvl}%)`,
    firstCosts: [3, 5], maxLevel: Infinity,
  },
  {
    id: 'slow', name: 'Enemy slow', icon: '❄',
    // Multiplies, so it never reaches 0: each level makes enemies 7% slower than before
    desc: (lvl) => `Enemies 7% slower (now −${Math.round((1 - 0.93 ** lvl) * 100)}%)`,
    firstCosts: [3, 5], maxLevel: Infinity,
  },
  {
    id: 'magnet', name: 'Coin magnet', icon: '🧲',
    desc: (lvl) => `+35 px pickup field (now ${COINS.magnetRadius + 35 * lvl} px)`,
    firstCosts: [3, 5], maxLevel: Infinity,
  },
];

export function createUpgradeLevels() {
  return Object.fromEntries(UPGRADES.map((u) => [u.id, 0]));
}

/** Fibonacci: each price is the sum of the two before it (3, 5, 8, 13, 21, ...). */
export function upgradeCost(u, level) {
  let [a, b] = u.firstCosts;
  for (let i = 0; i < level; i++) [a, b] = [b, a + b];
  return a;
}

/** Turn upgrade levels into the numbers the game uses. */
export function computeStats(levels) {
  return {
    chainLength: CHAIN.maxLength + 30 * levels.chain,
    maxHp: PLAYER.maxHp + 25 * levels.hp,
    regen: 1 * levels.regen,                 // hp per second
    speed: PLAYER.speed * (1 + 0.08 * levels.speed),
    enemySpeedMult: 0.93 ** levels.slow,
    magnetRadius: COINS.magnetRadius + 35 * levels.magnet,
  };
}

/** Try to buy one level of an upgrade. Returns true if bought. */
export function buyUpgrade(game, id) {
  const u = UPGRADES.find((x) => x.id === id);
  const lvl = game.upgrades[id];
  if (!u || lvl >= u.maxLevel) return false;
  const cost = upgradeCost(u, lvl);
  if (game.coins < cost) return false;
  game.coins -= cost;
  game.upgrades[id] = lvl + 1;
  applyStats(game);
  return true;
}

export function applyStats(game) {
  const before = game.stats;
  game.stats = computeStats(game.upgrades);
  game.chain.maxLength = game.stats.chainLength;
  game.chain.segLength = game.stats.chainLength / (game.chain.points.length - 1);
  for (const p of game.players) {
    // A max-hp upgrade also fills the new hp
    if (before) p.hp += game.stats.maxHp - before.maxHp;
    p.maxHp = game.stats.maxHp;
    p.hp = Math.min(p.hp, p.maxHp);
  }
}

/**
 * Dev start (?start=N): give the players roughly the upgrades they'd have by wave N.
 * Budget = DEV_START.coinsFactor * (N - 1) ^ 1.5 coins (wave 5 ~ 96, wave 10 ~ 324),
 * spent round-robin on the cheapest next level, so all upgrades end up about even.
 */
export function applyDevStartUpgrades(game, startWave) {
  let budget = Math.round(DEV_START.coinsFactor * (startWave - 1) ** 1.5);
  for (;;) {
    let pick = null;
    let pickCost = Infinity;
    for (const u of UPGRADES) {
      const c = upgradeCost(u, game.upgrades[u.id]);
      if (game.upgrades[u.id] < u.maxLevel && c < pickCost) { pick = u; pickCost = c; }
    }
    if (!pick || pickCost > budget) break;
    budget -= pickCost;
    game.upgrades[pick.id] += 1;
  }
  applyStats(game);
  for (const p of game.players) p.hp = p.maxHp;
}
