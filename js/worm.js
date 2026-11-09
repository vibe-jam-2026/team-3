// The players are one two-headed worm: each player is a worm head,
// and the chain between them is drawn as the worm's segmented body.

const SKIN = '#f2a0b0';
const SKIN_DARK = '#d97a8f';
const OUTLINE = '#7a3546';
const BODY_WIDTH = 15; // px (visual only; the chain's hit width is CHAIN.thickness)

/** Smooth path through the chain points (curves through the midpoints). */
function bodyPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

export function drawWormBody(ctx, chain) {
  const pts = chain.points;
  const t = performance.now() / 1000;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shadow
  ctx.save();
  ctx.translate(2, 5);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = BODY_WIDTH;
  bodyPath(ctx, pts);
  ctx.stroke();
  ctx.restore();

  // Outline, then skin, then a lighter stripe along the top
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = BODY_WIDTH + 3;
  bodyPath(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = BODY_WIDTH;
  bodyPath(ctx, pts);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -BODY_WIDTH * 0.18);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = BODY_WIDTH * 0.3;
  bodyPath(ctx, pts);
  ctx.stroke();
  ctx.restore();

  // Segment rings across the body (they "breathe" a little so the worm looks alive)
  ctx.strokeStyle = SKIN_DARK;
  ctx.lineWidth = 2;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i + 1];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const half = (BODY_WIDTH / 2) * (0.85 + 0.15 * Math.sin(t * 4 + i * 0.9));
    ctx.beginPath();
    ctx.moveTo(pts[i].x - dy * half, pts[i].y + dx * half);
    ctx.lineTo(pts[i].x + dy * half, pts[i].y - dx * half);
    ctx.stroke();
  }
}

/**
 * One worm head. p.lookX/p.lookY is the direction it last moved in (eyes look that way).
 * A collar in the player's colour and a small number tell the two heads apart.
 */
export function drawWormHead(ctx, p, neck) {
  const r = p.r;
  const lx = p.lookX ?? (p.index === 0 ? -1 : 1);
  const ly = p.lookY ?? 0;
  const blink = p.invuln > 0 && Math.floor(p.invuln * 15) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.4;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x + 2, p.y + r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Collar in the player's colour, on the neck side (toward the body)
  const nx = neck.x - p.x;
  const ny = neck.y - p.y;
  const nd = Math.hypot(nx, ny) || 1;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const ca = Math.atan2(ny, nx);
  ctx.arc(p.x, p.y, r - 2, ca - 1.1, ca + 1.1);
  ctx.stroke();

  // Head
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x - r * 0.3, p.y - r * 0.35, r * 0.25, r * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Eyes: placed toward the look direction, pupils look that way
  const px = -ly;
  const py = lx;
  for (const side of [-1, 1]) {
    const ex = p.x + lx * r * 0.3 + px * side * r * 0.32;
    const ey = p.y + ly * r * 0.3 + py * side * r * 0.32 - r * 0.1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(ex + lx * r * 0.09, ey + ly * r * 0.09, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mouth: a small smile at the front
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  const mx = p.x + lx * r * 0.55;
  const my = p.y + ly * r * 0.55 + r * 0.15;
  const ma = Math.atan2(ly, lx);
  ctx.beginPath();
  ctx.arc(mx, my, r * 0.18, ma - 0.9, ma + 0.9);
  ctx.stroke();

  ctx.globalAlpha = 1;

  // Player number above the head, in the player's colour
  ctx.fillStyle = p.color;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`P${p.index + 1}`, p.x, p.y - r - 2);
}
