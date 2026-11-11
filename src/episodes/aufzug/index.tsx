// BEISPIEL-EPISODE – Vorlage für jede neue Episode.
// „Was wäre, wenn dein Aufzug alle 2 Sekunden doppelt so schnell wird?“
import React from "react";
import type { Episode } from "../../types";
import { keys3 } from "../../lib/anim";
import { fmtLength, fmtSpeed } from "../../lib/metric";
import { ElevatorWorld, MoonLanding, type CamFn } from "./world";
import { H, V, ARRIVE } from "./metric";

const R = 6371;

// Kamera-Helfer: Fahrt von a nach b über die Shotdauer
const move = (a: [number, number, number], b: [number, number, number], la: [number, number, number], lb?: [number, number, number], fov = 45): CamFn =>
  ({ p }) => ({ pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], p), look: keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la }], p), fov });

export const aufzug: Episode = {
  id: "Aufzug",
  title: "Was wäre, wenn dein Aufzug alle 2 Sekunden doppelt so schnell wird?",
  duration: 62,
  hook: { text: "Was wäre, wenn dein Aufzug alle 2 Sekunden doppelt so schnell wird?", highlight: ["doppelt so schnell"], until: 3.0 },

  hud: {
    label: "Höhe",
    value: H,
    format: fmtLength,
    compare: [
      { at: 9.6, text: "3. Stock" },
      { at: 60, text: "Über dem Dach" },
      { at: 330, text: "Höher als der Eiffelturm" },
      { at: 828, text: "Höher als jedes Gebäude" },
      { at: 2200, text: "In den Wolken" },
      { at: 8849, text: "Höher als der Everest" },
      { at: 100_000, text: "Offiziell im Weltall" },
      { at: 408_000, text: "Höher als die ISS" },
      { at: 35_786_000, text: "Bei den Satelliten" },
      { at: 376_000_000, text: "Falsches Stockwerk" },
    ],
    pill: { every: 2, text: (s) => `×2 Tempo in ${s} s`, stopAt: ARRIVE },
    secondary: { label: "Tempo", value: V, format: fmtSpeed },
    scaleBar: { from: 1, to: 3.8e8 },
  },

  captions: [
    { at: 3.4, text: "Der Aufzug fährt los." },
    { at: 4.9, text: "Etwas zu schnell." },
    { at: 6.0, text: "3. Stock. Er hält nicht an." },
    { at: 7.6, text: "Unten schauen alle hoch." },
    { at: 8.7, text: "Stock 10. Stock 15…" },
    { at: 10.8, text: "Das Dach. Die Schienen gehen einfach weiter.", highlight: ["weiter"] },
    { at: 12.6, text: "Die Stadt wird winzig." },
    { at: 15.7, text: "Höher als der Eiffelturm." },
    { at: 17.1, text: "Und er wird immer schneller…" },
    { at: 18.9, text: "BOOM. Die Schallmauer.", highlight: ["BOOM."] },
    { at: 20.8, text: "Rein in die Wolken…" },
    { at: 22.0, text: "…und durch." },
    { at: 23.2, text: "Seine Ohren knacken." },
    { at: 25.2, text: "Höher als der Everest." },
    { at: 25.8, text: "Ein Flugzeug. Zu spät zum Winken." },
    { at: 27.2, text: "Mach 17. Die Luft beginnt zu glühen.", highlight: ["glühen"] },
    { at: 29.8, text: "Der Himmel wird schwarz." },
    { at: 32.2, text: "100 km: offiziell Weltall.", highlight: ["Weltall"] },
    { at: 33.6, text: "Max hat Höhenangst." },
    { at: 36.3, text: "Die ISS. Längst vorbei.", highlight: ["ISS."] },
    { at: 39.8, text: "Unter ihm: die ganze Erde." },
    { at: 43.2, text: "Die Fahrstuhlmusik läuft immer noch." },
    { at: 45.0, text: "Er drückt nochmal die 3.", highlight: ["3"] },
    { at: 46.8, text: "Schneller als jede Rakete." },
    { at: 49.1, text: "36.000 km: Hier parken die Satelliten." },
    { at: 51.3, text: "Die Erde: nur noch eine Murmel." },
    { at: 52.6, text: "Über 10 % der Lichtgeschwindigkeit.", highlight: ["10 %"] },
    { at: 54.2, text: "Nächster Halt…" },
    { at: 56.0, text: "Mond.", highlight: ["Mond."] },
    { at: 58.4, text: "Dabei wollte er nur in den 3. Stock.", italic: true },
  ],

  shots: [
    // ── Alltag ──
    {
      at: 0, name: "Straße, Aufzug fährt an",
      render: (s) => (
        <ElevatorWorld shot={s} mode="low"
          cam={({ p, h }) => ({ pos: keys3([{ t: 0, v: [9, 1.6 - h, 17] }, { t: 1, v: [7, 1.6 - h, 13.5] }], p), look: [0, 1.3, 0], fov: 50 })}
          pose={(t) => (t < 1.3 ? "press" : "idle")} maxRotY={(t) => (t < 1.3 ? Math.PI : t < 1.7 ? Math.PI * (1 - (t - 1.3) / 0.4) : 0)} />
      ),
    },
    { at: 3.2, name: "Innen, Display", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([0.85, 1.6, 1.0], [0.65, 1.65, 0.8], [-0.15, 1.6, -1.2])} pose="idle" /> },
    {
      at: 6.0, name: "Leute schauen hoch",
      render: (s) => <ElevatorWorld shot={s} mode="low" cam={({ p, h }) => ({ pos: keys3([{ t: 0, v: [6, 1.5 - h, 24] }, { t: 1, v: [4, 1.5 - h, 22] }], p), look: [0, 1, 0], fov: 50 })} pose="lookUp" />,
    },
    // ── Bekannte Meilensteine ──
    {
      at: 8.5, name: "Dachkante",
      render: (s) => <ElevatorWorld shot={s} mode="low" cam={({ h, p }) => ({ pos: [4.5 + p * 0.6, 62 - h, 1.6 + p * 0.4], look: [0, 1.4, 0], fov: 58 })} pose="lookUp" expression="shock" />,
    },
    { at: 11.5, name: "Drohne über Stadt", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([22, -10, 28], [27, -5, 35], [0, -25, 0], [0, -35, 0])} pose="shock" expression="shock" /> },
    { at: 14.5, name: "Eiffelturm-Höhe", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([8, 3, 11], [9, 5, 13], [0, -6, 0])} pose="lookUp" /> },
    { at: 17.0, name: "Seitlich, Streaks", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([3.6, 1.3, 4.6], [3.2, 1.2, 4.0], [0, 1.5, 0], undefined, 40)} pose="shock" expression="shock" /> },
    { at: 18.85, transition: "flash", name: "Schallmauer", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([-3, -4, 4.5], [-3.4, -4.6, 5.2], [0, 2, 0], undefined, 50)} pose="shock" expression="shock" /> },
    { at: 20.6, name: "Wolken", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([4, -1, 7], [4.5, -0.5, 7.5], [0, 1.4, 0])} pose="lookUp" /> },
    { at: 23.0, name: "Über den Wolken", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([6, 12, 10], [7, 13, 12], [0, -25, 0])} pose="idle" /> },
    { at: 25.6, name: "Flugzeug", render: (s) => <ElevatorWorld shot={s} mode="low" cam={move([3, 10, 4], [3.2, 10.5, 4.3], [0, -60, 0], undefined, 52)} pose="wave" expression="happy" /> },
    // ── Wissen / Staunen ──
    { at: 27.0, name: "Plasma", render: (s) => <ElevatorWorld shot={s} mode="high" cam={move([4.5, 1.2, 5.5], [5.2, 1.0, 6.4], [0, 1.6, 0])} pose="shock" expression="shock" /> },
    { at: 29.6, name: "Schwarzer Himmel", render: (s) => <ElevatorWorld shot={s} mode="high" cam={move([14, -3, 18], [18, -2, 24], [0, -4, 0], undefined, 40)} pose="lookUp" /> },
    { at: 32.6, name: "Blick durch Glasboden", render: (s) => <ElevatorWorld shot={s} mode="high" cam={move([0.9, 2.3, 0.95], [0.8, 2.35, 0.85], [-0.2, -3, -0.2], undefined, 55)} pose="shock" expression="shock" /> },
    {
      at: 36.0, name: "Weit: ISS-Bahn", transition: "dip",
      render: (s) => (
        <ElevatorWorld shot={s} mode="high" marker rings
          cam={({ h, p }) => {
            const hk = h / 1000;
            return { units: "km", pos: [9000 + p * 800, 2500 - (R + hk), 15000 + p * 600], look: [0, -hk * 0.5 - 1500, 0], fov: 45 };
          }} />
      ),
    },
    { at: 39.5, name: "Erde unter ihm", render: (s) => <ElevatorWorld shot={s} mode="high" cam={move([6, 9, 8], [7, 10, 9.5], [0, -40, 0])} pose="idle" /> },
    // ── Extrem ──
    {
      at: 43.0, name: "Fahrstuhlmusik",
      render: (s) => (
        <ElevatorWorld shot={s} mode="high" cam={move([0.8, 1.6, 1.0], [0.7, 1.62, 0.9], [-0.1, 1.5, -1.2])}
          pose={(t) => (t < 44.9 ? "idle" : "press")} maxRotY={(t) => (t < 44.6 ? 0 : t < 44.9 ? Math.PI * ((t - 44.6) / 0.3) : Math.PI)} />
      ),
    },
    {
      at: 46.5, name: "Weit: Satelliten", transition: "dip",
      render: (s) => (
        <ElevatorWorld shot={s} mode="high" marker rings
          cam={({ h, p }) => {
            const hk = h / 1000;
            return { units: "km", pos: [70000 + p * 6000, 30000 - (R + hk), 110000], look: [0, -(R + hk) + 15000 + p * 15000, 0], fov: 45 };
          }} />
      ),
    },
    { at: 51.0, name: "Erde als Murmel", render: (s) => <ElevatorWorld shot={s} mode="high" cam={move([4, 6, 6], [4.4, 6.5, 6.8], [0, -30, 0])} pose="idle" expression="shock" /> },
    { at: 54.0, name: "Mond kommt", render: (s) => <ElevatorWorld shot={s} mode="high" cam={move([3, -5, 4], [3.4, -6, 4.6], [0, 30, 0], undefined, 50)} pose="lookUp" expression="shock" /> },
    // ── Payoff ──
    { at: ARRIVE, transition: "flash", name: "Mond", render: (s) => <MoonLanding shot={s} /> },
  ],

  upload: {
    caption: "Was wäre, wenn dein Aufzug alle 2 Sekunden doppelt so schnell wird? 🛗🚀 Bis wohin würdest du mitfahren?",
    hashtags: ["#waswärewenn", "#simulation", "#weltall", "#wissen", "#3danimation", "#fyp"],
  },
};
