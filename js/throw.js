// Partner throw: when the two worm heads are right next to each other, a player can
// grab the other head and hurl it in a random direction, out to the full length of
// the body. P1 throws with Q, P2 with "." (full stop). The body whips along behind,
// so a throw through a crowd sweeps the chain through it.

import { THROW } from './config.js';
import { playThrow } from './audio.js';

/** Player `i` tries to throw the other head. Returns true if it worked. */
export function tryThrow(game, i) {
  const thrower = game.players[i];
  const other = game.players[1 - i];
  if (thrower.thrown || other.thrown) return false;
  if ((thrower.throwCd || 0) > 0) return false;
  if (Math.hypot(other.x - thrower.x, other.y - thrower.y) > THROW.grabDistance) return false;

  // Random direction that lands inside the arena (try a few, else clamp)
  const dist = game.chain.maxLength * THROW.distance;
  const m = other.r + 4;
  let tx = 0;
  let ty = 0;
  for (let k = 0; k < 16; k++) {
    const a = Math.random() * Math.PI * 2;
    tx = thrower.x + Math.cos(a) * dist;
    ty = thrower.y + Math.sin(a) * dist;
    if (tx > m && tx < game.width - m && ty > m && ty < game.height - m) break;
  }
  tx = Math.max(m, Math.min(game.width - m, tx));
  ty = Math.max(m, Math.min(game.height - m, ty));

  other.thrown = { fromX: other.x, fromY: other.y, toX: tx, toY: ty, t: 0, dur: THROW.flightTime };
  other.invuln = Math.max(other.invuln, THROW.flightTime + 0.2); // safe while flying
  const len = Math.hypot(tx - other.x, ty - other.y) || 1;
  other.lookX = (tx - other.x) / len;
  other.lookY = (ty - other.y) / len;
  thrower.throwCd = THROW.cooldown;
  playThrow();
  return true;
}

/** Move a flying head along its throw. Returns true while it's in the air. */
export function updateThrown(p, dt) {
  p.throwCd = Math.max(0, (p.throwCd || 0) - dt);
  const T = p.thrown;
  if (!T) return false;
  T.t += dt;
  const k = Math.min(1, T.t / T.dur);
  const e = 1 - (1 - k) ** 2; // fast out of the hands, easing into the landing
  p.x = T.fromX + (T.toX - T.fromX) * e;
  p.y = T.fromY + (T.toY - T.fromY) * e;
  if (k >= 1) p.thrown = null;
  return true;
}

/** How high a flying head is (for drawing): 0 on the ground, up to 1 at the top. */
export function throwHeight(p) {
  if (!p.thrown) return 0;
  const k = Math.min(1, p.thrown.t / p.thrown.dur);
  return Math.sin(Math.PI * k);
}
