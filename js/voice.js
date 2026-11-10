// Voice control: listens to the microphone with the browser's speech recognition
// and calls onKeyword('beam' | 'meteor') when someone shouts a keyword.
//
// - Works in Chrome and Edge (desktop and Android). Firefox has no speech recognition;
//   Safari's support varies. The keyboard fallbacks (B / K) work everywhere.
// - Off by default. V turns it on (the browser asks for microphone permission).
// - Chrome sends the audio to its speech service to turn it into text, so it needs
//   an internet connection and a secure page (https, which GitHub Pages is).

import { VOICE } from './config.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let rec = null;
let enabled = false;
let listening = false;
let status = SR ? 'off' : 'unsupported'; // 'off' | 'on' | 'denied' | 'unsupported' | 'error'
let lastHeard = '';
let lastHeardAt = 0;
let handler = () => {};
const lastFired = {}; // keyword -> time, so one shout doesn't fire twice

export function onKeyword(fn) {
  handler = fn;
}

export function voiceStatus() {
  return { status, lastHeard, lastHeardAt, supported: !!SR };
}

export function toggleVoice() {
  if (!SR) { status = 'unsupported'; return; }
  enabled = !enabled;
  if (enabled) start();
  else stop();
}

function start() {
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
          const text = res[a].transcript.toLowerCase();
          if (a === 0) { lastHeard = text.trim(); lastHeardAt = performance.now(); }
          for (const [keyword, words] of Object.entries(VOICE.keywords)) {
            if (words.some((w) => text.includes(w))) fire(keyword);
          }
        }
      }
    };
    rec.onstart = () => { listening = true; status = 'on'; };
    rec.onend = () => {
      listening = false;
      // The browser stops listening after a while or after silence: keep it going
      if (enabled) setTimeout(() => { if (enabled && !listening) safeStart(); }, 250);
      else status = 'off';
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        enabled = false;
        status = 'denied';
      } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
        status = 'error';
      }
    };
  }
  safeStart();
}

function safeStart() {
  try { rec.start(); } catch { /* already started */ }
}

function stop() {
  status = 'off';
  if (rec) try { rec.stop(); } catch { /* ignore */ }
}

function fire(keyword) {
  const now = performance.now();
  if (now - (lastFired[keyword] ?? -Infinity) < 1500) return;
  lastFired[keyword] = now;
  handler(keyword);
}
