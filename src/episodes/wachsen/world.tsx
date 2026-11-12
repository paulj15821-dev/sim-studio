// Welt für „Was wäre, wenn du nie aufhörst zu wachsen?“
// Ein einziger Ort (Max' Bungalow am Stadtrand), Max steht bei (0,0,0) und schaut nach +z.
// Trick gegen riesige Zahlen: Die ganze Welt ist in Metern gebaut, wird aber mit 1/K skaliert
// (K = Max' Maßstab) → in Szeneneinheiten ist Max immer ~2 hoch. Schatten, Nebel, Partikel,
// Kamera-Nahebene bleiben dadurch bei 1,8 m genauso gut wie bei 30 km.
import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE, COLOR } from "../../style/theme";
import { clamp, colorStops, shake, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glass, Max, Person, Crowd, Building, House, Road, Tree, Bush, Car, CityGrid, useAerialTexture,
  SkyDome, CloudLayer, Cloud, Airplane, Particles, Rubble, Bed, Table, Shelf, type Pose, type Joints, type LightPreset,
} from "../../three/kit";
import { H, K, CEILING, ROOF, TV_TOWER, PLANE_ALT, T_BONK } from "./metric";

export type Cam = { pos: Vec3; look: Vec3; fov?: number; roll?: number };
export type CamFn = (c: { t: number; local: number; p: number; h: number }) => Cam;

const sm = (a: number, b: number, x: number) => { const v = clamp((x - a) / (b - a)); return v * v * (3 - 2 * v); };
const SUN: Vec3 = [50, 45, 60];

// ───────────── Himmel nach Höhe der Kamera ─────────────
const skyTop = (alt: number) =>
  colorStops([{ at: 0, c: "#78BDF0" }, { at: 3000, c: "#5FA6E8" }, { at: 9000, c: "#3F7BD0" }, { at: 15000, c: "#2A56A8" }, { at: 30000, c: "#14245A" }], alt);
const skyHorizon = (alt: number) =>
  colorStops([{ at: 0, c: "#DCEEF7" }, { at: 4000, c: "#CDE5F5" }, { at: 12000, c: "#B2D2F0" }, { at: 30000, c: "#86A9DC" }], alt);

// ═════════════════════════ Max' Bungalow ═════════════════════════

const HW = 5, HD = 4; // halbe Breite/Tiefe des Hauses
const NX = 8, NZ = 6; // Dachplatten
const WALL = "#F2E6D0";

/** Halbe Körperbreite von Max in Höhe y (Meter), wenn er h groß ist */
const bodyHalf = (y: number, h: number) => {
  const f = y / h;
  if (f > 1) return 0;
  if (f > 0.77) return 0.1 * h; // Kopf + Mütze
  if (f > 0.45) return 0.2 * h; // Schultern + Arme
  return 0.115 * h; // Beine
};

type Tile = { x: number; z: number; d: number; tb: number; v: Vec3; spin: Vec3 };
function useTiles() {
  return useMemo(() => {
    const r = rng(77);
    const tw = (2 * HW) / NX, td = (2 * HD) / NZ;
    const tiles: Tile[] = [];
    for (let i = 0; i < NX; i++)
      for (let k = 0; k < NZ; k++) {
        const x = -HW + (i + 0.5) * tw, z = -HD + (k + 0.5) * td;
        const dx = Math.max(0, Math.abs(x) - tw / 2), dz = Math.max(0, Math.abs(z) - td / 2);
        const d = Math.hypot(dx, dz);
        // Bruchzeit: Max' Körper wird in Dachhöhe breiter als der Abstand zur Platte
        let tb = Infinity;
        for (let t = 0; t < 14; t += 0.01) if (bodyHalf(ROOF, H(t)) > d + 0.02) { tb = t; break; }
        const a = Math.atan2(z, x) + r.range(-0.4, 0.4);
        const out = r.range(2.5, 6);
        tiles.push({ x, z, d, tb, v: [Math.cos(a) * out, r.range(4, 8), Math.sin(a) * out], spin: [r.range(-6, 6), r.range(-4, 4), r.range(-6, 6)] });
      }
    return { tiles, tw, td };
  }, []);
}

