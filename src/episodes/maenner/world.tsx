// Szenen für „Was wäre, wenn alle Männer verschwinden?“
//  Street     – Fußgängerzone/Straße: Max + gemischte Passanten, Plopp → Männer weg, Max' Mütze fällt
//  Prison     – Zellentrakt: fast alle Zellen leer, die Wärterin legt die Füße hoch
//  Parliament – Plenarsaal: 630 Sitze, nur 204 Frauen, Kran-Fahrt nach oben (Zoom-out)
//  SpermBank  – Tresor mit Stickstoff-Tanks, Laser, Technikerin hebt einen Kanister (−196 °C)
//  Nursery    – Säuglingsstation voller Jungs, Baby-Max mit viel zu großer gelber Mütze
import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { clamp, keys3, lerp, type Vec3, type Key } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glow, Glass, Max, Character, outfitFromSeed, Building, Tree, StreetLamp, Car, SkyDome, Cloud, Particles,
  Instanced, lumpyIco, type Pose, type Inst, type Outfit,
} from "../../three/kit";
import { VANISH } from "./metric";

export type Cam = { pos: Vec3; look: Vec3; fov?: number; roll?: number };
export type CamFn = (c: { t: number; local: number; p: number }) => Cam;

/** Kamerafahrt a → b über die Shotdauer (sanft) */
export const move = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p }) => {
  const e = p * p * (3 - 2 * p) * 0.6 + p * 0.4;
  return { pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], e), look: keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la }], e), fov };
};
/** Kamerafahrt über mehrere Stützpunkte (p 0..1) */
export const path = (pos: Key<Vec3>[], look: Key<Vec3>[], fov = 45): CamFn => ({ p }) => ({ pos: keys3(pos, p), look: keys3(look, p), fov });

const sm = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ═════════════════════════ Figuren ═════════════════════════

type CharProps = Omit<React.ComponentProps<typeof Character>, "outfit">;
/** Frau: lange Haare (Länge aus Seed) */
export const Woman: React.FC<CharProps & { seed: number; outfit?: Outfit }> = ({ seed, outfit, ...p }) => {
  const r = rng(seed * 7 + 3);
  return <Character outfit={outfit ?? outfitFromSeed(seed)} hairLong={r.range(0.16, 0.36)} {...p} time={(p.time ?? 0) + (seed % 7) * 0.13} />;
};
/** Mann: kurze Haare, manchmal Bart */
export const Man: React.FC<CharProps & { seed: number }> = ({ seed, ...p }) => {
  const r = rng(seed * 11 + 5);
  const beard = r.next() < 0.45 ? r.range(0.02, 0.09) : 0;
  return <Character outfit={outfitFromSeed(seed)} beard={beard} {...p} time={(p.time ?? 0) + (seed % 7) * 0.13} />;
};

/** Funken, wo eben noch jemand stand (aufsteigend, verblassend) */
const Sparkles: React.FC<{ spots: Vec3[]; t: number; k: number }> = ({ spots, t, k }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const items: Inst[] = [];
  spots.forEach((p, i) => {
    const r = rng(500 + i);
    for (let j = 0; j < 10; j++) {
      const up = r.range(0.2, 1.9) + k * r.range(0.6, 1.6);
      const s = 0.075 * (1 - k) * r.range(0.6, 1.3);
      items.push({ p: [p[0] + r.range(-0.35, 0.35) * (1 + k), up, p[2] + r.range(-0.35, 0.35) * (1 + k)], r: [t * 3 + j, j, 0], s, c: r.next() < 0.6 ? "#6FF2D0" : "#FFFFFF" });
    }
  });
  return <Instanced items={items} geometry={geo} basic cast={false} receive={false} />;
};

/** Max' gelbe Mütze (einzeln) */
export const Beanie: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <Box size={[0.39, 0.14, 0.37]} color={PALETTE.max.beanie} position={[0, 0.1, 0]} />
    <Box size={[0.41, 0.05, 0.39]} color={PALETTE.max.beanie} position={[0, 0.025, 0]} />
    <Box size={[0.3, 0.06, 0.28]} color={PALETTE.max.beanie} position={[0, 0.19, 0]} />
  </group>
);

// ═════════════════════════ Straße ═════════════════════════

export const MAXP: Vec3 = [6.0, 0, 2.0];
const MAX_ROT = -0.5;

type Ped = { x: number; z0: number; v: number; dir: number; seed: number; male: boolean; pose: Pose; rot?: number; hold?: "phone" };
const PEDS: Ped[] = (() => {
  const r = rng(4711);
  const out: Ped[] = [];
  for (let i = 0; i < 22; i++) {
    const right = i % 2 === 0;
    const x = right ? r.range(5.0, 9.4) : r.range(-9.4, -5.0);
    let z0 = r.range(-55, 14);
    if (right && Math.abs(z0 - MAXP[2]) < 2.2 && Math.abs(x - MAXP[0]) < 1.6) z0 -= 4;
    out.push({ x, z0, v: r.range(1.1, 1.5), dir: r.sign(), seed: 40 + i, male: i % 2 === 1 ? r.next() < 0.6 : r.next() < 0.4, pose: "walk" });
  }
  // Gruppe neben Max (Vordergrund)
  out.push({ x: 7.7, z0: 0.6, v: 0, dir: 0, seed: 7, male: false, pose: "phone", rot: -1.0, hold: "phone" });
  out.push({ x: 8.3, z0: 2.4, v: 0, dir: 0, seed: 12, male: true, pose: "idle", rot: -1.7 });
  out.push({ x: 4.3, z0: -1.4, v: 0, dir: 0, seed: 23, male: true, pose: "idle", rot: 0.7 });
  out.push({ x: 5.0, z0: -2.4, v: 0, dir: 0, seed: 31, male: false, pose: "idle", rot: 0.4 });
  out.push({ x: 8.6, z0: -3.6, v: 0, dir: 0, seed: 36, male: true, pose: "phone", rot: -2.2, hold: "phone" });
  out.push({ x: 9.0, z0: 5.0, v: 1.2, dir: -1, seed: 15, male: false, pose: "walk" });
  return out;
})();
const pedPos = (w: Ped, t: number): Vec3 => {
  // Frauen bleiben nach dem Plopp abrupt stehen
  const tt = Math.min(t, VANISH + 0.15);
  return [w.x, 0, w.z0 + w.dir * w.v * tt];
};

