// „Was wäre, wenn du 30 Jahre im Koma liegst?“
// Format B (Zeitsprung), fast komplett aus Max' Augen (Ego-Perspektive).
// Unfall auf dem Weg ins Kino (Blick aufs Handy) → 30 Jahre Koma → Aufwachen.
// Pointe: Max antwortet endlich auf Leons letzte Nachricht.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Episode } from "../../types";
import { clamp, lerp, type Vec3 } from "../../lib/anim";
import { fmtCount, fmtSpeed } from "../../lib/metric";
import { t as tr } from "../../lib/i18n";
import { EgoView, blinkAt } from "../../overlay/Ego";
import { Street, Ward, Town, move, EYE_LIE, EYE_SIT, type CamFn, type PhoneUI, type ChatItem, type WardPerson } from "./world";
import { COMA, BEATS, LATE, AWAKE, CRASH, WAKE, DAY, Y, years, fmtComa, fmtLate, fmtAwake } from "./metric";

// ── Kameras ──
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** Ego im Bett: Blick von a nach b (Zielpunkte), leichtes Atmen */
const egoLie = (la: Vec3, lb: Vec3, fov = 62): CamFn => ({ t, p }) => ({
  pos: add(EYE_LIE, [0, Math.sin(t * 1.6) * 0.008, 0]),
  look: [lerp(la[0], lb[0], p), lerp(la[1], lb[1], p) + Math.sin(t * 0.9) * 0.03, lerp(la[2], lb[2], p)],
  fov,
});
const egoSit = (la: Vec3, lb: Vec3, fov = 50): CamFn => ({ t, p }) => ({
  pos: add(EYE_SIT, [Math.sin(t * 0.7) * 0.006, Math.sin(t * 1.3) * 0.005, 0]),
  look: [lerp(la[0], lb[0], p), lerp(la[1], lb[1], p), lerp(la[2], lb[2], p)],
  fov,
});
const orbit = (r0: number, r1: number, h0: number, h1: number, a0: number, a1: number, look: Vec3, fov = 45): CamFn => ({ p }) => {
  const e = p * p * (3 - 2 * p);
  const r = lerp(r0, r1, e), a = lerp(a0, a1, p);
  return { pos: [Math.cos(a) * r, lerp(h0, h1, e), Math.sin(a) * r], look, fov };
};

// ── Licht & Zeit im Zimmer ──
const timelapse = (speed: number, base = 0.5) => (t: number) => clamp(base + 0.62 * Math.sin(t * speed));
const SEASON = (t: number) => 1.35 + years(t) * 4; // Unfall im November (Herbst)

// ── Menschen im Zimmer ──
const MOM_SIT: WardPerson = { who: "mom", pos: [1.25, 0, -1.5], rotY: -Math.PI / 2, pose: "sit" };
const MOM_LEAN = (lean = 0.3, expr: WardPerson["expr"] = "neutral"): WardPerson => ({ who: "mom", pos: [1.0, 0, -2.0], rotY: -Math.PI / 2 - 0.5, pose: "carry", lean, expr });