/** Bungalow mit Flachdach (Decke innen 2,5 m, Dach außen 2,7 m). Dachplatten brechen, wenn Max durchwächst. */
const MaxHouse: React.FC<{ t: number; h: number; interior?: boolean }> = ({ t, h, interior }) => {
  const { tiles, tw, td } = useTiles();
  return (
    <group>
      {/* Boden */}
      <Box size={[2 * HW, 0.15, 2 * HD]} color="#C9A27A" position={[0, 0.075, 0]} />
      {/* Wände */}
      <Box size={[2 * HW, CEILING, 0.25]} color={WALL} position={[0, CEILING / 2, -HD]} />
      <Box size={[0.25, CEILING, 2 * HD]} color={WALL} position={[-HW, CEILING / 2, 0]} />
      <Box size={[0.25, CEILING, 2 * HD]} color={WALL} position={[HW, CEILING / 2, 0]} />
      <Box size={[4, CEILING, 0.25]} color={WALL} position={[-3, CEILING / 2, HD]} />
      <Box size={[5, CEILING, 0.25]} color={WALL} position={[2.5, CEILING / 2, HD]} />
      <Box size={[1, 0.4, 0.25]} color={WALL} position={[-0.5, 2.3, HD]} />
      <Box size={[0.95, 2.1, 0.08]} color="#6B4A35" position={[-0.5, 1.05, HD + 0.1]} />
      {/* Fenster vorne */}
      {[1.2, 3.6].map((x) => (
        <group key={x} position={[x, 1.45, HD + 0.13]}>
          <Box size={[1.5, 1.05, 0.04]} color="#8FB6D4" roughness={0.15} metalness={0.4} cast={false} />
          <Box size={[1.62, 0.08, 0.08]} color="#FFFFFF" position={[0, 0.55, 0.02]} cast={false} />
          <Box size={[1.62, 0.08, 0.08]} color="#FFFFFF" position={[0, -0.55, 0.02]} cast={false} />
          <Box size={[0.06, 1.1, 0.08]} color="#FFFFFF" position={[0, 0, 0.02]} cast={false} />
        </group>
      ))}
      {/* Dachplatten (oben grau, unten weiße Decke) */}
      {tiles.map((p, i) => {
        let pos: Vec3 = [p.x, CEILING + 0.1, p.z];
        let rot: Vec3 = [0, 0, 0];
        if (t >= p.tb) {
          const dt = t - p.tb;
          pos = [p.x + p.v[0] * dt, CEILING + 0.1 + p.v[1] * dt - 4.9 * dt * dt, p.z + p.v[2] * dt];
          rot = [p.spin[0] * dt, p.spin[1] * dt, p.spin[2] * dt];
          if (pos[1] < -2) return null;
        } else if (p.d < 0.05 && h > CEILING) {
          pos = [p.x, CEILING + 0.1 + (h - CEILING), p.z]; // Kopf drückt die Decke hoch
          rot = [Math.sin(i) * 0.08 * (h - CEILING) * 4, 0, Math.cos(i) * 0.08 * (h - CEILING) * 4];
        }
        return (
          <group key={i} position={pos} rotation={rot}>
            <Box size={[tw - 0.02, 0.15, td - 0.02]} color="#8E8A84" position={[0, 0.025, 0]} bevel={0.05} />
            <Box size={[tw - 0.02, 0.05, td - 0.02]} color="#F4F1EC" position={[0, -0.075, 0]} bevel={0} cast={false} />
          </group>
        );
      })}
      {/* Attika */}
      {t < 1.5 && (
        <>
          <Box size={[2 * HW + 0.3, 0.3, 0.25]} color={WALL} position={[0, ROOF + 0.15, HD]} />
          <Box size={[2 * HW + 0.3, 0.3, 0.25]} color={WALL} position={[0, ROOF + 0.15, -HD]} />
          <Box size={[0.25, 0.3, 2 * HD]} color={WALL} position={[HW, ROOF + 0.15, 0]} />
          <Box size={[0.25, 0.3, 2 * HD]} color={WALL} position={[-HW, ROOF + 0.15, 0]} />
        </>
      )}
      {/* Einrichtung (nur fürs Zimmer) */}
      {interior && (
        <>
          <Bed position={[-3.2, 0.15, -2.6]} rotationY={Math.PI / 2} sheet="#BFD3EE" />
          <Table position={[3.4, 0.15, -3.2]} />
          <Box size={[0.6, 0.4, 0.05]} color="#2B3036" position={[3.4, 1.15, -3.45]} roughness={0.3} />
          <Shelf position={[4.6, 0.15, 0.5]} width={1.8} />
          <Box size={[2, 0.02, 1.4]} color="#3FAE6B" position={[0.2, 0.16, 0.6]} cast={false} bevel={0} />
          {/* Türrahmen mit Bleistift-Strichen (Körpergröße) */}
          <group position={[-HW + 0.14, 0, 2.2]}>
            <Box size={[0.06, 2.2, 0.12]} color="#E8DCC8" position={[0, 1.1, 0]} cast={false} />
            {[1.0, 1.2, 1.38, 1.55, 1.68, 1.78].map((y, i) => (
              <Box key={i} size={[0.012, 0.012, 0.1]} color="#2F3B4C" position={[0.035, y, 0]} cast={false} bevel={0} />
            ))}
          </group>
          {/* Poster */}
          <Box size={[0.03, 0.9, 0.65]} color={COLOR.accent} position={[-HW + 0.14, 1.6, -1.2]} cast={false} />
        </>
      )}
    </group>
  );
};

