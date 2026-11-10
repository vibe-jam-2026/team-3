// Entry point: canvas setup, screen states and the main loop.

import { wasPressed, endFrame } from './input.js';
import {
  createGame, resizeGame, updateGame, drawGame, startNextWave, formatTime, PLAYER_COLORS,
} from './game.js';
import { drawBigBang, bigBangTime } from './bigbang.js';
import { prepareSpace } from './space.js';
import { arcade, pixel } from './fonts.js';
import { dpr as screenScale } from './display.js';
import { addScore, loadScores, bestScore, MAX_ENTRIES } from './highscores.js';
import { DEBUG } from './config.js';
import { VERSION } from './version.js';
import { toggleMute, isMuted } from './audio.js';
import { startMusic, toggleMusic, isMusicOn } from './music.js';
import { onKeyword } from './voice.js';
import { usePower } from './powers.js';

// Shouted keywords only work while playing
onKeyword((kind) => {
  if (screen === 'playing' && game) usePower(game, kind);
});

startMusic(); // begins playing as soon as the first key press / click unlocks audio

// Build the other dimension's sky in the background while the title is showing,
// so a wormhole opening mid-game doesn't stutter.
setTimeout(() => {
  const build = () => prepareSpace(window.innerWidth, window.innerHeight, 1);
  if (window.requestIdleCallback) requestIdleCallback(build, { timeout: 3000 });
  else build();
}, 2500);
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
  const dpr = screenScale();
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

// ---------- Game over: names + highscores (HTML overlay) ----------
const scoreMenu = document.getElementById('score-menu');
const scoreSummary = document.getElementById('score-summary');
const nameForm = document.getElementById('name-form');
const nameP1 = document.getElementById('name-p1');
const nameP2 = document.getElementById('name-p2');
const skipScoreBtn = document.getElementById('skip-score-btn');
const scoreListView = document.getElementById('score-list-view');
const scoreList = document.getElementById('score-list');
const scoreNote = document.getElementById('score-note');
const playAgainBtn = document.getElementById('play-again-btn');

// Test runs (god mode, dev starts, extra coins, short waves) don't go on the list
const isTestRun = DEBUG.god || DEBUG.wormhole || DEBUG.yarn || DEBUG.startWave > 1 || DEBUG.startCoins > 0 ||
  new URLSearchParams(window.location.search).has('wave');

function wavesCleared() {
  return Math.max(0, game.wave - 1); // died during wave N = cleared N - 1
}

function showGameOver() {
  screen = 'gameover';
  const cleared = wavesCleared();
  scoreSummary.innerHTML =
    `You cleared <b>${cleared} wave${cleared === 1 ? '' : 's'}</b> · ` +
    `Kills: ${game.kills} · Time: ${formatTime(game.time)}`;
  scoreMenu.hidden = false;
  if (isTestRun) {
    showScoreList(-1, 'Test run (debug options in the address): not saved.');
    return;
  }
  nameForm.hidden = false;
  scoreListView.hidden = true;
  // Remember last names to save typing
  try {
    nameP1.value = localStorage.getItem('tethered-name-p1') || '';
    nameP2.value = localStorage.getItem('tethered-name-p2') || '';
  } catch { /* ignore */ }
  // Players are usually still holding movement keys when they die: wait a moment
  // before the name boxes accept typing, so W/A/S/D don't end up in the names.
  nameP1.readOnly = nameP2.readOnly = true;
  setTimeout(() => {
    nameP1.readOnly = nameP2.readOnly = false;
    nameP1.focus();
    nameP1.select();
  }, 700);
}

