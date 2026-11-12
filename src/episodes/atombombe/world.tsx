// Szenen für „Was wäre, wenn eine Atombombe Berlin trifft?“
// Ein Weltmodell in Metern (x = Osten, z = Süden), Detonationspunkt über dem Alexanderplatz (0, H, 0).
//  Berlin   – Stadt, Spree, Tiergarten, Grunewald, Wahrzeichen, Pilzwolke, Druckwelle; Max auf dem Teufelsberg
//  Szenen werden nur über Kamera + Stimmung + Optionen unterschieden.
import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp, keys3, lerp, mixHex, shake, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glow, Max, Instanced, lumpyIco, SkyDome, SunGlow, Particles, ShockRing, DustWall, Airplane, Cloud, Tree, Bush, Rock,
  type Pose, type LightPreset,
} from "../../three/kit";
import { tau, shockR, fireR, cloudH, capR, DETONATION, MAX_DIST } from "./metric";

export type Cam = { pos: Vec3; look: Vec3; fov?: number };
export type CamFn = (c: { t: number; local: number; p: number }) => Cam;

/** Kamerafahrt a → b über die Shotdauer (Weltkoordinaten) */
export const move = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p }) => ({
  pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], p),
  look: keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la }], p),
  fov,
});

// ═════════════════════════ Geografie ═════════════════════════

export const GZ: Vec3 = [0, 0, 0]; // Bodennullpunkt (Alexanderplatz)
export const TOWER: Vec3 = [-250, 0, 150]; // Fernsehturm
export const GATE: Vec3 = [-2400, 0, 660]; // Brandenburger Tor
const DOM: Vec3 = [-900, 0, 260];
const REICHSTAG: Vec3 = [-2520, 0, 230];
/** Teufelsberg-Gipfel (80 m über der Stadt) */
export const TB: Vec3 = [-11_700, 80, 2_800];
const TB_ROT = Math.atan2(GZ[0] - TB[0], GZ[2] - TB[2]); // lokale +z zeigt zum Alexanderplatz

/** Teufelsberg-lokale Koordinaten (Max steht bei 0,0,0 und schaut nach +z = Stadt) → Welt */
export const tb = (v: Vec3): Vec3 => {
  const c = Math.cos(TB_ROT), s = Math.sin(TB_ROT);
  return [TB[0] + v[0] * c + v[2] * s, TB[1] + v[1], TB[2] - v[0] * s + v[2] * c];
};
/** Kamerafahrt in Teufelsberg-Koordinaten */
export const tbMove = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => {
  const m = move(a, b, la, lb, fov);
  return (c) => {
    const r = m(c);
    return { pos: tb(r.pos), look: tb(r.look), fov: r.fov };
  };
};

const SPREE: [number, number][] = [
  [9000, 4200], [5000, 2600], [2500, 1500], [800, 520], [-300, 330], [-1200, -60], [-2300, -180], [-3500, 260], [-5000, 40], [-6500, -700], [-9000, -1200], [-12000, -600],
];
const segDist = (x: number, z: number, a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const k = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - a[0] - k * dx, z - a[1] - k * dz);
};
const spreeDist = (x: number, z: number) => {
  let d = Infinity;
  for (let i = 0; i < SPREE.length - 1; i++) d = Math.min(d, segDist(x, z, SPREE[i], SPREE[i + 1]));
  return d;
};
const inTiergarten = (x: number, z: number) => x > -5200 && x < -2560 && z > 150 && z < 1250;
const inTempelhof = (x: number, z: number) => Math.hypot((x + 1300) / 1100, (z - 5400) / 800) < 1;
const inGrunewald = (x: number, z: number) => x < -9200 && z > -2500;

// ═════════════════════════ Stimmungen ═════════════════════════

export type Mood = "golden" | "fireball" | "smoke" | "cloud" | "ash";

type MoodSpec = {
  preset: LightPreset;
  top: string; horizon: string; bottom: string;
  fog: [string, number, number];
  sunDir: Vec3; sunIntensity: number;
  env?: [string, string, string]; envIntensity?: number;
  ground: string; city: string;
};

const SUN: Vec3 = [-60, 9, 30]; // tiefe Abendsonne im Westen

const MOODS: Record<Mood, MoodSpec> = {
  golden: {
    preset: "golden", top: "#5A76C4", horizon: "#FFB27A", bottom: "#D9A47C", fog: ["#F2B48A", 2500, 42000],
    sunDir: SUN, sunIntensity: 2.6, ground: "#6E8F52", city: "#A9A196",
  },
  fireball: {
    preset: "golden", top: "#7A86C8", horizon: "#FFD2A0", bottom: "#E8B890", fog: ["#FFD0A8", 3000, 48000],
    sunDir: SUN, sunIntensity: 2.2, env: ["#8A90C8", "#FFD8B0", "#6A5040"], envIntensity: 1.0, ground: "#728F55", city: "#ADA59A",
  },
  smoke: {
    preset: "golden", top: "#4A4A7A", horizon: "#E89A6A", bottom: "#8A6A58", fog: ["#C48A68", 2000, 36000],
    sunDir: SUN, sunIntensity: 2.0, env: ["#4A4A78", "#D89070", "#4A3A30"], envIntensity: 0.85, ground: "#667F4C", city: "#9A9086",
  },
  cloud: {
    preset: "golden", top: "#2E3A70", horizon: "#E58A6A", bottom: "#5A4A4E", fog: ["#9A6A68", 4000, 60000],
    sunDir: [-60, 5, 30], sunIntensity: 2.2, env: ["#33407A", "#D88A7A", "#3A2E30"], envIntensity: 0.8, ground: "#56683F", city: "#80766E",
  },
  ash: {
    preset: "overcast", top: "#2C2630", horizon: "#9A5A48", bottom: "#3A3030", fog: ["#6A4A44", 300, 20000],
    sunDir: [-60, 6, 30], sunIntensity: 1.1, env: ["#3A3038", "#9A6050", "#2A2224"], envIntensity: 0.6, ground: "#4E5A3A", city: "#6E645E",
  },
};