// ═════════════════════════ Umgebung ═════════════════════════

/** Fernsehturm 368 m: Schaft, Kugel bei 205 m, Antenne */
const TvTower: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 100, 0]} castShadow><cylinderGeometry args={[5, 9, 200, 14]} /><Flat color="#D9D6CF" /></mesh>
    <mesh position={[0, 220, 0]} castShadow><cylinderGeometry args={[4, 5, 40, 12]} /><Flat color="#D9D6CF" /></mesh>
    <mesh position={[0, 212, 0]} castShadow><sphereGeometry args={[16, 18, 12]} /><Flat color="#B9C0C8" metalness={0.5} roughness={0.35} /></mesh>
    <mesh position={[0, 212, 0]}><torusGeometry args={[16.2, 0.9, 6, 24]} /><Flat color="#E2473F" /></mesh>
    <mesh position={[0, 295, 0]}><cylinderGeometry args={[1.6, 3, 110, 8]} /><Flat color="#E8E4DC" /></mesh>
    {[255, 290, 325].map((y) => (
      <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[2.6, 2.6, 6, 8]} /><Flat color="#E2473F" /></mesh>
    ))}
    <mesh position={[0, TV_TOWER - 8, 0]}><cylinderGeometry args={[0.5, 1, 16, 6]} /><Flat color="#E2473F" /></mesh>
  </group>
);

/** Berge in der Ferne (für die Everest-Höhe) */
const Mountains: React.FC = () => {
  const list = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 18 }).map(() => {
      const a = r.range(-Math.PI * 0.95, -Math.PI * 0.05) + (r.next() < 0.3 ? Math.PI : 0);
      const d = r.range(28000, 70000);
      const hgt = r.range(2400, 4600);
      return { p: [Math.cos(a) * d, 0, Math.sin(a) * d] as Vec3, h: hgt, r: hgt * r.range(1.3, 1.9), rot: r.range(0, 3) };
    });
  }, []);
  return (
    <group>
      {list.map((m, i) => (
        <group key={i} position={m.p} rotation={[0, m.rot, 0]}>
          <mesh position={[0, m.h / 2, 0]}><coneGeometry args={[m.r, m.h, 7]} /><Flat color={i % 2 ? "#8C8A8E" : "#7D7C84"} /></mesh>
          <mesh position={[0, m.h * 0.85, 0]}><coneGeometry args={[m.r * 0.155, m.h * 0.3, 7]} /><Flat color={PALETTE.snow} /></mesh>
        </group>
      ))}
    </group>
  );
};

