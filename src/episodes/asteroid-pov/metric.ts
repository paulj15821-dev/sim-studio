import { logKeys } from "../../lib/metric";
import { intl, t as tr } from "../../lib/i18n";

// Fakten wie in „Asteroid“: 10 km Fels, 20 km/s (72.000 km/h), Einschlag im Meer 1.000 km entfernt.
// Beben nach ~200 s, Gesteinsregen nach ~8,5 min, Druckwelle nach ~50 min (Schallgeschwindigkeit, >1.000 km/h).
export const SPEED = 20_000; // m/s
export const IMPACT = 18; // Episodensekunde des Einschlags

/** Restzeit bis zum Einschlag (echte Sekunden) */
export const TAU = logKeys([
  { t: 0, v: 47 * 60 },
  { t: 2.8, v: 45 * 60 },
  { t: 5.4, v: 40 * 60 },
  { t: 8, v: 30 * 60 },
  { t: 10.6, v: 12 * 60 },
  { t: 13, v: 60 },
  { t: 15.6, v: 8 },
  { t: IMPACT, v: 0 },
]);
export const DIST = (t: number) => TAU(t) * SPEED;

/** Zeit seit dem Einschlag (echte Sekunden) */
export const AFTER = logKeys([
  { t: IMPACT, v: 0 },
  { t: 20.4, v: 25 },
  { t: 23, v: 200 },
  { t: 25.8, v: 510 },
  { t: 28.6, v: 3_000 },
  { t: 31.4, v: 3_060 },
  { t: 37, v: 3_200 },
]);

const two = (n: number) => String(Math.floor(n)).padStart(2, "0");
/** 00:47:00 bzw. unter einer Minute 00:09,4 */
export const fmtClock = (s: number) => {
  const a = Math.max(0, s);
  if (a < 60) return `00:${two(a)}${tr(",", ".")}${Math.floor((a * 10) % 10)}`;
  return `${two(a / 3600)}:${two((a % 3600) / 60)}:${two(a % 60)}`;
};
export const fmtPlus = (s: number) => `+${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`;
export const fmtKm = (m: number) => `${intl().format(Math.round(m / 1000))} km`;
