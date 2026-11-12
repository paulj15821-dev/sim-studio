// Sound-Design: Bibliothek + Regeln. Wird vom Video (SoundLayer) UND vom Mix-Skript (npm run sfx) benutzt,
// damit die schnelle Ton-Vorschau exakt dem finalen Render entspricht.
import type { Episode } from "../types";
import { coldOpenDur } from "../lib/episode";

/** Alle Sounds in public/sfx (erzeugt von scripts/make-sfx.mjs). */
export const SFX = [
  // Übergänge
  "whoosh", "whoosh_long", "whoosh_hard", "swoosh_up", "swoosh_down", "riser", "riser_long",
  // Einschläge
  "impact", "boom", "sub_drop", "flash", "sonic_boom", "thud", "rumble", "glass_crack",
  // HUD / UI
  "tick", "tick_low", "pop", "ding", "chime", "button", "alarm", "glitch", "camera",
  // Objekte / Bewegung
  "door", "step", "plane", "car_pass", "splash", "heartbeat", "zap", "shrink", "grow",
  "buzz", "horn", "screech", "siren", "beep", "typing", "msg_send", "msg_in",
  // Schleifen (loop: true)
  "fire", "tension", "muzak",
  "amb_city", "amb_wind", "amb_wind_strong", "amb_space", "amb_interior", "amb_nature", "amb_night", "amb_underwater", "amb_lava", "amb_crowd", "amb_hospital",
] as const;
export type SfxName = (typeof SFX)[number];
export type Ambience = Extract<SfxName, `amb_${string}`> | "tension" | "fire" | "muzak";

/** Gezielter Sound zu einem Zeitpunkt (Sekunden). */
export type SfxCue = {
  at: number;
  sound: SfxName;
  /** 0..1 (Standard 0.7) */
  volume?: number;
  /** Tonhöhe/Tempo: 0.5 = tiefer & langsamer, 1.5 = höher */
  rate?: number;
  /** Nur für Schleifen (fire, tension, muzak, amb_*): Länge in s */
  dur?: number;
  fadeIn?: number;
  fadeOut?: number;
};

/** Ein fertig aufgelöster Klang im Mix. */
export type Voice = { sound: SfxName; from: number; dur?: number; volume: number; rate: number; loop: boolean; fadeIn: number; fadeOut: number; tag: string };

const LOOPS = new Set<SfxName>(["fire", "tension", "muzak", ...SFX.filter((s) => s.startsWith("amb_"))]);
export const isLoop = (s: SfxName) => LOOPS.has(s);

/** Deterministische Variation (kein Math.random!) */
const vary = (k: number, a: number, b: number) => a + (b - a) * ((Math.sin(k * 12.9898 + 4.1) * 43758.5453) % 1 + 1) % 1;

/**
 * Baut die komplette Tonspur einer Episode:
 *  1. Atmosphäre pro Shot (`shot.ambience`, sonst `episode.sound.ambience`), gleiche Atmos laufen durch
 *  2. Übergänge: Schnitt → leiser Whoosh, whip → harter Whoosh, dip → langer Whoosh + Sub, flash → Blitz + Einschlag
 *  3. HUD: Tick bei jeder Verdopplung (wird höher), Gong bei jedem neuen Vergleich/Meilenstein
 *  4. Untertitel: leiser Pop · Hook: Whoosh zum Start
 *  5. Gezielte Cues aus `episode.sfx`
 * Lautstärken sind so gewählt, dass darunter noch Platz für Musik ist.
 */
