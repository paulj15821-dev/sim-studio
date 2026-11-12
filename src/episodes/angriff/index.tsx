// „Was wäre, wenn Deutschland angegriffen wird?“
// Format B (Zeit seit dem Alarm). Sachlicher Zivilschutz-Ablauf, kein konkreter Angreifer, keine Opfer im Bild:
// Warnung → Sirenen → Flugabwehr fängt ab → Schutzräume (nur jeder 176. hat Platz) → Keller →
// Bundestag: Verteidigungsfall → NATO Artikel 5 → Jets → Hamsterkäufe → Pointe: Einberufung, Max ist 24.
import React from "react";
import type { Episode } from "../../types";
import { clamp, lerp, type Vec3 } from "../../lib/anim";
import { Hometown, type Actor } from "../asteroid/world";
import type { Pose } from "../../three/kit";
import {
  Bedroom, SirenMast, Intercept, BunkerScene, Count176, Cellar, Parliament, EarthNato, Airbase, Market, Truck, move,
  type InterceptSpec,
} from "./world";
import { SINCE, ALARM_CLOCK, fmtSince, fmtClock } from "./metric";

const RED = "#FF3B30";
const P = (seed: number, pos: Vec3, rotY: number, pose: Actor["pose"], hold?: Actor["hold"], expr?: Actor["expr"]): Actor => ({ kind: "person", seed, pos, rotY, pose, hold, expr, screen: RED });

/** Abfangen über dem Wohnviertel (Cold Open) */
const SKY: InterceptSpec = { launch: [-650, 0, -420], hit: [-346, 215, -12], from: [-800, 520, 380], tHit: 6.4, fly: 1.5 };
const SKY2: InterceptSpec = { launch: [-700, 0, -520], hit: [-430, 260, 70], from: [-900, 600, 420], tHit: 7.0, fly: 1.6 };

// Bunker: Max rennt ans Ende der Schlange
const bunkerMax = (t: number) => {
  const l = clamp((t - 7.8) / 1.9);
  const pos: Vec3 = [lerp(2.4, 1.0, l), 0, lerp(34.4, 30.6, l)];
  return { pos, rotY: Math.PI + (l < 1 ? 0.36 : 0.25), pose: (l < 1 ? "run" : "lookUp") as Pose };
};
// Keller: Max kommt durch die Tür, bleibt stehen, schaut zur Decke
const cellarMax = (t: number) => {
  const l = clamp((t - 13.0) / 1.2);
  const pos: Vec3 = [lerp(-1.6, -0.45, l), 0, lerp(-2.5, -0.9, l)];
  return { pos, rotY: l < 1 ? 0.62 : 0.45, pose: (l < 1 ? "walk" : "lookUp") as Pose };
};

