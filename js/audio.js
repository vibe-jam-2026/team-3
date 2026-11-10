// Sound effects, synthesised with the Web Audio API (no sound files needed).
// Browsers only allow audio after the player presses a key or clicks, so the
// audio context is created/resumed on the first input.

const MASTER_VOLUME = 0.5;
// Don't spam: at most one sound of each kind per this many seconds
const MIN_GAP = { cluck: 0.18, crow: 1.2, roar: 2, pew: 0.05, squeak: 0.4, meow: 1, whoosh: 0.5, beam: 1, fall: 1, boom: 0.5, toss: 0.2, weee: 0.3, stampede: 1 };

let ctx = null;
let master = null;
let muted = false;
const lastPlayed = { cluck: -Infinity, crow: -Infinity, roar: -Infinity, pew: -Infinity, squeak: -Infinity, meow: -Infinity, whoosh: -Infinity, beam: -Infinity, fall: -Infinity, boom: -Infinity, toss: -Infinity, weee: -Infinity, stampede: -Infinity };

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

/** The shared audio context and master volume (null until the first key press / click). */
export function getAudio() {
  return ctx && ctx.state === 'running' ? { ctx, master } : null;
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

/** The giant laser beam (lasts `dur` seconds). */
export function playBeam(dur) {
  if (!canPlay('beam')) return;
  beam(ctx, master, ctx.currentTime, dur);
}

/** A meteor whistling down (lands after `dur` seconds). */
export function playMeteorFall(dur) {
  if (!canPlay('fall')) return;
  meteorFall(ctx, master, ctx.currentTime, dur);
}

/** Meteor impact. */
export function playBoom() {
  if (!canPlay('boom')) return;
  boom(ctx, master, ctx.currentTime);
}

/** A worm head gets thrown: a quick "hup" plus a swoosh. */
/** The thrown head flies through the air: "weeee!" (lasts `dur` seconds). */
export function playWeee(dur) {
  if (!canPlay('weee')) return;
  weee(ctx, master, ctx.currentTime, dur);
}

export function playThrow() {
  if (!canPlay('toss')) return;
  toss(ctx, master, ctx.currentTime);
}

/** Cat stampede: a chorus of meows over galloping paws. */
export function playStampede() {
  if (!canPlay('stampede')) return;
  const t = ctx.currentTime;
  // A whole crowd of cats: about 22 meows over ~2.4 s, from squeaky kittens
  // (high, short "mrrp!") to big toms (low, long "meeooww"), overlapping
  for (let i = 0; i < 22; i++) {
    const kind = Math.random();
    const opts = kind < 0.3
      ? { pitch: 1.5 + Math.random() * 0.4, length: 0.35 + Math.random() * 0.15, volume: 0.22 } // kitten
      : kind < 0.75
        ? { pitch: 0.9 + Math.random() * 0.3, length: 0.7 + Math.random() * 0.3, volume: 0.26 } // cat
        : { pitch: 0.62 + Math.random() * 0.15, length: 1.1 + Math.random() * 0.4, volume: 0.3 }; // tomcat yowl
    meow(ctx, master, t + Math.random() * 2.2, opts);
  }
  // Big opening yowl
  meow(ctx, master, t, { pitch: 0.75, length: 1.4, volume: 0.4 });
  for (let i = 0; i < 34; i++) paw(ctx, master, t + i * 0.07 + Math.random() * 0.03);
}

/** The worm goes through a wormhole: a swirling whoosh. */
export function playWhoosh() {
  if (!canPlay('whoosh')) return;
  whoosh(ctx, master, ctx.currentTime);
}

/** The space cat's UFO arrives: "mjau". */
export function playMeow() {
  if (!canPlay('meow')) return;
  meow(ctx, master, ctx.currentTime);
}

/** A rat enters the arena: a couple of high squeaks. */
export function playSqueak() {
  if (!canPlay('squeak')) return;
  squeak(ctx, master, ctx.currentTime);
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

export function squeak(ac, dest, t) {
  // 2-3 tiny chirps: a high sine that bends up then down, with a fast vibrato
  const n = 2 + (Math.random() < 0.4 ? 1 : 0);
  const base = (2600 + Math.random() * 700) * 1.2; // 20% higher than the first version
  for (let i = 0; i < n; i++) {
    const st = t + i * 0.09;
    const dur = 0.06 + Math.random() * 0.03;
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(base * 0.85, st);
    o.frequency.linearRampToValueAtTime(base * 1.25, st + dur * 0.4);
    o.frequency.linearRampToValueAtTime(base * 0.95, st + dur);
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 60;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(o.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(0.12, st + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    o.connect(g).connect(dest);
    o.start(st); o.stop(st + dur + 0.02);
    lfo.start(st); lfo.stop(st + dur + 0.02);
  }
}

export function meow(ac, dest, t, { pitch = 1, length = 1, volume = 0.45 } = {}) {
  // "mi-aaa-u": a nasal voice whose pitch rises then falls, while two mouth
  // filters (formants) glide from an "i" through an "a" to an "u".
  // pitch/length/volume vary it: small kittens squeak, big toms yowl.
  const dur = 0.75 * length;
  const base = (520 + Math.random() * 80) * pitch;
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base, t);
  o.frequency.linearRampToValueAtTime(base * 1.6, t + dur * 0.35);
  o.frequency.linearRampToValueAtTime(base * 1.45, t + dur * 0.6);
  o.frequency.linearRampToValueAtTime(base * 0.95, t + dur);
  const vib = ac.createOscillator();
  const vibGain = ac.createGain();
  vib.frequency.value = 6;
  vibGain.gain.value = 10;
  vib.connect(vibGain).connect(o.frequency);

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(volume, t + 0.06);
  env.gain.setValueAtTime(volume, t + dur * 0.65);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  //            "i"          "a"         "u"
  const f1 = [[350, 0], [900, 0.35], [400, 1]];
  const f2 = [[2300, 0], [1300, 0.35], [800, 1]];
  for (const track of [f1, f2]) {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(track[0][0], t);
    for (const [f, at] of track.slice(1)) bp.frequency.linearRampToValueAtTime(f, t + dur * at);
    o.connect(bp).connect(env);
  }
  env.connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
  vib.start(t); vib.stop(t + dur + 0.05);
}

export function whoosh(ac, dest, t) {
  const dur = 1.1;
  // Rushing air: noise through a band-pass that sweeps up and back down
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 3;
  bp.frequency.setValueAtTime(200, t);
  bp.frequency.exponentialRampToValueAtTime(2500, t + dur * 0.45);
  bp.frequency.exponentialRampToValueAtTime(300, t + dur);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.5, t + 0.15);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  noise.connect(bp).connect(ng).connect(dest);
  noise.start(t);

  // A wobbling sci-fi tone that bends up, then drops away
  const o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(900, t + dur * 0.5);
  o.frequency.exponentialRampToValueAtTime(120, t + dur);
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 9;
  lfoGain.gain.value = 40;
  lfo.connect(lfoGain).connect(o.frequency);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.18, t + 0.1);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(og).connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
  lfo.start(t); lfo.stop(t + dur + 0.05);
}

function noiseSource(ac, dur) {
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

export function beam(ac, dest, t, dur) {
  // Charge-up whine, then a thick buzzing roar with a fast wobble
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.35, t + 0.12);
  out.gain.setValueAtTime(0.35, t + dur - 0.3);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(dest);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  lp.connect(out);
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 30;
  lfoGain.gain.value = 25;
  lfo.connect(lfoGain);
  for (const [type, f0, f1, vol] of [['sawtooth', 300, 110, 0.5], ['square', 600, 221, 0.25], ['sine', 1800, 900, 0.2]]) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + 0.25);
    lfoGain.connect(o.frequency);
    const g = ac.createGain();
    g.gain.value = vol;
    o.connect(g).connect(lp);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const n = noiseSource(ac, dur);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1500;
  const ng = ac.createGain();
  ng.gain.value = 0.25;
  n.connect(bp).connect(ng).connect(lp);
  n.start(t);
  lfo.start(t); lfo.stop(t + dur + 0.05);
}

