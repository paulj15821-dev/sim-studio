import { logKeys, solveTime } from "../../lib/metric";

// Fakten (gerundet):
//  Herz ~70 Schläge/min → ~100.000 pro Tag, 10 Jahre ≈ 368 Mio., 30 Jahre ≈ 1,1 Mrd.
//  Atmung ~14/min → ~20.000 Atemzüge pro Tag
//  Ein Koma dauert meist nur Tage bis wenige Wochen (danach Aufwachen oder Wachkoma)
//  Kopfhaar wächst gut 1 cm pro Monat
//  Bettruhe: Muskelkraft sinkt anfangs um ~1–1,5 % pro Tag
//  Rekord (bekannter Fall): Munira Abdulla erwachte 2018 nach 27 Jahren
//  Max ist 25, Mama 51 → nach 30 Jahren: 55 und 81

export const Y = 365.25 * 86400;
export const DAY = 86400;
export const CRASH = 4.4; // Videosekunde des Unfalls
export const WAKE = 51.0; // Augen auf

/** Zeit im Koma in echten Sekunden (log-interpoliert). */
export const COMA = logKeys([
  { t: CRASH, v: 1 },
  { t: 6.0, v: 120 }, // Notarzt
  { t: 7.5, v: 3_600 }, // Intensivstation
  { t: 9.0, v: DAY },
  { t: 12.0, v: 7 * DAY },
  { t: 14.6, v: 30 * DAY }, // Akku leer
  { t: 17.2, v: 120 * DAY },
  { t: 22.4, v: 1 * Y },
  { t: 28.6, v: 3 * Y },
  { t: 30.4, v: 5 * Y },
  { t: 36.2, v: 10 * Y },
  { t: 40.6, v: 15 * Y },
  { t: 46.8, v: 27 * Y }, // Rekord
  { t: 50.2, v: 30 * Y },
  { t: WAKE, v: 30 * Y + 3 * DAY },
]);

/** Jahre im Koma */
export const years = (t: number) => (t < CRASH ? 0 : COMA(t) / Y);

/** Herzschläge seit dem Unfall (70/min) */
export const BEATS = (t: number) => (t < CRASH ? 0 : (COMA(t) * 70) / 60);

/** Zu spät zum Kino (Sekunden) – läuft vor dem Unfall in Echtzeit */
export const LATE = (t: number) => 252 + t;

/** Wach seit (echte Sekunden) */
export const AWAKE = (t: number) => Math.max(0, t - WAKE);

/** Videosekunde, zu der x Jahre erreicht sind */
export const atYears = (y: number) => solveTime(COMA, y * Y, CRASH, WAKE);

const nf = (d: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const one = (v: number) => (v < 10 ? nf(1).format(Math.floor(v * 10) / 10) : nf(0).format(Math.floor(v)));

/** Koma-Dauer: 8,3 Sekunden → 14 Minuten → 3,2 Stunden → 6,4 Tage → 4,1 Monate → 27 Jahre */
export const fmtComa = (s: number) => {
  if (s < 60) return `${one(s)} Sek.`;
  if (s < 3600) return `${one(s / 60)} Min.`;
  if (s < DAY) return `${one(s / 3600)} Std.`;
  if (s < 60 * DAY) return `${one(s / DAY)} Tage`;
  if (s < Y) return `${one(s / (Y / 12))} Monate`;
  const y = s / Y;
  return `${one(y)} ${y < 2 ? "Jahr" : "Jahre"}`;
};

const two = (n: number) => String(Math.floor(n)).padStart(2, "0");
/** 04:16,3 */
export const fmtLate = (s: number) => `${two(s / 60)}:${two(s % 60)},${Math.floor((s * 10) % 10)}`;
export const fmtAwake = (s: number) => `${one(s)} Sek.`;

/** Jahreszahl im Video (Unfall 2026) */
export const yearOf = (t: number) => 2026 + Math.floor(years(t) + 0.87); // Unfall im November