// ═════════════════════════ Stadt ═════════════════════════

type Bld = { x: number; z: number; w: number; d: number; h: number; c: string; ry: number; dist: number; burn: boolean; tilt: number };

const BERLIN_FACADE = ["#E6DCC8", "#D9C6A6", "#C8B9A6", "#EDE5D6", "#B9B1A6", "#D6A98A", "#C9CFD4", "#E3C7A1"];

function makeCity(): Bld[] {
  const r = rng(2026);
  const out: Bld[] = [];
  const add = (x: number, z: number, size: number, hMin: number, hMax: number) => {
    const dist = Math.hypot(x, z);
    if (inTiergarten(x, z) || inTempelhof(x, z) || inGrunewald(x, z)) return;
    if (spreeDist(x, z) < 45 + size * 0.4) return;
    // Plätze/Achsen frei: Pariser Platz + Unter den Linden, Straße des 17. Juni, Wahrzeichen
    if (x > -2440 && x < -900 && Math.abs(z - 660) < 40 + size * 0.5) return;
    if (Math.hypot(x - TOWER[0], z - TOWER[2]) < 120) return;
    if (Math.hypot(x - DOM[0], z - DOM[2]) < 110) return;
    if (Math.hypot(x - REICHSTAG[0], z - REICHSTAG[2]) < 130) return;
    if (Math.hypot(x - GATE[0], z - GATE[2]) < 120) return;
    const h = r.range(hMin, hMax) * (r.next() < 0.04 ? 2.4 : 1);
    out.push({
      x, z, w: size * r.range(0.7, 0.95), d: size * r.range(0.7, 0.95), h: Math.round(h / 3.2) * 3.2,
      c: r.pick(BERLIN_FACADE), ry: r.range(-0.08, 0.08), dist, burn: r.next() < 0.3, tilt: r.range(-1, 1),
    });
  };
  // Innenstadt: Berliner Blöcke (~90 m), dichte Traufhöhe 22 m
  const S1 = 115;
  for (let gx = -55; gx <= 55; gx++)
    for (let gz = -55; gz <= 55; gz++) {
      const x = gx * S1 + r.range(-12, 12), z = gz * S1 + r.range(-12, 12);
      const d = Math.hypot(x, z);
      if (d > 6000) continue;
      add(x, z, 92, d < 1500 ? 20 : 16, d < 1500 ? 32 : 26);
    }
  // Äußere Bezirke: lockerer, größere Blöcke
  const S2 = 330;
  for (let gx = -60; gx <= 60; gx++)
    for (let gz = -60; gz <= 60; gz++) {
      const x = gx * S2 + r.range(-60, 60), z = gz * S2 + r.range(-60, 60);
      const d = Math.hypot(x, z);
      if (d < 6000 || d > 17000) continue;
      if (r.next() < (d - 6000) / 16000) continue;
      add(x, z, d < 11000 ? 210 : 170, 10, d < 11000 ? 24 : 16);
    }
  // Hochhäuser am Alex
  out.push({ x: 160, z: -120, w: 40, d: 40, h: 125, c: "#E8E4DA", ry: 0.2, dist: 200, burn: false, tilt: 0.5 });
  out.push({ x: 380, z: 60, w: 30, d: 60, h: 64, c: "#C9CFD4", ry: 0.5, dist: 385, burn: true, tilt: -0.4 });
  return out;
}

/** Schadensstufe am Ort (0 = heil … 1 = platt) */
const severity = (d: number) => (d < 1900 ? 1 : d < 3600 ? 0.8 : d < 6200 ? 0.5 : d < 9500 ? 0.22 : 0.06);

const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);

/** Fassade eines Berliner Blocks: weiße Wand (wird pro Instanz eingefärbt), Fensterreihen, Ladenzone. `mask` = nur Fenster weiß (für Feuerschein). */
function facadeTexture(mask: boolean) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d")!;
  const r = rng(mask ? 5 : 4);
  g.fillStyle = mask ? "#000000" : "#FFFFFF";
  g.fillRect(0, 0, 512, 256);
  if (!mask) {
    // Gesims + Sockel
    g.fillStyle = "#D8D2C8"; g.fillRect(0, 0, 512, 10);
    g.fillStyle = "#BDB6AA"; g.fillRect(0, 222, 512, 34);
  }
  const rows = 6, cols = 16;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const wx = 8 + x * 31.5, wy = 20 + y * 33.5;
      if (mask) {
        const on = r.next() < 0.55;
        g.fillStyle = on ? `rgb(255,${Math.floor(r.range(140, 200))},${Math.floor(r.range(60, 110))})` : "#000000";
      } else {
        const v = Math.floor(r.range(52, 78));
        g.fillStyle = `rgb(${v},${v + 8},${v + 22})`;
      }
      g.fillRect(wx, wy, 15, 22);
    }
  // Läden im Erdgeschoss
  for (let x = 0; x < 6; x++) {
    g.fillStyle = mask ? (r.next() < 0.6 ? "#FFB060" : "#000000") : "#4A5462";
    g.fillRect(12 + x * 84, 226, 60, 26);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = mask ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

type CItem = { p: Vec3; r: Vec3; s: Vec3; c: string };

const CityMesh: React.FC<{ items: CItem[]; burning?: number; roof: string }> = ({ items, burning = 0, roof }) => {
  const ref = React.useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => facadeTexture(false), []);
  const mask = useMemo(() => facadeTexture(true), []);
  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, flatShading: true });
    if (burning > 0) { side.emissive = new THREE.Color("#FF5A1A"); side.emissiveMap = mask; side.emissiveIntensity = burning; }
    const top = new THREE.MeshStandardMaterial({ color: roof, roughness: 0.9, flatShading: true });
    if (burning > 0) { top.emissive = new THREE.Color("#5A1A08"); top.emissiveIntensity = burning * 0.6; }
    return [side, side, top, top, side, side];
  }, [tex, mask, burning > 0, roof]);
  mats[0].emissiveIntensity = burning;
  React.useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.p[0], it.p[1], it.p[2]);
      o.rotation.set(it.r[0], it.r[1], it.r[2]);
      o.scale.set(it.s[0], it.s[1], it.s[2]);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(it.c));
    });
    m.count = items.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[BOX, mats, items.length]} frustumCulled={false} />;
};

