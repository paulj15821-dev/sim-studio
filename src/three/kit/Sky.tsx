import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";
import { Flat } from "./materials";
import { Instanced, lumpyIco, type Inst } from "./Instances";

/** Himmelskuppel mit Verlauf (oben → Horizont). Folgt der Kamera nicht – groß genug wählen. */
export const SkyDome: React.FC<{ top: string; horizon: string; bottom?: string; radius?: number; center?: Vec3 }> = ({ top, horizon, bottom, radius = 4000, center = [0, 0, 0] }) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 32, 16);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const cols: number[] = [];
    const cTop = new THREE.Color(top), cHor = new THREE.Color(horizon), cBot = new THREE.Color(bottom ?? horizon);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / radius;
      const c = y >= 0 ? cHor.clone().lerp(cTop, Math.pow(y, 0.6)) : cHor.clone().lerp(cBot, Math.min(1, -y * 3));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    return g;
  }, [top, horizon, bottom, radius]);
  return (
    <mesh geometry={geo} position={center}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

/** Eine Low-poly-Wolke aus mehreren Kugeln */
export const Cloud: React.FC<{ position?: Vec3; scale?: number | Vec3; seed?: number; color?: string; opacity?: number }> = ({ position = [0, 0, 0], scale = 1, seed = 1, color = PALETTE.cloud, opacity = 1 }) => {
  const parts = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 6 }).map((_, i) => ({
      g: lumpyIco(1, 1, 0.12, seed * 7 + i),
      p: [r.range(-1.6, 1.6), r.range(-0.2, 0.5), r.range(-0.8, 0.8)] as Vec3,
      s: r.range(0.7, 1.3) * (i === 0 ? 1.4 : 1),
    }));
  }, [seed]);
  return (
    <group position={position} scale={scale as any}>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.g} position={p.p} scale={[p.s * 1.2, p.s * 0.75, p.s]} castShadow={opacity >= 1} receiveShadow>
          <Flat color={color} opacity={opacity} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

/** Wolkenschicht: viele Wolken in einer Höhe verteilt. */
export const CloudLayer: React.FC<{ n: number; y: number; area: number; scale?: [number, number]; seed?: number; center?: Vec3; clearRadius?: number }> = ({
  n, y, area, scale = [20, 60], seed = 21, center = [0, 0, 0], clearRadius = 0,
}) => {
  const list = useMemo(() => {
    const r = rng(seed);
    const out: { p: Vec3; s: number; seed: number }[] = [];
    let g = 0;
    while (out.length < n && g++ < n * 10) {
      const x = r.range(-area / 2, area / 2), z = r.range(-area / 2, area / 2);
      if (Math.hypot(x, z) < clearRadius) continue;
      out.push({ p: [center[0] + x, r.range(-0.15, 0.15) * scale[1], center[2] + z], s: r.range(scale[0], scale[1]), seed: r.int(1, 99) });
    }
    return out;
  }, [n, area, seed, scale[0], scale[1], clearRadius, center[0], center[2]]);
  return <group position={[0, y, 0]}>{list.map((c, i) => <Cloud key={i} position={c.p} scale={c.s} seed={c.seed} />)}</group>;
};

/** Sterne als Punkte auf einer großen Kugel */
export const Stars: React.FC<{ n?: number; radius?: number; size?: number; seed?: number; opacity?: number; center?: Vec3 }> = ({ n = 2500, radius = 3000, size = 2.2, seed = 9, opacity = 1, center = [0, 0, 0] }) => {
  const geo = useMemo(() => {
    const r = rng(seed);
    const pos: number[] = [], col: number[] = [];
    for (let i = 0; i < n; i++) {
      const u = r.range(-1, 1), th = r.range(0, Math.PI * 2), s = Math.sqrt(1 - u * u);
      pos.push(Math.cos(th) * s * radius, u * radius, Math.sin(th) * s * radius);
      const b = r.range(0.45, 1);
      const warm = r.next();
      col.push(b, b * (0.92 + warm * 0.08), b * (0.85 + (1 - warm) * 0.15));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [n, radius, seed]);
  return (
    <points geometry={geo} position={center}>
      <pointsMaterial size={size} sizeAttenuation={false} vertexColors transparent opacity={opacity} depthWrite={false} fog={false} toneMapped={false} />
    </points>
  );
};

/** Flugzeug (Low-poly) */
export const Airplane: React.FC<{ position?: Vec3; rotationY?: number; scale?: number }> = ({ position = [0, 0, 0], rotationY = 0, scale = 1 }) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[1.9, 1.6, 38, 10]} /><Flat color="#F4F4F4" /></mesh>
    <mesh position={[0, 0, 20]} rotation={[Math.PI / 2, 0, 0]} castShadow><coneGeometry args={[1.9, 4, 10]} /><Flat color="#F4F4F4" /></mesh>
    <mesh position={[0, -0.4, 2]} castShadow><boxGeometry args={[36, 0.5, 5]} /><Flat color="#E6E9EE" /></mesh>
    <mesh position={[0, 0.2, -16]} castShadow><boxGeometry args={[12, 0.4, 3]} /><Flat color="#E6E9EE" /></mesh>
    <mesh position={[0, 3.5, -16.5]} castShadow><boxGeometry args={[0.4, 6, 3.5]} /><Flat color="#3D7DD8" /></mesh>
    {[-8, 8].map((x) => (
      <mesh key={x} position={[x, -1.6, 4]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.9, 0.9, 4, 8]} /><Flat color="#B9C0C8" /></mesh>
    ))}
  </group>
);

/** Fliegende Vögel als einfache V-Formen */
export const Birds: React.FC<{ n?: number; center?: Vec3; spread?: number; time?: number; seed?: number }> = ({ n = 7, center = [0, 30, 0], spread = 20, time = 0, seed = 3 }) => {
  const r = rng(seed);
  const items: Inst[] = Array.from({ length: n }).map((_, i) => {
    const flap = Math.sin(time * 9 + i) * 0.5;
    return { p: [center[0] + r.range(-spread, spread) + time * 6, center[1] + r.range(-4, 4), center[2] + r.range(-spread, spread)], r: [0, 0, flap], s: [1.2, 0.15, 0.4], c: "#2F3B4C" };
  });
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <Instanced items={items} geometry={geo} cast={false} />;
};
