// Szenen für „Was wäre, wenn alle Menschen auf einmal verschwinden?“
//  City      – Max' Straße mit Bushaltestelle, ganze Stadt drumherum. `age` (Jahre ohne Menschen) steuert
//              Verfall: Gras im Asphalt → Bäume, Ranken, Rost → Ruinen → Wald. Nachtmodus mit Lichtern, die ausgehen.
//  PlaneSky  – Flugzeug ohne Piloten über den Wolken
//  EarthDark – Erde bei Nacht, die Lichter gehen regionsweise aus
//  Subway    – U-Bahnhof läuft voll Wasser
//  Bridge    – Rostige Hängebrücke stürzt in den Fluss
//  Desert    – Pyramiden nach 10.000 Jahren
import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { clamp, keys3, lerp, mixHex, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glow, Glass, Max, Person, Building, Tree, StreetLamp, Car, SkyDome, Stars, Cloud, Particles,
  Instanced, lumpyIco, Earth, Airplane, Deer, Rock, Birds, type Pose, type Inst, type LightPreset, type DeerPose,
} from "../../three/kit";
import { VANISH, years } from "./metric";

export type Cam = { pos: Vec3; look: Vec3; fov?: number; roll?: number };
export type CamFn = (c: { t: number; local: number; p: number }) => Cam;

/** Kamerafahrt a → b über die Shotdauer */
export const move = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p }) => ({
  pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], p),
  look: keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la }], p),
  fov,
});

const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Verfallsstufen aus dem Alter in Jahren */
export const decay = (age: number) => ({
  s1: sm(0.05, 1.5, age), // Gras, Risse
  s2: sm(3, 40, age), // Bäume, Ranken, Rost
  s3: sm(80, 700, age), // Ruinen, Autos weg
  s4: sm(700, 6000, age), // nur noch Hügel und Wald
});

// ═════════════════════════ Stadt ═════════════════════════

export const MAXP: Vec3 = [6.6, 0, 0.6];
const LAMP_CRASH: Vec3 = [5.4, 0, -9.6];
const RUST = "#8A4B32", MOSS = "#5E7A45", JUNGLE = "#4F8A47";

type Bld = { x: number; z: number; w: number; d: number; h: number; c: string; seed: number; order: number; ruin: number; front: number };

function useCityLayout() {
  return useMemo(() => {
    const r = rng(2026);
    const blds: Bld[] = [];
    const crosses = [-228, -132, -36, 60];
    for (const X of [-120, -60, 0, 60, 120])
      for (const s of [-1, 1]) {
        let z = -300;
        while (z < 130) {
          const w = r.range(10, 19);
          if (crosses.some((c) => z + w > c - 8 && z < c + 8)) { z += 4; continue; }
          const depth = r.range(14, 18);
          const main = X === 0;
          const down = Math.max(0, 1 - Math.hypot(X, z + 150) / 220);
          let h = main ? r.range(14, 30) : r.range(10, 34) * (1 + down * 1.6);
          if (!main && r.next() < 0.06) h *= 2;
          h = Math.max(9.6, Math.round(h / 3.2) * 3.2);
          const x0 = X + s * 11.5;
          const zone = Math.floor((X + 150) / 60) * 7 + Math.floor((z + 320) / 96);
          blds.push({ x: x0 + s * depth / 2, z: z + w / 2, w: depth, d: w, h, c: r.pick(PALETTE.facade), seed: r.int(1, 9999), order: ((zone * 0.618) % 1) * 0.85 + r.range(0, 0.15), ruin: r.range(0.22, 0.7), front: x0 });
          z += w + r.range(0.4, 1.6);
        }
      }
    // Streubäume (wachsen mit dem Alter) – Straßen, Höfe, Lücken
    const wild: { p: Vec3; s: number; seed: number; k: number }[] = [];
    for (let i = 0; i < 150; i++) {
      const onMain = i < 60;
      const x = onMain ? r.range(-9, 9) : r.pick([-120, -60, 0, 60, 120]) + r.range(-9, 9);
      const z = onMain ? r.range(-140, 40) : r.range(-300, 120);
      if (Math.hypot(x - MAXP[0], z - MAXP[2]) < 5) continue;
      wild.push({ p: [x, 0, z], s: r.range(0.8, 1.6), seed: r.int(1, 999), k: r.range(0, 1) });
    }
    // Querstraßen-Bäume für die Drohne
    for (let i = 0; i < 40; i++) wild.push({ p: [r.range(-140, 140), 0, r.pick([-228, -132, -36, 60]) + r.range(-6, 6)], s: r.range(0.8, 1.5), seed: r.int(1, 999), k: r.range(0, 1) });
    // Grasbüschel/Sträucher auf Asphalt
    const tufts: { p: Vec3; s: number; k: number; c: string }[] = [];
    for (let i = 0; i < 700; i++) {
      const near = i < 380;
      const x = near ? r.range(-10, 10) : r.pick([-120, -60, 0, 60, 120]) + r.range(-10, 10);
      const z = near ? r.range(-90, 30) : r.range(-300, 120);
      tufts.push({ p: [x, 0, z], s: r.range(0.25, 0.9), k: r.range(0, 1), c: r.pick(PALETTE.leaf) });
    }
    const cracks: Inst[] = [];
    for (let i = 0; i < 90; i++) cracks.push({ p: [r.range(-5, 5), 0.035, r.range(-80, 25)], r: [0, r.range(-1.2, 1.2), 0], s: [0.07, 0.02, r.range(1.5, 5)], c: "#2A2D33" });
    let tower = 0;
    blds.forEach((b, i) => { if (Math.hypot(b.x - 19, b.z + 100) < Math.hypot(blds[tower].x - 19, blds[tower].z + 100)) tower = i; });
    return { blds, wild, tufts, cracks, tower };
  }, []);
}

