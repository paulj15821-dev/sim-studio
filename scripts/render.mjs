// Finales Rendern. Nutzung:
//   npm run render -- Aufzug            → out/Aufzug.mp4 (1080x1920, 30 fps)
//   npm run render -- Aufzug --draft    → halbe Auflösung, schnell zum Prüfen
//   GL=angle npm run render -- Aufzug   → auf Rechnern mit GPU (Mac/PC) deutlich schneller
import { spawnSync } from "node:child_process";
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
const r = spawnSync("npx", cli, { stdio: "inherit", shell: process.platform === "win32" });
if (r.status === 0) console.log(`\nFertig: ${out}`);
process.exit(r.status ?? 1);
