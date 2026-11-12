// „Was wäre, wenn alle Männer auf einmal verschwinden?“
// Format B (Zeitsprung). Plopp – 4,2 Mrd. Männer weg, auch Max (nur seine Mütze bleibt).
// Cockpits, Gefängnisse, Bundestag → Gedankenspiel „ohne Nachwuchs“ (Erde wird dunkel) → Samenbanken →
// Twist: Die Zahl „Männer auf der Erde“ steigt die ganze Zeit – Jungs werden weiter geboren. Einer heißt Max.
import React from "react";
import type { Episode } from "../../types";
import { clamp, lerp } from "../../lib/anim";
import { City, PlaneSky, EarthDark } from "../verschwinden/world";
import { Street, Prison, Parliament, SpermBank, Nursery, move, path } from "./world";
import { VANISH, HYPO, HYPO_END, TWIST, END, GONE, BOYS, MEN_NOW, YEAR, DAY, MONTH, fmtGone, fmtCount, fmtYear } from "./metric";

const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Gedankenspiel: Menschen auf der Erde ohne Nachwuchs (nur noch Frauen, altern) */
const WOMEN_LEFT = (t: number) => {
  const y = YEAR(t);
  const k: [number, number][] = [[2026, 4.13e9], [2045, 3.86e9], [2070, 2.95e9], [2090, 1.5e9], [2105, 0.35e9], [2120, 0.012e9], [2135, 0]];
  for (let i = 1; i < k.length; i++) if (y <= k[i][0]) return lerp(k[i - 1][1], k[i][1], (y - k[i - 1][0]) / (k[i][0] - k[i - 1][0]));
  return 0;
};