type CarDef = { x: number; z0: number; v: number; male: boolean; color: string; veer?: number };
const CARS: CarDef[] = [
  { x: 2.0, z0: 26, v: 9, male: true, color: PALETTE.car[0], veer: 1.0 },
  { x: 2.0, z0: -18, v: 8, male: false, color: PALETTE.car[3] },
  { x: -2.0, z0: -42, v: 10, male: true, color: PALETTE.car[2] },
  { x: -2.0, z0: -5, v: 9, male: true, color: PALETTE.car[1] },
  { x: 2.0, z0: -60, v: 9, male: false, color: PALETTE.car[5] },
];
function carState(c: CarDef, t: number): { p: Vec3; rot: number; spin: number } {
  const dir = c.x > 0 ? -1 : 1;
  // Fahrer weg → rollt aus (2,6 s), Fahrerin → bremst erschrocken (0,8 s)
  const coast = c.male ? 2.6 : 0.8;
  const d0 = VANISH + (c.male ? 0 : 0.25);
  let s: number;
  if (t <= d0) s = c.v * t;
  else { const tau = Math.min(t - d0, coast); s = c.v * d0 + c.v * (tau - (tau * tau) / (2 * coast)); }
  const k = c.veer ? sm(VANISH, VANISH + 2.4, t) : 0;
  return { p: [c.x + (c.veer ?? 0) * k * dir * -1, 0, c.z0 + dir * s], rot: (dir > 0 ? 0 : Math.PI) + k * 0.35, spin: s / 0.38 };
}

const BLDS = (() => {
  const r = rng(99);
  const out: { x: number; z: number; w: number; d: number; h: number; c: string; seed: number }[] = [];
  for (const s of [-1, 1]) {
    let z = 40;
    while (z > -260) {
      const w = r.range(9, 16);
      const d = r.range(10, 14);
      const h = Math.round(r.range(10, 24) / 3.2) * 3.2;
      out.push({ x: s * (10.5 + d / 2), z: z - w / 2, w: d, d: w, h, c: r.pick(PALETTE.facade), seed: r.int(1, 9999) });
      z -= w + r.range(0.3, 1.2);
    }
  }
  return out;
})();

export const Street: React.FC<{ shot: ShotInfo; cam: CamFn }> = ({ shot, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const sunDir: Vec3 = [-40, 45, 30];
  const gone = sm(VANISH, VANISH + 0.35, t);
  const sparkK = clamp((t - VANISH) / 0.9);
  const after = t > VANISH + 0.15;
  const dt = Math.max(0, t - VANISH);
  // Mütze fällt (vom Kopf 1,95 m), kleiner Hüpfer, bleibt schräg liegen
  const fallT = 0.62;
  let by = 1.9 - 4.9 * dt * dt;
  if (dt > fallT) { const b = dt - fallT; by = Math.max(0, 0.18 * Math.sin(Math.min(Math.PI, b * 9)) * Math.exp(-b * 2)); }
  const landed = dt > fallT;
  const beanieRot: Vec3 = landed ? [0.25, 0.6, 0.18] : [dt * 5, dt * 2, dt * 3];
  const beaniePos: Vec3 = [MAXP[0] + Math.min(dt, 0.8) * 0.35, Math.max(0, by), MAXP[2] + Math.min(dt, 0.8) * 0.45];
  const phoneY = Math.max(0.03, 1.15 - 4.9 * dt * dt);
  const near = Math.hypot(c.pos[0] - MAXP[0], c.pos[2] - MAXP[2]) < 25;
  const spots = [MAXP, ...PEDS.filter((w) => w.male).map((w) => pedPos(w, VANISH))];
  return (
    <Stage preset="day" sunDir={sunDir} fog={["#CFE7F5", 70, 420]} shadowCenter={[MAXP[0] - 2, 0, MAXP[2] - 6]} shadowSize={near ? 24 : 60} aoRadius={0.5}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.05} far={1500} />
      <SkyDome top="#5E9BE0" horizon="#DDEFF7" radius={900} sun={sunDir} />
      {/* Boden, Straße, Gehwege */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -100]} receiveShadow><planeGeometry args={[600, 600]} /><Flat color="#B8B2A6" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, -100]} receiveShadow><planeGeometry args={[8, 400]} /><Flat color={PALETTE.asphalt} roughness={0.85} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[s * 7.25, 0.08, -100]} receiveShadow><planeGeometry args={[6.5, 400]} /><Flat color={PALETTE.sidewalk} /></mesh>
          <Box size={[0.25, 0.16, 400]} color="#9C968C" position={[s * 4.05, 0.04, -100]} bevel={0} cast={false} />
        </group>
      ))}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 30 - i * 9]}><planeGeometry args={[0.18, 4]} /><Flat color={PALETTE.roadLine} /></mesh>
      ))}
      {/* Zebrastreifen */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-3.2 + i * 1.6, 0.02, -12]}><planeGeometry args={[0.8, 3.2]} /><Flat color={PALETTE.roadLine} /></mesh>
      ))}
      {/* Häuser */}
      {BLDS.map((b, i) => <Building key={i} position={[b.x, 0, b.z]} size={[b.w, b.h, b.d]} color={b.c} seed={b.seed} />)}
      {/* Markisen/Läden am Erdgeschoss rechts */}
      {BLDS.filter((b) => b.x > 0 && b.z > -60).map((b, i) => (
        <Box key={i} size={[1.2, 0.12, b.d * 0.8]} color={PALETTE.shirt[(i * 3) % PALETTE.shirt.length]} position={[10.9, 3.1, b.z]} rotation={[0, 0, 0.25]} cast={false} />
      ))}
      {/* Bäume + Laternen */}
      {Array.from({ length: 10 }).map((_, i) => [-1, 1].map((s) => {
        const z = 18 - i * 14 + (s > 0 ? 4 : 0);
        if (s > 0 && Math.abs(z - MAXP[2]) < 4) return null;
        return <Tree key={`${i}${s}`} position={[s * 4.9, 0, z]} seed={i * 2 + (s > 0 ? 1 : 0) + 5} scale={1.15} />;
      }))}
      {Array.from({ length: 8 }).map((_, i) => [-1, 1].map((s) => (
        <group key={`${i}${s}`} position={[s * 4.6, 0, 11 - i * 18]} rotation={[0, s > 0 ? Math.PI : 0, 0]}><StreetLamp /></group>
      )))}
      {/* Poller vor Max */}
      {[0, 1, 2].map((i) => <Box key={i} size={[0.22, 0.8, 0.22]} color={PALETTE.steel} position={[4.45, 0.4, 14 - i * 1.6]} />)}
      {/* Autos */}
      {CARS.map((cd, i) => {
        const st = carState(cd, t);
        return <Car key={i} position={st.p} rotationY={st.rot} color={cd.color} wheelSpin={st.spin} />;
      })}
      {/* Menschen */}
      {PEDS.map((w, i) => {
        const pos = pedPos(w, t);
        const rot = w.rot ?? (w.dir > 0 ? 0 : Math.PI);
        if (w.male) {
          if (gone >= 0.999) return null;
          return <Man key={i} seed={w.seed} pose={w.pose} hold={w.hold} time={t} position={pos} rotationY={rot} ghost={gone} />;
        }
        const look = after ? rot + Math.sin(t * 1.6 + i) * 0.7 : rot;
        const pose: Pose = after ? (i % 3 === 0 ? "shock" : i % 3 === 1 ? "lookUp" : "idle") : w.pose;
        return <Woman key={i} seed={w.seed} pose={pose} hold={!after ? w.hold : undefined} time={t} position={pos} rotationY={look} expression={after ? "shock" : "neutral"} />;
      })}
      {gone < 0.999 && (
        <Max position={MAXP} rotationY={MAX_ROT} pose={t < 1.3 ? "phone" : "idle"} hold={t < 1.3 ? "phone" : undefined} time={t} ghost={gone} expression={t > 1.6 ? "shock" : "neutral"} />
      )}
      {sparkK > 0 && sparkK < 1 && <Sparkles spots={spots} t={t} k={sparkK} />}
      {/* Was von Max bleibt: Mütze + Handy */}
      {t >= VANISH && (
        <>
          <Beanie position={beaniePos} rotation={beanieRot} />
          <group position={[MAXP[0] - 0.25, phoneY, MAXP[2] + 0.2]} rotation={[dt < 0.45 ? dt * 6 : -Math.PI / 2, 0.5, 0]}>
            <Box size={[0.09, 0.17, 0.02]} color="#1E2228" cast={false} />
            <Box size={[0.075, 0.15, 0.004]} color="#BDEFFF" emissive="#8FE3FF" position={[0, 0, -0.012]} cast={false} bevel={0} />
          </group>
        </>
      )}
      {[[-60, 80, -260], [90, 100, -320], [10, 110, -400]].map((cp, i) => <Cloud key={i} position={cp as Vec3} scale={14} seed={i + 2} />)}
      {near && <Particles kind="dust" n={60} box={[14, 5, 14]} center={[c.pos[0], 2, c.pos[2] - 5]} time={t} velocity={[0.15, 0.05, 0.05]} sizeScale={0.6} opacity={0.7} seed={11} />}
    </Stage>
  );
};

