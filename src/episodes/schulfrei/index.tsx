// „Was wäre, wenn morgen alle Schulen für immer schließen?“ – POV, Format B (Zeitsprung).
// Mathe-Test → Eilmeldung → Klasse rastet aus → Ausschlafen → Zocken bis 4 → Freibad am Dienstag → Langeweile
// → Vorstellungsgespräch ohne Abschluss → Schule zugewachsen → Wecker: 6:45, Montag. Alles nur geträumt. Mathe-Test.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Episode } from "../../types";
import { clamp, lerp, type Vec3 } from "../../lib/anim";
import { EgoView } from "../../overlay/Ego";
import { Box } from "../../three/kit";
import { Phone, type PhoneUI, type ChatItem } from "../koma/world";
import {
  Scene, pov, path3, sm, Classroom, Bedroom, Freibad, Office, SchoolRuin, cannonball, splashAt,
  EYE_SEAT, EYE_PILLOW, EYE_OFFICE, BEANBAG_YOU, BEANBAG_MAX, TV_POS, ROOM_LIGHT, type RoomMood, type View, type Times,
} from "./world";
import { CLOSE, WAKE, DUR, DAYS, fmtDays } from "./metric";

const JUMP = 12.35; // Max läuft aufs Sprungbrett
const SPLASH = splashAt(JUMP);
const CLASS_SUN: Vec3 = [-10, 7, 2.5]; // Sonne kommt durch die Fenster links

// ── Handy-Bildschirme ──
const breaking = (): PhoneUI => ({
  kind: "lock", clock: "07:58", date: "Montag", battery: 0.64,
  notes: [
    { app: "EILMELDUNG", text: "Alle Schulen schließen." },
    { app: "EILMELDUNG", text: "Ab sofort. Für immer." },
    { app: "Max", text: "BRO SCHAU AUFS HANDY" },
  ],
});
const wakeUI = (): PhoneUI => ({
  kind: "lock", clock: "14:07", date: "Dienstag", battery: 0.92,
  notes: [
    { app: "Mama", text: "Bist du endlich wach??" },
    { app: "Max", text: "bro hab 14 std gepennt" },
  ],
});
const chatUpTo = (t: number, list: [number, ChatItem][], typingFrom?: number): PhoneUI => ({
  kind: "chat", contact: "Max", clock: "15:42",
  items: list.filter(([at]) => t >= at).map(([, it]) => it),
  typing: typingFrom != null && t >= typingFrom,
});
const BORED: [number, ChatItem][] = [
  [0, { divider: "Donnerstag? Freitag?" }],
  [17.65, { text: "welcher tag ist heute", time: "15:42" }],
  [18.05, { me: true, text: "keine ahnung", time: "15:42" }],
  [18.45, { text: "mir ist sooo langweilig", time: "15:43" }],
  [18.9, { me: true, text: "ich vermiss die pausen", time: "15:43" }],
];
const alarmUI = (): PhoneUI => ({
  kind: "lock", clock: "06:45", date: "Montag", battery: 0.31,
  notes: [{ app: "WECKER", text: "Aufstehen. Schule." }],
});
const MATHE: [number, ChatItem][] = [
  [0, { divider: "Heute" }],
  [32.0, { text: "bro", time: "06:46" }],
  [32.35, { text: "wach auf", time: "06:46" }],
  [33.0, { text: "heute ist mathe test", time: "06:46" }],
  [33.9, { text: "hast du gelernt??", time: "06:47" }],
];
/** Handy in der rechten Hand, vibriert ab `buzz` */
const phoneIn = (ui: (t: number) => PhoneUI, buzz?: [number, number]) => (t: number) => {
  const v = buzz && t > buzz[0] && t < buzz[1] ? Math.sin(t * 90) * 0.035 : 0;
  return <Phone ui={ui(t)} time={t} rotation={[0.12, -0.12, v]} />;
};
const pad = () => <Box size={[0.16, 0.035, 0.08]} color="#1C1E24" position={[-0.09, -0.075, -0.01]} roughness={0.4} cast={false} />;

