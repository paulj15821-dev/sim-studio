// „Was wäre, wenn du nie aufhörst zu wachsen?“
// Format A (Exponential): Max (1,80 m) wird alle 2,5 s doppelt so groß – durchgehend, ohne Pause.
// Zimmer → Dach → Straße → Hochhaus → Fernsehturm → Wolken → Flughöhe.
// Pointe (Callback an die Zimmerdecke): Sein Kopf stößt von unten gegen ein Flugzeug. „Schon wieder Kopf gestoßen.“
import React from "react";
import type { Episode } from "../../types";
import { ease, lerp, lerp3, type Vec3 } from "../../lib/anim";
import { fmtCount, fmtLength } from "../../lib/metric";
import { World, planeState, type CamFn } from "./world";
import { Car } from "../../three/kit";
import { H, SHOE, EVERY, T_CEILING, T_ROOF, T_TV, T_BONK } from "./metric";

/** Kamerafahrt in Metern (feste Welt: Max wächst durchs Bild) */
const fixed = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p }) => {
  const e = ease.sine(p);
  return { pos: lerp3(a, b, e), look: lerp3(la, lb ?? la, e), fov };
};
/** Kamerafahrt in Vielfachen von Max' Größe (Max bleibt gleich groß im Bild, die Welt schrumpft) */
const rel = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p, h }) => {
  const e = ease.sine(p);
  const s = (v: Vec3): Vec3 => [v[0] * h, v[1] * h, v[2] * h];
  return { pos: s(lerp3(a, b, e)), look: s(lerp3(la, lb ?? la, e)), fov };
};

const BONK_END = 35.2;

