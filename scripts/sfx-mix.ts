// Schnelle Ton-Vorschau ohne Video-Render (gleiche Regeln wie im Video: src/audio/sfx.ts).
// Nutzung:
//   npm run sfx -- Aufzug          → out/Aufzug_ton.wav + out/Aufzug_ton.png (Wellenform) + Cue-Liste
//   npm run sfx -- Aufzug --mux    → zusätzlich out/Aufzug_mit_ton.mp4 aus vorhandenem out/Aufzug.mp4 (kein Neu-Rendern)
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { EPISODES } from "../src/episodes";
import { buildVoices, voiceGain } from "../src/audio/sfx";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
const ep = EPISODES.find((e) => e.id === id);
if (!ep) { console.error(`Episode nicht gefunden: ${id}. Verfügbar: ${EPISODES.map((e) => e.id).join(", ")}`); process.exit(1); }

const SR = 48000;
const cache = new Map<string, [Float32Array, Float32Array]>();
function load(name: string): [Float32Array, Float32Array] {
  if (cache.has(name)) return cache.get(name)!;
  const file = path.resolve("public/sfx", name + ".wav");
  if (!fs.existsSync(file)) { console.error(`Fehlt: ${file} → npm run make-sfx`); process.exit(1); }
  const b = fs.readFileSync(file);
  const n = b.readUInt32LE(40) / 4;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = b.readInt16LE(44 + i * 4) / 32768; R[i] = b.readInt16LE(46 + i * 4) / 32768; }
  cache.set(name, [L, R]);
  return [L, R];
}

const total = Math.round(ep.duration * SR);
const L = new Float32Array(total), R = new Float32Array(total);
const voices = buildVoices(ep, 30);
for (const v of voices) {
  const [sl, sr] = load(v.sound);
  const srcLen = sl.length / v.rate / SR; // Sekunden
  const len = v.dur ?? srcLen;
  const o = Math.round(v.from * SR);
  const n = Math.min(Math.round(len * SR), total - o);
  for (let i = 0; i < n; i++) {
    let pos = i * v.rate;
    if (v.loop) pos %= sl.length; else if (pos >= sl.length - 1) break;
    const k = Math.floor(pos), f = pos - k, k2 = (k + 1) % sl.length;
    const g = v.dur != null ? voiceGain(v, i / SR, v.dur) : v.volume;
    L[o + i] += (sl[k] * (1 - f) + sl[k2] * f) * g;
    R[o + i] += (sr[k] * (1 - f) + sr[k2] * f) * g;
  }
}
// weicher Limiter (nur Spitzen über -1 dBFS)
let peak = 0;
const hot: number[] = [];
const lim = (x: number, i = 0) => { const a = Math.abs(x); peak = Math.max(peak, a); if (a > 0.89) hot.push(Math.round(i / SR * 10) / 10); const t = 0.89; return a <= t ? x : Math.sign(x) * (t + (1 - t) * Math.tanh((a - t) / (1 - t))); };
for (let i = 0; i < total; i++) { L[i] = lim(L[i], i); R[i] = lim(R[i], i); }

fs.mkdirSync("out", { recursive: true });
const wav = path.resolve(`out/${ep.id}_ton.wav`);
const buf = Buffer.alloc(44 + total * 4);
buf.write("RIFF", 0); buf.writeUInt32LE(36 + total * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write("data", 36); buf.writeUInt32LE(total * 4, 40);
for (let i = 0; i < total; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
fs.writeFileSync(wav, buf);

// Cue-Liste
const byTag = new Map<string, number>();
voices.forEach((v) => byTag.set(v.tag, (byTag.get(v.tag) ?? 0) + 1));
console.log(`\n${ep.id}: ${voices.length} Sounds  (${[...byTag].map(([k, n]) => `${k} ${n}`).join(" · ")})`);
for (const v of [...voices].sort((a, b) => a.from - b.from)) if (v.tag !== "untertitel" && v.tag !== "tick")
  console.log(`  ${v.from.toFixed(2).padStart(6)} s  ${v.sound.padEnd(16)} vol ${v.volume.toFixed(2)}${v.dur ? `  ${v.dur.toFixed(1)} s` : ""}  [${v.tag}]`);
console.log(`\nSpitze vor Limiter: ${(20 * Math.log10(peak || 1e-9)).toFixed(1)} dBFS  (Ziel ≤ -1; das Video-Render hat KEINEN Limiter)`);
if (hot.length) console.log(`Zu laut bei: ${[...new Set(hot)].join(", ")} s → dort Lautstärken senken`);

// Wellenform-Bild mit Sekundenraster
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wav, "-filter_complex", `showwavespic=s=2400x300:split_channels=0:colors=#6FF2D0,drawgrid=w=${2400 / ep.duration * 5}:h=300:color=white@0.25`, "-frames:v", "1", `out/${ep.id}_ton.png`]);
const eb = spawnSync("ffmpeg", ["-nostats", "-i", wav, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const lufs = /I:\s+(-?[0-9.]+) LUFS/.exec(eb.slice(eb.lastIndexOf("Summary")))?.[1];
console.log(`Lautheit (integriert): ${lufs} LUFS  (Ziel nur SFX: ca. -20 … -16, Musik kommt dazu)`);
console.log(`Ton: ${wav}\nWellenform: out/${ep.id}_ton.png (Raster = 5 s)`);

if (args.includes("--mux")) {
  const vid = path.resolve(`out/${ep.id}.mp4`);
  if (!fs.existsSync(vid)) console.error(`Kein Video unter ${vid} – erst rendern.`);
  else {
    const outVid = path.resolve(`out/${ep.id}_mit_ton.mp4`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", vid, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", outVid]);
    console.log(`Video mit Ton: ${outVid}`);
  }
}
