// Game state: players, arena and the update/draw for the "playing" screen.
// Phase 3 adds the chain, enemies and damage here.

import { moveVector } from './input.js';

export const PLAYER_COLORS = ['#4fc3f7', '#ffb74d'];

const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 260; // pixels per second

export function createGame(width, height) {
  return {
    width,
    height,
    time: 0,
    players: [
      makePlayer(0, width * 0.4, height / 2),
      makePlayer(1, width * 0.6, height / 2),
    ],
  };
}

function makePlayer(index, x, y) {
  return { index, x, y, r: PLAYER_RADIUS, color: PLAYER_COLORS[index] };
}

/** Keep the arena the size of the window; pull players back inside if it shrinks. */
export function resizeGame(game, width, height) {
  game.width = width;
  game.height = height;
  for (const p of game.players) clampToArena(game, p);
}

export function updateGame(game, dt) {
  game.time += dt;

  for (const p of game.players) {
    const dir = moveVector(p.index);
    p.x += dir.x * PLAYER_SPEED * dt;
    p.y += dir.y * PLAYER_SPEED * dt;
    clampToArena(game, p);
  }
}

function clampToArena(game, p) {
  p.x = Math.max(p.r, Math.min(game.width - p.r, p.x));
  p.y = Math.max(p.r, Math.min(game.height - p.r, p.y));
}

export function drawGame(ctx, game) {
  // Arena
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, game.width, game.height);
  ctx.strokeStyle = '#2c313c';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, game.width - 4, game.height - 4);

  // Placeholder link between the players — becomes the real chain in Phase 3.
  const [a, b] = game.players;
  ctx.strokeStyle = '#555c6b';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Players
  for (const p of game.players) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111318';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`P${p.index + 1}`, p.x, p.y + 1);
  }

  // HUD: time survived
  ctx.fillStyle = '#e8e6e1';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(formatTime(game.time), game.width / 2, 16);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
