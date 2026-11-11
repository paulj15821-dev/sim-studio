// Erzeugt die komplette Sound-Bibliothek prozedural (keine fremden Samples → keine Lizenz-/Copyright-Probleme).
// Nutzung: npm run make-sfx   → public/sfx/<name>.wav (48 kHz, 16 bit, stereo)
// Deterministisch (fester Seed): gleiche Dateien bei jedem Lauf.
// Neue Sounds: Funktion unten ergänzen + in src/audio/sfx.ts (SFX-Liste) eintragen.
import fs from "node:fs";
import path from "node:path";

const SR = 48000;
const OUT = path.resolve("public/sfx");
fs.mkdirSync(OUT, { recursive: true });

// ───────────── DSP-Grundbausteine ─────────────
let seed = 1234567;
const rand = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const N = (s) => Math.max(1, Math.round(s * SR));
const buf = (s) => new Float32Array(N(s));
const white = (s) => { const b = buf(s); for (let i = 0; i < b.length; i++) b[i] = rand() * 2 - 1; return b; };
const brown = (s) => { const b = white(s); let y = 0; for (let i = 0; i < b.length; i++) { y = (y + 0.02 * b[i]) / 1.02; b[i] = y * 3.5; } return b; };
const pink = (s) => { const b = white(s); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < b.length; i++) { const w = b[i]; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; b[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; } return b; };

/** Zustandsvariablen-Filter (TPT), Grenzfrequenz darf sich pro Sample ändern. type: lp | hp | bp */
function svf(x, cutoff, q = 0.7, type = "lp") {
  const y = new Float32Array(x.length);
  let ic1 = 0, ic2 = 0;
  const k = 1 / q;
  for (let i = 0; i < x.length; i++) {
    const fc = Math.min(SR * 0.45, Math.max(10, typeof cutoff === "function" ? cutoff(i / SR, i / x.length) : cutoff));
    const g = Math.tan((Math.PI * fc) / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    y[i] = type === "lp" ? v2 : type === "bp" ? v1 : x[i] - k * v1 - v2;
  }
  return y;
}
/** Oszillator mit zeitabhängiger Frequenz. shape: sine | tri | saw | square */
function osc(s, freq, shape = "sine", phase0 = 0) {
  const b = buf(s); let ph = phase0;
  for (let i = 0; i < b.length; i++) {
    const f = typeof freq === "function" ? freq(i / SR, i / b.length) : freq;
    ph += f / SR; ph -= Math.floor(ph);
    b[i] = shape === "sine" ? Math.sin(2 * Math.PI * ph) : shape === "tri" ? 1 - 4 * Math.abs(ph - 0.5) : shape === "saw" ? 2 * ph - 1 : ph < 0.5 ? 1 : -1;
  }
  return b;
}
/** FM-Glocke / E-Piano: Träger f, Modulator f*ratio, Index fällt ab */
function fm(s, f, ratio, index, decay, idxDecay = decay) {
  const b = buf(s);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const m = Math.sin(2 * Math.PI * f * ratio * t) * index * Math.exp(-t / idxDecay);
    b[i] = Math.sin(2 * Math.PI * f * t + m) * Math.exp(-t / decay);
  }
  return b;
}
const env = (x, fn) => { for (let i = 0; i < x.length; i++) x[i] *= fn(i / SR, i / x.length); return x; };
const gain = (x, g) => { for (let i = 0; i < x.length; i++) x[i] *= g; return x; };
const sat = (x, drive = 2) => { const n = Math.tanh(drive); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive) / n; return x; };
const mix = (len, ...parts) => { const b = buf(len); for (const [p, g = 1, at = 0] of parts) { const o = N(at); for (let i = 0; i < p.length && i + o < b.length; i++) b[i + o] += p[i] * g; } return b; };
const fadeIn = (s) => (t) => Math.min(1, t / s);
const fadeOut = (s, len) => (t) => Math.min(1, Math.max(0, (len - t) / s));
const bell = (peak, sharp = 2) => (_t, p) => Math.pow(Math.sin(Math.PI * Math.pow(p, Math.log(0.5) / Math.log(peak))), sharp);
const expDec = (tau) => (t) => Math.exp(-t / tau);
const adsr = (a, d, s, r, len) => (t) => (t < a ? t / a : t < a + d ? 1 - (1 - s) * ((t - a) / d) : t < len - r ? s : s * Math.max(0, (len - t) / r));