/** Bürohochhaus direkt vor Max, Innenraum im 10. Stock (Boden 32 m). Kamera steht im Raum. */
export const OFFICE_FLOOR = 32;
const OFFICE_Z = 12; // Fassade
const Office: React.FC<{ t: number; S: number }> = ({ t, S }) => {
  const y0 = OFFICE_FLOOR, fh = 3.6, z = OFFICE_Z;
  const fac = "#9FB4C7";
  return (
    <group>
      <Building position={[0, 0, z + 10]} size={[20, 48, 20]} color={fac} seed={5} />
      {/* Innenraum */}
      <group position={[0, y0, 0]}>
        <Box size={[20, 0.3, 9]} color="#B8B2A8" position={[0, -0.15, z + 4.5]} cast={false} />
        <Box size={[20, 0.3, 9]} color="#ECEAE6" position={[0, fh + 0.15, z + 4.5]} cast={false} />
        <Box size={[20, fh, 0.2]} color="#E9E4DC" position={[0, fh / 2, z + 8.5]} />
        <Box size={[0.2, fh, 9]} color="#E9E4DC" position={[-4.2, fh / 2, z + 4.5]} />
        <Box size={[0.2, fh, 9]} color="#E9E4DC" position={[4.2, fh / 2, z + 4.5]} />
        {/* Fassade mit großem Fenster */}
        <Box size={[7.6, fh, 0.3]} color={fac} position={[-6.4, fh / 2, z]} />
        <Box size={[7.6, fh, 0.3]} color={fac} position={[6.4, fh / 2, z]} />
        <Box size={[5.2, 0.6, 0.3]} color={fac} position={[0, 0.3, z]} />
        <Box size={[5.2, 0.25, 0.3]} color={fac} position={[0, fh - 0.125, z]} />
        <mesh position={[0, 0.6 + (fh - 0.85) / 2, z + 0.05]}><planeGeometry args={[5.2, fh - 0.85]} /><Glass opacity={0.12} /></mesh>
        <Box size={[0.08, fh - 0.85, 0.12]} color="#3B434D" position={[0, 0.6 + (fh - 0.85) / 2, z + 0.1]} />
        {/* Schreibtisch, Monitor, Pflanze, Kollege */}
        <Table position={[1.6, 0, z + 2.2]} size={[1.8, 0.75, 0.9]} color="#E6E2DA" />
        <Box size={[0.7, 0.45, 0.05]} color="#1E2228" position={[1.6, 1.05, z + 2.4]} roughness={0.3} />
        <Box size={[0.66, 0.4, 0.01]} color="#BDEFFF" emissive="#8FE3FF" emissiveIntensity={0.6} position={[1.6, 1.05, z + 2.37]} cast={false} bevel={0} />
        <mesh position={[-2.8, 0.35, z + 1.2]} castShadow><cylinderGeometry args={[0.25, 0.2, 0.7, 8]} /><Flat color="#C97B5B" /></mesh>
        <Bush position={[-2.8, 0.55, z + 1.2]} scale={0.9} seed={8} color="#4FA35A" />
        <Person seed={31} pose="shock" expression="shock" time={t} position={[1.3, 0, z + 3.4]} rotationY={Math.PI - 0.25} />
        <pointLight position={[0, fh - 0.4, z + 4]} intensity={6 * S * S} distance={12 * S} decay={2} color="#FFF4E0" />
      </group>
    </group>
  );
};

/** Vogelschwarm: kreist um `center`, flatternde V-Formen (2,5 m Spannweite) */
const Flock: React.FC<{ t: number; center: Vec3; radius: number }> = ({ t, center, radius }) => {
  const birds = useMemo(() => {
    const r = rng(44);
    return Array.from({ length: 16 }).map(() => ({ a: r.range(0, 6.28), rr: r.range(0.3, 1), y: r.range(-0.35, 0.35), w: r.range(0.5, 0.8) * r.sign(), ph: r.range(0, 6.28) }));
  }, []);
  return (
    <group position={center}>
      {birds.map((b, i) => {
        const a = b.a + t * b.w;
        const x = Math.cos(a) * radius * b.rr, z = Math.sin(a) * radius * b.rr, y = b.y * radius + Math.sin(t * 2 + b.ph) * radius * 0.06;
        const flap = Math.sin(t * 11 + b.ph) * 0.6;
        return (
          <group key={i} position={[x, y, z]} rotation={[0, -a + (b.w > 0 ? 0 : Math.PI), 0]}>
            <Box size={[0.25, 0.22, 0.7]} color="#F4F4F4" cast={false} bevel={0} />
            <group rotation={[0, 0, flap]}><Box size={[1.2, 0.06, 0.4]} color="#3B434D" position={[0.65, 0, 0]} cast={false} bevel={0} /></group>
            <group rotation={[0, 0, -flap]}><Box size={[1.2, 0.06, 0.4]} color="#3B434D" position={[-0.65, 0, 0]} cast={false} bevel={0} /></group>
          </group>
        );
      })}
    </group>
  );
};

// ═════════════════════════ Szene ═════════════════════════

