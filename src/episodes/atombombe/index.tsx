// „Was wäre, wenn eine Atombombe Berlin trifft?“
// Format B (Zeit nach der Explosion, log-gestreckt). 800 kt über dem Alexanderplatz, Max steht 12 km entfernt auf dem Teufelsberg.
// Wissen: Licht kommt sofort, die Druckwelle erst nach 30 s → Max legt sich flach hin und überlebt.
// Pointe: 20 Minuten später kommt die Warn-App.
import type { Episode } from "../../types";
import { clamp } from "../../lib/anim";
import { fmtLength } from "../../lib/metric";
import { Berlin, move, tbMove, TOWER } from "./world";
import { CLOCK, fmtClock, fmtSince, tau, SHOCK, DETONATION, GATE_HIT, MAX_HIT, cloudH } from "./metric";

const LIE_AT = 17.9; // Max wirft sich hin
const lieDown = (t: number) => clamp((t - LIE_AT) / 0.45);
const getUp = (start: number) => (t: number) => 1 - clamp((t - start) / 0.9);

export const atombombe: Episode = {
  id: "Atombombe",
  title: "Was wäre, wenn eine Atombombe Berlin trifft?",
  duration: 36,
  coldOpen: { at: 24.6, dur: 1.0 },
  hook: { text: "Was wäre, wenn eine Atombombe Berlin trifft?", highlight: ["Atombombe"], until: 2.6 },

  hud: [
    {
      label: "Berlin, Ortszeit",
      value: CLOCK,
      format: fmtClock,
      compare: [{ at: 0, text: "Ein ganz normaler Abend" }],
      until: DETONATION - 0.01,
    },
    {
      label: "Nach der Explosion",
      value: tau,
      format: fmtSince,
      compare: [
        { at: 0, text: "Lichtblitz" },
        { at: 0.25, text: "Heißer als die Sonne" },
        { at: 0.8, text: "Feuerball: über 1 km" },
        { at: 3.3, text: "Brandenburger Tor" },
        { at: 5, text: "Druckwelle: Schallgeschw." },
        { at: 29.9, text: "Druckwelle bei Max" },
      ],
      secondary: { label: "Druckwelle", value: SHOCK, format: fmtLength },
      from: DETONATION,
      until: 23.39,
    },
    {
      label: "Nach der Explosion",
      value: tau,
      format: fmtSince,
      compare: [
        { at: 0, text: "Pilzwolke steigt" },
        { at: 150, text: "Höher als Flugzeuge" },
        { at: 600, text: "Wolke zieht nach Osten" },
        { at: 1_150, text: "Die Warn-App meldet sich" },
      ],
      secondary: { label: "Pilzwolke", value: (t) => cloudH(tau(t)), format: fmtLength },
      from: 23.4,
    },
  ],

  captions: [
    { at: 0.3, text: "Max filmt die Skyline von Berlin." },
    { at: 1.5, text: "Bis zum Fernsehturm: 12 km." },
    { at: 2.7, text: "Dann: ein Lichtblitz.", highlight: ["Lichtblitz."] },
    { at: 4.3, text: "Eine Atombombe. 800 Kilotonnen.", highlight: ["Atombombe."] },
    { at: 6.1, text: "53-mal stärker als Hiroshima.", highlight: ["53-mal"] },
    { at: 7.9, text: "Der Feuerball: über 1 km breit.", highlight: ["1 km"] },
    { at: 9.7, text: "Heißer als die Oberfläche der Sonne.", highlight: ["Sonne."] },
    { at: 11.5, text: "Zoomen wir raus." },
    { at: 12.5, text: "Die Druckwelle rast durch die Stadt." },
    { at: GATE_HIT - 0.15, text: "Nach 3 Sekunden: Brandenburger Tor.", highlight: ["3 Sekunden:"] },
    { at: 15.0, text: "Die Quadriga fliegt davon." },
    { at: 16.4, text: "Max hat noch 25 Sekunden.", highlight: ["25 Sekunden."] },
    { at: 17.7, text: "Er legt sich flach auf den Boden." },
    { at: 19.0, text: "Licht ist schnell. Schall nicht." },
    { at: MAX_HIT, text: "Dann kommt der Knall.", highlight: ["Knall."] },
    { at: 23.6, text: "Die Pilzwolke steigt und steigt…" },
    { at: 25.0, text: "…höher als jedes Flugzeug.", highlight: ["Flugzeug."] },
    { at: 26.3, text: "Der Wind trägt sie nach Osten." },
    { at: 28.8, text: "Max steht auf. Er lebt.", highlight: ["lebt."] },
    { at: 30.0, text: "Weil er sich hingelegt hat." },
    { at: 31.4, text: "Dann piept sein Handy." },
    { at: 32.8, text: "„Warnung: Bitte meiden Sie die Innenstadt.“", italic: true },
  ],

  shots: [
    // ── 1 Alltag (golden) ──
    {
      at: 0, name: "Teufelsberg, Max filmt", ambience: "amb_nature",
      render: (s) => (
        <Berlin shot={s} mood="golden" summit cam={tbMove([-0.85, 1.72, -3.9], [-0.7, 1.7, -3.2], [-0.42, 1.48, 0], [-0.35, 1.5, 0], 40)}
          max={{ pose: "wave", hold: "phone", expr: "happy", rotY: Math.PI, pos: [0, 0, 0.1] }} />
      ),
    },
    // ── 2 Blitz + Feuerball ──
    {
      at: DETONATION, transition: "flash", name: "Blitz an der Spree", ambience: "tension", ambienceVolume: 0.4,
      render: (s) => <Berlin shot={s} mood="fireball" cam={move([1500, 26, 912], [1380, 30, 850], [TOWER[0], 380, TOWER[2]], [TOWER[0], 440, TOWER[2]], 46)} />,
    },
    {
      at: 5.0, name: "Feuerball am Fernsehturm", ambience: "fire", ambienceVolume: 0.35,
      render: (s) => <Berlin shot={s} mood="fireball" cam={move([1900, 140, -1700], [1650, 150, -1500], [-150, 520, 100], [-150, 600, 100], 50)} />,
    },
    {
      at: 7.6, name: "Feuerball aus 12 km", ambience: "amb_wind", ambienceVolume: 0.4,
      render: (s) => <Berlin shot={s} mood="fireball" summit cam={tbMove([-0.5, 1.55, -4.4], [-0.45, 1.6, -3.8], [0, 420, 12000], [0, 470, 12000], 30)} max={{ pose: "shock", expr: "shock" }} />,
    },
    {
      at: 9.6, name: "Max geblendet", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => <Berlin shot={s} mood="fireball" summit cam={tbMove([0.9, 1.5, 3.4], [0.6, 1.6, 2.6], [0, 1.45, 0], [0, 1.5, 0], 42)} max={{ pose: "shock", expr: "shock" }} />,
    },
    // ── 3 Druckwelle ──
    {
      at: 11.4, name: "Draufsicht: Ring", ambience: "tension", ambienceVolume: 0.55,
      render: (s) => <Berlin shot={s} mood="smoke" cam={move([4200, 8600, 900], [3600, 7400, 860], [-1600, 0, 500], [-1500, 0, 500], 50)} />,
    },
    {
      at: 13.2, name: "Brandenburger Tor", ambience: "amb_wind", ambienceVolume: 0.4,
      render: (s) => <Berlin shot={s} mood="smoke" gate shakeAmp={(t) => (t > GATE_HIT ? 1.2 * clamp(1 - (t - GATE_HIT) / 2.2) : 0)} cam={move([-2640, 4, 655], [-2600, 5, 660], [-2380, 22, 655], [-2380, 26, 660], 52)} />,
    },
    {
      at: 16.2, name: "Max legt sich hin", ambience: "amb_wind", ambienceVolume: 0.35,
      render: (s) => (
        <Berlin shot={s} mood="smoke" summit cam={tbMove([4.8, 1.9, -0.9], [4.4, 1.6, -0.3], [0, 0.9, 0.4], [0, 0.5, 0.9], 46)}
          max={{ pose: (t) => (t < LIE_AT ? "shock" : "cheer"), lie: lieDown, expr: "shock", pos: [0, 0, 0.1] }} />
      ),
    },
    {
      at: 18.6, name: "Ring zieht Richtung Max", ambience: "tension", ambienceVolume: 0.6,
      render: (s) => <Berlin shot={s} mood="smoke" cam={move([-14600, 950, 3900], [-14300, 880, 3750], [-6000, 500, 1600], [-6000, 450, 1600], 42)} />,
    },
    {
      at: 21.0, name: "Druckwelle trifft Max", ambience: "amb_wind_strong", ambienceVolume: 0.5,
      render: (s) => (
        <Berlin shot={s} mood="smoke" summit localBlast shakeAmp={(t) => (t > MAX_HIT ? 0.16 * clamp(1 - (t - MAX_HIT) / 2.2) : 0.01)}
          cam={tbMove([0.7, 0.8, -1.9], [0.6, 0.85, -1.6], [-0.2, 2.0, 40], [-0.2, 2.4, 40], 50)}
          max={{ pose: "cheer", lie: () => 1, expr: "shock", pos: [0, 0, 0.1] }} />
      ),
    },
    // ── 4 Pilzwolke ──
    {
      at: 23.4, name: "Pilzwolke + Flugzeug", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => <Berlin shot={s} mood="cloud" plane cam={move([-15500, 260, 9800], [-15000, 280, 9500], [0, 5200, 0], [0, 8600, 0], 58)} />,
    },
    {
      at: 26.0, name: "Wolke zieht nach Osten", ambience: "amb_wind_strong", ambienceVolume: 0.3,
      render: (s) => <Berlin shot={s} mood="cloud" plume noFog cam={move([-26000, 34000, 30000], [-23000, 31000, 27000], [9000, 6000, 0], [11000, 6000, 0], 48)} />,
    },
    // ── 5 Payoff ──
    {
      at: 28.6, name: "Max steht auf", ambience: "fire", ambienceVolume: 0.3,
      render: (s) => (
        <Berlin shot={s} mood="ash" summit cam={tbMove([-0.55, 1.4, -2.3], [-0.45, 1.75, -2.9], [0.15, 1.6, 8], [0.15, 3.4, 10], 48)}
          max={{ pose: (t) => (t < 29.4 ? "cheer" : "idle"), lie: getUp(28.7), expr: "shock", pos: [0, 0, 0.1] }} />
      ),
    },
    {
      at: 31.2, name: "Handy: Warn-App", ambience: "amb_wind", ambienceVolume: 0.3,
      render: (s) => (
        <Berlin shot={s} mood="ash" summit cam={tbMove([0.45, 1.6, 2.5], [0.32, 1.6, 2.05], [0, 1.4, 0.1], [0, 1.45, 0.1], 40)}
          max={{ pose: (t) => (t < 31.6 ? "idle" : "phone"), hold: "phone", expr: "shock", phoneGlow: (t) => (t > 31.6 ? 0.7 + 0.3 * Math.sin(t * 9) : 0), pos: [0, 0, 0.1] }} />
      ),
    },
  ],

  // ── Sound-Design (Automatik: Atmos, Übergänge, Meilensteine, Untertitel – siehe src/audio/sfx.ts) ──
  sfx: [
    { at: 0.35, sound: "camera", volume: 0.4 },
    { at: 1.2, sound: "car_pass", volume: 0.12, rate: 0.8 },
    // Blitz: grelles Pfeifen, dann Stille vor dem Knall
    { at: DETONATION, sound: "zap", volume: 0.2, rate: 0.6 },
    { at: DETONATION + 0.05, sound: "sub_drop", volume: 0.15 },
    { at: DETONATION + 0.1, sound: "beep", volume: 0.12, rate: 1.6, dur: 1.6, fadeOut: 1.2 },
    { at: 5.0, sound: "rumble", volume: 0.35, rate: 0.6 },
    { at: 7.6, sound: "whoosh_long", volume: 0.3, rate: 0.7 },
    { at: 9.7, sound: "fire", volume: 0.18, dur: 1.6, fadeIn: 0.3, fadeOut: 0.5 },
    // Ring über der Stadt
    { at: 11.4, sound: "rumble", volume: 0.45, rate: 0.75 },
    { at: 12.0, sound: "riser", volume: 0.35 },
    // Brandenburger Tor
    { at: GATE_HIT, sound: "boom", volume: 0.32, rate: 0.9 },
    { at: GATE_HIT + 0.05, sound: "glass_crack", volume: 0.4 },
    { at: GATE_HIT + 0.2, sound: "rumble", volume: 0.5 },
    { at: GATE_HIT + 0.4, sound: "whoosh_hard", volume: 0.35, rate: 0.7 },
    { at: GATE_HIT + 1.1, sound: "thud", volume: 0.4, rate: 0.8 },
    // Max legt sich hin, Herzschlag bis zum Knall
    { at: LIE_AT + 0.35, sound: "thud", volume: 0.35, rate: 1.2 },
    { at: 16.4, sound: "heartbeat", volume: 0.4 },
    { at: 18.0, sound: "heartbeat", volume: 0.45, rate: 1.1 },
    { at: 18.8, sound: "siren", volume: 0.14, rate: 0.9, dur: 2.6, fadeIn: 0.6, fadeOut: 0.6 },
    { at: 19.4, sound: "heartbeat", volume: 0.5, rate: 1.2 },
    { at: MAX_HIT - 2.6, sound: "riser", volume: 0.45 },
    // Knall bei Max (Höhepunkt)
    { at: MAX_HIT, sound: "boom", volume: 0.38, rate: 0.8 },
    { at: MAX_HIT + 0.03, sound: "sonic_boom", volume: 0.2, rate: 0.85 },
    { at: MAX_HIT + 0.08, sound: "sub_drop", volume: 0.2 },
    { at: MAX_HIT + 0.3, sound: "rumble", volume: 0.35, rate: 0.8 },
    { at: MAX_HIT + 0.5, sound: "glass_crack", volume: 0.35, rate: 0.85 },
    { at: MAX_HIT + 0.9, sound: "thud", volume: 0.22 },
    // Pilzwolke
    { at: 23.4, sound: "rumble", volume: 0.22, rate: 0.55 },
    { at: 23.6, sound: "plane", volume: 0.2, rate: 0.8 },
    { at: 26.0, sound: "whoosh_long", volume: 0.3, rate: 0.6 },
    // Aufstehen
    { at: 28.8, sound: "step", volume: 0.3, rate: 0.9 },
    { at: 29.3, sound: "step", volume: 0.3, rate: 1.05 },
    // Pointe: Warn-App
    { at: 31.6, sound: "alarm", volume: 0.5 },
    { at: 32.2, sound: "alarm", volume: 0.45 },
    { at: 32.8, sound: "msg_in", volume: 0.4 },
  ],

  upload: {
    caption: "Was wäre, wenn eine Atombombe Berlin trifft? ☢️ Was hättest du in den 30 Sekunden gemacht?",
    hashtags: ["#waswärewenn", "#berlin", "#simulation", "#wissen", "#3danimation", "#fyp"],
  },
};
