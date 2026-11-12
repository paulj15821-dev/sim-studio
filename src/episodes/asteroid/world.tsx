// Szenen für „Was wäre, wenn heute Abend ein Asteroid einschlägt?“
//  Hometown   – Max' Wohnviertel (Meter), Stimmung je Phase: golden → dusk → night → entry → glow → quake → fire → blast → ash
//  Living     – Wohnzimmer, Max bestellt Pizza
//  SpaceScene – Weltall (km): Mond, Nahaufnahme, Satelliten, Zoom-out, ISS, Eintritt, Krater von oben
//  OceanImpact – Einschlag im Meer (km)
import React, { useMemo } from "react";
import * as THREE from "three";
import { COLOR, PALETTE } from "../../style/theme";
import { clamp, keys3, lerp, shake, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glow, Max, Person, Building, Road, Tree, Bush, StreetLamp, Forest, Car,
  SkyDome, Stars, Earth, Moon, SunGlow, Satellite, SpaceStation, Particles, Asteroid, MeteorTrail, Fireball, ShockRing, DustWall, Cloud,
  Table, Shelf, type Pose, type LightPreset,
} from "../../three/kit";
import { DIST, IMPACT, AFTER } from "./metric";

export type Cam = { pos: Vec3; look: Vec3; fov?: number };
export type CamFn = (c: { t: number; local: number; p: number }) => Cam;

/** Kamerafahrt a → b über die Shotdauer */
export const move = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p }) => ({
  pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], p),
  look: keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la }], p),
  fov,
});

// ═════════════════════════ Wohnviertel (Meter) ═════════════════════════

export type Mood = "golden" | "dusk" | "night" | "entry" | "glow" | "quake" | "fire" | "blast" | "ash";

/** Richtung, in der (1.000 km entfernt) der Einschlag liegt: hinter Max' Haus */
const IMP_DIR = new THREE.Vector3(-0.45, 0, -0.89).normalize();
const skyPoint = (elevDeg: number, dist: number, azOff = 0): Vec3 => {
  const e = (elevDeg * Math.PI) / 180;
  const d = IMP_DIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), azOff);
  return [d.x * Math.cos(e) * dist, Math.sin(e) * dist, d.z * Math.cos(e) * dist];
};

type MoodSpec = {
  preset: LightPreset;
  top: string; horizon: string; bottom: string;
  fog: [string, number, number];
  sunDir: Vec3; sunIntensity: number;
  env?: [string, string, string]; envIntensity?: number;
  lamps: boolean; windows: boolean;
  /** farbiges Zusatzlicht aus Richtung Einschlag */
  glow?: { color: string; intensity: number };
};

const MOODS: Record<Mood, MoodSpec> = {
  golden: {
    preset: "golden", top: "#5C74C2", horizon: "#FFA868", bottom: "#E9A47C", fog: ["#F0A880", 70, 520],
    sunDir: [-55, 9, -40], sunIntensity: 2.7, lamps: false, windows: false,
  },
  dusk: {
    preset: "golden", top: "#27346E", horizon: "#E58C7C", bottom: "#4A3A52", fog: ["#7A5A70", 50, 420],
    sunDir: [-55, 4, -40], sunIntensity: 1.1, env: ["#33407A", "#C98A8A", "#2A2430"], envIntensity: 0.7, lamps: true, windows: true,
  },
  night: {
    preset: "night", top: "#0A1230", horizon: "#2E3F78", bottom: "#141A30", fog: ["#1A2448", 50, 420],
    sunDir: [30, 60, 20], sunIntensity: 0.55, lamps: true, windows: true,
  },
  entry: {
    preset: "night", top: "#2A2A5A", horizon: "#FFB27A", bottom: "#3A2A30", fog: ["#7A5060", 60, 520],
    sunDir: [-30, 45, -60], sunIntensity: 0.3, env: ["#3A3A70", "#FFB080", "#2A2028"], envIntensity: 0.9, lamps: true, windows: true,
    glow: { color: "#FFD6A0", intensity: 3.2 },
  },
  glow: {
    preset: "night", top: "#5A3478", horizon: "#FFA060", bottom: "#2A1820", fog: ["#6A3440", 150, 5200],
    sunDir: [20, 50, 30], sunIntensity: 0.25, env: ["#2A1E50", "#FF9A5A", "#201418"], envIntensity: 0.8, lamps: true, windows: true,
    glow: { color: "#FF9A50", intensity: 2.6 },
  },
  quake: {
    preset: "night", top: "#4A2448", horizon: "#E86A40", bottom: "#2A1418", fog: ["#5A2A30", 120, 5200],
    sunDir: [20, 50, 30], sunIntensity: 0.25, env: ["#2A1838", "#D86A40", "#1A1012"], envIntensity: 0.7, lamps: true, windows: false,
    glow: { color: "#FF7A3A", intensity: 2.0 },
  },
  fire: {
    preset: "lava", top: "#3A0A08", horizon: "#FF6A22", bottom: "#2A0806", fog: ["#7A2410", 30, 300],
    sunDir: [-20, 40, -60], sunIntensity: 1.6, lamps: false, windows: false,
    glow: { color: "#FF6A2A", intensity: 2.2 },
  },
  blast: {
    preset: "overcast", top: "#4A3428", horizon: "#B07A50", bottom: "#3A2A20", fog: ["#8A6A50", 20, 220],
    sunDir: [-20, 50, -60], sunIntensity: 1.0, env: ["#5A4434", "#A8805A", "#3A2A20"], envIntensity: 0.8, lamps: false, windows: false,
    glow: { color: "#FF9A50", intensity: 1.2 },
  },
  ash: {
    preset: "overcast", top: "#2E2C2C", horizon: "#6E6660", bottom: "#3A3634", fog: ["#5E5852", 18, 190],
    sunDir: [-20, 60, -40], sunIntensity: 0.55, env: ["#3A3836", "#6E6862", "#2A2826"], envIntensity: 0.55, lamps: false, windows: false,
  },
};