// ── Personen ──
type Walker = { x: number; z0: number; dir: number; v: number; seed: number; pose: Pose; rot?: number };
const WALKERS: Walker[] = (() => {
  const r = rng(77);
  const w: Walker[] = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side > 0 ? r.pick([10.1, 10.4]) : r.pick([-7.6, -9.2]);
    w.push({ x, z0: r.range(-60, 30), dir: r.sign(), v: r.range(1.1, 1.6), seed: 100 + i, pose: "walk" });
  }
  // Wartende an der Haltestelle
  w.push({ x: 8.0, z0: -2.4, dir: 0, v: 0, seed: 301, pose: "phone", rot: -1.2 });
  w.push({ x: 8.9, z0: -0.4, dir: 0, v: 0, seed: 302, pose: "sit", rot: -Math.PI / 2 });
  w.push({ x: 7.4, z0: -3.4, dir: 0, v: 0, seed: 303, pose: "idle", rot: -1.9 });
  w.push({ x: 8.9, z0: 1.2, dir: 0, v: 0, seed: 304, pose: "sit", rot: -Math.PI / 2 });
  // Fußgänger an der Ampel
  for (let i = 0; i < 6; i++) w.push({ x: -4 + i * 1.6, z0: -38 + (i % 2) * 1.5, dir: 0, v: 1.3, seed: 320 + i, pose: "walk", rot: Math.PI / 2 });
  return w;
})();
const walkerPos = (w: Walker, t: number): Vec3 => {
  const tt = Math.min(t, VANISH);
  if (w.rot === Math.PI / 2 && w.v) return [w.x + w.v * tt, 0, w.z0];
  return [w.x, 0, w.z0 + w.dir * w.v * tt];
};

// ── Autos ──
type CarDef = { x: number; z0: number; v: number; coast: number; color: string; crash?: boolean };
const CARS: CarDef[] = [
  { x: 2.5, z0: 42.4, v: 14, coast: 0, color: PALETTE.car[0], crash: true },
  { x: 2.5, z0: 75, v: 13, coast: 4.5, color: PALETTE.car[2] },
  { x: 2.5, z0: 6, v: 12, coast: 3.5, color: PALETTE.car[3] },
  { x: -2.5, z0: -70, v: 13, coast: 4, color: PALETTE.car[1] },
  { x: -2.5, z0: -30, v: 12, coast: 3, color: PALETTE.car[4] },
  { x: -2.5, z0: -125, v: 14, coast: 5, color: PALETTE.car[5] },
  { x: 2.5, z0: -60, v: 11, coast: 3, color: PALETTE.car[2] },
];
const CRASH_T = 3.6;
function carState(c: CarDef, t: number): { p: Vec3; rot: number; bump: number } {
  const dir = c.x > 0 ? -1 : 1;
  if (c.crash) {
    const tc = Math.min(t, CRASH_T);
    const z = c.z0 - c.v * tc + (t > CRASH_T ? -0.15 * sm(0, 0.3, t - CRASH_T) : 0);
    const k = sm(VANISH, CRASH_T, tc);
    const x = lerp(c.x, 4.4, k);
    const dxdt = (4.4 - c.x) * (tc > VANISH && tc < CRASH_T ? 6 * ((tc - VANISH) / (CRASH_T - VANISH)) * (1 - (tc - VANISH) / (CRASH_T - VANISH)) / (CRASH_T - VANISH) : 0);
    return { p: [x, 0, z], rot: Math.atan2(dxdt, -c.v) + (t > CRASH_T ? 0.25 * sm(0, 0.4, t - CRASH_T) : 0), bump: t > CRASH_T ? Math.exp(-(t - CRASH_T) * 5) * Math.sin((t - CRASH_T) * 30) * 0.08 : 0 };
  }
  let s: number;
  if (t <= VANISH) s = c.v * t;
  else { const tau = Math.min(t - VANISH, c.coast); s = c.v * VANISH + c.v * (tau - (tau * tau) / (2 * c.coast)); }
  return { p: [c.x, 0, c.z0 + dir * s], rot: dir > 0 ? 0 : Math.PI, bump: 0 };
}

// ── Bushaltestelle mit Anzeige ──
function useDisplayTex(text: string, on: boolean) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 160;
    const g = c.getContext("2d")!;
    g.fillStyle = on ? "#14100A" : "#1A1C1E"; g.fillRect(0, 0, 512, 160);
    if (on) {
      g.fillStyle = "#FFB84A";
      g.font = "bold 74px Inter, sans-serif"; g.textBaseline = "middle";
      g.fillText("42", 24, 82);
      g.font = "600 46px Inter, sans-serif";
      g.fillText("Hbf", 140, 84);
      g.font = "bold 74px Inter, sans-serif";
      const w = g.measureText(text).width;
      g.fillText(text, 490 - w, 82);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, on]);
}

const BusStop: React.FC<{ age: number; displayOn: boolean }> = ({ age, displayOn }) => {
  const { s1, s2, s3 } = decay(age);
  const tex = useDisplayTex("2 min", displayOn);
  const metal = mixHex("#B9C0C8", RUST, s2 * 0.8);
  const roofOn = s3 < 0.6;
  return (
    <group>
      {/* Pfosten + Dach */}
      {[[8.4, -2.1], [8.4, 2.1], [9.6, -2.1], [9.6, 2.1]].map(([x, z], i) => (
        <Box key={i} size={[0.1, 2.6, 0.1]} color={metal} position={[x, 1.3, z]} bevel={0} rotation={[0, 0, s3 * 0.15 * (i % 2 ? 1 : -1)]} />
      ))}
      {roofOn && <Box size={[1.6, 0.12, 4.6]} color={mixHex("#3B434D", MOSS, s2)} position={[9.0, 2.65, 0]} rotation={[0, 0, s2 * 0.12]} />}
      {/* Rückwand Glas (zerbricht nach ein paar Jahren) */}
      {s2 < 0.35 && <mesh position={[9.6, 1.35, 0]}><boxGeometry args={[0.04, 2.3, 4.1]} /><Glass color="#9CD3F0" opacity={0.25} /></mesh>}
      {/* Bank */}
      <Box size={[0.5, 0.08, 3.0]} color={mixHex("#8E6A4A", MOSS, s2 * 0.7)} position={[9.15, 0.48, 0]} />
      <Box size={[0.08, 0.45, 0.08]} color={metal} position={[9.15, 0.22, -1.3]} bevel={0} />
      <Box size={[0.08, 0.45, 0.08]} color={metal} position={[9.15, 0.22, 1.3]} bevel={0} />
      {/* Haltestellen-Mast mit Schild und Anzeige */}
      <group position={[6.0, 0, 2.9]} rotation={[0, 0, s3 * 0.22]}>
        <Box size={[0.1, 3.2, 0.1]} color={mixHex("#8B95A1", RUST, s2)} position={[0, 1.6, 0]} bevel={0} />
        <mesh position={[0, 3.25, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.06, 24]} /><Flat color={mixHex("#F2C14E", MOSS, s2 * 0.6)} /></mesh>
        <mesh position={[-0.035, 3.25, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.24, 0.24, 0.02, 24]} /><Flat color={mixHex("#2E8B57", MOSS, s2 * 0.5)} /></mesh>
        <Box size={[0.02, 0.26, 0.05]} color="#F2C14E" position={[-0.05, 3.25, -0.08]} bevel={0} cast={false} />
        <Box size={[0.02, 0.26, 0.05]} color="#F2C14E" position={[-0.05, 3.25, 0.08]} bevel={0} cast={false} />
        <Box size={[0.02, 0.05, 0.16]} color="#F2C14E" position={[-0.05, 3.25, 0]} bevel={0} cast={false} />
        <Box size={[0.16, 0.46, 1.25]} color="#2F3B4C" position={[0, 2.3, 0]} />
        <mesh position={[-0.085, 2.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.15, 0.36]} />
          <meshStandardMaterial map={tex} emissive="#FFFFFF" emissiveMap={tex} emissiveIntensity={displayOn ? 1.4 : 0} roughness={0.4} />
        </mesh>
        {s1 > 0.3 && <Box size={[0.16, 1.3 * s2 + 0.3 * s1, 0.16]} color={JUNGLE} position={[0, (1.3 * s2 + 0.3 * s1) / 2, 0]} cast={false} />}
      </group>
      {/* Max' Wasserflasche auf der Bank */}
      <group position={[9.1, 0.53, -0.9]} rotation={[0, 0, s2 > 0.5 ? Math.PI / 2 : 0]}>
        <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.04, 0.04, 0.22, 10]} /><meshPhysicalMaterial color="#8FD3F5" transparent opacity={0.55} roughness={0.1} clearcoat={1} /></mesh>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.018, 0.018, 0.04, 8]} /><Flat color="#3D7DD8" /></mesh>
      </group>
    </group>
  );
};