// ── Handy-Inhalte ──
// Funktionen statt Konstanten: Texte werden zur Renderzeit in der jeweiligen Sprache erzeugt (tr = Deutsch/Englisch)
const LEON_OLD = (): ChatItem[] => [
  { divider: tr("MI., 11. NOV. 2026", "WED, NOV 11, 2026") },
  { text: tr("Kommst du heute mit ins Kino?", "Coming to the movies tonight?"), time: "17:40" },
  { me: true, text: tr("Klar! Bin pünktlich.", "Sure! I'll be on time."), time: "17:41" },
  { text: tr("Wo bleibst du?? Film fängt an!", "Where are you?? Movie's starting!"), time: "19:58" },
];
const REPLY = () => tr("Sorry, bin gleich da.", "Sorry, almost there.");
const chatAt = (t: number): PhoneUI => {
  const typed = clamp((t - 58.9) / 1.1);
  const sent = t >= 60.15;
  const reply = REPLY();
  const items: ChatItem[] = [...LEON_OLD(), { divider: tr("HEUTE · 2056", "TODAY · 2056") }];
  if (sent) items.push({ me: true, text: reply, time: "10:14" });
  if (t >= 61.2) items.push({ text: tr("Der Film war eh schlecht.", "The movie sucked anyway."), time: "10:14" });
  return { kind: "chat", contact: "Leon", clock: "10:14", items, input: sent ? "" : reply.slice(0, Math.floor(typed * reply.length)), cursor: !sent, typing: t > 60.5 && t < 61.2 };
};
const nightPhoneAt = (t: number): PhoneUI => {
  if (t >= 14.6) return { kind: "dead" };
  const n = Math.round(Math.pow(clamp((t - 13.0) / 0.9), 1.6) * 847);
  const notes = [
    { app: "Leon", text: tr("Alles okay?? Melde dich!", "You okay?? Text me!") },
    { app: tr("Mama", "Mom"), text: tr("Verpasster Anruf (14)", "Missed call (14)") },
    { app: tr("Kino-Gruppe", "Movie Group"), text: tr("Wir denken an dich ❤", "Thinking of you ❤") },
  ].slice(0, 1 + Math.min(2, Math.floor((t - 13.0) / 0.3)));
  return { kind: "lock", clock: "08:12", date: tr("Freitag, 4. Dezember", "Friday, December 4"), notes, more: n > 3 ? n - 3 : undefined, battery: clamp(0.09 - (t - 13) * 0.055, 0.005) };
};