/** Stereo: Mono → [L, R] mit Panorama-Funktion (-1 links … 1 rechts) */
function pan(x, p = 0) {
  const L = new Float32Array(x.length), R = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = typeof p === "function" ? p(i / SR, i / x.length) : p;
    const a = ((v + 1) * Math.PI) / 4;
    L[i] = x[i] * Math.cos(a) * 1.414; R[i] = x[i] * Math.sin(a) * 1.414;
  }
  return [L, R];
}
/** Leicht dekorreliertes Stereo (Breite) */
function wide(x, ms = 11) {
  const d = N(ms / 1000), L = new Float32Array(x.length), R = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) { const dl = i >= d ? x[i - d] : 0; L[i] = x[i] * 0.85 + dl * 0.25; R[i] = x[i] * 0.85 - dl * 0.25; }
  return [L, R];
}
/** Freeverb-artiger Hall. size 0..1, wet 0..1, tail = zusätzliche Länge in s */
function reverb([L0, R0], size = 0.6, wet = 0.3, damp = 0.4, tail = 1.5) {
  let L = L0, R = R0;
  const len = L.length + N(tail);
  const out = [new Float32Array(len), new Float32Array(len)];
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const fb = 0.7 + size * 0.28;
  // Eingang am Ende kurz ausblenden – sonst knackt es, wenn das trockene Signal abrupt endet
  const fo = N(0.03);
  [L, R] = [L, R].map((x) => { const y = Float32Array.from(x); for (let i = 0; i < fo && i < y.length; i++) y[y.length - 1 - i] *= i / fo; return y; });
  [L, R].forEach((x, ch) => {
    const sp = ch * 23;
    const acc = new Float32Array(len);
    for (const c of combs) {
      const D = Math.round((c + sp) * (SR / 44100)); const line = new Float32Array(D); let idx = 0, lp = 0;
      for (let i = 0; i < len; i++) { const inp = i < x.length ? x[i] : 0; const o = line[idx]; lp = o * (1 - damp) + lp * damp; line[idx] = inp + lp * fb; idx = (idx + 1) % D; acc[i] += o; }
    }
    let y = acc;
    for (const a of aps) {
      const D = Math.round((a + sp) * (SR / 44100)); const line = new Float32Array(D); let idx = 0; const z = new Float32Array(len);
      for (let i = 0; i < len; i++) { const bo = line[idx]; const v = y[i]; z[i] = -v + bo; line[idx] = v + bo * 0.5; idx = (idx + 1) % D; }
      y = z;
    }
    for (let i = 0; i < len; i++) out[ch][i] = (i < x.length ? x[i] : 0) * (1 - wet * 0.5) + y[i] * wet * 0.06;
  });
  return out;
}
const st = (x) => [x, Float32Array.from(x)];
const addSt = (len, ...parts) => { const L = buf(len), R = buf(len); for (const [[l, r], g = 1, at = 0] of parts) { const o = N(at); for (let i = 0; i < l.length && i + o < L.length; i++) { L[i + o] += l[i] * g; R[i + o] += r[i] * g; } } return [L, R]; };

/** Schleife: Ende weich in den Anfang blenden → nahtlos loopbar */
function loopify([L, R], xf = 1.0) {
  const n = N(xf), len = L.length - n;
  const o = [new Float32Array(len), new Float32Array(len)];
  [L, R].forEach((x, ch) => { for (let i = 0; i < len; i++) o[ch][i] = x[i]; for (let i = 0; i < n; i++) { const a = i / n; o[ch][i] = x[i] * Math.sqrt(a) + x[len + i] * Math.sqrt(1 - a); } });
  return o;
}
/** Pegel: one-shots auf Spitze, Atmos auf RMS */
function normPeak([L, R], db = -1) { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const g = Math.pow(10, db / 20) / m; return [gain(L, g), gain(R, g)]; }
function normRms([L, R], db = -20) { let s = 0; for (let i = 0; i < L.length; i++) s += L[i] * L[i] + R[i] * R[i]; const rms = Math.sqrt(s / (2 * L.length)) + 1e-9; const g = Math.pow(10, db / 20) / rms; gain(L, g); gain(R, g); let m = 0; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); if (m > 0.95) { gain(L, 0.95 / m); gain(R, 0.95 / m); } return [L, R]; }