export function meteorFall(ac, dest, t, dur) {
  // Falling whistle plus a growing rush of air
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(1800, t);
  o.frequency.exponentialRampToValueAtTime(300, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.15, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.02);
  const n = noiseSource(ac, dur);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(400, t);
  lp.frequency.exponentialRampToValueAtTime(3000, t + dur);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.3, t + dur);
  n.connect(lp).connect(ng).connect(dest);
  n.start(t);
  // Deep rumble building up under it
  const rum = ac.createOscillator();
  rum.type = 'sawtooth';
  rum.frequency.setValueAtTime(38, t);
  rum.frequency.linearRampToValueAtTime(55, t + dur);
  const rlp = ac.createBiquadFilter();
  rlp.type = 'lowpass';
  rlp.frequency.value = 140;
  const rg = ac.createGain();
  rg.gain.setValueAtTime(0.0001, t);
  rg.gain.exponentialRampToValueAtTime(0.5, t + dur);
  rum.connect(rlp).connect(rg).connect(dest);
  rum.start(t); rum.stop(t + dur + 0.02);
}

export function boom(ac, dest, t) {
  // Sharp crack on top of the thump
  const crack = noiseSource(ac, 0.25);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  const cg = ac.createGain();
  cg.gain.setValueAtTime(0.8, t);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  crack.connect(hp).connect(cg).connect(dest);
  crack.start(t);
  // Falling debris crackle a moment later
  const deb = noiseSource(ac, 1.2);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 0.7;
  const dg = ac.createGain();
  dg.gain.setValueAtTime(0.0001, t + 0.25);
  dg.gain.exponentialRampToValueAtTime(0.25, t + 0.4);
  dg.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  deb.connect(bp).connect(dg).connect(dest);
  deb.start(t + 0.25);
  // Deep thump + crackling rumble
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + 1.25);
  const n = noiseSource(ac, 1.8);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3000, t);
  lp.frequency.exponentialRampToValueAtTime(150, t + 1.6);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.7, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  n.connect(lp).connect(ng).connect(dest);
  n.start(t);
}