// ═════════════════════════ Gefängnis ═════════════════════════

const CELL_W = 3.2, CELLS = 12;
const INMATES = [{ side: 1, k: 2, pose: "idle" as Pose }, { side: -1, k: 5, pose: "sit" as Pose }];
const JUMPSUIT: Outfit = { skin: PALETTE.skin[1], hair: PALETTE.hair[0], top: "#FF8A3D", pants: "#FF8A3D", shoes: "#F4F4F4" };
const GUARD: Outfit = { skin: PALETTE.skin[0], hair: PALETTE.hair[2], top: "#2F3B4C", pants: "#2F3B4C", shoes: "#1E1E1E" };

export const Prison: React.FC<{ shot: ShotInfo; cam: CamFn }> = ({ shot, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const barGeo = useMemo(() => new THREE.CylinderGeometry(0.025, 0.025, 1, 6), []);
  const cubeGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bars = useMemo(() => {
    const out: Inst[] = [];
    for (const s of [-1, 1])
      for (let k = 0; k < CELLS; k++) {
        const z0 = 2 - k * CELL_W;
        for (let j = 1; j < 21; j++) out.push({ p: [s * 2.0, 1.4, z0 - j * (CELL_W / 21)], s: [1, 2.8, 1], c: "#5E6B78" });
      }
    return out;
  }, []);
  const rails = useMemo(() => {
    const out: Inst[] = [];
    for (const s of [-1, 1]) for (const y of [0.05, 1.2, 2.75]) out.push({ p: [s * 2.0, y, 2 - (CELLS * CELL_W) / 2], s: [0.08, 0.08, CELLS * CELL_W], c: "#4A545F" });
    for (const s of [-1, 1]) for (let k = 0; k <= CELLS; k++) out.push({ p: [s * 3.6, 1.45, 2 - k * CELL_W], s: [3.2, 2.9, 0.18], c: "#C9C4BA" });
    return out;
  }, []);
  return (
    <Stage preset="interior" bg="#2B3138" fog={["#3A424B", 14, 48]} sunDir={[4, 20, 6]} sunIntensity={0.5} shadowCenter={[0, 0, -8]} shadowSize={16} aoRadius={0.5} envIntensity={0.55}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.05} far={200} />
      {/* Boden (glänzend), Decke, Rückwände */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -16]} receiveShadow><planeGeometry args={[12, 60]} /><Flat color="#7E8A86" roughness={0.28} /></mesh>
      <Box size={[12, 0.2, 60]} color="#9AA19C" position={[0, 3.0, -16]} cast={false} bevel={0} />
      {[-1, 1].map((s) => <Box key={s} size={[0.2, 3, 60]} color="#B9B2A6" position={[s * 5.2, 1.5, -16]} bevel={0} />)}
      <Box size={[12, 3, 0.2]} color="#8B95A1" position={[0, 1.5, -38]} bevel={0} />
      {/* gelbe Linie am Boden */}
      {[-1, 1].map((s) => <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 1.6, 0.01, -16]}><planeGeometry args={[0.1, 60]} /><Flat color="#F2C14E" /></mesh>)}
      <Instanced items={rails} geometry={cubeGeo} />
      <Instanced items={bars} geometry={barGeo} />
      {/* Zellen: Pritsche, Decke, Klo, Fensterchen */}
      {[-1, 1].map((s) => Array.from({ length: CELLS }).map((_, k) => {
        const zc = 2 - (k + 0.5) * CELL_W;
        return (
          <group key={`${s}${k}`}>
            <Box size={[0.9, 0.12, 2.0]} color="#8B95A1" position={[s * 4.6, 0.55, zc]} />
            <Box size={[0.85, 0.1, 1.7]} color={k % 3 === 0 ? "#9FB4C7" : "#B7C9A8"} position={[s * 4.6, 0.66, zc + 0.12]} rotation={[0, (k % 2) * 0.1, 0.04]} />
            <Box size={[0.4, 0.12, 0.3]} color="#F4F4F4" position={[s * 4.6, 0.68, zc - 0.8]} />
            <Box size={[0.4, 0.42, 0.45]} color="#E9EEF0" position={[s * 2.6, 0.21, zc + 1.0]} roughness={0.3} />
            <Box size={[0.05, 0.4, 0.7]} color="#DDEFF7" emissive="#DDEFF7" emissiveIntensity={1.1} position={[s * 5.08, 2.1, zc]} cast={false} />
          </group>
        );
      }))}
      {/* Gefangene: nur 2 von 24 Zellen (≈ 7 %) */}
      {INMATES.map((m, i) => {
        const zc = 2 - (m.k + 0.5) * CELL_W;
        return m.pose === "sit"
          ? <Woman key={i} seed={60 + i} outfit={{ ...JUMPSUIT, hair: PALETTE.hair[1] }} pose="sit" time={t} position={[m.side * 4.35, 0.1, zc]} rotationY={-m.side * Math.PI / 2} />
          : <Woman key={i} seed={61 + i} outfit={JUMPSUIT} pose="idle" time={t} position={[m.side * 2.45, 0, zc]} rotationY={-m.side * Math.PI / 2 - 0.2} joints={{ lArmX: -1.4, rArmX: -1.4 }} />;
      })}
      {/* Wärterin: Füße hoch, Feierabend */}
      <group position={[-0.9, 0, -9]}>
        <Box size={[1.2, 0.06, 0.7]} color="#B88A5E" position={[0, 0.74, 0.9]} />
        {[[-0.5, 0.6], [0.5, 0.6], [-0.5, 1.2], [0.5, 1.2]].map(([x, z], i) => <Box key={i} size={[0.06, 0.74, 0.06]} color="#5E6B78" position={[x, 0.37, z]} />)}
        <mesh position={[0.35, 0.83, 0.9]}><cylinderGeometry args={[0.05, 0.045, 0.12, 10]} /><Flat color="#F4F4F4" /></mesh>
        <Box size={[0.5, 0.08, 0.5]} color="#2F3B4C" position={[0, 0.48, 0]} />
        <Box size={[0.5, 0.6, 0.08]} color="#2F3B4C" position={[0, 0.8, -0.24]} rotation={[-0.25, 0, 0]} />
        <Character outfit={GUARD} hairLong={0.22} pose="sit" time={t} position={[0, 0.06, 0.05]} rotationY={0}
          joints={{ lHip: -1.25, rHip: -1.25, bodyX: -0.3, lArmZ: 2.4, rArmZ: -2.4, lArmX: -0.4, rArmX: -0.4, headX: -0.2 }} expression="happy" />
      </group>
      {/* Deckenlampen */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i}>
          <Box size={[0.4, 0.06, 1.6]} color="#FFFFFF" emissive="#FFF4E0" emissiveIntensity={1.6} position={[0, 2.88, 1 - i * 5]} cast={false} />
          {i < 5 && <pointLight position={[0, 2.5, 1 - i * 5]} intensity={9} distance={9} color="#FFF1DC" />}
        </group>
      ))}
      <Particles kind="dust" n={70} box={[4, 2.6, 12]} center={[0, 1.5, c.pos[2] - 6]} time={t} velocity={[0.05, 0.04, 0.02]} sizeScale={0.5} opacity={0.6} seed={17} />
    </Stage>
  );
};

