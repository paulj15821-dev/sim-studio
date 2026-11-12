import { logKeys, solveTime } from "../../lib/metric";
import { intl } from "../../lib/i18n";

// Fakten (gerundet, nach Glasstone/Dolan „The Effects of Nuclear Weapons“ bzw. NUKEMAP-Größenordnungen):
//  Sprengkopf: 800 kt (typischer strategischer Sprengkopf) = 53 × Hiroshima (15 kt)
//  Detonation über dem Alexanderplatz (Luftexplosion). Feuerball: max. Radius ~700 m → „über 1 km breit“
//  Druckwelle: anfangs viel schneller als Schall, dann ~343 m/s. Modell: R(τ) = 343·τ + 1.800·(1 − e^(−τ/2,5)) m
//    → 2,3 km nach 3 s (Brandenburger Tor ~2,5 km), 5 km nach ~10 s, 12 km nach ~30 s
//  Max steht auf dem Teufelsberg: 12 km vom Alexanderplatz.
//  Pilzwolke: steigt in ~8–10 min auf knapp 20 km (Flugzeuge: ~10–12 km).
export const DETONATION = 2.6; // Videosekunde des Blitzes
export const MAX_DIST = 12_000; // m
export const GATE_DIST = 2_480; // m, Brandenburger Tor ↔ Detonationspunkt

/** Echte Zeit seit der Explosion (s) aus der Videozeit. Davor: 0. */
export const TREAL = logKeys([
  { t: DETONATION, v: 0.001 },
  { t: 4.4, v: 0.05 },
  { t: 6.2, v: 0.3 },
  { t: 8.0, v: 0.8 },
  { t: 9.6, v: 1.2 },
  { t: 11.4, v: 1.7 },
  { t: 14.0, v: 3.4 },
  { t: 16.2, v: 5 },
  { t: 19.4, v: 18 },
  { t: 21.6, v: 30 },
  { t: 23.4, v: 60 },
  { t: 26.0, v: 400 },
  { t: 28.6, v: 900 },
  { t: 31.2, v: 1_080 },
  { t: 33.2, v: 1_200 },
  { t: 36.0, v: 1_250 },
]);
export const tau = (t: number) => (t < DETONATION ? 0 : TREAL(t));

/** Radius der Druckwelle (m) nach τ echten Sekunden */
export const shockR = (tauS: number) => (tauS <= 0 ? 0 : 343 * tauS + 1800 * (1 - Math.exp(-tauS / 2.5)));
export const SHOCK = (t: number) => shockR(tau(t));

/** Feuerball-Radius (m) */
export const fireR = (tauS: number) => 700 * Math.min(1, Math.pow(Math.max(tauS, 1e-4) / 1.0, 0.4));
/** Höhe der Pilzwolke über Grund (m) */
export const cloudH = (tauS: number) => 800 + 18_000 * (1 - Math.exp(-tauS / 150));
/** Radius des Pilzhuts (m) */
export const capR = (tauS: number) => fireR(tauS) + 7_500 * (1 - Math.exp(-tauS / 220));

/** Videosekunden der Meilensteine */
export const GATE_HIT = solveTime(SHOCK, GATE_DIST, DETONATION, 30);
export const MAX_HIT = solveTime(SHOCK, MAX_DIST, DETONATION, 30);

/** Uhr vor der Explosion */
const START_CLOCK = 19 * 3600 + 42 * 60 + 50;
const two = (n: number) => String(Math.floor(n)).padStart(2, "0");
export const CLOCK = (t: number) => START_CLOCK + t;
export const fmtClock = (s: number) => `${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`;

const nf = (d: number) => intl({ minimumFractionDigits: d, maximumFractionDigits: d });
/** 0,001 s → 4,2 s → 27 s → 12:30 Min. */
export const fmtSince = (s: number) => {
  if (s < 0.1) return `${nf(3).format(s)} s`;
  if (s < 1) return `${nf(2).format(s)} s`;
  if (s < 10) return `${nf(1).format(s)} s`;
  if (s < 60) return `${Math.floor(s)} s`;
  return `${two(s / 60)}:${two(s % 60)} Min.`;
};