const City: React.FC<{ tauS: number; mood: MoodSpec }> = ({ tauS, mood }) => {
  const city = useMemo(makeCity, []);
  const R = shockR(tauS);
  const intact: CItem[] = [];
  const burning: CItem[] = [];
  const tint = new THREE.Color(mood.city);
  const ignite = tauS > 0.4 ? 3800 * clamp((tauS - 0.4) / 1.5) : 0;
  for (let i = 0; i < city.length; i++) {
    const b = city[i];
    const k = clamp((R - b.dist) / 160);
    const sev = severity(b.dist) * k;
    const h = b.h * (1 - 0.88 * sev);
    const col = new THREE.Color(b.c).multiply(tint).multiplyScalar(1.5).lerp(new THREE.Color("#4A3E36"), sev * 0.85);
    const tilt = sev * 0.12 * b.tilt;
    const item: CItem = { p: [b.x, 0, b.z], r: [tilt, b.ry, -tilt * 0.6], s: [b.w * (1 + sev * 0.25), Math.max(2, h), b.d * (1 + sev * 0.25)], c: "#" + col.getHexString() };
    if (b.burn && b.dist < ignite) burning.push({ ...item, c: "#" + col.clone().multiplyScalar(0.6).getHexString() });
    else intact.push(item);
  }
  return (
    <group>
      <CityMesh items={intact} roof={mixHex(mood.city, "#7A6A62", 0.5)} />
      <CityMesh items={burning} roof="#4A3A34" burning={1.6 + 0.6 * clamp(tauS / 30)} />
    </group>
  );
};

/** Wälder (Grunewald, Tiergarten) – instanzierte Kegelbäume, die sich in der Druckwelle wegbiegen */
type TreeI = { x: number; z: number; s: number; c: string; y: number };
function makeTrees(): TreeI[] {
  const r = rng(77);
  const out: TreeI[] = [];
  const hillY = (x: number, z: number) => hillHeight(Math.hypot(x - TB[0], z - TB[2]));
  for (let i = 0; i < 9000; i++) {
    const x = r.range(-17000, -9200), z = r.range(-2500, 9000);
    const dTB = Math.hypot(x - TB[0], z - TB[2]);
    if (dTB < 95) continue;
    out.push({ x, z, s: r.range(14, 24), c: r.pick(["#3E6E3A", "#4A7A40", "#355E34", "#56823E"]), y: hillY(x, z) });
  }
  for (let i = 0; i < 900; i++) {
    const x = r.range(-5200, -2560), z = r.range(150, 1250);
    if (Math.abs(z - 660) < 30) continue;
    out.push({ x, z, s: r.range(12, 20), c: r.pick(["#4A7A40", "#5A8A44", "#3E6E3A"]), y: 0 });
  }
  return out;
}
const CONE = new THREE.ConeGeometry(0.35, 1, 6).translate(0, 0.62, 0);

const Woods: React.FC<{ tauS: number; tint: string }> = ({ tauS, tint }) => {
  const trees = useMemo(makeTrees, []);
  const R = shockR(tauS);
  const tc = new THREE.Color(tint);
  const items = trees.map((tr) => {
    const d = Math.hypot(tr.x, tr.z);
    const k = clamp((R - d) / 200);
    const bend = k * (d < 9000 ? 1.2 : 0.35);
    const ang = Math.atan2(tr.x, tr.z);
    // vom Nullpunkt weg biegen
    const rx = Math.cos(ang) * bend, rz = -Math.sin(ang) * bend;
    const c = new THREE.Color(tr.c).multiply(tc).multiplyScalar(1.6);
    return { p: [tr.x, tr.y, tr.z] as Vec3, r: [rx, 0, rz] as Vec3, s: [tr.s, tr.s * 1.25, tr.s] as Vec3, c: "#" + c.getHexString() };
  });
  return <Instanced items={items} geometry={CONE} cast={false} />;
};

