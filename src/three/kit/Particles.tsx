import React, { useMemo } from "react";
import * as THREE from "three";
import { rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";
import { Instanced, type Inst } from "./Instances";
import { Glow } from "./materials";

const wrap = (v: number, size: number) => ((((v + size / 2) % size) + size) % size) - size / 2;

export type ParticleKind = "dust" | "embers" | "bubbles" | "snow" | "streaks" | "debris" | "sparkle";

const KIND: Record<ParticleKind, { color: string[]; size: [number, number]; vel: Vec3; jitter: number; basic: boolean; shape: "box" | "ico" | "line" }> = {
  dust: { color: ["#E8E0D0", "#D8CCB6"], size: [0.02, 0.06], vel: [0.1, 0.05, 0], jitter: 0.15, basic: false, shape: "box" },
  embers: { color: ["#FFB347", "#FF7A1A", "#FFD27A"], size: [0.03, 0.1], vel: [0, 1.4, 0], jitter: 0.5, basic: true, shape: "box" },
  bubbles: { color: ["#E6FFFB", "#BFF5EC"], size: [0.03, 0.12], vel: [0, 0.8, 0], jitter: 0.2, basic: false, shape: "ico" },
  snow: { color: ["#FFFFFF", "#EEF4F8"], size: [0.03, 0.07], vel: [0.2, -0.9, 0], jitter: 0.3, basic: false, shape: "ico" },
  streaks: { color: ["#FFFFFF"], size: [0.02, 0.04], vel: [0, -30, 0], jitter: 0.1, basic: true, shape: "line" },
  debris: { color: ["#9A6B47", "#B9B2A6", "#7A5A40"], size: [0.05, 0.25], vel: [0, -3, 0], jitter: 0.6, basic: false, shape: "ico" },
  sparkle: { color: ["#FFFFFF", "#FFF6D8"], size: [0.02, 0.05], vel: [0, 0.2, 0], jitter: 0.3, basic: true, shape: "box" },
};

/**
 * Partikelfeld in einer Box um `center`. Alles aus `time` berechnet (deterministisch).
 * `velocity` überschreibt die Standardrichtung (z. B. Streaks nach unten bei Aufwärtsflug).
 * `stretch` zieht Partikel entlang der Bewegung (Geschwindigkeits-Look).
 */
export const Particles: React.FC<{
  kind: ParticleKind;
  n?: number;
  box?: Vec3;
  center?: Vec3;
  time: number;
  velocity?: Vec3;
  sizeScale?: number;
  stretch?: number;
  opacity?: number;
  seed?: number;
  colors?: string[];
}> = ({ kind, n = 200, box = [20, 20, 20], center = [0, 0, 0], time, velocity, sizeScale = 1, stretch = 0, opacity = 1, seed = 13, colors }) => {
  const k = KIND[kind];
  const base = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }).map(() => ({
      p: [r.range(-0.5, 0.5) * box[0], r.range(-0.5, 0.5) * box[1], r.range(-0.5, 0.5) * box[2]] as Vec3,
      j: [r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)] as Vec3,
      s: r.range(k.size[0], k.size[1]),
      c: r.pick(colors ?? k.color),
      ph: r.range(0, 6.28),
      rot: [r.range(0, 3), r.range(0, 3), r.range(0, 3)] as Vec3,
    }));
  }, [kind, n, box[0], box[1], box[2], seed]);
  const v = velocity ?? k.vel;
  const speed = Math.hypot(v[0], v[1], v[2]) || 1;
  const geo = useMemo(() => (k.shape === "ico" ? new THREE.IcosahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1)), [k.shape]);
  // Ausrichtung entlang der Bewegung (für Streaks / stretch)
  const dir = new THREE.Vector3(v[0], v[1], v[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const e = new THREE.Euler().setFromQuaternion(q);
  const items: Inst[] = base.map((b) => {
    const wob = (i: number) => Math.sin(time * 1.3 + b.ph + i) * k.jitter * b.j[i];
    const p: Vec3 = [
      center[0] + wrap(b.p[0] + v[0] * time + wob(0), box[0]),
      center[1] + wrap(b.p[1] + v[1] * time + wob(1), box[1]),
      center[2] + wrap(b.p[2] + v[2] * time + wob(2), box[2]),
    ];
    const s = b.s * sizeScale;
    const isLine = k.shape === "line" || stretch > 0;
    const len = k.shape === "line" ? Math.max(s * 30, speed * 0.04) : s * (1 + stretch);
    return { p, r: isLine ? [e.x, e.y, e.z] : b.rot, s: isLine ? [s, len, s] : s, c: b.c };
  });
  return <Instanced items={items} geometry={geo} basic={k.basic} cast={false} receive={false} opacity={opacity} />;
};

/** Hitzeschild / Plasma-Glühen vor einem Objekt (Wiedereintritt, Mach-Flug, „Luft brennt“). */
export const PlasmaShell: React.FC<{ position?: Vec3; radius?: number; strength?: number; direction?: "up" | "down" | "forward"; time?: number }> = ({
  position = [0, 0, 0], radius = 2, strength = 1, direction = "up", time = 0,
}) => {
  if (strength <= 0.01) return null;
  const rot: Vec3 = direction === "up" ? [0, 0, 0] : direction === "down" ? [Math.PI, 0, 0] : [Math.PI / 2, 0, 0];
  const flick = 1 + Math.sin(time * 37) * 0.06 + Math.sin(time * 23) * 0.04;
  return (
    <group position={position} rotation={rot}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, radius * (0.55 + i * 0.12), 0]} scale={[flick * (1 + i * 0.18), flick * (0.6 + i * 0.35), flick * (1 + i * 0.18)]}>
          <sphereGeometry args={[radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Glow color={i === 0 ? "#FFF2D0" : i === 1 ? "#FFB060" : "#FF6A2A"} opacity={strength * (0.55 - i * 0.14)} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};

/** Strudel/Vortex (Wasser läuft ab, Zeitloch, Wurmloch) */
export const Vortex: React.FC<{ position?: Vec3; radius?: number; time?: number; colors?: [string, string]; arms?: number }> = ({
  position = [0, 0, 0], radius = 10, time = 0, colors = ["#1F5F8B", "#E6F2FA"], arms = 6,
}) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = colors[0]; g.fillRect(0, 0, 512, 512);
    g.translate(256, 256);
    for (let a = 0; a < arms; a++) {
      g.beginPath();
      for (let t = 0; t < 1; t += 0.01) {
        const ang = a * ((Math.PI * 2) / arms) + t * 7;
        const rr = t * 256;
        g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      g.strokeStyle = colors[1]; g.globalAlpha = 0.65; g.lineWidth = 26; g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [colors[0], colors[1], arms]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, time * 1.6]}>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={tex} roughness={0.4} />
    </mesh>
  );
};
