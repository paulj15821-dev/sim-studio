// „Was wäre, wenn heute Abend ein Asteroid einschlägt?“ – POV-Fassung (Ego-Perspektive, „du“).
// Gleiche Prämisse wie „Asteroid“ (A/B-Test der Erzählweise): Du grillst mit Max, alle Handys schreien.
// Gefahr + Befehle + Kapitel-Karten statt reiner Zahlen. Welten aus ../asteroid/world.tsx wiederverwendet.
import React from "react";
import type { Episode, ShotInfo } from "../../types";
import { clamp, lerp, type Vec3 } from "../../lib/anim";
import { fmtLength } from "../../lib/metric";
import { t as tr } from "../../lib/i18n";
import { EgoRig, type EgoPose } from "../../three/kit";
import { EgoView } from "../../overlay/Ego";
import { Hometown, Living, SpaceScene, OceanImpact, move, type Actor } from "../asteroid/world";
import { Phone, type PhoneUI } from "../koma/world";
import { IMPACT, TAU, DIST, AFTER, fmtClock, fmtPlus } from "./metric";

// ── POV-Kamera: Augenhöhe, leichtes Atmen bzw. Laufschritte ──
type C = { t: number; local: number; p: number };
type Pov = (c: C) => { pos: Vec3; look: Vec3; fov: number };
const sm = (p: number) => p * p * (3 - 2 * p);
const L3 = (a: Vec3, b: Vec3, e: number): Vec3 => [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
const pov = (eyeA: Vec3, eyeB: Vec3, lookA: Vec3, lookB: Vec3, o: { fov?: number; run?: boolean } = {}): Pov => ({ t, p }) => {
  const e = sm(p);
  const eye = L3(eyeA, eyeB, e), look = L3(lookA, lookB, e);
  const bob = o.run ? 0.045 : 0.006, f = o.run ? 9 : 1.4;
  return { pos: [eye[0] + Math.sin(t * f * 0.5) * bob * 0.6, eye[1] + Math.abs(Math.sin(t * f)) * bob, eye[2]], look: [look[0], look[1] + (o.run ? Math.sin(t * f) * 0.08 : 0), look[2]], fov: o.fov ?? 64 };
};
const EYE = 1.62;

type HomeProps = React.ComponentProps<typeof Hometown>;
/** Vorstadt aus Ego-Sicht: Kamera + Arme (+ Gegenstand in der rechten Hand) */
const PovHome: React.FC<Omit<HomeProps, "cam" | "extra"> & { pov: Pov; pose: EgoPose | ((t: number) => EgoPose); hold?: (t: number) => React.ReactNode }> = ({ pov: cam, pose, hold, ...rest }) => {
  const dur = rest.shot.end - rest.shot.start;
  return (
    <Hometown
      {...rest}
      cam={(c) => cam(c)}
      extra={(t, local) => {
        const c = cam({ t, local, p: clamp(local / dur) });
        return <EgoRig eye={c.pos} look={c.look} pose={typeof pose === "function" ? pose(t) : pose} time={t} right={hold?.(t)} />;
      }}
    />
  );
};

const alertUI = (): PhoneUI => ({
  kind: "lock", clock: "19:42", date: tr("Mittwoch, 11. November", "Wednesday, November 11"), battery: 0.8,
  notes: [
    { app: tr("⚠ NOTFALLWARNUNG", "⚠ EMERGENCY ALERT"), text: tr("Asteroid. Einschlag 20:29 Uhr.", "Asteroid. Impact at 8:29 PM.") },
    { app: tr("⚠ NOTFALLWARNUNG", "⚠ EMERGENCY ALERT"), text: tr("Sofort Schutz suchen!", "Take shelter now!") },
  ],
});

// Max steht dir gegenüber (Blick zur Kamera)
const faceTo = (from: Vec3, to: Vec3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const MAX_GARDEN: Vec3 = [0.8, 0, 8.0];
const EYE_GARDEN: Vec3 = [3.4, EYE, 10.4];
const SKY_METEOR: Vec3 = [-5.1, 8.6, -6.4]; // Blickziel Richtung Meteor (über dem Haus)

export const asteroidPov: Episode = {
  id: "AsteroidPOV",
  title: "Was wäre, wenn heute Abend ein Asteroid einschlägt? (POV)",
  duration: 37,
  coldOpen: { at: 29.2, dur: 1.0 },
  accent: "red",
  hook: { text: "Was wäre, wenn heute Abend ein Asteroid einschlägt?", highlight: ["Asteroid"], until: 2.6 },

  hud: [
    {
      label: "Einschlag in",
      value: TAU,
      format: fmtClock,
      compareDir: "down",
      compare: [
        { at: 1e9, text: "Kurs: Erde" },
        { at: 25 * 60, text: "Heller als der Mond" },
        { at: 5, text: "In der Atmosphäre" },
      ],
      secondary: { label: "Abstand", value: DIST, format: fmtLength },
      until: IMPACT - 0.01,
    },
    {
      label: "Seit dem Einschlag",
      value: AFTER,
      format: fmtPlus,
      compare: [
        { at: 0, text: "Feuerball" },
        { at: 200, text: "Erdbeben" },
        { at: 510, text: "Gesteinsregen" },
        { at: 2_990, text: "Druckwelle" },
      ],
      secondary: { label: "Entfernung", value: () => 1e6, format: fmtLength },
      from: IMPACT,
    },
  ],

  chapters: [
    { at: 8.0, text: "NOCH 30 MINUTEN" },
    { at: 13.0, text: "NOCH 1 MINUTE" },
    { at: IMPACT, text: "EINSCHLAG" },
    { at: 23.0, text: "+ 3 MINUTEN" },
    { at: 25.8, text: "+ 8 MINUTEN" },
    { at: 28.6, text: "+ 50 MINUTEN" },
  ],

  captions: [
    { at: 0.25, text: "Alle Handys schreien gleichzeitig.", highlight: ["schreien"] },
    { at: 1.5, text: "Warnung: Asteroid. Einschlag in 47 Minuten.", highlight: ["Asteroid."] },
    { at: 2.9, text: "Da oben. Heller als jeder Stern." },
    { at: 4.2, text: "Max lässt die Würstchen fallen." },
    { at: 5.5, text: "10 km Fels. 72.000 km/h.", highlight: ["72.000 km/h."] },
    { at: 6.8, text: "Ziel: das Meer. 1.000 km von dir.", highlight: ["1.000 km"] },
    { at: 8.6, text: "Auf der Straße: Panik.", highlight: ["Panik."] },
    { at: 9.6, text: "Max will zur Autobahn. Du sagst: Keller.", highlight: ["Keller."] },
    { at: 10.7, text: "Wasser. Taschenlampe. Powerbank." },
    { at: 11.9, text: "Max bestellt trotzdem noch Pizza." },
    { at: 13.5, text: "100 km: Er trifft die Atmosphäre.", highlight: ["Atmosphäre."] },
    { at: 15.7, text: "Die Nacht wird zum Tag." },
    { at: 16.9, text: "Schau nicht hin!", highlight: ["Schau", "nicht", "hin!"] },
    { at: 18.5, text: "5 Milliarden Hiroshima-Bomben.", highlight: ["5 Milliarden"] },
    { at: 20.5, text: "Die Sonne geht ein zweites Mal auf." },
    { at: 23.4, text: "Der Boden bebt. Lauf!", highlight: ["Lauf!"] },
    { at: 24.6, text: "Rein ins Haus!" },
    { at: 26.2, text: "Glühende Steine fallen vom Himmel.", highlight: ["Glühende"] },
    { at: 27.4, text: "Max hält dir die Tür auf." },
    { at: 29.0, text: "Eine Wand aus Staub. Über 1.000 km/h.", highlight: ["1.000 km/h."] },
    { at: 30.2, text: "TÜR ZU!", highlight: ["TÜR", "ZU!"] },
    { at: 31.5, text: "Dunkel. Stille. Ihr lebt.", highlight: ["Ihr", "lebt."] },
    { at: 33.0, text: "Dann klingelt es." },
    { at: 34.4, text: "„Pizza für Max? War viel Verkehr.“", italic: true },
  ],

  shots: [
    // ── Alltag (max. 3 s): Handy schreit ──
    {
      at: 0, name: "Garten, Handy-Warnung", ambience: "amb_nature", ambienceVolume: 0.4,
      render: (s) => (
        <PovHome shot={s} mood="golden" pose="phone"
          pov={pov(EYE_GARDEN, [3.25, EYE, 10.15], [1.0, 1.45, 8.2], [1.2, 1.5, 8.0], { fov: 62 })}
          hold={(t) => <Phone ui={alertUI()} time={t} rotation={[0.1, -0.15, 0]} />}
          actors={[{ kind: "max", pos: MAX_GARDEN, rotY: faceTo(MAX_GARDEN, EYE_GARDEN), pose: "phone", hold: "phone", expr: "shock" }]}
          meteor={() => ({ elev: 20, size: 40, tail: 0 })} />
      ),
    },
    {
      at: 2.8, name: "Blick nach oben", ambience: "tension", ambienceVolume: 0.45,
      render: (s) => (
        <PovHome shot={s} mood="dusk" pose="idle"
          pov={pov([3.3, EYE, 10.2], [3.2, EYE, 10.1], [1.0, 1.6, 8.0], SKY_METEOR, { fov: 64 })}
          actors={[{ kind: "max", pos: MAX_GARDEN, rotY: Math.PI + 0.45, pose: "lookUp", expr: "shock" }]}
          meteor={(t, l) => ({ elev: 20, size: 90 + l * 20, tail: 150 })} />
      ),
    },
    { at: 5.4, name: "Asteroid nah", ambience: "amb_space", render: (s) => <SpaceScene shot={s} layout="close" /> },
    // ── Meilensteine: Panik, Vorbereitung ──
    {
      at: 8.0, name: "Straße, Panik", ambience: "amb_crowd", ambienceVolume: 0.6,
      render: (s) => (
        <PovHome shot={s} mood="dusk" pose="run"
          pov={pov([-6, EYE, 15.0], [-2.5, EYE, 15.4], [8, 1.5, 16.2], [10, 1.4, 16.6], { fov: 66, run: true })}
          actors={[
            { kind: "max", pos: (t) => [-4.4 + (t - 8) * 1.4, 0, 14.4], rotY: Math.PI / 2, pose: "run", expr: "shock" },
            { kind: "person", seed: 7, pos: (t) => [12 - (t - 8) * 5, 0, 16.2], rotY: -Math.PI / 2, pose: "run", expr: "shock" },
            { kind: "person", seed: 11, pos: (t) => [6 - (t - 8) * 4.2, 0, 18.4], rotY: -Math.PI / 2, pose: "run", expr: "shock" },
            { kind: "person", seed: 19, pos: (t) => [-1 + (t - 8) * 3.6, 0, 19.6], rotY: Math.PI / 2, pose: "run" },
            { kind: "person", seed: 23, pos: [4, 0, 13.6], rotY: -2.6, pose: "phone", hold: "phone" },
          ]}
          meteor={() => ({ elev: 24, az: -0.6, size: 140, tail: 220 })} />
      ),
    },
    {
      at: 10.6, name: "Wohnzimmer, packen", ambience: "amb_interior",
      render: (s) => {
        const cam = pov([1.7, EYE, 2.0], [1.35, EYE - 0.05, 1.6], [-0.4, 1.2, -1.4], [-0.6, 1.3, -1.4], { fov: 64 });
        const dur = s.end - s.start;
        return (
          <Living shot={s} cam={(c) => cam(c)}
            extra={(t, local) => { const c = cam({ t, local, p: clamp(local / dur) }); return <EgoRig eye={c.pos} look={c.look} pose="brace" time={t} />; }} />
        );
      },
    },
    // ── Wissen / Staunen ──
    { at: 13.0, name: "Eintritt", ambience: "fire", ambienceVolume: 0.4, render: (s) => <SpaceScene shot={s} layout="entry" /> },
    {
      at: 15.6, name: "Nacht wird Tag", ambience: "amb_wind_strong", ambienceVolume: 0.5,
      render: (s) => (
        <PovHome shot={s} mood="entry" shakeAmp={0.03} pose={(t) => (t < 16.9 ? "idle" : "cover")}
          pov={pov([2.6, EYE, 10.2], [2.5, EYE - 0.08, 10.3], SKY_METEOR, [-5.6, 10.5, -6.0], { fov: 66 })}
          actors={[{ kind: "max", pos: [0.6, 0, 8.6], rotY: Math.PI + 0.4, pose: "shock", expr: "shock" }]}
          meteor={(t, local) => ({ elev: 34 - local * 10, az: 0.05 - local * 0.12, size: 420 + local * 300, tail: 900 })} />
      ),
    },
    // ── Extrem ──
    {
      at: IMPACT, transition: "flash", name: "Einschlag", ambience: "fire", ambienceVolume: 0.45,
      render: (s) => <OceanImpact shot={s} phase="impact" cam={move([120, 14, 380], [140, 18, 450], [0, 95, 0], [0, 130, 0], 50)} />,
    },
    {
      at: 20.4, name: "Zweiter Sonnenaufgang", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => (
        <PovHome shot={s} mood="glow" pose={(t) => (t < 21.6 ? "cover" : "idle")}
          pov={pov([1.6, EYE, 16.2], [1.3, EYE, 15.8], [-9, 9.5, -8], [-9.5, 11, -8.5], { fov: 66 })}
          actors={[{ kind: "max", pos: [-1.0, 0, 14.4], rotY: -2.66, pose: "shock", expr: "shock" }]} />
      ),
    },
    {
      at: 23.0, name: "Erdbeben", ambience: "amb_wind", ambienceVolume: 0.3,
      render: (s) => (
        <PovHome shot={s} mood="quake" shakeAmp={0.16} pose="run"
          pov={pov([1.8, EYE, 12.4], [0.9, EYE, 8.4], [0.2, 1.6, 4.4], [0.2, 1.5, 4.4], { fov: 66, run: true })}
          actors={[{ kind: "max", pos: (t) => [-0.6, 0, 10.6 - (t - 23) * 1.9], rotY: Math.PI, pose: "run", expr: "shock" }]} />
      ),
    },
    {
      at: 25.8, name: "Gesteinsregen", ambience: "fire", ambienceVolume: 0.45,
      render: (s) => (
        <PovHome shot={s} mood="fire" door={() => 1} pose="run"
          pov={pov([3.4, EYE, 15.6], [1.0, EYE, 8.6], [0.4, 1.6, 4.6], [0.2, 1.55, 4.6], { fov: 66, run: true })}
          actors={[{ kind: "max", pos: [0.9, 0, 5.4], rotY: 0.2, pose: "point", expr: "shock" }]} />
      ),
    },
    {
      at: 28.6, name: "Druckwelle", ambience: "amb_wind_strong", ambienceVolume: 0.75,
      render: (s) => (
        <PovHome shot={s} mood="blast" shakeAmp={0.07} wall={(l) => 0.55 + clamp(l / 2.8) * 0.4} pose="brace"
          pov={pov([1.2, EYE, 16.4], [1.0, EYE, 15.6], [-2, 22, -40], [-2, 26, -40], { fov: 70 })}
          actors={[{ kind: "max", pos: (t) => [0.2, 0, 13.4 - (t - 28.6) * 2.8], rotY: Math.PI, pose: "run", expr: "shock" }]} />
      ),
    },
    // ── Payoff ──
    {
      at: 31.4, name: "Drinnen, Stille", ambience: "amb_interior", ambienceVolume: 0.35,
      render: (s) => {
        const cam = pov([1.3, EYE - 0.4, 1.2], [1.25, EYE - 0.42, 1.1], [-0.4, 1.3, -3], [-0.5, 1.35, -3], { fov: 60 });
        const dur = s.end - s.start;
        return (
          <EgoView dream={0.85} tint="#55607A">
            <Living shot={s} cam={(c) => cam(c)}
              extra={(t, local) => { const c = cam({ t, local, p: clamp(local / dur) }); return <EgoRig eye={c.pos} look={c.look} pose="idle" time={t} />; }} />
          </EgoView>
        );
      },
    },
    {
      at: 33.0, name: "Es klingelt", ambience: "amb_wind", ambienceVolume: 0.2,
      render: (s) => (
        <PovHome shot={s} mood="ash" door={(t) => clamp((t - 33.7) / 0.6)} pose={(t) => (t < 34.1 ? "reach" : "idle")}
          pov={pov([0.45, 1.58, 3.55], [0.4, 1.58, 3.75], [0.1, 1.5, 6.0], [0.1, 1.5, 6.0], { fov: 56 })}
          actors={[
            { kind: "max", pos: [-0.75, 0, 4.1], rotY: 0.3, pose: "idle", expr: "shock" },
            { kind: "person", seed: 101, pos: [-0.1, 0, 6.0], rotY: Math.PI + 0.12, pose: "carry", hold: "pizza", expr: "happy" },
          ] as Actor[]} />
      ),
    },
  ],

  // ── Englische Fassung ──
  sceneText: true, // Handy-Warnung
  en: {
    title: "What if an asteroid hit tonight? (POV)",
    hook: { text: "What if an asteroid hit tonight?", highlight: ["asteroid"] },
    hud: [
      { label: "Impact in", compare: ["Course: Earth", "Brighter than the Moon", "In the atmosphere"], secondary: "Distance" },
      { label: "Since impact", compare: ["Fireball", "Earthquake", "Rock rain", "Shockwave"], secondary: "Distance" },
    ],
    chapters: ["30 MINUTES LEFT", "1 MINUTE LEFT", "IMPACT", "+ 3 MINUTES", "+ 8 MINUTES", "+ 50 MINUTES"],
    captions: [
      { text: "Every phone screams at once.", highlight: ["screams"] },
      { text: "Alert: asteroid. Impact in 47 minutes.", highlight: ["asteroid."] },
      "Up there. Brighter than any star.",
      "Max drops the sausages.",
      { text: "10 km of rock. 72,000 km/h.", highlight: ["72,000 km/h."] },
      { text: "Target: the ocean. 1,000 km from you.", highlight: ["1,000 km"] },
      { text: "On the street: panic.", highlight: ["panic."] },
      { text: "Max wants the highway. You say: basement.", highlight: ["basement."] },
      "Water. Flashlight. Power bank.",
      "Max still orders a pizza.",
      { text: "100 km: it hits the atmosphere.", highlight: ["atmosphere."] },
      "Night turns into day.",
      { text: "Don't look at it!", highlight: ["Don't", "look", "at", "it!"] },
      { text: "5 billion Hiroshima bombs.", highlight: ["5 billion"] },
      "The sun rises a second time.",
      { text: "The ground shakes. Run!", highlight: ["Run!"] },
      "Get inside!",
      { text: "Glowing rocks fall from the sky.", highlight: ["Glowing"] },
      "Max holds the door for you.",
      { text: "A wall of dust. Over 1,000 km/h.", highlight: ["1,000 km/h."] },
      { text: "SHUT THE DOOR!", highlight: ["SHUT", "THE", "DOOR!"] },
      { text: "Dark. Silent. You made it.", highlight: ["You", "made", "it."] },
      "Then the doorbell rings.",
      "“Pizza for Max? Traffic was bad.”",
    ],
    upload: {
      caption: "POV: an asteroid hits tonight ☄️😳 Would you have run to the basement or the highway?",
      hashtags: ["#pov", "#whatif", "#asteroid", "#simulation", "#3danimation", "#fyp"],
    },
  },

  // ── Sound-Design ──
  sfx: [
    // alle Handys schreien
    { at: 0.15, sound: "alarm", volume: 0.5 },
    { at: 0.3, sound: "alarm", volume: 0.35, rate: 1.19 },
    { at: 0.45, sound: "alarm", volume: 0.3, rate: 0.89 },
    { at: 1.4, sound: "alarm", volume: 0.25, rate: 1.05 },
    { at: 3.0, sound: "rumble", volume: 0.35, rate: 0.7 },
    { at: 4.3, sound: "thud", volume: 0.3, rate: 1.5 }, // Würstchen
    { at: 5.4, sound: "whoosh_long", volume: 0.4, rate: 0.7 },
    { at: 8.0, sound: "siren", volume: 0.4 },
    { at: 8.2, sound: "car_pass", volume: 0.35 },
    ...[8.1, 8.45, 8.8, 9.15, 9.5, 9.85, 10.2].map((at, i) => ({ at, sound: "step" as const, volume: 0.4, rate: i % 2 ? 0.9 : 1.05 })),
    { at: 11.0, sound: "button", volume: 0.35, rate: 1.2 },
    { at: 11.95, sound: "button", volume: 0.4, rate: 1.3 },
    { at: 12.2, sound: "button", volume: 0.4, rate: 1.25 },
    { at: 13.0, sound: "boom", volume: 0.2, rate: 1.4 },
    { at: 13.4, sound: "riser_long", volume: 0.5 },
    { at: 15.6, sound: "rumble", volume: 0.35 },
    { at: IMPACT, sound: "boom", volume: 0.2, rate: 0.85 },
    { at: IMPACT + 0.05, sound: "sub_drop", volume: 0.18 },
    { at: 20.6, sound: "boom", volume: 0.22, rate: 0.6 },
    { at: 23.0, sound: "rumble", volume: 0.55, rate: 0.9 },
    { at: 23.4, sound: "rumble", volume: 0.45, rate: 0.7 },
    { at: 23.9, sound: "glass_crack", volume: 0.4 },
    ...[23.2, 23.55, 23.9, 24.25, 24.6, 24.95].map((at, i) => ({ at, sound: "step" as const, volume: 0.45, rate: i % 2 ? 0.92 : 1.08 })),
    ...[26.0, 26.5, 27.0, 27.6, 28.1].map((at, i) => ({ at, sound: "thud" as const, volume: 0.32, rate: [1, 0.85, 1.15, 0.9, 1.05][i] })),
    ...[25.9, 26.25, 26.6, 26.95, 27.3, 27.65].map((at, i) => ({ at, sound: "step" as const, volume: 0.4, rate: i % 2 ? 0.95 : 1.1 })),
    { at: 28.6, sound: "whoosh_long", volume: 0.5, rate: 0.6 },
    { at: 29.3, sound: "boom", volume: 0.25, rate: 0.8 },
    { at: 29.4, sound: "rumble", volume: 0.3 },
    { at: 30.25, sound: "door", volume: 0.5, rate: 1.4 },
    { at: 30.6, sound: "thud", volume: 0.5 }, // Tür knallt zu
    { at: 31.6, sound: "heartbeat", volume: 0.55 },
    { at: 32.4, sound: "heartbeat", volume: 0.45 },
    // Pointe: Türklingel
    { at: 33.0, sound: "chime", volume: 0.55 },
    { at: 33.7, sound: "door", volume: 0.35, rate: 0.9 },
  ],

  upload: {
    caption: "POV: Heute Abend schlägt ein Asteroid ein ☄️😳 Wärst du in den Keller oder auf die Autobahn?",
    hashtags: ["#pov", "#waswärewenn", "#asteroid", "#simulation", "#3danimation", "#fyp"],
  },
};