/** Grill mit Glut */
const Grill: React.FC<{ position: Vec3; t: number; on: boolean }> = ({ position, t, on }) => (
  <group position={position}>
    {[[-0.25, -0.18], [0.25, -0.18], [0, 0.22]].map(([x, z], i) => (
      <Box key={i} size={[0.04, 0.75, 0.04]} color="#2A2D33" position={[x, 0.37, z]} bevel={0} />
    ))}
    <mesh position={[0, 0.82, 0]} rotation={[Math.PI, 0, 0]} castShadow>
      <sphereGeometry args={[0.36, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <Flat color="#1E2126" roughness={0.4} metalness={0.3} />
    </mesh>
    <mesh position={[0, 0.83, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.34, 14]} />
      <Flat color={on ? "#FF7A2A" : "#3A3A3A"} emissive={on ? "#FF5A1A" : undefined} emissiveIntensity={1.4} />
    </mesh>
    <Box size={[0.3, 0.03, 0.12]} color="#8A4A3A" position={[-0.08, 0.86, 0.05]} cast={false} />
    <Box size={[0.26, 0.03, 0.1]} color="#9A5A3A" position={[0.1, 0.86, -0.1]} cast={false} />
    {on && <Particles kind="embers" n={18} box={[0.5, 1.4, 0.5]} center={[0, 1.5, 0]} time={t} velocity={[0.1, 0.6, 0]} sizeScale={0.5} seed={3} />}
    {on && <pointLight position={[0, 1.1, 0]} intensity={2.2} distance={4} decay={2} color="#FF8A3A" />}
  </group>
);

/** Einfamilienhaus mit beleuchtbaren Fenstern und Tür (Front zeigt nach +z) */
const Home: React.FC<{ position?: Vec3; rotationY?: number; seed: number; lit: boolean; door?: number; tilt?: number; fire?: boolean; t?: number }> = ({
  position = [0, 0, 0], rotationY = 0, seed, lit, door = 0, tilt = 0, fire = false, t = 0,
}) => {
  const r = rng(seed);
  const wall = r.pick(PALETTE.facade), roof = r.pick(["#C9705A", "#A65B4B", "#7A6F66", "#D58A5E"]);
  return (
    <group position={position} rotation={[tilt, rotationY, tilt * 0.6]}>
      <Building size={[8, 6, 7]} color={wall} roof={roof} seed={seed} lit={lit} />
      <mesh position={[0, 7.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[6.4, 2.8, 4]} />
        <Flat color={roof} />
      </mesh>
      {/* Tür: offen = warmer Innenraum */}
      {door > 0.05 ? (
        <>
          <Box size={[1.4, 2.4, 0.05]} color="#FFD9A0" emissive="#FFB060" position={[0, 1.2, 3.52]} cast={false} bevel={0} />
          <group position={[-0.7, 1.2, 3.6]} rotation={[0, door * 1.6, 0]}>
            <Box size={[1.4, 2.4, 0.1]} color="#6B4A35" position={[0.7, 0, 0]} />
          </group>
          <pointLight position={[0, 1.8, 4.6]} intensity={2.5} distance={6} decay={2} color="#FFC890" />
        </>
      ) : (
        <Box size={[1.4, 2.4, 0.2]} color="#6B4A35" position={[0, 1.2, 3.55]} />
      )}
      <Box size={[2.2, 0.15, 1.4]} color="#B9B2A6" position={[0, 0.07, 4.2]} />
      {fire && <Flame position={[r.range(-2, 2), 7.6, r.range(-1, 1)]} size={1.6} t={t} seed={seed} />}
    </group>
  );
};

/** Flackernde Flamme (Glow-Kegel + Licht) */
const Flame: React.FC<{ position: Vec3; size: number; t: number; seed: number }> = ({ position, size, t, seed }) => {
  const f = 1 + Math.sin(t * 13 + seed) * 0.12 + Math.sin(t * 29 + seed * 2) * 0.08;
  return (
    <group position={position}>
      {[{ c: "#FFE6A0", s: 0.5, o: 0.9 }, { c: "#FFA040", s: 0.8, o: 0.6 }, { c: "#FF5A1A", s: 1.1, o: 0.4 }].map((L, i) => (
        <mesh key={i} position={[0, size * L.s * f * 0.5, 0]} scale={[size * L.s * 0.45, size * L.s * f, size * L.s * 0.45]}>
          <coneGeometry args={[1, 1, 7, 1, true]} />
          <Glow color={L.c} opacity={L.o} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <pointLight position={[0, size, 0]} intensity={6} distance={size * 9} decay={2} color="#FF8A3A" />
    </group>
  );
};

export type Actor = { kind: "max" | "person"; seed?: number; pos: Vec3 | ((t: number) => Vec3); rotY?: number | ((t: number) => number); pose: Pose | ((t: number) => Pose); expr?: "neutral" | "happy" | "shock"; hold?: "phone" | "pizza" | "letter"; screen?: string };

type HometownProps = {
  shot: ShotInfo;
  mood: Mood;
  cam: CamFn;
  actors?: Actor[];
  /** Meteor am Himmel: Höhe (Grad), Helligkeit 0..1, Schweiflänge */
  meteor?: (t: number, local: number) => { elev: number; az?: number; size: number; tail: number } | null;
  shakeAmp?: number;
  door?: (t: number) => number;
  /** Fortschritt der Staubwand (blast) 0..1 */
  wall?: (local: number) => number;
  /** Grill im Garten (Standard an) */
  grill?: boolean;
  /** Zusätzliche Objekte (andere Episoden, z. B. Sirene, Abfang-Spuren) */
  extra?: (t: number, local: number) => React.ReactNode;
  /** Ambient Occlusion erzwingen (z. B. 0 bei hellen Effekten am Himmel) */
  ao?: number;
};

const LAMPS: Vec3[] = [[-22, 0, 11.6], [-2.5, 0, 11.6], [18, 0, 11.6], [-12, 0, 22.4], [8, 0, 22.4]];
const ACROSS = [-26, -13, 0, 13, 26];
const TREES: [number, number, number][] = [[-8.5, 6, 1.5], [9.5, 3, 1.3], [-19, 7, 1.6], [21, 8, 1.4], [-30, 6, 1.5], [6, 27, 1.4], [-20, 28, 1.5], [30, 4, 1.6]];

export const Hometown: React.FC<HometownProps> = ({ shot, mood, cam, actors = [], meteor, shakeAmp = 0, door, wall, grill = true, extra, ao }) => {
  const { t, local, p } = useTimes(shot);
  const m = MOODS[mood];
  const c = cam({ t, local, p });
  const sh = shake(t, shakeAmp, 17);
  const pos: Vec3 = [c.pos[0] + sh[0], c.pos[1] + sh[1], c.pos[2] + sh[2]];
  const quake = mood === "quake";
  const blast = mood === "blast";
  const tiltOf = (i: number) => (quake ? Math.sin(t * 19 + i * 1.7) * 0.012 : 0);
  const bend = blast ? 0.25 + Math.sin(t * 9) * 0.06 : mood === "ash" ? 0.08 : 0;
  const met = meteor?.(t, local) ?? null;
  const glowPos = skyPoint(9, 2400, -0.12);
  const wallP = wall ? wall(local) : 0;

  return (
    <Stage preset={m.preset} bg={m.top} fog={m.fog} sunDir={m.sunDir} sunIntensity={m.sunIntensity} env={m.env} envIntensity={m.envIntensity}
      shadowCenter={[0, 0, 10]} shadowSize={34} ao={ao ?? (met || m.glow ? 0 : 1)}>
      <Camera pos={pos} look={c.look} fov={c.fov ?? 45} near={0.1} far={9000} />
      <SkyDome top={m.top} horizon={m.horizon} bottom={m.bottom} radius={4000} sun={mood === "golden" || mood === "dusk" ? m.sunDir : undefined} sunColor="#FFD2A0" haze={1} />
      {(mood === "night" || mood === "dusk" || mood === "entry") && <Stars n={1400} radius={3800} opacity={mood === "dusk" ? 0.35 : 0.8} />}

      {/* Boden, Straße */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <Flat color={mood === "ash" ? "#6A6460" : mood === "fire" ? "#4A3A20" : mood === "blast" ? "#6A5A40" : PALETTE.grassDark} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 7.5]} receiveShadow>
        <planeGeometry args={[60, 9]} />
        <Flat color={mood === "ash" ? "#7A746E" : PALETTE.grass} />
      </mesh>
      <Road length={400} width={8} position={[0, 0, 17]} rotationY={Math.PI / 2} />
      <Box size={[1.4, 0.06, 6]} color="#B9B2A6" position={[0, 0.03, 8.5]} cast={false} />

      {/* Häuser */}
      <Home seed={41} lit={m.windows} door={door ? door(t) : 0} tilt={tiltOf(0)} />
      {[-15, 15, -30, 30].map((x, i) => <Home key={x} seed={50 + i} position={[x, 0, -1]} lit={m.windows} tilt={tiltOf(i + 1)} fire={mood === "fire" && i % 2 === 0} t={t} />)}
      {ACROSS.map((x, i) => <Home key={x} seed={60 + i} position={[x, 0, 31]} rotationY={Math.PI} lit={m.windows} tilt={tiltOf(i + 5)} fire={mood === "fire" && i === 3} t={t} />)}
      {[-45, 45].map((x, i) => <Building key={x} position={[x, 0, -4]} size={[12, 14, 10]} seed={80 + i} lit={m.windows} />)}
      <Forest n={70} area={[400, 120]} center={[0, 0, -90]} seed={7} kind="pine" />

      {/* Bäume, Büsche */}
      {TREES.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} rotation={[bend * (0.8 + (i % 3) * 0.15), 0, 0]}>
          <Tree seed={i + 3} scale={s} kind={mood === "ash" || mood === "fire" ? "bare" : "round"} />
        </group>
      ))}
      {[[-4.5, 4.4], [4.6, 4.4], [-11, 12.6]].map(([x, z], i) => <Bush key={i} position={[x, 0, z]} seed={i + 40} scale={1.0} />)}
      {/* Gartenzaun */}
      {Array.from({ length: 12 }).map((_, i) => (
        <Box key={i} size={[0.08, 0.9, 0.08]} color="#F2EDE4" position={[-12 + i * 2.2 + (i >= 6 ? 1.2 : 0), 0.45, 12.4]} bevel={0} />
      ))}
      <Box size={[11.2, 0.08, 0.06]} color="#F2EDE4" position={[-6.4, 0.75, 12.4]} bevel={0} />
      <Box size={[11.2, 0.08, 0.06]} color="#F2EDE4" position={[7.6, 0.75, 12.4]} bevel={0} />
      {/* Briefkasten */}
      <group position={[1.4, 0, 12.9]}>
        <Box size={[0.08, 1.05, 0.08]} color="#3B434D" position={[0, 0.52, 0]} bevel={0} />
        <Box size={[0.36, 0.3, 0.5]} color="#D8463C" position={[0, 1.15, 0]} />
      </group>
      <Car seed={3} position={[-7, 0, 15.6]} rotationY={Math.PI / 2} />
      <Car seed={5} position={[11, 0, 18.4]} rotationY={-Math.PI / 2} />

      {/* Laternen */}
      {LAMPS.map((l, i) => (
        <group key={i} rotation={[0, 0, tiltOf(i + 11) * 3]}>
          <StreetLamp position={l} on={m.lamps && !(quake && Math.sin(t * 23 + i) > 0.6)} />
          {m.lamps && <pointLight position={[l[0] + 0.2, 4.6, l[2]]} intensity={18} distance={14} decay={2} color="#FFD58A" />}
        </group>
      ))}

      {grill && mood !== "fire" && mood !== "blast" && mood !== "ash" && <Grill position={[2.3, 0, 8.9]} t={t} on={mood !== "quake"} />}

      {/* Figuren */}
      {actors.map((a, i) => {
        const ps = typeof a.pose === "function" ? a.pose(t) : a.pose;
        const pp = typeof a.pos === "function" ? a.pos(t) : a.pos;
        const ry = typeof a.rotY === "function" ? a.rotY(t) : a.rotY ?? 0;
        return a.kind === "max"
          ? <Max key={i} pose={ps} time={t} position={pp} rotationY={ry} expression={a.expr} hold={a.hold} screen={a.screen} />
          : <Person key={i} seed={a.seed ?? i + 1} pose={ps} time={t} position={pp} rotationY={ry} expression={a.expr} hold={a.hold} screen={a.screen} />;
      })}
      {extra?.(t, local)}

      {/* Meteor am Himmel */}
      {met && (
        <group position={skyPoint(met.elev, 2600, met.az ?? 0)}>
          <SunGlow position={[0, 0, 0]} size={met.size} color="#FFF0D8" />
          <group rotation={[0.35, 0, -0.5]}>
            <MeteorTrail radius={met.size * 0.07} length={met.tail} strength={Math.min(1, met.tail / 200)} time={t} />
          </group>
        </group>
      )}

      {/* Licht aus Richtung Einschlag / Meteor */}
      {m.glow && (
        <>
          <directionalLight position={met ? skyPoint(met.elev, 100, met.az ?? 0) : [glowPos[0] / 24, 60, glowPos[2] / 24]} intensity={m.glow.intensity} color={m.glow.color} />
          {mood !== "entry" && <SunGlow position={glowPos} size={mood === "blast" ? 2600 : 4200} color={m.glow.color} opacity={mood === "blast" ? 0.5 : 1} />}
          {(mood === "glow" || mood === "quake") && (
            <group position={skyPoint(0, 3400, -0.12)}>
              <Fireball r={420} column={mood === "glow" ? 1500 + (t - 38) * 60 : 1900} heat={mood === "glow" ? 0.85 : 0.55} time={t} />
            </group>
          )}
        </>
      )}

      {/* Wetter je Phase */}
      {quake && <Particles kind="debris" n={70} box={[40, 14, 30]} center={[0, 6, 12]} time={t} velocity={[0, -6, 0]} seed={4} />}
      {quake && <Particles kind="dust" n={160} box={[30, 4, 24]} center={[0, 1.5, 12]} time={t} velocity={[0.6, 0.3, 0.2]} sizeScale={3} seed={6} />}
      {mood === "fire" && (
        <>
          <Particles kind="streaks" n={110} box={[160, 120, 160]} center={[0, 50, 0]} time={t} velocity={[-14, -70, 8]} colors={["#FFB45A", "#FF7A2A", "#FFE2A0"]} sizeScale={3} seed={8} />
          <Particles kind="embers" n={140} box={[30, 10, 30]} center={[0, 4, 12]} time={t} velocity={[0.4, 1.2, 0.2]} sizeScale={1.6} seed={9} />
          {[[-9, 0, 9], [12, 0, 6], [-3, 0, 24]].map((fp, i) => <Flame key={i} position={fp as Vec3} size={1.3} t={t} seed={i + 2} />)}
        </>
      )}
      {blast && (
        <>
          <Particles kind="debris" n={160} box={[50, 12, 60]} center={[0, 4, 12]} time={t} velocity={[2, 1.5, 42]} stretch={2} sizeScale={1.3} seed={12} />
          <Particles kind="dust" n={300} box={[40, 10, 40]} center={[0, 3, 14]} time={t} velocity={[1, 0.4, 30]} sizeScale={4} colors={["#A8885E", "#8A6E50"]} seed={13} />
          <group position={[0, 0, lerp(-160, 6, wallP)]}>
            <DustWall width={420} height={70} time={t} color="#8A6A50" />
          </group>
        </>
      )}
      {mood === "ash" && <Particles kind="snow" n={420} box={[24, 12, 24]} center={[pos[0] * 0.5, 5, pos[2] - 8]} time={t} velocity={[0.25, -0.7, 0.15]} sizeScale={1.3} colors={["#B8B2AC", "#8E8882", "#D2CCC6"]} seed={14} />}
    </Stage>
  );
};

// ═════════════════════════ Wohnzimmer ═════════════════════════

/** `extra`: zusätzliche Objekte (z. B. POV-Arme) */
export const Living: React.FC<{ shot: ShotInfo; cam: CamFn; extra?: (t: number, local: number) => React.ReactNode }> = ({ shot, cam, extra }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const W = 7, H = 3, D = 6;
  return (
    <Stage preset="interior" bg="#101830" fog={null} sunDir={[4, 6, 8]} sunIntensity={0.25} env={["#3A3040", "#8A7060", "#4A3A30"]} envIntensity={0.5} shadowCenter={[0, 1, 0]} shadowSize={6} aoRadius={0.5}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.05} far={3000} />
      {/* Raum */}
      <Box size={[W, 0.1, D]} color="#B88A5E" position={[0, -0.05, 0]} cast={false} />
      <Box size={[0.15, H, D]} color="#E6DCCB" position={[-W / 2, H / 2, 0]} />
      <Box size={[0.15, H, D]} color="#E6DCCB" position={[W / 2, H / 2, 0]} />
      {/* Rückwand mit großem Fenster (Loch) */}
      <Box size={[1.6, H, 0.15]} color="#E6DCCB" position={[-2.7, H / 2, -D / 2]} />
      <Box size={[2.3, H, 0.15]} color="#E6DCCB" position={[2.35, H / 2, -D / 2]} />
      <Box size={[3.1, 0.7, 0.15]} color="#E6DCCB" position={[-0.35, 0.35, -D / 2]} />
      <Box size={[3.1, 0.45, 0.15]} color="#E6DCCB" position={[-0.35, H - 0.22, -D / 2]} />
      <Box size={[3.1, 0.06, 0.2]} color="#FFFFFF" position={[-0.35, 0.72, -D / 2]} />
      <Box size={[0.06, 1.85, 0.12]} color="#FFFFFF" position={[-0.35, 1.62, -D / 2]} />
      <Box size={[W, 0.1, D]} color="#F4F1EC" position={[0, H + 0.05, 0]} cast={false} />
      {/* draußen: Nachthimmel mit hellem Punkt */}
      <SkyDome top="#0A1230" horizon="#33467E" bottom="#141A30" radius={1500} />
      <Stars n={600} radius={1400} opacity={0.8} />
      <SunGlow position={[-90, 160, -900]} size={110} color="#FFF0D8" />
      <group position={[-90, 160, -900]} rotation={[0.35, 0, -0.5]}>
        <MeteorTrail radius={6} length={120} strength={0.6} time={t} />
      </group>
      {[[-60, -30, -260], [40, -26, -300], [-10, -28, -220]].map((b, i) => (
        <Building key={i} position={b as Vec3} size={[18, 24, 14]} seed={90 + i} lit />
      ))}
      {/* Möbel */}
      <group position={[1.6, 0, -1.6]}>
        <Box size={[2.4, 0.45, 0.95]} color="#4E6A8A" position={[0, 0.3, 0]} />
        <Box size={[2.4, 0.6, 0.25]} color="#4E6A8A" position={[0, 0.75, -0.38]} />
        <Box size={[0.25, 0.55, 0.95]} color="#4E6A8A" position={[-1.2, 0.5, 0]} />
        <Box size={[0.25, 0.55, 0.95]} color="#4E6A8A" position={[1.2, 0.5, 0]} />
        <Box size={[0.5, 0.15, 0.35]} color="#F2C14E" position={[0.6, 0.6, -0.15]} />
      </group>
      <Table position={[1.4, 0, -0.2]} size={[1.2, 0.42, 0.6]} />
      <Shelf position={[-W / 2 + 0.35, 0, 0.6]} width={1.8} />
      <Box size={[0.6, 0.02, 0.4]} color="#2A2D33" position={[1.3, 0.46, -0.2]} cast={false} />
      {/* Stehlampe */}
      <group position={[-2.6, 0, -2.2]}>
        <Box size={[0.05, 1.6, 0.05]} color="#2A2D33" position={[0, 0.8, 0]} bevel={0} />
        <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.18, 0.28, 0.3, 12, 1, true]} /><Flat color="#FFE7C0" emissive="#FFD090" emissiveIntensity={1.6} side={THREE.DoubleSide} /></mesh>
        <pointLight position={[0, 1.6, 0]} intensity={4} distance={8} decay={2} color="#FFC88A" />
      </group>
      <pointLight position={[0.5, 2.6, 0.5]} intensity={3} distance={9} decay={2} color="#FFE4C0" />
      <Max pose="phone" hold="phone" time={t} position={[-0.6, 0, -1.4]} rotationY={0.35} />
      {extra?.(t, local)}
    </Stage>
  );
};

