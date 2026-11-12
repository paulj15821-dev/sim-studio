// Sprache des gerade gerenderten Videos. Wird von SimVideo pro Render aus der Composition-ID gesetzt
// („Aufzug“ = de, „Aufzug-EN“ = en). Ein Browser-Tab rendert immer nur eine Composition → global ist sicher.
export type Lang = "de" | "en";
export const LANGS: Lang[] = ["de", "en"];

let current: Lang = "de";
export const setLang = (l: Lang) => { current = l; };
export const getLang = () => current;
/** Sprache aus der Composition-ID ableiten */
export const langOfId = (id: string): Lang => (/-EN(-|$)/.test(id) ? "en" : "de");

/** Text je nach Sprache – für Texte IN der 3D-Welt (Displays, Schilder, Handy-UI) und in Formatierern */
export const t = (de: string, en: string) => (current === "en" ? en : de);

const cache = new Map<string, Intl.NumberFormat>();
/** Zahlenformat der aktuellen Sprache (de: 1.873,5 · en: 1,873.5) */
export function intl(opts: Intl.NumberFormatOptions = {}) {
  const key = current + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) { f = new Intl.NumberFormat(current === "en" ? "en-US" : "de-DE", opts); cache.set(key, f); }
  return f;
}