// ═════════════════════════ Bundestag ═════════════════════════

const SEAT_BLUE = PALETTE.car[2];
type SeatInfo = { p: Vec3; rot: number; woman: boolean; c: string; skin: string; hair: string };
const SEATS: SeatInfo[] = (() => {
  const rows = 9;
  const pos: { p: Vec3; rot: number }[] = [];
  const total = 630;
  const radii = Array.from({ length: rows }, (_, k) => 7 + k * 1.7);
  const sum = radii.reduce((a, b) => a + b, 0);
  radii.forEach((r, k) => {
    const n = Math.round((total * r) / sum);
    const blocks = 6;
    const per = Math.ceil(n / blocks);
    const a0 = -1.32, a1 = 1.32, gap = 0.06;
    const span = (a1 - a0 - gap * (blocks - 1)) / blocks;
    let placed = 0;
    for (let b = 0; b < blocks; b++)
      for (let j = 0; j < per && placed < n; j++, placed++) {
        const a = a0 + b * (span + gap) + (j + 0.5) * (span / per);
        pos.push({ p: [Math.sin(a) * r, k * 0.38, Math.cos(a) * r], rot: a + Math.PI });
      }
  });
  const r = rng(204);
  // genau 204 Frauen auf zufälligen Plätzen
  const idx = pos.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const women = new Set(idx.slice(0, 204));
  return pos.map((s, i) => ({ ...s, woman: women.has(i), c: r.pick(PALETTE.shirt), skin: r.pick(PALETTE.skin), hair: r.pick(PALETTE.hair) }));
})();

const rotOff = (rot: number, fwd: number, y: number): Vec3 => [Math.sin(rot) * fwd, y, Math.cos(rot) * fwd];
const SPEAKER: Outfit = { skin: PALETTE.skin[0], hair: PALETTE.hair[2], top: "#9A5FD0", pants: "#2F3B4C", shoes: "#2F3B4C" };

