import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";
import { Flat } from "./materials";
import { Instanced, lumpyIco, type Inst } from "./Instances";

/** Flacher Boden (Gras, Sand, Asphalt …) */
export const Ground: React.FC<{ color?: string; size?: number; y?: number; map?: THREE.Texture }> = ({ color = PALETTE.grass, size = 2000, y = 0, map }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
    <planeGeometry args={[size, size]} />
    <Flat color={color} map={map} />
  </mesh>
);

/** Rasen mit Mähstreifen (wie im Garten-Look) als Textur */
export function useStripedGrass(stripes = 24, a = PALETTE.grass, b = PALETTE.grassDark) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 512;
    const g = c.getContext("2d")!;
    for (let i = 0; i < stripes; i++) {
      g.fillStyle = i % 2 ? a : b;
      g.fillRect(0, (i * 512) / stripes, 512, 512 / stripes + 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    return t;
  }, [stripes, a, b]);
}

export const Tree: React.FC<{ position?: Vec3; scale?: number; seed?: number; kind?: "round" | "pine" | "bare" }> = ({ position = [0, 0, 0], scale = 1, seed = 1, kind = "round" }) => {
  const r = rng(seed);
  const leaf = r.pick(PALETTE.leaf);
  const geos = useMemo(
    () => [0, 1, 2].map((i) => lumpyIco(1, 1, 0.18, seed * 3 + i)),
    [seed]
  );
  if (kind === "pine")
    return (
      <group position={position} scale={scale}>
        <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, 1.2, 6]} /><Flat color={PALETTE.trunk} /></mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 1.6 + i * 0.9, 0]} castShadow receiveShadow>
            <coneGeometry args={[1.3 - i * 0.32, 1.6, 7]} />
            <Flat color={leaf} />
          </mesh>
        ))}
      </group>
    );
  if (kind === "bare")
    return (
      <group position={position} scale={scale}>
        <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.08, 0.16, 3, 5]} /><Flat color={PALETTE.trunk} /></mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.7) * 0.4, 2.2 + i * 0.25, Math.sin(i * 1.7) * 0.4]} rotation={[Math.sin(i) * 0.8, i, Math.cos(i * 1.7) * 0.9]} castShadow>
            <cylinderGeometry args={[0.03, 0.06, 1.2, 4]} />
            <Flat color={PALETTE.trunk} />
          </mesh>
        ))}
      </group>
    );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.13, 0.2, 1.8, 6]} /><Flat color={PALETTE.trunk} /></mesh>
      <mesh geometry={geos[0]} position={[0, 2.4, 0]} scale={1.25} castShadow receiveShadow><Flat color={leaf} /></mesh>
      <mesh geometry={geos[1]} position={[0.7, 2.0, 0.2]} scale={0.85} castShadow receiveShadow><Flat color={leaf} /></mesh>
      <mesh geometry={geos[2]} position={[-0.55, 2.1, -0.35]} scale={0.8} castShadow receiveShadow><Flat color={leaf} /></mesh>
    </group>
  );
};

export const Bush: React.FC<{ position?: Vec3; scale?: number; seed?: number; color?: string }> = ({ position = [0, 0, 0], scale = 1, seed = 2, color }) => {
  const g = useMemo(() => lumpyIco(0.6, 1, 0.2, seed), [seed]);
  return (
    <mesh geometry={g} position={[position[0], position[1] + 0.35 * scale, position[2]]} scale={[scale * 1.3, scale * 0.8, scale]} castShadow receiveShadow>
      <Flat color={color ?? rng(seed).pick(PALETTE.leaf)} />
    </mesh>
  );
};

export const Rock: React.FC<{ position?: Vec3; scale?: number | Vec3; seed?: number; color?: string }> = ({ position = [0, 0, 0], scale = 1, seed = 3, color }) => {
  const g = useMemo(() => lumpyIco(0.5, 0, 0.3, seed), [seed]);
  const r = rng(seed);
  return (
    <mesh geometry={g} position={position} scale={scale as any} rotation={[r.range(0, 3), r.range(0, 3), r.range(0, 3)]} castShadow receiveShadow>
      <Flat color={color ?? r.pick(PALETTE.rock)} />
    </mesh>
  );
};

/** Verstreute Felsen/Trümmer (instanziert) */
export const Rubble: React.FC<{ n: number; area: [number, number]; center?: Vec3; size?: [number, number]; seed?: number; colors?: readonly string[] }> = ({
  n, area, center = [0, 0, 0], size = [0.1, 0.4], seed = 5, colors = PALETTE.rock,
}) => {
  const geo = useMemo(() => lumpyIco(0.5, 0, 0.3, seed), [seed]);
  const items = useMemo<Inst[]>(() => {
    const r = rng(seed);
    return Array.from({ length: n }).map(() => {
      const s = r.range(size[0], size[1]);
      return { p: [center[0] + r.range(-area[0] / 2, area[0] / 2), center[1] + s * 0.3, center[2] + r.range(-area[1] / 2, area[1] / 2)], r: [r.range(0, 3), r.range(0, 3), r.range(0, 3)], s: [s, s * r.range(0.6, 1), s], c: r.pick(colors) };
    });
  }, [n, area[0], area[1], center[0], center[1], center[2], seed]);
  return <Instanced items={items} geometry={geo} />;
};

/** Hohe Gras-Halme (für Schrumpf-Szenen: Gras wird Dschungel) */
export const GrassBlades: React.FC<{ n: number; area: [number, number]; center?: Vec3; height?: [number, number]; seed?: number }> = ({
  n, area, center = [0, 0, 0], height = [0.08, 0.2], seed = 7,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.012, 1, 3, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const items = useMemo<Inst[]>(() => {
    const r = rng(seed);
    return Array.from({ length: n }).map(() => {
      const h = r.range(height[0], height[1]);
      return { p: [center[0] + r.range(-area[0] / 2, area[0] / 2), center[1], center[2] + r.range(-area[1] / 2, area[1] / 2)], r: [r.range(-0.25, 0.25), r.range(0, 6), r.range(-0.25, 0.25)], s: [h * 1.4, h, h * 1.4], c: r.pick(PALETTE.leaf) };
    });
  }, [n, area[0], area[1], seed, height[0], height[1]]);
  return <Instanced items={items} geometry={geo} />;
};

/** Wald/Park: viele Bäume verstreut */
export const Forest: React.FC<{ n: number; area: [number, number]; center?: Vec3; seed?: number; keepClear?: number; kind?: "round" | "pine" }> = ({
  n, area, center = [0, 0, 0], seed = 11, keepClear = 0, kind = "round",
}) => {
  const r = rng(seed);
  const trees: { p: Vec3; s: number; seed: number }[] = [];
  let guard = 0;
  while (trees.length < n && guard++ < n * 10) {
    const x = r.range(-area[0] / 2, area[0] / 2), z = r.range(-area[1] / 2, area[1] / 2);
    if (Math.hypot(x, z) < keepClear) continue;
    trees.push({ p: [center[0] + x, center[1], center[2] + z], s: r.range(0.8, 1.5), seed: r.int(1, 999) });
  }
  return <group>{trees.map((t, i) => <Tree key={i} position={t.p} scale={t.s} seed={t.seed} kind={kind} />)}</group>;
};