function writeWav(name, [L, R]) {
  const n = L.length, data = Buffer.alloc(44 + n * 4);
  data.write("RIFF", 0); data.writeUInt32LE(36 + n * 4, 4); data.write("WAVE", 8); data.write("fmt ", 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22); data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34);
  data.write("data", 36); data.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join(OUT, name + ".wav"), data);
  console.log(`  ${name}.wav  ${(n / SR).toFixed(2)} s`);
}

// ───────────── Bausteine für Klänge ─────────────
const whooshCore = (len, peak, lo, hi, q = 1.4) => {
  const n = svf(pink(len), (t, p) => lo + (hi - lo) * Math.pow(Math.sin(Math.PI * Math.min(1, p / (peak * 2))), 2), q, "bp");
  return env(gain(n, 3), bell(peak, 1.6));
};
const thump = (len, f0, f1, tau) => env(osc(len, (t) => f1 + (f0 - f1) * Math.exp(-t / (tau * 0.4)), "sine"), expDec(tau));
const click = (len, f, tau) => env(svf(white(len), f, 2, "bp"), expDec(tau));
const crackle = (len, rate, tau = 0.004) => { const b = buf(len); for (let i = 0; i < b.length; i++) if (rand() < rate / SR) { const a = rand(); for (let k = 0; k < N(tau * 6) && i + k < b.length; k++) b[i + k] += (rand() * 2 - 1) * a * Math.exp(-k / N(tau)); } return b; };
const note = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ───────────── Die Bibliothek ─────────────
const S = {};

// Übergänge
S.whoosh = () => normPeak(reverb(pan(whooshCore(0.55, 0.55, 250, 3200), (t, p) => -0.6 + 1.2 * p), 0.4, 0.25, 0.5, 0.4), -2);
S.whoosh_long = () => normPeak(reverb(pan(whooshCore(1.2, 0.6, 180, 2600, 1.2), (t, p) => 0.7 - 1.4 * p), 0.6, 0.3, 0.5, 0.8), -2);
S.whoosh_hard = () => { const len = 0.5; const w = mix(len, [whooshCore(len, 0.7, 400, 6000, 2)], [svf(white(len), 900, 0.8, "lp"), 0.0], [env(svf(white(len), 7000, 1, "hp"), bell(0.8, 3)), 0.5]); return normPeak(reverb(pan(w, (t, p) => -0.8 + 1.6 * p), 0.3, 0.2, 0.5, 0.3), -1.5); };
S.swoosh_up = () => { const len = 0.9; const w = env(svf(pink(len), (t, p) => 200 * Math.pow(40, p), 2.5, "bp"), (t, p) => Math.pow(p, 1.8) * Math.min(1, (1 - p) / 0.06)); return normPeak(reverb(wide(gain(w, 3)), 0.5, 0.3, 0.4, 0.6), -2); };
S.swoosh_down = () => { const len = 0.9; const w = env(svf(pink(len), (t, p) => 8000 * Math.pow(1 / 40, p), 2.5, "bp"), (t, p) => Math.min(1, p / 0.04) * Math.pow(1 - p, 1.4)); return normPeak(reverb(wide(gain(w, 3)), 0.5, 0.3, 0.4, 0.6), -2); };
S.riser = () => { const len = 2.6; const tone = env(osc(len, (t, p) => 180 * Math.pow(4.5, p) * (1 + 0.012 * Math.sin(t * 38)), "saw"), (t, p) => p * p); const n = env(svf(pink(len), (t, p) => 300 * Math.pow(25, p), 1.8, "bp"), (t, p) => Math.pow(p, 1.5)); const w = mix(len, [svf(tone, (t, p) => 400 + 5000 * p, 0.8, "lp"), 0.35], [n, 2.2]); env(w, fadeOut(0.03, len)); return normPeak(reverb(wide(w), 0.7, 0.35, 0.3, 1.2), -2); };
S.riser_long = () => { const len = 5; const n = env(svf(pink(len), (t, p) => 150 * Math.pow(40, p), 2, "bp"), (t, p) => Math.pow(p, 2)); const dr = env(mix(len, [osc(len, (t, p) => 55 * Math.pow(2, p * 1.5), "saw"), 0.4], [osc(len, (t, p) => 82.6 * Math.pow(2, p * 1.5), "saw"), 0.3]), (t, p) => p * p); const w = mix(len, [n, 2], [svf(dr, (t, p) => 200 + 3000 * p * p, 1, "lp"), 0.6]); env(w, fadeOut(0.04, len)); return normPeak(reverb(wide(w), 0.8, 0.35, 0.3, 1.5), -2); };
S.tension = () => { const len = 10; const dr = mix(len, [osc(len, 55, "saw"), 0.5], [osc(len, 55.4, "saw"), 0.5], [osc(len, 58.3, "saw"), 0.3], [osc(len, 82.4, "tri"), 0.3]); const w = svf(dr, (t) => 260 + 120 * Math.sin(t * 0.8), 1.2, "lp"); return normRms(loopify(reverb(wide(w, 17), 0.85, 0.4, 0.5, 0.01), 1.5), -22); };