/** Spree als flaches Band */
const Spree: React.FC<{ color: string }> = ({ color }) => {
  const geo = useMemo(() => {
    const W = 55;
    const pos: number[] = [];
    for (let i = 0; i < SPREE.length - 1; i++) {
      const [ax, az] = SPREE[i], [bx, bz] = SPREE[i + 1];
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
      const nx = (-dz / l) * W, nz = (dx / l) * W;
      const q = [[ax + nx, az + nz], [ax - nx, az - nz], [bx - nx, bz - nz], [bx + nx, bz + nz]];
      const tri = (a: number[], b: number[], c: number[]) => pos.push(a[0], 0, a[1], b[0], 0, b[1], c[0], 0, c[1]);
      tri(q[0], q[2], q[1]); tri(q[0], q[3], q[2]);
      // runde Gelenke
      for (let k = 0; k < 10; k++) {
        const a0 = (k / 10) * Math.PI * 2, a1 = ((k + 1) / 10) * Math.PI * 2;
        tri([bx, bz], [bx + Math.cos(a1) * W, bz + Math.sin(a1) * W], [bx + Math.cos(a0) * W, bz + Math.sin(a0) * W]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, 0.6, 0]}>
      <meshStandardMaterial color={color} roughness={0.25} metalness={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ═════════════════════════ Wahrzeichen ═════════════════════════

/** Berliner Fernsehturm (368 m). `broken` 0..1 = abgeknickt/weg */
const Fernsehturm: React.FC<{ broken?: number; lightUp?: number }> = ({ broken = 0, lightUp = 0 }) => {
  const h = 1 - broken;
  if (h < 0.05) return <group position={TOWER}><mesh position={[0, 20, 0]}><cylinderGeometry args={[9, 16, 40, 12]} /><Flat color="#5A504A" /></mesh></group>;
  return (
    <group position={TOWER} rotation={[broken * 0.3, 0, broken * 0.2]}>
      {/* Schaft */}
      <mesh position={[0, 100, 0]}><cylinderGeometry args={[6.5, 16, 200, 16]} /><Flat color="#D8D4CC" roughness={0.6} /></mesh>
      <mesh position={[0, 230, 0]}><cylinderGeometry args={[4.6, 6.5, 60, 12]} /><Flat color="#D8D4CC" roughness={0.6} /></mesh>
      {/* Kugel */}
      <mesh position={[0, 213, 0]}><sphereGeometry args={[16, 32, 20]} /><meshStandardMaterial color="#B9C2CC" roughness={0.25} metalness={0.75} envMapIntensity={1.4} /></mesh>
      <mesh position={[0, 211, 0]}><cylinderGeometry args={[16.3, 16.3, 3, 32]} /><Flat color="#3B434D" emissive={lightUp > 0 ? "#FFB060" : undefined} emissiveIntensity={lightUp} /></mesh>
      {/* Antenne rot-weiß */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, 260 + i * 18 + 9, 0]}><cylinderGeometry args={[2.2 - i * 0.22, 2.4 - i * 0.22, 18, 8]} /><Flat color={i % 2 ? "#F2F0EA" : "#D8463C"} /></mesh>
      ))}
      {/* Fuß */}
      <mesh position={[0, 6, 0]}><cylinderGeometry args={[40, 46, 12, 6]} /><Flat color="#C9C4BA" /></mesh>
    </group>
  );
};

const Dom: React.FC = () => (
  <group position={DOM}>
    <Box size={[110, 34, 72]} color="#B8AC98" position={[0, 17, 0]} bevel={0} />
    <mesh position={[0, 48, 0]}><cylinderGeometry args={[18, 20, 16, 16]} /><Flat color="#B8AC98" /></mesh>
    <mesh position={[0, 56, 0]}><sphereGeometry args={[18, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><Flat color="#5E8C76" /></mesh>
    <mesh position={[0, 78, 0]}><cylinderGeometry args={[2.5, 3.5, 8, 8]} /><Flat color="#5E8C76" /></mesh>
    {[[-46, -28], [46, -28], [-46, 28], [46, 28]].map(([x, z], i) => (
      <group key={i} position={[x, 0, z]}>
        <Box size={[14, 46, 14]} color="#B8AC98" position={[0, 23, 0]} bevel={0} />
        <mesh position={[0, 50, 0]}><sphereGeometry args={[6.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><Flat color="#5E8C76" /></mesh>
      </group>
    ))}
  </group>
);

const Reichstag: React.FC = () => (
  <group position={REICHSTAG}>
    <Box size={[95, 30, 135]} color="#CDBF9F" position={[0, 15, 0]} bevel={0} />
    {[[-42, -62], [42, -62], [-42, 62], [42, 62]].map(([x, z], i) => <Box key={i} size={[18, 40, 18]} color="#C4B494" position={[x, 20, z]} bevel={0} />)}
    <mesh position={[0, 30, 0]}><sphereGeometry args={[20, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#BFD8E8" roughness={0.1} metalness={0.6} transparent opacity={0.75} /></mesh>
  </group>
);

/**
 * Brandenburger Tor (65 m breit, 26 m hoch). Front nach Osten (+x).
 * `hit` = Sekunden seit die Druckwelle durch ist (−1 = noch nicht).
 */
const Gate: React.FC<{ hit: number; t: number }> = ({ hit, t }) => {
  const SAND = "#E3D3B0", SAND2 = "#D2C09A", PATINA = "#4E8068";
  const h = Math.max(0, hit);
  const fly = (dx: number, dy: number, spin: number): { p: Vec3; r: Vec3 } => ({
    p: [-h * 26 * dx, dy * h * 6 - 4.9 * h * h * 0.6, (dx - 0.5) * h * 4],
    r: [h * spin, h * spin * 0.5, h * spin * 0.8],
  });
  const q = fly(1, 1.4, 1.8);
  const attic = fly(0.6, 0.8, 0.7);
  const colX = [-4.2, 4.2];
  const colZ = [-29, -18, -7, 7, 18, 29];
  return (
    <group position={GATE}>
      {/* Säulen */}
      {colX.map((x) => colZ.map((z, i) => {
        const lean = hit > 0 ? Math.min(0.18, h * 0.25) * (i % 2 ? 1 : 0.6) : 0;
        return (
          <mesh key={`${x}${z}`} position={[x, 7.5, z]} rotation={[0, 0, lean]}>
            <cylinderGeometry args={[0.85, 0.95, 15, 12]} />
            <Flat color={SAND} />
          </mesh>
        );
      }))}
      {/* Gebälk */}
      <Box size={[11, 4.2, 64]} color={SAND2} position={[0, 17.1, 0]} bevel={0.2} />
      <Box size={[11.6, 0.8, 65]} color={SAND} position={[0, 19.5, 0]} bevel={0.1} />
      {/* Attika + Quadriga (fliegt weg) */}
      <group position={[attic.p[0] * 0.6, attic.p[1] * 0.6, attic.p[2]]} rotation={hit > 0 ? [attic.r[0] * 0.3, 0, attic.r[2] * 0.3] : [0, 0, 0]}>
        <Box size={[9, 3.2, 40]} color={SAND2} position={[0, 21.5, 0]} bevel={0.15} />
        <Box size={[7, 1.6, 22]} color={SAND} position={[0, 23.9, 0]} bevel={0.1} />
      </group>
      <group position={[q.p[0], 27 + q.p[1], q.p[2]]} rotation={hit > 0 ? q.r : [0, 0, 0]}>
        <Box size={[3.5, 1.2, 5.5]} color={PATINA} position={[0, 0, 0]} bevel={0.1} />
        {[-2, -0.7, 0.7, 2].map((z, i) => <Box key={i} size={[3.2, 2.2, 0.8]} color={PATINA} position={[1.4, 1.5 + Math.sin(t * 3 + i) * 0.02, z]} bevel={0.15} />)}
        <Box size={[0.8, 3.4, 0.8]} color={PATINA} position={[-0.8, 2.2, 0]} bevel={0.1} />
      </group>
      {/* Seitenflügel */}
      {[-1, 1].map((s) => <Box key={s} size={[10, 11, 8]} color={SAND2} position={[-6, 5.5, s * 40]} bevel={0.15} />)}
      {/* Pariser Platz: Pflaster */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[60, 0.3, 0]}><planeGeometry args={[130, 120]} /><Flat color="#B9B2A6" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-200, 0.3, 0]}><planeGeometry args={[400, 36]} /><Flat color="#5A5F68" /></mesh>
    </group>
  );
};

// ═════════════════════════ Teufelsberg ═════════════════════════

/** Höhe des Teufelsbergs über der Ebene im Abstand d vom Gipfel */
function hillHeight(d: number) {
  if (d < 70) return 80;
  if (d > 720) return 0;
  const k = (d - 70) / 650;
  return 80 * (1 - k * k * (3 - 2 * k));
}

const Hill: React.FC<{ color: string }> = ({ color }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 30; i++) {
      const d = (i / 30) * 760;
      pts.push(new THREE.Vector2(d, hillHeight(d) - 0.35));
    }
    return new THREE.LatheGeometry(pts.reverse(), 64);
  }, []);
  return (
    <mesh geometry={geo} position={[TB[0], 0, TB[2]]} receiveShadow>
      <Flat color={color} />
    </mesh>
  );
};

/** Gipfel: Abhörstation mit Radarkuppeln, Mauerrest mit Graffiti, Büsche. Lokale Koordinaten (Max bei 0,0,0). */
const Summit: React.FC<{ ash: boolean; bend: number }> = ({ ash, bend }) => {
  const W = ash ? "#C8C0B8" : "#F2F0EA";
  const C = ash ? "#8A847E" : "#A8A49C";
  return (
    <group>
      {/* Plateau */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -20]} receiveShadow>
        <circleGeometry args={[75, 40]} />
        <Flat color={ash ? "#6E6A5A" : "#8E9A62"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -38]} receiveShadow>
        <planeGeometry args={[70, 30]} />
        <Flat color={ash ? "#5E5A56" : "#9C968C"} />
      </mesh>
      {/* Gebäude + Türme */}
      <Box size={[52, 11, 18]} color={C} position={[0, 5.5, -52]} />
      <Box size={[14, 7, 18]} color="#7A8AA0" position={[-22, 14.5, -52]} />
      {/* Graffiti-Bänder */}
      {[["#E2473F", -14], ["#F2C14E", -2], ["#3D7DD8", 10], ["#9A5FD0", 19]].map(([c, x], i) => (
        <Box key={i} size={[8, 3.2, 0.2]} color={c as string} position={[x as number, 3, -42.9]} bevel={0} cast={false} />
      ))}
      <mesh position={[-12, 22, -50]} castShadow><cylinderGeometry args={[4.5, 5, 22, 14]} /><Flat color={C} /></mesh>
      <mesh position={[-12, 39, -50]} castShadow><sphereGeometry args={[8.5, 24, 16]} /><Flat color={W} roughness={0.5} /></mesh>
      <mesh position={[14, 17, -56]} castShadow><cylinderGeometry args={[3.5, 4, 12, 12]} /><Flat color={C} /></mesh>
      <mesh position={[14, 28, -56]} castShadow><sphereGeometry args={[6.5, 20, 14]} /><Flat color={W} roughness={0.5} /></mesh>
      <mesh position={[4, 14, -48]} castShadow><sphereGeometry args={[4.2, 18, 12]} /><Flat color={W} roughness={0.5} /></mesh>
      {/* Mauerrest vor Max (Deckung) */}
      <Box size={[7, 1.15, 0.35]} color="#B4AEA4" position={[0.4, 0.575, 2.5]} />
      <Box size={[2.2, 0.7, 0.36]} color="#3FAE6B" position={[-1.6, 0.6, 2.5]} bevel={0.05} cast={false} />
      <Box size={[1.6, 0.5, 0.36]} color="#E2473F" position={[1.8, 0.55, 2.5]} bevel={0.05} cast={false} />
      {/* Geländer zur Stadt */}
      {Array.from({ length: 9 }).map((_, i) => <Box key={i} size={[0.07, 1.0, 0.07]} color="#5A6068" position={[-9 + i * 2.2, 0.5, 6.5]} bevel={0} />)}
      <Box size={[18, 0.07, 0.07]} color="#5A6068" position={[-0.2, 1.0, 6.5]} bevel={0} />
      {/* Vegetation */}
      {([[-6, 7, 1.4], [7, 9, 1.6], [-14, -4, 1.8], [12, -10, 1.5], [-22, 4, 1.9], [20, 3, 1.6], [-30, -20, 2.0], [28, -24, 1.8]] as [number, number, number][]).map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} rotation={[-bend * (0.7 + (i % 3) * 0.2), 0, 0]}>
          <Tree seed={i + 5} scale={s} kind={ash ? "bare" : "round"} />
        </group>
      ))}
      {[[-3.5, 4.2], [4.5, 4.6], [-8, 2], [9, 1.5]].map(([x, z], i) => <Bush key={i} position={[x, 0, z]} seed={i + 20} scale={0.9} color={ash ? "#6A6A50" : undefined} />)}
      {[[2.8, 1.2], [-4.2, -2.5], [5.5, -6]].map(([x, z], i) => <Rock key={i} position={[x, 0, z]} scale={0.5} seed={i + 3} />)}
    </group>
  );
};