export const koma: Episode = {
  id: "Koma",
  title: "Was wäre, wenn du 30 Jahre im Koma liegst?",
  duration: 63,
  hook: { text: "Was wäre, wenn du 30 Jahre im Koma liegst?", highlight: ["30 Jahre"], until: 2.6 },

  hud: [
    {
      label: "Zu spät zum Kino",
      value: LATE,
      format: fmtLate,
      secondary: { label: "Tempo", value: () => 5.6, format: fmtSpeed },
      until: CRASH - 0.01,
    },
    {
      label: "Im Koma seit",
      value: COMA,
      format: fmtComa,
      compare: [
        { at: 0, text: "Notaufnahme" },
        { at: 3_600, text: "Intensivstation" },
        { at: 30 * DAY, text: "Handy-Akku: leer" },
        { at: 1 * Y, text: "Ein Geburtstag verschlafen" },
        { at: 3 * Y, text: "Nur noch Mama kommt" },
        { at: 10 * Y, text: "Mama ist jetzt 61" },
        { at: 20 * Y, text: "Mama ist jetzt 71" },
        { at: 27 * Y, text: "Länger als der Rekord" },
      ],
      secondary: { label: "Herzschläge", value: BEATS, format: fmtCount },
      scaleBar: { from: 1, to: 1e9 },
      from: CRASH,
      until: WAKE - 0.01,
    },
    {
      label: "Wach seit",
      value: AWAKE,
      format: fmtAwake,
      compare: [{ at: 0, text: "Hallo, Welt." }],
      secondary: { label: "Dein Alter", value: () => 55, format: (v) => `${v} ${tr("Jahre", "years")}` },
      from: WAKE,
      until: 57.3,
    },
  ],

  captions: [
    { at: 2.8, text: "Du bist spät dran. Nur kurz aufs Handy…" },
    { at: 3.9, text: "…ein Fehler." },
    { at: 4.9, text: "Blaulicht. Stimmen. Dann: nichts." },
    { at: 7.6, text: "Diagnose: Koma.", highlight: ["Koma."] },
    { at: 8.9, text: "Dein Herz schlägt 100.000 Mal am Tag.", highlight: ["100.000"] },
    { at: 10.6, text: "Manche Komapatienten hören, was gesagt wird." },
    { at: 11.9, text: "Mama liest dir jeden Tag vor." },
    { at: 13.2, text: "Dein Handy: 847 ungelesene Nachrichten.", highlight: ["847"] },
    { at: 14.6, text: "Dann ist der Akku leer." },
    { at: 15.7, text: "Ein Koma dauert meist nur Wochen." },
    { at: 17.1, text: "Deins nicht.", highlight: ["nicht."] },
    { at: 18.6, text: "Haare wachsen gut 1 cm im Monat.", highlight: ["1 cm"] },
    { at: 19.9, text: "Die Pflegerin schneidet. Immer schief." },
    { at: 21.2, text: "Zoomen wir raus." },
    { at: 22.5, text: "Ein Jahr. Die Welt dreht sich weiter.", highlight: ["Ein Jahr."] },
    { at: 24.4, text: "Bettruhe kostet bis zu 1 % Muskelkraft – täglich.", highlight: ["1 %"] },
    { at: 25.9, text: "Physio jeden Tag. Du merkst nichts." },
    { at: 27.4, text: "Am Anfang kamen alle." },
    { at: 28.7, text: "Nach 3 Jahren: nur noch Mama.", highlight: ["Mama."] },
    { at: 30.4, text: "5 Jahre. Draußen wächst eine neue Stadt.", highlight: ["5 Jahre."] },
    { at: 31.9, text: "Pakete kommen jetzt per Drohne." },
    { at: 33.4, text: "Mamas kleine Pflanze von Tag 1…" },
    { at: 34.7, text: "…stößt jetzt an die Decke." },
    { at: 36.2, text: "10 Jahre: 368 Millionen Herzschläge.", highlight: ["368 Millionen"] },
    { at: 37.7, text: "Kein einziger verpasst." },
    { at: 39.2, text: "Mama kommt immer noch." },
    { at: 40.6, text: "Jeden Sonntag. Seit 15 Jahren.", highlight: ["15 Jahren."] },
    { at: 42.2, text: "Deine Stadt kennst du nicht mehr." },
    { at: 43.6, text: "20 Jahre. Mama ist jetzt 71.", highlight: ["20 Jahre."] },
    { at: 45.2, text: "Rekord: Eine Frau erwachte nach 27 Jahren." },
    { at: 46.8, text: "Du ziehst vorbei.", highlight: ["vorbei."] },
    { at: 48.4, text: "Dann, nach 30 Jahren…", highlight: ["30 Jahren…"] },
    { at: 49.7, text: "…zuckt dein Finger." },
    { at: 51.4, text: "Du öffnest die Augen." },
    { at: 52.8, text: "Mama ist 81. Sie weint." },
    { at: 54.6, text: "Du bist jetzt 55.", highlight: ["55."] },
    { at: 55.9, text: "Im Kopf: immer noch 25." },
    { at: 57.6, text: "Dein altes Handy. Ein Chat ist offen." },
    { at: 59.0, text: "Du schreibst: „Sorry, bin gleich da.“" },
    { at: 61.2, text: "„Der Film war eh schlecht.“", italic: true },
  ],

  // ── Englische Fassung (gleiche Animation; Composition „<Id>-EN“) ──
  sceneText: true, // Handy: Chat, Sperrbildschirm, Mitteilungen
  en: {
    title: "What if you were in a coma for 30 years?",
    hook: { text: "What if you were in a coma for 30 years?", highlight: ["30 years"] },
    hud: [
      { label: "Late for the movie", secondary: "Speed" },
      { label: "In a coma for", compare: ["ER", "ICU", "Phone battery: dead", "Slept through a birthday", "Only Mom still comes", "Mom is now 61", "Mom is now 71", "Longer than the record"], secondary: "Heartbeats" },
      { label: "Awake for", compare: ["Hello, world."], secondary: "Your age" },
    ],
    captions: [
      "You're running late. Just a quick look at your phone…",
      "…a mistake.",
      "Blue lights. Voices. Then: nothing.",
      { text: "Diagnosis: coma.", highlight: ["coma."] },
      { text: "Your heart beats 100,000 times a day.", highlight: ["100,000"] },
      "Some coma patients can hear what's said.",
      "Mom reads to you every day.",
      { text: "Your phone: 847 unread messages.", highlight: ["847"] },
      "Then the battery dies.",
      "A coma usually lasts just weeks.",
      { text: "Yours doesn't.", highlight: ["doesn't."] },
      { text: "Hair grows about 1 cm a month.", highlight: ["1 cm"] },
      "The nurse cuts it. Always crooked.",
      "Let's zoom out.",
      { text: "One year. The world keeps turning.", highlight: ["One year."] },
      { text: "Bed rest costs up to 1% muscle strength – daily.", highlight: ["1%"] },
      "Physio every day. You feel nothing.",
      "At first, everyone came.",
      { text: "After 3 years: only Mom.", highlight: ["Mom."] },
      { text: "5 years. A new city grows outside.", highlight: ["5 years."] },
      "Packages now arrive by drone.",
      "Mom's little plant from day 1…",
      "…now touches the ceiling.",
      { text: "10 years: 368 million heartbeats.", highlight: ["368 million"] },
      "Not a single one missed.",
      "Mom still comes.",
      { text: "Every Sunday. For 15 years.", highlight: ["15 years."] },
      "You don't recognize your city anymore.",
      { text: "20 years. Mom is now 71.", highlight: ["20 years."] },
      "Record: a woman woke up after 27 years.",
      { text: "You beat it.", highlight: ["beat"] },
      { text: "Then, after 30 years…", highlight: ["30 years…"] },
      "…your finger twitches.",
      "You open your eyes.",
      "Mom is 81. She's crying.",
      { text: "You're 55 now.", highlight: ["55"] },
      "In your head: still 25.",
      "Your old phone. A chat is open.",
      "You type: “Sorry, almost there.”",
      "“The movie sucked anyway.”",
    ],
    upload: { caption: "What if you were in a coma for 30 years? 🏥⏳ What's the first thing you'd do after waking up?", hashtags: ["#whatif", "#coma", "#simulation", "#pov", "#3danimation", "#fyp"] },
  },

  shots: [
    // ── 1 Alltag: auf dem Rad zum Kino ──
    {
      at: 0, name: "Ego Fahrrad", ambience: "amb_city", ambienceVolume: 0.5,
      render: (s) => <Street shot={s} phase="ride" look={(l) => [0.04 + Math.sin(l * 0.8) * 0.05, -0.36 + l * 0.04, -1]} />,
    },
    {
      at: 2.2, name: "Blick aufs Handy", ambience: "amb_city", ambienceVolume: 0.5, silentCut: true,
      render: (s) => (
        <Street shot={s} phase="phone" ui={{ kind: "lock", clock: "19:58", date: tr("Mittwoch, 11. November", "Wednesday, November 11"), notes: [{ app: "Leon", text: tr("Wo bleibst du??", "Where are you??") }, { app: "Leon", text: tr("Film fängt an!", "Movie\u2019s starting!") }], battery: 0.64 }}
          look={(l) => [0.04, -0.25 - l * 0.01, -0.29]} />
      ),
    },
    {
      at: 3.7, name: "Auto!", ambience: "amb_city", ambienceVolume: 0.5, transition: "whip",
      render: (s) => <Street shot={s} phase="car" look={(l) => [0.8 + l * 0.3, -0.25, -0.75]} />,
    },
    {
      at: CRASH, name: "Am Boden, Blaulicht", transition: "flash", ambience: "amb_city", ambienceVolume: 0.2,
      render: (s) => <GroundLids><EgoGround s={s} /></GroundLids>,
    },
    // ── 2 Koma: Tage, Wochen ──
    {
      at: 7.4, name: "Intensivstation", transition: "dip", ambience: "amb_hospital", ambienceVolume: 0.65,
      render: (s) => (
        <Ward shot={s} cam={move([2.3, 2.3, 1.4], [1.7, 2.0, 0.6], [0, 0.95, -2.3], [0, 0.95, -2.4], 50)} flowers day={() => 0.85}
          people={[MOM_SIT, { who: "dad", pos: [-0.95, 0, -1.25], rotY: Math.PI / 2 + 0.3, pose: "idle" }, { who: "leon", pos: [-0.35, 0, 0.1], rotY: Math.PI + 0.2, pose: "idle", expr: "shock" }, { who: "doc", pos: [-1.35, 0, -2.0], rotY: Math.PI / 2, pose: "point" }]} />
      ),
    },
    {
      at: 10.4, name: "Ego: Mama liest vor", ambience: "amb_hospital", ambienceVolume: 0.6,
      render: (s) => (
        <EgoView open={0.62 + Math.sin(s.start * 2) * 0.05} blur={2.5} dream={0.7}>
          <Ward shot={s} ego="lie" cam={egoLie([0.75, 1.6, -1.9], [0.8, 1.62, -1.85], 62)} flowers day={() => 0.8}
            people={[{ ...MOM_LEAN(0.15), pos: [1.35, 0, -1.6] }, { who: "nurse", pos: [-1.1, 0, -0.6], rotY: Math.PI * 0.8, pose: "idle" }]} />
        </EgoView>
      ),
    },
    {
      at: 13.0, name: "Handy auf dem Nachttisch", ambience: "amb_hospital", ambienceVolume: 0.5,
      render: (s) => <Ward shot={s} cam={move([1.08, 1.12, -2.62], [1.02, 1.06, -2.7], [0.97, 0.71, -2.83], [0.97, 0.71, -2.83], 42)} nightPhone={nightPhoneAt} flowers day={() => 0.7} />,
    },
    {
      at: 15.4, name: "Ego: Jahreszeiten am Fenster", ambience: "amb_hospital", ambienceVolume: 0.55,
      render: (s) => (
        <EgoView open={0.7} blur={1.5} dream={0.6}>
          <Ward shot={s} ego="lie" cam={egoLie([3, 1.55, -0.9], [3, 1.45, -0.6], 58)} day={timelapse(5, 0.45)} season={SEASON} plant={() => 0.25} />
        </EgoView>
      ),
    },
    {
      at: 18.4, name: "Bart wächst", ambience: "amb_hospital", ambienceVolume: 0.55,
      render: (s) => (
        <Ward shot={s} cam={move([0.25, 1.62, -2.0], [0.15, 1.52, -2.1], [0, 0.92, -2.95], [0, 0.92, -2.95], 40)} day={timelapse(3, 0.6)}
          y={(t) => (t < 20.3 ? 0.4 + (t - 18.4) * 0.9 : 0.25)}
          people={[{ who: "nurse", pos: [-0.7, 0, -2.7], rotY: Math.PI / 2, pose: "carry", lean: 0.35, show: [19.9, 21] }]} />
      ),
    },
    {
      at: 21.0, name: "Zoom-out: Krankenhaus im Winter", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => <Town shot={s} era="winter" cam={move([30, 14, 26], [120, 85, 210], [-4, 14, 0], [0, 6, 0], 48)} />,
    },
    // ── 3 Jahre ──
    {
      at: 24.2, name: "Physio", ambience: "amb_hospital", ambienceVolume: 0.55,
      render: (s) => (
        <Ward shot={s} cam={move([-2.1, 1.7, -0.1], [-1.8, 1.6, -0.5], [0.1, 0.95, -1.5], [0.1, 0.95, -1.7], 50)} day={timelapse(4, 0.55)} season={SEASON}
          legLift={(t) => -0.15 - 0.55 * Math.max(0, Math.sin(t * 2.6))} plant={() => 0.45}
          people={[{ who: "physio", pos: [0.55, 0, -0.45], rotY: -Math.PI / 2 - 0.9, pose: "carry", lean: 0.4 }]} />
      ),
    },
    {
      at: 27.2, name: "Ego: Besucher werden weniger", ambience: "amb_hospital", ambienceVolume: 0.55,
      render: (s) => (
        <EgoView open={0.68} blur={1.5} dream={0.6}>
          <Ward shot={s} ego="lie" cam={egoLie([0.1, 1.5, 0.6], [0.2, 1.45, 0.6], 66)} day={timelapse(6, 0.55)} season={SEASON} plant={() => 0.55}
            people={[
              MOM_SIT,
              { who: "dad", pos: [0.55, 0, -0.45], rotY: Math.PI + 0.2, pose: "idle", show: [0, 28.4] },
              { who: "leon", pos: [-0.45, 0, -0.25], rotY: Math.PI - 0.2, pose: "wave", show: [0, 27.75] },
              { who: 22, pos: [0.1, 0, 0.5], rotY: Math.PI, pose: "idle", show: [0, 27.5] },
              { who: 33, pos: [-1.0, 0, -0.9], rotY: Math.PI * 0.75, pose: "phone", show: [0, 28.05] },
            ]} />
        </EgoView>
      ),
    },
    {
      at: 30.2, name: "Stadt der Zukunft (Tag)", ambience: "amb_city", ambienceVolume: 0.5,
      render: (s) => <Town shot={s} era="future" cam={orbit(125, 105, 58, 46, 0.9, 1.35, [0, 18, -10], 46)} />,
    },
    {
      at: 33.2, name: "Ego: Pflanze wächst", ambience: "amb_hospital", ambienceVolume: 0.55,
      render: (s) => (
        <EgoView open={0.7} blur={1.2} dream={0.55}>
          <Ward shot={s} ego="lie" cam={egoLie([2.7, 1.45, -0.4], [2.75, 2.1, -0.3], 60)} day={timelapse(6, 0.55)} season={SEASON} plant={(t) => lerp(0.7, 1.95, clamp((t - 33.2) / 2.6))} people={[{ ...MOM_SIT, show: [33.2, 34.2] }]} />
        </EgoView>
      ),
    },
    {
      at: 36.0, name: "Ego: Monitor nachts", ambience: "amb_hospital", ambienceVolume: 0.5,
      render: (s) => (
        <EgoView open={0.7} blur={1} dream={0.65}>
          <Ward shot={s} ego="lie" cam={egoLie([-1.05, 1.68, -2.5], [-1.0, 1.66, -2.52], 44)} day={() => 0.05} season={SEASON} plant={() => 1.95} />
        </EgoView>
      ),
    },
    {
      at: 39.0, name: "Ego: Mama wird grau", ambience: "amb_hospital", ambienceVolume: 0.55,
      render: (s) => (
        <EgoView open={0.7} blur={1.2} dream={0.55}>
          <Ward shot={s} ego="lie" cam={egoLie([1.1, 1.15, -1.95], [1.05, 1.2, -1.9], 60)} day={timelapse(5, 0.6)} season={SEASON} plant={() => 1.95}
            momY={(t) => lerp(10, 16, clamp((t - 39) / 3))} people={[MOM_SIT]} />
        </EgoView>
      ),
    },
    // ── 4 Extrem ──
    {
      at: 42.0, name: "Stadt nachts, 20 Jahre", ambience: "amb_night", ambienceVolume: 0.55,
      render: (s) => <Town shot={s} era="night" cam={orbit(110, 190, 40, 95, 2.2, 2.55, [0, 20, -20], 48)} />,
    },
    {
      at: 45.0, name: "Rekord: alter Max, Mama schläft", ambience: "amb_hospital", ambienceVolume: 0.5,
      render: (s) => (
        <Ward shot={s} cam={move([-1.5, 2.5, 0.2], [-1.1, 2.3, -0.5], [0, 0.95, -2.7], [0, 0.95, -2.8], 46)} day={() => 0.12} season={SEASON} plant={() => 1.95}
          people={[{ ...MOM_SIT, lean: 0.25 }]} />
      ),
    },
    {
      at: 48.2, name: "Finger zuckt", ambience: "tension", ambienceVolume: 0.45,
      render: (s) => (
        <Ward shot={s} cam={move([0.95, 1.35, -0.85], [0.8, 1.28, -1.02], [0.3, 0.95, -1.62], [0.3, 0.95, -1.62], 38)} day={() => 0.1} season={SEASON} plant={() => 1.95}
          hr={(t) => lerp(70, 92, clamp((t - 48.2) / 2.8))}
          twitch={(t) => (t < 49.7 ? 0 : Math.max(0, Math.sin((t - 49.7) * 9)) * (t < 50.6 ? 1 : 0))} />
      ),
    },
    // ── 5 Aufwachen & Pointe ──
    {
      at: WAKE, name: "Ego: Augen auf", ambience: "amb_hospital", ambienceVolume: 0.55, silentCut: true,
      render: (s) => <EgoWake s={s} />,
    },
    {
      at: 54.4, name: "Max sitzt, Mama umarmt", ambience: "amb_hospital", ambienceVolume: 0.5,
      render: (s) => (
        <Ward shot={s} sit maxExpr="shock" cam={move([-1.7, 1.6, -0.6], [-1.4, 1.55, -0.95], [0.1, 1.25, -2.5], [0.1, 1.3, -2.55], 46)} day={() => 0.85} season={SEASON} plant={() => 1.95}
          people={[{ ...MOM_LEAN(0.3, "happy"), pos: [0.66, 0, -2.3], rotY: -Math.PI / 2 - 0.3 }]} />
      ),
    },
    {
      at: 57.4, name: "Ego: altes Handy", ambience: "amb_hospital", ambienceVolume: 0.45,
      render: (s) => <Ward shot={s} ego="sit" sit cam={egoSit([0, 1.45, -2.12], [0, 1.45, -2.12], 50)} day={() => 0.85} season={SEASON} plant={() => 1.95} handPhone={chatAt} />,
    },
    {
      at: 60.0, name: "Ego: Antwort", ambience: "amb_hospital", ambienceVolume: 0.4, silentCut: true,
      render: (s) => <Ward shot={s} ego="sit" sit cam={egoSit([0, 1.45, -2.12], [0, 1.46, -2.13], 46)} day={() => 0.85} season={SEASON} plant={() => 1.95} handPhone={chatAt} />,
    },
  ],

  // ── Sound-Design (Automatik: Atmos, Übergänge, Meilensteine, Untertitel) ──
  sfx: [
    // Fahrt
    { at: 0.0, sound: "amb_wind", volume: 0.18, dur: 4.4, fadeOut: 0.1 },
    { at: 0.7, sound: "ding", volume: 0.25, rate: 1.9 }, // Fahrradklingel
    { at: 1.9, sound: "buzz", volume: 0.55 },
    { at: 2.25, sound: "msg_in", volume: 0.3 },
    // Unfall
    { at: 3.55, sound: "horn", volume: 0.42 },
    { at: 3.8, sound: "screech", volume: 0.32 },
    { at: CRASH + 0.08, sound: "glass_crack", volume: 0.25 },
    { at: CRASH + 0.12, sound: "thud", volume: 0.3 },
    // Blaulicht, Herzschlag
    { at: 4.9, sound: "siren", volume: 0.3, rate: 0.95 },
    { at: 5.3, sound: "heartbeat", volume: 0.5 },
    { at: 6.3, sound: "heartbeat", volume: 0.45, rate: 0.95 },
    { at: 6.9, sound: "heartbeat", volume: 0.2, rate: 0.9 },
    // Intensivstation
    { at: 7.75, sound: "beep", volume: 0.18 },
    { at: 8.46, sound: "beep", volume: 0.3 },
    { at: 9.32, sound: "beep", volume: 0.3 },
    { at: 10.5, sound: "heartbeat", volume: 0.3, rate: 0.9 },
    // Handy: Nachrichten prasseln
    ...[13.15, 13.45, 13.7, 13.9, 14.05, 14.2, 14.32].map((at, i) => ({ at, sound: "buzz" as const, volume: 0.35, rate: 1 + i * 0.03 })),
    { at: 14.6, sound: "swoosh_down", volume: 0.4 },
    // Jahreszeiten
    { at: 15.5, sound: "swoosh_up", volume: 0.3 },
    { at: 16.6, sound: "amb_wind", volume: 0.15, dur: 1.8 },
    // Schere
    { at: 20.25, sound: "button", volume: 0.4, rate: 1.9 },
    { at: 20.4, sound: "button", volume: 0.4, rate: 2.1 },
    { at: 21.0, sound: "whoosh_long", volume: 0.4, rate: 0.85 },
    // Physio
    ...[24.6, 25.8, 27.0].map((at) => ({ at, sound: "thud" as const, volume: 0.12, rate: 1.6 })),
    // Besucher gehen
    { at: 27.5, sound: "door", volume: 0.35 },
    { at: 27.75, sound: "door", volume: 0.3, rate: 1.1 },
    { at: 28.05, sound: "door", volume: 0.3, rate: 0.95 },
    { at: 28.4, sound: "door", volume: 0.35, rate: 0.9 },
    // Zukunft
    { at: 30.3, sound: "plane", volume: 0.2, rate: 1.8 },
    { at: 31.9, sound: "zap", volume: 0.15, rate: 1.4 },
    { at: 33.3, sound: "grow", volume: 0.45 },
    // Monitor nachts
    ...[36.1, 36.96, 37.82, 38.68].map((at) => ({ at, sound: "beep" as const, volume: 0.35 })),
    { at: 39.1, sound: "whoosh", volume: 0.15, rate: 1.8 },
    { at: 42.1, sound: "plane", volume: 0.25, rate: 1.3 },
    // Rekord
    { at: 46.0, sound: "riser_long", volume: 0.4 },
    // Finger
    ...[48.3, 49.0, 49.6, 50.1, 50.5, 50.85].map((at, i) => ({ at, sound: "beep" as const, volume: 0.3 + i * 0.04 })),
    ...[48.6, 49.3, 49.9, 50.4, 50.8].map((at) => ({ at, sound: "heartbeat" as const, volume: 0.4 })),
    // Aufwachen
    { at: WAKE, sound: "swoosh_up", volume: 0.4, rate: 0.8 },
    { at: WAKE + 0.1, sound: "sub_drop", volume: 0.2 },
    ...[51.4, 52.05, 52.7, 53.35, 54.0].map((at) => ({ at, sound: "beep" as const, volume: 0.3 })),
    { at: 52.8, sound: "chime", volume: 0.25, rate: 0.9 },
    // Handy
    { at: 57.45, sound: "chime", volume: 0.3, rate: 1.2 },
    { at: 58.9, sound: "typing", volume: 0.5 },
    { at: 60.15, sound: "msg_send", volume: 0.5 },
    { at: 61.2, sound: "msg_in", volume: 0.65 },
  ],

  upload: {
    caption: "Was wäre, wenn du 30 Jahre im Koma liegst? 🏥⏳ Was wäre das Erste, was du nach dem Aufwachen machst?",
    hashtags: ["#waswärewenn", "#koma", "#simulation", "#egoperspektive", "#3danimation", "#fyp"],
  },
};