function episodeVoices(ep: Episode, fps: number): Voice[] {
  const cfg = { cuts: true, captions: true, ticks: true, milestones: true, volume: 1, ...ep.sound };
  const v: Voice[] = [];
  const add = (x: Omit<Voice, "rate" | "loop" | "fadeIn" | "fadeOut"> & Partial<Voice>) =>
    v.push({ rate: 1, loop: isLoop(x.sound), fadeIn: 0, fadeOut: 0, ...x, volume: x.volume * cfg.volume });
  const shots = [...ep.shots].sort((a, b) => a.at - b.at);

  // 1. Atmosphären (zusammenhängende Shots mit gleicher Atmo = ein Segment, 0,35 s Überblendung)
  type Seg = { amb: Ambience; from: number; to: number; vol: number };
  const segs: Seg[] = [];
  shots.forEach((s, k) => {
    const amb = s.ambience === undefined ? cfg.ambience : s.ambience;
    const to = shots[k + 1]?.at ?? ep.duration;
    if (!amb || amb === "none") return;
    const vol = s.ambienceVolume ?? 0.55;
    const last = segs[segs.length - 1];
    if (last && last.amb === amb && Math.abs(last.to - s.at) < 1e-6 && last.vol === vol) last.to = to;
    else segs.push({ amb, from: s.at, to, vol });
  });
  for (const g of segs) {
    const x = 0.35;
    add({ sound: g.amb, from: Math.max(0, g.from - x / 2), dur: g.to - g.from + x, volume: g.vol, fadeIn: g.from === 0 ? 0 : x, fadeOut: g.to >= ep.duration ? 0.2 : x, tag: "atmo" });
  }

  // 2. Übergänge
  shots.forEach((s, k) => {
    if (k === 0) return;
    const tr = s.transition ?? "cut";
    if (tr === "flash") { add({ sound: "flash", from: s.at, volume: 0.4, tag: "flash" }); add({ sound: "impact", from: s.at, volume: 0.35, tag: "flash" }); }
    else if (tr === "dip") { add({ sound: "whoosh_long", from: s.at - 0.55, volume: 0.45, tag: "dip" }); add({ sound: "sub_drop", from: s.at, volume: 0.35, tag: "dip" }); }
    else if (tr === "whip") add({ sound: "whoosh_hard", from: s.at - 0.25, volume: 0.6, rate: vary(k, 0.9, 1.15), tag: "whip" });
    else if (cfg.cuts && !s.silentCut) add({ sound: "whoosh", from: s.at - 0.3, volume: 0.22, rate: vary(k, 0.85, 1.2), tag: "cut" });
  });

  // 3. HUD (ein oder mehrere HUDs; compareDir "down" = Schwellen werden unterschritten)
  const huds = !ep.hud ? [] : Array.isArray(ep.hud) ? ep.hud : [ep.hud];
  for (const hud of huds) {
    const from = hud.from ?? 0, until = Math.min(hud.until ?? ep.duration, ep.duration);
    if (hud.pill && cfg.ticks) {
      const start = Math.max(hud.pill.startAt ?? 0, from), stop = Math.min(hud.pill.stopAt ?? until, until);
      const base = hud.pill.startAt ?? 0;
      for (let k = 1, t = base + hud.pill.every; t < stop - 0.05; k++, t = base + k * hud.pill.every)
        if (t > start) add({ sound: "tick", from: t, volume: 0.2, rate: Math.min(1.6, 1 + k * 0.02), tag: "tick" });
    }
    if (hud.compare && cfg.milestones) {
      const down = hud.compareDir === "down";
      const sorted = [...hud.compare].sort((a, b) => (down ? b.at - a.at : a.at - b.at));
      let last = -1;
      for (let f = Math.ceil(from * fps); f <= until * fps; f++) {
        const val = Math.abs(hud.value(f / fps));
        let idx = -1;
        sorted.forEach((c, i) => { if (down ? val <= c.at : val >= c.at) idx = i; });
        if (idx > last) { if (last >= 0 || f / fps > from + 0.2) add({ sound: "ding", from: f / fps, volume: 0.32, rate: vary(idx, 0.94, 1.06), tag: "meilenstein" }); last = idx; }
      }
    }
  }

  // 4. Untertitel + Hook
  if (cfg.captions) for (const c of ep.captions) add({ sound: "pop", from: c.at, volume: 0.12, rate: vary(c.at, 0.9, 1.15), tag: "untertitel" });
  add({ sound: "whoosh", from: 0, volume: 0.35, rate: 0.9, tag: "hook" });

  // 5. Gezielte Cues
  for (const c of ep.sfx ?? [])
    add({ sound: c.sound, from: c.at, volume: c.volume ?? 0.7, rate: c.rate ?? 1, dur: c.dur, fadeIn: c.fadeIn ?? 0, fadeOut: c.fadeOut ?? (c.dur ? 0.3 : 0), tag: "cue" });

  return v.filter((x) => x.from < ep.duration).map((x) => (x.from < 0 ? { ...x, dur: x.dur != null ? x.dur + x.from : undefined, from: 0 } : x));
}

/** Lautstärke einer Stimme t Sekunden nach ihrem Start (Fades) – identisch in Video und Mix-Skript. */
export function voiceGain(x: Voice, t: number, len: number) {
  let g = x.volume;
  if (x.fadeIn > 0) g *= Math.min(1, t / x.fadeIn);
  if (x.fadeOut > 0) g *= Math.min(1, Math.max(0, (len - t) / x.fadeOut));
  return g;
}

/**
 * Komplette Tonspur des fertigen Videos (absolute Zeiten). Mit Cold Open:
 *  - Bild 0: Schlag; die Atmo und Cues des Höhepunkts laufen mit (auf die Cold-Open-Länge gekürzt)
 *  - am Ende des Cold Opens: Rückspul-Sound, danach die normale Episode um `dur` verschoben
 */
export function buildVoices(ep: Episode, fps = 30): Voice[] {
  const main = episodeVoices(ep, fps);
  const co = coldOpenDur(ep);
  if (!co || !ep.coldOpen) return main;
  const at = ep.coldOpen.at, endCo = at + co;
  const cold: Voice[] = [];
  for (const x of main) {
    if (x.tag === "untertitel" || x.tag === "tick" || x.tag === "hook" || x.tag === "meilenstein") continue;
    const xEnd = x.dur != null ? x.from + x.dur : Infinity;
    if (x.loop && x.from <= at && xEnd > at) cold.push({ ...x, from: 0, dur: Math.min(xEnd, endCo) - at + 0.1, fadeIn: 0, fadeOut: 0.12 });
    else if (!x.loop && x.from >= at - 0.05 && x.from < endCo - 0.1) cold.push({ ...x, from: Math.max(0, x.from - at), dur: endCo - Math.max(x.from, at) + 0.12, fadeIn: 0, fadeOut: 0.12, tag: "cold" });
  }
  cold.push({ sound: "impact", from: 0, volume: 0.45, rate: 1, loop: false, fadeIn: 0, fadeOut: 0, tag: "cold" });
  cold.push({ sound: "boom", from: 0, volume: 0.35, rate: 1.1, loop: false, fadeIn: 0, fadeOut: 0.15, dur: co + 0.15, tag: "cold" });
  cold.push({ sound: "swoosh_down", from: Math.max(0, co - 0.45), volume: 0.5, rate: 1.5, loop: false, fadeIn: 0, fadeOut: 0, tag: "rückspulen" });
  cold.push({ sound: "glitch", from: Math.max(0, co - 0.2), volume: 0.4, rate: 1.2, loop: false, fadeIn: 0, fadeOut: 0, tag: "rückspulen" });
  return [...cold, ...main.map((x) => ({ ...x, from: x.from + co }))];
}
