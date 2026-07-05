/* modules/sounds.js — synthesized tones, zero audio files needed. */

let ctx = null;
function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }

function beep({ freq = 440, duration = 0.1, type = 'sine', gain = 0.15 }, volume = 1) {
  const c = getCtx();
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(gain * volume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g); g.connect(c.destination);
  osc.start(); osc.stop(c.currentTime + duration);
}

export const SFX = {
  place: (v) => beep({ freq: 420, duration: 0.07, type: 'triangle', gain: 0.12 }, v),
  error: (v) => beep({ freq: 160, duration: 0.18, type: 'sawtooth', gain: 0.12 }, v),
  achievement: (v) => { [523, 659, 784].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.15, gain: 0.15 }, v), i * 90)); },
  victory: (v) => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.18, gain: 0.16 }, v), i * 110)); },
  click: (v) => beep({ freq: 600, duration: 0.05, type: 'square', gain: 0.06 }, v),
};

export function playSfx(name, enabled, volume = 1) {
  if (!enabled) return;
  try { SFX[name] && SFX[name](volume); } catch (e) { /* blocked before first gesture */ }
}

let musicNodes = null;
export function startMusic(volume = 0.5) {
  if (musicNodes) return;
  const c = getCtx();
  const o1 = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o1.type = 'sine'; o2.type = 'sine'; o1.frequency.value = 146.8; o2.frequency.value = 220;
  g.gain.value = 0; o1.connect(g); o2.connect(g); g.connect(c.destination);
  o1.start(); o2.start();
  g.gain.linearRampToValueAtTime(0.02 * volume, c.currentTime + 1.5);
  musicNodes = { o1, o2, g };
}
export function stopMusic() {
  if (!musicNodes) return;
  const c = getCtx(); const n = musicNodes; musicNodes = null;
  n.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
  setTimeout(() => { n.o1.stop(); n.o2.stop(); }, 700);
}
