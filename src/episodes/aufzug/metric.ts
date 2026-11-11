import { distanceWithDoublingSpeed, freezeAt, solveTime } from "../../lib/metric";

// Tempo startet bei 0,5 m/s und verdoppelt sich alle 2 s.
export const V0 = 0.5;
export const EVERY = 2;
const raw = distanceWithDoublingSpeed(V0, EVERY);

/** Abstand Erdoberfläche → Mondoberfläche (m) */
export const MOON_SURFACE = (384_400 - 6_371 - 1_737) * 1000;
/** Ankunftszeit am Mond (≈ 55,9 s) */
export const ARRIVE = solveTime(raw, MOON_SURFACE, 0, 80);

/** Höhe in Metern zum Zeitpunkt t */
export const H = freezeAt(raw, ARRIVE);
/** Tempo in m/s */
export const V = (t: number) => (t < ARRIVE ? V0 * Math.pow(2, t / EVERY) : 0);