function showScoreList(rank, note) {
  nameForm.hidden = true;
  scoreListView.hidden = false;
  const list = loadScores();
  scoreList.innerHTML = list.length
    ? list.map((e, i) =>
      `<li class="${i === rank ? 'new' : ''}">` +
      `<span class="rank">${i + 1}.</span>` +
      `<span class="who"><span class="a">${e.p1}</span> &amp; <span class="b">${e.p2}</span></span>` +
      `<span class="wave">${e.wave} cleared</span>` +
      `<span class="extra">${e.kills} kills · ${formatTime(e.time)}</span>` +
      `</li>`).join('')
    : '<li><span class="empty">No scores yet</span></li>';
  scoreNote.textContent = note || '';
  playAgainBtn.focus();
}

// Typing a name: only letters/digits, upper case; jump to P2 after 3 characters
for (const input of [nameP1, nameP2]) {
  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (input === nameP1 && input.value.length === 3) { nameP2.focus(); nameP2.select(); }
  });
}

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    localStorage.setItem('tethered-name-p1', nameP1.value);
    localStorage.setItem('tethered-name-p2', nameP2.value);
  } catch { /* ignore */ }
  const { rank } = addScore({
    p1: nameP1.value, p2: nameP2.value,
    wave: wavesCleared(), kills: game.kills, time: game.time,
  });
  showScoreList(rank, rank < 0 ? `Not in the top ${MAX_ENTRIES} this time.` : '');
});
skipScoreBtn.addEventListener('click', () => showScoreList(-1, 'Not saved.'));

function playAgain() {
  scoreMenu.hidden = true;
  playAgainBtn.blur();
  startGame();
}
playAgainBtn.addEventListener('click', playAgain);

// ---------- Screen logic ----------
function startGame() {
  game = createGame(width, height);
  window.game = game; // handy for debugging: inspect/tweak from the browser console
  screen = 'playing';
}

