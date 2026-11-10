// Background music: an original jazz-funk groove (in the spirit of late-60s
// funk-jazz instrumentals), synthesised live with the Web Audio API.
// Drums, a syncopated bass line, clav-style chord stabs and horn hits over an
// 8-bar dominant-7th progression in Bb, at ~104 BPM. N toggles the music.
//
// It uses a small look-ahead scheduler: every 25 ms it queues the notes for the
// next ~0.15 s with exact audio-clock times, so the groove stays tight.

import { getAudio, isMuted } from './audio.js';

const BPM = 104;
const STEP = 60 / BPM / 4;   // one 16th note in seconds
const LOOKAHEAD = 0.15;
const MUSIC_VOLUME = 0.32;   // relative to the master volume

// Bar roots as MIDI notes (Bb1 = 34). 8 bars, then it loops.
const ROOTS = [34, 34, 39, 39, 34, 34, 41, 39];

// 16-step patterns. Bass: [step, semitones above the root, length in steps]
const BASS = [[0, 12, 1], [2, 12, 1], [3, 0, 2], [6, 10, 1], [7, 12, 1], [10, 7, 1], [11, 10, 1], [12, 12, 2], [14, 15, 1], [15, 12, 1]];
const KICK = [0, 6, 10];
const SNARE = [4, 12];
const GHOST = [7, 9, 15];
const CLAV = [2, 5, 9, 11, 14];          // short off-beat chord stabs
const HORN_BARS = [3, 7];                // horn hits at the end of each 4-bar phrase
const HORN = [[8, 1], [10, 1], [12, 3]]; // [step, length]

let on = true;
try { on = localStorage.getItem('tethered-music') !== '0'; } catch { /* ignore */ }

let bus = null;
let noiseBuf = null;
let nextTime = 0;
let step = 0;
let timer = null;

export function isMusicOn() {
  return on;
}

export function toggleMusic() {
  on = !on;
  try { localStorage.setItem('tethered-music', on ? '1' : '0'); } catch { /* ignore */ }
  if (bus) bus.gain.setTargetAtTime(on ? MUSIC_VOLUME : 0, bus.context.currentTime, 0.05);
}

/** Start the scheduler (safe to call often; it waits until audio is unlocked). */
export function startMusic() {
  if (timer) return;
  timer = setInterval(tick, 25);
}

function tick() {
  const a = getAudio();
  if (!a) return;
  const { ctx, master } = a;
  if (!bus) {
    bus = ctx.createGain();
    bus.gain.value = on ? MUSIC_VOLUME : 0;
    bus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    nextTime = ctx.currentTime + 0.1;
  }
  // If the tab was in the background, don't try to catch up on missed notes
  if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    if (on && !isMuted()) playStep(ctx, step, nextTime);
    nextTime += STEP * (step % 2 ? 0.92 : 1.08); // a touch of swing
    step = (step + 1) % (16 * ROOTS.length);
  }
}

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function playStep(ctx, s, t) {
  const bar = Math.floor(s / 16);
  const i = s % 16;
  const root = ROOTS[bar];

  // Drums
  if (KICK.includes(i)) kick(ctx, t);
  if (SNARE.includes(i)) snare(ctx, t, 0.5);
  if (GHOST.includes(i)) snare(ctx, t, 0.12);
  hat(ctx, t, i === 14 ? 0.18 : i % 2 ? 0.05 : 0.1, i === 14);

  // Bass
  for (const [st, semi, len] of BASS) {
    if (st === i) bass(ctx, t, mtof(root + semi), STEP * len * 0.9);
  }

  // Clav stabs: 3rd, 7th and 9th of the chord, an octave or two up
  if (CLAV.includes(i)) {
    for (const semi of [16, 22, 26]) clav(ctx, t, mtof(root + semi));
  }

  // Horn hits
  if (HORN_BARS.includes(bar)) {
    for (const [st, len] of HORN) {
      if (st === i) for (const semi of [28, 31, 34]) horn(ctx, t, mtof(root + semi), STEP * len);
    }
  }
}

// ---------- Instruments ----------

function kick(ctx, t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + 0.26);
}

function noise(ctx, t, dur, type, freq, vol) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.01);
}

function snare(ctx, t, vol) {
  noise(ctx, t, 0.16, 'bandpass', 1800, vol);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  g.gain.setValueAtTime(vol * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + 0.11);
}

function hat(ctx, t, vol, open) {
  noise(ctx, t, open ? 0.22 : 0.04, 'highpass', 8000, vol);
}

function bass(ctx, t, freq, dur) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 8;
  f.frequency.setValueAtTime(1400, t);
  f.frequency.exponentialRampToValueAtTime(260, t + dur); // funky "pluck"
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
  g.gain.setValueAtTime(0.5, t + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

function clav(ctx, t, freq) {
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = freq;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq * 2.5;
  f.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  o.connect(f).connect(g).connect(bus);
  o.start(t); o.stop(t + 0.12);
}

function horn(ctx, t, freq, dur) {
  // Brassy: sawtooth with a filter that opens on the attack ("blat")
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(freq * 0.97, t);
  o.frequency.linearRampToValueAtTime(freq, t + 0.04); // slight scoop up
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(600, t);
  f.frequency.linearRampToValueAtTime(3200, t + 0.05);
  f.frequency.linearRampToValueAtTime(1500, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
  g.gain.setValueAtTime(0.09, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}

/** Render a few bars offline (for previews/tests). Returns the AudioBuffer. */
export async function renderPreview(seconds = 12) {
  const OAC = window.OfflineAudioContext;
  const ctx = new OAC(1, Math.ceil(44100 * seconds), 44100);
  const prevBus = bus;
  const prevNoise = noiseBuf;
  bus = ctx.createGain();
  bus.gain.value = MUSIC_VOLUME * 1.6;
  bus.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  let t = 0.05;
  let s = 0;
  while (t < seconds - 0.3) {
    playStep(ctx, s, t);
    t += STEP * (s % 2 ? 0.92 : 1.08);
    s = (s + 1) % (16 * ROOTS.length);
  }
  const buf = await ctx.startRendering();
  bus = prevBus;
  noiseBuf = prevNoise;
  return buf;
}