// ═════════════════════════ Weltall (km) ═════════════════════════

const R = 6371;
const SUN: Vec3 = [60, 25, 40];
const sunFar = (k = 6000): Vec3 => [SUN[0] * k, SUN[1] * k, SUN[2] * k];
/** Einschlagstelle (Einheitsvektor) – nahe der Tag-Nacht-Grenze = Abend */
const N_IMP = new THREE.Vector3(-0.42, 0.52, 0.74).normalize();
const nImp = (k: number): Vec3 => [N_IMP.x * k, N_IMP.y * k, N_IMP.z * k];

/** Kreisscheibe tangential auf der Erdoberfläche (Einschlagstelle, Krater) */
const SurfaceDisc: React.FC<{ center: Vec3; normal: THREE.Vector3; r0?: number; r: number; color: string; opacity: number; glow?: boolean }> = ({ center, normal, r0 = 0, r, color, opacity, glow = true }) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal), [normal]);
  return (
    <mesh position={center} quaternion={q}>
      {r0 > 0 ? <ringGeometry args={[r0, r, 64]} /> : <circleGeometry args={[r, 48]} />}
      {glow ? <Glow color={color} opacity={opacity} side={THREE.DoubleSide} /> : <Flat color={color} opacity={opacity} side={THREE.DoubleSide} />}
    </mesh>
  );
};

