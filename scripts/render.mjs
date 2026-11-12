// Finales Rendern. Nutzung:
//   npm run render -- Aufzug              → out/Aufzug.mp4 (Deutsch, Standard)
//   npm run render -- Aufzug --lang en    → nur Englisch · --lang all → beide (falls `en` vorhanden)
//   npm run render -- Aufzug --draft      → halbe Auflösung, schnell zum Prüfen
//   npm run render -- Aufzug --single     → klassisch in einem Durchgang (nur Deutsch, ohne Schichten)
//   GL=angle npm run render -- Aufzug     → auf Rechnern mit GPU (Mac/PC) deutlich schneller
//
// Ablauf (zwei Durchgänge, spart die doppelte 3D-Zeit):
//   1. <Id>-SCENE: 3D + Ton ohne Text, EINMAL (Stunden)      → public/_base/<Id>-SCENE.mp4
//   2. <Id>-TEXT / <Id>-EN-TEXT: Szene + Texte pro Sprache (Minuten) → out/<Id>.mp4 / out/<Id>-EN.mp4
//   Bei `sceneText: true` wird die Szene pro Sprache gerendert (Text in der 3D-Welt).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--") && !["de", "en", "all"].includes(a));
if (!id) { console.error("Bitte Composition-ID angeben, z. B. npm run render -- Aufzug"); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const draft = args.includes("--draft");
const single = args.includes("--single");
const langOpt = opt("lang", "de");
const gl = process.env.GL || "swangle";
const cpus = os.cpus().length;
const conc = process.env.CONCURRENCY || String(Math.max(1, Math.min(8, Math.floor(cpus / 2))));
const sfx = draft ? "_draft" : "";

if (!fs.existsSync("public/sfx/whoosh.wav")) spawnSync("node", ["scripts/make-sfx.mjs"], { stdio: "inherit" }); // Sounds fehlen? → erzeugen

function render(comp, out, extra = [], concurrency = conc) {
  const cli = ["remotion", "render", "src/index.ts", comp, out, `--gl=${gl}`, `--concurrency=${concurrency}`, "--codec=h264", "--timeout=120000", ...extra];
  if (draft) cli.push("--scale=0.5");
  console.log("\n> npx " + cli.join(" "));
  const r = spawnSync("npx", cli, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
// Ton-Sicherheitsnetz: Spitzen begrenzen (Remotion mischt ohne Limiter). Bild wird nur kopiert.
function limit(out) {
  const tmp = out.replace(/\.mp4$/, "_tmp.mp4");
  const lim = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-c:v", "copy", "-af", "alimiter=limit=0.89:attack=2:release=60:level=false", "-c:a", "aac", "-b:a", "192k", tmp], { stdio: "inherit" });
  if (lim.status === 0) fs.renameSync(tmp, out);
  else console.warn("Limiter übersprungen (ffmpeg-Fehler) – Video ist trotzdem fertig.");
}

// Welche Compositions gibt es?
const list = spawnSync("npx", ["remotion", "compositions", "src/index.ts", "-q"], { encoding: "utf8", shell: process.platform === "win32" });
const comps = new Set((list.stdout || "").split(/\s+/).filter(Boolean));

if (single || !comps.has(`${id}-SCENE`)) {
  const out = `out/${id}${sfx}.mp4`;
  render(id, out, ["--crf=18", ...(draft ? ["--crf=26"] : [])]);
  limit(out);
  console.log(`\nFertig: ${out}`);
  process.exit(0);
}

const langs = ["de", ...(comps.has(`${id}-EN-TEXT`) ? ["en"] : [])].filter((l) => langOpt === "all" || l === langOpt);
if (!langs.length) { console.error(`Sprache ${langOpt} gibt es für ${id} nicht.`); process.exit(1); }
const sceneFor = (l) => (l === "en" && comps.has(`${id}-EN-SCENE`) ? `${id}-EN-SCENE` : `${id}-SCENE`);
const scenes = [...new Set(langs.map(sceneFor))];

fs.mkdirSync("public/_base", { recursive: true });
fs.mkdirSync("out", { recursive: true });
const t0 = Date.now();
for (const sc of scenes) {
  console.log(`\n━━ 1/2 Szene ${sc} (3D, dauert am längsten) ━━`);
  const out = `out/${sc}${sfx}.mp4`;
  render(sc, out, [`--crf=${draft ? 22 : 12}`]); // hohe Qualität, wird nochmal encodiert
  fs.copyFileSync(out, `public/_base/${sc}.mp4`);
}
const results = [];
for (const l of langs) {
  console.log(`\n━━ 2/2 Texte ${l.toUpperCase()} ━━`);
  const comp = l === "en" ? `${id}-EN-TEXT` : `${id}-TEXT`;
  const out = l === "en" ? `out/${id}-EN${sfx}.mp4` : `out/${id}${sfx}.mp4`;
  render(comp, out, [`--crf=${draft ? 26 : 18}`], String(Math.max(1, Math.min(8, cpus))));
  limit(out);
  results.push(out);
}
for (const sc of scenes) fs.rmSync(`public/_base/${sc}.mp4`, { force: true }); // nicht im Bundle lassen (groß)
console.log(`\nFertig in ${((Date.now() - t0) / 60000).toFixed(1)} min:\n  ${results.join("\n  ")}`);