export const Parliament: React.FC<{ shot: ShotInfo; cam: CamFn }> = ({ shot, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const cube = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const { seats, backs, desks, bodies, heads, hairs, steps } = useMemo(() => {
    const seats: Inst[] = [], backs: Inst[] = [], desks: Inst[] = [], bodies: Inst[] = [], heads: Inst[] = [], hairs: Inst[] = [], steps: Inst[] = [];
    for (const s of SEATS) {
      const at = (fwd: number, y: number): Vec3 => { const o = rotOff(s.rot, fwd, y); return [s.p[0] + o[0], s.p[1] + o[1], s.p[2] + o[2]]; };
      const r: Vec3 = [0, s.rot, 0];
      seats.push({ p: at(0, 0.45), r, s: [0.55, 0.12, 0.5], c: SEAT_BLUE });
      backs.push({ p: at(-0.24, 0.85), r, s: [0.55, 0.7, 0.1], c: SEAT_BLUE });
      desks.push({ p: at(0.55, 0.7), r, s: [0.64, 0.05, 0.4], c: "#5E6B78" });
      desks.push({ p: at(0.74, 0.36), r, s: [0.64, 0.66, 0.05], c: "#6E7C8E" });
      steps.push({ p: at(0.1, -0.2), r, s: [0.66, 0.4 + s.p[1], 1.7], c: "#8E9DB2" });
      if (s.woman) {
        bodies.push({ p: at(0.02, 0.85), r, s: [0.48, 0.6, 0.3], c: s.c });
        heads.push({ p: at(0.04, 1.36), r, s: [0.34, 0.34, 0.32], c: s.skin });
        hairs.push({ p: at(-0.09, 1.36), r, s: [0.37, 0.48, 0.2], c: s.hair });
        hairs.push({ p: at(0.0, 1.55), r, s: [0.37, 0.09, 0.35], c: s.hair });
      }
    }
    return { seats, backs, desks, bodies, heads, hairs, steps };
  }, []);
  return (
    <Stage preset="interior" bg="#DDE3EA" fog={["#DDE3EA", 40, 160]} sunDir={[10, 40, 18]} sunIntensity={1.6} shadowCenter={[0, 0, 10]} shadowSize={26} aoRadius={0.8} env={["#F4F6F8", "#E6EAEE", "#9EA6B0"]}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.1} far={400} />
      {/* Boden (Teppich), Rückwand, Präsidium */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 8]} receiveShadow><planeGeometry args={[90, 90]} /><Flat color="#7E90AE" /></mesh>
      <Box size={[44, 16, 0.6]} color="#E9ECEF" position={[0, 8, -4.5]} bevel={0} />
      {/* stilisierter grauer Adler-Schatten ersetzt durch schlichte Lamellen */}
      {Array.from({ length: 9 }).map((_, i) => <Box key={i} size={[0.25, 9, 0.2]} color="#C9CED4" position={[-8 + i * 2, 8.5, -4.1]} bevel={0} />)}
      <Box size={[12, 1.4, 1.6]} color="#C9C4BA" position={[0, 0.7, -3.2]} />
      <Box size={[12.4, 0.12, 1.8]} color="#E3D9C6" position={[0, 1.45, -3.2]} />
      {/* Rednerpult + Rednerin */}
      <Box size={[1.2, 1.15, 0.8]} color="#8E6A4A" position={[0, 0.58, 1.2]} />
      <Box size={[1.3, 0.08, 0.9]} color="#B88A5E" position={[0, 1.18, 1.15]} rotation={[-0.15, 0, 0]} />
      <Character outfit={SPEAKER} hairLong={0.24} pose="point" time={t} position={[0, 0, 0.45]} rotationY={0} expression="neutral" joints={{ rArmX: -1.2 + Math.sin(t * 3) * 0.2 }} />
      {/* Ränge */}
      <Instanced items={steps} geometry={cube} />
      <Instanced items={seats} geometry={cube} />
      <Instanced items={backs} geometry={cube} />
      <Instanced items={desks} geometry={cube} />
      <Instanced items={bodies} geometry={cube} />
      <Instanced items={heads} geometry={cube} />
      <Instanced items={hairs} geometry={cube} />
      {/* Kuppel-Licht von oben */}
      <mesh position={[0, 34, 10]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[14, 40]} /><Glow color="#FFFFFF" opacity={0.9} additive={false} /></mesh>
      <pointLight position={[0, 18, 10]} intensity={260} distance={60} color="#FFF8EC" />
      <Particles kind="dust" n={80} box={[30, 10, 30]} center={[0, 6, 10]} time={t} velocity={[0.05, 0.03, 0.02]} sizeScale={0.8} opacity={0.5} seed={21} />
    </Stage>
  );
};

// ═════════════════════════ Samenbank ═════════════════════════

const LAB: Outfit = { skin: PALETTE.skin[2], hair: PALETTE.hair[3], top: "#F4F4F4", pants: "#C9C4BA", shoes: "#F4F4F4" };
const SECURITY: Outfit = { skin: PALETTE.skin[1], hair: PALETTE.hair[0], top: "#1E1E1E", pants: "#1E1E1E", shoes: "#1E1E1E" };
export const TANK_HERO: Vec3 = [2.6, 0, -1.4];

function useLabelTex(lines: { text: string; color: string; size: number; y: number }[], bg: string, w = 512, h = 256) {
  return useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d")!;
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.textAlign = "center"; g.textBaseline = "middle";
    for (const l of lines) { g.fillStyle = l.color; g.font = `800 ${l.size}px Inter, sans-serif`; g.fillText(l.text, w / 2, l.y); }
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, [JSON.stringify(lines), bg, w, h]);
}

