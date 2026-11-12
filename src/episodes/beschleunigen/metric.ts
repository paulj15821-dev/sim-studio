// „Was wäre, wenn du nie aufhörst zu beschleunigen?“ – Zahlen.
// Regel: Max' „gefühltes“ Tempo (Rapidität × c) verdoppelt sich jede Sekunde, Start 3 m/s (Joggen).
// Relativistisch korrekt: echtes Tempo v = c·tanh(w/c) → nähert sich c, erreicht es aber nie.
// Die Videozeit ist Max' Eigenzeit; auf der Erde vergeht dt·cosh(w/c) → Zeitdilatation explodiert.
import { C_LIGHT, solveTime } from "../../lib/metric";

export const W0 = 3; // m/s
export const EVERY = 1; // s
const C = C_LIGHT;
const Y = 365.25 * 86400;

/** Rapidität φ(t) */
const phi = (t: number) => (W0 * Math.pow(2, t / EVERY)) / C;
/** Tempo in m/s */
export const V = (t: number) => C * Math.tanh(phi(Math.max(0, t)));
/** 1 − v/c (numerisch stabil) */
export const oneMinusBeta = (t: number) => 2 / (Math.exp(2 * phi(Math.max(0, t))) + 1);

// Tabelle für Strecke (Erd-System) und Erdzeit – einmal numerisch integriert.
const DT = 1 / 600;
const N = Math.ceil(33 / DT);
const XS = new Float64Array(N + 1); // log-Werte wären schöner, aber bis 33 s bleibt alles < 1e308
const TE = new Float64Array(N + 1);
for (let i = 0; i < N; i++) {
  const p = phi((i + 0.5) * DT);
  XS[i + 1] = XS[i] + C * Math.sinh(p) * DT;
  TE[i + 1] = TE[i] + Math.cosh(p) * DT;
}
const lookup = (arr: Float64Array, t: number) => {
  const x = Math.min(N, Math.max(0, t / DT));
  const i = Math.floor(x), f = x - i;
  if (i >= N) return arr[N];
  const a = arr[i], b = arr[i + 1];
  // geometrisch interpolieren, wenn es explodiert
  return a > 0 && b > a * 1.5 ? a * Math.pow(b / a, f) : a + (b - a) * f;
};

/** Zeit, zu der Max umkehrt (Erdzeit = 5 Mrd. Jahre) */
export const EARTH_END = 5e9 * Y;
const rawTE = (t: number) => lookup(TE, t);
export const TURN = solveTime(rawTE, EARTH_END, 30, 33);

/** Zurückgelegte Strecke (m, Erd-System) */
export const X = (t: number) => lookup(XS, Math.min(t, TURN));
/** Vergangene Zeit auf der Erde (s) */
export const EARTH_TIME = (t: number) => rawTE(Math.min(t, TURN));

// Meilensteine (Sekunden)
export const T_SOUND = solveTime(V, 343, 0, 20);
export const T_ORBIT = solveTime(V, 7_900, 0, 20);
export const T_ESCAPE = solveTime(V, 11_200, 0, 20);
export const T_1PCT = solveTime(V, 0.01 * C, 0, 30);
export const T_MOON = solveTime((t) => lookup(XS, t), 384_400_000, 20, 30);

/** Tempo-Anzeige: km/h, ab 1 % in % c – mit immer mehr Neunen */
const nf = (d: number) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtV = (v: number) => {
  if (v < 0.01 * C) return `${nf(0).format(v * 3.6)} km/h`;
  const omb = 1 - v / C;
  if (omb > 0.01) return `${nf(v / C >= 0.1 ? 1 : 2).format((v / C) * 100)} %`;
  // Je näher an c, desto mehr Nachkommastellen (abgerundet → nie „100 %“), max. 9
  const d = Math.min(9, Math.max(1, Math.ceil(-Math.log10(Math.max(omb, 1e-15))) + 1));
  const val = Math.floor((1 - omb) * 100 * 10 ** d) / 10 ** d;
  return `${nf(d).format(Math.min(val, 100 - 10 ** -d))} %`;
};

/** Erdzeit hübsch: Sekunden … Mrd. Jahre */
export const fmtEarth = (s: number) => {
  if (s < Y) {
    const u = (n: number, one: string, many: string) => `${nf(0).format(Math.floor(n))} ${Math.floor(n) === 1 ? one : many}`;
    if (s < 60) return u(s, "Sekunde", "Sekunden");
    if (s < 3600) return u(s / 60, "Minute", "Minuten");
    if (s < 86400) return u(s / 3600, "Stunde", "Stunden");
    return u(s / 86400, "Tag", "Tage");
  }
  const y = s / Y;
  if (y >= 1e9) return `${nf(1).format(y / 1e9)} Mrd. Jahre`;
  if (y >= 1e6) return `${nf(y >= 1e8 ? 0 : 1).format(y / 1e6)} Mio. Jahre`;
  return `${nf(0).format(y)} ${Math.floor(y) === 1 ? "Jahr" : "Jahre"}`;
};
export const fmtSec = (s: number) => `${nf(1).format(s)} s`;