export const angriff: Episode = {
  id: "Angriff",
  title: "Was wäre, wenn Deutschland angegriffen wird?",
  duration: 35.4,
  coldOpen: { at: 6.5, dur: 1.0 },
  hook: { text: "Was wäre, wenn Deutschland angegriffen wird?", highlight: ["angegriffen"], until: 2.8 },

  hud: {
    label: "Seit dem Alarm",
    value: SINCE,
    format: fmtSince,
    compare: [
      { at: 0, text: "Warnung aufs Handy" },
      { at: 30, text: "Sirenen heulen" },
      { at: 200, text: "Flugabwehr feuert" },
      { at: 300, text: "Ab in den Schutzraum" },
      { at: 900, text: "Im Keller" },
      { at: 17_000, text: "Bundestag tagt" },
      { at: 20_000, text: "Verteidigungsfall" },
      { at: 100_000, text: "NATO: Artikel 5" },
      { at: 114_000, text: "Hamsterkäufe" },
      { at: 186_000, text: "Post von der Bundeswehr" },
    ],
    secondary: { label: "Uhrzeit", value: (t) => ALARM_CLOCK + SINCE(t), format: (v) => `Tag ${Math.floor(v / 86_400) + 1} · ${fmtClock(v % 86_400)}` },
  },

  captions: [
    { at: 0.2, text: "3:12 Uhr. Alle Handys schrillen." },
    { at: 1.5, text: "Warnstufe: Extreme Gefahr.", highlight: ["Extreme", "Gefahr."] },
    { at: 2.8, text: "Draußen heulen die Sirenen." },
    { at: 4.0, text: "Eine Minute lang. Auf und ab." },
    { at: 5.2, text: "Über der Stadt: die Flugabwehr." },
    { at: 6.6, text: "Abgefangen.", highlight: ["Abgefangen."] },
    { at: 7.9, text: "Max rennt zum Schutzraum." },
    { at: 9.1, text: "Es gibt 579 öffentliche Schutzräume.", highlight: ["579"] },
    { at: 10.5, text: "Platz für 478.000 Menschen." },
    { at: 11.8, text: "Bei 84 Millionen: nur jeder 176.", highlight: ["jeder", "176."] },
    { at: 13.1, text: "Plan B: der eigene Keller." },
    { at: 14.3, text: "Keine Fenster. Tür zu. Warten." },
    { at: 15.6, text: "8 Uhr: Der Bundestag tagt." },
    { at: 16.9, text: "Zwei Drittel stimmen: Verteidigungsfall.", highlight: ["Verteidigungsfall."] },
    { at: 18.4, text: "Den Oberbefehl hat jetzt der Kanzler." },
    { at: 20.8, text: "NATO, Artikel 5: Angriff auf einen…", highlight: ["Artikel", "5:"] },
    { at: 22.4, text: "…ist ein Angriff auf alle 32.", highlight: ["32."] },
    { at: 24.4, text: "Kampfjets aus ganz Europa starten." },
    { at: 26.1, text: "Tag 2: Die Regale sind leer." },
    { at: 27.4, text: "Empfohlen: Vorrat für 10 Tage.", highlight: ["10", "Tage."] },
    { at: 28.7, text: "Max ergattert: eine Tiefkühlpizza." },
    { at: 31.2, text: "Tag 3: Post für Max." },
    { at: 32.5, text: "Die Wehrpflicht gilt wieder.", highlight: ["Wehrpflicht"] },
    { at: 33.9, text: "Max ist 24.", italic: true },
  ],

  shots: [
    // ── 1 Alltag: 03:12 Uhr ──
    {
      at: 0, name: "Schlafzimmer, Handy schreit", ambience: "amb_night", ambienceVolume: 0.35,
      render: (s) => <Bedroom shot={s} cam={move([1.7, 1.7, 2.3], [1.35, 1.6, 1.7], [0.1, 1.15, -1.0], [0.1, 1.2, -1.0], 50)} />,
    },
    {
      at: 2.6, name: "Straße, Sirene", ambience: "amb_night", ambienceVolume: 0.4,
      render: (s) => (
        <Hometown shot={s} mood="night" grill={false} cam={move([4.8, 1.3, 23.5], [4.0, 1.4, 21.6], [1.0, 5.0, 6], [0.9, 5.8, 6], 50)}
          actors={[
            { kind: "max", pos: (t) => [0.2 + (t - 2.6) * 0.2, 0, 4.6 + (t - 2.6) * 1.15], rotY: 0.15, pose: "walk", expr: "shock", hold: "phone", screen: RED },
            P(7, [-3.6, 0, 10.4], 0.5, "lookUp"), P(19, [4.2, 0, 15.2], Math.PI - 0.4, "phone", "phone"), P(23, [-9, 0, 13.6], 0.9, "lookUp"),
          ]}
          extra={(t) => <SirenMast position={[2.4, 6.9, -0.6]} h={3.4} t={t} on />} />
      ),
    },
    // ── 2 Meilensteine ──
    {
      at: 5.0, name: "Abfangen am Himmel", ambience: "tension", ambienceVolume: 0.5,
      render: (s) => (
        <Hometown shot={s} mood="night" grill={false} ao={0} cam={move([8.2, 0.9, 17.2], [7.3, 0.95, 17.4], [-20, 15, 15.2], [-20, 16.5, 15.6], 56)}
          actors={[
            { kind: "max", pos: [3.9, 0, 16.95], rotY: -Math.PI / 2 + 0.25, pose: "lookUp", expr: "shock" },
            P(7, [-3.5, 0, 15.2], -Math.PI / 2 - 0.2, "lookUp"), P(11, [-7.5, 0, 19.2], -Math.PI / 2 + 0.4, "point"), P(29, [-1.2, 0, 20.2], -Math.PI / 2, "phone", "phone"),
          ]}
          extra={(t) => (<><Intercept spec={SKY} t={t} /><Intercept spec={SKY2} t={t} scale={0.8} /></>)} />
      ),
    },
    {
      at: 7.8, name: "Schutzraum, Schlange", ambience: "amb_crowd", ambienceVolume: 0.4,
      render: (s) => (
        <BunkerScene shot={s} max={bunkerMax} cam={move([3.3, 1.75, 38.4], [2.9, 1.85, 36.0], [0.2, 2.6, 10], [0.0, 3.4, 10], 46)} />
      ),
    },
    // ── 3 Wissen ──
    {
      at: 10.4, name: "176 Menschen, ein Platz", ambience: "tension", ambienceVolume: 0.45,
      render: (s) => <Count176 shot={s} cam={move([-0.2, 1.75, 3.6], [1.4, 15.5, 12.5], [-0.75, 1.5, 0.6], [0.1, 0, -7.5], 46)} />,
    },
    {
      at: 13.0, name: "Keller", ambience: "amb_interior", ambienceVolume: 0.4,
      render: (s) => <Cellar shot={s} max={cellarMax} quake={1} cam={move([1.75, 1.35, 1.7], [1.35, 1.3, 1.1], [-0.7, 1.15, -1.3], [-0.5, 1.3, -1.1], 50)} />,
    },
    {
      at: 15.4, transition: "dip", name: "Parlament, Morgen", ambience: "amb_city", ambienceVolume: 0.4,
      render: (s) => <Parliament shot={s} cam={move([120, 46, 200], [86, 32, 150], [0, 14, 0], [0, 16, 4], 40)} />,
    },
    {
      at: 18.2, name: "Parlament, Presse", ambience: "amb_crowd", ambienceVolume: 0.45,
      render: (s) => <Parliament shot={s} cam={move([20, 2.4, 76], [15, 3.4, 66], [0, 20, 12], [0, 25, 6], 48)} />,
    },
    // ── 4 Extrem ──
    { at: 20.6, name: "Erde, Artikel 5", ambience: "amb_space", render: (s) => <EarthNato shot={s} /> },
    { at: 23.2, name: "Kampfjet startet", ambience: "amb_wind", ambienceVolume: 0.35, render: (s) => <Airbase shot={s} /> },
    {
      at: 26.0, name: "Supermarkt leer", ambience: "muzak", ambienceVolume: 0.35,
      render: (s) => <Market shot={s} maxPos={(t) => [0, 0, 6 - (t - 26) * 1.1]} maxPose="walk" maxRot={Math.PI} cam={move([0.4, 4.0, 13.4], [0.2, 3.5, 11.0], [0, 0.9, -4], [0, 1.0, -5], 50)} />,
    },
    {
      at: 28.6, name: "Max mit Pizza", ambience: "muzak", ambienceVolume: 0.35,
      render: (s) => <Market shot={s} maxPos={() => [0, 0, -8.8]} maxPose="carry" maxRot={0.1} cam={move([1.0, 1.55, -5.9], [0.65, 1.55, -6.8], [0, 1.3, -8.8], [0, 1.4, -8.8], 46)} />,
    },
    // ── 5 Payoff ──
    {
      at: 31.0, name: "Briefkasten, Lkw", ambience: "amb_nature", ambienceVolume: 0.4,
      render: (s) => (
        <Hometown shot={s} mood="golden" grill={false} cam={move([6.6, 1.7, 21.5], [5.4, 1.65, 19.6], [0.9, 1.4, 11.5], [1.0, 1.45, 11.8], 44)}
          actors={[
            {
              kind: "max", rotY: 0.1, hold: "letter",
              pos: (t) => [lerp(0.2, 0.95, clamp((t - 31) / 1.3)), 0, lerp(7.8, 12.0, clamp((t - 31) / 1.3))],
              pose: (t) => (t < 32.3 ? "walk" : t < 32.7 ? "press" : "phone"),
            },
          ]}
          extra={(t) => <Truck position={[-34 + (t - 31) * 26, 0, 15.6]} rotationY={Math.PI / 2} t={t} />} />
      ),
    },
    {
      at: 33.3, name: "Einberufung", ambience: "amb_nature", ambienceVolume: 0.3,
      render: (s) => (
        <Hometown shot={s} mood="golden" grill={false} cam={move([0.55, 1.6, 14.7], [0.6, 1.62, 14.2], [0.68, 1.5, 12.0], [0.7, 1.52, 12.0], 40)}
          actors={[{ kind: "max", pos: [0.95, 0, 12.0], rotY: 0.1, hold: "letter", pose: (t) => (t < 33.85 ? "phone" : "shock"), expr: "shock" }]} />
      ),
    },
  ],

  sfx: [
    // Handy-Warnung (Cell Broadcast)
    { at: 0.0, sound: "alarm", volume: 0.5 },
    { at: 0.05, sound: "buzz", volume: 0.4 },
    { at: 1.0, sound: "buzz", volume: 0.35 },
    { at: 1.6, sound: "alarm", volume: 0.42, rate: 1.06 },
    // Sirene (Heulton) läuft über Straße + Himmel
    { at: 2.5, sound: "siren_wail", volume: 0.42 },
    { at: 2.9, sound: "alarm", volume: 0.18, rate: 0.9 },
    { at: 3.2, sound: "door", volume: 0.3 },
    ...[3.5, 4.0, 4.5].map((at, i) => ({ at, sound: "step" as const, volume: 0.22, rate: i % 2 ? 0.95 : 1.05 })),
    // Flugabwehr
    { at: 4.95, sound: "siren_wail", volume: 0.25, rate: 0.98 },
    { at: 5.0, sound: "whoosh_long", volume: 0.35, rate: 0.6 },
    { at: 5.1, sound: "rumble", volume: 0.4, rate: 1.2 },
    { at: 5.5, sound: "riser", volume: 0.35, rate: 1.4 },
    { at: 6.4, sound: "boom", volume: 0.45, rate: 0.9 },
    { at: 6.42, sound: "flash", volume: 0.3 },
    { at: 6.45, sound: "sub_drop", volume: 0.25 },
    { at: 7.0, sound: "boom", volume: 0.25, rate: 1.1 },
    { at: 7.3, sound: "rumble", volume: 0.35 },
    // Rennen zum Bunker
    ...[7.85, 8.15, 8.45, 8.75, 9.05, 9.35, 9.65].map((at, i) => ({ at, sound: "step" as const, volume: 0.32, rate: i % 2 ? 0.95 : 1.12 })),
    { at: 9.1, sound: "heartbeat", volume: 0.35 },
    // 176
    { at: 10.4, sound: "whoosh_long", volume: 0.4, rate: 0.8 },
    { at: 11.0, sound: "zap", volume: 0.3, rate: 1.3 },
    { at: 11.8, sound: "heartbeat", volume: 0.4 },
    // Keller
    { at: 13.0, sound: "door", volume: 0.4, rate: 0.85 },
    ...[13.25, 13.6, 13.95].map((at, i) => ({ at, sound: "step" as const, volume: 0.28, rate: i % 2 ? 0.9 : 1.0 })),
    { at: 14.2, sound: "door", volume: 0.35, rate: 0.7 },
    { at: 14.5, sound: "rumble", volume: 0.32, rate: 0.7 },
    { at: 14.6, sound: "thud", volume: 0.3, rate: 0.7 },
    // Bundestag
    { at: 16.9, sound: "thud", volume: 0.4, rate: 1.3 }, // Glocke/Hammer
    { at: 17.2, sound: "ding", volume: 0.3, rate: 0.8 },
    ...[18.3, 18.55, 18.7, 19.1, 19.35].map((at, i) => ({ at, sound: "camera" as const, volume: 0.28, rate: [1, 1.1, 0.95, 1.05, 1][i] })),
    // NATO
    { at: 20.6, sound: "whoosh_long", volume: 0.4, rate: 0.75 },
    { at: 21.2, sound: "swoosh_up", volume: 0.3 },
    ...[21.5, 21.75, 21.95, 22.15, 22.3, 22.45, 22.6].map((at, i) => ({ at, sound: "pop" as const, volume: 0.22, rate: 1 + i * 0.07 })),
    // Jet
    { at: 23.2, sound: "plane", volume: 0.55, rate: 1.25 },
    { at: 23.25, sound: "rumble", volume: 0.5, rate: 1.1 },
    { at: 24.6, sound: "sonic_boom", volume: 0.22, rate: 1.3 },
    // Supermarkt
    { at: 26.3, sound: "beep", volume: 0.25 },
    { at: 26.8, sound: "screech", volume: 0.12, rate: 1.6 }, // Einkaufswagen
    { at: 27.9, sound: "beep", volume: 0.22 },
    { at: 28.7, sound: "ding", volume: 0.4, rate: 1.2 },
    // Briefkasten + Lkw
    { at: 31.0, sound: "car_pass", volume: 0.5, rate: 0.6 },
    ...[31.15, 31.5, 31.85, 32.2].map((at, i) => ({ at, sound: "step" as const, volume: 0.22, rate: i % 2 ? 0.95 : 1.05 })),
    { at: 32.4, sound: "door", volume: 0.25, rate: 1.6 },
    { at: 32.75, sound: "crunch", volume: 0.12, rate: 1.8 }, // Papier
    // Pointe
    { at: 33.85, sound: "sub_drop", volume: 0.4 },
    { at: 33.9, sound: "bonk", volume: 0.3, rate: 0.8 },
  ],

  sound: { volume: 0.9 },

  upload: {
    caption: "Was wäre, wenn Deutschland angegriffen wird? 🇩🇪 Nur jeder 176. hätte einen Bunkerplatz. Wärst du vorbereitet?",
    hashtags: ["#waswärewenn", "#deutschland", "#zivilschutz", "#simulation", "#wissen", "#fyp"],
  },
};
