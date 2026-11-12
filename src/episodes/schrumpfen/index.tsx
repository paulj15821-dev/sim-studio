// „POV: Du wirst jede Sekunde halb so groß.“ – Format A (Exponential), Regel ÷2 pro Sekunde.
// Küche → Max' Schuh → Teppich-Wald (Ameise, Staubsauger, Milben, Haar) → Bakterien → Viren → Moleküle → Atome
// → darunter ein Universum → eine Küche: Max sagt „Alter… du schrumpfst ja.“ (Loop zum Anfang).
import React from "react";
import type { Episode } from "../../types";
import { clamp, lerp, type Vec3 } from "../../lib/anim";
import { fmtLength, fmtCount } from "../../lib/metric";
import { SIZE, HALVINGS, COSMOS, HOME, RESHRINK, unit } from "./metric";
import { Box } from "../../three/kit";
import {
  Scene, pov, Grow, Kitchen, MaxAt, Carpet, Specks, Ant, Mite, Hair, Nozzle, Ground, AtomField, Galaxy, EYE, sm, type Times,
  Particles, Stars, Earth, SunGlow, BacteriaSwarm, Bacterium, Virus, SpikyBall, MoleculeField, Glow,
} from "./world";

const K = (t: number) => unit(t, 1); // Szeneneinheiten pro Meter
const MM = (t: number) => unit(t, 1e-3);
const UM = (t: number) => unit(t, 1e-6);
const NM = (t: number) => unit(t, 1e-9);
const sc = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k];
const L3 = (a: Vec3, b: Vec3, e: number): Vec3 => [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];

// ── Max bückt sich (Shot 2): Gesichtsposition in Metern ──
const BEND_Z = -1.1;
const bend = (t: number) => sm(2.5, 3.7, t) * 0.8;
const maxFace = (b: number): Vec3 => [0, 0.9 + 0.86 * Math.cos(b), BEND_Z + 0.86 * Math.sin(b)];

// ── Max' Schritt (Shot 3) ──
// Schuh kommt schräg von vorn oben und landet 0,3 m vor dir (Fußmitte bleibt bei z = −0,3 m)
const stepHip = (t: number) => (t < 5.2 ? -0.6 * sm(4.6, 5.15, t) : -0.6 * (1 - sm(5.2, 5.62, t)));
const stepZ = (t: number) => -0.34 - 0.85 * Math.sin(-stepHip(t)) - 0.12 * (1 - sm(4.6, 5.62, t));
const shoePos = (t: number): Vec3 => {
  const th = -stepHip(t);
  return [0, 0.9 - 0.85 * Math.cos(th), stepZ(t) + 0.85 * Math.sin(th) + 0.04];
};
const LAND = 5.62;

// ── Staubsauger (Shot 5): Düse z in mm ──
const nozzleZ = (t: number) => lerp(-130, 70, sm(9.4, 12.0, t) * 0.55 + clamp((t - 9.4) / 2.6) * 0.45);

const kitchenFog = (t: number): [string, number, number] => ["#E9E4DC", 30 * Math.min(K(t), 8), 140 * Math.min(K(t), 8)];
const rugFog = (far: number): [string, number, number] => ["#AEB9C6", far * 0.25, far];