/** Zimmer-Szene in einer Stimmung */
const Room: React.FC<{ shot: { start: number; end: number }; mood: RoomMood; view: (c: Times) => View } & Omit<React.ComponentProps<typeof Scene>, "shot" | "preset" | "world" | "view"> & { room: (t: number) => Omit<React.ComponentProps<typeof Bedroom>, "t" | "mood"> }> = ({ shot, mood, view, room, ...rest }) => {
  const L = ROOM_LIGHT[mood];
  return (
    <Scene shot={shot} preset={L.preset} sunDir={L.sunDir} sunIntensity={L.sunI} env={L.env} fog={null} bg={L.sky[1]} shadowSize={4} shadowCenter={[0, 1, 0]}
      view={view} {...rest} world={({ t }) => <Bedroom t={t} mood={mood} {...room(t)} />} />
  );
};

export const schulfrei: Episode = {
  id: "Schulfrei",
  title: "Was wäre, wenn morgen alle Schulen für immer schließen?",
  duration: DUR,
  coldOpen: { at: 4.4, dur: 1.0 },
  accent: "red",
  hook: { text: "Was wäre, wenn alle Schulen für immer schließen?", highlight: ["für immer"], until: 2.6 },

  hud: [
    {
      label: "Ohne Schule",
      value: DAYS,
      format: fmtDays,
      compare: [
        { at: 0, text: "Schule: zu. Für immer." },
        { at: 1.1, text: "Ausgeschlafen" },
        { at: 6, text: "Zocken statt Mathe" },
        { at: 40, text: "Sommer ohne Ende" },
        { at: 150, text: "Langeweile" },
        { at: 1000, text: "Kein Abschluss" },
        { at: 3300, text: "Keine neuen Ärzte" },
      ],
      secondary: { label: "Wecker gestellt", value: () => 0, format: (v) => `${v}×` },
      from: CLOSE,
      until: WAKE - 0.01,
    },
    {
      label: "Ohne Schule",
      value: () => 0,
      format: fmtDays,
      compare: [{ at: 0, text: "Alles nur geträumt" }],
      secondary: { label: "Wecker gestellt", value: () => 1, format: (v) => `${v}×` },
      from: WAKE + 0.3,
    },
  ],

  chapters: [
    { at: 6.5, text: "TAG 1" },
    { at: 9.4, text: "WOCHE 1" },
    { at: 12.4, text: "SOMMER" },
    { at: 15.4, text: "MONAT 6" },
    { at: 19.4, text: "JAHR 3" },
    { at: 23.6, text: "JAHR 10" },
    { at: WAKE, text: "MONTAG, 6:45" },
  ],

  captions: [
    { at: 0.2, text: "Montag. Mathe-Test. Du hast nichts gelernt.", highlight: ["nichts"] },
    { at: 1.5, text: "Plötzlich vibrieren alle Handys.", highlight: ["alle"] },
    { at: 2.8, text: "Alle Schulen schließen. Für immer.", highlight: ["Für immer."] },
    { at: 4.1, text: "Die ganze Klasse rastet aus.", highlight: ["rastet aus."] },
    { at: 5.6, text: "Max zerreißt den Test. Vor dem Lehrer." },
    { at: 6.8, text: "Kein Wecker. Du schläfst bis 14 Uhr.", highlight: ["14 Uhr."] },
    { at: 8.1, text: "Niemand weckt dich. Niemand meckert." },
    { at: 9.6, text: "Zocken bis 4 Uhr. Jede Nacht.", highlight: ["4 Uhr."] },
    { at: 11.1, text: "Max wohnt jetzt quasi bei dir." },
    { at: 12.6, text: "Freibad. Dienstag, 10 Uhr morgens." },
    { at: 14.3, text: "Du bist endlich frei.", highlight: ["frei."] },
    { at: 15.6, text: "Alle Serien durch. Alle Spiele durch." },
    { at: 16.8, text: "Jeder Tag fühlt sich gleich an.", highlight: ["gleich"] },
    { at: 18.0, text: "Du vermisst… die Pausen?", italic: true },
    { at: 19.6, text: "Dein erstes Vorstellungsgespräch." },
    { at: 20.8, text: "„Abschluss?“ – „Nein.“ – „Danke, tschüss.“", italic: true },
    { at: 22.2, text: "Ohne Schule nimmt dich keiner.", highlight: ["keiner."] },
    { at: 23.8, text: "Keine neuen Ärzte. Keine Piloten.", highlight: ["Ärzte."] },
    { at: 25.0, text: "Deine alte Schule: zugewachsen." },
    { at: 26.4, text: "Max will sie wieder aufmachen." },
    { at: 27.7, text: "Du sagst: Nie im Leben.", highlight: ["Nie"] },
    { at: 29.6, text: "6:45 Uhr. Montag. Dein Wecker.", highlight: ["6:45"] },
    { at: 30.9, text: "Alles nur geträumt.", highlight: ["geträumt."] },
    { at: 32.1, text: "Max schreibt:" },
    { at: 33.0, text: "„Bro… heute ist Mathe-Test.“", italic: true, highlight: ["Mathe-Test.“"] },
  ],

  shots: [
    // ── Alltag (≤ 3 s): Mathe-Test, alle Handys vibrieren ──
    {
      at: 0, name: "Mathe-Test", ambience: "amb_interior", ambienceVolume: 0.35,
      render: (s) => (
        <Scene shot={s} preset="interior" sunDir={CLASS_SUN} sunIntensity={2.6} fog={null} shadowSize={7}
          view={({ t }) => pov(t, EYE_SEAT, path3([[0, [0.42, 0.74, 2.5]], [1.4, [0.38, 0.8, 2.35]], [2.6, [0.34, 0.95, 2.2]]], t), { fov: 64 })}
          ego={(t) => (t < 1.45 ? "pad" : "phone")}
          right={(t) => (t < 1.45 ? null : phoneIn(breaking, [1.45, 2.2])(t))}
          world={({ t }) => <Classroom t={t} mood="test" />} />
      ),
    },
    {
      at: 2.6, name: "Alle schauen aufs Handy", ambience: "amb_crowd", ambienceVolume: 0.3,
      render: (s) => (
        <Scene shot={s} preset="interior" sunDir={CLASS_SUN} sunIntensity={2.6} fog={null} shadowSize={7}
          view={({ t }) => pov(t, EYE_SEAT, path3([[2.6, [-1.5, 1.15, 2.85]], [3.1, [-1.3, 1.15, 2.6]], [4.0, [0.3, 1.3, -3.0]]], t), { fov: 64 })}
          ego="idle"
          world={({ t }) => <Classroom t={t} mood="phones" teacher={{ pose: "phone", expr: "shock" }} />} />
      ),
    },
    // ── Erster Wow: Klasse rastet aus (Cold Open) ──
    {
      at: 4.0, name: "Klasse rastet aus", transition: "flash", ambience: "amb_crowd", ambienceVolume: 0.65,
      render: (s) => (
        <Scene shot={s} preset="interior" sunDir={CLASS_SUN} sunIntensity={2.6} fog={null} shadowSize={7}
          view={({ t }) => {
            const up = sm(4.0, 4.5, t);
            return pov(t, [0.36, lerp(1.24, 1.66, up), lerp(3.08, 2.98, up)], path3([[4.0, [-0.2, 1.5, -1.5]], [5.6, [-0.6, 2.0, -2.0]]], t), { fov: 66, bob: 0.05 * up, f: 7 });
          }}
          ego="cheer"
          world={({ t }) => (
            <Classroom t={t} mood="cheer" papers={4.0} teacher={{ pose: "shock", expr: "shock" }}
              maxPose={{ pos: [-0.35, 0.75 + Math.max(0, Math.sin(t * 8)) * 0.15, -0.35], rotY: 0.35, pose: "cheer", expr: "happy" }} />
          )} />
      ),
    },
    {
      at: 5.6, name: "Max zerreißt den Test", ambience: "amb_crowd", ambienceVolume: 0.55,
      render: (s) => {
        const tear = (t: number) => sm(5.85, 6.2, t);
        return (
          <Scene shot={s} preset="interior" sunDir={CLASS_SUN} sunIntensity={2.6} fog={null} shadowSize={7}
            view={({ t }) => pov(t, path3([[5.6, [0.42, 1.62, 3.1]], [6.5, [0.36, 1.6, 2.95]]], t), path3([[5.6, [0.0, 1.6, 1.2]], [6.5, [0.0, 1.45, 1.2]]], t), { fov: 64 })}
            ego="idle"
            world={({ t }) => (
              <Classroom t={t} mood="cheer" papers={4.0} tear={tear(t)} teacher={{ pose: "shock", expr: "shock" }}
                maxPose={{ pos: [0.0, 0, 1.25], rotY: 0.08, pose: "idle", expr: "happy", joints: { rArmX: -1.15, lArmX: -1.15, lArmZ: 0.08 + tear(t) * 0.55, rArmZ: -0.08 - tear(t) * 0.55, headX: -0.05 } }} />
            )} />
        );
      },
    },
    // ── TAG 1: Ausschlafen ──
    {
      at: 6.5, name: "14 Uhr aufwachen", transition: "dip", ambience: "amb_nature", ambienceVolume: 0.3,
      render: (s) => (
        <Room shot={s} mood="day"
          view={({ t }) => {
            const up = sm(8.0, 8.9, t);
            const eye: Vec3 = [lerp(EYE_PILLOW[0], -1.15, up), lerp(EYE_PILLOW[1], 1.28, up), lerp(EYE_PILLOW[2], -1.1, up)];
            return pov(t, eye, path3([[6.5, [1.2, 1.9, 0.6]], [7.0, [1.0, 1.6, 0.4]], [8.0, [1.0, 1.5, 0.3]], [9.0, [0.8, 1.45, -2.3]], [9.4, [0.85, 1.4, -2.3]]], t), { fov: 64 });
          }}
          ego={(t) => (t < 6.85 || t > 8.0 ? "idle" : "phone")}
          right={(t) => (t < 6.85 || t > 8.0 ? null : phoneIn(wakeUI, [6.85, 7.3])(t))}
          room={() => ({ mess: 0.15 })} />
      ),
    },
    // ── WOCHE 1: Zocken bis 4 ──
    {
      at: 9.4, name: "Zocken", transition: "dip", ambience: "amb_night", ambienceVolume: 0.25,
      render: (s) => (
        <Room shot={s} mood="night"
          view={({ t }) => pov(t, [0.5, 0.98, -0.2], path3([[9.4, [TV_POS[0], 1.18, -0.45]], [10.3, [TV_POS[0], 1.15, -0.5]], [11.0, [0.9, 0.95, -1.6]]], t), { fov: 62 })}
          ego="pad" right={() => pad()}
          room={(t) => ({ tv: true, mess: 0.35, clock: "04:12", max: { pos: BEANBAG_MAX, rotY: Math.PI / 2 + 0.2, pose: "sit", expr: "happy", joints: { lArmX: -1.0, rArmX: -1.0 + Math.sin(t * 14) * 0.06, headY: t > 10.6 ? -0.6 : 0 } } })} />
      ),
    },
    {
      at: 11.0, name: "Du + Max, 4:12 Uhr", ambience: "amb_night", ambienceVolume: 0.25,
      render: (s) => (
        <Room shot={s} mood="night" ego={false}
          view={({ t }) => ({ pos: path3([[11.0, [2.0, 1.75, 1.7]], [12.4, [1.85, 1.95, 2.0]]], t), look: [0.5, 0.6, -0.9], fov: 62 })}
          room={(t) => ({
            tv: true, mess: 0.5, clock: "04:12",
            max: { pos: BEANBAG_MAX, rotY: Math.PI / 2 + 0.2, pose: "sit", expr: "happy", joints: { lArmX: -1.0, rArmX: -1.0 + Math.sin(t * 14) * 0.06 } },
            you: { pos: BEANBAG_YOU, rotY: Math.PI / 2 - 0.1, pose: "sit", joints: { lArmX: -1.0, rArmX: -1.0 + Math.sin(t * 11) * 0.06 } },
          })} />
      ),
    },
    // ── SOMMER: Freibad am Dienstagvormittag ──
    {
      at: 12.4, name: "Freibad, Arschbombe", transition: "whip", ambience: "amb_crowd", ambienceVolume: 0.4,
      render: (s) => (
        <Scene shot={s} preset="day" sunDir={[30, 60, -40]} fog={["#CFE7F5", 60, 400]} shadowSize={14} shadowCenter={[0, 0, -8]}
          view={({ t }) => {
            const cb = cannonball(t, JUMP);
            const tgt: Vec3 = t < SPLASH.at ? [cb.pos[0], cb.pos[1] + 0.9, cb.pos[2]] : [SPLASH.p[0], 0.6 + (t - SPLASH.at) * 0.3, SPLASH.p[2]];
            return pov(t, [3.4, 1.62, -3.6], tgt, { fov: 62, bob: t > SPLASH.at ? 0.04 : 0.008, f: t > SPLASH.at ? 7 : 1.4 });
          }}
          ego={(t) => (t > SPLASH.at + 0.1 ? "cheer" : "idle")}
          world={({ t }) => <Freibad t={t} jump={JUMP} />} />
      ),
    },
    {
      at: 14.3, name: "Freibad von oben", ambience: "amb_nature", ambienceVolume: 0.45,
      render: (s) => (
        <Scene shot={s} preset="day" sunDir={[30, 60, -40]} fog={["#CFE7F5", 80, 500]} shadowSize={22} shadowCenter={[0, 0, -2]} ego={false}
          view={({ t }) => ({ pos: path3([[14.3, [5, 4, -1]], [15.4, [12, 17, 9]]], t, "out"), look: [0, -0.5, -4], fov: 60 })}
          world={({ t }) => <Freibad t={t} jump={JUMP} />} />
      ),
    },
    // ── MONAT 6: Langeweile ──
    {
      at: 15.4, name: "Monat 6, grau", transition: "dip", ambience: "amb_interior", ambienceVolume: 0.3,
      render: (s) => (
        <Room shot={s} mood="grey"
          view={({ t }) => pov(t, path3([[15.4, [-0.25, 1.62, -0.2]], [17.6, [-0.35, 1.55, -0.55]]], t), [-1.5, 0.75, -1.65], { fov: 62 })}
          ego="idle"
          room={() => ({ mess: 1, clock: "15:42", max: { pos: [-1.45, 0.78, -0.25], rotation: [-Math.PI / 2, 0, 0], pose: "idle", expr: "neutral", joints: { lArmZ: 0.5, rArmZ: -0.5 } } })} />
      ),
    },
    {
      at: 17.6, name: "Chat mit Max", ambience: "amb_interior", ambienceVolume: 0.3,
      render: (s) => (
        <Room shot={s} mood="grey"
          view={({ t }) => pov(t, [-0.35, 1.55, -0.55], [-1.2, 0.6, -1.4], { fov: 60 })}
          ego="phone" right={phoneIn((t) => chatUpTo(t, BORED, 19.1))}
          room={() => ({ mess: 1, clock: "15:42", max: { pos: [-1.45, 0.78, -0.25], rotation: [-Math.PI / 2, 0, 0], pose: "idle", expr: "neutral", joints: { lArmZ: 0.5, rArmZ: -0.5 } } })} />
      ),
    },
    // ── JAHR 3: Vorstellungsgespräch ──
    {
      at: 19.4, name: "Vorstellungsgespräch", transition: "whip", ambience: "muzak", ambienceVolume: 0.22,
      render: (s) => (
        <Scene shot={s} preset="interior" sunDir={[-20, 30, -40]} fog={null} shadowSize={5} shadowCenter={[0, 0, -1]}
          view={({ t }) => pov(t, path3([[19.4, [0.05, 1.24, 1.25]], [21.8, EYE_OFFICE]], t), [0, 1.42, -1.25], { fov: 58 })}
          ego="pad"
          world={({ t }) => (
            <Office t={t} boss={{ pose: "sit", expr: t > 21.0 ? "neutral" : "happy", joints: { headY: t > 21.0 ? Math.sin(t * 10) * 0.3 : 0, rArmX: -0.9, lArmX: -0.7 } }} />
          )} />
      ),
    },
    {
      at: 21.8, name: "Danke, tschüss", ambience: "muzak", ambienceVolume: 0.22,
      render: (s) => (
        <Scene shot={s} preset="interior" sunDir={[-20, 30, -40]} fog={null} shadowSize={5} shadowCenter={[0, 0, -1]}
          view={({ t }) => pov(t, EYE_OFFICE, path3([[21.8, [0, 1.42, -1.25]], [22.4, [0.4, 1.4, -1.2]], [23.6, [3.4, 1.25, 0.75]]], t), { fov: 58 })}
          ego="idle"
          world={({ t }) => <Office t={t} boss={{ pose: "sit", expr: "neutral", joints: { rArmZ: -1.45 * sm(21.9, 22.3, t), rArmX: 0, lArmX: -0.7, headY: 0.4 * sm(21.9, 22.3, t) } }} />} />
      ),
    },
    // ── JAHR 10: die alte Schule ──
    {
      at: 23.6, name: "Schule zugewachsen", transition: "dip", ambience: "amb_wind", ambienceVolume: 0.4,
      render: (s) => (
        <Scene shot={s} preset="golden" sunDir={[-60, 18, 30]} fog={["#F2C9A4", 60, 420]} shadowSize={30} shadowCenter={[0, 0, 4]} ego={false}
          view={({ t }) => ({ pos: path3([[23.6, [3, 2.6, 19]], [26.2, [9, 13, 38]]], t, "out"), look: path3([[23.6, [0, 3, 0]], [26.2, [0, 5, -2]]], t), fov: 58 })}
          world={({ t }) => <SchoolRuin t={t} max={{ pos: [-0.9, 0, 14.4], rotY: Math.PI, pose: "idle" }} />} />
      ),
    },
    {
      at: 26.2, name: "Am Tor mit Max", ambience: "amb_nature", ambienceVolume: 0.4,
      render: (s) => (
        <Scene shot={s} preset="golden" sunDir={[-60, 18, 30]} fog={["#F2C9A4", 60, 420]} shadowSize={8} shadowCenter={[0, 0, 13]}
          view={({ t }) => pov(t, path3([[26.2, [0.5, 1.62, 18.4]], [29.3, [0.35, 1.62, 17.6]]], t), path3([[26.2, [-0.6, 1.5, 14.6]], [26.9, [-0.2, 2.4, 8]], [27.6, [0.1, 3.4, 0]], [28.3, [-0.6, 1.5, 14.6]]], t), { fov: 62 })}
          ego="idle"
          world={({ t }) => {
            const turn = sm(27.5, 28.0, t);
            return <SchoolRuin t={t} max={{ pos: [-0.75, 0, 14.6], rotY: lerp(Math.PI - 0.15, 0.55, turn), pose: turn < 0.5 ? "point" : "idle", expr: "happy", joints: turn > 0.5 ? { rArmZ: -0.6, headX: -0.05 } : { rArmX: -1.9 } }} />;
          }} />
      ),
    },
    // ── Payoff: Wecker. Alles nur geträumt. ──
    {
      at: WAKE, name: "Wecker 6:45", transition: "dip", ambience: "amb_night", ambienceVolume: 0.2,
      render: (s) => (
        <EgoOpen start={WAKE}>
          <Room shot={s} mood="dawn"
            view={({ t }) => pov(t, EYE_PILLOW, path3([[WAKE, [-1.25, 2.6, -0.4]], [30.3, [-1.1, 2.2, -0.7]], [31.8, [-1.0, 2.1, -0.75]]], t), { fov: 64 })}
            ego={(t) => (t < 29.8 ? "idle" : "phone")}
            right={(t) => (t < 29.8 ? null : phoneIn(alarmUI, [29.8, 31.8])(t))}
            room={() => ({ mess: 0, clock: "06:45" })} />
        </EgoOpen>
      ),
    },
    {
      at: 31.8, name: "Max: Mathe-Test", ambience: "amb_interior", ambienceVolume: 0.25,
      render: (s) => (
        <Room shot={s} mood="dawn"
          view={({ t }) => pov(t, path3([[31.8, [-1.4, 1.0, -1.9]], [DUR, [-1.3, 1.08, -1.7]]], t), [-1.0, 2.0, -0.8], { fov: 60 })}
          ego="phone" right={phoneIn((t) => chatUpTo(t, MATHE, 34.2), [31.95, 32.15])}
          room={() => ({ mess: 0, clock: "06:46" })} />
      ),
    },
  ],

  sound: { volume: 0.82 },

  sfx: [
    // Prüfungsstille: Uhr tickt
    ...[0.15, 0.65, 1.15].map((at) => ({ at, sound: "tick_low" as const, volume: 0.35 })),
    { at: 0.3, sound: "typing", volume: 0.12, rate: 0.7 }, // Kuli kratzt
    // alle Handys vibrieren
    { at: 1.45, sound: "buzz", volume: 0.55 },
    { at: 1.6, sound: "buzz", volume: 0.35, rate: 1.12 },
    { at: 1.75, sound: "buzz", volume: 0.3, rate: 0.9 },
    { at: 1.5, sound: "msg_in", volume: 0.4 },
    { at: 1.4, sound: "riser", volume: 0.3 },
    ...[2.65, 2.85, 3.05, 3.3, 3.55].map((at, i) => ({ at, sound: "buzz" as const, volume: 0.25, rate: [1.05, 0.95, 1.2, 0.85, 1.1][i] })),
    // Jubel + Papierregen
    { at: 4.0, sound: "cheer", volume: 0.75 },
    { at: 4.05, sound: "swoosh_up", volume: 0.4 },
    { at: 4.1, sound: "whoosh", volume: 0.3, rate: 1.3 },
    { at: 5.95, sound: "rip", volume: 0.65 },
    { at: 6.05, sound: "cheer", volume: 0.4, rate: 1.08 },
    // Tag 1: Handy, Vögel
    { at: 6.9, sound: "buzz", volume: 0.35 },
    { at: 7.0, sound: "msg_in", volume: 0.4 },
    { at: 7.35, sound: "msg_in", volume: 0.35, rate: 1.1 },
    { at: 8.05, sound: "whoosh", volume: 0.2, rate: 0.8 },
    // Woche 1: Zocken
    ...[9.5, 9.65, 9.8, 10.05, 10.2, 10.45, 10.6, 10.8].map((at, i) => ({ at, sound: "button" as const, volume: 0.22, rate: i % 2 ? 1.3 : 1.15 })),
    { at: 9.7, sound: "zap", volume: 0.3, rate: 1.4 },
    { at: 10.15, sound: "zap", volume: 0.3, rate: 1.2 },
    { at: 10.55, sound: "chime", volume: 0.35, rate: 1.3 }, // Level up
    { at: 11.3, sound: "crunch", volume: 0.35, rate: 1.3 }, // Chips
    { at: 11.9, sound: "zap", volume: 0.25, rate: 1.5 },
    // Sommer: Arschbombe
    ...[12.4, 12.52, 12.64].map((at) => ({ at, sound: "step" as const, volume: 0.45, rate: 1.2 })),
    { at: JUMP + 0.36, sound: "bonk", volume: 0.35, rate: 0.8 }, // Brett federt
    { at: JUMP + 0.4, sound: "whoosh", volume: 0.35 },
    { at: SPLASH.at, sound: "splash", volume: 0.85 },
    { at: SPLASH.at + 0.2, sound: "cheer", volume: 0.35, rate: 1.15 },
    { at: 14.3, sound: "swoosh_up", volume: 0.35 },
    // Monat 6: Uhr, Chat
    ...[15.6, 16.2, 16.8, 17.4].map((at) => ({ at, sound: "tick_low" as const, volume: 0.3 })),
    { at: 17.65, sound: "msg_in", volume: 0.4 },
    { at: 17.8, sound: "typing", volume: 0.25 },
    { at: 18.05, sound: "msg_send", volume: 0.4 },
    { at: 18.45, sound: "msg_in", volume: 0.4 },
    { at: 18.9, sound: "msg_send", volume: 0.4 },
    // Jahr 3: Absage
    { at: 19.5, sound: "door", volume: 0.3, rate: 1.1 },
    { at: 21.0, sound: "buzz", volume: 0.4, rate: 0.55 }, // „Falsch“-Summer
    { at: 22.3, sound: "door", volume: 0.35, rate: 0.9 },
    // Jahr 10: Schule
    { at: 23.7, sound: "whoosh_long", volume: 0.3, rate: 0.8 },
    { at: 26.3, sound: "clank", volume: 0.35, rate: 1.2 }, // Kette
    { at: 26.75, sound: "riser_long", volume: 0.3 },
    { at: 27.7, sound: "thud", volume: 0.35 },
    // Wecker
    ...[29.4, 29.62, 29.84, 30.4, 30.62, 30.84, 31.4, 31.62].map((at) => ({ at, sound: "beep" as const, volume: 0.42, rate: 1.25 })),
    { at: 29.8, sound: "buzz", volume: 0.35 },
    ...[32.0, 32.35, 33.0, 33.9].map((at, i) => ({ at, sound: "msg_in" as const, volume: 0.42, rate: 1 + i * 0.04 })),
    // Pointe: Schulklingel
    { at: 34.15, sound: "school_bell", volume: 0.55 },
  ],

  upload: {
    caption: "Was wäre, wenn alle Schulen für immer schließen? 🏫😳 Am Anfang Freiheit… und dann? Würdest du die Schule wieder aufmachen – ja oder nein?",
    hashtags: ["#pov", "#waswärewenn", "#schule", "#schulfrei", "#3danimation", "#fyp"],
  },
};

/** Augen gehen auf (Aufwachen) */
const EgoOpen: React.FC<{ start: number; children: React.ReactNode }> = ({ start, children }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const t = f / fps;
  const o = clamp((t - start) / 0.7);
  return <EgoView open={0.15 + 0.85 * o * o} blur={(1 - o) * 6}>{children}</EgoView>;
};