export const maenner: Episode = {
  id: "Maenner",
  title: "Was wäre, wenn alle Männer auf einmal verschwinden?",
  duration: END,
  coldOpen: { at: 2.1, dur: 1.0 },
  hook: { text: "Was wäre, wenn alle Männer auf einmal verschwinden?", highlight: ["Männer"], until: 2.6 },

  hud: [
    {
      label: "Männer auf der Erde",
      value: MEN_NOW,
      format: fmtCount,
      compare: [{ at: 0, text: "Ganz normaler Mittwoch" }],
      until: VANISH - 0.01,
    },
    {
      label: "Ohne Männer seit",
      value: GONE,
      format: fmtGone,
      compare: [
        { at: 0, text: "Die halbe Menschheit: weg" },
        { at: 4 * 60, text: "Cockpits leer" },
        { at: 2 * 3600, text: "Gefängnisse leer" },
        { at: 1.5 * DAY, text: "Bundestag: 204 Frauen" },
      ],
      secondary: { label: "Männer auf der Erde", value: BOYS, format: fmtCount },
      scaleBar: { from: 1, to: 9 * MONTH },
      from: VANISH,
      until: HYPO - 0.01,
    },
    {
      label: "Ohne Nachwuchs – Jahr",
      value: YEAR,
      format: fmtYear,
      compare: [
        { at: 2026, text: "Gedankenspiel" },
        { at: 2045, text: "Keine Kinder mehr" },
        { at: 2100, text: "Nur noch Hochbetagte" },
        { at: 2134.5, text: "Menschheit: ausgestorben" },
      ],
      secondary: { label: "Menschen auf der Erde", value: WOMEN_LEFT, format: fmtCount },
      from: HYPO,
      until: HYPO_END - 0.01,
    },
    {
      label: "Ohne Männer seit",
      value: GONE,
      format: fmtGone,
      compare: [
        { at: 3.4 * DAY, text: "Samenbanken: bewacht wie Gold" },
        { at: 4 * 7 * DAY, text: "Jungs werden weiter geboren" },
        { at: 8.9 * MONTH, text: "50 Mio. neue Männer" },
      ],
      secondary: { label: "Männer auf der Erde", value: BOYS, format: fmtCount },
      scaleBar: { from: 1, to: 9 * MONTH },
      from: HYPO_END,
    },
  ],

  captions: [
    { at: 2.1, text: "Plopp. 4,2 Milliarden Männer: weg.", highlight: ["weg."] },
    { at: 3.4, text: "Auch Max. Nur seine Mütze bleibt." },
    { at: 4.7, text: "Nur 6 % aller Piloten sind Frauen…", highlight: ["6 %"] },
    { at: 5.8, text: "…fast 9 von 10 Cockpits: leer.", highlight: ["leer."] },
    { at: 7.1, text: "Gefängnisse: 93 % leer.", highlight: ["93 %"] },
    { at: 8.3, text: "Die Wärterin macht Feierabend." },
    { at: 9.7, text: "Bundestag: 426 von 630 Sitzen frei.", highlight: ["426"] },
    { at: 11.0, text: "Die Debatte wird… übersichtlich.", italic: true },
    { at: 12.5, text: "Aber: Ohne Männer keine Babys…", highlight: ["Babys…"] },
    { at: 13.8, text: "…die Menschheit wird nur noch älter." },
    { at: 15.3, text: "Um 2135: Menschheit ausgestorben.", highlight: ["ausgestorben."] },
    { at: 16.7, text: "Die Lichter gehen aus." },
    { at: 18.1, text: "Die Rettung: Samenbanken.", highlight: ["Samenbanken."] },
    { at: 19.3, text: "Plötzlich bewacht wie Goldreserven." },
    { at: 20.6, text: "Bei −196 °C hält das Jahrzehnte.", highlight: ["−196 °C"] },
    { at: 22.7, text: "Moment… warum steigt diese Zahl?", highlight: ["steigt"] },
    { at: 24.1, text: "Es werden ja weiter Jungs geboren!", highlight: ["Jungs"] },
    { at: 25.5, text: "In 9 Monaten: 50 Millionen.", highlight: ["50 Millionen."] },
    { at: 27.0, text: "Die Männer sind zurück…" },
    { at: 28.4, text: "…und einer davon heißt Max.", highlight: ["Max."] },
    { at: 30.2, text: "Die Mütze ist noch etwas groß.", italic: true },
  ],

  shots: [
    // ── 1 Alltag ──
    {
      at: 0, name: "Max auf der Straße", ambience: "amb_city", ambienceVolume: 0.55,
      render: (s) => <Street shot={s} cam={move([4.25, 1.5, 5.0], [4.7, 1.55, 4.2], [5.7, 1.62, 1.85], [5.75, 1.66, 1.9], 44)} />,
    },
    {
      at: VANISH, name: "Plopp: Männer weg", transition: "flash", ambience: "amb_wind", ambienceVolume: 0.3,
      render: (s) => (
        <Street shot={s} cam={path(
          [{ t: 0, v: [10.2, 2.9, 8.4] }, { t: 0.45, v: [9.6, 2.4, 7.2] }, { t: 1, v: [7.7, 0.95, 4.4] }],
          [{ t: 0, v: [5.6, 0.9, 0.2] }, { t: 0.45, v: [5.8, 0.9, 0.4] }, { t: 1, v: [5.75, 0.75, 0.6] }], 48)} />
      ),
    },
    // ── 2 Minuten, Stunden ──
    {
      at: 4.6, name: "Flugzeug, Cockpit leer", ambience: "amb_wind_strong", ambienceVolume: 0.4,
      render: (s) => <PlaneSky shot={s} cam={move([-13, 3.5, 42], [-9, 2.2, 33], [0, 0.6, 14], [0, 0.8, 16], 46)} />,
    },
    {
      at: 7.0, name: "Gefängnis leer", ambience: "amb_interior", ambienceVolume: 0.5,
      render: (s) => <Prison shot={s} cam={move([0.7, 1.75, 3.6], [0.25, 1.6, -1.6], [-0.4, 1.0, -12], [-0.8, 0.9, -14], 50)} />,
    },
    {
      at: 9.6, name: "Bundestag, Kran nach oben", ambience: "amb_interior", ambienceVolume: 0.45,
      render: (s) => (
        <Parliament shot={s} cam={path(
          [{ t: 0, v: [1.5, 2.2, -1.2] }, { t: 0.45, v: [1.2, 6.0, -1.6] }, { t: 1, v: [0, 27, 3] }],
          [{ t: 0, v: [-1.5, 1.7, 12] }, { t: 0.45, v: [-0.5, 1.2, 12] }, { t: 1, v: [0, 0, 11] }], 50)} />
      ),
    },
    // ── 3 Gedankenspiel: ohne Nachwuchs ──
    {
      at: HYPO, name: "Stadt verwildert (110 Jahre)", transition: "dip", ambience: "amb_nature", ambienceVolume: 0.5,
      render: (s) => (
        <City shot={s} people="none" age={(t) => Math.pow(111, clamp((t - HYPO) / 2.7)) - 1} birds
          cam={move([-5, 5, 18], [-14, 30, 40], [0, 5, -30], [0, 0, -60], 50)} />
      ),
    },
    {
      at: 15.2, name: "Erde wird dunkel", ambience: "amb_space", ambienceVolume: 0.5,
      render: (s) => <EarthDark shot={s} lights={(t) => 0.95 * (1 - sm(15.5, 17.4, t))} cam={move([0, 3800, 19500], [0, 3200, 17000], [0, 600, 0], [0, 500, 0], 40)} />,
    },
    // ── 4 Rettung ──
    {
      at: HYPO_END, name: "Samenbank, Laser", transition: "dip", ambience: "tension", ambienceVolume: 0.35,
      render: (s) => <SpermBank shot={s} cam={move([0, 1.95, 5.5], [0, 1.75, 0.8], [0, 0.9, -20], [0.3, 1.0, -22], 50)} />,
    },
    {
      at: 20.4, name: "Tank öffnet, −196 °C", ambience: "tension", ambienceVolume: 0.35,
      render: (s) => <SpermBank shot={s} open={(t) => sm(20.6, 21.8, t)} cam={move([0.7, 1.75, 1.2], [1.25, 1.66, 0.45], [1.95, 1.45, -1.4], [2.1, 1.65, -1.5], 46)} />,
    },
    // ── 5 Twist ──
    {
      at: TWIST, name: "Säuglingsstation", transition: "flash", ambience: "amb_hospital", ambienceVolume: 0.45,
      render: (s) => <Nursery shot={s} cam={move([-3.0, 1.6, 1.3], [-1.1, 1.6, 1.1], [-1.7, 0.75, -0.5], [0.4, 0.75, -0.5], 48)} />,
    },
    {
      at: 25.4, name: "Zoom-out: viele Babys", ambience: "amb_hospital", ambienceVolume: 0.45,
      render: (s) => <Nursery shot={s} cam={move([0.3, 1.9, 1.4], [0.9, 3.4, 6.0], [0, 0.85, -0.8], [0, 0.6, -1.4], 50)} />,
    },
    {
      at: 28.2, name: "Baby-Max", ambience: "amb_hospital", ambienceVolume: 0.4,
      render: (s) => <Nursery shot={s} maxEyes={(t) => sm(29.6, 29.9, t) * (t > 31.0 && t < 31.15 ? 0 : 1)} cam={move([0.0, 1.55, 0.7], [0.0, 1.42, 0.52], [0, 1.035, -0.825], [0, 1.0, -0.8], 40)} />,
    },
  ],

  sfx: [
    // Alltag
    { at: 0.15, sound: "car_pass", volume: 0.3 },
    { at: 0.8, sound: "msg_in", volume: 0.3 },
    { at: 1.4, sound: "step", volume: 0.15, rate: 1.3 },
    // Plopp
    { at: VANISH, sound: "zap", volume: 0.25, rate: 1.4 },
    { at: VANISH + 0.05, sound: "chime", volume: 0.22, rate: 1.6 },
    { at: VANISH + 0.62, sound: "thud", volume: 0.18, rate: 2.6 }, // Mütze landet
    { at: VANISH + 0.5, sound: "thud", volume: 0.2, rate: 2.2 }, // Handy
    { at: VANISH + 0.35, sound: "screech", volume: 0.3 },
    { at: 3.9, sound: "alarm", volume: 0.15, rate: 1.1 },
    // Flugzeug
    { at: 4.6, sound: "plane", volume: 0.5 },
    { at: 5.9, sound: "beep", volume: 0.22, rate: 1.4 },
    { at: 6.25, sound: "beep", volume: 0.22, rate: 1.4 },
    { at: 6.6, sound: "beep", volume: 0.22, rate: 1.4 },
    // Gefängnis
    { at: 7.05, sound: "clank", volume: 0.5 },
    { at: 7.9, sound: "step", volume: 0.15, rate: 1.0 },
    { at: 8.35, sound: "thud", volume: 0.18, rate: 1.8 }, // Füße auf den Tisch
    // Bundestag
    { at: 9.7, sound: "ding", volume: 0.25, rate: 1.3 }, // Glocke der Präsidentin
    { at: 10.4, sound: "whoosh_long", volume: 0.3, rate: 0.9 },
    // Gedankenspiel
    { at: HYPO + 0.1, sound: "grow", volume: 0.4 },
    { at: 13.8, sound: "grow", volume: 0.35, rate: 0.8 },
    { at: 14.0, sound: "riser", volume: 0.3 },
    { at: 15.25, sound: "whoosh_long", volume: 0.3, rate: 0.8 },
    ...[15.7, 16.2, 16.6, 16.95, 17.25].map((at, i) => ({ at, sound: "zap" as const, volume: 0.24, rate: 0.75 - i * 0.05 })),
    { at: 17.45, sound: "boom", volume: 0.22, rate: 0.7 },
    // Samenbank
    { at: 18.1, sound: "buzz", volume: 0.25 },
    { at: 18.9, sound: "alarm", volume: 0.1, rate: 0.7 },
    { at: 19.4, sound: "beep", volume: 0.25, rate: 0.9 },
    { at: 20.6, sound: "button", volume: 0.35 },
    { at: 20.75, sound: "door", volume: 0.3, rate: 1.4 },
    { at: 21.0, sound: "fire", volume: 0.18, rate: 2.0, dur: 1.5, fadeIn: 0.2, fadeOut: 0.6 }, // Zischen
    { at: 21.4, sound: "riser", volume: 0.3 },
    // Twist
    { at: TWIST + 0.05, sound: "glitch", volume: 0.3 },
    { at: 22.9, sound: "tick", volume: 0.4 },
    { at: 23.3, sound: "tick", volume: 0.4, rate: 1.2 },
    { at: 23.5, sound: "baby", volume: 0.35 },
    { at: 24.6, sound: "baby", volume: 0.25, rate: 1.15 },
    { at: 25.5, sound: "chime", volume: 0.3, rate: 1.1 },
    { at: 26.2, sound: "baby", volume: 0.2, rate: 0.9 },
    { at: 26.9, sound: "baby", volume: 0.2, rate: 1.25 },
    // Pointe
    { at: 28.4, sound: "chime", volume: 0.3 },
    { at: 29.6, sound: "baby", volume: 0.45, rate: 1.05 },
    { at: 30.25, sound: "bonk", volume: 0.25, rate: 1.6 },
    { at: 31.0, sound: "pop", volume: 0.35 },
  ],

  upload: {
    caption: "Was wäre, wenn alle Männer auf einmal verschwinden? 👀 Was würde als Erstes zusammenbrechen?",
    hashtags: ["#waswärewenn", "#simulation", "#3danimation", "#gedankenexperiment", "#fyp"],
  },
};