export type Scene = {
  shot: ShotInfo;
  cam: CamFn;
  pose?: Pose | ((t: number) => Pose);
  expression?: "neutral" | "happy" | "shock" | ((t: number) => "neutral" | "happy" | "shock");
  joints?: (t: number) => Partial<Joints>;
  maxRotY?: number;
  /** Zimmer (Innenansicht) */
  interior?: boolean;
  office?: boolean;
  /** Nachbarn auf der Straße */
  crowd?: boolean;
  /** Menschen laufen in der Nähe der Kamera weg (Schuh-Shot) */
  runners?: Vec3;
  birds?: boolean;
  snow?: boolean;
  plane?: boolean;
  /** Kamerawackeln (Meter) als Funktion der Zeit */
  shakeAmp?: (t: number, h: number) => number;
  preset?: LightPreset;
  /** Schattenbereich (Szeneneinheiten = Max-Höhen/2) */
  shadowSize?: number;
  /** Zusätzliche Objekte (Meter) */
  extra?: (t: number, h: number) => React.ReactNode;
  /** Flugzeug-Maßstab (Lesbarkeit) */
  planeScale?: number;
};

/** Flugzeug: fliegt auf Reiseflughöhe über Max' Kopf – bis sein Kopf von unten dagegenstößt. Danach liegt es auf der Mütze. */
export const planeState = (t: number, h: number): { pos: Vec3; rot: Vec3 } => {
  const dt = t - T_BONK;
  if (dt < 0) return { pos: [240 * dt, PLANE_ALT, 0], rot: [0, Math.PI / 2, 0] };
  const bounce = Math.abs(Math.sin(dt * 7)) * 260 * Math.exp(-dt * 2.4);
  return { pos: [60 + 40 * (1 - Math.exp(-dt * 3)), h + 4 + bounce, 0], rot: [0.25 * Math.exp(-dt), Math.PI / 2 + dt * 0.5, 0.35 + Math.sin(dt * 9) * 0.5 * Math.exp(-dt * 1.5)] };
};

export const World: React.FC<Scene> = ({
  shot, cam, pose = "idle", expression = "neutral", joints, maxRotY = 0, interior, office, crowd, runners, birds, snow, plane, shakeAmp, preset, shadowSize = 7, extra, planeScale = 3,
}) => {
  const { t, local, p } = useTimes(shot);
  const h = H(t), k = K(t), S = 1 / k;
  const aerial = useAerialTexture(5, 0.1);
  const c = cam({ t, local, p, h });
  const amp = shakeAmp ? shakeAmp(t, h) : 0;
  const sh = shake(t, amp, 15);
  const camM: Vec3 = [c.pos[0] + sh[0], c.pos[1] + sh[1], c.pos[2] + sh[2]];
  const alt = Math.max(0, camM[1]);
  const ps = typeof pose === "function" ? pose(t) : pose;
  const ex = typeof expression === "function" ? expression(t) : expression;
  const shadows = !interior && h < 160;
  const fogNear = 400 + alt * 1.2 + h * 2, fogFar = 6000 + alt * 10 + h * 14;
  const sky = skyTop(alt), hor = skyHorizon(alt);
  const pl = plane ? planeState(t, h) : null;

  return (
    <Stage
      preset={preset ?? (interior ? "interior" : "day")}
      bg={sky}
      fog={interior ? null : [hor, fogNear * S, fogFar * S]}
      sunDir={SUN}
      shadows={shadows}
      shadowSize={shadowSize}
      shadowCenter={[0, 1, 0]}
      logDepth
    >
      <Camera pos={[camM[0] * S, camM[1] * S, camM[2] * S]} look={[c.look[0] * S, c.look[1] * S, c.look[2] * S]} fov={c.fov ?? 45} roll={c.roll ?? 0} near={0.0015} far={3_000_000 * S + 50} />
      <SkyDome top={sky} horizon={hor} radius={2_000_000 * S} sun={SUN} haze={1 - sm(8000, 30000, alt) * 0.7} />
      <group scale={S}>
        {/* Boden: Detail nah, Luftbild bis 20 km, darum herum Land bis zum Horizont (Ring → kein Z-Fighting) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
          <planeGeometry args={[40000, 40000]} />
          <meshStandardMaterial map={aerial} roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[19990, 900000, 64, 1]} />
          <Flat color="#93B871" />
        </mesh>
        {h < 2500 && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
            <planeGeometry args={[700, 700]} />
            <Flat color={PALETTE.grass} />
          </mesh>
        )}
        {h < 3000 && <Suburb t={t} h={h} crowd={crowd} />}
        {h < 6000 && <CityGrid blocks={5} blockSize={50} road={14} seed={9} heights={[14, 34]} downtown={1.5} position={[0, 0, -330]} />}
        {h < 6000 && <TvTower position={[-170, 0, -110]} />}
        {h > 60 && h < 4000 && <Rubble n={60} area={[h * 0.6, h * 0.5]} center={[0, 0, 0.1 * h]} size={[0.6, 2.5]} seed={4} colors={[WALL, "#8E8A84", "#C9A27A"]} />}
        {h < 30 && <MaxHouse t={t} h={h} interior={interior} />}
        {office && <Office t={t} S={S} />}
        {runners && <Crowd n={9} seed={3} area={[22, 10]} center={runners} time={local} walkDir={0.2} walkSpeed={3.4} />}
        {h > 300 && <Mountains />}
        {h > 400 && <CloudLayer n={70} y={2000} area={36000} scale={[180, 520]} seed={21} />}
        {h > 400 && <CloudLayer n={24} y={2050} area={6000} scale={[120, 260]} seed={23} clearRadius={0.1 * h} />}
        {birds && <Flock t={t} center={[camM[0] * 0.62, camM[1] * 0.62 + 0.86 * h * 0.38, camM[2] * 0.62]} radius={0.07 * h} />}
        {extra?.(t, h)}
        {pl && (
          <group position={pl.pos} rotation={pl.rot}>
            <Airplane scale={planeScale} />
          </group>
        )}
        <Max pose={ps} time={t} position={[0, 0, 0]} rotationY={maxRotY} expression={ex} joints={joints?.(t)} scale={k} />
      </group>
      {/* Partikel in Szeneneinheiten (Max ≈ 2 hoch) */}
      {snow && <Particles kind="snow" n={320} box={[3, 2, 3]} center={[0.5, 1.75, 0.9]} time={t} velocity={[0.5, -0.3, 0.15]} sizeScale={0.45} seed={6} />}
      {interior && <Particles kind="dust" n={120} box={[3, 1.6, 3]} center={[0, 1.6, 0.4]} time={t} velocity={[0.02, -0.25, 0]} opacity={sm(1.15, 1.25, t)} seed={3} />}
    </Stage>
  );
};

