import { intl, t } from "./i18n";
// Metrik-Engine: Wachstumsfunktionen, Einheiten-Leitern, deutsches Zahlenformat.

// ───────────── Wachstum ─────────────

/** Größe verdoppelt sich alle `every` Sekunden: v(t) = start · 2^(t/every) */
export const doubling = (start: number, every = 2) => (t: number) => start * Math.pow(2, t / every);
/** Größe halbiert sich alle `every` Sekunden */
export const halving = (start: number, every = 2) => (t: number) => start * Math.pow(0.5, t / every);
/** Strecke, wenn das TEMPO sich alle `every` s verdoppelt (Integral): s(t) = v0·T/ln2·(2^(t/T) − 1) */
export const distanceWithDoublingSpeed = (v0: number, every = 2) => (t: number) =>
  ((v0 * every) / Math.LN2) * (Math.pow(2, t / every) - 1);
/** Stufen: Wert springt alle `every` s (z. B. Sprung n → Höhe 2^n) */
export const stepped = (f: (t: number) => number, every = 2) => (t: number) => f(Math.floor(t / every) * every);
/** Freie Keyframes, log-interpoliert (gut für Zeitsprünge: Tage → Jahre) */
export const logKeys = (k: { t: number; v: number }[]) => (t: number) => {
  if (t <= k[0].t) return k[0].v;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (t <= b.t) {
      const p = (t - a.t) / (b.t - a.t);
      if (a.v > 0 && b.v > 0) return Math.exp(Math.log(a.v) + (Math.log(b.v) - Math.log(a.v)) * p);
      return a.v + (b.v - a.v) * p;
    }
  }
  return k[k.length - 1].v;
};
/** Ab Zeitpunkt `at` einfrieren (z. B. Ankunft) */
export const freezeAt = (f: (t: number) => number, at: number) => (t: number) => f(Math.min(t, at));

/** Wann erreicht f den Wert target? (für exakte Meilenstein-Timings) */
export function solveTime(f: (t: number) => number, target: number, t0 = 0, t1 = 120) {
  let a = t0, b = t1;
  const up = f(t1) > f(t0);
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2;
    if ((f(m) < target) === up) a = m; else b = m;
  }
  return (a + b) / 2;
}

// ───────────── Format ─────────────

const nf = (digits: number) =>
  intl({ minimumFractionDigits: digits, maximumFractionDigits: digits });

/** < 10 → 1 Nachkommastelle, sonst ganze Zahl mit Tausenderpunkten */
export function num(v: number) {
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a < 10) return nf(1).format(v);
  return nf(0).format(v);
}

type Unit = { f: number; s: string };
function ladder(v: number, units: Unit[]) {
  const a = Math.abs(v);
  if (a === 0) return `0 ${(units.find((x) => x.f === 1) ?? units[0]).s}`;
  let u = units[0];
  for (const x of units) if (a >= x.f) u = x;
  return `${num(v / u.f)} ${u.s}`;
}

/** Länge in Metern → nm … km (+ "Mio. km" ab 1e9 m) */
export const fmtLength = (m: number) =>
  ladder(m, [
    { f: 1e-12, s: "pm" },
    { f: 1e-9, s: "nm" },
    { f: 1e-6, s: "µm" },
    { f: 1e-3, s: "mm" },
    { f: 1e-2, s: "cm" },
    { f: 1, s: "m" },
    { f: 1e3, s: "km" },
    { f: 1e9, s: t("Mio. km", "M km") },
  ]);

const C = 299_792_458;
/** Tempo in m/s → km/h, ab 1 % Lichtgeschwindigkeit in % c */
export const fmtSpeed = (ms: number) => {
  if (ms >= 0.01 * C) {
    const p = (ms / C) * 100;
    const digits = p >= 99 ? 3 : p < 10 ? 2 : 1;
    return `${nf(digits).format(Math.min(p, 99.9999))} ${t("% Lichtgeschw.", "% light speed")}`;
  }
  return `${num(ms * 3.6)} km/h`;
};

/** Zeit in Sekunden → s, Min., Std., Tage, Jahre */
export function fmtDuration(s: number) {
  const Y = 365.25 * 86400;
  if (s < 60) return `${Math.floor(s)} ${Math.floor(s) === 1 ? t("Sekunde", "second") : t("Sekunden", "seconds")}`;
  if (s < 3600) { const v = Math.floor(s / 60); return `${v} ${v === 1 ? t("Minute", "minute") : t("Minuten", "minutes")}`; }
  if (s < 86400) { const v = Math.floor(s / 3600); return `${v} ${v === 1 ? t("Stunde", "hour") : t("Stunden", "hours")}`; }
  if (s < Y) { const v = Math.floor(s / 86400); return `${nf(0).format(v)} ${v === 1 ? t("Tag", "day") : t("Tage", "days")}`; }
  const v = Math.floor(s / Y);
  return `${nf(0).format(v)} ${v === 1 ? t("Jahr", "year") : t("Jahre", "years")}`;
}

/** Ganze Zahlen (Personen, Sprünge …) */
export const fmtCount = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${nf(a >= 1e10 ? 0 : 1).format(v / 1e9)} ${t("Mrd.", "B")}`;
  if (a >= 1e6) return `${nf(a >= 1e7 ? 0 : 1).format(v / 1e6)} ${t("Mio.", "M")}`;
  return nf(0).format(Math.round(v));
};

export const C_LIGHT = C;

/** Größenordnung (für die Leiste im HUD) */
export const magnitude = (v: number) => Math.log10(Math.max(Math.abs(v), 1e-30));
