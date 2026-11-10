// Recolouring for the other dimension, with no extra drawing work.
// tintedContext(ctx) returns a stand-in for the canvas context that passes every
// call straight through, except that colours set as fillStyle / strokeStyle are
// swapped for hue-shifted versions (looked up once, then cached).

const HUE_SHIFT = 150;  // degrees
const SATURATE = 1.4;

const cache = new Map();

function parse(str) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(str);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(str.replace(/\s+/g, ''));
  if (m) {
    const p = m[1].split(',').map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return null; // named colours etc. are left alone
}

function shift([r, g, b, a]) {
  // RGB -> HSL
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  // Shift the hue, boost the saturation; very pale colours get a cool tint
  h = (h + HUE_SHIFT / 360) % 1;
  s = Math.min(1, s * SATURATE + (s < 0.15 ? 0.25 : 0));
  if (s < 0.4 && l > 0.75) h = 0.47; // whites/creams turn icy teal
  // HSL -> RGB
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const R = Math.round(hue(h + 1 / 3) * 255);
  const G = Math.round(hue(h) * 255);
  const B = Math.round(hue(h - 1 / 3) * 255);
  return `rgba(${R}, ${G}, ${B}, ${a})`;
}

export function shiftColor(style) {
  if (typeof style !== 'string') return style; // gradients/patterns pass through
  let out = cache.get(style);
  if (out === undefined) {
    const rgba = parse(style);
    out = rgba ? shift(rgba) : style;
    cache.set(style, out);
  }
  return out;
}

const wrappers = new WeakMap();

/** A context stand-in that recolours fillStyle/strokeStyle. */
export function tintedContext(ctx) {
  let w = wrappers.get(ctx);
  if (w) return w;
  const bound = new Map();
  w = new Proxy(ctx, {
    get(target, prop) {
      const v = target[prop];
      if (typeof v !== 'function') return v;
      let f = bound.get(prop);
      if (!f) { f = v.bind(target); bound.set(prop, f); }
      return f;
    },
    set(target, prop, value) {
      target[prop] = prop === 'fillStyle' || prop === 'strokeStyle' ? shiftColor(value) : value;
      return true;
    },
  });
  wrappers.set(ctx, w);
  return w;
}
