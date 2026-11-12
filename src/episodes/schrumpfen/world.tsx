// Welten für „POV: Du wirst jede Sekunde halb so groß“.
// Trick: Du bist in Szeneneinheiten IMMER 1,8 groß (Augen bei 1,62). Jede Welt ist in einer Referenzlänge gebaut
// (Meter, Millimeter, Mikrometer, Nanometer) und wird mit unit(t, ref) skaliert → alles wächst um dich herum.
// Deine Füße stehen bei (0,0,0), du schaust nach −z.
import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp, lerp, shake, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glow, Max, Room, Table, CeilingLight, Instanced, lumpyIco, Particles, Stars, Earth, SunGlow,
  BacteriaSwarm, Bacterium, Virus, SpikyBall, MoleculeField, EgoRig, EgoLimb, type EgoPose, type Inst, type LightPreset, type Joints, type Pose,
} from "../../three/kit";
import { unit } from "./metric";

export const EYE = 1.62;
export type View = { pos: Vec3; look: Vec3; fov?: number; roll?: number };
export type Times = { t: number; local: number; p: number };
const sm = (a: number, b: number, x: number) => { const v = clamp((x - a) / (b - a)); return v * v * (3 - 2 * v); };

// ═════════════════════════ Rahmen: Ego-Szene ═════════════════════════

/**
 * Eine Szene aus deiner Sicht. `view` = Kamera (Szeneneinheiten), `world` = Inhalt.
 * `ego` = Pose deiner Hände (oder false für Außen-Shots), `shakeAmp` = Wackeln.
 */
export const Scene: React.FC<{
  shot: ShotInfo;
  preset: LightPreset;
  bg?: string;
  fog?: [string, number, number] | null;
  shadowSize?: number;
  shadows?: boolean;
  bloom?: number;
  sunDir?: Vec3;
  env?: [string, string, string];
  far?: number;
  view: (c: Times) => View;
  ego?: EgoPose | ((t: number) => EgoPose) | false;
  shakeAmp?: (t: number) => number;
  world: (c: Times) => React.ReactNode;
}> = ({ shot, preset, bg, fog, shadowSize = 14, shadows = true, bloom, sunDir, env, far = 6000, view, ego = "idle", shakeAmp, world }) => {
  const { t, local, p } = useTimes(shot);
  const c = { t, local, p };
  const v = view(c);
  const amp = shakeAmp?.(t) ?? 0;
  const sh = amp > 0 ? shake(t, amp, 14) : ([0, 0, 0] as Vec3);
  const pos: Vec3 = [v.pos[0] + sh[0], v.pos[1] + sh[1], v.pos[2] + sh[2]];
  const look: Vec3 = [v.look[0] + sh[0] * 2, v.look[1] + sh[1] * 2, v.look[2]];
  const pose = typeof ego === "function" ? ego(t) : ego;
  return (
    <Stage preset={preset} bg={bg} fog={fog} shadowSize={shadowSize} shadows={shadows} bloom={bloom} sunDir={sunDir} env={env} shadowCenter={[0, 0, -4]}>
      <Camera pos={pos} look={look} fov={v.fov ?? 66} roll={v.roll ?? 0} near={0.05} far={far} />
      {pose && <EgoRig eye={pos} look={look} pose={pose} time={t} sleeve="#C8402F" roll={v.roll ?? 0} />}
      {world(c)}
    </Stage>
  );
};

/** POV-Kamera: Augenhöhe, leichtes Atmen bzw. Laufschritte. Blickziel in Szeneneinheiten. */
export const pov = (t: number, look: Vec3, o: { eye?: Vec3; run?: boolean; fov?: number; roll?: number } = {}): View => {
  const eye = o.eye ?? [0, EYE, 0];
  const bob = o.run ? 0.05 : 0.008, f = o.run ? 9 : 1.4;
  return {
    pos: [eye[0] + Math.sin(t * f * 0.5) * bob * 0.6, eye[1] + Math.abs(Math.sin(t * f)) * bob, eye[2]],
    look: [look[0], look[1] + (o.run ? Math.sin(t * f) * 0.08 : 0), look[2]],
    fov: o.fov ?? 66,
    roll: o.roll ?? 0,
  };
};

