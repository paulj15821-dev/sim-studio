import { logKeys, solveTime } from "../../lib/metric";

// Fakten (gerundet):
//  Weltbevölkerung 2026 ~8,3 Mrd., Männeranteil ~50,2 % → ~4,17 Mrd. Männer (UN World Population Prospects)
//  Geburten weltweit ~132 Mio./Jahr, davon ~51,2 % Jungen → ~67,6 Mio./Jahr ≈ 2,14 Jungen pro Sekunde
//  Schwangerschaften laufen weiter: in den 9 Monaten danach kommen ~50 Mio. Jungen zur Welt
//  Pilotinnen: ~6 % aller Verkehrspiloten weltweit → ~88 % der Cockpits (2 Piloten) ganz leer
//  Gefängnisse: Frauen ~7 % aller Inhaftierten weltweit (World Female Imprisonment List) → 93 % leer
//  Bundestag (21. Wahlperiode): 630 Sitze, 204 Frauen → 426 Sitze leer
//  Samen in flüssigem Stickstoff (−196 °C): jahrzehntelang haltbar
//  Ohne Nachwuchs: jüngste Frauen (Jahrgang 2026/27) sterben spätestens um ~2135

export const Y = 365.25 * 86400;
export const DAY = 86400;
export const MONTH = Y / 12;

export const VANISH = 2.0; // Videosekunde: Plopp
export const HYPO = 12.4; // Gedankenspiel „ohne Nachwuchs“ beginnt
export const HYPO_END = 18.0; // zurück in die Gegenwart (Samenbank)
export const TWIST = 22.6; // „Moment… warum steigt die Zahl?“
export const END = 32.0;

export const MEN = 4_170_000_000;
export const BOYS_PER_S = 2.14;

/** Zeit ohne Männer in echten Sekunden (log-interpoliert) – Hauptstrang */
export const GONE = logKeys([
  { t: VANISH, v: 1 },
  { t: 4.6, v: 4 * 60 }, // Flugzeuge
  { t: 7.0, v: 20 * 60 },
  { t: 9.6, v: 9 * 3600 }, // Gefängnis
  { t: 12.4, v: 3 * DAY }, // Bundestag
  // Gedankenspiel dazwischen (eigene Zeitachse)
  { t: HYPO_END, v: 3.5 * DAY },
  { t: TWIST, v: 3 * 7 * DAY }, // Samenbank
  { t: 28.2, v: 9 * MONTH }, // Babys
  { t: END, v: 9.3 * MONTH },
]);

/** Jungen, die seit dem Plopp geboren wurden */
export const BOYS = (t: number) => (t < VANISH ? 0 : Math.floor(GONE(t) * BOYS_PER_S));

/** Männer auf der Erde vor dem Plopp (tickt mit dem Bevölkerungswachstum) */
export const MEN_NOW = (t: number) => MEN + Math.floor(t * 1.1 * 10);

/** Gedankenspiel: Kalenderjahr, wenn keine Jungen mehr nachkämen */
export const YEAR = logKeys([
  { t: HYPO, v: 2026 },
  { t: 13.6, v: 2045 },
  { t: 15.2, v: 2100 },
  { t: 16.6, v: 2135 },
  { t: HYPO_END, v: 2136 },
]);

export const atGone = (s: number) => solveTime(GONE, s, VANISH, END);

const nf = (d: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const one = (v: number) => (v < 10 ? nf(1).format(Math.floor(v * 10) / 10) : nf(0).format(Math.floor(v)));

/** 8,3 Sek. → 14 Min. → 3,2 Std. → 6,4 Tage → 4,1 Monate */
export const fmtGone = (s: number) => {
  if (s < 60) return `${one(s)} Sek.`;
  if (s < 3600) return `${one(s / 60)} Min.`;
  if (s < DAY) return `${one(s / 3600)} Std.`;
  if (s < 7 * DAY) return `${one(s / DAY)} ${s < 2 * DAY ? "Tag" : "Tage"}`;
  if (s < 2 * MONTH) return `${one(s / (7 * DAY))} ${s < 14 * DAY ? "Woche" : "Wochen"}`;
  return `${one(s / MONTH)} Monate`;
};

export const fmtCount = (v: number) => nf(0).format(Math.round(v));
export const fmtYear = (v: number) => String(Math.floor(v));
