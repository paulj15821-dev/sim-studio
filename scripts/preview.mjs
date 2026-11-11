// Vorschau-Standbilder + Kontaktbogen, damit Claude Code das Video "sehen" und prüfen kann.
// Nutzung:
//   npm run preview -- Aufzug                 → alle 2 s ein Bild + out/preview/Aufzug/sheet.jpg
//   npm run preview -- Aufzug --every 1       → jede Sekunde
//   npm run preview -- Aufzug --at 12.5,30,58 → nur diese Sekunden (volle Größe ansehen!)
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) { console.error("Bitte Composition-ID angeben, z. B. npm run preview -- Aufzug"); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const every = parseFloat(opt("every", "2"));
const scale = parseFloat(opt("scale", "0.5"));
const at = opt("at", null);
const gl = process.env.GL || "swangle";

const outDir = path.resolve("out/preview", id);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

console.log("Bundle wird gebaut …");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { chromiumOptions: { gl } });
const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions: { gl }, timeoutInMilliseconds: 120000 });
const fps = composition.fps;
const dur = composition.durationInFrames / fps;

const times = at ? at.split(",").map(Number) : Array.from({ length: Math.floor(dur / every) + 1 }, (_, i) => Math.min(dur - 1 / fps, i * every + 0.4));
let n = 0;
for (const t of times) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * fps));
  const file = path.join(outDir, `f_${String(n).padStart(3, "0")}.jpg`);
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, output: file, frame, scale, imageFormat: "jpeg", jpegQuality: 85, puppeteerInstance: browser, chromiumOptions: { gl }, timeoutInMilliseconds: 120000 });
  console.log(`  ${path.basename(file)}  t=${t.toFixed(1)}s  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  n++;
}
await browser.close({ silent: true });

if (!at && n > 1) {
  const cols = 6, rows = Math.ceil(n / cols);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "1", "-i", path.join(outDir, "f_%03d.jpg"), "-vf", `scale=240:-1,tile=${cols}x${rows}:padding=4`, "-frames:v", "1", path.join(outDir, "sheet.jpg")]);
  console.log(`\nKontaktbogen: ${path.join(outDir, "sheet.jpg")}  (Reihenfolge: links→rechts, alle ${every}s)`);
}