/** Gruppe in Referenzlänge `ref` (m), automatisch auf deine Größe skaliert. */
export const Grow: React.FC<{ t: number; len: number; children: React.ReactNode }> = ({ t, len, children }) => (
  <group scale={unit(t, len)}>{children}</group>
);

// ═════════════════════════ Teppich (mm-Einheiten) ═════════════════════════

const RUG = ["#2F4F7A", "#3A5E8C", "#28456B", "#466C99", "#34557F"];
export const RUG_BASE = "#223A5C";

/**
 * Hochflor-Teppich in Millimetern: Fasern ~10 mm hoch, ~0,6 mm dick. Nur im Radius `radius` (mm) um dich.
 * `wind(x,z)` → Neigung [rx, rz] (z. B. Sog des Staubsaugers).
 */
export const Carpet: React.FC<{ radius: number; spacing?: number; thick?: number; seed?: number; center?: [number, number]; wind?: (x: number, z: number) => [number, number]; clear?: number; inner?: number; lane?: number; base?: boolean }> = ({
  radius, spacing = 2.5, thick = 0.6, seed = 3, center = [0, 0], wind, clear = 0, inner = 0, lane = 0, base: showBase = true,
}) => {
  const geo = useMemo(() => { const g = new THREE.CylinderGeometry(0.42, 0.5, 1, 5, 1); g.translate(0, 0.5, 0); return g; }, []);
  const base = useMemo(() => {
    const r = rng(seed);
    const out: { x: number; z: number; h: number; w: number; rx: number; rz: number; ry: number; c: string }[] = [];
    const n = Math.ceil(radius / spacing);
    for (let i = -n; i <= n; i++)
      for (let k = -n; k <= n; k++) {
        const x = center[0] + i * spacing + r.range(-0.4, 0.4) * spacing, z = center[1] + k * spacing + r.range(-0.4, 0.4) * spacing;
        const d = Math.hypot(x - center[0], z - center[1]);
        if (d > radius || d < inner || Math.hypot(x, z) < clear) continue;
        if (lane > 0 && Math.abs(x) < lane && z < 0 && z > -radius * 0.6) continue; // Gasse (z. B. für die Ameise)
        // ein Büschel = 3 Fasern
        for (let f = 0; f < 3; f++)
          out.push({
            x: x + r.range(-0.35, 0.35) * spacing, z: z + r.range(-0.35, 0.35) * spacing, h: r.range(8, 11.5), w: thick * r.range(0.8, 1.15),
            rx: r.range(-0.22, 0.22), rz: r.range(-0.22, 0.22), ry: r.range(0, 6), c: r.pick(RUG),
          });
      }
    return out;
  }, [radius, spacing, thick, seed, center[0], center[1], clear, inner, lane]);
  const items: Inst[] = base.map((b) => {
    const w = wind ? wind(b.x, b.z) : [0, 0];
    return { p: [b.x, 0, b.z], r: [b.rx + w[0], b.ry, b.rz + w[1]], s: [b.w, b.h, b.w], c: b.c };
  });
  return (
    <group>
      {showBase && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[1]]} receiveShadow>
          <circleGeometry args={[radius * 30, 48]} />
          <Flat color={RUG_BASE} roughness={1} />
        </mesh>
      )}
      <Instanced items={items} geometry={geo} />
    </group>
  );
};

/** Krümel / Staubkörner / Hautschuppen auf dem Teppichgrund (mm) */
export const Specks: React.FC<{ n: number; radius: number; size: [number, number]; seed?: number; colors?: string[]; flat?: number; y?: number }> = ({
  n, radius, size, seed = 9, colors = ["#EFE6DA", "#E6D9C6", "#D8C8B0"], flat = 1, y = 0,
}) => {
  const geo = useMemo(() => lumpyIco(0.5, 1, 0.35, seed), [seed]);
  const items = useMemo<Inst[]>(() => {
    const r = rng(seed);
    return Array.from({ length: n }).map(() => {
      const s = r.range(size[0], size[1]);
      const a = r.range(0, 6.283), d = Math.sqrt(r.next()) * radius;
      return { p: [Math.cos(a) * d, y + s * 0.12 * flat, Math.sin(a) * d], r: [r.range(-0.2, 0.2), r.range(0, 6), r.range(-0.2, 0.2)], s: [s, s * (flat < 1 ? flat : r.range(0.5, 0.9)), s * r.range(0.6, 1)], c: r.pick(colors) };
    });
  }, [n, radius, size[0], size[1], seed, flat, y]);
  return <Instanced items={items} geometry={geo} />;
};

