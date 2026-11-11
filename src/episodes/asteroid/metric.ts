import { logKeys, solveTime } from "../../lib/metric";

// Fakten (gerundet):
//  Asteroid: 10 km Durchmesser (wie der Chicxulub-„Dino-Killer“), Gestein ~3.000 kg/m³ → 1,6 · 10^15 kg
//  Tempo: 20 km/s = 72.000 km/h  →  Energie ½mv² ≈ 3,1 · 10^23 J ≈ 75 Mio. Megatonnen ≈ 5 Mrd. Hiroshima (63 TJ)
//  Abstand = Höhe über der Erdoberfläche (senkrechter Anflug), Restzeit = Abstand / 20 km/s
//  Max wohnt 1.000 km vom Einschlag:  Beben nach ~200 s, Gesteinsregen nach ~8,5 min, Druckwelle nach ~50 min (Schall)
export const SPEED = 20_000; // m/s
export const IMPACT = 35; // Videosekunde des Einschlags

/** Restzeit bis zum Einschlag in echten Sekunden (Video-Zeit → Echtzeit, log-interpoliert) */
export const TAU = logKeys([
  { t: 0, v: 19_800 }, // 5:30 h, 396.000 km – kurz vor dem Mond
  { t: 3, v: 17_000 },
  { t: 7, v: 12_600 },
  { t: 11, v: 7_200 },
  { t: 15, v: 3_600 }, // 1 h
  { t: 18, v: 1_800 }, // 36.000 km – Satelliten
  { t: 21, v: 900 }, // 15 min – Pizza
  { t: 24, v: 300 }, // 5 min
  { t: 26.5, v: 60 }, // 1 min
  { t: 28.5, v: 20.4 }, // 408 km – ISS
  { t: 30, v: 5 }, // 100 km – Atmosphäre
  { t: IMPACT, v: 0 }, // letzte 5 s in Echtzeit (linear)
]);

/** Abstand zur Oberfläche in m */
export const DIST = (t: number) => TAU(t) * SPEED;

/** Zeit nach dem Einschlag in echten Sekunden */
export const AFTER = logKeys([
  { t: IMPACT, v: 0 },
  { t: 38, v: 20 },
  { t: 41, v: 90 },
  { t: 44.4, v: 200 }, // Beben kommt an (3:20)
  { t: 47.4, v: 510 }, // Gesteinsregen (8:30)
  { t: 49.4, v: 1_800 }, // Pizza wäre jetzt fällig gewesen
  { t: 50.6, v: 3_030 }, // Druckwelle (50:30)
  { t: 56.6, v: 3_600 },
  { t: 63, v: 3_800 },
]);

/** Videosekunde, zu der die Restzeit x Sekunden beträgt */
export const at = (tau: number) => solveTime(TAU, tau, 0, IMPACT);

const two = (n: number) => String(Math.floor(n)).padStart(2, "0");
/** 05:30:00 bzw. unter einer Minute 00:09,4 */
export const fmtClock = (s: number) => {
  const a = Math.max(0, s);
  if (a < 60) return `00:${two(a)},${Math.floor((a * 10) % 10)}`;
  return `${two(a / 3600)}:${two((a % 3600) / 60)}:${two(a % 60)}`;
};
export const fmtPlusClock = (s: number) => `+${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`;