// Einschläge
S.impact = () => { const len = 1.6; const w = mix(len, [thump(len, 140, 42, 0.35), 1.1], [env(svf(white(len), 2200, 0.7, "lp"), expDec(0.07)), 0.8], [click(len, 3500, 0.006), 0.6]); return normPeak(reverb(st(sat(w, 2.2)), 0.6, 0.35, 0.5, 1.2), -1); };
S.boom = () => { const len = 3.2; const w = mix(len, [thump(len, 95, 26, 1.1), 1.2], [env(svf(brown(len), (t) => 900 * Math.exp(-t / 0.5) + 80, 0.7, "lp"), expDec(0.9)), 1.4], [env(svf(white(len), 1800, 0.7, "lp"), expDec(0.05)), 0.7]); return normPeak(reverb(wide(sat(w, 2.6)), 0.85, 0.4, 0.6, 2.5), -1); };
S.sub_drop = () => { const len = 2.2; const w = env(osc(len, (t, p) => 70 * Math.pow(0.38, p), "sine"), (t, p) => Math.min(1, t / 0.01) * Math.pow(1 - p, 1.2)); return normPeak(st(sat(w, 1.5)), -1.5); };
S.flash = () => { const len = 1.4; const w = mix(len, [env(white(len), expDec(0.03)), 0.9], [env(svf(white(len), 6000, 0.7, "hp"), expDec(0.25)), 0.5], [thump(len, 120, 45, 0.25), 0.8]); return normPeak(reverb(wide(w), 0.7, 0.4, 0.3, 1.2), -1.5); };
S.sonic_boom = () => { const len = 4; const crack = (at) => [env(svf(white(0.25), 3000, 0.6, "lp"), expDec(0.012)), 1.6, at]; const rumble = env(svf(brown(len), (t) => 300 * Math.exp(-t / 1.2) + 60, 0.7, "lp"), (t) => Math.min(1, t / 0.05) * Math.exp(-t / 1.3)); const w = mix(len, crack(0), crack(0.11), [rumble, 1.6], [thump(len, 70, 30, 0.8), 1]); return normPeak(reverb(wide(sat(w, 3)), 0.9, 0.45, 0.5, 2), -1); };
S.thud = () => { const len = 1.2; const w = mix(len, [thump(len, 110, 38, 0.18), 1.2], [env(svf(white(len), 900, 0.7, "lp"), expDec(0.05)), 0.5], [env(svf(pink(len), 1500, 0.8, "bp"), (t) => Math.min(1, t / 0.02) * Math.exp(-t / 0.35)), 0.4]); return normPeak(reverb(st(w), 0.5, 0.25, 0.6, 0.8), -1.5); };
S.rumble = () => { const len = 4; const w = env(mix(len, [svf(brown(len), 120, 0.7, "lp"), 2], [osc(len, (t) => 32 + 4 * Math.sin(t * 3), "sine"), 0.5]), (t, p) => Math.min(1, t / 0.4) * Math.min(1, (1 - p) / 0.4) * (0.75 + 0.25 * Math.sin(t * 17))); return normPeak(wide(w), -2); };
S.glass_crack = () => { const len = 1.4; const tings = Array.from({ length: 9 }, (_, k) => [fm(1.2, 2200 + rand() * 3500, 1.41, 2, 0.15 + rand() * 0.2), 0.25, rand() * 0.25]); const w = mix(len, [env(svf(white(len), 4000, 0.6, "hp"), expDec(0.05)), 0.8], ...tings); return normPeak(reverb(wide(w), 0.6, 0.35, 0.3, 1), -2); };

