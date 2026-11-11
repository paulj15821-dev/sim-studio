// Einschläge, Meteore, Explosionen – für Asteroiden-, Vulkan-, Bomben- oder Kometen-Prämissen.
// Alles zeitlos: Animation kommt ausschließlich über Props (Radius, Fortschritt, time).
import React, { useMemo } from "react";
import * as THREE from "three";
import { fbm3, rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";
import { Flat, Glow } from "./materials";
import { lumpyIco } from "./Instances";

/** Verbeulter, verkraterter Gesteinsbrocken (Radius = 1 Einheit · radius). `heat` 0..1 = glüht von innen (Eintritt). */
export const Asteroid: React.FC<{ radius?: number; position?: Vec3; rotation?: Vec3; seed?: number; heat?: number; detail?: number; colors?: [string, string, string] }> = ({
  radius = 1, position = [0, 0, 0], rotation = [0, 0, 0], seed = 11, heat = 0, detail = 4, colors = ["#6B625A", "#58504A", "#80766B"],
}) => {
  const geo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const r = rng(seed);
    const craters = Array.from({ length: 9 }).map(() => {
      const v = new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize();
      return { v, rad: r.range(0.18, 0.42), depth: r.range(0.05, 0.11) };
    });
    const cA = new THREE.Color(colors[0]), cB = new THREE.Color(colors[1]), cC = new THREE.Color(colors[2]);
    const cols: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      let d = 1 + (fbm3(v.x * 1.2 + 3, v.y * 1.2, v.z * 1.2, seed, 3) - 0.5) * 0.55 + (fbm3(v.x * 4, v.y * 4, v.z * 4, seed + 3, 2) - 0.5) * 0.12;
      let shade = 0;
      for (const c of craters) {
        const ang = v.angleTo(c.v) / c.rad;
        if (ang < 1) { d -= c.depth * (1 - ang * ang); shade -= 0.18 * (1 - ang); }
        else if (ang < 1.3) { d += c.depth * 0.35 * (1 - (ang - 1) / 0.3); shade += 0.1; }
      }
      pos.setXYZ(i, v.x * d * 1.18, v.y * d * 0.86, v.z * d);
      const n = fbm3(v.x * 3, v.y * 3, v.z * 3, seed + 9, 2);
      const col = n < 0.45 ? cB.clone() : n > 0.58 ? cC.clone() : cA.clone();
      col.multiplyScalar(1 + shade);
      cols.push(col.r, col.g, col.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, [seed, detail, colors[0], colors[1], colors[2]]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} scale={radius} castShadow receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} emissive={heat > 0 ? "#FF6A1A" : "#000000"} emissiveIntensity={heat * 1.6} envMapIntensity={0.6} />
    </mesh>
  );
};

/** Schweif-Profil: schnell verjüngend (wirkt wie ein Kometenschweif statt wie ein Balken). Ursprung unten, Höhe 1. */
const TAIL = (() => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const y = i / 24;
    pts.push(new THREE.Vector2(Math.pow(1 - y, 2.4) * 0.98 + 0.02, y));
  }
  return new THREE.LatheGeometry(pts, 24);
})();

/**
 * Glühender Schweif + Bugwelle eines eintretenden Körpers. Ursprung = Objektmitte,
 * Flugrichtung = −Y (Schweif zeigt nach +Y). Mit Gruppen-Rotation ausrichten.
 */