/** 1-px-Linie */
const Line: React.FC<{ a: Vec3; b: Vec3; color: string; opacity?: number }> = ({ a, b, color, opacity = 1 }) => {
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  geo.setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
  geo.computeBoundingSphere();
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </lineSegments>
  );
};

/** Mint-Drahtgitter-Kegel als Größenvergleich (Mount Everest, 8,849 km) */
const EverestGhost: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 8.849 / 2, 0]}>
      <coneGeometry args={[5.5, 8.849, 7, 3]} />
      <meshBasicMaterial color={COLOR.accent} wireframe transparent opacity={0.9} toneMapped={false} />
    </mesh>
    <mesh position={[0, 8.849 / 2, 0]}>
      <coneGeometry args={[5.5, 8.849, 7, 1]} />
      <Glow color={COLOR.accent} opacity={0.12} />
    </mesh>
  </group>
);

export type SpaceLayout = "moon" | "close" | "sats" | "zoom" | "iss" | "entry" | "scar";

export const SpaceScene: React.FC<{ shot: ShotInfo; layout: SpaceLayout }> = ({ shot, layout }) => {
  const { t, local, p } = useTimes(shot);
  const alt = DIST(t) / 1000; // km über der Oberfläche
  const spin: Vec3 = [0.4 + t * 0.07, t * 0.11, 0.2];
  let cam: Cam;
  let body: React.ReactNode;

  if (layout === "moon") {
    cam = { pos: keys3([{ t: 0, v: [11, 2.5, 24] }, { t: 1, v: [7.5, 1.8, 18] }], p), look: [-3.2, 1.2, 0], fov: 42 };
    body = (
      <>
        <Moon radius={1737} position={[-7600, 1700, -9800 - local * 300]} />
        <Asteroid radius={5} rotation={spin} />
        <Particles kind="debris" n={60} box={[80, 40, 80]} center={[0, 0, 0]} time={t} velocity={[0, 0, 30]} sizeScale={0.8} colors={["#6B625A", "#58504A"]} seed={21} />
      </>
    );
  } else if (layout === "close") {
    const a = 0.75 + p * 0.45;
    cam = { pos: [Math.sin(a) * 26, 3 + p * 2, Math.cos(a) * 26], look: [-4.5, 1.5, 0], fov: 44 };
    body = (
      <>
        <Asteroid radius={5} rotation={spin} />
        <EverestGhost position={[-12.5, -4.4, 3]} />
        <Earth radius={R} position={[-26000, -9000, -150000]} rotationY={1.3} tilt={0.9} />
        <Particles kind="debris" n={40} box={[60, 40, 60]} time={t} velocity={[0, 0, 25]} sizeScale={0.7} colors={["#6B625A", "#58504A"]} seed={22} />
      </>
    );
  } else if (layout === "sats") {
    // Ursprung = Satellit. Asteroid rauscht vorbei Richtung Erde.
    const ast = keys3([{ t: 0, v: [9, 5, -42] }, { t: 1, v: [-10, -12, -105] }], p);
    cam = { pos: keys3([{ t: 0, v: [0.0025, 0.0016, 0.015] }, { t: 1, v: [0.002, 0.0014, 0.0125] }], p), look: [-0.0006, -0.0004, -0.02], fov: 50 };
    body = (
      <>
        <Earth radius={R} position={[-12000, -14000, -36000]} rotationY={0.8} tilt={0.3} />
        <Satellite scale={0.001} rotation={[0.2, 0.7 + t * 0.02, 0.1]} />
        <Satellite scale={0.001} position={[0.4, -0.05, -0.9]} rotation={[0.4, 1.4, 0]} />
        <Satellite scale={0.001} position={[-1.6, 0.3, -3.4]} rotation={[0.1, 2.0, 0.3]} />
        <Asteroid radius={5} position={ast} rotation={spin} />
      </>
    );
  } else if (layout === "zoom") {
    const astPos = nImp(R + alt);
    const d = 26000 + p * 9000;
    const cdir = N_IMP.clone().multiplyScalar(1).add(new THREE.Vector3(0.5, 0.1, 0.1)).normalize();
    cam = { pos: [cdir.x * d, cdir.y * d, cdir.z * d], look: [cdir.x * 2200, cdir.y * 2200 + 1400, cdir.z * 2200], fov: 40 };
    body = (
      <>
        <Earth radius={R} rotationY={0.6} tilt={0.2} />
        <Moon radius={1737} position={[-160000, 90000, -340000]} />
        <SunGlow position={astPos} size={d * 0.06} color="#FFE2B0" />
        <Asteroid radius={5 * d * 0.0004} position={astPos} rotation={spin} />
        <Line a={astPos} b={nImp(R + 5)} color={COLOR.accent} opacity={0.85} />
        <SurfaceDisc center={nImp(R + 8)} normal={N_IMP} r0={150} r={210} color={COLOR.accent} opacity={0.8} />
      </>
    );
  } else if (layout === "iss") {
    // Ursprung = ISS (408 km). Asteroid fällt seitlich vorbei.
    const ast: Vec3 = [-42, alt - 408, -55];
    const dir = new THREE.Vector3(...ast).normalize();
    const camPos: Vec3 = keys3([{ t: 0, v: [0.05, 0.004, 0.06] }, { t: 1, v: [0.045, 0.006, 0.05] }], p);
    const lk = new THREE.Vector3(0, -0.2, -1).normalize().lerp(dir, 0.55).multiplyScalar(0.08);
    cam = { pos: camPos, look: [lk.x, lk.y, lk.z], fov: 55 };
    body = (
      <>
        <Earth radius={R} position={[0, -(R + 408), 0]} rotationY={0.5} tilt={1.0} cloudHeight={0.0016} />
        <SpaceStation scale={0.001} rotation={[0.9, 0.6, 0.25]} />
        <Asteroid radius={5} position={ast} rotation={spin} />
      </>
    );
  } else if (layout === "entry") {
    const heat = clamp((140 - alt) / 60);
    cam = { pos: keys3([{ t: 0, v: [-120, 20, 560] }, { t: 1, v: [-95, 12, 470] }], p), look: [-70, -30, 0], fov: 44 };
    body = (
      <>
        <SkyDome top="#02030A" horizon="#1A3A8A" bottom="#0A1A3A" radius={1500} haze={0.6} />
        <Earth radius={R} position={[0, -(R + alt), 0]} rotationY={0.3 + t * 0.002} tilt={1.0} cloudHeight={0.0016} />
        <group rotation={[0, 0, -0.75]}>
          <Asteroid radius={5} rotation={spin} heat={heat * 0.45} />
          <MeteorTrail radius={5.6} length={40 + heat * 420} strength={0.35 + heat * 0.65} time={t} />
          <SunGlow position={[0, 0, 0]} size={30 + heat * 60} color="#FFE2B0" />
        </group>
        <pointLight position={[0, -6, 0]} intensity={heat * 1.5} distance={0} decay={0} color="#FFB060" />
      </>
    );
  } else {
    // scar: Erde von oben, Einschlagstelle glüht, Auswurf breitet sich aus
    const after = AFTER(t);
    const d = 15000 + p * 5000;
    const cdir = N_IMP.clone().add(new THREE.Vector3(0.35, 0.05, 0.1)).normalize();
    const ej = 300 + Math.sqrt(after) * 120; // Auswurf-Ring (km)
    cam = { pos: [cdir.x * d, cdir.y * d, cdir.z * d], look: [N_IMP.x * R * 0.9, N_IMP.y * R * 0.9 + 300, N_IMP.z * R * 0.9], fov: 40 };
    body = (
      <>
        <Earth radius={R} rotationY={0.6} tilt={0.2} />
        <SurfaceDisc center={nImp(R + 3)} normal={N_IMP} r={ej} color="#5A3A28" opacity={0.75} glow={false} />
        <SurfaceDisc center={nImp(R + 5)} normal={N_IMP} r0={ej * 0.9} r={ej} color="#FFB060" opacity={0.6} />
        <SurfaceDisc center={nImp(R + 7)} normal={N_IMP} r={90} color="#FFE2A0" opacity={1} />
        <SurfaceDisc center={nImp(R + 8)} normal={N_IMP} r={260} color="#FF7A2A" opacity={0.55} />
        <SunGlow position={nImp(R + 120)} size={1600} color="#FF9A50" />
      </>
    );
  }

  const near = layout === "sats" || layout === "iss" ? 0.0005 : 0.05;
  return (
    <Stage preset="space" bg="#04060D" fog={null} sunDir={SUN} sunIntensity={3.0} shadows={false} logDepth>
      <Camera pos={cam.pos} look={cam.look} fov={cam.fov ?? 45} near={near} far={4_000_000} />
      <Stars n={2600} radius={1_500_000} />
      <SunGlow position={sunFar(20000)} size={50000 * 20} />
      {body}
    </Stage>
  );
};

