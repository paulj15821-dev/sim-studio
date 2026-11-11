import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";
import { Flat } from "./materials";
import { Instanced, lumpyIco, type Inst } from "./Instances";

/** Bakterium (Kapsel). Länge ~ 4× Radius */
export const Bacterium: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; color?: string }> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, color = PALETTE.bacteria[0] }) => (
  <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
    <capsuleGeometry args={[0.5, 1.6, 6, 12]} />
    <Flat color={color} roughness={0.5} />
  </mesh>
);

/** Viele Bakterien, langsam treibend */
export const BacteriaSwarm: React.FC<{ n: number; area: Vec3; center?: Vec3; size?: [number, number]; time?: number; seed?: number }> = ({ n, area, center = [0, 0, 0], size = [0.3, 0.9], time = 0, seed = 31 }) => {
  const geo = useMemo(() => new THREE.CapsuleGeometry(0.5, 1.6, 4, 10), []);
  const base = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }).map(() => ({
      p: [r.range(-0.5, 0.5) * area[0], r.range(-0.5, 0.5) * area[1], r.range(-0.5, 0.5) * area[2]] as Vec3,
      r: [r.range(0, 6), r.range(0, 6), r.range(0, 6)] as Vec3,
      s: r.range(size[0], size[1]),
      c: r.pick(PALETTE.bacteria),
      ph: r.range(0, 6),
    }));
  }, [n, seed, area[0], area[1], area[2]]);
  const items: Inst[] = base.map((b) => ({
    p: [center[0] + b.p[0] + Math.sin(time * 0.4 + b.ph) * 0.4, center[1] + b.p[1] + Math.cos(time * 0.3 + b.ph) * 0.3, center[2] + b.p[2]],
    r: [b.r[0] + time * 0.15, b.r[1], b.r[2] + time * 0.1],
    s: b.s,
    c: b.c,
  }));
  return <Instanced items={items} geometry={geo} />;
};

/** Bakteriophage / Virus */
export const Virus: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number; color?: string }> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, color = PALETTE.virus }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 1.6, 0]} castShadow><icosahedronGeometry args={[0.6, 0]} /><Flat color={color} roughness={0.3} metalness={0.2} /></mesh>
    <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.12, 0.12, 1.2, 8]} /><Flat color={color} /></mesh>
    {Array.from({ length: 6 }).map((_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45]} rotation={[Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.1, 4]} />
          <Flat color={color} />
        </mesh>
      );
    })}
  </group>
);

/** Stachelige Kugel (Pollen, Coronavirus-artig) */
export const SpikyBall: React.FC<{ position?: Vec3; scale?: number; color?: string; seed?: number }> = ({ position = [0, 0, 0], scale = 1, color = PALETTE.pollen, seed = 2 }) => {
  const core = useMemo(() => lumpyIco(1, 2, 0.05, seed), [seed]);
  const spikes = useMemo<Inst[]>(() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const seen = new Set<string>();
    const out: Inst[] = [];
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
      const k = v.toArray().map((x) => x.toFixed(2)).join();
      if (seen.has(k)) continue;
      seen.add(k);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
      const e = new THREE.Euler().setFromQuaternion(q);
      out.push({ p: [v.x * 1.15, v.y * 1.15, v.z * 1.15], r: [e.x, e.y, e.z], s: [0.12, 0.45, 0.12], c: color });
    }
    return out;
  }, [color]);
  const cone = useMemo(() => new THREE.ConeGeometry(1, 1, 5), []);
  return (
    <group position={position} scale={scale}>
      <mesh geometry={core} castShadow><Flat color={color} /></mesh>
      <Instanced items={spikes} geometry={cone} />
    </group>
  );
};

/** Wassermoleküle (H2O) als Feld */
export const MoleculeField: React.FC<{ n: number; area: Vec3; center?: Vec3; size?: number; time?: number; seed?: number }> = ({ n, area, center = [0, 0, 0], size = 0.3, time = 0, seed = 41 }) => {
  const sph = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const base = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }).map(() => ({
      p: [r.range(-0.5, 0.5) * area[0], r.range(-0.5, 0.5) * area[1], r.range(-0.5, 0.5) * area[2]] as Vec3,
      a: r.range(0, 6.28), b: r.range(0, 6.28), ph: r.range(0, 6.28),
    }));
  }, [n, seed, area[0], area[1], area[2]]);
  const items: Inst[] = [];
  for (const m of base) {
    const jit = (i: number) => Math.sin(time * 6 + m.ph + i * 2) * size * 0.25;
    const o: Vec3 = [center[0] + m.p[0] + jit(0), center[1] + m.p[1] + jit(1), center[2] + m.p[2] + jit(2)];
    items.push({ p: o, s: size, c: PALETTE.atomO });
    const a = m.a + time * 0.8;
    for (const off of [-0.95, 0.95]) {
      const d: Vec3 = [Math.cos(a + off) * Math.cos(m.b), Math.sin(m.b), Math.sin(a + off) * Math.cos(m.b)];
      items.push({ p: [o[0] + d[0] * size * 1.05, o[1] + d[1] * size * 1.05, o[2] + d[2] * size * 1.05], s: size * 0.62, c: PALETTE.atomH });
    }
  }
  return <Instanced items={items} geometry={sph} />;
};

/** Atomgitter (Kristall) als Boden oder Wand */
export const AtomLattice: React.FC<{ nx: number; nz: number; ny?: number; spacing?: number; radius?: number; center?: Vec3; colors?: string[] }> = ({
  nx, nz, ny = 1, spacing = 1, radius = 0.45, center = [0, 0, 0], colors = ["#9FE3C8", "#7FC9B2"],
}) => {
  const sph = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const items = useMemo<Inst[]>(() => {
    const out: Inst[] = [];
    for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++)
      out.push({ p: [center[0] + (x - nx / 2) * spacing, center[1] - y * spacing, center[2] + (z - nz / 2) * spacing], s: radius, c: colors[(x + z + y) % colors.length] });
    return out;
  }, [nx, nz, ny, spacing, radius, center[0], center[1], center[2]]);
  return <Instanced items={items} geometry={sph} />;
};

/** Zelle (z. B. rotes Blutkörperchen = abgeflacht) */
export const Cell: React.FC<{ position?: Vec3; scale?: number | Vec3; color?: string; seed?: number; flat?: boolean }> = ({ position = [0, 0, 0], scale = 1, color = "#D9473F", seed = 5, flat = false }) => {
  const g = useMemo(() => lumpyIco(1, 2, 0.06, seed), [seed]);
  const s: Vec3 = typeof scale === "number" ? [scale, scale * (flat ? 0.4 : 1), scale] : scale;
  return (
    <mesh geometry={g} position={position} scale={s} castShadow receiveShadow>
      <Flat color={color} roughness={0.6} />
    </mesh>
  );
};