// ═════════════════════════ Tiere (mm-Einheiten) ═════════════════════════

const Ell: React.FC<{ p: Vec3; s: Vec3; color: string; r?: Vec3; rough?: number }> = ({ p, s, color, r = [0, 0, 0], rough = 0.35 }) => (
  <mesh position={p} scale={s} rotation={r} castShadow receiveShadow>
    <icosahedronGeometry args={[1, 1]} />
    <Flat color={color} roughness={rough} />
  </mesh>
);

/** Ameise, ~5 mm lang, schaut nach +z. `walk` = Laufgeschwindigkeit der Beine (0 = steht). */
export const Ant: React.FC<{ position?: Vec3; rotY?: number; time?: number; walk?: number; color?: string }> = ({ position = [0, 0, 0], rotY = 0, time = 0, walk = 1, color = "#4A2418" }) => {
  const legC = "#3A1C12";
  const ph = time * 14 * walk;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <group position={[0, 0.9, 0]}>
        <Ell p={[0, 0.1, -1.55]} s={[0.95, 0.85, 1.25]} color={color} />
        <Ell p={[0, 0, -0.35]} s={[0.22, 0.2, 0.22]} color={color} />
        <Ell p={[0, 0.12, 0.35]} s={[0.42, 0.4, 0.75]} color={color} r={[-0.2, 0, 0]} />
        <Ell p={[0, 0.15, 1.35]} s={[0.62, 0.58, 0.6]} color={color} />
        {/* Augen */}
        {([-1, 1] as const).map((sd) => <Ell key={sd} p={[sd * 0.5, 0.3, 1.5]} s={[0.12, 0.14, 0.12]} color="#140806" rough={0.15} />)}
        {/* Fühler */}
        {([-1, 1] as const).map((sd) => {
          const w = Math.sin(time * 5 + sd) * 0.15;
          const a: Vec3 = [sd * 0.25, 0.5, 1.75], b: Vec3 = [sd * (0.6 + w), 1.3, 2.0], c: Vec3 = [sd * (0.9 + w), 1.0, 2.9 + w];
          return <group key={sd}><EgoLimb a={a} b={b} w={0.06} color={legC} /><EgoLimb a={b} b={c} w={0.05} color={legC} /></group>;
        })}
        {/* Mandibeln */}
        {([-1, 1] as const).map((sd) => <EgoLimb key={sd} a={[sd * 0.25, -0.15, 1.85]} b={[sd * 0.08, -0.2, 2.1]} w={0.08} color={legC} />)}
        {/* 6 Beine, Dreifuß-Gang */}
        {[-0.05, 0.35, 0.75].map((z, i) =>
          ([-1, 1] as const).map((sd) => {
            const phase = ph + (i % 2 ? Math.PI : 0) + (sd > 0 ? Math.PI : 0);
            const lift = Math.max(0, Math.sin(phase)) * 0.35 * Math.min(1, walk);
            const sw = Math.cos(phase) * 0.45 * Math.min(1, walk);
            const root: Vec3 = [sd * 0.25, 0, z];
            const knee: Vec3 = [sd * 1.2, 0.55 + lift, z + (i - 1) * 0.7 + sw * 0.5];
            const foot: Vec3 = [sd * 2.0, -0.88 + lift * 0.6, z + (i - 1) * 1.4 + sw];
            return <group key={`${i}${sd}`}><EgoLimb a={root} b={knee} w={0.09} color={legC} /><EgoLimb a={knee} b={foot} w={0.06} color={legC} /></group>;
          })
        )}
      </group>
    </group>
  );
};

