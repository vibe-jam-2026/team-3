// Entry point: canvas setup, screen states and the main loop.

import { wasPressed, endFrame } from './input.js';
import {
  createGame, resizeGame, updateGame, drawGame, startNextWave, formatTime, PLAYER_COLORS,
} from './game.js';
import { drawBigBang, bigBangTime } from './bigbang.js';
import { toggleMute, isMuted } from './audio.js';
import { UPGRADES, upgradeCost, buyUpgrade } from './upgrades.js';

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
const walletAmount = document.getElementById('wallet-amount');
const upgradeList = document.getElementById('upgrade-list');

// One button per upgrade, built once
const upgradeButtons = UPGRADES.map((u, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'upgrade';
  // Keep focus on Continue when clicking, so Enter still means "continue"
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', () => {
    if (buyUpgrade(game, u.id)) refreshUpgrades();
  });
  upgradeList.appendChild(btn);
  return { u, btn, key: `Digit${i + 1}` };
});

// The gimmick: looks like "Max All", but the hidden second line says "enemies"
// (same colour as the card). Clicking it curses the next wave.
const maxAllBtn = document.createElement('button');
maxAllBtn.type = 'button';
maxAllBtn.className = 'upgrade max-all';
maxAllBtn.addEventListener('mousedown', (e) => e.preventDefault());
maxAllBtn.addEventListener('click', () => {
  game.cursedWave = game.wave + 1;
  refreshUpgrades();
});
upgradeList.appendChild(maxAllBtn);

function refreshUpgrades() {
  const cursed = game.cursedWave === game.wave + 1;
  maxAllBtn.disabled = cursed;
  maxAllBtn.innerHTML =
    `<span class="icon">★</span>` +
    `<span class="name">Max All</span>` +
    `<span class="sneaky">enemies</span>` +
    `<span class="desc">${cursed ? 'Done!' : 'Every upgrade to the max'}</span>` +
    `<span class="cost">${cursed ? '✓' : 'FREE'}</span>`;

  walletAmount.textContent = game.coins;
  for (const { u, btn } of upgradeButtons) {
    const lvl = game.upgrades[u.id];
    const maxed = lvl >= u.maxLevel;
    const cost = upgradeCost(u, lvl);
    const pips = Number.isFinite(u.maxLevel)
      ? '●'.repeat(lvl) + '○'.repeat(u.maxLevel - lvl)
      : `Level ${lvl}`;
    btn.disabled = maxed || game.coins < cost;
    btn.innerHTML =
      `<span class="icon">${u.icon}</span>` +
      `<span class="name">${u.name}</span>` +
      `<span class="desc">${u.desc(lvl)}</span>` +
      `<span class="pips">${pips}</span>` +
      `<span class="cost">${maxed ? 'MAX' : `<span class="coin"></span> ${cost}`}</span>`;
  }
}

function showWaveMenu() {
  screen = 'waveMenu';
  waveMenuTitle.textContent = `Wave ${game.wave} complete`;
  waveMenuStats.innerHTML =
    `Kills: ${game.waveKills} · Coins collected: ${game.waveCoins}<br>` +
    `Both players are healed to full for the next wave.`;
  refreshUpgrades();
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
  window.game = game; // handy for debugging: inspect/tweak from the browser console
  screen = 'playing';
}

function update(dt) {
  // Sound on/off works on every screen
  if (wasPressed('KeyM')) toggleMute();
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
    case 'waveMenu': {
      for (const { u, key } of upgradeButtons) {
        if (wasPressed(key) && buyUpgrade(game, u.id)) refreshUpgrades();
      }
      // A focused button handles Enter/Space itself (buy or continue)
      const onButton = document.activeElement instanceof HTMLButtonElement;
      if (!onButton && (wasPressed('Enter') || wasPressed('Space'))) continueToNextWave();
      break;
    }
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
  drawBigBang(ctx, width, height);
  const t = bigBangTime();

  const cx = width / 2;
  const cy = height / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title slams in out of the explosion
  const tIn = Math.min(1, Math.max(0, (t - 0.5) / 0.6));
  if (tIn > 0) {
    const ease = 1 - (1 - tIn) ** 3;
    const scale = 2.2 - 1.2 * ease;
    ctx.save();
    ctx.globalAlpha = tIn;
    ctx.translate(cx, cy - 110);
    ctx.scale(scale, scale);
    ctx.shadowColor = 'rgba(255, 200, 120, 0.9)';
    ctx.shadowBlur = 30 * (1 - ease) + 12;
    ctx.fillStyle = '#fff6e6';
    ctx.font = '800 64px system-ui, sans-serif';
    ctx.fillText('TETHERED', 0, 0);
    ctx.restore();
  }

  // The rest fades in a moment later
  const tText = Math.min(1, Math.max(0, (t - 1.1) / 0.6));
  ctx.globalAlpha = tText;
  // Dark halo so the text stays readable on top of the glowing core
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#d9cfe8';
  ctx.fillText('In the beginning there was one worm. With two heads.', cx, cy - 60);

  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillStyle = PLAYER_COLORS[0];
  ctx.fillText('Player 1: W A S D', cx, cy);
  ctx.fillStyle = PLAYER_COLORS[1];
  ctx.fillText('Player 2: Arrow keys', cx, cy + 30);

  const blink = Math.floor(performance.now() / 500) % 2 === 0;
  if (blink && t > 1.7) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.fillText('Press Enter to start', cx, cy + 100);
  }

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#a79fb8';
  ctx.fillText(`Esc / P: pause · M: sound ${isMuted() ? 'off' : 'on'}`, cx, height - 30);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
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