export type CityProps = {
  shot: ShotInfo;
  cam: CamFn;
  /** Jahre ohne Menschen (Standard: aus der Videozeit) */
  age?: (t: number) => number;
  preset?: LightPreset;
  night?: boolean;
  /** Nacht: Anteil der Lichter, die noch brennen (1 → 0) */
  lights?: (t: number) => number;
  /** "auto": Menschen bis VANISH, dann Funkeln · "back": alle wieder da (Ende) */
  people?: "auto" | "back" | "none";
  /** Geist-Max */
  ghost?: (t: number) => { pos: Vec3; rotY: number; pose: Pose; op?: number; expr?: "neutral" | "shock" | "happy" };
  deer?: { pos: Vec3; rotY: number; pose: DeerPose; antlers?: boolean }[];
  /** Turm-Einsturz (Cold Open): Startzeit */
  topple?: number;
  displayOn?: (t: number) => boolean;
  birds?: boolean;
  /** Max (normal) am Ende: Pose */
  maxPose?: (t: number) => Pose;
};

export const City: React.FC<CityProps> = ({ shot, cam, age: ageFn, preset = "day", night = false, lights, people = "auto", ghost, deer, topple, displayOn, birds, maxPose }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const L = useCityLayout();
  const age = ageFn ? ageFn(t) : years(t);
  const { s1, s2, s3, s4 } = decay(age);
  const lit = night ? (lights ? lights(t) : 1) : 0;
  const golden = preset === "golden";
  const sunDir: Vec3 = golden ? [-60, 22, -35] : night ? [-30, 60, -20] : [45, 60, 25];
  const grassGround = mixHex(mixHex("#B8B2A6", MOSS, s2 * 0.7), JUNGLE, s3 * 0.6 + s4 * 0.4);
  const road = mixHex(mixHex(PALETTE.asphalt, "#4E5A44", s2 * 0.55), JUNGLE, s3 * 0.8 + s4 * 0.2);
  const lumpGeo = useMemo(() => lumpyIco(0.6, 1, 0.25, 9), []);
  const cubeGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const near = Math.hypot(c.pos[0], c.pos[2]) < 60 && c.pos[1] < 25;

  // Grasbüschel/Sträucher – Anzahl und Größe wachsen mit dem Alter
  const tufts: Inst[] = [];
  const grow = s1 * 0.7 + s2 * 1.4 + s3 * 0.6 + s4 * 0.4;
  if (grow > 0.02)
    for (const tf of L.tufts) {
      if (tf.k > s1 * 0.6 + s2 * 0.4) continue;
      if (people === "back" && Math.hypot(tf.p[0] - 4, tf.p[2] - 3) < 7) continue;
      const sc = tf.s * grow * (0.6 + tf.k * 0.4);
      tufts.push({ p: [tf.p[0], sc * 0.15, tf.p[2]], s: [sc * 1.3, sc * 0.7, sc * 1.2], c: tf.c });
      if (s1 > 0.15 && s2 < 0.5 && tf.k < 0.5) tufts.push({ p: [tf.p[0] + 0.5, 0, tf.p[2] + 0.3], s: [0.12, 0.5 * s1, 0.12], c: PALETTE.leaf[2] });
    }

  const vanishK = clamp((t - VANISH) / 0.7);
  const showPeople = people === "back" || (people === "auto" && t < VANISH);
  const ghostState = ghost?.(t);

  return (
    <Stage preset={preset} sunDir={sunDir} fog={night ? ["#121C3A", 120, 900] : golden ? ["#F0C9A0", 90, 700] : ["#CFE7F5", 110, 800]}
      shadowCenter={near ? [4, 0, -4] : [0, 0, -60]} shadowSize={near ? 30 : 160} aoRadius={near ? 0.6 : 2}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} roll={c.roll ?? 0} near={0.1} far={3000} />
      <SkyDome top={night ? "#0A1230" : golden ? "#6E86B8" : "#5E9BE0"} horizon={night ? "#2A3A70" : golden ? "#F6C79A" : "#DDEFF7"} radius={2000} sun={night ? undefined : sunDir} />
      {night && <Stars n={1600} radius={1900} opacity={0.4 + (1 - lit) * 0.6} />}
      {/* Boden + Straßen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -80]} receiveShadow><planeGeometry args={[1400, 1400]} /><Flat color={grassGround} /></mesh>
      {[-120, -60, 0, 60, 120].map((X) => (
        <mesh key={X} rotation={[-Math.PI / 2, 0, 0]} position={[X, 0.01, -90]} receiveShadow><planeGeometry args={[10, 460]} /><Flat color={road} roughness={0.9} /></mesh>
      ))}
      {[-228, -132, -36, 60].map((Z) => (
        <mesh key={Z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, Z]} receiveShadow><planeGeometry args={[300, 10]} /><Flat color={road} roughness={0.9} /></mesh>
      ))}
      {/* Gehwege Hauptstraße */}
      {s4 < 0.8 && [-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 8.2, 0.06, -90]} receiveShadow><planeGeometry args={[6.4, 460]} /><Flat color={mixHex(PALETTE.sidewalk, MOSS, s2 * 0.6 + s3 * 0.4)} /></mesh>
      ))}
      {/* Mittel- und Zebrastreifen */}
      {s2 < 0.7 && Array.from({ length: 22 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 30 - i * 8]}><planeGeometry args={[0.22, 3.5]} /><Flat color={mixHex(PALETTE.roadLine, "#7A7F70", s1)} /></mesh>
      ))}
      {s2 < 0.7 && Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-4.2 + i * 1.7, 0.03, -29]}><planeGeometry args={[0.8, 4]} /><Flat color={mixHex(PALETTE.roadLine, "#7A7F70", s1)} /></mesh>
      ))}
      {/* Risse */}
      {s1 > 0.05 && s3 < 0.5 && <Instanced items={L.cracks.slice(0, Math.floor(L.cracks.length * clamp(s1 * 1.2)))} geometry={cubeGeo} cast={false} />}
      {tufts.length > 0 && <Instanced items={tufts} geometry={lumpGeo} cast={false} />}

      {/* Gebäude */}
      {L.blds.map((b, i) => {
        if (topple != null && i === L.tower) return null;
        const hh = Math.max(3.2, Math.round((b.h * lerp(1, b.ruin, s3) * lerp(1, 0.35, s4)) / 3.2) * 3.2);
        const on = night && lit > b.order;
        const side = Math.sign(b.front - b.x) || 1; // Richtung zur Straße
        const vine = clamp(s2 * (0.35 + (b.seed % 7) / 10) + s3 * 0.6);
        return (
          <group key={i}>
            <Building position={[b.x, 0, b.z]} size={[b.w, hh, b.d]} color={mixHex(b.c, "#7E786C", s3 * 0.6)} seed={b.seed} lit={on} roof={s2 > 0.4 ? mixHex("#6E6A60", MOSS, s2) : undefined} />
            {vine > 0.03 && <Box size={[0.25, hh * vine, b.d * (0.4 + (b.seed % 5) / 10)]} color={JUNGLE} position={[b.front + side * 0.13, (hh * vine) / 2, b.z]} cast={false} bevel={0} />}
            {s2 > 0.3 && <Box size={[b.w * 0.9, 0.5 + s3 * 2, b.d * 0.9]} color={mixHex(MOSS, JUNGLE, s3)} position={[b.x, hh + 0.2, b.z]} cast={false} />}
            {s3 > 0.3 && <Box size={[b.w * 0.5, 2 + (b.seed % 4), b.d * 0.4]} color="#8A857A" position={[b.x + 1, hh + 1, b.z - 1]} rotation={[0.2, 0.3, 0.15]} />}
          </group>
        );
      })}
      {topple != null && <ToppleTower b={L.blds[L.tower]} t={t} start={topple} s2={s2} />}

      {/* Straßenlaternen */}
      {s3 < 0.7 && Array.from({ length: 10 }).map((_, i) => {
        const z = 20 - i * 22;
        const crash = i === 1;
        const tilt = crash ? 0.55 * sm(CRASH_T, CRASH_T + 0.5, t) : s3 * 0.4;
        const on = night && lit > (i * 0.07 + 0.15) % 0.8;
        return [-1, 1].map((s) => (
          <group key={`${i}${s}`} position={crash && s > 0 ? LAMP_CRASH : [s * 5.4, 0, z - (s > 0 ? 0 : 11)]} rotation={[crash && s > 0 ? -tilt : 0, s > 0 ? Math.PI : 0, crash && s > 0 ? 0 : tilt * 0.3]}>
            <StreetLamp on={on} />
            {on && <pointLight position={[0.2, 4.8, 0]} intensity={18} distance={16} color="#FFD27A" />}
          </group>
        ));
      })}
      {/* Straßenbäume (gab es schon) + Wildwuchs */}
      {s4 < 0.95 && Array.from({ length: 14 }).map((_, i) => {
        const z = 8 - i * 16;
        if (Math.abs(z - 0) < 6) return null;
        return [-1, 1].map((s) => <Tree key={`${i}${s}`} position={[s * 6.4, 0, z + s * 4]} seed={i * 2 + (s > 0 ? 1 : 0) + 3} scale={1.1 + s2 * 1.6 + s3 * 2 + s4 * 2} />);
      })}
      {L.wild.map((w, i) => {
        const g = w.k < 0.25 ? s2 : w.k < 0.6 ? s2 * 0.9 * sm(8, 60, age) : s3 * 0.8 + s4 * 0.4;
        const sc = w.s * (g * 2.2 + s3 * 1.8 + s4 * 1.5);
        if (sc < 0.08) return null;
        return <Tree key={i} position={w.p} seed={w.seed} scale={sc} kind={w.k > 0.8 ? "pine" : "round"} />;
      })}

      {/* Autos */}
      {s3 < 0.9 && CARS.map((cd, i) => {
        const st = carState(cd, t);
        const sink = s3 * 0.6;
        return (
          <group key={i} position={[st.p[0], st.bump - sink, st.p[2]]} rotation={[st.bump, st.rot, 0]}>
            <Car color={mixHex(mixHex(cd.color, "#9A9286", s1 * 0.5), RUST, s2 * 0.85)} wheelSpin={(t < VANISH ? t : VANISH) * cd.v * 2.6} />
            {s2 > 0.2 && <Box size={[2.2, 0.4 + s2, 4.6]} color={JUNGLE} position={[0, (0.4 + s2) / 2, 0]} opacity={0.999} cast={false} />}
          </group>
        );
      })}
      {/* Ampel an der Kreuzung */}
      {s3 < 0.6 && (
        <group position={[-5.6, 0, -31]}>
          <Box size={[0.12, 4.2, 0.12]} color={mixHex(PALETTE.steel, RUST, s2)} position={[0, 2.1, 0]} bevel={0} />
          <Box size={[0.35, 1.0, 0.3]} color="#22252B" position={[0, 4.4, 0]} />
          <Box size={[0.2, 0.2, 0.05]} color={t < VANISH + 30 && age < 1 / 365 ? "#3AE07A" : "#2A3A2E"} emissive={age < 1 / 365 ? "#3AE07A" : undefined} position={[0, 4.15, 0.16]} cast={false} />
        </group>
      )}

      {/* Bushaltestelle */}
      {(s4 < 0.97 || displayOn) && <BusStop age={age} displayOn={displayOn ? displayOn(t) : age < 0.6 / 365} />}

      {/* Menschen */}
      {showPeople && WALKERS.map((w, i) => {
        const pos = walkerPos(w, people === "back" ? VANISH : t);
        const rot = w.rot ?? (w.dir > 0 ? 0 : Math.PI);
        const back = people === "back";
        return <Person key={i} seed={w.seed} pose={back ? (i % 3 === 0 ? "shock" : i % 3 === 1 ? "lookUp" : "idle") : w.pose} time={t} position={pos} rotationY={back ? rot + Math.sin(t * 1.3 + i) * 0.6 : rot} expression={back ? "shock" : "neutral"} />;
      })}
      {(showPeople && (people === "back" || t < VANISH)) && (
        <Max position={MAXP} rotationY={-0.75} pose={maxPose ? maxPose(t) : t < 1.5 ? "phone" : "idle"} hold={(maxPose ? maxPose(t) : t < 1.5 ? "phone" : "idle") === "phone" ? "phone" : undefined} time={t} expression={people === "back" && maxPose?.(t) !== "phone" ? "shock" : "neutral"} />
      )}
      {/* Verschwinden: Funkeln, wo eben noch Menschen waren */}
      {people === "auto" && vanishK > 0 && vanishK < 1 && <VanishSparkles t={t} k={vanishK} />}
      {/* Max' Handy fällt */}
      {people === "auto" && t >= VANISH && s3 < 0.5 && (
        <group position={[MAXP[0] + 0.2, Math.max(0.03, 1.15 - 4.9 * Math.pow(Math.max(0, t - VANISH), 2) * 1.0), MAXP[2] + 0.35]} rotation={[t - VANISH < 0.48 ? (t - VANISH) * 6 : -Math.PI / 2, 0.4, 0]}>
          <Box size={[0.09, 0.17, 0.02]} color="#1E2228" cast={false} />
          <Box size={[0.075, 0.15, 0.004]} color="#BDEFFF" emissive={age < 2 / 365 ? "#8FE3FF" : undefined} position={[0, 0, -0.012]} cast={false} bevel={0} />
        </group>
      )}
      {/* Geist-Max */}
      {ghostState && (
        <Max position={ghostState.pos} rotationY={ghostState.rotY} pose={ghostState.pose} time={t} ghost={1 - (ghostState.op ?? 0.5)} expression={ghostState.expr ?? "shock"} />
      )}
      {deer?.map((d, i) => <Deer key={i} position={d.pos} rotationY={d.rotY} pose={d.pose} time={t + i * 0.7} antlers={d.antlers} />)}
      {birds && <Birds n={9} center={[-20, 34, -60]} spread={18} time={t} seed={4} />}
      {!night && [[-60, 90, -260], [90, 110, -320], [10, 120, -420]].map((cp, i) => <Cloud key={i} position={cp as Vec3} scale={14} seed={i + 2} color={golden ? "#FFE3C8" : "#FFFFFF"} />)}
      {near && <Particles kind={s2 > 0.3 ? "sparkle" : "dust"} n={60} box={[16, 6, 16]} center={[c.pos[0], 2.5, c.pos[2] - 6]} time={t} velocity={[0.15, 0.06, 0.05]} sizeScale={s2 > 0.3 ? 0.5 : 0.6} opacity={0.7} seed={11} colors={s2 > 0.3 ? ["#FFF6C8", "#E8FFD0"] : undefined} />}
    </Stage>
  );
};