// ── Shots mit eigener Logik ──

/** Am Boden nach dem Unfall: Lider flattern und fallen zu */
const EgoGround: React.FC<{ s: { start: number; end: number } }> = ({ s }) => (
  <Street shot={s} phase="ground" look={(l) => [0.1 + Math.sin(l * 0.7) * 0.15, 1, -0.25 - l * 0.05]} />
);
/** Lid-Verlauf am Boden (abhängig von der Zeit) */
const GroundLids: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const t = f / fps;
  const open = t < 6.2 ? 0.45 + 0.3 * Math.max(0, Math.sin((t - CRASH) * 2.4)) : clamp(0.45 * (7.2 - t));
  return <EgoView open={open} blur={3 + (t - CRASH) * 1.5} dream={0.6}>{children}</EgoView>;
};

/** Aufwachen: schwarz → Lider flattern → Mama */
const EgoWake: React.FC<{ s: { start: number; end: number } }> = ({ s }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const t = f / fps;
  const l = t - WAKE;
  const open = l < 0.35 ? 0 : l < 1.4 ? 0.45 * Math.abs(Math.sin((l - 0.35) * 4.2)) + (l - 0.35) * 0.25 : clamp(0.62 + (l - 1.4) * 0.6) * blinkAt(t, [53.6]);
  const blur = Math.max(0.5, 12 - l * 6);
  return (
    <EgoView open={open} blur={blur}>
      <Ward shot={s} ego="lie" cam={egoLie([0.75, 1.62, -1.9], [0.78, 1.6, -1.88], 60)} day={() => 0.8} season={SEASON} plant={() => 1.95}
        hr={(tt) => lerp(92, 104, clamp((tt - WAKE) / 3))}
        people={[{ ...MOM_LEAN(0.18, l < 1.9 ? "shock" : "happy"), pos: [1.35, 0, -1.6] }]} />
    </EgoView>
  );
};
