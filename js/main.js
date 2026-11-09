// Entry point: canvas setup, screen states and the main loop.

import { wasPressed, endFrame } from './input.js';
import {
  createGame, resizeGame, updateGame, drawGame, startNextWave, formatTime, PLAYER_COLORS,
} from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Screens: 'title' -> 'playing' <-> 'paused'
//          'playing' -> 'waveMenu' -> 'playing' (next wave)
//          'playing' -> 'gameover' -> 'playing' (new game)
let screen = 'title';
let game = null;
let width = 0;
let height = 0;

// ---------- Canvas sizing (sharp on high-DPI screens) ----------
function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (game) resizeGame(game, width, height);
}
window.addEventListener('resize', resize);
resize();

// ---------- Between-waves menu (HTML, so it has a real clickable button) ----------
const waveMenu = document.getElementById('wave-menu');
const waveMenuTitle = document.getElementById('wave-menu-title');
const waveMenuStats = document.getElementById('wave-menu-stats');
const continueBtn = document.getElementById('continue-btn');

function showWaveMenu() {
  screen = 'waveMenu';
  waveMenuTitle.textContent = `Wave ${game.wave} complete`;
  waveMenuStats.innerHTML =
    `Kills this wave: ${game.waveKills}<br>` +
    `Total kills: ${game.kills} · Time: ${formatTime(game.time)}<br>` +
    `Both players heal a little before the next wave.`;
  waveMenu.hidden = false;
  continueBtn.focus();
}

function continueToNextWave() {
  if (screen !== 'waveMenu') return;
  waveMenu.hidden = true;
  continueBtn.blur();
  startNextWave(game);
  screen = 'playing';
}
continueBtn.addEventListener('click', continueToNextWave);

// ---------- Screen logic ----------
function startGame() {
  game = createGame(width, height);
  screen = 'playing';
}

function update(dt) {
  switch (screen) {
    case 'title':
      if (wasPressed('Enter') || wasPressed('Space')) startGame();
      break;
    case 'playing':
      if (wasPressed('Escape') || wasPressed('KeyP')) { screen = 'paused'; break; }
      updateGame(game, dt);
      if (game.status === 'waveComplete') showWaveMenu();
      else if (game.status === 'dead') screen = 'gameover';
      break;
    case 'waveMenu':
      if (wasPressed('Enter') || wasPressed('Space')) continueToNextWave();
      break;
    case 'paused':
      if (wasPressed('Escape') || wasPressed('KeyP')) screen = 'playing';
      break;
    case 'gameover':
      if (wasPressed('Enter') || wasPressed('Space')) startGame();
      break;
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  if (screen === 'title') {
    drawTitle();
    return;
  }

  drawGame(ctx, game);

  if (screen === 'paused') {
    drawOverlay('Paused', ['Press Esc or P to continue']);
  } else if (screen === 'gameover') {
    drawOverlay('Game over', [
      `You reached wave ${game.wave} and survived ${formatTime(game.time)}`,
      `Kills: ${game.kills}`,
      'Press Enter to play again',
    ]);
  }
}

// ---------- Screens ----------
function drawTitle() {
  ctx.fillStyle = '#111318';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#e8e6e1';
  ctx.font = '700 64px system-ui, sans-serif';
  ctx.fillText('TETHERED', cx, cy - 110);

  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#9a978f';
  ctx.fillText('Two players. One chain. Swing it through the horde.', cx, cy - 60);

  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillStyle = PLAYER_COLORS[0];
  ctx.fillText('Player 1: W A S D', cx, cy);
  ctx.fillStyle = PLAYER_COLORS[1];
  ctx.fillText('Player 2: Arrow keys', cx, cy + 30);

  const blink = Math.floor(performance.now() / 500) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#e8e6e1';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('Press Enter to start', cx, cy + 100);
  }

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#6b675f';
  ctx.fillText('Esc / P: pause', cx, height - 30);
}

function drawOverlay(title, lines) {
  ctx.fillStyle = 'rgba(10, 11, 14, 0.7)';
  ctx.fillRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8e6e1';
  ctx.font = '700 48px system-ui, sans-serif';
  ctx.fillText(title, cx, cy - 40);
  ctx.font = '20px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, cx, cy + 10 + i * 32));
}

// ---------- Main loop (fixed time step for stable physics) ----------
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min((now - last) / 1000, 0.25); // cap so a background tab doesn't explode
  last = now;
  let stepped = false;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
    // Key presses only count once, even if we run several steps this frame.
    if (!stepped) { endFrame(); stepped = true; }
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