/** Funken an den Stellen, wo Menschen standen (aufsteigend, verblassend) */
const VanishSparkles: React.FC<{ t: number; k: number }> = ({ t, k }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const items: Inst[] = [];
  const all = [...WALKERS.map((w) => walkerPos(w, VANISH)), MAXP];
  all.forEach((p, i) => {
    const r = rng(500 + i);
    for (let j = 0; j < 9; j++) {
      const up = r.range(0.2, 1.9) + k * r.range(0.6, 1.4);
      const s = 0.07 * (1 - k) * r.range(0.6, 1.3);
      items.push({ p: [p[0] + r.range(-0.35, 0.35) * (1 + k), up, p[2] + r.range(-0.35, 0.35) * (1 + k)], r: [t * 3 + j, j, 0], s, c: r.next() < 0.5 ? "#6FF2D0" : "#FFFFFF" });
    }
  });
  return <Instanced items={items} geometry={geo} basic cast={false} receive={false} />;
};

/** Der letzte Turm kippt (1.000 Jahre) */
const ToppleTower: React.FC<{ b: Bld; t: number; start: number; s2: number }> = ({ b, t, start, s2 }) => {
  const h = 96;
  const k = clamp((t - start) / 1.7);
  const ang = k * k * 1.35;
  const hit = t - (start + 1.7);
  return (
    <group>
      <group position={[b.x - b.w / 2, 0, b.z]} rotation={[0, 0, ang]}>
        <group position={[b.w / 2, 0, 0]}>
          <Building size={[b.w, h, b.d]} color="#9A958A" seed={b.seed} roof="#5E7A45" />
          <Box size={[0.3, h * 0.7, b.d * 0.7]} color={JUNGLE} position={[-b.w / 2 - 0.15, h * 0.35, 0]} cast={false} bevel={0} />
          <Box size={[b.w * 0.9, 3, b.d * 0.9]} color={JUNGLE} position={[0, h + 1, 0]} cast={false} />
          <Box size={[b.w * 0.6, 6, b.d * 0.5]} color="#8A857A" position={[1.5, h + 2, -1]} rotation={[0.2, 0.3, 0.2]} />
        </group>
      </group>
      {k > 0.05 && <Particles kind="debris" n={70} box={[18, 60, 18]} center={[b.x - 10 * k, 30, b.z]} time={t} velocity={[0, -12, 0]} sizeScale={6} opacity={clamp(1 - hit)} seed={5} />}
      {hit > -0.2 && <DustCloud center={[b.x - h * 0.55, 0, b.z]} t={hit + 0.2} />}
    </group>
  );
};

