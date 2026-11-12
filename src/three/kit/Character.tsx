import React from "react";
import { PALETTE } from "../../style/theme";
import { Box as BaseBox } from "./materials";

/** Box-Variante für Geister: transparent + schwaches Mint-Leuchten, keine Schatten. */
const ghostCache = new Map<number, React.FC<React.ComponentProps<typeof BaseBox>>>();
function ghostBox(g: number) {
  const k = Math.round(g * 50) / 50;
  let B = ghostCache.get(k);
  if (!B) {
    B = (p) => <BaseBox {...p} opacity={(p.opacity ?? 1) * (1 - k)} emissive="#6FF2D0" emissiveIntensity={0.35 * Math.min(1, k * 2)} cast={false} />;
    ghostCache.set(k, B);
  }
  return B;
}
import { rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";

export type Pose =
  | "idle" | "walk" | "run" | "wave" | "lookUp" | "press" | "sit"
  | "fall" | "shock" | "dig" | "swim" | "float" | "cheer" | "point" | "phone" | "carry" | "brace";

export type Outfit = { skin: string; hair?: string; hat?: string; top: string; pants: string; shoes: string; eyes?: string };

export const MAX_OUTFIT: Outfit = {
  skin: PALETTE.max.skin, hat: PALETTE.max.beanie, top: PALETTE.max.hoodie, pants: PALETTE.max.pants, shoes: PALETTE.max.shoes, eyes: PALETTE.max.eyes,
};

export type Joints = { lHip: number; rHip: number; lArmX: number; rArmX: number; lArmZ: number; rArmZ: number; headX: number; headY: number; bodyX: number; bob: number; sit: number };

function poseJoints(pose: Pose, time: number, speed: number): Joints {
  const j: Joints = { lHip: 0, rHip: 0, lArmX: 0, rArmX: 0, lArmZ: 0.08, rArmZ: -0.08, headX: 0, headY: 0, bodyX: 0, bob: 0, sit: 0 };
  const ph = time * Math.PI * 2 * speed;
  const s = Math.sin(ph);
  switch (pose) {
    case "idle":
      j.bob = Math.sin(ph * 0.35) * 0.01;
      j.lArmZ = 0.1 + Math.sin(ph * 0.35) * 0.02;
      j.rArmZ = -j.lArmZ;
      break;
    case "walk":
      j.lHip = s * 0.5; j.rHip = -s * 0.5; j.lArmX = -s * 0.45; j.rArmX = s * 0.45; j.bob = Math.abs(Math.cos(ph)) * 0.04;
      break;
    case "run":
      j.lHip = s * 0.95; j.rHip = -s * 0.95; j.lArmX = -s * 1.0; j.rArmX = s * 1.0; j.bodyX = 0.18; j.bob = Math.abs(Math.cos(ph)) * 0.09;
      break;
    case "wave":
      j.rArmZ = -2.7 + Math.sin(ph * 2) * 0.35; j.lArmZ = 0.1; j.headY = 0.15;
      break;
    case "lookUp":
      j.headX = -0.55; j.lArmZ = 0.15; j.rArmZ = -0.15;
      break;
    case "press":
      j.rArmX = -1.25 + Math.max(0, Math.sin(ph)) * 0.12; j.headX = 0.15;
      break;
    case "sit":
      j.lHip = -1.5; j.rHip = -1.5; j.sit = 1; j.lArmX = -0.4; j.rArmX = -0.4;
      break;
    case "fall":
    case "float":
      j.lArmZ = 2.2 + Math.sin(ph * 1.3) * 0.35; j.rArmZ = -2.2 - Math.sin(ph * 1.3 + 1) * 0.35;
      j.lHip = 0.35 + s * 0.3; j.rHip = -0.25 - s * 0.3; j.headX = pose === "fall" ? -0.25 : 0;
      break;
    case "shock":
      j.lArmZ = 1.25; j.rArmZ = -1.25; j.lArmX = -0.5; j.rArmX = -0.5; j.headX = -0.15; j.bodyX = -0.08;
      break;
    case "dig":
      j.lArmX = -1.1 - Math.max(0, s) * 0.6; j.rArmX = -1.0 - Math.max(0, s) * 0.6; j.bodyX = 0.25 + Math.max(0, s) * 0.25;
      break;
    case "swim":
      j.lArmX = -Math.PI + ((ph % (Math.PI * 2)) / 1); j.rArmX = j.lArmX + Math.PI; j.lHip = s * 0.25; j.rHip = -s * 0.25; j.bodyX = 1.3;
      break;
    case "cheer":
      j.lArmZ = 2.6 + s * 0.15; j.rArmZ = -2.6 - s * 0.15; j.bob = Math.max(0, s) * 0.12;
      break;
    case "point":
      j.rArmX = -1.5; j.rArmZ = -0.1; j.headY = -0.1;
      break;
    case "phone": // Handy vor dem Gesicht, Blick nach unten
      j.rArmX = -1.25; j.rArmZ = 0.25; j.lArmX = -0.9; j.lArmZ = -0.2; j.headX = 0.35 + Math.sin(ph * 0.35) * 0.03;
      break;
    case "carry": // etwas mit beiden Händen vor dem Bauch tragen
      j.lArmX = -1.0; j.rArmX = -1.0; j.lArmZ = 0.05; j.rArmZ = -0.05; j.bob = Math.sin(ph * 0.35) * 0.01;
      break;
    case "brace": // gegen Wind/Druckwelle stemmen
      j.bodyX = 0.35; j.lHip = 0.45; j.rHip = -0.35; j.lArmX = -1.4 + s * 0.12; j.rArmX = -1.5 - s * 0.12; j.lArmZ = 0.4; j.rArmZ = -0.4; j.headX = 0.2;
      break;
  }
  return j;
}

/**
 * Blockige Low-poly-Figur (1 Einheit = 1 m, ~1,85 m groß, Füße bei y=0).
 * `time` in Sekunden treibt die Pose an. `expression`: "neutral" | "happy" | "shock".
 */
export const Character: React.FC<{
  outfit?: Outfit;
  pose?: Pose;
  time?: number;
  speed?: number;
  position?: Vec3;
  rotationY?: number;
  rotation?: Vec3;
  scale?: number;
  expression?: "neutral" | "happy" | "shock";
  /** Gegenstand: "phone" in der rechten Hand (passt zu pose "phone"), "pizza" = Karton vor dem Bauch (pose "carry") */
  hold?: "phone" | "pizza" | "letter";
  /** Farbe des Handy-Bildschirms (Standard hellblau), z. B. Rot für Warnmeldung */
  screen?: string;
  /** Gelenke überschreiben (Radiant), z. B. { lHip: -0.8 } hebt das linke Bein */
  joints?: Partial<Joints>;
  /** Bartlänge in m (0 = keiner) */
  beard?: number;
  /** Lange Haare hinten/seitlich in m (auch unter Mützen) */
  hairLong?: number;
  /** Haar-/Bartfarbe (Standard outfit.hair bzw. Braun) */
  hairColor?: string;
  /** Augen geschlossen (Schlaf, Koma) */
  eyesClosed?: boolean;
  /** Geist-Modus 0..1: halbtransparent mit leichtem Mint-Leuchten (0 = normal). Bei 1 ganz unsichtbar. */
  ghost?: number;
}> = ({ outfit = MAX_OUTFIT, pose = "idle", time = 0, speed = 1.1, position = [0, 0, 0], rotationY = 0, rotation, scale = 1, expression = "neutral", hold, screen, joints, beard = 0, hairLong = 0, hairColor, eyesClosed = false, ghost = 0 }) => {
  const j = { ...poseJoints(pose, time, speed), ...joints };
  if (ghost >= 0.999) return null;
  const Box = ghost > 0.001 ? ghostBox(ghost) : BaseBox;
  const hc = hairColor ?? outfit.hair ?? "#6B4428";
  const o = outfit;
  const eyeH = eyesClosed ? 0.014 : expression === "shock" ? 0.085 : 0.06;
  return (
    <group position={position} rotation={rotation ?? [0, rotationY, 0]} scale={scale}>
      <group position={[0, j.bob - j.sit * 0.42, 0]}>
        {/* Beine (Pivot an der Hüfte) */}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.13, 0.9, 0]} rotation={[side < 0 ? j.lHip : j.rHip, 0, 0]}>
            <Box size={[0.2, 0.8, 0.24]} color={o.pants} position={[0, -0.4, 0]} />
            <Box size={[0.22, 0.1, 0.32]} color={o.shoes} position={[0, -0.85, 0.04]} />
          </group>
        ))}
        {/* Oberkörper */}
        <group position={[0, 0.9, 0]} rotation={[j.bodyX, 0, 0]}>
          <Box size={[0.5, 0.62, 0.3]} color={o.top} position={[0, 0.31, 0]} />
          {/* Arme (Pivot an der Schulter) */}
          {([-1, 1] as const).map((side) => (
            <group key={side} position={[side * 0.33, 0.56, 0]} rotation={[side < 0 ? j.lArmX : j.rArmX, 0, -(side < 0 ? j.lArmZ : j.rArmZ)]}>
              <Box size={[0.15, 0.56, 0.18]} color={o.top} position={[0, -0.27, 0]} />
              <Box size={[0.13, 0.11, 0.15]} color={o.skin} position={[0, -0.6, 0]} />
              {hold === "phone" && side > 0 && (
                <group position={[0.0, -0.7, 0.07]} rotation={[-0.3, 0, 0]}>
                  <Box size={[0.09, 0.17, 0.03]} color="#1E2228" cast={false} roughness={0.35} />
                  <Box size={[0.075, 0.15, 0.005]} color={screen ?? "#BDEFFF"} emissive={screen ?? "#8FE3FF"} emissiveIntensity={screen ? 2.2 : 1} position={[0, 0, 0.017]} cast={false} bevel={0} />
                </group>
              )}
              {hold === "letter" && side > 0 && (
                <group position={[-0.06, -0.72, 0.1]} rotation={[-0.3, 0, 0]}>
                  <Box size={[0.3, 0.21, 0.01]} color="#F6F2EA" cast={false} bevel={0} />
                  <Box size={[0.16, 0.012, 0.004]} color="#3A3A44" position={[-0.04, 0.05, 0.007]} cast={false} bevel={0} />
                  <Box size={[0.2, 0.012, 0.004]} color="#3A3A44" position={[-0.02, 0.02, 0.007]} cast={false} bevel={0} />
                  <Box size={[0.18, 0.012, 0.004]} color="#3A3A44" position={[-0.03, -0.01, 0.007]} cast={false} bevel={0} />
                  <Box size={[0.05, 0.05, 0.004]} color="#C8402F" position={[0.1, -0.06, 0.007]} cast={false} bevel={0} />
                </group>
              )}
            </group>
          ))}
          {hold === "pizza" && (
            <group position={[0, 0.05, 0.5]}>
              <Box size={[0.48, 0.07, 0.48]} color="#D9B98A" roughness={0.9} />
              <Box size={[0.22, 0.005, 0.16]} color="#C8402F" position={[0, 0.038, 0]} cast={false} bevel={0} />
            </group>
          )}
          {/* Kopf */}
          <group position={[0, 0.66, 0]} rotation={[j.headX, j.headY, 0]}>
            <Box size={[0.36, 0.36, 0.34]} color={o.skin} position={[0, 0.18, 0]} />
            <Box size={[0.06, eyeH, 0.02]} color={o.eyes ?? "#1E1E24"} position={[-0.08, 0.21, 0.175]} cast={false} />
            <Box size={[0.06, eyeH, 0.02]} color={o.eyes ?? "#1E1E24"} position={[0.08, 0.21, 0.175]} cast={false} />
            {beard > 0.001 && (
              <>
                <Box size={[0.37, 0.1 + beard * 0.4, 0.06 + Math.min(beard, 0.1) * 0.6]} color={hc} position={[0, 0.07 - beard * 0.2, 0.16]} cast={false} />
                {beard > 0.06 && <Box size={[0.26, beard, 0.1]} color={hc} position={[0, 0.02 - beard / 2, 0.15]} cast={false} />}
                <Box size={[0.14, 0.03, 0.03]} color="#5A2A2A" position={[0, 0.1, 0.19 + Math.min(beard, 0.1) * 0.3]} cast={false} bevel={0} />
              </>
            )}
            {hairLong > 0.001 && <Box size={[0.38, 0.22 + hairLong, 0.2]} color={hc} position={[0, 0.28 - hairLong / 2, -0.09]} cast={false} />}
            {/* Seitliche Strähnen – macht lange Haare auch von vorn erkennbar */}
            {hairLong > 0.1 && ([-1, 1] as const).map((sd) => (
              <Box key={sd} size={[0.06, 0.16 + hairLong * 0.75, 0.24]} color={hc} position={[sd * 0.2, 0.29 - hairLong * 0.37, -0.03]} cast={false} />
            ))}
            {expression === "shock" && <Box size={[0.07, 0.07, 0.02]} color="#5A2A2A" position={[0, 0.09, 0.175]} cast={false} />}
            {expression === "happy" && <Box size={[0.12, 0.03, 0.02]} color="#5A2A2A" position={[0, 0.1, 0.175]} cast={false} />}
            {o.hat ? (
              <>
                <Box size={[0.39, 0.14, 0.37]} color={o.hat} position={[0, 0.39, 0]} />
                <Box size={[0.41, 0.05, 0.39]} color={o.hat} position={[0, 0.33, 0]} />
              </>
            ) : (
              o.hair && <Box size={[0.38, 0.1, 0.36]} color={o.hair} position={[0, 0.39, -0.01]} />
            )}
          </group>
        </group>
      </group>
    </group>
  );
};

