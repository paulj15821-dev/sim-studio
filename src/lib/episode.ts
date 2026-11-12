import type { Episode, HudSpec } from "../types";
import type { Lang } from "./i18n";

/** Länge des Cold Opens in s (0 = keiner) */
export const coldOpenDur = (ep: Episode) => (ep.coldOpen ? ep.coldOpen.dur ?? 1.0 : 0);
/** Gesamtlänge des fertigen Videos in s (Cold Open + Episode) */
export const totalDuration = (ep: Episode) => ep.duration + coldOpenDur(ep);

/** Episode in der gewünschten Sprache (Texte aus `ep.en` eingesetzt). Prüft, dass Anzahlen passen. */
export function localize(ep: Episode, lang: Lang): Episode {
  if (lang === "de" || !ep.en) return ep;
  const en = ep.en;
  // Anzahl muss passen – sonst Warnung und deutscher Text als Ersatz (bricht nicht die anderen Videos)
  if (en.captions.length !== ep.captions.length)
    console.warn(`[${ep.id}] en.captions hat ${en.captions.length} Einträge, deutsch ${ep.captions.length}`);
  const huds = !ep.hud ? undefined : Array.isArray(ep.hud) ? ep.hud : [ep.hud];
  const enHud = huds?.map((h, i): HudSpec => {
    const x = en.hud?.[i];
    if (!x) return h;
    if (x.compare && h.compare && x.compare.length !== h.compare.length)
      console.warn(`[${ep.id}] en.hud[${i}].compare hat ${x.compare.length} Einträge, deutsch ${h.compare.length}`);
    return {
      ...h,
      label: x.label ?? h.label,
      compare: h.compare?.map((c, k) => ({ ...c, text: x.compare?.[k] ?? c.text })),
      pill: h.pill && x.pill ? { ...h.pill, text: (sec: string) => x.pill!.replace("{s}", sec) } : h.pill,
      secondary: h.secondary && x.secondary ? { ...h.secondary, label: x.secondary } : h.secondary,
    };
  });
  return {
    ...ep,
    id: `${ep.id}-EN`,
    title: en.title,
    hook: { ...ep.hook, text: en.hook.text, highlight: en.hook.highlight },
    captions: ep.captions.map((c, i) => {
      const e = en.captions[i];
      if (e == null) return c;
      return typeof e === "string" ? { ...c, text: e, highlight: undefined } : { ...c, text: e.text, highlight: e.highlight };
    }),
    hud: enHud ? (Array.isArray(ep.hud) ? enHud : enHud[0]) : undefined,
    upload: en.upload ?? ep.upload,
  };
}