export const schrumpfen: Episode = {
  id: "Schrumpfen",
  title: "POV: Du wirst jede Sekunde halb so groß",
  duration: 38,
  coldOpen: { at: 5.0, dur: 1.0 },
  accent: "red",
  hook: { text: "POV: Du wirst jede Sekunde halb so groß.", highlight: ["halb"], until: 2.4 },

  hud: [
    {
      label: "Deine Größe",
      value: SIZE,
      format: fmtLength,
      compareDir: "down",
      compare: [
        { at: 1e9, text: "Normal" },
        { at: 0.29, text: "Kleiner als Max' Schuh" },
        { at: 0.017, text: "Wie ein Zuckerwürfel" },
        { at: 0.0051, text: "Wie eine Ameise" },
        { at: 3.1e-4, text: "Wie eine Staubmilbe" },
        { at: 7.1e-5, text: "Dünner als ein Haar" },
        { at: 2.05e-6, text: "Wie ein Bakterium" },
        { at: 1.02e-7, text: "Wie ein Virus" },
        { at: 1e-8, text: "Wie ein Eiweiß" },
        { at: 1e-9, text: "Wie ein Zuckermolekül" },
        { at: 3.5e-10, text: "Wie ein Wassermolekül" },
      ],
      pill: { every: 1, text: (s) => `÷2 IN ${s} S`, stopAt: COSMOS },
      secondary: { label: "Halbiert", value: HALVINGS, format: (v) => `${fmtCount(v)}×` },
      scaleBar: { from: 1.8, to: 1e-10 },
      until: COSMOS,
    },
    {
      label: "Deine Größe",
      value: SIZE,
      format: fmtLength,
      compare: [{ at: 0, text: "Normal. Oder?" }],
      pill: { every: 1, text: (s) => `÷2 IN ${s} S`, startAt: RESHRINK },
      scaleBar: { from: 1.8, to: 1e-10 },
      from: HOME + 0.3,
    },
  ],

  chapters: [
    { at: 4.6, text: "ZENTIMETER" },
    { at: 7.6, text: "MILLIMETER" },
    { at: 14.5, text: "MIKROMETER" },
    { at: 27.0, text: "NANOMETER" },
    { at: 29.6, text: "ATOME" },
    { at: COSMOS, text: "DARUNTER" },
  ],

  captions: [
    { at: 0.2, text: "Deine Hose rutscht. Du schrumpfst.", highlight: ["schrumpfst."] },
    { at: 1.3, text: "Jede Sekunde: halb so groß.", highlight: ["halb"] },
    { at: 2.6, text: "Du bist so groß wie Max' Schuh." },
    { at: 3.6, text: "Er will dich aufheben…" },
    { at: 4.8, text: "…und tritt fast drauf. LAUF!", highlight: ["LAUF!"] },
    { at: 6.1, text: "Sein Schuh: so lang wie ein Haus." },
    { at: 7.9, text: "Eine Ameise. Genau so groß wie du.", highlight: ["Ameise."] },
    { at: 9.5, text: "Max sucht dich. Mit dem Staubsauger.", highlight: ["Staubsauger."] },
    { at: 10.8, text: "Halt dich fest!", highlight: ["Halt", "dich", "fest!"] },
    { at: 12.2, text: "Hausstaubmilben. Sie fressen Hautschuppen.", highlight: ["Hausstaubmilben."] },
    { at: 13.3, text: "Die Hautschuppen von Max.", italic: true },
    { at: 14.8, text: "Ein Haar von Max. Dicker als du.", highlight: ["Haar"] },
    { at: 16.0, text: "Bald dick wie ein Baumstamm." },
    { at: 17.2, text: "Max sucht mit der Taschenlampe." },
    { at: 18.3, text: "Für ihn bist du jetzt unsichtbar.", highlight: ["unsichtbar."] },
    { at: 19.7, text: "Bakterien. Größer als du.", highlight: ["Bakterien."] },
    { at: 20.8, text: "Eine schwimmt direkt auf dich zu. WEG!", highlight: ["WEG!"] },
    { at: 22.2, text: "Viren landen. Erst klein wie Hunde…" },
    { at: 23.5, text: "…dann größer als du.", highlight: ["größer"] },
    { at: 24.7, text: "Max ruft 112: „Er ist… klein geworden.“", italic: true },
    { at: 25.9, text: "„Wie klein?“ – „Ja.“", italic: true },
    { at: 27.2, text: "Wassermoleküle prasseln auf dich ein.", highlight: ["prasseln"] },
    { at: 28.4, text: "Ohne Pause. Das ist Wärme.", highlight: ["Wärme."] },
    { at: 29.8, text: "Atome. Fast nur leerer Raum.", highlight: ["leerer", "Raum."] },
    { at: 31.0, text: "Du passt durch die Lücken. Du fällst.", highlight: ["fällst."] },
    { at: 32.8, text: "Darunter: Sterne.", highlight: ["Sterne."] },
    { at: 33.9, text: "Eine Galaxie. Eine Erde. Eine Küche." },
    { at: 35.4, text: "Max schaut dich an:" },
    { at: 36.4, text: "„Alter… du schrumpfst ja.“", italic: true },
  ],

  shots: [
    // ── Alltag (≤ 3 s): Küche, du schrumpfst sofort ──
    {
      at: 0, name: "Küche", ambience: "amb_interior", ambienceVolume: 0.45,
      render: (s) => (
        <Scene shot={s} preset="interior" fog={null} shadowSize={16}
          view={({ t }) => { const k = K(t); return pov(t, [0, 1.62 * k, -1.4 * k], { fov: 64 + t * 2 }); }}
          ego={(t) => (t < 1.1 ? "reach" : "idle")}
          world={({ t }) => (
            <Grow t={t} len={1}>
              <Kitchen carpet={0.3}>
                <MaxAt pos={[0, 0, -1.4]} pose={t < 1.0 ? "idle" : "shock"} time={t} expr={t < 0.6 ? "neutral" : "shock"} />
              </Kitchen>
            </Grow>
          )} />
      ),
    },
    {
      at: 2.4, name: "Max bückt sich", ambience: "amb_interior", ambienceVolume: 0.4,
      render: (s) => (
        <Scene shot={s} preset="interior" fog={null} shadowSize={30}
          view={({ t }) => pov(t, sc(maxFace(bend(t)), K(t)), { fov: 70 })}
          ego="brace"
          world={({ t }) => (
            <Grow t={t} len={1}>
              <Kitchen carpet={0.3}>
                <MaxAt pos={[0, 0, BEND_Z]} pose="idle" time={t}
                  joints={{ bodyX: bend(t), headX: 0.45, rArmX: -0.4 - bend(t) * 1.4, lArmX: -0.2, rArmZ: 0.1 }} />
              </Kitchen>
            </Grow>
          )} />
      ),
    },
    {
      at: 4.6, name: "Schuh", ambience: "tension", ambienceVolume: 0.45,
      render: (s) => (
        <Scene shot={s} preset="interior" fog={["#E9E4DC", 150, 900]} shadowSize={24}
          view={({ t }) => {
            const k = K(t), sp = shoePos(t);
            const eye: Vec3 = [lerp(0, 3.0, sm(4.8, 5.6, t)), EYE, lerp(0, 1.6, sm(4.8, 5.6, t))];
            const look = t < LAND ? sc([sp[0], sp[1] + 0.03, sp[2]], k) : L3(sc([0, 0.05, -0.3], k), sc([0.06, 0.03, -0.32], k), sm(LAND, 7, t));
            return pov(t, look, { eye, run: t > 4.8 && t < 5.6, fov: 72 });
          }}
          ego={(t) => (t < 4.8 ? "idle" : t < 5.45 ? "run" : "brace")}
          shakeAmp={(t) => (t > LAND ? 0.35 * Math.max(0, 1 - (t - LAND) / 0.6) : 0)}
          world={({ t }) => (
            <Grow t={t} len={1}>
              <Kitchen carpet={0.25}>
                <MaxAt pos={[-0.13, 0, stepZ(t)]} pose="idle" time={t} expr="neutral"
                  joints={{ rHip: stepHip(t), lHip: 0.3 * sm(4.6, 5.62, t), bodyX: 0.15, headX: 0.5 }} />
                {/* dunkle Profilsohle (folgt Max' rechtem Bein) */}
                <group position={[0, 0.9, stepZ(t)]} rotation={[stepHip(t), 0, 0]}>
                  <Box size={[0.235, 0.022, 0.34]} color="#3A3F47" position={[0, -0.9, 0.04]} roughness={0.9} />
                  {[-0.12, -0.07, -0.02, 0.03, 0.08, 0.13, 0.18].map((z) => <Box key={z} size={[0.2, 0.012, 0.022]} color="#2A2D33" position={[0, -0.914, z]} bevel={0} />)}
                </group>
                {t > LAND && <group position={[0, 0.002, -0.3]}><Particles kind="dust" n={60} box={[0.5, 0.06, 0.5]} center={[0, 0.03, 0]} time={t - LAND} sizeScale={0.02} velocity={[0, 0.02, 0]} /></group>}
              </Kitchen>
            </Grow>
          )} />
      ),
    },
    // ── Millimeter: Teppich wird Wald ──
    {
      at: 7.0, name: "Ameise", ambience: "amb_nature", ambienceVolume: 0.25,
      render: (s) => (
        <Scene shot={s} preset="interior" bg="#AEB9C6" shadowSize={20}
          fog={rugFog(Math.min(110, 80 * MM(7.0) + 60 * (MM(9.4) - MM(7.0)) * 0))}
          view={({ t }) => { const m = MM(t), az = antZ(t); return pov(t, [0, lerp(0.4, 1.2, sm(7, 9.4, t)), az * m], { fov: 68 }); }}
          ego={(t) => (t < 8.6 ? "idle" : "brace")}
          world={({ t }) => (
            <Grow t={t} len={1e-3}>
              <Carpet radius={70} spacing={3} thick={0.7} seed={7} clear={1.6} lane={3.5} />
              <Specks n={50} radius={40} size={[0.3, 1.6]} seed={21} colors={["#F4EFE6", "#E2C79A", "#C9A27A"]} />
              <Ant position={[0, 0, antZ(t)]} rotY={0} time={t} walk={t < 8.9 ? 1 : 0.15} />
            </Grow>
          )} />
      ),
    },
    {
      at: 9.4, name: "Staubsauger", ambience: "amb_wind_strong", ambienceVolume: 0.7,
      render: (s) => (
        <Scene shot={s} preset="interior" bg="#AEB9C6" fog={rugFog(260)} shadowSize={60} sunDir={[4, 30, 10]}
          view={({ t }) => { const m = MM(t); const nz = nozzleZ(t); return pov(t, [0, Math.min(60, 18 * m), Math.min(-6, (nz + 20) * m)], { fov: 72 }); }}
          ego={(t) => (t < 10.7 ? "idle" : "brace")}
          shakeAmp={(t) => 0.05 + 0.3 * sm(10.6, 11.6, t) * (1 - sm(11.8, 12, t))}
          world={({ t }) => {
            const nz = nozzleZ(t);
            const wind = (x: number, z: number): [number, number] => {
              const dz = z - nz;
              const f = Math.exp(-Math.abs(dz) / 70) * 0.75;
              return [dz > 0 ? -f : f, -x * 0.002 * f];
            };
            return (
              <Grow t={t} len={1e-3}>
                <Carpet radius={40} spacing={2.5} thick={0.65} seed={9} clear={1.4} wind={wind} lane={4} />
                <Carpet radius={260} spacing={9} thick={1.4} seed={10} inner={40} wind={wind} base={false} lane={14} />
                <Nozzle z={nz} time={t} />
                <Particles kind="dust" n={160} box={[60, 10, 80]} center={[0, 5, nz + 50]} time={t} velocity={[0, 0.6, -45]} stretch={4} sizeScale={6} />
                {Math.abs(nz) < 45 && <Particles kind="streaks" n={140} box={[40, 30, 50]} center={[0, 15, nz]} time={t} velocity={[0, 60, 0]} opacity={0.6} sizeScale={8} />}
              </Grow>
            );
          }} />
      ),
    },
    {
      at: 12.0, name: "Milben", ambience: "tension", ambienceVolume: 0.35,
      render: (s) => (
        <Scene shot={s} preset="interior" bg="#B7B9BE" fog={["#B7B9BE", 20, 150]} shadowSize={30}
          view={({ t }) => { const m = MM(t); return pov(t, [0.02 * m, 0.4 + 0.5 * sm(12, 14.5, t), mite1Z(t) * m], { fov: 68 }); }}
          ego={(t) => (t < 13.1 ? "idle" : "brace")}
          world={({ t }) => (
            <Grow t={t} len={1e-3}>
              <Carpet radius={14} spacing={2.5} thick={0.6} seed={11} clear={0.6} />
              <Specks n={220} radius={3} size={[0.03, 0.35]} seed={33} flat={0.12} />
              <Mite position={[0.02, 0, mite1Z(t)]} rotY={0} time={t} seed={1} />
              <Mite position={[-0.55, 0, -0.9 + (t - 12) * 0.05]} rotY={0.6} time={t + 0.3} seed={2} />
              <Mite position={[0.7, 0, -1.3]} rotY={-0.9} time={t + 0.7} walk={0.4} seed={3} />
              <Particles kind="dust" n={120} box={[2, 1, 2]} center={[0, 0.4, -0.6]} time={t} sizeScale={0.02} velocity={[0.01, 0.003, 0]} />
            </Grow>
          )} />
      ),
    },
    // ── Mikrometer ──
    {
      at: 14.5, name: "Haar", ambience: "amb_interior", ambienceVolume: 0.3,
      render: (s) => (
        <Scene shot={s} preset="interior" bg="#B9B4AC" fog={["#B9B4AC", 25, 220]} shadowSize={30}
          view={({ t }) => { const m = MM(t); return pov(t, [lerp(-0.3, 0.3, sm(14.5, 17, t)), Math.max(0.5, 0.04 * m), -0.18 * m], { fov: 68 }); }}
          ego="reach"
          world={({ t }) => (
            <Grow t={t} len={1e-3}>
              <Carpet radius={5} spacing={2.5} thick={0.6} seed={13} clear={0.9} />
              <Specks n={160} radius={1.6} size={[0.01, 0.12]} seed={41} flat={0.12} />
              <Hair length={3.2} position={[0, 0, -0.2]} />
              <Hair length={4} position={[0.3, 0, -0.75]} rotY={0.55} seed={6} color="#3E2A1E" />
              <Particles kind="dust" n={100} box={[0.4, 0.15, 0.4]} center={[0, 0.06, -0.2]} time={t} sizeScale={0.002} velocity={[0.002, 0.0005, 0]} />
            </Grow>
          )} />
      ),
    },
    {
      at: 17.0, name: "Zoom-out: Max sucht", ambience: "amb_interior", ambienceVolume: 0.45, transition: "whip",
      render: (s) => (
        <Scene shot={s} preset="interior" fog={null} shadowSize={4} ego={false}
          view={({ t }) => {
            const e = sm(17, 19.3, t);
            return { pos: L3([0.02, 0.025, 0.06], [0.95, 1.15, 1.7], e), look: L3([0, 0.008, -0.08], [0, 0.35, -0.45], e), fov: lerp(50, 58, e) };
          }}
          world={({ t }) => (
            <Kitchen carpet={0.3}>
              <MaxAt pos={[0, 0, -0.62]} pose="sit" time={t} hold="phone" screen="#FFFFFF"
                joints={{ bodyX: 0.55, headX: 0.55, rArmX: -1.05, rArmZ: 0.15, lArmX: -0.5 }} />
              {/* Lichtkegel der Taschenlampe */}
              <mesh position={[0.05, 0.28, -0.25]} rotation={[0.55, 0, 0]}>
                <coneGeometry args={[0.22, 0.56, 24, 1, true]} />
                <Glow color="#FFF4D6" opacity={0.12} />
              </mesh>
              <mesh position={[0, 0.006, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.22, 32]} />
                <Glow color="#FFF4D6" opacity={0.18} />
              </mesh>
            </Kitchen>
          )} />
      ),
    },
    {
      at: 19.5, name: "Bakterien", ambience: "amb_underwater", ambienceVolume: 0.5,
      render: (s) => (
        <Scene shot={s} preset="micro" shadowSize={20}
          view={({ t }) => { const u = UM(t); const bz = bactZ(t); return pov(t, [0, lerp(1.4, 1.2 * u, sm(20.6, 21.6, t)), Math.min(-3, bz * u)], { fov: 68, run: t > 21.0 }); }}
          ego={(t) => (t < 20.8 ? "idle" : t < 21.1 ? "brace" : "run")}
          world={({ t }) => (
            <Grow t={t} len={1e-6}>
              <Ground size={400} color="#2E8F86" seed={3} bump={0.003} />
              <BacteriaSwarm n={70} area={[70, 14, 70]} center={[0, 7, -25]} size={[0.6, 0.9]} time={t} seed={5} />
              <Bacterium position={[0.3, 1.1, bactZ(t)]} rotation={[Math.PI / 2, 0.2, Math.sin(t * 2) * 0.1]} scale={0.85} color="#8E6BE0" />
              <Particles kind="bubbles" n={90} box={[30, 12, 30]} center={[0, 6, -8]} time={t} sizeScale={3} />
            </Grow>
          )} />
      ),
    },
    {
      at: 22.0, name: "Viren", ambience: "amb_underwater", ambienceVolume: 0.45,
      render: (s) => (
        <Scene shot={s} preset="micro" bg="#1B5E6A" fog={["#2A7C82", 10, 140]} shadowSize={30}
          view={({ t }) => { const n = NM(t); return pov(t, [0, lerp(150, 110, sm(22, 24.5, t)) * n + 0.6, -260 * n], { fov: 68 }); }}
          ego={(t) => (t < 23.4 ? "idle" : "brace")}
          world={({ t }) => (
            <Grow t={t} len={1e-9}>
              <Ground size={60000} color="#7C5FC9" seed={8} bump={0.0008} />
              {PHAGES.map((ph, i) => (
                <Virus key={i} position={[ph[0], Math.max(0, ph[2] * (1 - sm(22, 23.6 + i * 0.12, t))), ph[1]]} rotation={[0, i * 0.7, 0]} scale={45} color="#D8DDE3" />
              ))}
              {SPIKY.map((p, i) => <SpikyBall key={i} position={[p[0], p[1] + Math.sin(t + i) * 10, p[2]]} scale={55} color={i % 2 ? "#E8C93A" : "#E07BB5"} seed={i + 2} />)}
              <Particles kind="bubbles" n={120} box={[1500, 600, 1500]} center={[0, 300, -500]} time={t} sizeScale={60} velocity={[0, 25, 0]} />
            </Grow>
          )} />
      ),
    },
    {
      at: 24.5, name: "Max ruft 112", ambience: "amb_interior", ambienceVolume: 0.45,
      render: (s) => (
        <Scene shot={s} preset="interior" fog={null} shadowSize={4} ego={false}
          view={({ t }) => { const e = sm(24.5, 27, t); return { pos: L3([0.35, 0.04, 0.4], [0.2, 0.06, 0.28], e), look: L3([0, 1.5, -0.7], [0, 1.65, -0.7], e), fov: 60 }; }}
          world={({ t }) => (
            <Kitchen carpet={0.3}>
              <MaxAt pos={[0, 0, -0.7]} pose="phone" hold="phone" time={t} screen="#FF5A4E" joints={{ headX: 0.55 }} />
            </Kitchen>
          )} />
      ),
    },
    // ── Nanometer ──
    {
      at: 27.0, name: "Wassermoleküle", ambience: "amb_wind", ambienceVolume: 0.45,
      render: (s) => (
        <Scene shot={s} preset="underwater" bg="#123F5C" fog={["#174A66", 2, 40]} shadowSize={10} shadows={false}
          view={({ t }) => pov(t, [Math.sin(t * 3) * 0.5, EYE + 0.2, -6], { fov: 70 })}
          ego="brace" shakeAmp={() => 0.06}
          world={({ t }) => {
            const n = NM(t);
            return (
              <group>
                <Grow t={t} len={1e-9}>
                  <MoleculeField n={2600} area={[34, 16, 34]} center={[0, 1.62 / n, -6]} size={0.11} time={t * 3} seed={41} />
                </Grow>
                <Particles kind="streaks" n={120} box={[14, 8, 14]} center={[0, EYE, -3]} time={t} velocity={[18, 3, 6]} opacity={0.35} />
              </group>
            );
          }} />
      ),
    },
    {
      at: 29.6, name: "Atome", ambience: "tension", ambienceVolume: 0.5,
      render: (s) => (
        <Scene shot={s} preset="night" bg="#060B18" fog={["#060B18", 4, 70]} shadows={false} bloom={0.7}
          view={({ t }) => pov(t, [0, lerp(0.2, -2.5, sm(31, 32.6, t)), -6], { fov: 70 })}
          ego="idle"
          world={({ t }) => (
            <group position={[0, sm(31, 32.6, t) * 1.1 * NM(t), 0]}>
              <Grow t={t} len={1e-9}>
                <AtomField n={34} layers={4} time={t} />
              </Grow>
            </group>
          )} />
      ),
    },
    // ── Darunter ──
    {
      at: COSMOS, name: "Sterne", ambience: "amb_space", ambienceVolume: 0.6, transition: "dip",
      render: (s) => (
        <Scene shot={s} preset="space" fog={null} shadows={false} bloom={0.8} ego={false}
          view={({ t }) => { const e = sm(COSMOS, 34, t); return { pos: [0, lerp(40, 18, e), lerp(140, 40, e)], look: [0, -4, -40], fov: 62 }; }}
          world={({ t }) => (
            <group>
              <Stars n={2500} radius={1500} />
              <Galaxy position={[0, -10, -40]} scale={70} rot={t * 0.15} tilt={0.35} />
            </group>
          )} />
      ),
    },
    {
      at: 34.0, name: "Erde", ambience: "amb_space", ambienceVolume: 0.5,
      render: (s) => (
        <Scene shot={s} preset="space" fog={null} shadows={false} ego={false}
          view={({ t }) => { const e = sm(34, 35.2, t); return { pos: [0, 0, lerp(60, 15.5, e)], look: [0, lerp(0, 4, e), 0], fov: 55 }; }}
          world={({ t }) => (
            <group>
              <Stars n={2000} radius={1500} />
              <Earth radius={10} rotationY={2.2 + t * 0.2} />
              <SunGlow position={[300, 120, -600]} size={160} />
            </group>
          )} />
      ),
    },
    // ── Pointe: eine Küche. Loop. ──
    {
      at: HOME, name: "Küche (Loop)", ambience: "amb_interior", ambienceVolume: 0.45, transition: "flash",
      render: (s) => (
        <Scene shot={s} preset="interior" fog={null} shadowSize={16}
          view={({ t }) => { const k = K(t); return pov(t, [0, 1.62 * k, -1.4 * k], { fov: 64 }); }}
          ego={(t) => (t < RESHRINK ? "idle" : "reach")}
          world={({ t }) => (
            <Grow t={t} len={1}>
              <Kitchen carpet={0.3}>
                <MaxAt pos={[0, 0, -1.4]} pose={t < 36.2 ? "idle" : "point"} time={t} expr={t < 35.8 ? "neutral" : "shock"} />
              </Kitchen>
            </Grow>
          )} />
      ),
    },
  ],

  sfx: [
    // Schrumpfen setzt ein
    { at: 0.1, sound: "shrink", volume: 0.5 },
    { at: 0.3, sound: "swoosh_down", volume: 0.3, rate: 1.2 },
    { at: 1.1, sound: "shrink", volume: 0.35, rate: 0.9 },
    { at: 2.0, sound: "shrink", volume: 0.3, rate: 0.8 },
    // Max bückt sich
    { at: 2.6, sound: "heartbeat", volume: 0.45 },
    { at: 2.8, sound: "swoosh_down", volume: 0.35, rate: 0.6 },
    { at: 3.9, sound: "whoosh", volume: 0.35, rate: 0.7 },
    // Schuh
    { at: 4.65, sound: "riser", volume: 0.45 },
    ...[4.85, 5.05, 5.25, 5.45].map((at, i) => ({ at, sound: "step" as const, volume: 0.35, rate: i % 2 ? 1.5 : 1.7 })),
    { at: LAND, sound: "impact", volume: 0.55, rate: 0.7 },
    { at: LAND + 0.02, sound: "boom", volume: 0.3, rate: 0.9 },
    { at: LAND + 0.05, sound: "rumble", volume: 0.4 },
    // Ameise
    ...[7.2, 7.45, 7.7, 7.95, 8.2, 8.45, 8.7].map((at, i) => ({ at, sound: "step" as const, volume: 0.13, rate: 2.6 + (i % 2) * 0.3 })),
    { at: 9.0, sound: "crunch", volume: 0.3, rate: 1.8 },
    // Staubsauger
    { at: 9.45, sound: "buzz", volume: 0.3, rate: 0.45 },
    { at: 9.6, sound: "whoosh_long", volume: 0.4, rate: 0.5 },
    { at: 10.5, sound: "buzz", volume: 0.4, rate: 0.4 },
    { at: 10.8, sound: "rumble", volume: 0.45, rate: 0.8 },
    { at: 11.3, sound: "whoosh_hard", volume: 0.5, rate: 0.6 },
    // Milben
    { at: 12.3, sound: "tick_low", volume: 0.25, rate: 0.7 },
    { at: 13.3, sound: "crunch", volume: 0.4, rate: 1.4 },
    { at: 13.7, sound: "crunch", volume: 0.3, rate: 1.6 },
    // Haar
    { at: 14.6, sound: "swoosh_down", volume: 0.3, rate: 0.7 },
    { at: 15.9, sound: "thud", volume: 0.25, rate: 0.6 },
    // Max mit Taschenlampe
    { at: 17.1, sound: "swoosh_up", volume: 0.35 },
    { at: 17.3, sound: "button", volume: 0.4, rate: 0.9 },
    // Bakterien
    { at: 19.6, sound: "splash", volume: 0.3, rate: 0.7 },
    { at: 20.8, sound: "whoosh", volume: 0.45, rate: 0.6 },
    { at: 20.9, sound: "heartbeat", volume: 0.5 },
    ...[21.1, 21.4, 21.7].map((at, i) => ({ at, sound: "splash" as const, volume: 0.2, rate: 1.4 + i * 0.1 })),
    // Viren
    { at: 22.3, sound: "zap", volume: 0.3, rate: 0.8 },
    ...[22.9, 23.2, 23.5, 23.8].map((at, i) => ({ at, sound: "thud" as const, volume: 0.28, rate: 1.6 - i * 0.15 })),
    // Max ruft an
    ...[24.6, 24.8, 25.0].map((at, i) => ({ at, sound: "beep" as const, volume: 0.35, rate: [1, 1, 1.3][i] })),
    { at: 25.3, sound: "msg_in", volume: 0.3 },
    // Moleküle
    ...[27.1, 27.4, 27.6, 27.9, 28.1, 28.4, 28.7, 28.9, 29.2].map((at, i) => ({ at, sound: "tick" as const, volume: 0.18, rate: 1.6 + (i % 3) * 0.3 })),
    { at: 27.0, sound: "glitch", volume: 0.25 },
    // Atome → Fall
    { at: 29.7, sound: "chime", volume: 0.3, rate: 0.7 },
    { at: 30.6, sound: "riser_long", volume: 0.45 },
    { at: 31.0, sound: "swoosh_down", volume: 0.45, rate: 0.5 },
    // Kosmos
    { at: COSMOS + 0.1, sound: "whoosh_long", volume: 0.4, rate: 0.6 },
    { at: 34.0, sound: "whoosh_hard", volume: 0.45, rate: 0.8 },
    // Küche: und wieder von vorn
    { at: HOME + 0.6, sound: "heartbeat", volume: 0.35 },
    { at: RESHRINK, sound: "shrink", volume: 0.55 },
    { at: RESHRINK + 1.0, sound: "shrink", volume: 0.4, rate: 0.9 },
  ],

  upload: {
    caption: "POV: Du wirst jede Sekunde halb so groß 🔬😳 Bei welcher Größe wärst du ausgestiegen?",
    hashtags: ["#pov", "#waswärewenn", "#schrumpfen", "#simulation", "#3danimation", "#fyp"],
  },
};

// ── Bahnen ──
function antZ(t: number) { return lerp(-34, -10, sm(7.0, 8.9, t)); }
function mite1Z(t: number) { return lerp(-1.0, -0.42, sm(12, 14.2, t)); }
function bactZ(t: number) { return lerp(-24, -3.2, sm(19.6, 21.2, t)); }
const PHAGES: Vec3[] = [[-70, -230, 400], [90, -200, 480], [-180, -380, 560], [210, -340, 520], [15, -500, 640], [-280, -180, 450], [300, -540, 720], [-110, -700, 800]];
const SPIKY: Vec3[] = [[-700, 450, -1400], [650, 300, -1100], [100, 800, -1900]];