export const MeteorTrail: React.FC<{ radius?: number; length?: number; strength?: number; time?: number }> = ({ radius = 1, length = 12, strength = 1, time = 0 }) => {
  if (strength <= 0.01) return null;
  const flick = 1 + Math.sin(time * 41) * 0.05 + Math.sin(time * 17) * 0.04;
  const layers = [
    { c: "#FFF4DA", w: 0.95, l: 0.55, o: 0.75 },
    { c: "#FFC070", w: 1.3, l: 0.8, o: 0.45 },
    { c: "#FF8A3A", w: 1.6, l: 1.0, o: 0.28 },
  ];
  return (
    <group>
      {/* Bugwelle (Halbkugel vorne) */}
      {layers.map((L, i) => (
        <mesh key={`b${i}`} rotation={[Math.PI, 0, 0]} scale={[radius * (1 + i * 0.12) * flick, radius * (0.7 + i * 0.18) * flick, radius * (1 + i * 0.12) * flick]}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Glow color={L.c} opacity={strength * L.o * 0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Schweif */}
      {layers.map((L, i) => (
        <mesh key={`t${i}`} geometry={TAIL} scale={[radius * L.w * flick, length * L.l, radius * L.w * flick]}>
          <Glow color={L.c} opacity={strength * L.o * 0.45} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Einschlags-Feuerball mit Pilzsäule. Ursprung = Einschlagpunkt auf dem Boden.
 *  r      = Radius der glühenden Kuppel
 *  column = Höhe der Säule (0 = keine)
 *  heat   = 1 weißglühend … 0 abgekühlt (dunkler Rauch)
 */
export const Fireball: React.FC<{ r: number; column?: number; heat?: number; time?: number; seed?: number }> = ({ r, column = 0, heat = 1, time = 0, seed = 5 }) => {
  const puffs = useMemo(() => {
    const g = rng(seed);
    return Array.from({ length: 14 }).map((_, i) => ({
      geo: lumpyIco(1, 1, 0.22, seed * 13 + i),
      a: g.range(0, Math.PI * 2),
      d: g.range(0.2, 0.75),
      s: g.range(0.35, 0.6),
      y: g.range(-0.1, 0.25),
    }));
  }, [seed]);
  const hot = new THREE.Color("#FFD9A0").lerp(new THREE.Color("#FF5A1A"), 1 - heat);
  const mid = new THREE.Color("#FF9A3A").lerp(new THREE.Color("#5A2A1A"), 1 - heat);
  const smoke = new THREE.Color("#3A2E2A").lerp(new THREE.Color("#C25A2A"), heat * 0.6);
  const capY = column;
  const capR = Math.max(r * 0.6, column * 0.35);
  return (
    <group>
      {/* Kuppel */}
      <mesh scale={[r, r * 0.8, r]}>
        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={hot} toneMapped={false} />
      </mesh>
      {[1.15, 1.35].map((k, i) => (
        <mesh key={i} scale={[r * k, r * 0.8 * k, r * k]}>
          <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Glow color={i === 0 ? "#FFB060" : "#FF6A2A"} opacity={(0.5 - i * 0.2) * (0.4 + heat * 0.6)} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Säule */}
      {column > 0.01 && (
        <mesh position={[0, column / 2, 0]} scale={[r * 0.38, column, r * 0.38]}>
          <cylinderGeometry args={[0.7, 1, 1, 16, 1, true]} />
          <meshStandardMaterial color={mid} emissive={mid} emissiveIntensity={0.8 + heat} flatShading roughness={1} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Pilzhut aus Rauchballen */}
      {column > 0.01 &&
        puffs.map((p, i) => {
          const wob = Math.sin(time * 0.8 + i) * 0.04;
          return (
            <mesh key={i} geometry={p.geo} position={[Math.cos(p.a + time * 0.05) * p.d * capR, capY + p.y * capR, Math.sin(p.a + time * 0.05) * p.d * capR]} scale={capR * (p.s + wob)}>
              <meshStandardMaterial color={smoke} emissive={i % 3 === 0 ? mid : smoke} emissiveIntensity={i % 3 === 0 ? 0.9 * heat + 0.2 : 0.25 * heat} flatShading roughness={1} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Flacher, sich ausbreitender Ring (Druckwelle, Staubwalze, Tsunami von oben). Liegt in der XZ-Ebene. */
export const ShockRing: React.FC<{ radius: number; width?: number; color?: string; opacity?: number; glow?: boolean; position?: Vec3 }> = ({
  radius, width = 0.15, color = "#FFE2B8", opacity = 0.8, glow = true, position = [0, 0, 0],
}) => {
  if (radius <= 0 || opacity <= 0.01) return null;
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * (1 - width), radius, 96]} />
      {glow ? <Glow color={color} opacity={opacity} side={THREE.DoubleSide} /> : <Flat color={color} opacity={opacity} side={THREE.DoubleSide} />}
    </mesh>
  );
};

/** Wand aus Staub (Druckwelle von der Seite). Ursprung = Bodenmitte der Front, Ausdehnung entlang X. */
export const DustWall: React.FC<{ width?: number; height?: number; seed?: number; color?: string; time?: number }> = ({ width = 200, height = 60, seed = 3, color = "#8A6E58", time = 0 }) => {
  const puffs = useMemo(() => {
    const g = rng(seed);
    return Array.from({ length: 46 }).map((_, i) => ({
      geo: lumpyIco(1, 1, 0.25, seed * 7 + i),
      x: g.range(-0.5, 0.5),
      y: g.range(0, 1),
      z: g.range(-0.6, 0.2),
      s: g.range(0.12, 0.28),
      c: new THREE.Color(color).multiplyScalar(g.range(0.75, 1.15)),
    }));
  }, [seed, color]);
  return (
    <group>
      {puffs.map((p, i) => (
        <mesh key={i} geometry={p.geo} position={[p.x * width, p.y * height * 0.85 + Math.sin(time * 2 + i) * 0.6, p.z * height]} scale={height * p.s * (1 + Math.sin(time * 1.5 + i * 2) * 0.05)}>
          <meshStandardMaterial color={p.c} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
};