/** Dampf aus flüssigem Stickstoff: Wölkchen quellen aus dem Tank und fließen am Rand herab */
const Vapor: React.FC<{ center: Vec3; t: number; k: number; seed?: number }> = ({ center, t, k, seed = 3 }) => {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const puffs = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 40 }).map(() => ({ a: r.range(0, Math.PI * 2), ph: r.range(0, 1), s: r.range(0.08, 0.18), sp: r.range(0.3, 0.6) }));
  }, [seed]);
  if (k <= 0) return null;
  return (
    <group position={center}>
      {puffs.map((pf, i) => {
        const life = (t * pf.sp + pf.ph) % 1;
        const out = 0.3 + life * 0.35;
        const y = life < 0.35 ? life * 0.6 : 0.21 - (life - 0.35) * 1.6;
        return (
          <mesh key={i} geometry={geo} position={[Math.cos(pf.a) * out, y, Math.sin(pf.a) * out]} scale={pf.s * (0.6 + life * 1.4) * k}>
            <meshStandardMaterial color="#F4FBFF" emissive="#DDF6FF" emissiveIntensity={0.35} transparent opacity={clamp((1 - life) * 0.4 * k)} depthWrite={false} roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
};

export const SpermBank: React.FC<{ shot: ShotInfo; cam: CamFn; open?: (t: number) => number }> = ({ shot, cam, open }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const lift = open ? open(t) : 0;
  const tanks = useMemo(() => {
    const out: Vec3[] = [];
    for (const x of [-4.4, -2.6, 2.6, 4.4]) for (let i = 0; i < 16; i++) out.push([x, 0, -1.4 - i * 1.5]);
    return out;
  }, []);
  const cyl = useMemo(() => new THREE.CylinderGeometry(0.46, 0.46, 1.05, 20), []);
  const lid = useMemo(() => new THREE.CylinderGeometry(0.26, 0.3, 0.16, 16), []);
  const ring = useMemo(() => new THREE.CylinderGeometry(0.48, 0.48, 0.06, 20), []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#C9D2DA", roughness: 0.28, metalness: 0.85 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3B434D", roughness: 0.4, metalness: 0.6 }), []);
  const display = useLabelTex([
    { text: "−196 °C", color: "#6FF2D0", size: 104, y: 110 },
    { text: "N₂  ·  TANK 07", color: "#9FB4C7", size: 40, y: 200 },
  ], "#0B1520");
  const sign = useLabelTex([{ text: "SAMENBANK", color: "#FFFFFF", size: 88, y: 92 }, { text: "ZUTRITT NUR MIT FREIGABE", color: "#FF6B5B", size: 34, y: 185 }], "#1F5F8B");
  const fogGeo = useMemo(() => lumpyIco(1, 1, 0.3, 77), []);
  const floorFog = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 40 }).map(() => ({ p: [r.range(-6, 6), 0.05, r.range(-26, 4)] as Vec3, s: r.range(0.6, 1.4), ph: r.range(0, 6) }));
  }, []);
  return (
    <Stage preset="interior" bg="#0E1A26" fog={["#16283A", 12, 46]} sunDir={[3, 20, 8]} sunIntensity={0.35} shadowCenter={[0, 0, -6]} shadowSize={14} aoRadius={0.5}
      env={["#9FD8F0", "#3C6E8A", "#1A2A38"]} envIntensity={0.7} bloom={0.6}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.05} far={200} />
      {/* Raum */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -12]} receiveShadow><planeGeometry args={[14, 44]} /><Flat color="#A9B7C2" roughness={0.22} metalness={0.2} /></mesh>
      {[-1, 1].map((s) => <Box key={s} size={[0.2, 4.2, 44]} color="#D2DCE2" position={[s * 6.6, 2.1, -12]} bevel={0} />)}
      <Box size={[14, 0.2, 44]} color="#C9D2DA" position={[0, 4.2, -12]} bevel={0} cast={false} />
      {/* Lichtbänder */}
      {[-3.5, 0, 3.5].map((x) => <Box key={x} size={[0.18, 0.05, 40]} color="#BFF5EC" emissive="#9FF2E8" emissiveIntensity={2.2} position={[x, 4.08, -12]} cast={false} bevel={0} />)}
      {[0, 1, 2, 3].map((i) => <pointLight key={i} position={[0, 3.4, 1 - i * 7]} intensity={10} distance={11} color="#BDEFFF" />)}
      {/* Tresortür am Ende */}
      <group position={[0, 2.1, -33.5]}>
        <Box size={[13, 4.2, 0.6]} color="#8B95A1" position={[0, 0, -0.4]} bevel={0} />
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[1.2, 0, 0.6]} material={steel}><cylinderGeometry args={[1.9, 1.9, 0.6, 32]} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => <Box key={i} size={[0.12, 1.4, 0.12]} color="#5E6B78" position={[1.2 + Math.sin(i) * 0.5, Math.cos(i) * 0.5, 1.0]} rotation={[0, 0, i]} />)}
        <Character outfit={SECURITY} hairLong={0.2} pose="idle" time={t} position={[-2.0, -2.1, 0.6]} rotationY={0.2} joints={{ lArmX: -1.2, rArmX: -1.2, lArmZ: -0.5, rArmZ: 0.5 }} />
      </group>
      {/* Schild */}
      <mesh position={[-6.45, 2.6, -6]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.6, 1.3]} /><meshStandardMaterial map={sign} emissive="#FFFFFF" emissiveMap={sign} emissiveIntensity={0.5} roughness={0.5} /></mesh>
      {/* Tanks */}
      {tanks.map((tp, i) => {
        const hero = tp[0] === TANK_HERO[0] && tp[2] === TANK_HERO[2];
        return (
          <group key={i} position={tp}>
            <mesh geometry={cyl} material={steel} position={[0, 0.525, 0]} castShadow receiveShadow />
            <mesh geometry={ring} material={dark} position={[0, 0.06, 0]} />
            <mesh geometry={ring} material={dark} position={[0, 1.02, 0]} />
            <mesh geometry={lid} material={dark} position={hero ? [0.5 * lift, 1.13 + 0.25 * lift, 0.1 * lift] : [0, 1.13, 0]} rotation={hero ? [0, 0, -1.1 * lift] : [0, 0, 0]} />
            <Box size={[0.04, 0.12, 0.2]} color="#6FF2D0" emissive="#6FF2D0" emissiveIntensity={1.5} position={[tp[0] > 0 ? -0.47 : 0.47, 0.8, 0]} cast={false} bevel={0} />
          </group>
        );
      })}
      {/* Held-Tank: Kanister mit Röhrchen steigt auf, Dampf, Anzeige */}
      <group position={TANK_HERO}>
        <group position={[0, 0.85 + lift * 0.75, 0]}>
          <mesh><cylinderGeometry args={[0.08, 0.08, 0.6, 12]} /><meshStandardMaterial color="#E9EEF0" roughness={0.25} metalness={0.8} /></mesh>
          {Array.from({ length: 7 }).map((_, i) => (
            <mesh key={i} position={[Math.cos(i) * 0.04, 0.05, Math.sin(i) * 0.04]}><cylinderGeometry args={[0.012, 0.012, 0.5, 6]} /><Flat color={PALETTE.shirt[i % PALETTE.shirt.length]} /></mesh>
          ))}
          <Box size={[0.04, 0.5, 0.04]} color="#8B95A1" position={[0, 0.5, 0]} bevel={0} />
        </group>
        <Vapor center={[0, 1.12, 0]} t={t} k={clamp(lift * 1.6)} />
        <mesh position={[-0.62, 1.55, 0.55]} rotation={[0, -0.62, 0]}><planeGeometry args={[0.7, 0.35]} /><meshStandardMaterial map={display} emissive="#FFFFFF" emissiveMap={display} emissiveIntensity={1.0} /></mesh>
        <Box size={[0.06, 1.38, 0.06]} color="#5E6B78" position={[-0.62, 0.69, 0.55]} bevel={0} />
      </group>
      {open && <Character outfit={LAB} hairLong={0.3} pose="press" time={t} position={[TANK_HERO[0] + 0.85, 0, TANK_HERO[2] - 0.1]} rotationY={-Math.PI / 2 + 0.35}
        joints={{ rArmX: -1.5 - lift * 1.1, rArmZ: 0.15, lArmX: -0.5, headX: -0.3 * lift }} expression={lift > 0.5 ? "shock" : "neutral"} />}
      {/* Laser-Gitter im Gang */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const z = -5 - i * 3.2;
        const y = 0.35 + (i % 3) * 0.45;
        return (
          <group key={i} position={[0, y, z]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.12]}>
            <Box size={[3.6, 0.025, 0.025]} color="#FF6B5B" emissive="#FF3B2B" emissiveIntensity={4} cast={false} bevel={0} />
          </group>
        );
      })}
      {/* Bodennebel */}
      {floorFog.map((f, i) => (
        <mesh key={i} geometry={fogGeo} position={[f.p[0] + Math.sin(t * 0.4 + f.ph) * 0.3, 0.05, f.p[2]]} scale={[f.s * 1.6, f.s * 0.28, f.s * 1.3]}>
          <Flat color="#DDEFF7" opacity={0.22} roughness={1} />
        </mesh>
      ))}
      <Particles kind="dust" n={90} box={[10, 3, 16]} center={[0, 1.3, c.pos[2] - 6]} time={t} velocity={[0.05, 0.08, 0.02]} sizeScale={0.5} opacity={0.6} seed={33} colors={["#DDF6FF", "#FFFFFF"]} />
    </Stage>
  );
};