// HUD / UI
S.tick = () => { const len = 0.12; const w = mix(len, [click(len, 3200, 0.004), 1], [env(osc(len, 1800), expDec(0.012)), 0.25]); return normPeak(st(w), -3); };
S.tick_low = () => { const len = 0.15; const w = mix(len, [click(len, 1400, 0.006), 1], [env(osc(len, 600), expDec(0.02)), 0.4]); return normPeak(st(w), -3); };
S.pop = () => { const len = 0.18; const w = mix(len, [env(osc(len, (t) => 380 + 600 * Math.exp(-t / 0.012)), expDec(0.035)), 1], [click(len, 2500, 0.003), 0.3]); return normPeak(reverb(st(w), 0.2, 0.15, 0.5, 0.15), -3); };
S.ding = () => { const len = 2.2; const w = mix(len, [fm(len, note(88), 3.5, 1.6, 0.7, 0.2), 0.8], [fm(len, note(95), 2, 0.6, 0.45, 0.1), 0.35], [fm(len, note(76), 1, 0.3, 0.9), 0.3]); return normPeak(reverb(wide(w), 0.6, 0.35, 0.3, 1.2), -2); };
S.chime = () => { const len = 2.6; const w = mix(len, [fm(1.6, note(76), 1, 0.9, 0.8, 0.3), 0.7, 0], [fm(2, note(72), 1, 0.9, 0.9, 0.3), 0.7, 0.42]); return normPeak(reverb(wide(w), 0.7, 0.35, 0.4, 1.5), -2); };
S.button = () => { const len = 0.25; const w = mix(len, [click(len, 2600, 0.004), 1], [thump(len, 220, 120, 0.03), 0.6], [click(len, 1800, 0.003), 0.5, 0.05]); return normPeak(st(w), -3); };
S.alarm = () => { const len = 2; const w = env(osc(len, (t) => (Math.floor(t * 4) % 2 ? 880 : 660), "square"), (t, p) => (0.5 + 0.5 * Math.sign(Math.sin(t * Math.PI * 8))) * Math.min(1, (1 - p) / 0.05)); return normPeak(reverb(st(svf(w, 2500, 0.7, "lp")), 0.5, 0.3, 0.4, 0.5), -3); };
S.glitch = () => { const len = 0.6; const b = buf(len); for (let k = 0; k < 14; k++) { const at = N(rand() * 0.5), d = N(0.01 + rand() * 0.04), f = 200 + rand() * 3000, sq = rand() < 0.5; for (let i = 0; i < d && at + i < b.length; i++) b[at + i] += (sq ? Math.sign(Math.sin((2 * Math.PI * f * i) / SR)) : rand() * 2 - 1) * 0.5; } return normPeak(wide(svf(b, 6000, 0.7, "lp"), 7), -3); };
S.camera = () => { const len = 0.4; const w = mix(len, [click(len, 3000, 0.005), 1], [env(svf(white(len), 5000, 0.8, "hp"), expDec(0.04)), 0.4, 0.08], [click(len, 2200, 0.004), 0.7, 0.12]); return normPeak(st(w), -3); };