/** Wachsende Staubwolke (halbtransparente Kugeln) */
const DustCloud: React.FC<{ center: Vec3; t: number; color?: string; size?: number }> = ({ center, t, color = "#C9B9A0", size = 1 }) => {
  const geo = useMemo(() => lumpyIco(1, 1, 0.25, 31), []);
  const puffs = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 22 }).map(() => ({ x: r.range(-1, 1), z: r.range(-0.5, 0.5), y: r.range(0, 0.6), s: r.range(0.6, 1.2) }));
  }, []);
  const g = 1 - Math.exp(-t * 1.6);
  const op = clamp(0.85 - t * 0.12);
  return (
    <group position={center}>
      {puffs.map((p, i) => (
        <mesh key={i} geometry={geo} position={[p.x * 60 * size * (0.4 + g), p.y * 30 * size * g + 6, p.z * 40 * size * (0.4 + g)]} scale={p.s * 14 * size * (0.3 + g)}>
          <Flat color={color} opacity={op} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

// ═════════════════════════ Flugzeug ohne Piloten ═════════════════════════

export const PlaneSky: React.FC<{ shot: ShotInfo; cam: CamFn }> = ({ shot, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const sunDir: Vec3 = [-40, 30, -60];
  const pitch = -0.06 - local * 0.015;
  const cloudsZ = (local * 70) % 600;
  return (
    <Stage preset="day" sunDir={sunDir} fog={["#DDEFF7", 300, 2400]} shadows={false} ao={0}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.5} far={6000} />
      <SkyDome top="#2F68C4" horizon="#A8CFEE" radius={4000} sun={sunDir} />
      <group rotation={[pitch, 0, Math.sin(local * 0.7) * 0.06]}>
        <Airplane position={[0, 0, 0]} />
        {/* Cockpit leer: Scheiben dunkel */}
        <Box size={[2.4, 0.7, 1.4]} color="#2B3A4A" position={[0, 0.9, 19.2]} roughness={0.2} metalness={0.4} cast={false} />
        {/* Kondensstreifen */}
        {[-8, 8].map((x) => Array.from({ length: 14 }).map((_, i) => (
          <mesh key={`${x}${i}`} position={[x, -1.6, -4 - i * 9]} scale={[0.9 + i * 0.25, 0.9 + i * 0.25, 7]}>
            <sphereGeometry args={[1, 8, 6]} />
            <Flat color="#FFFFFF" opacity={clamp(0.85 - i * 0.06)} roughness={1} />
          </mesh>
        )))}
      </group>
      {/* Wolkenmeer unter dem Flugzeug, zieht nach hinten */}
      {Array.from({ length: 30 }).map((_, i) => {
        const r = rng(60 + i);
        const z = ((r.range(-300, 300) + cloudsZ + 300) % 600) - 300;
        return <Cloud key={i} position={[r.range(-300, 300), -170 + r.range(-10, 10), -z]} scale={r.range(16, 30)} seed={i} />;
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -200, 0]}><planeGeometry args={[8000, 8000]} /><Flat color="#E9F2F8" roughness={1} /></mesh>
    </Stage>
  );
};

// ═════════════════════════ Erde bei Nacht ═════════════════════════

export const EarthDark: React.FC<{ shot: ShotInfo; cam: CamFn; lights: (t: number) => number }> = ({ shot, cam, lights }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  return (
    <Stage preset="space" logDepth sunDir={[-70, 18, -25]} shadows={false} ao={0} bloom={0.8}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 40} near={1} far={200000} />
      <Stars n={3000} radius={60000} size={2} />
      <Earth radius={6371} night lights={lights(t)} tilt={1.0} rotationY={2.2 + local * 0.012} clouds={false} />
    </Stage>
  );
};

// ═════════════════════════ U-Bahn läuft voll ═════════════════════════

export const Subway: React.FC<{ shot: ShotInfo; cam: CamFn; water: (t: number) => number; ghost?: { pos: Vec3; rotY: number } }> = ({ shot, cam, water, ghost }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const w = water(t);
  const tile = "#DCE3E2", tile2 = "#2E8B7A";
  const flick = (i: number) => (Math.sin(t * 23 + i * 7) + Math.sin(t * 37 + i)) > 1.2 ? 0.15 : 1;
  return (
    <Stage preset="interior" bg="#10161A" fog={["#0F1A1E", 8, 60]} sunIntensity={0.25} envIntensity={0.25} shadowCenter={[2, 0, 0]} shadowSize={14} aoRadius={0.4}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 50} near={0.05} far={300} />
      {/* Tunnel: Boden, Gleisbett, Wände, Decke */}
      <Box size={[16, 0.2, 120]} color="#3A3D40" position={[0, -0.1, -40]} bevel={0} />
      <Box size={[5, 1.1, 120]} color="#B9B2A6" position={[4.5, 0.55, -40]} bevel={0} />
      <Box size={[0.35, 0.03, 120]} color="#E8C93A" position={[2.35, 1.115, -40]} bevel={0} cast={false} />
      {[-0.75, 0.75].map((x) => <Box key={x} size={[0.12, 0.16, 120]} color="#8B95A1" position={[x, 0.08, -40]} bevel={0} metalness={0.8} roughness={0.35} />)}
      {Array.from({ length: 50 }).map((_, i) => <Box key={i} size={[2.4, 0.1, 0.25]} color="#5A4A3C" position={[0, 0.03, 18 - i * 2.4]} bevel={0} cast={false} />)}
      <Box size={[0.3, 6, 120]} color={tile} position={[7.1, 3, -40]} bevel={0} />
      <Box size={[0.3, 0.6, 120]} color={tile2} position={[6.94, 2.6, -40]} bevel={0} cast={false} />
      <Box size={[0.3, 6, 120]} color="#6E6A60" position={[-2.8, 3, -40]} bevel={0} />
      <Box size={[10.5, 0.3, 120]} color="#C9C4BA" position={[2.2, 5.6, -40]} bevel={0} />
      {/* Schild */}
      <group position={[6.9, 3.4, -6]}>
        <Box size={[0.08, 0.9, 2.6]} color="#1E3A8A" />
        <Box size={[0.02, 0.6, 0.5]} color="#F4F4F4" position={[-0.05, 0, -0.9]} cast={false} bevel={0} />
        <Box size={[0.02, 0.12, 1.4]} color="#F4F4F4" position={[-0.05, 0, 0.4]} cast={false} bevel={0} />
      </group>
      {/* Lampen (flackern) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const on = flick(i) * (i % 3 === 2 ? 0.2 : 1);
        return (
          <group key={i} position={[3.2, 5.35, 6 - i * 9]}>
            <Box size={[0.3, 0.12, 2.2]} color="#F4F4F4" emissive={on > 0.5 ? "#E6F4FF" : undefined} cast={false} />
            {on > 0.5 && i < 5 && <pointLight position={[0, -0.4, 0]} intensity={5} distance={10} color="#DCEBFF" />}
          </group>
        );
      })}
      {/* Notlicht rot */}
      <pointLight position={[1, 4, -14]} intensity={14} distance={20} color="#FF5B4B" />
      {/* Zug steht im Tunnel */}
      <group position={[0, 0, -28]}>
        <Box size={[2.9, 3.1, 18]} color="#E8E8E2" position={[0, 1.85, 0]} />
        <Box size={[2.95, 0.5, 18.1]} color="#F2C14E" position={[0, 1.0, 0]} cast={false} />
        {Array.from({ length: 5 }).map((_, i) => <Box key={i} size={[3.0, 1.0, 2.2]} color="#26323C" position={[0, 2.5, -7 + i * 3.5]} roughness={0.2} metalness={0.3} cast={false} />)}
        <Box size={[2.6, 1.2, 0.1]} color="#26323C" position={[0, 2.5, 9.02]} cast={false} />
      </group>
      {/* Wasser */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.2, w, -40]}>
        <planeGeometry args={[10, 120, 1, 1]} />
        <meshPhysicalMaterial color="#2F8A96" emissive="#0E3A40" roughness={0.05} metalness={0.2} transparent opacity={0.85} clearcoat={1} envMapIntensity={2} />
      </mesh>
      {/* Treibgut */}
      {Array.from({ length: 14 }).map((_, i) => {
        const r = rng(200 + i);
        return <Box key={i} size={[r.range(0.2, 0.6), 0.08, r.range(0.2, 0.8)]} color={r.pick(["#E8E3D8", "#C97B5B", "#3D7DD8", "#F2C14E"])} position={[r.range(-1.5, 2 + (w > 1.1 ? 3 : 0)), w + 0.02, r.range(-20, 4) + Math.sin(t * 0.8 + i) * 0.3]} rotation={[0, r.range(0, 3) + t * 0.2, 0]} cast={false} />;
      })}
      <pointLight position={[0, 3.5, -4]} intensity={12} distance={18} color="#BFE7F0" />
      {/* Wasser strömt die Treppe herunter */}
      <mesh position={[6.8, 2.5, 4]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 5]} />
        <meshStandardMaterial color="#6FB7C8" transparent opacity={0.55} roughness={0.1} />
      </mesh>
      <Particles kind="bubbles" n={60} box={[2, 3, 2]} center={[6.4, w + 0.5, 4]} time={t} velocity={[0, -3, 0]} sizeScale={0.8} seed={4} />
      <Particles kind="streaks" n={40} box={[8, 5, 30]} center={[2, 3, -6]} time={t} velocity={[0, -6, 0]} sizeScale={0.5} opacity={0.4} seed={8} colors={["#BFE7F0"]} />
      {ghost && <Max position={ghost.pos} rotationY={ghost.rotY} pose="lookUp" time={t} ghost={0.5} expression="shock" />}
    </Stage>
  );
};

// ═════════════════════════ Brücke stürzt ein ═════════════════════════

export const Bridge: React.FC<{ shot: ShotInfo; cam: CamFn; collapse: number; ghost?: { pos: Vec3; rotY: number } }> = ({ shot, cam, collapse, ghost }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const sunDir: Vec3 = [-50, 30, -40];
  const k = clamp((t - collapse) / 0.9);
  const hit = t - (collapse + 0.9);
  const rust = "#8A4B32", rust2 = "#6E3A28";
  const trees = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: 70 }).map(() => {
      const side = r.sign();
      return { p: [r.range(-200, 200), 0, side * r.range(48, 140)] as Vec3, s: r.range(2, 4), seed: r.int(1, 999) };
    });
  }, []);
  return (
    <Stage preset="day" sunDir={sunDir} fog={["#D6E6EE", 150, 1200]} shadowCenter={[0, 0, 0]} shadowSize={90} aoRadius={1.5}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.3} far={4000} />
      <SkyDome top="#5E9BE0" horizon="#DDEFF7" radius={3000} sun={sunDir} />
      {/* Fluss + Ufer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}><planeGeometry args={[3000, 84]} /><meshPhysicalMaterial color="#2E6F8C" roughness={0.12} clearcoat={1} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, s * 540]} receiveShadow><planeGeometry args={[3000, 1000]} /><Flat color={PALETTE.grassDark} /></mesh>
          <Box size={[3000, 3, 4]} color="#7A6F5E" position={[0, -1.2, s * 42]} bevel={0} />
        </group>
      ))}
      {trees.map((tr, i) => <Tree key={i} position={tr.p} scale={tr.s} seed={tr.seed} />)}
      {/* Brücke: Pfeiler, Seile, Fahrbahn (entlang z) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, s * 30]}>
          {[-5, 5].map((x) => <Box key={x} size={[1.6, 46, 1.6]} color={rust} position={[x, 21, 0]} bevel={0.05} roughness={0.6} metalness={0.3} />)}
          <Box size={[11.6, 1.6, 1.6]} color={rust} position={[0, 42, 0]} bevel={0} />
          <Box size={[11.6, 1.2, 1.6]} color={rust} position={[0, 26, 0]} bevel={0} />
          <Box size={[13, 3, 5]} color="#8A857A" position={[0, -1, 0]} />
          <Box size={[1.7, 10 + 0, 1.7]} color={JUNGLE} position={[-5, 5, 0.1]} cast={false} />
        </group>
      ))}
      {/* Fahrbahn: äußere Teile fest, Mittelteil stürzt */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[10, 1.2, 46]} color={rust2} position={[0, 12, s * 53]} bevel={0} />
          {/* Hauptkabel außen */}
          {[-5, 5].map((x) => <CableSeg key={x} a={[x, 42, s * 30]} b={[x, 13, s * 76]} />)}
        </group>
      ))}
      <group position={[0, 12, -30]} rotation={[-k * k * 1.15, 0, k * 0.15]}>
        <group>
          <Box size={[10, 1.2, 60]} color={rust2} position={[0, 0, 30]} bevel={0} />
          <Box size={[0.3, 1.2, 60]} color={rust} position={[-4.8, 1.2, 30]} bevel={0} />
          <Box size={[0.3, 1.2, 60]} color={rust} position={[4.8, 1.2, 30]} bevel={0} />
          <Car position={[-2.3, 0.6, 18]} rotationY={0.2} color={RUST} />
          <Car position={[2.3, 0.6, 40]} rotationY={Math.PI} color="#6E5A4A" />
        </group>
      </group>
      {/* Hauptkabel in der Mitte (reißt) */}
      {[-5, 5].map((x) => (k < 0.02 ? <CableSeg key={x} a={[x, 42, -30]} b={[x, 13, 0]} /> : <CableSeg key={x} a={[x, 42, -30]} b={[x + 1, 30 - k * 20, -18 + k * 8]} />))}
      {[-5, 5].map((x) => (k < 0.02 ? <CableSeg key={x} a={[x, 42, 30]} b={[x, 13, 0]} /> : <CableSeg key={x} a={[x, 42, 30]} b={[x - 1, 32 - k * 18, 20]} />))}
      {/* Hänger */}
      {k < 0.05 && Array.from({ length: 11 }).map((_, i) => {
        const z = -25 + i * 5;
        const top = 13 + (Math.abs(z) / 30) * 29 * (Math.abs(z) / 30);
        return [-5, 5].map((x) => <Box key={`${i}${x}`} size={[0.08, top - 12.6, 0.08]} color={rust} position={[x, (top + 12.6) / 2, z]} bevel={0} cast={false} />);
      })}
      {/* Einschlag im Wasser */}
      {hit > 0 && <Splash t={hit} />}
      {k > 0 && <Particles kind="debris" n={50} box={[14, 30, 60]} center={[0, 8, 0]} time={t} velocity={[0, -10, 0]} sizeScale={2.5} seed={6} colors={[rust, rust2, "#8A857A"]} opacity={clamp(1.5 - hit)} />}
      <Birds n={8} center={[10, 40, -40]} spread={20} time={t + (k > 0 ? (t - collapse) * 3 : 0)} seed={7} />
      {ghost && <Max position={ghost.pos} rotationY={ghost.rotY} pose="shock" time={t} ghost={0.5} expression="shock" />}
    </Stage>
  );
};