// ═════════════════════════ Säuglingsstation ═════════════════════════

export type BabyLook = { cap: string; blanket: string; skin: string; max?: boolean };
const BABY_EYES = "#1E1E24";

/** Neugeborenes, liegt auf dem Rücken (Gesicht nach oben, Kopf Richtung +z). `eyes` 0 = zu, 1 = offen */
export const Baby: React.FC<{ look: BabyLook; position?: Vec3; rotationY?: number; eyes?: number; smile?: boolean; wiggle?: number; scale?: number }> = ({ look, position = [0, 0, 0], rotationY = 0, eyes = 0, smile = false, wiggle = 0, scale = 1.35 }) => {
  const open = eyes > 0.5;
  const ez = lerp(0.008, 0.036, eyes);
  const fy = 0.178; // Gesichtsebene (Oberseite Kopf)
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group rotation={[0, 0, Math.sin(wiggle) * 0.04]}>
        {/* Pucksack + Kragen */}
        <Box size={[0.26, 0.14, 0.36]} color={look.blanket} position={[0, 0.07, -0.06]} bevel={0.4} />
        <Box size={[0.25, 0.06, 0.07]} color={look.blanket} position={[0, 0.14, 0.1]} bevel={0.4} />
        {/* Händchen */}
        {[-1, 1].map((sd) => <Box key={sd} size={[0.05, 0.045, 0.05]} color={look.skin} position={[sd * 0.06, 0.16 + Math.sin(wiggle * 1.7 + sd) * 0.008, 0.055]} bevel={0.4} cast={false} />)}
        {/* Kopf */}
        <Box size={[0.2, 0.17, 0.19]} color={look.skin} position={[0, 0.093, 0.23]} bevel={0.35} />
        {/* Gesicht */}
        {[-1, 1].map((sd) => (
          <group key={sd}>
            <Box size={[0.034, 0.004, ez]} color={BABY_EYES} position={[sd * 0.045, fy, 0.215]} cast={false} bevel={0} />
            {open && <Box size={[0.01, 0.004, 0.01]} color="#FFFFFF" position={[sd * 0.045 + 0.008, fy + 0.002, 0.222]} cast={false} bevel={0} />}
            <Box size={[0.03, 0.003, 0.022]} color="#F2A08C" position={[sd * 0.072, fy - 0.001, 0.18]} cast={false} bevel={0} opacity={0.8} />
          </group>
        ))}
        <Box size={[0.022, 0.012, 0.016]} color={look.skin} position={[0, fy + 0.004, 0.19]} cast={false} bevel={0.3} />
        <Box size={smile ? [0.05, 0.004, 0.016] : [0.024, 0.004, 0.01]} color="#C0504A" position={[0, fy, 0.163]} cast={false} bevel={0} />
        {/* Mütze: normal am Hinterkopf – Max: viel zu groß, rutscht bis zu den Augen */}
        {look.max ? (
          <group>
            <Box size={[0.27, 0.23, 0.15]} color={PALETTE.max.beanie} position={[0, 0.095, 0.32]} bevel={0.3} />
            <Box size={[0.285, 0.245, 0.045]} color={PALETTE.max.beanie} position={[0, 0.095, 0.243]} bevel={0.3} />
            <Box size={[0.12, 0.1, 0.06]} color={PALETTE.max.beanie} position={[0, 0.095, 0.41]} bevel={0.4} />
          </group>
        ) : (
          <Box size={[0.21, 0.185, 0.09]} color={look.cap} position={[0, 0.093, 0.305]} bevel={0.35} />
        )}
      </group>
    </group>
  );
};