export function toss(ac, dest, t) {
  // "Hup!": a short rising grunt
  const o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(440, t + 0.1);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + 0.16);
  // Swoosh of air
  const n = noiseSource(ac, 0.45);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 2;
  bp.frequency.setValueAtTime(600, t + 0.05);
  bp.frequency.exponentialRampToValueAtTime(3000, t + 0.25);
  bp.frequency.exponentialRampToValueAtTime(800, t + 0.45);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, t + 0.05);
  ng.gain.exponentialRampToValueAtTime(0.35, t + 0.2);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  n.connect(bp).connect(ng).connect(dest);
  n.start(t + 0.05);
}

export function weee(ac, dest, t, dur) {
  // A happy high "weeee!": a voice with "ee" mouth shapes (formants), its pitch
  // swooping up and then down as the head flies over its arc, with a wobble
  const len = dur + 0.25;
  const base = 520 + Math.random() * 120; // a little different every throw
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 1.9, t + len * 0.45);
  o.frequency.exponentialRampToValueAtTime(base * 1.2, t + len);
  const vib = ac.createOscillator();
  const vibGain = ac.createGain();
  vib.frequency.value = 7;
  vibGain.gain.value = 18;
  vib.connect(vibGain).connect(o.frequency);

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.4, t + 0.04);
  env.gain.setValueAtTime(0.4, t + len * 0.7);
  env.gain.exponentialRampToValueAtTime(0.0001, t + len);
  //          "ee" formants: low F1, high F2/F3
  for (const [f, q, gain] of [[320, 8, 1], [2400, 10, 0.7], [3100, 12, 0.4]]) {
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    const g = ac.createGain();
    g.gain.value = gain;
    o.connect(bp).connect(g).connect(env);
  }
  env.connect(dest);
  o.start(t); o.stop(t + len + 0.05);
  vib.start(t); vib.stop(t + len + 0.05);
}

function paw(ac, dest, t) {
  // One soft thump of a paw
  const o = ac.createOscillator();
  o.frequency.setValueAtTime(120 + Math.random() * 40, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.08);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + 0.11);
}
