import { logKeys } from "../../lib/metric";
import { intl } from "../../lib/i18n";

// Format B (Zeitsprung): Zähler „Ohne Schule“ läuft ab der Eilmeldung.
// Kapitel: TAG 1 (14 Uhr aufgewacht) → WOCHE 1 → SOMMER (~6 Wochen) → MONAT 6 → JAHR 3 → JAHR 10 → Wecker (alles geträumt).
export const CLOSE = 2.8; // Episodensekunde der Eilmeldung „Alle Schulen schließen“
export const WAKE = 29.3; // Wecker klingelt – alles nur geträumt
export const DUR = 35;

/** Tage ohne Schule (Episodenzeit → Tage) */
export const DAYS = logKeys([
  { t: CLOSE, v: 0 }, // Montag, 8:00
  { t: 6.5, v: 1.25 }, // Tag 1: Dienstag, 14 Uhr aufgewacht
  { t: 9.4, v: 7 },
  { t: 12.4, v: 45 },
  { t: 15.4, v: 182 },
  { t: 19.4, v: 3 * 365 },
  { t: 23.6, v: 10 * 365 },
  { t: WAKE, v: 10.2 * 365 },
]);

/** 0 Std. → 14 Std. → 6,4 Tage → 1.095 Tage (tickt jeden Frame) */
export const fmtDays = (d: number) => {
  if (d < 1) return `${Math.floor(d * 24)} Std.`;
  if (d < 100) return `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.floor(d * 10) / 10)} Tage`;
  return `${intl().format(Math.floor(d))} Tage`;
};
