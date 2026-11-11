// Finales Rendern. Nutzung:
//   npm run render -- Aufzug            → out/Aufzug.mp4 (1080x1920, 30 fps)
//   npm run render -- Aufzug --draft    → halbe Auflösung, schnell zum Prüfen
//   GL=angle npm run render -- Aufzug   → auf Rechnern mit GPU (Mac/PC) deutlich schneller
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) { console.error("Bitte Composition-ID angeben, z. B. npm run render -- Aufzug"); process.exit(1); }
const draft = args.includes("--draft");
const gl = process.env.GL || "swangle";
const conc = process.env.CONCURRENCY || String(Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2))));
const out = draft ? `out/${id}_draft.mp4` : `out/${id}.mp4`;

const cli = ["remotion", "render", "src/index.ts", id, out, `--gl=${gl}`, `--concurrency=${conc}`, "--codec=h264", "--crf=18", "--timeout=120000"];
if (draft) cli.push("--scale=0.5", "--crf=26");
console.log("> npx " + cli.join(" "));
if (!fs.existsSync("public/sfx/whoosh.wav")) spawnSync("node", ["scripts/make-sfx.mjs"], { stdio: "inherit" }); // Sounds fehlen? → erzeugen
const r = spawnSync("npx", cli, { stdio: "inherit", shell: process.platform === "win32" });
if (r.status !== 0) process.exit(r.status ?? 1);

// Ton-Sicherheitsnetz: Spitzen begrenzen (Remotion mischt ohne Limiter). Bild wird nur kopiert.
const tmp = out.replace(/\.mp4$/, "_tmp.mp4");
const lim = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", out, "-c:v", "copy", "-af", "alimiter=limit=0.89:attack=2:release=60:level=false", "-c:a", "aac", "-b:a", "192k", tmp], { stdio: "inherit" });
if (lim.status === 0) fs.renameSync(tmp, out);
else console.warn("Limiter übersprungen (ffmpeg-Fehler) – Video ist trotzdem fertig.");
console.log(`\nFertig: ${out}`);
