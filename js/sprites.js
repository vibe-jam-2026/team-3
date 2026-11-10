// Sprite cache: things drawn many times per frame (eggs, chickens, coins …) are drawn
// once into a small offscreen canvas and then just stamped with drawImage, which is
// far cheaper than redrawing all their shapes every frame.

import { dpr } from './display.js';

const cache = new Map();

/**
 * Get (or make) a cached sprite. `size` is its width/height in CSS px; `draw(c, half)`
 * draws it centred at (half, half) on the sprite's own context.
 */
export function sprite(key, size, draw) {
  const scale = dpr();
  const k = `${key}|${scale}`;
  let s = cache.get(k);
  if (!s) {
    if (cache.size > 3000) cache.clear(); // safety valve
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.ceil(size * scale);
    const c = canvas.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 0, 0);
    draw(c, size / 2);
    s = { canvas, size };
    cache.set(k, s);
  }
  return s;
}

/** Stamp a sprite centred at (x, y), optionally scaled, mirrored and rotated. */
export function blit(ctx, s, x, y, scale = 1, flipX = false, angle = 0) {
  const d = s.size * scale;
  if (!flipX && !angle) {
    ctx.drawImage(s.canvas, x - d / 2, y - d / 2, d, d);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(s.canvas, -d / 2, -d / 2, d, d);
  ctx.restore();
}
