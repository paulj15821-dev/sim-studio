// „Was wäre, wenn alle Menschen auf einmal verschwinden?“
// Format B (Zeitsprung). Max wartet an der Bushaltestelle – Plopp, alle weg (auch Max, er schaut als Geist zu).
// Die Welt ohne uns: Sekunden → 10.000 Jahre. Pointe: Alle sind zurück, die Anzeige sagt immer noch „2 min“.
import React from "react";
import type { Episode } from "../../types";
import { clamp, lerp, type Vec3 } from "../../lib/anim";
import { City, PlaneSky, EarthDark, Subway, Bridge, Desert, move, MAXP, type CamFn } from "./world";
import { GONE, POP, VANISH, BACK, PEOPLE, Y, DAY, fmtGone, fmtPeople } from "./metric";

const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const orbit = (r0: number, r1: number, h0: number, h1: number, a0: number, a1: number, look: Vec3, fov = 45): CamFn => ({ p }) => {
  const e = p * p * (3 - 2 * p);
  const r = lerp(r0, r1, e), a = lerp(a0, a1, p);
  return { pos: [Math.cos(a) * r, lerp(h0, h1, e), Math.sin(a) * r], look, fov };
};

const TOPPLE = 25.0;
const COLLAPSE = 23.0;

export const verschwinden: Episode = {
  id: "Verschwinden",
  title: "Was wäre, wenn alle Menschen auf einmal verschwinden?",
  duration: 36,
  coldOpen: { at: 26.0, dur: 1.0 },
  hook: { text: "Was wäre, wenn alle Menschen auf einmal verschwinden?", highlight: ["verschwinden?"], until: 2.6 },

  hud: [
    {
      label: "Menschen auf der Erde",
      value: POP,
      format: fmtPeople,
      compare: [{ at: 0, text: "Ganz normaler Dienstag" }],
      until: VANISH - 0.01,
    },
    {
      label: "Ohne Menschen seit",
      value: GONE,
      format: fmtGone,
      compare: [
        { at: 0, text: "Plötzlich: Stille" },
        { at: DAY, text: "Stromnetz fällt aus" },
        { at: 2 * DAY, text: "U-Bahn unter Wasser" },
        { at: 1 * Y, text: "Die Natur kommt zurück" },
        { at: 20 * Y, text: "Die Stadt ist ein Wald" },
        { at: 300 * Y, text: "Brücken stürzen ein" },
        { at: 1000 * Y, text: "Die Türme fallen" },
        { at: 10_000 * Y, text: "Was bleibt: Stein" },
      ],
      secondary: { label: "Menschen auf der Erde", value: () => 0, format: () => "0" },
      scaleBar: { from: 1, to: 10_000 * Y },
      from: VANISH,
      until: BACK - 0.01,
    },
    {
      label: "Bus 42 kommt in",
      value: () => 120,
      format: () => "2 Min.",
      compare: [{ at: 0, text: "Seit 10.000 Jahren" }],
      secondary: { label: "Menschen auf der Erde", value: () => PEOPLE, format: fmtPeople },
      from: BACK,
    },
  ],

  captions: [
    { at: 2.3, text: "Plopp. Alle Menschen: weg.", highlight: ["weg."] },
    { at: 3.7, text: "Auch Max. Er darf nur zuschauen." },
    { at: 5.1, text: "Flugzeuge fliegen weiter. Bis der Sprit ausgeht." },
    { at: 7.4, text: "Ohne Personal stoppen die Kraftwerke…" },
    { at: 8.6, text: "…nach 1 Tag: Licht aus.", highlight: ["1 Tag:"] },
    { at: 10.0, text: "Zoomen wir raus: Die Erde wird dunkel.", highlight: ["dunkel."] },
    { at: 12.1, text: "Ohne Pumpen läuft die U-Bahn voll." },
    { at: 14.3, text: "Nach 1 Jahr: Gras sprengt den Asphalt.", highlight: ["1 Jahr:"] },
    { at: 15.8, text: "Rehe grasen auf der Kreuzung." },
    { at: 17.0, text: "Nach 20 Jahren: Die Stadt wird Wald.", highlight: ["20 Jahren:"] },
    { at: 19.5, text: "Max' Plastikflasche liegt noch da…" },
    { at: 20.6, text: "…und hält 450 Jahre.", highlight: ["450 Jahre."] },
    { at: 21.9, text: "Nach 300 Jahren: Stahl rostet durch.", highlight: ["300 Jahren:"] },
    { at: 23.1, text: "Die Brücken stürzen ein." },
    { at: 24.7, text: "1.000 Jahre: Die letzten Türme fallen.", highlight: ["1.000 Jahre:"] },
    { at: 27.5, text: "10.000 Jahre: Fast alles ist weg.", highlight: ["10.000 Jahre:"] },
    { at: 28.9, text: "Nur die Pyramiden stehen noch.", highlight: ["Pyramiden"] },
    { at: 30.7, text: "Dann, plötzlich: Alle sind zurück.", highlight: ["zurück."] },
    { at: 32.2, text: "Max wartet immer noch auf den Bus." },
    { at: 33.8, text: "Anzeige: noch 2 Minuten.", highlight: ["2 Minuten."] },
    { at: 35.0, text: "Typisch.", italic: true },
  ],

  shots: [
    // ── 1 Alltag ──
    {
      at: 0, name: "Bushaltestelle, voll", ambience: "amb_city", ambienceVolume: 0.55,
      render: (s) => <City shot={s} cam={move([3.0, 1.5, 4.7], [3.6, 1.55, 3.9], [6.0, 1.25, 0.5], [6.1, 1.3, 0.5], 46)} />,
    },
    {
      at: VANISH, name: "Alle weg, Auto kracht", transition: "flash", ambience: "amb_wind", ambienceVolume: 0.3,
      render: (s) => (
        <City shot={s} cam={move([-2.6, 3.4, 10], [-2.0, 3.6, 8.4], [5.2, 1.0, -1.8], [5.2, 0.9, -3.0], 50)}
          ghost={(t) => ({ pos: MAXP, rotY: -0.75 + sm(3.6, 4.2, t) * -0.6, pose: t < 3.6 ? "shock" : "lookUp", op: 0.55 * sm(2.35, 2.85, t) })} />
      ),
    },
    // ── 2 Stunden, Tage ──
    {
      at: 5.0, name: "Flugzeug ohne Piloten", ambience: "amb_wind_strong", ambienceVolume: 0.4,
      render: (s) => <PlaneSky shot={s} cam={move([-22, -6, 30], [-31, -4, 8], [0, 1.5, 3], [0, 1.5, 0], 48)} />,
    },
    {
      at: 7.2, name: "Stadt nachts, Licht geht aus", ambience: "amb_night", ambienceVolume: 0.55,
      render: (s) => <City shot={s} preset="night" night lights={(t) => 1 - sm(7.5, 9.5, t)} cam={move([34, 52, 74], [24, 66, 46], [0, 0, -80], [0, 0, -95], 48)} />,
    },
    {
      at: 9.8, name: "Zoom-out: Erde wird dunkel", ambience: "amb_space", ambienceVolume: 0.5,
      render: (s) => <EarthDark shot={s} lights={(t) => 0.9 * (1 - sm(10.0, 11.8, t))} cam={move([0, 3800, 19500], [0, 3200, 17000], [0, 600, 0], [0, 500, 0], 40)} />,
    },
    {
      at: 12.0, name: "U-Bahn läuft voll", ambience: "amb_underwater", ambienceVolume: 0.45,
      render: (s) => <Subway shot={s} water={(t) => lerp(0.45, 1.5, sm(12.0, 14.2, t))} ghost={{ pos: [4.3, 1.1, -2.2], rotY: 0.25 }} cam={move([3.6, 2.3, 7.0], [3.4, 2.1, 4.9], [1.8, 0.7, -12], [1.6, 0.7, -14], 52)} />,
    },
    // ── 3 Jahre ──
    {
      at: 14.2, name: "1 Jahr: Gras, Rehe", ambience: "amb_nature", ambienceVolume: 0.55,
      render: (s) => (
        <City shot={s} cam={move([-1.2, 0.8, 7], [-0.8, 0.95, 4.2], [0.5, 0.8, -14], [0.6, 0.9, -15], 46)}
          deer={[{ pos: [-1.0, 0, -8], rotY: 0.6, pose: "graze" }, { pos: [1.7, 0, -11.5], rotY: -2.4, pose: "alert", antlers: true }, { pos: [3.0, 0, -7], rotY: -1.2, pose: "graze" }]}
          ghost={(t) => ({ pos: [-1.5, 0, -1.0 - (t - 14.2) * 0.8], rotY: Math.PI + 0.2, pose: "walk", op: 0.5 })} birds />
      ),
    },
    {
      at: 16.9, name: "20 Jahre: Stadt wird Wald", ambience: "amb_nature", ambienceVolume: 0.55,
      render: (s) => (
        <City shot={s} cam={move([-5, 5, 18], [-14, 30, 40], [0, 5, -30], [0, 0, -60], 50)}
          ghost={() => ({ pos: [0.5, 0, 6], rotY: Math.PI, pose: "lookUp", op: 0.5 })} birds />
      ),
    },
    {
      at: 19.4, name: "Flasche auf der Bank", ambience: "amb_nature", ambienceVolume: 0.45,
      render: (s) => (
        <City shot={s} cam={move([7.4, 0.95, -2.6], [7.75, 0.85, -2.1], [9.0, 0.42, -0.4], [9.0, 0.4, -0.4], 46)}
          ghost={() => ({ pos: [9.15, 0.05, 1.3], rotY: -Math.PI / 2 - 0.4, pose: "sit", op: 0.5, expr: "neutral" })} />
      ),
    },
    // ── 4 Extrem ──
    {
      at: 21.8, name: "Brücke stürzt ein", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => <Bridge shot={s} collapse={COLLAPSE} ghost={{ pos: [-44, 0, 60], rotY: 2.5 }} cam={move([-62, 5, 74], [-58, 4.2, 66], [0, 14, 0], [0, 10, 0], 46)} />,
    },
    {
      at: 24.6, name: "1.000 Jahre: Turm kippt", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => <City shot={s} preset="golden" topple={TOPPLE} cam={move([-42, 42, 50], [-50, 48, 30], [0, 22, -95], [0, 16, -100], 50)} birds />,
    },
    {
      at: 27.4, name: "10.000 Jahre: Pyramiden", ambience: "amb_wind", ambienceVolume: 0.55,
      render: (s) => (
        <Desert shot={s} cam={move([5, 1.5, 14], [3.5, 2.4, 6], [-20, 34, -330], [-30, 40, -330], 44)}
          ghost={(t) => ({ pos: [1.2, 0, 1 - (t - 27.4) * 1.1], rotY: Math.PI + 0.1, pose: "walk" })} />
      ),
    },
    // ── 5 Pointe ──
    {
      at: BACK, name: "Alle zurück", transition: "flash", ambience: "amb_crowd", ambienceVolume: 0.45,
      render: (s) => <City shot={s} age={() => 4000} people="back" maxPose={() => "shock"} displayOn={() => false} cam={move([2.3, 1.7, 6.8], [2.9, 1.7, 5.6], [6.0, 1.25, 0.6], [6.1, 1.3, 0.6], 46)} />,
    },
    {
      at: 33.6, name: "Anzeige: 2 min", ambience: "amb_crowd", ambienceVolume: 0.4,
      render: (s) => (
        <City shot={s} age={() => 4000} people="back" maxPose={(t) => (t < 34.9 ? "lookUp" : "idle")}
          displayOn={(t) => t > 33.85 && !(t > 34.0 && t < 34.12) && !(t > 34.3 && t < 34.36)}
          cam={move([2.5, 1.9, 6.6], [2.9, 1.95, 5.9], [6.2, 1.75, 1.6], [6.25, 1.8, 1.6], 42)} />
      ),
    },
  ],

  sfx: [
    // Alltag
    { at: 0.2, sound: "car_pass", volume: 0.3, rate: 0.95 },
    { at: 0.9, sound: "buzz", volume: 0.35 },
    { at: 1.6, sound: "horn", volume: 0.12, rate: 1.1 },
    // Plopp
    { at: VANISH, sound: "zap", volume: 0.4, rate: 1.4 },
    { at: VANISH + 0.05, sound: "chime", volume: 0.3, rate: 1.6 },
    { at: VANISH + 0.1, sound: "sub_drop", volume: 0.3 },
    { at: VANISH + 0.45, sound: "thud", volume: 0.2, rate: 2.2 }, // Handy fällt
    { at: 2.35, sound: "car_pass", volume: 0.5 },
    { at: 3.05, sound: "screech", volume: 0.35 },
    { at: 3.6, sound: "thud", volume: 0.55 },
    { at: 3.62, sound: "glass_crack", volume: 0.35 },
    { at: 3.9, sound: "alarm", volume: 0.18, rate: 1.1 },
    // Flugzeug
    { at: 5.0, sound: "plane", volume: 0.5 },
    { at: 6.1, sound: "beep", volume: 0.22, rate: 1.4 },
    { at: 6.45, sound: "beep", volume: 0.22, rate: 1.4 },
    { at: 6.8, sound: "beep", volume: 0.22, rate: 1.4 },
    // Licht aus
    ...[7.9, 8.4, 8.8, 9.1].map((at, i) => ({ at, sound: "zap" as const, volume: 0.22, rate: 0.7 - i * 0.05 })),
    { at: 9.3, sound: "swoosh_down", volume: 0.35 },
    // Erde
    { at: 10.2, sound: "whoosh_long", volume: 0.3, rate: 0.8 },
    { at: 11.4, sound: "sub_drop", volume: 0.25 },
    // U-Bahn
    { at: 12.05, sound: "splash", volume: 0.45 },
    { at: 12.9, sound: "splash", volume: 0.3, rate: 0.85 },
    { at: 13.5, sound: "alarm", volume: 0.12, rate: 0.8 },
    { at: 13.7, sound: "splash", volume: 0.3, rate: 1.1 },
    // Natur
    { at: 14.3, sound: "grow", volume: 0.4 },
    ...[15.9, 16.2, 16.5].map((at) => ({ at, sound: "step" as const, volume: 0.18, rate: 1.5 })),
    { at: 17.0, sound: "grow", volume: 0.45, rate: 0.85 },
    { at: 17.1, sound: "whoosh_long", volume: 0.3, rate: 0.9 },
    { at: 19.7, sound: "thud", volume: 0.15, rate: 2.4 },
    // Brücke
    { at: 20.4, sound: "riser", volume: 0.35 },
    { at: 22.4, sound: "rumble", volume: 0.35, rate: 1.2 },
    { at: COLLAPSE - 0.05, sound: "glass_crack", volume: 0.4, rate: 0.5 },
    { at: COLLAPSE, sound: "rumble", volume: 0.4 },
    { at: COLLAPSE + 0.9, sound: "splash", volume: 0.45, rate: 0.7 },
    { at: COLLAPSE + 0.9, sound: "impact", volume: 0.25 },
    // Turm (Höhepunkt)
    { at: TOPPLE, sound: "rumble", volume: 0.35, rate: 0.9 },
    { at: TOPPLE + 0.1, sound: "riser", volume: 0.3, rate: 1.5 },
    { at: TOPPLE + 1.7, sound: "boom", volume: 0.55 },
    { at: TOPPLE + 1.7, sound: "impact", volume: 0.3 },
    { at: TOPPLE + 1.75, sound: "sub_drop", volume: 0.25 },
    // Wüste → Rückkehr
    { at: 28.0, sound: "riser", volume: 0.22 },
    { at: BACK + 0.05, sound: "chime", volume: 0.35, rate: 1.2 },
    // Anzeige flackert an
    { at: 33.85, sound: "zap", volume: 0.22, rate: 1.8 },
    { at: 34.12, sound: "zap", volume: 0.18, rate: 2.0 },
    { at: 34.36, sound: "beep", volume: 0.3, rate: 1.2 },
    { at: 35.0, sound: "ding", volume: 0.5, rate: 0.8 },
  ],

  upload: {
    caption: "Was wäre, wenn alle Menschen auf einmal verschwinden? 🌍🌿 Was glaubst du, hält am längsten durch?",
    hashtags: ["#waswärewenn", "#simulation", "#weltohnemenschen", "#3danimation", "#fyp"],
  },
};