// Objekte / Bewegung
S.door = () => { const len = 1.5; const slide = env(svf(pink(len), 700, 0.9, "bp"), (t, p) => Math.min(1, t / 0.15) * Math.min(1, Math.max(0, (1.05 - t) / 0.2))); const motor = env(osc(len, 95, "saw"), (t) => (t < 1.05 ? 0.25 : 0)); const w = mix(len, [gain(slide, 2.4), 1], [svf(motor, 300, 0.7, "lp"), 0.5], [thump(0.4, 160, 80, 0.06), 0.9, 1.05], [click(0.2, 2000, 0.004), 0.5, 1.05]); return normPeak(reverb(st(w), 0.4, 0.25, 0.5, 0.5), -2); };
S.step = () => { const len = 0.3; const w = mix(len, [thump(len, 140, 70, 0.04), 1], [env(svf(white(len), 2500, 0.8, "bp"), expDec(0.03)), 0.5]); return normPeak(reverb(st(w), 0.3, 0.2, 0.6, 0.2), -4); };
S.plane = () => { const len = 5; const p0 = 0.45; const roar = env(svf(pink(len), (t, p) => 700 + 1500 * Math.exp(-Math.pow((p - p0) * 5, 2)), 0.9, "bp"), (t, p) => 0.15 + Math.exp(-Math.pow((p - p0) * 3.2, 2))); const whine = env(osc(len, (t, p) => 2600 * (p < p0 ? 1.06 : 0.9) + 140 * Math.tanh((p0 - p) * 12)), (t, p) => 0.05 * Math.exp(-Math.pow((p - p0) * 4, 2))); const w = mix(len, [gain(roar, 2.4), 1], [whine, 1]); env(w, (t, p) => Math.min(1, t / 0.4) * Math.min(1, (1 - p) / 0.3)); return normPeak(reverb(pan(w, (t, p) => -0.9 + 1.8 * p), 0.7, 0.3, 0.5, 1), -2); };
S.car_pass = () => { const len = 2.5; const w = env(mix(len, [svf(brown(len), 300, 0.7, "lp"), 2], [svf(pink(len), 900, 1, "bp"), 0.6]), (t, p) => Math.exp(-Math.pow((p - 0.5) * 3.5, 2))); return normPeak(pan(w, (t, p) => -1 + 2 * p), -3); };
S.splash = () => { const len = 1.8; const drops = Array.from({ length: 25 }, () => [env(osc(0.06, (t) => 900 + rand() * 1500 + t * 9000), expDec(0.015)), 0.2, 0.1 + rand() * 0.9]); const w = mix(len, [env(svf(white(len), (t) => 3000 * Math.exp(-t / 0.4) + 400, 0.8, "lp"), (t) => Math.min(1, t / 0.01) * Math.exp(-t / 0.35)), 1.2], ...drops); return normPeak(reverb(wide(w), 0.5, 0.3, 0.5, 0.8), -2); };
S.fire = () => { const len = 8; const roar = env(svf(brown(len), (t) => 350 + 120 * Math.sin(t * 2.3) + 80 * Math.sin(t * 5.1), 0.9, "lp"), (t) => 0.8 + 0.2 * Math.sin(t * 3.7)); const w = mix(len, [roar, 2.2], [svf(crackle(len, 60), 3000, 0.8, "bp"), 0.6]); return normRms(loopify(wide(w), 1), -16); };
S.heartbeat = () => { const len = 1; const w = mix(len, [thump(0.3, 70, 40, 0.07), 1, 0], [thump(0.3, 65, 38, 0.08), 0.8, 0.22]); return normPeak(st(svf(w, 200, 0.7, "lp")), -2); };
S.zap = () => { const len = 0.7; const w = env(osc(len, (t) => 1800 * Math.exp(-t / 0.12) + 120, "saw"), (t, p) => Math.pow(1 - p, 2)); return normPeak(reverb(wide(svf(w, 4000, 1, "lp")), 0.5, 0.3, 0.4, 0.6), -2.5); };
S.shrink = () => { const len = 0.9; const w = env(osc(len, (t, p) => 300 * Math.pow(8, p), "tri"), (t, p) => Math.sin(Math.PI * p)); return normPeak(reverb(wide(w), 0.4, 0.3, 0.3, 0.4), -3); };
S.grow = () => { const len = 0.9; const w = env(osc(len, (t, p) => 2400 * Math.pow(1 / 8, p), "tri"), (t, p) => Math.sin(Math.PI * p)); return normPeak(reverb(wide(w), 0.4, 0.3, 0.3, 0.4), -3); };