/** Straße, Nachbarhäuser, Bäume, Autos, Nachbarn, Hochhäuser am Stadtrand */
const Suburb: React.FC<{ t: number; h: number; crowd?: boolean }> = ({ t, h, crowd }) => {
  const near = h < 70;
  return (
    <group>
      <Road length={900} width={7} position={[0, 0, 14]} rotationY={Math.PI / 2} />
      {near && [-34, -18, 18, 34].map((x, i) => <House key={x} position={[x, 0, -1]} seed={i + 11} scale={0.72} />)}
      {[-40, -22, -4, 14, 32].map((x, i) => <House key={x} position={[x, 0, 30]} rotationY={Math.PI} seed={i + 21} scale={0.72} />)}
      {[-56, -45, -12, 9, 26, 46, 58].map((x, i) => <Tree key={"a" + x} position={[x, 0, 8.2]} seed={i + 3} scale={2.3} />)}
      {[-50, -30, -12, 6, 24, 42].map((x, i) => <Tree key={"b" + x} position={[x, 0, 20.5]} seed={i + 30} scale={2.3} />)}
      {/* Autos: fahren an und bremsen ab, weil alle hochschauen */}
      {[0, 1, 2].map((i) => {
        const x0 = -70 + i * 36, v = 9;
        const x = x0 + v * 2.2 * (1 - Math.exp(-t / 2.2));
        return <Car key={i} seed={i + 4} position={[x, 0, 12.4]} rotationY={Math.PI / 2} wheelSpin={x * 2.6} />;
      })}
      {[0, 1].map((i) => {
        const x0 = 60 - i * 40, v = 8;
        const x = x0 - v * 2 * (1 - Math.exp(-t / 2));
        return <Car key={"r" + i} seed={i + 9} position={[x, 0, 15.6]} rotationY={-Math.PI / 2} wheelSpin={-x * 2.6} />;
      })}
      {crowd && <Crowd n={12} seed={6} area={[26, 3]} center={[2, 0.1, 18.4]} pose={h > 9 ? "shock" : "lookUp"} time={t} faceTo={[0, 0, 0]} />}
      {/* Hochhäuser am Stadtrand (Vergleich „bis zur Hüfte“) */}
      {[[-70, -60, 38], [-48, -95, 44], [62, -70, 36], [88, -40, 30], [40, -110, 42], [-100, -30, 28]].map(([x, z, hh], i) => (
        <Building key={i} position={[x, 0, z]} size={[18, hh, 18]} seed={i + 50} />
      ))}
    </group>
  );
};