/** Babybett: fahrbares Gestell + durchsichtige Wanne + Namenskarte */
const Bassinet: React.FC<{ position: Vec3; card: string; tex?: THREE.Texture; children?: React.ReactNode }> = ({ position, card, tex, children }) => (
  <group position={position}>
    {[[-0.25, -0.33], [0.25, -0.33], [-0.25, 0.33], [0.25, 0.33]].map(([x, z], i) => <Box key={i} size={[0.04, 0.72, 0.04]} color="#C9D2DA" position={[x, 0.36, z]} bevel={0} metalness={0.6} roughness={0.3} />)}
    <Box size={[0.6, 0.06, 0.8]} color="#E9EEF0" position={[0, 0.74, 0]} />
    <Box size={[0.5, 0.05, 0.68]} color="#FFFFFF" position={[0, 0.8, 0]} />
    {([[0, 0.29, 0.02, 0.78], [0, -0.29, 0.02, 0.78]] as const).map(([z, x, w, d], i) => (
      <mesh key={i} position={[x, 0.95, z]}><boxGeometry args={[w, 0.3, d]} /><Glass color="#DDF2FF" opacity={0.14} /></mesh>
    ))}
    {[0.39, -0.39].map((z) => <mesh key={z} position={[0, 0.95, z]}><boxGeometry args={[0.58, 0.3, 0.02]} /><Glass color="#DDF2FF" opacity={0.14} /></mesh>)}
    <mesh position={[0, 0.88, 0.41]}>
      <planeGeometry args={[0.3, 0.16]} />
      {tex ? <meshStandardMaterial map={tex} roughness={0.6} /> : <Flat color={card} />}
    </mesh>
    <group position={[0, 0.82, 0]}>{children}</group>
  </group>
);

const NURSE: Outfit = { skin: PALETTE.skin[1], hair: PALETTE.hair[1], top: "#7FD3C4", pants: "#7FD3C4", shoes: "#F4F4F4" };
const MOM: Outfit = { skin: PALETTE.skin[0], hair: PALETTE.hair[2], top: "#F2C14E", pants: "#3E5C8A", shoes: "#F4F4F4" };
export const MAX_CRIB: Vec3 = [0, 0, 0];

type Crib = { p: Vec3; look: BabyLook; seed: number };
const CRIBS: Crib[] = (() => {
  const r = rng(51);
  const out: Crib[] = [];
  for (let row = 0; row < 3; row++)
    for (let i = -3; i <= 3; i++) {
      const p: Vec3 = [i * 0.95, 0, -row * 1.35];
      const boy = r.next() < 0.75;
      out.push({ p, seed: r.int(1, 999), look: { cap: boy ? "#9FC6EE" : "#F4B8C8", blanket: boy ? r.pick(["#BFD3EE", "#9FB4C7", "#DDEFF7"]) : r.pick(["#F6D3DC", "#F2E6D0"]), skin: r.pick(PALETTE.skin) } });
    }
  return out;
})();

export const Nursery: React.FC<{ shot: ShotInfo; cam: CamFn; maxEyes?: (t: number) => number }> = ({ shot, cam, maxEyes }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const maxTex = useLabelTex([{ text: "MAX", color: "#1E1E24", size: 150, y: 128 }], "#FFD23F", 512, 256);
  const eyes = maxEyes ? maxEyes(t) : 0;
  return (
    <Stage preset="interior" bg="#E9E1D4" fog={["#E9E1D4", 14, 40]} sunDir={[-8, 12, 10]} sunIntensity={1.1} shadowCenter={[0, 0, -1]} shadowSize={6} aoRadius={0.3}
      env={["#F4EEE4", "#E9E2D6", "#9E8E7A"]} envIntensity={0.7} bloom={0.2}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.02} far={120} />
      {/* Raum */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]} receiveShadow><planeGeometry args={[16, 14]} /><Flat color="#D9C2A0" roughness={0.35} /></mesh>
      <Box size={[16, 3.4, 0.15]} color="#F6E7C8" position={[0, 1.7, -4.3]} bevel={0} />
      {[-1, 1].map((s) => <Box key={s} size={[0.15, 3.4, 14]} color="#E8F0E6" position={[s * 5.2, 1.7, -2]} bevel={0} />)}
      {/* Fenster mit Morgensonne */}
      {[-2.8, 0, 2.8].map((x) => (
        <group key={x} position={[x, 1.9, -4.2]}>
          <Box size={[2.0, 1.5, 0.05]} color="#FFF4DC" emissive="#FFE9C0" emissiveIntensity={0.8} cast={false} />
          <Box size={[2.1, 0.08, 0.1]} color="#FFFFFF" position={[0, 0.76, 0]} />
          <Box size={[2.1, 0.08, 0.1]} color="#FFFFFF" position={[0, -0.76, 0]} />
          <Box size={[0.06, 1.5, 0.1]} color="#FFFFFF" />
        </group>
      ))}
      {/* Wimpelkette */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh key={i} position={[-5 + i * 0.58, 3.0 - Math.sin((i / 17) * Math.PI) * 0.25, -4.1]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.14, 0.3, 3]} /><Flat color={["#9FC6EE", "#FFD23F", "#F4B8C8", "#7FD3C4"][i % 4]} />
        </mesh>
      ))}
      {/* Babybetten */}
      {CRIBS.map((cr, i) => {
        const isMax = cr.p[0] === MAX_CRIB[0] && cr.p[2] === MAX_CRIB[2];
        const look = isMax ? { cap: PALETTE.max.beanie, blanket: PALETTE.max.hoodie, skin: PALETTE.max.skin, max: true } : cr.look;
        return (
          <Bassinet key={i} position={cr.p} card={look.cap} tex={isMax ? maxTex : undefined}>
            <Baby look={look} rotationY={Math.PI} eyes={isMax ? eyes : (cr.seed % 5 === 0 ? 1 : 0)} smile={isMax && eyes > 0.6} wiggle={t * 3 + cr.seed} />
          </Bassinet>
        );
      })}
      {/* Pflegerinnen + Mutter */}
      <Character outfit={NURSE} hairLong={0.25} pose="walk" time={t} position={[-3.9 + (t % 20) * 0.5, 0, -1.9]} rotationY={Math.PI / 2} />
      <Character outfit={{ ...NURSE, hair: PALETTE.hair[3], skin: PALETTE.skin[3] }} hairLong={0.15} pose="carry" time={t} position={[3.6, 0, -0.6]} rotationY={-Math.PI / 2 + 0.3} />
      <Character outfit={MOM} hairLong={0.3} pose="idle" time={t} position={[2.4, 0, 1.2]} rotationY={Math.PI - 0.9} expression="happy" joints={{ headX: 0.45, lArmX: -0.5, rArmX: -0.5 }} />
      <pointLight position={[0, 2.6, 0.5]} intensity={3} distance={8} color="#FFF4E0" />
      <Particles kind="sparkle" n={60} box={[6, 2.5, 5]} center={[0, 1.6, -1]} time={t} velocity={[0.05, 0.04, 0.0]} sizeScale={0.5} opacity={0.6} seed={44} colors={["#FFF6D8", "#FFFFFF"]} />
    </Stage>
  );
};