const CableSeg: React.FC<{ a: Vec3; b: Vec3 }> = ({ a, b }) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const m = A.clone().add(B).multiplyScalar(0.5);
  return (
    <mesh position={[m.x, m.y, m.z]} quaternion={q}>
      <cylinderGeometry args={[0.25, 0.25, d.length(), 6]} />
      <Flat color="#6E3A28" roughness={0.6} metalness={0.3} />
    </mesh>
  );
};

/** Wasserfontäne + Ringe */
const Splash: React.FC<{ t: number }> = ({ t }) => {
  const geo = useMemo(() => lumpyIco(1, 1, 0.3, 17), []);
  const r = rng(3);
  const drops = Array.from({ length: 26 }).map(() => ({ x: r.range(-14, 14), z: r.range(-20, 20), vy: r.range(12, 26), s: r.range(1.5, 3.5) }));
  return (
    <group>
      {drops.map((d, i) => {
        const y = -2 + d.vy * t - 4.9 * t * t;
        if (y < -2.5) return null;
        return <mesh key={i} geometry={geo} position={[d.x * (1 + t), y, d.z * (1 + t * 0.5)]} scale={d.s * (1 + t)}><Flat color="#E6F6FF" opacity={clamp(1 - t * 0.5)} roughness={0.3} /></mesh>;
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.9, 0]}><ringGeometry args={[10 + t * 18, 13 + t * 20, 40]} /><Flat color="#E6F6FF" opacity={clamp(0.8 - t * 0.4)} /></mesh>
    </group>
  );
};

// ═════════════════════════ Wüste mit Pyramiden ═════════════════════════

export const Desert: React.FC<{ shot: ShotInfo; cam: CamFn; ghost?: (t: number) => { pos: Vec3; rotY: number; pose: Pose } }> = ({ shot, cam, ghost }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const sunDir: Vec3 = [-60, 20, -50];
  const g = ghost?.(t);
  const dunes = useMemo(() => {
    const r = rng(14);
    return Array.from({ length: 40 }).map(() => ({ p: [r.range(-600, 600), -8, r.range(-900, 100)] as Vec3, s: [r.range(40, 120), r.range(10, 22), r.range(30, 80)] as Vec3 }));
  }, []);
  const lump = useMemo(() => lumpyIco(1, 2, 0.08, 4), []);
  const pyr = (pos: Vec3, base: number, h: number, key: number) => (
    <group key={key} position={pos}>
      <mesh position={[0, h / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[base / Math.SQRT2, h, 4, 1]} />
        <Flat color="#D9BC86" roughness={0.95} />
      </mesh>
      {key === 0 && (
        <mesh position={[0, h - 6, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[(base / Math.SQRT2) * (12 / h) + 0.5, 12, 4, 1]} />
          <Flat color="#E8D3A3" roughness={0.9} />
        </mesh>
      )}
    </group>
  );
  return (
    <Stage preset="golden" sunDir={sunDir} fog={["#F2C9A4", 300, 2400]} shadowCenter={[0, 0, -250]} shadowSize={260} aoRadius={2}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.2} far={5000} />
      <SkyDome top="#6E86B8" horizon="#F6C79A" radius={3500} sun={sunDir} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[6000, 6000]} /><Flat color="#E6D3A3" roughness={1} /></mesh>
      {dunes.map((d, i) => <mesh key={i} geometry={lump} position={d.p} scale={d.s} receiveShadow castShadow><Flat color={i % 2 ? "#E2C893" : "#D9BC86"} roughness={1} /></mesh>)}
      {pyr([0, 0, -330], 230, 146, 0)}
      {pyr([-210, 0, -470], 215, 136, 1)}
      {pyr([-330, 0, -580], 105, 65, 2)}
      {/* Steine, Sandwehen */}
      {Array.from({ length: 16 }).map((_, i) => {
        const r = rng(80 + i);
        return <Rock key={i} position={[r.range(-30, 30), 0.2, r.range(-60, 10)]} scale={r.range(0.6, 2.5)} seed={i} color={r.pick(["#C9B38A", "#B9A07A", "#D9C7A0"])} />;
      })}
      <Particles kind="dust" n={160} box={[40, 6, 40]} center={[c.pos[0], 2, c.pos[2] - 15]} time={t} velocity={[3, 0.1, 0.5]} sizeScale={0.7} colors={["#F2E0B8", "#E6D3A3"]} seed={2} />
      {g && <Max position={g.pos} rotationY={g.rotY} pose={g.pose} time={t} ghost={0.45} expression="neutral" />}
    </Stage>
  );
};

export { Glow, lerp };