export const wachsen: Episode = {
  id: "Wachsen",
  title: "Was wäre, wenn du nie aufhörst zu wachsen?",
  duration: BONK_END,
  coldOpen: { at: 31.45, dur: 1.0 },
  hook: { text: "Was wäre, wenn du nie aufhörst zu wachsen?", highlight: ["nie", "aufhörst"], until: 2.4 },

  hud: {
    label: "Größe",
    value: H,
    format: fmtLength,
    compare: [
      { at: 0, text: "Ganz normaler Typ" },
      { at: 2.5, text: "Zu groß fürs Zimmer" },
      { at: 7, text: "Größer als ein Haus" },
      { at: 30, text: "Größer als ein Blauwal" },
      { at: 93, text: "Größer als die Freiheitsstatue" },
      { at: 330, text: "Höher als der Eiffelturm" },
      { at: 828, text: "Größer als jedes Gebäude" },
      { at: 2000, text: "Kopf in den Wolken" },
      { at: 8849, text: "Höher als der Everest" },
      { at: 11_000, text: "Auf Reiseflughöhe" },
    ],
    pill: { every: EVERY, text: (s) => `×2 Größe in ${s} s` },
    secondary: { label: "Schuhgröße", value: SHOE, format: fmtCount },
    scaleBar: { from: 1, to: 31_000 },
  },

  captions: [
    { at: 2.4, text: "Max hört einfach nicht auf zu wachsen." },
    { at: 4.2, text: "Die Nachbarn sind… beunruhigt." },
    { at: 6.0, text: "Alle 2,5 Sekunden: doppelt so groß.", highlight: ["doppelt", "so", "groß."] },
    { at: 8.0, text: "Die Bäume? Nur noch Gestrüpp." },
    { at: 11.0, text: "Guten Morgen, 10. Stock.", highlight: ["10."] },
    { at: 12.4, text: "Die Hochhäuser: bis zur Hüfte." },
    { at: 14.6, text: "Die Vögel sind verwirrt." },
    { at: 17.0, text: "Da vorne: der Fernsehturm…" },
    { at: T_TV, text: "…überholt.", highlight: ["…überholt."] },
    { at: 20.3, text: "Schuhgröße: über 10.000.", highlight: ["10.000."] },
    { at: 22.1, text: "Größer als jedes Gebäude der Welt." },
    { at: 25.3, text: "Kopf in den Wolken. Wörtlich.", highlight: ["Wörtlich."] },
    { at: 27.1, text: "Gut, dass er eine Mütze hat." },
    { at: 28.9, text: "Da oben: minus 20 Grad.", highlight: ["minus", "20", "Grad."] },
    { at: 30.7, text: "Höher als der Mount Everest.", highlight: ["Everest."] },
    { at: T_BONK + 0.1, text: "BONK.", highlight: ["BONK."] },
    { at: 33.2, text: "Schon wieder Kopf gestoßen.", italic: true },
  ],

  // ── Englische Fassung (gleiche Animation; Composition „<Id>-EN“) ──
  en: {
    title: "What if you never stopped growing?",
    hook: { text: "What if you never stopped growing?", highlight: ["never", "stopped"] },
    hud: [
      { label: "Height", compare: ["Totally normal guy", "Too big for the room", "Bigger than a house", "Bigger than a blue whale", "Bigger than the Statue of Liberty", "Taller than the Eiffel Tower", "Bigger than any building", "Head in the clouds", "Taller than Everest", "At cruising altitude"], pill: "×2 size in {s} s", secondary: "Shoe size (EU)" },
    ],
    captions: [
      "Max just won't stop growing.",
      "The neighbors are… concerned.",
      { text: "Every 2.5 seconds: twice as big.", highlight: ["twice", "as", "big."] },
      "The trees? Just shrubs now.",
      { text: "Good morning, 10th floor.", highlight: ["10th"] },
      "The skyscrapers: hip-high.",
      "The birds are confused.",
      "Up ahead: the TV tower…",
      { text: "…passed.", highlight: ["…passed."] },
      { text: "Shoe size: over 10,000.", highlight: ["10,000."] },
      "Bigger than any building on Earth.",
      { text: "Head in the clouds. Literally.", highlight: ["Literally."] },
      "Good thing he wears a beanie.",
      { text: "Up there: minus 20 degrees.", highlight: ["minus", "20", "degrees."] },
      { text: "Taller than Mount Everest.", highlight: ["Everest."] },
      { text: "BONK.", highlight: ["BONK."] },
      "Bumped his head again.",
    ],
    upload: { caption: "What if you never stopped growing? 📏🚀 At what size would you get scared?", hashtags: ["#whatif", "#simulation", "#giant", "#science", "#3danimation", "#fyp"] },
  },

  shots: [
    // ── 1 Alltag ──
    {
      at: 0, name: "Zimmer: Kopf an die Decke", ambience: "amb_interior", ambienceVolume: 0.5,
      render: (s) => (
        <World shot={s} interior cam={fixed([1.7, 0.75, 3.4], [1.45, 0.7, 3.1], [0, 1.75, 0], [0, 2.2, 0], 72)}
          pose={(t) => (t < 0.7 ? "idle" : "lookUp")} expression={(t) => (t < T_CEILING ? "neutral" : "shock")}
          shakeAmp={(t) => (t > T_CEILING ? 0.05 * Math.exp(-(t - T_CEILING) * 4) + 0.012 : 0)} />
      ),
    },
    {
      at: 1.4, name: "Haus: Kopf durchs Dach", ambience: "amb_city", ambienceVolume: 0.45,
      render: (s) => (
        <World shot={s} cam={fixed([6.6, 3.5, 10.8], [5.4, 4.7, 8.8], [0, 2.7, 0], [0, 3.9, 0], 50)} pose="shock" expression="shock"
          shakeAmp={(t) => 0.09 * Math.exp(-Math.max(0, t - T_ROOF) * 3) * (t > T_ROOF ? 1 : 0)} shadowSize={9} />
      ),
    },
    {
      at: 3.4, name: "Straße: Nachbarn", ambience: "amb_crowd", ambienceVolume: 0.45,
      render: (s) => (
        <World shot={s} crowd cam={fixed([-4.2, 3.4, 22.5], [-3.0, 3.9, 20.8], [0, 4.6, 0], [0, 7.2, 0], 52)}
          pose="wave" expression="happy" shadowSize={9} />
      ),
    },
    // ── 2 Meilensteine ──
    {
      at: 5.6, name: "Froschperspektive Straße", ambience: "amb_city", ambienceVolume: 0.5,
      render: (s) => (
        <World shot={s} crowd cam={fixed([7, 0.35, 13.2], [5.6, 0.45, 12.2], [0, 8.5, 0], [0, 13, 0], 64)}
          pose="shock" expression="shock" shadowSize={9} />
      ),
    },
    {
      at: 7.8, name: "Weit: Bäume, Häuser", ambience: "amb_nature", ambienceVolume: 0.5,
      render: (s) => (
        <World shot={s} crowd cam={fixed([-38, 11, 44], [-54, 21, 62], [0, 9, 0], [0, 15, 0], 45)}
          pose="idle" joints={(t) => ({ headX: 0.35, headY: Math.sin(t * 1.8) * 0.4 })} shadowSize={9} />
      ),
    },
    {
      at: 10.0, name: "Büro: Gesicht am Fenster", ambience: "amb_interior", ambienceVolume: 0.55,
      render: (s) => (
        <World shot={s} office cam={fixed([0.7, 33.7, 16.4], [0.3, 34.1, 15.9], [0, 31.8, 0], [0, 35.8, 0], 64)}
          pose={(t) => (t < 11.05 ? "idle" : "wave")} expression="happy" />
      ),
    },
    // ── 3 Wissen / Staunen ──
    {
      at: 11.8, name: "Drohne: Stadt bis zur Hüfte", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => (
        <World shot={s} cam={rel([1.35, 0.75, 1.9], [1.9, 0.95, 2.5], [0, 0.45, 0], [0, 0.42, -0.2], 45)}
          pose="idle" joints={() => ({ headX: 0.45 })} shadowSize={10} />
      ),
    },
    {
      at: 14.4, name: "Vögel am Kopf", ambience: "amb_wind", ambienceVolume: 0.5,
      render: (s) => (
        <World shot={s} birds cam={rel([0.62, 0.86, 0.8], [0.5, 0.83, 0.62], [0, 0.77, 0], [0, 0.78, 0], 50)}
          pose="idle" expression="happy" joints={(t) => ({ headY: 0.35 + Math.sin(t * 2.2) * 0.25, headX: -0.15 })} />
      ),
    },
    {
      at: 16.8, name: "Fernsehturm", ambience: "amb_wind_strong", ambienceVolume: 0.4,
      render: (s) => (
        <World shot={s} cam={fixed([-40, 110, 700], [-20, 170, 600], [-60, 170, 0], [-60, 215, 0], 42)}
          pose="idle" maxRotY={-0.35} joints={(t) => ({ headY: -0.5, headX: t < T_TV ? -0.1 : 0.25 })} />
      ),
    },
    {
      at: 19.6, name: "Schuh, Froschperspektive", ambience: "amb_city", ambienceVolume: 0.55,
      render: (s) => (
        <World shot={s} runners={[12, 0, 100]}
          extra={() => [[6, 104, 0.3], [-9, 98, 1.9], [30, 108, -0.6]].map(([x, z, r], i) => <Car key={i} seed={i + 2} position={[x, 0, z]} rotationY={r} />)} cam={fixed([24, 1.5, 124], [18, 1.3, 114], [0, 50, 0], [0, 120, 0], 62)}
          pose="idle" shakeAmp={() => 0.06} />
      ),
    },
    // ── 4 Extrem ──
    {
      at: 22.0, name: "Zoom-out: über der Stadt", ambience: "amb_wind_strong", ambienceVolume: 0.45,
      render: (s) => (
        <World shot={s} cam={rel([1.0, 0.55, 1.6], [2.3, 1.0, 3.5], [0, 0.55, 0], [0, 0.45, 0], 45)} pose="idle" joints={() => ({ headX: 0.5 })} />
      ),
    },
    {
      at: 24.4, name: "Kopf durch die Wolken", ambience: "amb_wind_strong", ambienceVolume: 0.55,
      render: (s) => (
        <World shot={s}
          cam={({ p, h }) => ({ pos: [lerp(760, 640, p), 2420 + p * 60, lerp(1600, 1400, p)], look: [0, Math.max(1650, 0.8 * h), 0], fov: 44 })}
          pose="lookUp" expression={(t) => (t < 25.6 ? "neutral" : "happy")} />
      ),
    },
    {
      at: 26.8, name: "Frost an der Mütze", ambience: "amb_wind", ambienceVolume: 0.55,
      render: (s) => (
        <World shot={s} snow cam={rel([0.36, 0.95, 0.58], [0.3, 0.92, 0.49], [0, 0.79, 0], [0, 0.8, 0], 48)}
          expression="shock" joints={() => ({ lArmX: -1.3, rArmX: -1.3, lArmZ: -0.55, rArmZ: 0.55 })}
          shakeAmp={(t, h) => 0.0025 * h} />
      ),
    },
    {
      at: 29.0, name: "Weit: Everest-Höhe", ambience: "amb_wind", ambienceVolume: 0.5,
      render: (s) => (
        <World shot={s} cam={rel([-0.95, 0.62, 1.75], [-1.2, 0.72, 2.15], [0, 0.55, 0], [0, 0.58, 0], 45)}
          pose="idle" joints={(t) => ({ lArmX: -1.3, rArmX: -1.3, lArmZ: -0.55, rArmZ: 0.55, headY: -0.3 })} />
      ),
    },
    // ── 5 Pointe ──
    {
      at: 30.8, name: "Flugzeug über dem Kopf", ambience: "tension", ambienceVolume: 0.4,
      render: (s) => (
        <World shot={s} plane
          cam={({ t, h }) => {
            const pl = planeState(t, h).pos;
            return { pos: [pl[0] - 170, pl[1] + 15, pl[2] + 210], look: [pl[0] + 30, pl[1] - 45, pl[2]], fov: 58 };
          }}
          pose="idle" shakeAmp={() => 1.2} />
      ),
    },
    {
      at: T_BONK, name: "BONK", transition: "flash", ambience: "amb_wind", ambienceVolume: 0.4,
      render: (s) => (
        <World shot={s} plane planeScale={6}
          cam={({ t, p, h }) => {
            const pl = planeState(t, h).pos;
            const e = ease.out(Math.min(1, p * 1.25));
            const head: Vec3 = [0, 0.77 * h, 0.05 * h];
            const look = lerp3([pl[0], pl[1] + 250, pl[2]], head, e);
            const dist = 1200 * Math.pow((0.55 * h) / 1200, e);
            const d: Vec3 = lerp3([0.6, 0.3, 0.75], [0.5, 0.15, 1], e);
            const n = Math.hypot(...d);
            return { pos: [look[0] + (d[0] / n) * dist, look[1] + (d[1] / n) * dist, look[2] + (d[2] / n) * dist], look, fov: lerp(34, 46, e) };
          }}
          expression="shock" joints={(t) => ({ rArmZ: -2.75, rArmX: -0.45 + Math.sin(t * 14) * 0.12, headX: 0.12, headY: 0.1 })}
          shakeAmp={(t, h) => 0.02 * h * Math.exp(-(t - T_BONK) * 3)} />
      ),
    },
  ],

  sfx: [
    // Zimmer: Kopf an die Decke
    { at: 0.15, sound: "grow", volume: 0.35, rate: 0.8 },
    { at: T_CEILING, sound: "bonk", volume: 0.5 },
    { at: T_CEILING + 0.02, sound: "crunch", volume: 0.35, rate: 1.2 },
    // Dach bricht
    { at: T_ROOF, sound: "crunch", volume: 0.65 },
    { at: T_ROOF + 0.05, sound: "rumble", volume: 0.3, rate: 1.3 },
    { at: 2.2, sound: "thud", volume: 0.35, rate: 1.4 },
    { at: 2.55, sound: "thud", volume: 0.3, rate: 1.6 },
    { at: 2.9, sound: "glass_crack", volume: 0.25, rate: 1.2 },
    // Nachbarn, Autos bremsen
    { at: 3.6, sound: "screech", volume: 0.3 },
    { at: 4.1, sound: "horn", volume: 0.18, rate: 1.05 },
    { at: 5.2, sound: "grow", volume: 0.3, rate: 0.65 },
    { at: 6.1, sound: "car_pass", volume: 0.3 },
    { at: 6.9, sound: "horn", volume: 0.15, rate: 0.9 },
    { at: 7.4, sound: "crunch", volume: 0.3, rate: 0.8 },
    { at: 8.3, sound: "rumble", volume: 0.3 },
    // Büro
    { at: 10.0, sound: "typing", volume: 0.4 },
    { at: 10.55, sound: "heartbeat", volume: 0.45 },
    { at: 11.0, sound: "glass_crack", volume: 0.2, rate: 1.5 },
    // Stadt, Vögel
    { at: 11.8, sound: "whoosh_long", volume: 0.3, rate: 0.8 },
    { at: 13.0, sound: "rumble", volume: 0.3, rate: 0.8 },
    { at: 14.5, sound: "whoosh", volume: 0.35, rate: 1.3 },
    { at: 15.4, sound: "whoosh", volume: 0.3, rate: 1.5 },
    { at: 16.2, sound: "whoosh", volume: 0.25, rate: 1.2 },
    // Fernsehturm: Riser endet auf „überholt“
    { at: T_TV - 2.6, sound: "riser", volume: 0.4 },
    { at: T_TV, sound: "swoosh_up", volume: 0.45 },
    // Schuh
    { at: 19.6, sound: "alarm", volume: 0.2, rate: 0.9 },
    { at: 19.9, sound: "rumble", volume: 0.45, rate: 0.7 },
    { at: 20.4, sound: "siren", volume: 0.18 },
    { at: 21.2, sound: "horn", volume: 0.15, rate: 0.85 },
    // Zoom-out, Wolken
    { at: 22.0, sound: "sub_drop", volume: 0.3 },
    { at: 22.1, sound: "whoosh_long", volume: 0.4, rate: 0.7 },
    { at: 24.9, sound: "whoosh_long", volume: 0.45, rate: 0.9 },
    { at: 25.3, sound: "swoosh_up", volume: 0.35 },
    // Frost
    { at: 27.0, sound: "amb_wind_strong", volume: 0.25, dur: 2.0, fadeIn: 0.3, fadeOut: 0.5 },
    { at: 28.6, sound: "glass_crack", volume: 0.15, rate: 1.8 },
    // Everest → Flugzeug
    { at: 30.0, sound: "plane", volume: 0.28 },
    { at: T_BONK - 2.6, sound: "riser", volume: 0.22 },
    // BONK (Höhepunkt)
    { at: T_BONK, sound: "bonk", volume: 0.24 },
    { at: T_BONK + 0.12, sound: "crunch", volume: 0.2, rate: 0.7 },
    { at: T_BONK + 0.35, sound: "bonk", volume: 0.25, rate: 1.35 },
    { at: T_BONK + 0.62, sound: "bonk", volume: 0.18, rate: 1.6 },
    { at: 33.2, sound: "ding", volume: 0.45, rate: 0.8 },
  ],

  upload: {
    caption: "Was wäre, wenn du nie aufhörst zu wachsen? 📏🚀 Ab welcher Größe hättest du Angst?",
    hashtags: ["#waswärewenn", "#simulation", "#riese", "#wissen", "#3danimation", "#fyp"],
  },
};
