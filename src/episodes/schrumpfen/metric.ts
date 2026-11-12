// „POV: Du wirst jede Sekunde halb so groß“ – Regel: Größe ÷2 pro Sekunde, Start 1,80 m.
// Meilensteine (berechnet mit t = log2(1,8 / Größe)):
//   Max' Schuh 28 cm → 2,7 s · Ameise 5 mm → 8,5 s · Milbe 0,3 mm → 12,6 s · Haar 70 µm → 14,7 s
//   Bakterie 2 µm → 19,8 s · Virus 100 nm → 24,1 s · Wassermolekül 0,28 nm → 32,6 s
export const START = 1.8; // m
export const COSMOS = 32.6; // Sturz „unter die Atome“
export const HOME = 35.2; // wieder in einer Küche (normal groß)
export const RESHRINK = 36.4; // …und es geht von vorn los (Loop)

/** Deine Größe in Metern */
export const SIZE = (t: number) => {
  if (t >= HOME) return START * Math.pow(0.5, Math.max(0, t - RESHRINK));
  return START * Math.pow(0.5, Math.max(0, Math.min(t, COSMOS + 0.6)));
};
/** Szeneneinheiten pro Referenzlänge `ref` (m): Du bist in Szeneneinheiten immer 1,8 groß. */
export const unit = (t: number, ref: number) => (1.8 * ref) / SIZE(t);
/** Wie oft schon halbiert */
export const HALVINGS = (t: number) => Math.floor(Math.max(0, Math.min(t, COSMOS)));