// Atmosphären (nahtlose Schleifen, 10 s)
const AMB = 10;
S.amb_city = () => { const len = AMB + 1; const base = svf(brown(len), 180, 0.7, "lp"); const cars = Array.from({ length: 6 }, (_, k) => [env(svf(pink(2.4), 600 + rand() * 500, 1, "bp"), (t, p) => Math.exp(-Math.pow((p - 0.5) * 3, 2))), 0.35, k * 1.7 + rand()]); const horn = [env(mix(0.35, [osc(0.35, 410, "saw"), 0.5], [osc(0.35, 520, "saw"), 0.5]), (t, p) => Math.min(1, t / 0.02) * Math.min(1, (1 - p) / 0.05)), 0.02, 6.2]; const w = mix(len, [base, 2], ...cars, horn, [svf(white(len), 4000, 0.7, "hp"), 0.02]); return normRms(loopify(reverb(wide(w, 15), 0.7, 0.3, 0.5, 0.01), 1), -24); };
S.amb_wind = () => { const len = AMB + 1; const w = env(svf(pink(len), (t) => 500 + 250 * Math.sin(t * 0.9) + 120 * Math.sin(t * 2.3), 1.6, "bp"), (t) => 0.6 + 0.4 * Math.sin(t * 0.7 + 1)); const hi = env(svf(white(len), (t) => 1800 + 600 * Math.sin(t * 1.3), 3, "bp"), (t) => 0.3 + 0.3 * Math.sin(t * 1.1)); return normRms(loopify(wide(mix(len, [w, 2], [hi, 0.25]), 13), 1), -22); };
S.amb_wind_strong = () => { const len = AMB + 1; const w = env(svf(pink(len), (t) => 900 + 500 * Math.sin(t * 1.4) + 300 * Math.sin(t * 3.1), 1.2, "bp"), (t) => 0.7 + 0.3 * Math.sin(t * 1.9)); const low = svf(brown(len), 140, 0.7, "lp"); return normRms(loopify(wide(mix(len, [w, 2], [low, 1.2]), 9), 1), -18); };
S.amb_space = () => { const len = AMB + 1; const dr = mix(len, [osc(len, 55), 0.5], [osc(len, 55.3), 0.5], [osc(len, 82.5), 0.3], [osc(len, 110.4), 0.15], [env(osc(len, 659), (t) => 0.5 + 0.5 * Math.sin(t * 0.6)), 0.02], [svf(pink(len), 400, 0.7, "lp"), 0.25]); return normRms(loopify(reverb(wide(dr, 21), 0.9, 0.5, 0.4, 0.01), 1.5), -24); };
S.amb_interior = () => { const len = AMB + 1; const w = mix(len, [svf(brown(len), 220, 0.7, "lp"), 1.5], [osc(len, 50), 0.03], [osc(len, 100), 0.015], [svf(white(len), 6000, 0.7, "hp"), 0.008]); return normRms(loopify(wide(w, 9), 1), -30); };
S.amb_nature = () => { const len = AMB + 1; const birds = Array.from({ length: 14 }, () => { const f = 2500 + rand() * 2500, d = 0.08 + rand() * 0.12, up = rand() < 0.5; return [env(osc(d, (t, p) => f * (up ? 1 + 0.4 * p : 1.3 - 0.4 * p) * (1 + 0.05 * Math.sin(t * 160))), (t, p) => Math.sin(Math.PI * p)), 0.06, rand() * (AMB - 0.5)]; }); const w = mix(len, [svf(pink(len), (t) => 600 + 200 * Math.sin(t * 0.5), 1, "bp"), 0.6], ...birds); return normRms(loopify(reverb(wide(w, 13), 0.6, 0.35, 0.5, 0.01), 1), -26); };
S.amb_night = () => { const len = AMB + 1; const cr = env(osc(len, 4600), (t) => (Math.sin(t * Math.PI * 2 * 14) > 0.3 && Math.sin(t * Math.PI * 2 * 0.9) > -0.2 ? 1 : 0)); const w = mix(len, [svf(cr, 4600, 4, "bp"), 0.12], [svf(pink(len), 400, 0.8, "bp"), 0.5]); return normRms(loopify(reverb(wide(w, 17), 0.6, 0.3, 0.5, 0.01), 1), -28); };
S.amb_underwater = () => { const len = AMB + 1; const bubbles = Array.from({ length: 40 }, () => [env(osc(0.05, (t) => 500 + rand() * 900 + t * 14000), expDec(0.012)), 0.15, rand() * AMB]); const w = mix(len, [svf(brown(len), (t) => 260 + 60 * Math.sin(t * 0.7), 1, "lp"), 2], ...bubbles); return normRms(loopify(reverb(wide(w, 19), 0.8, 0.4, 0.6, 0.01), 1), -22); };
S.amb_lava = () => { const len = AMB + 1; const blub = Array.from({ length: 18 }, () => [thump(0.4, 90 + rand() * 60, 40, 0.1), 0.4, rand() * AMB]); const w = mix(len, [svf(brown(len), 160, 0.8, "lp"), 2], [svf(crackle(len, 25), 2500, 0.8, "bp"), 0.4], ...blub); return normRms(loopify(wide(w, 11), 1), -20); };
S.amb_crowd = () => { const len = AMB + 1; const voices = Array.from({ length: 30 }, () => { const f = 140 + rand() * 160, d = 0.3 + rand() * 0.6; return [svf(env(osc(d, (t) => f * (1 + 0.1 * Math.sin(t * (4 + rand() * 6))), "saw"), (t, p) => Math.sin(Math.PI * p)), 900 + rand() * 900, 3, "bp"), 0.08, rand() * AMB]; }); const w = mix(len, [svf(pink(len), 700, 0.8, "bp"), 0.5], ...voices); return normRms(loopify(reverb(wide(w, 15), 0.7, 0.4, 0.5, 0.01), 1), -26); };