/** Hausstaubmilbe, ~0,3 mm lang (mm-Einheiten), schaut nach +z */
export const Mite: React.FC<{ position?: Vec3; rotY?: number; time?: number; walk?: number; seed?: number }> = ({ position = [0, 0, 0], rotY = 0, time = 0, walk = 1, seed = 1 }) => {
  const body = "#E9DCC4", leg = "#CDB898";
  const hairs = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 10 }).map(() => ({ a: r.range(-1, 1), b: r.range(-0.8, 0.9), l: r.range(0.04, 0.08) }));
  }, [seed]);
  const ph = time * 9 * walk;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <group position={[0, 0.06, 0]}>
        <Ell p={[0, 0.02, 0]} s={[0.1, 0.075, 0.15]} color={body} rough={0.55} />
        <Ell p={[0, 0.0, 0.15]} s={[0.04, 0.035, 0.045]} color="#D8C2A0" rough={0.5} />
        {hairs.map((h, i) => (
          <EgoLimb key={i} a={[h.a * 0.08, 0.06, h.b * 0.13]} b={[h.a * 0.12, 0.06 + h.l, h.b * 0.13 - 0.05]} w={0.004} color={leg} />
        ))}
        {[-0.08, -0.025, 0.035, 0.09].map((z, i) =>
          ([-1, 1] as const).map((sd) => {
            const phase = ph + i * 1.3 + (sd > 0 ? Math.PI : 0);
            const lift = Math.max(0, Math.sin(phase)) * 0.025 * Math.min(1, walk);
            const sw = Math.cos(phase) * 0.03 * Math.min(1, walk);
            const root: Vec3 = [sd * 0.08, -0.01, z];
            const knee: Vec3 = [sd * 0.15, 0.03 + lift, z + (i - 1.5) * 0.04 + sw * 0.5];
            const foot: Vec3 = [sd * 0.2, -0.06 + lift, z + (i - 1.5) * 0.07 + sw];
            return <group key={`${i}${sd}`}><EgoLimb a={root} b={knee} w={0.013} color={leg} /><EgoLimb a={knee} b={foot} w={0.009} color={leg} /></group>;
          })
        )}
      </group>
    </group>
  );
};

/** Ein Haar (mm-Einheiten, Ø 0,07 mm) entlang x, mit Schuppenschicht. Liegt bei y = Radius. */
export const Hair: React.FC<{ length: number; position?: Vec3; rotY?: number; color?: string; seed?: number }> = ({ length, position = [0, 0, 0], rotY = 0, color = "#4A3222", seed = 4 }) => {
  const R = 0.035, step = 0.009;
  const ring = useMemo(() => { const g = new THREE.CylinderGeometry(1.06, 0.98, 1, 10, 1, true); g.rotateZ(Math.PI / 2); return g; }, []);
  const items = useMemo<Inst[]>(() => {
    const r = rng(seed);
    const n = Math.floor(length / step);
    return Array.from({ length: n }).map((_, i) => ({ p: [-length / 2 + (i + 0.5) * step, 0, 0], r: [r.range(0, 6), r.range(-0.05, 0.05), r.range(-0.05, 0.05)], s: [step * 1.1, R, R], c: i % 3 ? color : "#55392A" }));
  }, [length, seed, color]);
  return (
    <group position={[position[0], position[1] + R, position[2]]} rotation={[0, rotY, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[R * 0.97, R * 0.97, length, 10]} />
        <Flat color={color} roughness={0.45} />
      </mesh>
      <Instanced items={items} geometry={ring} />
    </group>
  );
};

/** Bodendüse eines Staubsaugers (mm-Einheiten), liegt auf dem Flor (10 mm), Öffnung nach unten. Zieht nach −z → +z. */
export const Nozzle: React.FC<{ z: number; time?: number }> = ({ z }) => {
  const W = 280, D = 70;
  const bristle = useMemo<Inst[]>(() => {
    const out: Inst[] = [];
    for (let i = 0; i < 140; i++) for (const zz of [-D / 2 + 3, D / 2 - 3]) out.push({ p: [-W / 2 + 4 + i * ((W - 8) / 139), 5, zz], s: [1.2, 10, 1.2], c: "#2A2C30" });
    return out;
  }, []);
  const bgeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <group position={[0, 0, z]}>
      <Box size={[W, 26, D]} color="#3A3F47" position={[0, 10 + 13 + 4, 0]} roughness={0.4} />
      <Box size={[W + 4, 6, D + 4]} color="#E07A2E" position={[0, 12, 0]} roughness={0.5} />
      <Box size={[W - 20, 3, D - 16]} color="#0C0D10" position={[0, 9.2, 0]} bevel={0} />
      <Instanced items={bristle} geometry={bgeo} />
      {/* Rohr nach hinten oben */}
      <mesh position={[0, 80, -60]} rotation={[-0.75, 0, 0]} castShadow>
        <cylinderGeometry args={[18, 22, 170, 14]} />
        <Flat color="#5A606A" roughness={0.35} metalness={0.4} />
      </mesh>
    </group>
  );
};

