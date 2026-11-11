import React, { useLayoutEffect } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import type { Vec3 } from "../lib/anim";
import { Environment, PostFX } from "./PostFX";

export type LightPreset = "day" | "golden" | "overcast" | "night" | "space" | "interior" | "underwater" | "lava" | "micro";

const PRESETS: Record<
  LightPreset,
  { bg: string; fog?: [string, number, number]; hemi: [string, string, number]; sun: [string, number]; sunDir: Vec3; ambient: number; exposure: number; env: [string, string, string, number] }
> = {
  day: { bg: "#9ED3F5", fog: ["#CFE7F5", 120, 900], hemi: ["#CFEAFF", "#7C8B5A", 1.15], sun: ["#FFF1DC", 2.6], sunDir: [40, 70, 30], ambient: 0.15, exposure: 1.0, env: ["#5E9BE0", "#D6E6F2", "#6E7560", 0.9] },
  golden: { bg: "#F5B98A", fog: ["#F2C9A4", 80, 700], hemi: ["#FFD7B0", "#6A5A4A", 0.9], sun: ["#FFC48A", 2.8], sunDir: [-60, 25, 20], ambient: 0.12, exposure: 1.0, env: ["#6E86B8", "#F6C79A", "#5A4A3C", 0.8] },
  overcast: { bg: "#C9D2DA", fog: ["#C9D2DA", 60, 500], hemi: ["#E6ECF1", "#7C8070", 1.5], sun: ["#FFFFFF", 0.9], sunDir: [20, 80, 10], ambient: 0.25, exposure: 1.0, env: ["#B8C2CC", "#DCE2E8", "#6A6E66", 1.0] },
  night: { bg: "#0E1630", fog: ["#121C3A", 60, 600], hemi: ["#3A4A80", "#101018", 0.5], sun: ["#9FB4FF", 0.7], sunDir: [-30, 60, -20], ambient: 0.08, exposure: 1.1, env: ["#0A1230", "#1C2850", "#08080C", 0.35] },
  space: { bg: "#04060D", hemi: ["#1A2440", "#000000", 0.12], sun: ["#FFF6E6", 3.2], sunDir: [60, 25, 40], ambient: 0.02, exposure: 1.0, env: ["#000000", "#03050A", "#000000", 0.25] },
  interior: { bg: "#E9E4DC", fog: ["#E9E4DC", 30, 120], hemi: ["#FFF7EC", "#B8A894", 1.3], sun: ["#FFF1DC", 1.8], sunDir: [12, 20, 8], ambient: 0.25, exposure: 1.0, env: ["#F4EEE4", "#E9E2D6", "#9E8E7A", 0.9] },
  underwater: { bg: "#1E7A7A", fog: ["#2A8C8A", 4, 60], hemi: ["#9FF2E8", "#0B3A3F", 1.2], sun: ["#E6FFF8", 1.6], sunDir: [10, 60, 10], ambient: 0.2, exposure: 1.0, env: ["#3AC4C0", "#1E7A7A", "#06262A", 0.8] },
  lava: { bg: "#3A0F06", fog: ["#7A2A0C", 10, 120], hemi: ["#FFB070", "#3A0A00", 1.0], sun: ["#FFC070", 2.4], sunDir: [0, 50, 20], ambient: 0.2, exposure: 1.05, env: ["#5A1A0A", "#C2501A", "#200500", 0.7] },
  micro: { bg: "#1E7A7A", fog: ["#2A8C8A", 6, 80], hemi: ["#B8FFF0", "#0E4C50", 1.3], sun: ["#FFFFFF", 1.8], sunDir: [20, 50, 30], ambient: 0.25, exposure: 1.0, env: ["#BFFFF2", "#3AA8A2", "#0E4C50", 0.8] },
};

/** Setzt die Kamera jeden Frame. Alle Werte kommen aus der Zeit → deterministisch. */
export const Camera: React.FC<{ pos: Vec3; look: Vec3; fov?: number; roll?: number; near?: number; far?: number }> = ({
  pos, look, fov = 45, roll = 0, near = 0.1, far = 5000,
}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(look[0], look[1], look[2]);
    camera.fov = fov;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    invalidate();
  });
  return null;
};

