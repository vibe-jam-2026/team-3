// Sound effects, synthesised with the Web Audio API (no sound files needed).
// Browsers only allow audio after the player presses a key or clicks, so the
// audio context is created/resumed on the first input.

const MASTER_VOLUME = 0.5;
// Don't spam: at most one sound of each kind per this many seconds
const MIN_GAP = { cluck: 0.18, crow: 1.2, roar: 2, pew: 0.05 };

let ctx = null;
let master = null;
let muted = false;
const lastPlayed = { cluck: -Infinity, crow: -Infinity, roar: -Infinity, pew: -Infinity };

try { muted = localStorage.getItem('tethered-muted') === '1'; } catch { /* storage blocked */ }

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Unlock audio on the first key press or click
for (const evt of ['keydown', 'pointerdown']) {
  window.addEventListener(evt, ensureContext, { passive: true });
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('tethered-muted', muted ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
}

function canPlay(kind) {
  if (muted || !ctx || ctx.state !== 'running') return false;
  const now = ctx.currentTime;
  if (now - lastPlayed[kind] < MIN_GAP[kind]) return false;
  lastPlayed[kind] = now;
  return true;
}

/** A chicken entered the arena: a quick "buk-buk-bawk". */
export function playCluck() {
  if (!canPlay('cluck')) return;
  cluck(ctx, master, ctx.currentTime);
}

/** A rooster entered the arena: a short "cock-a-doodle-doo". */
export function playCrow() {
  if (!canPlay('crow')) return;
  crow(ctx, master, ctx.currentTime);
}

/** The alien fires a shot: "pew". */
export function playPew() {
  if (!canPlay('pew')) return;
  pew(ctx, master, ctx.currentTime);
}

/** The dinosaur boss enters the arena: a big rumbling roar. */
export function playRoar() {
  if (!canPlay('roar')) return;
  roar(ctx, master, ctx.currentTime);
}

// ---------------------------------------------------------------------------
// Synths. Each takes (audioContext, destination, startTime) so they can also be
// rendered offline for testing.
// ---------------------------------------------------------------------------

/**
 * One voiced syllable: a buzzy sawtooth through two "mouth" filters (formants),
 * following a pitch curve, with a quick attack and release.
 */
function syllable(ac, dest, t, dur, pitches, { vol = 0.3, formants = [900, 2200], vibrato = 0 } = {}) {
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  const step = dur / (pitches.length - 1);
  osc.frequency.setValueAtTime(pitches[0], t);
  pitches.slice(1).forEach((f, i) => osc.frequency.linearRampToValueAtTime(f, t + step * (i + 1)));

  if (vibrato) {
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 28;
    lfoGain.gain.value = vibrato;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur * 0.2));
  env.gain.setValueAtTime(vol, t + dur * 0.7);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  for (const f of formants) {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 4;
    osc.connect(bp).connect(env);
  }
  env.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function cluck(ac, dest, t) {
  const base = 480 + Math.random() * 120; // every chicken sounds a little different
  const notes = Math.random() < 0.5 ? 2 : 3;
  for (let i = 0; i < notes; i++) {
    const last = i === notes - 1;
    syllable(ac, dest, t + i * 0.11, last ? 0.16 : 0.06,
      last ? [base * 1.25, base * 1.45, base * 0.9] : [base, base * 0.85],
      { vol: 0.35, formants: [1000, 2400] });
  }
}

export function crow(ac, dest, t) {
  const base = 520 + Math.random() * 60;
  // cock - a - doodle - doooo
  const parts = [
    { at: 0.00, dur: 0.12, p: [base, base * 1.1] },
    { at: 0.15, dur: 0.08, p: [base * 1.15, base * 1.1] },
    { at: 0.26, dur: 0.12, p: [base * 1.2, base * 1.3] },
    { at: 0.42, dur: 0.60, p: [base * 1.3, base * 1.6, base * 1.55, base * 1.2] },
  ];
  for (const s of parts) {
    syllable(ac, dest, t + s.at, s.dur, s.p, { vol: 0.32, formants: [800, 2000, 3200], vibrato: 12 });
  }
}

export function roar(ac, dest, t) {
  const dur = 1.8;

  // Growling voice: two detuned low sawtooths, pitch rising then falling, with a rough wobble
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.3, t + 0.15);
  out.gain.setValueAtTime(0.3, t + dur * 0.55);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(500, t);
  lp.frequency.linearRampToValueAtTime(1400, t + 0.4);
  lp.frequency.linearRampToValueAtTime(400, t + dur);
  lp.Q.value = 6;
  lp.connect(out);

  const wobble = ac.createOscillator();
  const wobbleGain = ac.createGain();
  wobble.frequency.value = 22;
  wobbleGain.gain.value = 18;
  wobble.connect(wobbleGain);

  for (const detune of [0, 7]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70 + detune, t);
    o.frequency.linearRampToValueAtTime(140 + detune, t + 0.35);
    o.frequency.linearRampToValueAtTime(95 + detune, t + 1.1);
    o.frequency.linearRampToValueAtTime(55 + detune, t + dur);
    wobbleGain.connect(o.frequency);
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  wobble.start(t);
  wobble.stop(t + dur + 0.05);

  // Breathy noise layer
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700;
  bp.Q.value = 0.8;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.25, t + 0.2);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  noise.connect(bp).connect(ng).connect(out);
  noise.start(t);

  out.connect(dest);
}

export function pew(ac, dest, t) {
  // A quick laser zap: square wave sweeping down fast, through a gentle low-pass
  const o = ac.createOscillator();
  o.type = 'square';
  const start = 1400 + Math.random() * 300;
  o.frequency.setValueAtTime(start, t);
  o.frequency.exponentialRampToValueAtTime(220, t + 0.14);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(lp).connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.18);
}