// ═════════════════════════ Einschlag im Meer (km) ═════════════════════════

export const OceanImpact: React.FC<{ shot: ShotInfo; cam: CamFn; phase: "incoming" | "impact" }> = ({ shot, cam, phase }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const d = DIST(t) / 1000;
  const after = Math.max(0, t - IMPACT); // Video-Sekunden seit Einschlag
  const dir = new THREE.Vector3(-0.55, 0.83, -0.1).normalize(); // Anflugrichtung (zum Asteroiden hin)
  const astPos: Vec3 = [dir.x * (d + 5), dir.y * (d + 5), dir.z * (d + 5)];
  const trailRot = useMemo(() => new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)), []);
  const fr = phase === "impact" ? 18 + 70 * (1 - Math.exp(-after * 0.9)) : 0;
  const col = phase === "impact" ? 30 + after * 55 : 0;
  const heat = phase === "impact" ? clamp(1 - after * 0.18, 0.35, 1) : 0;
  const sh = shake(t, phase === "impact" ? Math.max(0, 3.5 - after * 1.2) : 0.4, 21);
  const light = phase === "impact" ? 3.5 * heat : 2;
  return (
    <Stage preset="night" bg="#060A1C" fog={["#2A2440", 300, 3200]} sunDir={[-40, 30, -60]} sunIntensity={0.3} env={["#1A1A40", "#7A5070", "#060818"]} envIntensity={0.6} shadows={false} logDepth bloom={phase === "impact" ? 0.3 : 0.55}>
      <Camera pos={[c.pos[0] + sh[0], c.pos[1] + sh[1] * 0.5, c.pos[2] + sh[2]]} look={c.look} fov={c.fov ?? 45} near={0.01} far={50000} />
      <SkyDome top="#05081A" horizon={phase === "impact" ? "#FF9A5A" : "#3A3060"} bottom="#0A0E20" radius={20000} haze={1} />
      <Stars n={1600} radius={19000} opacity={phase === "impact" ? 0.3 : 0.9} />
      {/* Meer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60000, 60000]} />
        <meshStandardMaterial color="#0E2238" roughness={0.45} metalness={0.1} />
      </mesh>
      {[[-60, 3, 40], [40, 4, 70], [-120, 3, -60], [90, 3.5, -30], [10, 3, 120]].map((cp, i) => (
        <Cloud key={i} position={cp as Vec3} scale={[14, 4, 10]} seed={i + 5} color="#8A8AA8" />
      ))}
      {phase === "incoming" && (
        <group position={astPos}>
          <Asteroid radius={5} rotation={[t * 0.3, t * 0.5, 0]} heat={0.8} />
          <group rotation={trailRot}>
            <MeteorTrail radius={7} length={260} strength={1} time={t} />
          </group>
          <pointLight intensity={light} distance={0} decay={0} color="#FFC890" />
        </group>
      )}
      {phase === "impact" && (
        <>
          <Fireball r={fr} column={col} heat={heat * 0.8} time={t} />
          <ShockRing radius={fr * 1.4 + after * 60} width={0.06} color="#FFC890" opacity={0.35 * heat} />
          <ShockRing radius={fr * 1.1 + after * 25} width={0.12} color="#DDE8F2" opacity={0.45} glow={false} />
          <pointLight position={[0, fr * 0.6, 0]} intensity={light} distance={0} decay={0} color="#FFC890" />
          <Particles kind="embers" n={160} box={[fr * 4, col + fr, fr * 4]} center={[0, (col + fr) / 2, 0]} time={t} velocity={[0, 40, 0]} sizeScale={fr * 0.4} seed={31} />
        </>
      )}
    </Stage>
  );
};
