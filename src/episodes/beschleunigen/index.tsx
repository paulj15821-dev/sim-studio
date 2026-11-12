// „Was wäre, wenn du nie aufhörst zu beschleunigen?“
// Format A: Max' Tempo verdoppelt sich jede Sekunde (Start 3 m/s). Relativistisch: er nähert sich c, erreicht es nie –
// dafür rast die Zeit auf der Erde. Pointe: 5 Mrd. Jahre später an der Haltestelle – den Bus hat er trotzdem verpasst.
import React from "react";
import type { Episode } from "../../types";
import { clamp } from "../../lib/anim";
import { C_LIGHT, fmtLength } from "../../lib/metric";
import { GroundRun, SpaceRun, TimeLapse, Finale, move } from "./world";
import { V, X, EARTH_TIME, EARTH_END, TURN, T_SOUND, T_ORBIT, T_1PCT, T_MOON, fmtV, fmtEarth, fmtSec } from "./metric";

const C = C_LIGHT;
const HUD_SWITCH = 29.6; // Tempo → Erdzeit
const SIT_AT = 34.3;

export const beschleunigen: Episode = {
  id: "Beschleunigen",
  title: "Was wäre, wenn du nie aufhörst zu beschleunigen?",
  duration: 36.6,
  coldOpen: { at: 24.2, dur: 1.0 },
  hook: { text: "Was wäre, wenn du nie aufhörst zu beschleunigen?", highlight: ["beschleunigen?"], until: 2.6 },

  hud: [
    {
      label: "Tempo",
      value: V,
      format: fmtV,
      compare: [
        { at: 0, text: "Joggen zum Bus" },
        { at: 12.4, text: "Schneller als Usain Bolt" },
        { at: 83.4, text: "Schneller als ein ICE" },
        { at: 343, text: "Schallmauer!" },
        { at: 1000, text: "Schneller als eine Gewehrkugel" },
        { at: 7_900, text: "Orbitgeschwindigkeit" },
        { at: 11_200, text: "Fluchtgeschwindigkeit" },
        { at: 192_000, text: "Schneller als jede Raumsonde" },
      ],
      pill: { every: 1, text: (s) => `×2 Tempo in ${s} s` },
      secondary: { label: "Strecke", value: X, format: fmtLength },
      scaleBar: { from: 3, to: C },
      until: T_1PCT - 0.001,
    },
    {
      label: "Tempo · % Lichtgeschw.",
      value: V,
      format: fmtV,
      compare: [
        { at: 0, text: "1 % Lichtgeschwindigkeit" },
        { at: 0.1 * C, text: "Licht wird blau" },
        { at: 0.5 * C, text: "Halbe Lichtgeschwindigkeit" },
        { at: 0.99 * C, text: "Schneller geht es nicht" },
      ],
      pill: { every: 1, text: (s) => `×2 Tempo in ${s} s` },
      secondary: { label: "Strecke", value: X, format: fmtLength },
      scaleBar: { from: 3, to: C },
      from: T_1PCT,
      until: HUD_SWITCH - 0.001,
    },
    {
      label: "Zeit auf der Erde",
      value: EARTH_TIME,
      format: fmtEarth,
      compare: [
        { at: 0, text: "Für Max steht die Zeit fast still" },
        { at: 365.25 * 86400, text: "Ein Jahr vorbei" },
        { at: 1e4 * 365.25 * 86400, text: "Alle, die er kennt: längst weg" },
        { at: EARTH_END * 0.999, text: "Die Sonne: ein Roter Riese" },
      ],
      secondary: { label: "Zeit für Max", value: (t) => Math.min(t, TURN), format: fmtSec },
      scaleBar: { from: 60, to: EARTH_END },
      from: HUD_SWITCH,
    },
  ],

  captions: [
    { at: 0.2, text: "Max verpasst den Bus." },
    { at: 1.3, text: "Er rennt. Jede Sekunde doppelt so schnell.", highlight: ["doppelt", "so", "schnell."] },
    { at: 3.0, text: "Bus? Überholt.", highlight: ["Überholt."] },
    { at: 4.8, text: "300 km/h. Der ICE? Auch.", highlight: ["ICE?"] },
    { at: T_SOUND, text: "BOOM. Die Schallmauer.", highlight: ["BOOM."] },
    { at: 8.4, text: "Schneller als eine Gewehrkugel." },
    { at: 9.8, text: "Die Luft glüht. Seine Sneaker auch.", highlight: ["glüht."] },
    { at: T_ORBIT, text: "7,9 km/s: Die Erde krümmt sich weg." },
    { at: 12.5, text: "Max hebt ab.", highlight: ["hebt", "ab."] },
    { at: 13.6, text: "Zoomen wir raus. Tschüss, Erde." },
    { at: 15.9, text: "Schneller als jede Raumsonde." },
    { at: 17.4, text: "Er rennt im Vakuum. Fragt nicht.", italic: true },
    { at: T_1PCT, text: "1 % Lichtgeschwindigkeit.", highlight: ["1", "%"] },
    { at: 21.9, text: "Einmal um die Erde? 3 Sekunden." },
    { at: 23.3, text: "Das Licht vor ihm wird blau.", highlight: ["blau."] },
    { at: 25.4, text: "Der Mond…" },
    { at: T_MOON - 0.1, text: "…zack, vorbei.", highlight: ["vorbei."] },
    { at: 27.7, text: "99 %… 99,9 %… 99,99 %…" },
    { at: 28.9, text: "Licht holt er nie ein.", highlight: ["nie"] },
    { at: 30.0, text: "Aber auf der Erde rast die Zeit.", highlight: ["rast"] },
    { at: 31.0, text: "Jahre… Jahrtausende… Jahrmillionen…" },
    { at: 32.4, text: "Max kehrt um. 5 Mrd. Jahre später.", highlight: ["5", "Mrd.", "Jahre"] },
    { at: SIT_AT, text: "Den Bus hat er trotzdem verpasst.", italic: true },
  ],

  shots: [
    // ── Alltag ──
    { at: 0, name: "Bus fährt weg", ambience: "amb_city", render: (s) => <GroundRun shot={s} scenery="town" cam={move([5.6, 1.7, -4.6], [4.6, 1.6, -3.2], [-1.6, 1.4, -7], [-1.4, 1.4, -7.5], 50)} expression="shock" /> },
    { at: 2.3, name: "Bus überholt", ambience: "amb_city", render: (s) => <GroundRun shot={s} scenery="town" cam={move([6.8, 1.5, 2.2], [6.2, 1.4, 0.8], [-1.2, 1.5, -6], [-1.0, 1.4, -5], 48)} expression="happy" /> },
    // ── Meilensteine ──
    { at: 4.0, name: "ICE", ambience: "amb_wind", render: (s) => <GroundRun shot={s} scenery="rail" cam={move([5.5, 2.0, 3.5], [5.0, 1.8, 2.2], [-3.5, 1.8, -6], [-3, 1.6, -5], 46)} expression="happy" /> },
    { at: 5.8, name: "Vor der Schallmauer", ambience: "amb_wind_strong", render: (s) => <GroundRun shot={s} scenery="country" cam={move([3.6, 0.7, -6.5], [3.0, 0.9, -5.2], [-0.4, 1.2, 0], [-0.2, 1.2, 0], 50)} expression="shock" /> },
    { at: T_SOUND, transition: "flash", name: "Überschallknall (Drohne)", ambience: "amb_wind_strong", render: (s) => <GroundRun shot={s} scenery="country" cam={move([38, 22, 22], [58, 40, 44], [-8, 0, -24], [-10, 0, -30], 46)} /> },
    { at: 9.6, name: "Glühen", ambience: "fire", ambienceVolume: 0.45, render: (s) => <GroundRun shot={s} scenery="country" warm={0.7} cam={move([3.4, 1.0, -1.8], [3.6, 1.1, -2.6], [-0.6, 1.1, -0.2], [-0.6, 1.1, -0.6], 46)} expression="shock" /> },
    // ── Wissen ──
    { at: T_ORBIT - 0.15, name: "Abheben", ambience: "amb_wind_strong", render: (s) => <GroundRun shot={s} scenery="country" lift warm={0.3} cam={move([4.0, 0.4, 7.5], [5.5, 2.5, 11], [-0.8, 1.0, -4], [-1, -1, -6], 52)} pose="run" /> },
    {
      at: 13.4, transition: "dip", name: "Zoom raus: Erde", ambience: "amb_space",
      render: (s) => <SpaceRun shot={s} units="km" marker cam={({ p }) => ({ pos: [400 + p * 9000, 250 + p * 5000, -900 + p * 21000], look: [0, -800 - p * 4500, 300 + p * 1500], fov: 45 })} />,
    },
    { at: 15.6, name: "Rennen im All", ambience: "amb_space", render: (s) => <SpaceRun shot={s} cam={move([2.4, 0.4, -4.2], [2.9, 0.7, -5.2], [-0.6, -0.6, 0], [-0.6, -0.9, 0], 48)} /> },
    { at: 18.6, name: "Erde schrumpft", ambience: "amb_space", render: (s) => <SpaceRun shot={s} cam={move([0.9, 1.5, -6.5], [1.2, 2.0, -9], [-0.9, -1.6, 4], [-1, -2.2, 4], 50)} warp={(t) => clamp((t - 20.5) / 2) * 0.25} /> },
    // ── Extrem ──
    { at: 22.0, name: "Doppler-Tunnel", ambience: "tension", ambienceVolume: 0.5, render: (s) => <SpaceRun shot={s} noEarth cam={move([1.4, 0.9, 3.6], [1.0, 0.7, 2.6], [-0.6, 0.3, -20], [-0.5, 0.2, -20], 52)} warp={(t) => 0.35 + clamp((t - 22) / 3) * 0.45} /> },
    {
      at: 25.0, name: "Mond", ambience: "tension", ambienceVolume: 0.6,
      render: (s) => <SpaceRun shot={s} noEarth cam={move([-1.8, 1.2, 4.2], [-2.0, 1.0, 3.6], [-1.6, 0.4, -12], [-2.4, 0.4, -10], 56)} warp={0.7} moonZ={(p) => (p - (T_MOON - 25) / 2) * 52000} />,
    },
    { at: 27.0, transition: "whip", name: "Lichtmauer", ambience: "tension", ambienceVolume: 0.75, render: (s) => <SpaceRun shot={s} noEarth expression="shock" cam={move([1.3, 0.6, -2.9], [1.1, 0.5, -2.3], [-0.5, 0.35, 0], [-0.45, 0.3, 0], 46)} warp={1} /> },
    // ── Payoff ──
    { at: HUD_SWITCH, transition: "flash", name: "Zeitraffer Haltestelle", ambience: "amb_wind", ambienceVolume: 0.4, render: (s) => <TimeLapse shot={s} /> },
    { at: 32.2, transition: "dip", name: "Roter Riese", ambience: "amb_lava", ambienceVolume: 0.45, render: (s) => <Finale shot={s} sitAt={SIT_AT} /> },
  ],

  sfx: [
    { at: 0.0, sound: "door", volume: 0.5 },
    { at: 0.15, sound: "rumble", volume: 0.3 },
    ...[0.35, 0.78, 1.16, 1.5, 1.8, 2.06, 2.3, 2.52, 2.72, 2.9, 3.06, 3.2].map((at, i) => ({ at, sound: "step" as const, volume: 0.5, rate: 1 + i * 0.04 })),
    { at: 3.0, sound: "car_pass", volume: 0.6 },
    { at: 3.4, sound: "horn", volume: 0.35 },
    { at: 4.2, sound: "car_pass", volume: 0.5, rate: 0.7 },
    { at: 5.3, sound: "whoosh_hard", volume: 0.45 },
    { at: T_SOUND - 2.6, sound: "riser", volume: 0.5 },
    { at: T_SOUND, sound: "sonic_boom", volume: 0.65 },
    { at: T_SOUND + 0.1, sound: "rumble", volume: 0.45 },
    { at: 9.65, sound: "swoosh_up", volume: 0.4 },
    { at: T_ORBIT - 0.1, sound: "swoosh_up", volume: 0.55 },
    { at: 12.4, sound: "whoosh_long", volume: 0.45 },
    { at: 15.0, sound: "zap", volume: 0.25 },
    { at: 17.45, sound: "bonk", volume: 0.3 },
    { at: T_1PCT, sound: "zap", volume: 0.45 },
    { at: 22.0, sound: "whoosh_long", volume: 0.5 },
    { at: T_MOON - 2.5, sound: "riser", volume: 0.45 },
    { at: T_MOON, sound: "whoosh_hard", volume: 0.7 },
    { at: T_MOON + 0.05, sound: "sub_drop", volume: 0.35 },
    { at: 27.4, sound: "heartbeat", volume: 0.55 },
    { at: 28.2, sound: "heartbeat", volume: 0.55 },
    { at: 28.9, sound: "heartbeat", volume: 0.5 },
    { at: HUD_SWITCH - 2.6, sound: "riser", volume: 0.4 },
    { at: HUD_SWITCH + 0.05, sound: "glitch", volume: 0.4 },
    { at: 30.6, sound: "whoosh_long", volume: 0.45, rate: 1.3 },
    { at: 31.2, sound: "whoosh_long", volume: 0.5, rate: 1.7 },
    { at: 32.3, sound: "thud", volume: 0.3 },
    ...[33.45, 33.75, 34.0].map((at) => ({ at, sound: "step" as const, volume: 0.4, rate: 0.9 })),
    { at: SIT_AT + 0.05, sound: "crunch", volume: 0.35 },
    { at: SIT_AT + 0.6, sound: "ding", volume: 0.4 },
  ],

  upload: {
    caption: "Was wäre, wenn du nie aufhörst zu beschleunigen? 🏃💨 Ab welcher Sekunde hättest du gebremst?",
    hashtags: ["#waswärewenn", "#simulation", "#lichtgeschwindigkeit", "#physik", "#3danimation", "#fyp"],
  },
};
