import { doubling, solveTime } from "../../lib/metric";

// Max ist 1,80 m groß und wird alle 2,5 s doppelt so groß – gleichmäßig, ohne Pause.
export const H0 = 1.8;
export const EVERY = 2.5;
/** Größe in Metern zum Zeitpunkt t */
export const H = doubling(H0, EVERY);
/** Höhe des Max-Modells (Füße → Mützenspitze) in Modell-Einheiten */
export const MODEL_H = 2.02;
/** Skalierung des Max-Modells */
export const K = (t: number) => H(t) / MODEL_H;

/** Fußlänge ≈ 15 % der Körpergröße → EU-Schuhgröße (Pariser Stich: 1,5 × (Fuß cm + 1,5)) */
export const SHOE = (t: number) => 1.5 * (H(t) * 0.15 * 100 + 1.5);

export const CEILING = 2.5; // Zimmerdecke
export const ROOF = 2.7; // Flachdach außen
export const TV_TOWER = 368; // Fernsehturm
export const PLANE_ALT = 12_300; // Reiseflughöhe

export const T_CEILING = solveTime(H, CEILING, 0, 60); // ≈ 1,18 s
export const T_ROOF = solveTime(H, ROOF, 0, 60); // ≈ 1,46 s
export const T_TV = solveTime(H, TV_TOWER, 0, 60); // ≈ 19,2 s
export const T_BONK = solveTime(H, PLANE_ALT, 0, 60); // ≈ 31,85 s

/** Standardatmosphäre: Temperatur in Kopfhöhe (°C) */
export const TEMP = (t: number) => 15 - 6.5 * Math.min(11, H(t) / 1000);