function update(dt) {
  // While typing a name, keys belong to the text box
  if (document.activeElement instanceof HTMLInputElement) return;
  // Sound on/off works on every screen
  if (wasPressed('KeyM')) toggleMute();
  if (wasPressed('KeyN')) toggleMusic();
  switch (screen) {
    case 'title':
      if (wasPressed('Enter') || wasPressed('Space')) startGame();
      break;
    case 'playing':
      if (wasPressed('Escape') || wasPressed('KeyP')) { screen = 'paused'; break; }
      updateGame(game, dt);
      if (game.status === 'waveComplete') showWaveMenu();
      else if (game.status === 'dead') showGameOver();
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
      // The overlay's buttons handle Enter; this covers clicks elsewhere
      if (!scoreListView.hidden && !(document.activeElement instanceof HTMLButtonElement) &&
        (wasPressed('Enter') || wasPressed('Space'))) playAgain();
      break;
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  if (screen === 'title') {
    drawTitle();
  } else {
    drawGame(ctx, game);
    if (screen === 'paused') {
      drawOverlay('Paused', ['Press Esc or P to continue']);
    }
    // Game over text is in the HTML overlay (names + highscores)
  }
  drawVersion();
}

/** Version number in the bottom-right corner of every screen. */
function drawVersion() {
  ctx.font = arcade(8);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(232, 230, 225, 0.55)';
  ctx.fillText(`v${VERSION}`, width - 10, height - 8);
}

// ---------- Screens ----------
function drawTitle() {
  drawBigBang(ctx, width, height);
  const t = bigBangTime();

  const cx = width / 2;
  const cy = height / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title slams in out of the explosion: WORMAGEDDON / IN SPACE, arcade style
  const fit = Math.min(1, (width - 40) / (11 * 46)); // shrink on narrow screens
  const tIn = Math.min(1, Math.max(0, (t - 0.5) / 0.6));
  if (tIn > 0) {
    const ease = 1 - (1 - tIn) ** 3;
    const scale = (2.2 - 1.2 * ease) * fit;
    ctx.save();
    ctx.globalAlpha = tIn;
    ctx.translate(cx, cy - 135);
    ctx.scale(scale, scale);
    ctx.font = arcade(46);
    ctx.lineJoin = 'round';
    // chunky dark outline + drop shadow, like an old arcade marquee
    ctx.fillStyle = '#2a0838';
    ctx.fillText('WORMAGEDDON', 4, 5);
    ctx.strokeStyle = '#2a0838';
    ctx.lineWidth = 10;
    ctx.strokeText('WORMAGEDDON', 0, 0);
    const g = ctx.createLinearGradient(0, -23, 0, 23);
    g.addColorStop(0, '#fff59d');
    g.addColorStop(0.45, '#ffb300');
    g.addColorStop(1, '#ff3d00');
    ctx.shadowColor = 'rgba(255, 140, 40, 0.9)';
    ctx.shadowBlur = 30 * (1 - ease) + 14;
    ctx.fillStyle = g;
    ctx.fillText('WORMAGEDDON', 0, 0);
    // IN SPACE
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(120, 200, 255, 0.9)';
    ctx.font = arcade(22);
    ctx.strokeStyle = '#0b1640';
    ctx.lineWidth = 7;
    ctx.strokeText('IN SPACE', 0, 52);
    const g2 = ctx.createLinearGradient(0, 40, 0, 64);
    g2.addColorStop(0, '#e1f5fe');
    g2.addColorStop(1, '#4fc3f7');
    ctx.fillStyle = g2;
    ctx.fillText('IN SPACE', 0, 52);
    ctx.restore();
  }

  // The rest fades in a moment later
  const tText = Math.min(1, Math.max(0, (t - 1.1) / 0.6));
  ctx.globalAlpha = tText;
  // Dark halo so the text stays readable on top of the glowing core
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 8;
  ctx.font = pixel(26);
  ctx.fillStyle = '#d9cfe8';
  ctx.fillText('In the beginning there were two worms. Tied together.', cx, cy - 40);

  ctx.font = arcade(12);
  ctx.fillStyle = PLAYER_COLORS[0];
  ctx.fillText('P1  W A S D   Q THROW', cx, cy + 5);
  ctx.fillStyle = PLAYER_COLORS[1];
  ctx.fillText('P2  ARROWS    . THROW', cx, cy + 32);

  const blink = Math.floor(performance.now() / 500) % 2 === 0;
  if (blink && t > 1.7) {
    ctx.fillStyle = '#ffffff';
    ctx.font = arcade(16);
    ctx.fillText('PRESS ENTER TO START', cx, cy + 95);
  }

  // Best run so far on this computer
  const best = bestScore();
  if (best) {
    ctx.font = arcade(10);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(`HI-SCORE  WAVE ${best.wave}  ${best.p1} & ${best.p2}`, cx, cy + 145);
  }

  ctx.font = pixel(20);
  ctx.fillStyle = '#a79fb8';
  ctx.fillText(`Esc / P: pause · M: sound ${isMuted() ? 'off' : 'on'} · N: music ${isMusicOn() ? 'on' : 'off'} · V: voice on/off`, cx, height - 30);
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
  ctx.font = arcade(30);
  ctx.fillText(title.toUpperCase(), cx, cy - 40);
  ctx.font = pixel(28);
  lines.forEach((line, i) => ctx.fillText(line, cx, cy + 10 + i * 32));
}

// ---------- Main loop ----------
// Every frame advances the game by exactly the time since the last frame, split into
// equal small steps (at most 1/60 s each) for stable physics. Unlike a fixed 60-steps-
// per-second clock, this moves smoothly on 90/120/144 Hz screens too: no repeated or
// doubled frames, which look like stutter.
const MAX_STEP = 1 / 60;
let last = performance.now();

function frame(now) {
  const elapsed = Math.min((now - last) / 1000, 0.1); // cap so a background tab doesn't explode
  last = now;
  if (elapsed > 0) {
    const steps = Math.ceil(elapsed / MAX_STEP - 1e-6);
    const dt = elapsed / steps;
    for (let i = 0; i < steps; i++) {
      update(dt);
      // Key presses only count once, even if we run several steps this frame.
      if (i === 0) endFrame();
    }
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