// ═════════════════════════ Küche (Meter) ═════════════════════════

/** Küche in Metern, du stehst bei (0,0,0) auf dem Teppich. `carpet` = Teppich-Fasern um dich (Radius m). */
export const Kitchen: React.FC<{ carpet?: number; children?: React.ReactNode }> = ({ carpet = 0.25, children }) => (
  <group>
    <Room size={[7, 2.7, 7.5]} position={[0, 0, -1.2]} floor="#C9A27A" wall="#EFE6D6" />
    {/* Küchenzeile */}
    <Box size={[3.6, 0.9, 0.65]} color="#E8E2D6" position={[-1.4, 0.45, -4.55]} />
    <Box size={[3.7, 0.05, 0.7]} color="#6E5844" position={[-1.4, 0.92, -4.55]} />
    <Box size={[3.6, 0.7, 0.4]} color="#E8E2D6" position={[-1.4, 1.95, -4.7]} />
    <Box size={[0.8, 1.95, 0.72]} color="#F4F4F4" position={[1.2, 0.98, -4.5]} roughness={0.3} />
    <Box size={[0.04, 0.5, 0.04]} color="#9AA3AD" position={[0.86, 1.25, -4.12]} metalness={0.6} roughness={0.3} />
    <Table position={[2.0, 0, -1.6]} />
    <Box size={[0.42, 0.45, 0.42]} color="#B88A5E" position={[2.0, 0.22, -0.95]} />
    <Box size={[0.42, 0.45, 0.42]} color="#B88A5E" position={[2.0, 0.22, -2.25]} />
    <Box size={[0.3, 0.02, 0.3]} color="#F4F4F4" position={[1.8, 0.77, -1.6]} />
    <CeilingLight position={[0, 2.68, -1.6]} />
    {/* Teppich */}
    <Box size={[2.0, 0.008, 2.8]} color={RUG_BASE} position={[0, 0.004, -0.6]} cast={false} bevel={0} />
    {carpet > 0 && (
      <group scale={0.001} position={[0, 0.002, 0]}>
        <Carpet radius={carpet * 1000} spacing={7} thick={1.6} seed={5} />
        <Specks n={40} radius={carpet * 900} size={[1, 4]} seed={12} colors={["#D9B38A", "#EADBC2", "#B88A5E"]} />
      </group>
    )}
    {children}
  </group>
);

/** Max mit Gelenk-Override (Bücken, Fuß heben …) */
export const MaxAt: React.FC<{ pos: Vec3; rotY?: number; pose?: Pose; time: number; joints?: Partial<Joints>; expr?: "neutral" | "happy" | "shock"; hold?: "phone"; screen?: string }> = ({
  pos, rotY = 0, pose = "idle", time, joints, expr = "shock", hold, screen,
}) => <Max position={pos} rotationY={rotY} pose={pose} time={time} joints={joints} expression={expr} hold={hold} screen={screen} />;

// ═════════════════════════ Mikrowelt ═════════════════════════