// Musik-Gag: Fahrstuhlmusik (Bossa-Schleife, 8 s)
S.muzak = () => {
  const bpm = 120, beat = 60 / bpm, len = 16 * beat + 1;
  const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]];
  const bass = [36, 33, 38, 31];
  const parts = [];
  chords.forEach((c, k) => {
    const t0 = k * 4 * beat;
    for (const hit of [0, 1.5, 3]) for (const m of c) parts.push([fm(1.2, note(m), 1, 1.2, 0.5, 0.15), 0.08, t0 + hit * beat]);
    parts.push([env(osc(1.8, note(bass[k]), "tri"), expDec(0.6)), 0.35, t0]);
    parts.push([env(osc(1.8, note(bass[k] + 7), "tri"), expDec(0.5)), 0.25, t0 + 2.5 * beat]);
    [72, 76, 74, 71].forEach((m, j) => parts.push([fm(0.6, note(m + (k % 2 ? 2 : 0)), 2, 0.8, 0.3, 0.1), 0.06, t0 + j * beat + 0.5 * beat]));
  });
  for (let i = 0; i < 32; i++) parts.push([env(svf(white(0.1), 8000, 0.7, "hp"), expDec(0.02)), i % 2 ? 0.05 : 0.1, i * beat * 0.5]);
  const w = mix(len, ...parts);
  return normRms(loopify(reverb(wide(svf(w, 3500, 0.7, "lp"), 9), 0.5, 0.3, 0.5, 0.01), 1), -22);
};

// ───────────── Erzeugen ─────────────
const only = process.argv.slice(2);
console.log("Erzeuge Sounds nach public/sfx …");
for (const [name, fn] of Object.entries(S)) {
  if (only.length && !only.includes(name)) continue;
  writeWav(name, fn());
}
console.log("Fertig.");