// ═════════════════════════ Pilzwolke ═════════════════════════

type Puff = { a: number; r: number; y: number; s: number; geo: THREE.BufferGeometry; v: number };

const Mushroom: React.FC<{ tauS: number; t: number; sunLit?: boolean }> = ({ tauS, t, sunLit = true }) => {
  const puffs = useMemo(() => {
    const g = rng(91);
    const mk = (n: number, seedOff: number): Puff[] =>
      Array.from({ length: n }).map((_, i) => ({ a: g.range(0, Math.PI * 2), r: g.range(0, 1), y: g.range(0, 1), s: g.range(0.75, 1.25), geo: lumpyIco(1, 2, 0.2, seedOff + i), v: g.range(-1, 1) }));
    return { ring: mk(30, 300), top: mk(14, 400), stem: mk(18, 500), skirt: mk(36, 600) };
  }, []);
  if (tauS <= 0) return null;
  const H = cloudH(tauS);
  const fr = fireR(tauS);
  const cr = capR(tauS);
  // Glühen: weiß → orange → rot → Rauch
  const heat = Math.exp(-tauS / 18);
  const white = clamp(1 - tauS / 0.6);
  const core = mixHex(mixHex("#FF6A24", "#FFC27A", clamp(heat * 1.2)), "#FFFFFF", white);
  const smokeBase = sunLit ? "#D2A89A" : "#8A7670";
  const capCol = mixHex(smokeBase, "#FF8A40", clamp(heat * 1.4));
  const capEm = mixHex("#000000", "#FF5A1A", clamp(heat * 1.1));
  const stemCol = mixHex("#B09078", "#C8784A", clamp(heat));
  const capOn = clamp((tauS - 0.9) / 1.5);
  const stemOn = clamp((tauS - 2) / 6);
  const skirtOn = clamp((tauS - 1.5) / 3);
  const fireballVis = clamp(1 - (tauS - 6) / 30);
  const roll = t * 0.12;
  return (
    <group>
      {/* Feuerball */}
      {fireballVis > 0.01 && (
        <group position={[0, H, 0]}>
          <mesh scale={fr * (1 - capOn * 0.25)}>
            <icosahedronGeometry args={[1, 4]} />
            <meshBasicMaterial color={core} toneMapped={false} fog={false} transparent opacity={fireballVis} />
          </mesh>
          {[1.12, 1.3, 1.6].map((k, i) => (
            <mesh key={i} scale={fr * k}>
              <icosahedronGeometry args={[1, 3]} />
              <Glow color={i === 0 ? "#FFE2B0" : i === 1 ? "#FFB060" : "#FF7A3A"} opacity={(0.45 - i * 0.12) * (0.4 + heat * 0.6) * fireballVis} />
            </mesh>
          ))}
          <SunGlow position={[0, 0, 0]} size={fr * (3.2 + white * 3)} color={white > 0.2 ? "#FFFFFF" : "#FFC890"} opacity={0.35 + white * 0.4} />
        </group>
      )}
      {/* Pilzhut: Ringwulst + Kuppe */}
      {capOn > 0.01 &&
        puffs.ring.map((p, i) => {
          const a = p.a + roll * 0.2;
          const tor = cr * 0.62;
          const sub = p.y * Math.PI * 2 + roll;
          const rr = tor + Math.cos(sub) * cr * 0.22;
          const yy = H + Math.sin(sub) * cr * 0.2 - cr * 0.05;
          return (
            <mesh key={`r${i}`} geometry={p.geo} position={[Math.cos(a) * rr, yy, Math.sin(a) * rr]} scale={cr * 0.36 * p.s * capOn}>
              <meshStandardMaterial color={capCol} emissive={capEm} emissiveIntensity={1.2} roughness={1} />
            </mesh>
          );
        })}
      {capOn > 0.01 &&
        puffs.top.map((p, i) => {
          const rr = p.r * cr * 0.45;
          return (
            <mesh key={`t${i}`} geometry={p.geo} position={[Math.cos(p.a) * rr, H + cr * (0.18 + p.y * 0.2), Math.sin(p.a) * rr]} scale={cr * 0.4 * p.s * capOn}>
              <meshStandardMaterial color={capCol} emissive={capEm} emissiveIntensity={0.9} roughness={1} />
            </mesh>
          );
        })}
      {/* Stiel */}
      {stemOn > 0.01 &&
        puffs.stem.map((p, i) => {
          const f = (i + 0.5) / puffs.stem.length;
          const top = H - cr * 0.25;
          const y = f * top * stemOn;
          const rad = lerp(cr * 0.28, cr * 0.13, f);
          const wob = Math.sin(t * 0.6 + i * 1.7) * rad * 0.1;
          return (
            <mesh key={`s${i}`} geometry={p.geo} position={[Math.cos(p.a) * rad * 0.3 + wob, y, Math.sin(p.a) * rad * 0.3]} scale={[rad * p.s, Math.max(rad, (top / puffs.stem.length) * 0.9), rad * p.s]}>
              <meshStandardMaterial color={stemCol} emissive={capEm} emissiveIntensity={0.4 * (1 - f)} roughness={1} />
            </mesh>
          );
        })}
      {/* Staubrock am Boden */}
      {skirtOn > 0.01 &&
        puffs.skirt.map((p, i) => {
          const R = Math.min(shockR(tauS) * 0.55, 2600) * (0.55 + p.r * 0.45);
          const s = (160 + Math.min(tauS, 60) * 6) * p.s * skirtOn;
          return (
            <mesh key={`k${i}`} geometry={p.geo} position={[Math.cos(p.a) * R, s * 0.4, Math.sin(p.a) * R]} scale={[s * 1.4, s * 0.8, s * 1.4]}>
              <meshStandardMaterial color="#9A7C64" flatShading roughness={1} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Wolke wird vom Wind nach Osten gezogen (für die Fernsicht) */
const Plume: React.FC<{ tauS: number }> = ({ tauS }) => {
  const puffs = useMemo(() => {
    const g = rng(55);
    return Array.from({ length: 34 }).map((_, i) => ({ f: i / 33, dz: g.range(-1, 1), dy: g.range(-1, 1), s: g.range(0.7, 1.3), geo: lumpyIco(1, 1, 0.25, 700 + i) }));
  }, []);
  const H = cloudH(tauS);
  const cr = capR(tauS);
  const L = 4000 + tauS * 45;
  return (
    <group>
      {puffs.map((p, i) => {
        const x = p.f * L;
        const w = cr * (0.55 + p.f * 0.9);
        return (
          <mesh key={i} geometry={p.geo} position={[x, H - p.f * 2500 + p.dy * w * 0.15, p.dz * w * 0.5]} scale={[w * 0.6 * p.s, w * 0.28 * p.s, w * 0.5 * p.s]}>
            <meshStandardMaterial color={mixHex("#A08478", "#8A7A74", p.f)} flatShading roughness={1} transparent opacity={1 - p.f * 0.55} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Ringförmige Staubwalze der Druckwelle */
const ShockFront: React.FC<{ tauS: number; t: number; maxR?: number }> = ({ tauS, t, maxR = 16000 }) => {
  const geo = useMemo(() => lumpyIco(1, 1, 0.28, 88), []);
  const R = shockR(tauS);
  if (R < 300 || R > maxR) return null;
  const n = 320;
  const s = 40 + R * 0.012;
  const items = Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.01;
    const jit = Math.sin(i * 78.233) * 0.5 + 0.5;
    const rr = R - s * (0.2 + jit * 0.9);
    const sc = s * (0.9 + jit * 0.6) * (1 + Math.sin(t * 2 + i) * 0.04);
    const shade = 0.85 + jit * 0.25;
    const c = new THREE.Color("#B49478").multiplyScalar(shade);
    return { p: [Math.cos(a) * rr, sc * 0.45, Math.sin(a) * rr] as Vec3, r: [i, i * 0.7, 0] as Vec3, s: [sc * 1.5, sc, sc * 1.2] as Vec3, c: "#" + c.getHexString() };
  });
  return (
    <group>
      <Instanced items={items} geometry={geo} cast={false} />
      <ShockRing radius={R * 1.003} width={0.012} color="#FFF2DE" opacity={0.35} />
    </group>
  );
};

// ═════════════════════════ Szene ═════════════════════════

export type MaxSpec = {
  pose: Pose | ((t: number) => Pose);
  /** 0 = steht, 1 = liegt flach (Kopf Richtung Mauer) */
  lie?: (t: number) => number;
  rotY?: number;
  pos?: Vec3;
  expr?: "neutral" | "happy" | "shock";
  hold?: "phone";
  phoneGlow?: (t: number) => number;
};

type BerlinProps = {
  shot: ShotInfo;
  mood: Mood;
  cam: CamFn;
  max?: MaxSpec;
  /** Teufelsberg-Details (Bäume, Mauer) – nur für Nahaufnahmen */
  summit?: boolean;
  shakeAmp?: number | ((t: number) => number);
  plane?: boolean;
  plume?: boolean;
  /** lokale Staubwand (Teufelsberg-Koordinaten), rollt über Max */
  localBlast?: boolean;
  gate?: boolean;
  noFog?: boolean;
  far?: number;
};

export const Berlin: React.FC<BerlinProps> = ({ shot, mood, cam, max, summit = false, shakeAmp = 0, plane = false, plume = false, localBlast = false, gate = false, noFog = false, far = 250000 }) => {
  const { t, local, p } = useTimes(shot);
  const m = MOODS[mood];
  const ts = tau(t);
  const c = cam({ t, local, p });
  const amp = typeof shakeAmp === "function" ? shakeAmp(t) : shakeAmp;
  const sh = shake(t, amp, 17);
  const pos: Vec3 = [c.pos[0] + sh[0], c.pos[1] + sh[1], c.pos[2] + sh[2]];
  const look: Vec3 = [c.look[0] + sh[0] * 0.5, c.look[1] + sh[1] * 0.5, c.look[2]];

  // Lichtblitz: Videozeit-basiert, damit er kurz bleibt
  const since = t - DETONATION;
  const flash = since >= 0 ? Math.pow(clamp(1 - since / 1.4), 1.6) : 0;
  const H = cloudH(ts);
  const fireLight = ts > 0 ? 6 * Math.exp(-ts / 1.2) + 2.2 * Math.exp(-ts / 25) + 0.25 : 0;
  const top = mixHex(m.top, "#FFF6EA", flash * 0.85);
  const hor = mixHex(m.horizon, "#FFFFFF", flash * 0.9);
  const fog: [string, number, number] = [mixHex(m.fog[0], "#FFF4E6", flash * 0.8), m.fog[1], m.fog[2]];

  // Max-Bereich: Druckwelle trifft bei MAX_DIST
  const R = shockR(ts);
  const blastK = clamp((R - MAX_DIST) / 400); // 0 → 1 kurz nach dem Eintreffen
  const sinceHit = R > MAX_DIST ? (R - MAX_DIST) / 343 : -1;
  const summitBend = mood === "ash" ? 0.12 : localBlast ? clamp(blastK * 1.3) * (0.55 + Math.sin(t * 11) * 0.1) * clamp(1 - Math.max(0, sinceHit - 6) / 8) : 0;

  const ash = mood === "ash";
  const gateHit = gate ? (R - Math.hypot(GATE[0], GATE[2])) / 343 : -1;
  const maxWorld = tb(max?.pos ?? [0, 0, 0]);

  return (
    <Stage preset={m.preset} bg={top} fog={noFog ? null : fog} sunDir={m.sunDir} sunIntensity={m.sunIntensity * (1 - flash * 0.5)} env={m.env} envIntensity={m.envIntensity}
      logDepth shadows={!!summit} shadowCenter={maxWorld} shadowSize={16} ao={0} bloom={0.45}>
      <Camera pos={pos} look={look} fov={c.fov ?? 45} near={summit ? 0.1 : 5} far={far} />
      <SkyDome top={top} horizon={hor} bottom={m.bottom} radius={far * 0.8} center={[pos[0], 0, pos[2]]} sun={mood === "ash" ? undefined : m.sunDir} sunColor="#FFD2A0" haze={1} />

      {/* Boden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[600000, 600000]} />
        <Flat color={m.ground} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <circleGeometry args={[17500, 96]} />
        <Flat color={mixHex(m.city, "#6E6A64", 0.35)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(-5200 - 2560) / 2, 0.1, 700]}>
        <planeGeometry args={[2640, 1100]} />
        <Flat color={mixHex(m.ground, "#4A6A3A", 0.3)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1300, 0.1, 5400]} scale={[1100, 800, 1]}>
        <circleGeometry args={[1, 40]} />
        <Flat color={mixHex(m.ground, "#A8B070", 0.4)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-13100, 0.05, 3250]}>
        <planeGeometry args={[7800, 11500]} />
        <Flat color={mixHex(m.ground, "#2E4A2A", 0.45)} />
      </mesh>
      <Spree color={ash ? "#3A3A44" : mood === "golden" ? "#5A7AA8" : "#6A7090"} />
      <Hill color={mixHex(m.ground, "#3E5A34", 0.2)} />

      <City tauS={ts} mood={m} />
      <Woods tauS={ts} tint={ash ? "#8A8070" : "#FFFFFF"} />
      <Fernsehturm broken={ts > 0.6 ? 1 : 0} />
      <Dom />
      <Reichstag />
      {gate ? <Gate hit={gateHit} t={t} /> : <Gate hit={-1} t={t} />}

      {/* Explosion */}
      <Mushroom tauS={ts} t={t} sunLit={mood !== "ash"} />
      {plume && <Plume tauS={ts} />}
      <ShockFront tauS={ts} t={t} />
      {ts > 0 && <pointLight position={[0, H, 0]} intensity={fireLight} distance={0} decay={0} color={ts < 0.5 ? "#FFF2E0" : "#FFB070"} />}
      {ts > 0 && ts < 40 && <SunGlow position={[0, H, 0]} size={fireR(ts) * 5 * (0.5 + flash)} color="#FFE0B8" opacity={0.2 + flash * 0.5} />}

      {/* Flugzeug als Größenvergleich */}
      {plane && (
        <group position={[-6400 + (t - 23.4) * 1100, 10500, 5200]}>
          <Airplane scale={14} rotationY={Math.PI / 2} />
          <mesh position={[-1800, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[12, 30, 3400, 8, 1, true]} /><Glow color="#FFFFFF" opacity={0.5} additive={false} /></mesh>
        </group>
      )}

      {/* Wolken am Abendhimmel */}
      {!ash && [[-20000, 3200, -14000], [8000, 2800, -22000], [-30000, 3000, 9000], [20000, 3400, 15000]].map((cp, i) => (
        <Cloud key={i} position={cp as Vec3} scale={[2600, 500, 1600]} seed={i + 3} color={mood === "cloud" ? "#C89A9A" : "#FFE2CC"} opacity={0.9} />
      ))}

      {/* Teufelsberg: Max + Details */}
      <group position={TB} rotation={[0, TB_ROT, 0]}>
        {summit && <Summit ash={ash} bend={summitBend} />}
        {max && <MaxActor spec={max} t={t} />}
        {localBlast && sinceHit > -3 && (
          <>
            <group position={[0, 0, lerp(260, -120, clamp((sinceHit + 3) / 4.2))]} rotation={[0, Math.PI, 0]}>
              <DustWall width={900} height={110} time={t} color="#A8866A" />
            </group>
            {sinceHit > 0 && (
              <>
                <Particles kind="debris" n={220} box={[60, 14, 80]} center={[0, 5, 0]} time={t} velocity={[1.5, 2, -46]} stretch={2} sizeScale={1.4} seed={12} />
                <Particles kind="dust" n={380} box={[50, 12, 60]} center={[0, 4, 0]} time={t} velocity={[1, 0.5, -34]} sizeScale={5} colors={["#B8966E", "#9A7C5E", "#D2B48E"]} seed={13} opacity={clamp(1 - (sinceHit - 3) / 4)} />
              </>
            )}
          </>
        )}
        {ash && <Particles kind="snow" n={500} box={[30, 16, 30]} center={[0, 6, 0]} time={t} velocity={[0.2, -0.8, -0.4]} sizeScale={1.3} colors={["#B8B2AC", "#8E8882", "#D2CCC6"]} seed={14} />}
        {!ash && summit && ts === 0 && <Particles kind="dust" n={90} box={[20, 6, 20]} center={[0, 2, 0]} time={t} velocity={[0.15, 0.05, 0.1]} sizeScale={1.4} colors={["#FFE6C0", "#FFD8A8"]} seed={8} />}
      </group>

      {/* Staub auf dem Pariser Platz */}
      {gate && gateHit > -1.2 && (
        <group position={[GATE[0] - gateHit * 300, 0, GATE[2]]} rotation={[0, Math.PI / 2, 0]}>
          <DustWall width={700} height={75} time={t} color="#B8946E" seed={9} />
        </group>
      )}
      {gate && gateHit > 0 && (
        <group position={GATE}>
          <Particles kind="debris" n={140} box={[160, 40, 120]} center={[-60, 15, 0]} time={t} velocity={[-60, 3, 0]} stretch={2} sizeScale={2.6} seed={21} opacity={clamp(1 - gateHit / 3)} />
        </group>
      )}
    </Stage>
  );
};

const MaxActor: React.FC<{ spec: MaxSpec; t: number }> = ({ spec, t }) => {
  const pose = typeof spec.pose === "function" ? spec.pose(t) : spec.pose;
  const lie = spec.lie ? spec.lie(t) : 0;
  const glow = spec.phoneGlow ? spec.phoneGlow(t) : 0;
  const p = spec.pos ?? [0, 0, 0];
  return (
    <group position={[p[0], p[1] + lie * 0.22, p[2]]} rotation={[0, spec.rotY ?? 0, 0]}>
      <group rotation={[lie * Math.PI / 2, 0, 0]}>
        <Max pose={pose} time={t} expression={spec.expr} hold={spec.hold} />
      </group>
      {glow > 0 && <pointLight position={[0, 1.4, 0.55]} intensity={glow * 3} distance={2.5} decay={2} color="#FF3A2A" />}
    </group>
  );
};
