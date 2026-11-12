import { logKeys, solveTime } from "../../lib/metric";
import { intl } from "../../lib/i18n";

// Fakten (gerundet, Quellen: UN-Weltbevölkerung, A. Weisman „Die Welt ohne uns“, gängige Schätzungen):
//  Weltbevölkerung ~8,2 Mrd., Netto-Zuwachs ~70 Mio./Jahr ≈ 2,2 pro Sekunde
//  Kraftwerke ohne Personal/Brennstoff: Stromnetze fallen nach Stunden bis ~2 Tagen aus
//  U-Bahn-Tunnel (z. B. New York) laufen ohne Pumpen in ~1,5–2 Tagen voll
//  Pflanzen sprengen Asphalt innerhalb weniger Jahre; nach Jahrzehnten wachsen Wälder in den Städten
//  Plastikflasche: ~450 Jahre bis zum Zerfall
//  Stahlbrücken ohne Wartung: Einsturz nach ~100–300 Jahren
//  Hochhäuser: nach Jahrhunderten bis ~1.000 Jahren eingestürzt
//  Nach 10.000 Jahren: fast nur noch Steinbauten (Pyramiden, Teile der Chinesischen Mauer)

export const Y = 365.25 * 86400;
export const DAY = 86400;
export const VANISH = 2.2; // Videosekunde: alle weg
export const BACK = 30.6; // alle zurück
export const PEOPLE = 8_231_000_000;

/** Zeit ohne Menschen in echten Sekunden (log-interpoliert). */
export const GONE = logKeys([
  { t: VANISH, v: 1 },
  { t: 4.9, v: 300 }, // Autos rollen aus
  { t: 7.2, v: 3 * 3600 }, // Flugzeuge noch in der Luft
  { t: 8.6, v: DAY }, // Licht geht aus
  { t: 12.0, v: 2 * DAY }, // U-Bahn läuft voll
  { t: 14.2, v: 40 * DAY },
  { t: 15.0, v: 1 * Y }, // Gras im Asphalt
  { t: 16.9, v: 4 * Y },
  { t: 17.6, v: 20 * Y }, // Stadt wird Wald
  { t: 19.4, v: 35 * Y },
  { t: 21.8, v: 120 * Y },
  { t: 23.0, v: 300 * Y }, // Brücke stürzt ein
  { t: 24.8, v: 1000 * Y }, // Türme fallen
  { t: 27.4, v: 2500 * Y },
  { t: 28.6, v: 10_000 * Y }, // Pyramiden
  { t: BACK, v: 10_200 * Y },
]);

/** Jahre ohne Menschen */
export const years = (t: number) => (t < VANISH ? 0 : GONE(t) / Y);

/** Menschen auf der Erde (Zuwachs ~2,2/s bis zum Verschwinden) */
export const POP = (t: number) => (t < VANISH ? PEOPLE + Math.floor(t * 2.2 * 10) : 0);

/** Videosekunde, zu der x Jahre erreicht sind */
export const atYears = (y: number) => solveTime(GONE, y * Y, VANISH, BACK);

const nf = (d: number) => intl({ minimumFractionDigits: d, maximumFractionDigits: d });
const one = (v: number) => (v < 10 ? nf(1).format(Math.floor(v * 10) / 10) : nf(0).format(Math.floor(v)));

/** 8,3 Sek. → 14 Min. → 3,2 Std. → 6,4 Tage → 4,1 Monate → 1.000 Jahre */
export const fmtGone = (s: number) => {
  if (s < 60) return `${one(s)} Sek.`;
  if (s < 3600) return `${one(s / 60)} Min.`;
  if (s < DAY) return `${one(s / 3600)} Std.`;
  if (s < 60 * DAY) return `${one(s / DAY)} ${s < 2 * DAY ? "Tag" : "Tage"}`;
  if (s < Y) return `${one(s / (Y / 12))} Monate`;
  const y = s / Y;
  return `${one(y)} ${y < 2 ? "Jahr" : "Jahre"}`;
};

/** 8.231.000.000 (volle Zahl, tickt) */
export const fmtPeople = (v: number) => nf(0).format(Math.round(v));
