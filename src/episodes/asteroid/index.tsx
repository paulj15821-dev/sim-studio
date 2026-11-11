// „Was wäre, wenn heute Abend ein Asteroid einschlägt?“
// Format B (Countdown → Zeit danach). 10-km-Brocken, 72.000 km/h, Einschlag 1.000 km von Max entfernt.
// Pointe: Max hat kurz vorher Pizza bestellt.
import React from "react";
import type { Episode } from "../../types";
import { clamp } from "../../lib/anim";
import { fmtLength } from "../../lib/metric";
import { Hometown, Living, SpaceScene, OceanImpact, move, type Actor } from "./world";
import { TAU, DIST, AFTER, IMPACT, fmtClock, fmtPlusClock } from "./metric";

const NEIGHBOR = (seed: number, pos: [number, number, number], rotY: number, pose: Actor["pose"], hold?: Actor["hold"], expr?: Actor["expr"]): Actor => ({ kind: "person", seed, pos, rotY, pose, hold, expr });

export const asteroid: Episode = {
  id: "Asteroid",
  title: "Was wäre, wenn heute Abend ein Asteroid einschlägt?",
  duration: 63,
  hook: { text: "Was wäre, wenn heute Abend ein Asteroid einschlägt?", highlight: ["Asteroid"], until: 2.8 },

  hud: [
    {
      label: "Einschlag in",
      value: TAU,
      format: fmtClock,
      compareDir: "down",
      compare: [
        { at: 1e9, text: "Kurs: Erde" },
        { at: 19_220, text: "Am Mond vorbei" },
        { at: 3_600, text: "Heller als jeder Stern" },
        { at: 1_800, text: "Bei den Satelliten" },
        { at: 20.4, text: "Auf Höhe der ISS" },
        { at: 5, text: "In der Atmosphäre" },
      ],
      secondary: { label: "Abstand", value: DIST, format: fmtLength },
      scaleBar: { from: 2e4, to: 1 },
      until: IMPACT - 0.01,
    },
    {
      label: "Nach dem Einschlag",
      value: AFTER,
      format: fmtPlusClock,
      compare: [
        { at: 0, text: "Feuerball" },
        { at: 200, text: "Erdbeben" },
        { at: 510, text: "Gesteinsregen" },
        { at: 1_800, text: "Pizza überfällig" },
        { at: 3_030, text: "Druckwelle" },
        { at: 3_600, text: "Pizza 30 Min. zu spät" },
      ],
      secondary: { label: "Entfernung", value: () => 1e6, format: fmtLength },
      from: IMPACT,
    },
  ],

  captions: [
    { at: 3.2, text: "Er ist gerade am Mond vorbei." },
    { at: 5.8, text: "Alle Handys piepen gleichzeitig." },
    { at: 7.1, text: "Max hält es für einen Probealarm." },
    { at: 8.6, text: "Der Asteroid: 10 km breit.", highlight: ["10 km"] },
    { at: 9.9, text: "Größer als der Mount Everest." },
    { at: 11.4, text: "Tempo: 72.000 km/h.", highlight: ["72.000 km/h."] },
    { at: 12.7, text: "Hamburg–München in 30 Sekunden." },
    { at: 15.0, text: "Noch eine Stunde.", highlight: ["eine Stunde."] },
    { at: 16.2, text: "Er ist jetzt heller als jeder Stern." },
    { at: 18.0, text: "36.000 km: mitten durch die Satelliten." },
    { at: 20.1, text: "Max bestellt noch schnell Pizza." },
    { at: 21.4, text: "Lieferzeit: 45 Minuten.", highlight: ["45 Minuten."] },
    { at: 23.1, text: "Zoomen wir raus." },
    { at: 24.0, text: "Noch 5 Minuten.", highlight: ["5 Minuten."] },
    { at: 26.4, text: "Noch eine Minute." },
    { at: 27.6, text: "Die ISS-Crew hat den besten Platz." },
    { at: 30.0, text: "100 km: Er trifft die Atmosphäre." },
    { at: 31.5, text: "Die Luft vor ihm: heißer als die Sonne.", highlight: ["heißer"] },
    { at: 33.0, text: "Die Nacht wird zum Tag." },
    { at: 35.3, text: "Einschlag.", highlight: ["Einschlag."] },
    { at: 36.6, text: "Energie: 5 Milliarden Hiroshima-Bomben.", highlight: ["5 Milliarden"] },
    { at: 38.4, text: "1.000 km entfernt…" },
    { at: 39.6, text: "…geht die Sonne ein zweites Mal auf." },
    { at: 41.4, text: "Der Krater: 180 km breit.", highlight: ["180 km"] },
    { at: 44.4, text: "Nach 3 Minuten: das Erdbeben." },
    { at: 45.8, text: "Stärker als jedes Beben je zuvor." },
    { at: 47.4, text: "Nach 8 Minuten: Es regnet Gestein." },
    { at: 48.9, text: "Glühend heiß. Überall brennt es.", highlight: ["brennt"] },
    { at: 50.6, text: "Nach 50 Minuten: die Druckwelle.", highlight: ["Druckwelle."] },
    { at: 52.0, text: "Max hält sich am Briefkasten fest." },
    { at: 54.0, text: "So endeten einst die Dinosaurier." },
    { at: 57.0, text: "Dann klingelt es." },
    { at: 58.3, text: "Der Pizzabote." },
    { at: 59.9, text: "„Sorry. War viel Verkehr.“", italic: true },
  ],

  shots: [
    // ── 1 Alltag: goldene Stunde ──
    {
      at: 0, name: "Garten, Max grillt",
      render: (s) => (
        <Hometown shot={s} mood="golden" cam={move([7.5, 1.5, 17.5], [5.4, 1.6, 14.2], [0.4, 1.9, 8.2], [0.6, 1.8, 8.4], 46)}
          actors={[{ kind: "max", pos: [1.3, 0, 8.6], rotY: 1.2, pose: "idle", expr: "happy" }, NEIGHBOR(7, [-7, 0, 9.5], 0.6, "wave")]}
          meteor={() => ({ elev: 20, size: 40, tail: 0 })} />
      ),
    },
    { at: 3.0, name: "Weltall: Mond", render: (s) => <SpaceScene shot={s} layout="moon" /> },
    {
      at: 5.6, name: "Handys",
      render: (s) => (
        <Hometown shot={s} mood="dusk" cam={move([2.6, 1.75, 12.2], [2.1, 1.7, 11.1], [0.6, 1.5, 8.5], [0.7, 1.45, 8.5], 46)}
          actors={[
            { kind: "max", pos: [0.9, 0, 8.6], rotY: 0.5, pose: "phone", hold: "phone" },
            NEIGHBOR(7, [-3.4, 0, 9.8], 0.4, "phone", "phone"),
            NEIGHBOR(19, [-5.5, 0, 14.5], 2.6, "phone", "phone"),
          ]}
          meteor={() => ({ elev: 20, size: 60, tail: 0 })} />
      ),
    },
    { at: 8.4, name: "Asteroid nah + Everest", render: (s) => <SpaceScene shot={s} layout="close" /> },
    // ── 2 Meilensteine ──
    {
      at: 11.2, name: "Drohne über Viertel",
      render: (s) => (
        <Hometown shot={s} mood="dusk" cam={move([26, 24, 52], [20, 20, 42], [-2, 2, 4], [-2, 3, 4], 48)}
          actors={[
            { kind: "max", pos: [0.6, 0, 13.6], rotY: Math.PI, pose: "lookUp" },
            NEIGHBOR(7, [-3, 0, 14.5], Math.PI, "lookUp"), NEIGHBOR(11, [4, 0, 19.6], Math.PI, "lookUp"), NEIGHBOR(13, [-9, 0, 20], 2.8, "phone", "phone"),
            NEIGHBOR(17, [8, 0, 13.4], -2.8, "lookUp"), NEIGHBOR(23, [-14, 0, 14], 3.0, "lookUp"),
          ]}
          meteor={() => ({ elev: 18, size: 110, tail: 120 })} />
      ),
    },
    {
      at: 14.0, name: "Straße, alle schauen hoch",
      render: (s) => (
        <Hometown shot={s} mood="night" cam={move([2.2, 0.5, 22.5], [1.7, 0.6, 21.2], [-1.5, 5.5, 6], [-1.8, 6.2, 6], 52)}
          actors={[
            { kind: "max", pos: [0.4, 0, 15.6], rotY: Math.PI + 0.2, pose: "lookUp", expr: "shock" },
            NEIGHBOR(7, [-2.4, 0, 16.2], Math.PI - 0.2, "lookUp"), NEIGHBOR(11, [3.5, 0, 17.4], Math.PI + 0.3, "point"), NEIGHBOR(29, [-5.5, 0, 18.4], 2.9, "lookUp"),
          ]}
          meteor={(t) => ({ elev: 28, az: -0.3, size: 150 + (t - 14) * 15, tail: 260 })} />
      ),
    },
    { at: 17.0, name: "Satelliten", render: (s) => <SpaceScene shot={s} layout="sats" /> },
    { at: 19.8, name: "Wohnzimmer, Pizza", render: (s) => <Living shot={s} cam={move([1.7, 1.55, 2.4], [1.25, 1.5, 1.7], [-0.6, 1.45, -1.4], [-0.6, 1.5, -1.5], 50)} /> },
    // ── 3 Wissen ──
    { at: 23.0, name: "Zoom-out Erde", render: (s) => <SpaceScene shot={s} layout="zoom" /> },
    { at: 25.8, name: "ISS", render: (s) => <SpaceScene shot={s} layout="iss" /> },
    { at: 28.6, name: "Eintritt", render: (s) => <SpaceScene shot={s} layout="entry" /> },
    {
      at: 31.8, name: "Nacht wird Tag",
      render: (s) => (
        <Hometown shot={s} mood="entry" cam={move([7, 1.0, 26], [6, 1.1, 24.5], [-1, 7, 4], [-1.5, 8, 4], 54)}
          actors={[
            { kind: "max", pos: [0.6, 0, 15.8], rotY: Math.PI + 0.25, pose: "shock", expr: "shock" },
            NEIGHBOR(7, [-2.8, 0, 16.4], Math.PI - 0.1, "shock", undefined, "shock"), NEIGHBOR(11, [3.6, 0, 17.6], Math.PI + 0.3, "lookUp"),
          ]}
          meteor={(t, local) => ({ elev: 40 - local * 13, az: 0.05 - local * 0.15, size: 380 + local * 260, tail: 900 })} />
      ),
    },
    {
      at: 33.6, name: "Über dem Meer", render: (s) => <OceanImpact shot={s} phase="incoming" cam={move([70, 7, 150], [64, 6.5, 136], [-12, 14, 0], [-6, 8, 0], 50)} />,
    },
    // ── 4 Extrem ──
    {
      at: IMPACT, transition: "flash", name: "Einschlag",
      render: (s) => <OceanImpact shot={s} phase="impact" cam={move([120, 14, 380], [140, 18, 450], [0, 95, 0], [0, 130, 0], 50)} />,
    },
    {
      at: 38.0, name: "Zweiter Sonnenaufgang",
      render: (s) => (
        <Hometown shot={s} mood="glow" cam={move([3.4, 1.2, 23], [2.8, 1.3, 21.4], [-5, 6, 2], [-5, 6.8, 2], 52)}
          actors={[
            { kind: "max", pos: [0.2, 0, 16.4], rotY: Math.PI - 0.35, pose: "shock", expr: "shock" },
            NEIGHBOR(7, [-3.4, 0, 15.6], Math.PI - 0.4, "lookUp"),
          ]} />
      ),
    },
    { at: 41.0, name: "Krater von oben", transition: "dip", render: (s) => <SpaceScene shot={s} layout="scar" /> },
    {
      at: 44.0, name: "Erdbeben",
      render: (s) => (
        <Hometown shot={s} mood="quake" shakeAmp={0.18} cam={move([5.5, 1.7, 22], [4.8, 1.6, 21], [-0.6, 2.6, 10], [-0.6, 2.4, 10], 52)}
          actors={[
            { kind: "max", pos: [0.6, 0, 15], rotY: 0.4, pose: (t) => (t < 45.2 ? "shock" : "fall"), expr: "shock" },
            NEIGHBOR(7, [-3.4, 0, 16], 0.8, "fall", undefined, "shock"),
          ]} />
      ),
    },
    {
      at: 47.0, name: "Feuerregen",
      render: (s) => (
        <Hometown shot={s} mood="fire" cam={({ t }) => {
          const mx = 7 - (t - 47) * 3.2;
          return { pos: [mx + 5, 1.3, 21.5], look: [mx - 1, 2.2, 15.6], fov: 50 };
        }}
          actors={[{ kind: "max", pos: (t) => [7 - (t - 47) * 3.2, 0, 15.4], rotY: -Math.PI / 2, pose: "run", expr: "shock" }]} />
      ),
    },
    {
      at: 50.2, name: "Druckwelle",
      render: (s) => (
        <Hometown shot={s} mood="blast" shakeAmp={0.08} wall={(l) => clamp(l / 3.0)} cam={move([4.2, 1.3, 19.6], [3.8, 1.25, 18.8], [0, 2.2, 8], [0, 2.6, 8], 52)}
          actors={[{ kind: "max", pos: [1.1, 0, 13.6], rotY: Math.PI + 0.3, pose: "brace", expr: "shock" }]} />
      ),
    },
    // ── 5 Payoff ──
    {
      at: 53.4, name: "Asche",
      render: (s) => (
        <Hometown shot={s} mood="ash" cam={move([6, 2.2, 23], [8, 6.5, 28], [0, 1.4, 13], [0, 1.2, 12], 48)}
          actors={[{ kind: "max", pos: [0.6, 0, 14.4], rotY: 0.35, pose: "idle", expr: "shock" }]} />
      ),
    },
    {
      at: 56.6, name: "Es klingelt",
      render: (s) => (
        <Hometown shot={s} mood="ash" door={(t) => clamp((t - 57.4) / 0.6)} cam={move([5.2, 1.8, 10], [4.4, 1.7, 9], [0, 1.4, 4.6], [0, 1.4, 4.6], 46)}
          actors={[
            { kind: "max", pos: (t) => [0, 0, t < 57.6 ? 3.0 : 3.0 + clamp((t - 57.6) / 0.6) * 1.0], rotY: 0, pose: (t) => (t < 58.2 ? "walk" : "idle"), expr: "shock" },
            { kind: "person", seed: 101, pos: (t) => [0, 0, Math.max(5.5, 11 - (t - 56.6) * 3.6)], rotY: Math.PI, pose: (t) => (t < 58.1 ? "walk" : "carry"), hold: "pizza" },
          ]} />
      ),
    },
    {
      at: 59.6, name: "Pizzabote",
      render: (s) => (
        <Hometown shot={s} mood="ash" door={() => 1} cam={move([0.45, 1.5, 3.66], [0.4, 1.52, 3.8], [0.08, 1.47, 6.0], [0.1, 1.49, 6.0], 50)}
          actors={[
            { kind: "max", pos: [-0.5, 0, 4.0], rotY: 0.1, pose: "idle" },
            { kind: "person", seed: 101, pos: [-0.1, 0, 6.0], rotY: Math.PI + 0.12, pose: "carry", hold: "pizza", expr: "happy" },
          ]} />
      ),
    },
  ],

  upload: {
    caption: "Was wäre, wenn heute Abend ein Asteroid einschlägt? ☄️🍕 Was würdest du in der letzten Stunde machen?",
    hashtags: ["#waswärewenn", "#asteroid", "#simulation", "#wissen", "#3danimation", "#fyp"],
  },
};