/** Richtet das Sonnen-Target auf `center` aus (Three braucht das für korrekte Schatten). */
const Sun: React.FC<{ center: Vec3 }> = ({ center }) => {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.DirectionalLight).isDirectionalLight) {
        const l = o as THREE.DirectionalLight;
        l.target.position.set(center[0], center[1], center[2]);
        l.target.updateMatrixWorld();
      }
    });
  });
  return null;
};

/**
 * Bühne für jede 3D-Szene: Canvas, Licht-Preset, Hintergrund, Nebel, Schatten.
 *  - `bg`/`fog` überschreiben das Preset (z. B. Himmelsfarbe nach Höhe)
 *  - `shadowSize` = halbe Kantenlänge des Schattenbereichs um `shadowCenter`
 *  - `logDepth` für Szenen mit riesigen Distanzen (Weltall)
 */
export const Stage: React.FC<{
  preset?: LightPreset;
  bg?: string;
  fog?: [string, number, number] | null;
  sunDir?: Vec3;
  sunIntensity?: number;
  shadowSize?: number;
  shadowCenter?: Vec3;
  logDepth?: boolean;
  /** Schatten aus (spart Renderzeit, nötig bei km-Maßstab) */
  shadows?: boolean;
  /** Ambient Occlusion (Kontaktschatten), 0 = aus. Nur ohne logDepth wirksam. Radius in Szeneneinheiten. */
  ao?: number;
  aoRadius?: number;
  /** Bloom-Stärke für sehr helle Stellen (Sonne, Lampen, Glühen). 0 = aus */
  bloom?: number;
  /** Umgebungslicht überschreiben: [Himmel, Horizont, Boden] bzw. Intensität */
  env?: [string, string, string];
  envIntensity?: number;
  /** false = alter, flacher Look ohne IBL/Nachbearbeitung (schneller) */
  realism?: boolean;
  children: React.ReactNode;
}> = ({ preset = "day", bg, fog, sunDir, sunIntensity, shadowSize = 40, shadowCenter = [0, 0, 0], logDepth = false, shadows = true, ao = 1, aoRadius, bloom, env, envIntensity, realism = true, children }) => {
  const { width, height } = useVideoConfig();
  const p = PRESETS[preset];
  const f = fog === null ? undefined : fog ?? p.fog;
  const sd = sunDir ?? p.sunDir;
  const len = Math.hypot(sd[0], sd[1], sd[2]) || 1;
  const sunPos: Vec3 = [shadowCenter[0] + (sd[0] / len) * 120, shadowCenter[1] + (sd[1] / len) * 120, shadowCenter[2] + (sd[2] / len) * 120];
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows={shadows}
      gl={{ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: logDepth }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; // filmisch, kräftiger Kontrast (gut fürs Handy)
        gl.toneMappingExposure = p.exposure;
      }}
      camera={{ fov: 45, near: 0.1, far: 5000, position: [0, 2, 8] }}
    >
      <color attach="background" args={[bg ?? p.bg]} />
      {f && <fog attach="fog" args={f} />}
      {/* Mit IBL übernimmt die Umgebung das Himmelslicht → Hemisphäre/Ambient nur noch als Rest */}
      <hemisphereLight args={[p.hemi[0], p.hemi[1], p.hemi[2] * (realism ? 0.35 : 1)]} />
      <ambientLight intensity={p.ambient * (realism ? 0.3 : 1)} />
      {realism && (
        <Environment sky={env?.[0] ?? p.env[0]} horizon={env?.[1] ?? p.env[1]} ground={env?.[2] ?? p.env[2]} sun={p.sun[0]} sunDir={sd} intensity={envIntensity ?? p.env[3]} />
      )}
      {realism && <PostFX logDepth={logDepth} ao={ao} aoRadius={aoRadius ?? Math.max(0.4, shadowSize * 0.012)} bloom={bloom ?? (preset === "space" || preset === "night" || preset === "lava" ? 0.55 : 0.3)} />}
      <Sun center={shadowCenter} />
      <directionalLight
        color={p.sun[0]}
        intensity={sunIntensity ?? p.sun[1]}
        position={sunPos}
        castShadow={shadows}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={400}
      />
      {children}
    </ThreeCanvas>
  );
};
