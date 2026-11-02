// 音效：全部用 Web Audio 即時合成，不需要音檔，離線也能用。可由右上角按鈕關閉（記在 localStorage）。
let ctx = null, on = true;
try { on = localStorage.getItem("kmgbf-sound") !== "0"; } catch {}
export const soundOn = () => on;
export function setSound(v) { on = v; try { localStorage.setItem("kmgbf-sound", v ? "1" : "0"); } catch {} if (v) unlock(); }

// 瀏覽器要求在使用者操作中啟動音訊；第一次點擊時建立 AudioContext
export function unlock() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(c, t, freq, dur, { type = "sine", vol = 0.12, to = null } = {}) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(c, t, dur, { vol = 0.15, freq = 2000, q = 1 } = {}) {
  const n = Math.ceil(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination); s.start(t);
}
const notes = (c, t, fs, step, opt) => fs.forEach((f, k) => tone(c, t + k * step, f, step * 1.6, opt));

const SFX = {
  dice: (c, t) => { for (let k = 0; k < 5; k++) noise(c, t + k * 0.06 + Math.random() * 0.02, 0.05, { vol: 0.25, freq: 2500 + Math.random() * 1500, q: 2 }); },
  step: (c, t) => tone(c, t, 700, 0.05, { type: "triangle", vol: 0.04 }),
  coin: (c, t) => { tone(c, t, 988, 0.08, { type: "square", vol: 0.05 }); tone(c, t + 0.08, 1319, 0.25, { type: "square", vol: 0.05 }); },
  good: (c, t) => notes(c, t, [660, 880], 0.08, { type: "triangle", vol: 0.08 }),
  bad: (c, t) => notes(c, t, [392, 311], 0.14, { type: "sawtooth", vol: 0.05 }),
  achieve: (c, t) => notes(c, t, [523, 659, 784, 1047], 0.09, { type: "triangle", vol: 0.1 }),
  crisis: (c, t) => { tone(c, t, 220, 0.5, { type: "sawtooth", vol: 0.06, to: 110 }); tone(c, t + 0.5, 220, 0.5, { type: "sawtooth", vol: 0.06, to: 110 }); },
  gavel: (c, t) => { for (const k of [0, 0.22]) { noise(c, t + k, 0.12, { vol: 0.5, freq: 400, q: 0.8 }); tone(c, t + k, 140, 0.15, { vol: 0.15 }); } },
  jail: (c, t) => { tone(c, t, 330, 0.12, { type: "square", vol: 0.04 }); tone(c, t + 0.15, 247, 0.3, { type: "square", vol: 0.04 }); },
  year: (c, t) => notes(c, t, [784, 988], 0.12, { vol: 0.08 }),
  win: (c, t) => { notes(c, t, [523, 659, 784], 0.12, { type: "triangle", vol: 0.1 }); tone(c, t + 0.4, 1047, 0.8, { type: "triangle", vol: 0.1 }); },
  lose: (c, t) => notes(c, t, [440, 415, 392, 330], 0.22, { type: "triangle", vol: 0.08 }),
};

// 一次播多個時錯開一點，避免糊成一團
export function play(...names) {
  if (!on || !names.length) return;
  const c = unlock(); if (!c || c.state !== "running") return;
  names.forEach((n, k) => { try { SFX[n]?.(c, c.currentTime + 0.02 + k * 0.15); } catch {} });
}
