// Voice control: listens to the microphone with the browser's speech recognition
// and calls onKeyword('beam' | 'meteor') when someone shouts a keyword.
// The powers can ONLY be triggered by voice.
//
// - Works in Chrome and Edge (desktop and Android). Firefox has no speech recognition;
//   Safari's support varies.
// - Turns on by itself with the first key press / click (the browser then asks for
//   microphone permission once). V turns it off/on; the choice is remembered.
// - Chrome sends the audio to its speech service to turn it into text, so it needs
//   an internet connection and a secure page (https, which GitHub Pages is).
// - Matching is forgiving: speech recognition often hears "beam" as "bean" or "team"
//   and "meteor" as "meet your" or "media", so near-misses count too.

import { VOICE } from './config.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let rec = null;
let enabled = false;
let listening = false;
// 'off' | 'starting' | 'on' | 'denied' | 'unsupported' | 'network' | 'nomic' | 'error'
let status = SR ? 'off' : 'unsupported';
let lastHeard = '';
let lastHeardAt = 0;
let lastMatch = '';
let lastMatchAt = 0;
let handler = () => {};
const lastFired = {}; // keyword -> time, so one shout doesn't fire twice

let wanted = true; // the player's choice (V); remembered
try { wanted = localStorage.getItem('tethered-voice') !== '0'; } catch { /* ignore */ }

export function onKeyword(fn) {
  handler = fn;
}

export function voiceStatus() {
  return { status, lastHeard, lastHeardAt, lastMatch, lastMatchAt, supported: !!SR };
}

// Start/stop straight from the key press itself: browsers are happiest showing the
// microphone prompt in direct response to something the player did.
let started = false;
function onGesture(e) {
  if (e.type === 'keydown' && e.code === 'KeyV' && !(e.target instanceof HTMLInputElement)) {
    wanted = !wanted;
    try { localStorage.setItem('tethered-voice', wanted ? '1' : '0'); } catch { /* ignore */ }
    if (wanted) begin(); else end();
    return;
  }
  if (!started && wanted) begin();
}
window.addEventListener('keydown', onGesture);
window.addEventListener('pointerdown', onGesture);

function begin() {
  if (!SR) { status = 'unsupported'; return; }
  started = true;
  enabled = true;
  status = 'starting';
  if (!rec) {
    rec = new SR();
    rec.lang = VOICE.lang;
    rec.continuous = true;
    rec.interimResults = true; // react while the word is still being spoken
    rec.maxAlternatives = 3;
    rec.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        for (let a = 0; a < res.length; a++) {
          const text = res[a].transcript;
          if (a === 0) { lastHeard = text.trim(); lastHeardAt = performance.now(); }
          const kind = matchKeyword(text);
          if (kind) fire(kind);
        }
      }
    };
    rec.onstart = () => { listening = true; status = 'on'; };
    rec.onend = () => {
      listening = false;
      // The browser stops listening after silences or errors: keep it going
      if (enabled) setTimeout(() => { if (enabled && !listening) safeStart(); }, 300);
      else status = 'off';
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        enabled = false;
        status = 'denied';
      } else if (ev.error === 'network') {
        status = 'network';
      } else if (ev.error === 'audio-capture') {
        status = 'nomic';
      } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        status = 'error';
      }
    };
  }
  safeStart();
}

function safeStart() {
  try { rec.start(); } catch { /* already running */ }
}

function end() {
  enabled = false;
  status = 'off';
  if (rec) try { rec.stop(); } catch { /* ignore */ }
}

// ---------- Matching ----------

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Which keyword (if any) is in this bit of recognised speech. */
export function matchKeyword(text) {
  const words = text.toLowerCase().replace(/[^a-zåäöé\s]/g, ' ').split(/\s+/).filter(Boolean);
  // Also try pairs of words glued together ("meet your" -> "meetyour")
  const candidates = words.concat(words.slice(1).map((w, i) => words[i] + w));
  for (const [kind, spec] of Object.entries(VOICE.keywords)) {
    for (const w of candidates) {
      if (spec.words.includes(w)) return kind;
      if (spec.prefixes.some((p) => w.startsWith(p))) return kind;
      if (w.length >= spec.target.length - 1 && editDistance(w, spec.target) <= spec.maxDistance) return kind;
    }
  }
  return null;
}

function fire(keyword) {
  const now = performance.now();
  if (now - (lastFired[keyword] ?? -Infinity) < 1200) return;
  lastFired[keyword] = now;
  lastMatch = keyword;
  lastMatchAt = now;
  handler(keyword);
}