/** Max – das Maskottchen. */
export const Max: React.FC<Omit<React.ComponentProps<typeof Character>, "outfit">> = (p) => <Character outfit={MAX_OUTFIT} {...p} />;

/** Zufällige Nebenfigur aus Seed. */
export function outfitFromSeed(seed: number): Outfit {
  const r = rng(seed);
  return { skin: r.pick(PALETTE.skin), hair: r.pick(PALETTE.hair), top: r.pick(PALETTE.shirt), pants: r.pick(PALETTE.pants), shoes: r.pick(["#F4F4F4", "#2F3B4C", "#7A4E33"]) };
}
export const Person: React.FC<Omit<React.ComponentProps<typeof Character>, "outfit"> & { seed: number }> = ({ seed, ...p }) => (
  <Character outfit={outfitFromSeed(seed)} {...p} time={(p.time ?? 0) + (seed % 7) * 0.13} />
);

/** Menschenmenge: n Personen verstreut in einem Bereich. */
export const Crowd: React.FC<{ n: number; seed?: number; area: [number, number]; center?: Vec3; pose?: Pose; time?: number; faceTo?: Vec3; walkDir?: number; walkSpeed?: number }> = ({
  n, seed = 1, area, center = [0, 0, 0], pose = "idle", time = 0, faceTo, walkDir, walkSpeed = 1.3,
}) => {
  const r = rng(seed);
  const people = Array.from({ length: n }).map((_, i) => {
    const x = center[0] + r.range(-area[0] / 2, area[0] / 2);
    const z = center[2] + r.range(-area[1] / 2, area[1] / 2);
    return { x, z, s: 900 + seed * 31 + i, rot: r.range(0, Math.PI * 2) };
  });
  return (
    <group>
      {people.map((pp, i) => {
        let x = pp.x, z = pp.z, rot = pp.rot;
        if (walkDir != null) {
          rot = walkDir;
          x += Math.sin(walkDir) * walkSpeed * time;
          z += Math.cos(walkDir) * walkSpeed * time;
        } else if (faceTo) rot = Math.atan2(faceTo[0] - x, faceTo[2] - z);
        return <Person key={i} seed={pp.s} pose={walkDir != null ? "walk" : pose} time={time} position={[x, center[1], z]} rotationY={rot} />;
      })}
    </group>
  );
};