/** Unebener Grund (feuchter Film / Faseroberfläche) in beliebigen Einheiten */
export const Ground: React.FC<{ size: number; color: string; seed?: number; bump?: number }> = ({ size, color, seed = 2, bump = 0.02 }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, 48, 48);
    g.rotateX(-Math.PI / 2);
    const r = rng(seed);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, (r.next() - 0.5) * size * bump);
    g.computeVertexNormals();
    return g;
  }, [size, seed, bump]);
  return <mesh geometry={geo} receiveShadow><Flat color={color} roughness={0.5} /></mesh>;
};

/** Elektronenwolken: additive, weiche Kugeln (keine Tiefen-Sortierprobleme) */
const Clouds: React.FC<{ items: { p: Vec3; s: number }[]; color: string; opacity: number }> = ({ items, color, opacity }) => {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const ref = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => { o.position.set(...it.p); o.scale.setScalar(it.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.count = items.length;
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, undefined, items.length]} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </instancedMesh>
  );
};

/** Atomgitter (nm-Einheiten): winzige Kerne + große, fast leere Elektronenwolken. */
export const AtomField: React.FC<{ n: number; layers: number; spacing?: number; time: number; jitter?: number }> = ({ n, layers, spacing = 0.32, time, jitter = 0.012 }) => {
  const sph = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const base = useMemo(() => {
    const out: { p: Vec3; ph: number }[] = [];
    const r = rng(17);
    for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) for (let y = 0; y < layers; y++)
      out.push({ p: [(x - n / 2 + 0.5 + (y % 2) * 0.5) * spacing, -y * spacing * 0.82, (z - n / 2 + 0.5 + (y % 2) * 0.5) * spacing], ph: r.range(0, 6.28) });
    return out;
  }, [n, layers, spacing]);
  const pos = base.map((b) => [b.p[0] + Math.sin(time * 11 + b.ph) * jitter, b.p[1] + Math.sin(time * 13 + b.ph * 2) * jitter, b.p[2] + Math.cos(time * 12 + b.ph) * jitter] as Vec3);
  const nuclei: Inst[] = pos.map((p, i) => ({ p, s: 0.018, c: i % 3 ? "#FFE08A" : "#FF9E5E" }));
  return (
    <group>
      <Instanced items={nuclei} geometry={sph} basic />
      <Clouds items={pos.map((p) => ({ p, s: 0.13 }))} color="#5FD3FF" opacity={0.09} />
      <Clouds items={pos.map((p) => ({ p, s: 0.07 }))} color="#8FA8FF" opacity={0.12} />
    </group>
  );
};

/** Spiralgalaxie aus Lichtpunkten (beliebige Einheiten, Radius 1) */
export const Galaxy: React.FC<{ position?: Vec3; scale?: number; rot?: number; tilt?: number }> = ({ position = [0, 0, 0], scale = 1, rot = 0, tilt = 1.0 }) => {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const items = useMemo<Inst[]>(() => {
    const r = rng(23);
    const cols = ["#FFFFFF", "#CFE0FF", "#FFD6E8", "#FFE9B8", "#9FC2FF"];
    return Array.from({ length: 5000 }).map((_, i) => {
      const arm = i % 3;
      const d = Math.pow(r.next(), 0.6);
      const a = arm * ((Math.PI * 2) / 3) + d * 5.5 + r.range(-0.35, 0.35) * (1 - d * 0.5);
      const spread = 0.04 + d * 0.06;
      return { p: [Math.cos(a) * d + r.range(-1, 1) * spread, r.range(-1, 1) * 0.03 * (1 - d), Math.sin(a) * d + r.range(-1, 1) * spread] as Vec3, s: r.range(0.002, 0.007) * (d < 0.15 ? 1.6 : 1), c: d < 0.18 ? "#FFE9B8" : r.pick(cols) };
    });
  }, []);
  return (
    <group position={position} rotation={[tilt, rot, 0]} scale={scale}>
      <Instanced items={items} geometry={geo} basic cast={false} receive={false} />
      <SunGlow position={[0, 0, 0]} size={0.5} color="#FFE2B0" opacity={0.7} />
    </group>
  );
};

export { Particles, Stars, Earth, SunGlow, BacteriaSwarm, Bacterium, Virus, SpikyBall, MoleculeField, Glow, lerp, sm };
