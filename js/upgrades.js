// Upgrades bought between waves with the coins the team collects.
// Upgrades are shared: they apply to both players (and the chain between them).

import { PLAYER, CHAIN } from './config.js';

// Tune here. cost = baseCost * costGrowth ^ currentLevel
export const UPGRADES = [
  {
    id: 'chain', name: 'Chain length', icon: '⛓',
    desc: (lvl) => `+${30} px chain (now ${Math.round(CHAIN.maxLength + 30 * lvl)} px)`,
    baseCost: 10, costGrowth: 1.6, maxLevel: 6,
  },
  {
    id: 'hp', name: 'Max health', icon: '❤',
    desc: (lvl) => `+25 max hp each (now ${PLAYER.maxHp + 25 * lvl})`,
    baseCost: 8, costGrowth: 1.5, maxLevel: 6,
  },
  {
    id: 'regen', name: 'Health regen', icon: '✚',
    desc: (lvl) => `+1 hp/s each (now ${lvl} hp/s)`,
    baseCost: 12, costGrowth: 1.7, maxLevel: 5,
  },
  {
    id: 'speed', name: 'Move speed', icon: '➤',
    desc: (lvl) => `+8% speed (now +${8 * lvl}%)`,
    baseCost: 10, costGrowth: 1.6, maxLevel: 5,
  },
  {
    id: 'slow', name: 'Enemy slow', icon: '❄',
    desc: (lvl) => `Enemies 7% slower (now −${7 * lvl}%)`,
    baseCost: 14, costGrowth: 1.7, maxLevel: 5,
  },
];

export function createUpgradeLevels() {
  return Object.fromEntries(UPGRADES.map((u) => [u.id, 0]));
}

export function upgradeCost(u, level) {
  return Math.round(u.baseCost * u.costGrowth ** level);
}

/** Turn upgrade levels into the numbers the game uses. */
export function computeStats(levels) {
  return {
    chainLength: CHAIN.maxLength + 30 * levels.chain,
    maxHp: PLAYER.maxHp + 25 * levels.hp,
    regen: 1 * levels.regen,                 // hp per second
    speed: PLAYER.speed * (1 + 0.08 * levels.speed),
    enemySpeedMult: 1 - 0.07 * levels.slow,
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
