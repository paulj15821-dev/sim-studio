import type { Episode } from "../types";

/** Länge des Cold Opens in s (0 = keiner) */
export const coldOpenDur = (ep: Episode) => (ep.coldOpen ? ep.coldOpen.dur ?? 1.0 : 0);
/** Gesamtlänge des fertigen Videos in s (Cold Open + Episode) */
export const totalDuration = (ep: Episode) => ep.duration + coldOpenDur(ep);
