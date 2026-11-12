import React from "react";
import type { Vec3 } from "../../lib/anim";
import { Box } from "./materials";

export type DeerPose = "graze" | "walk" | "alert";

/**
 * Low-poly-Reh (1 Einheit = 1 m, Schulterhöhe ~0,9 m, Blick in +z).
 * `graze` = Kopf unten, frisst · `walk` = Schritt · `alert` = Kopf hoch, Ohren auf.
 */
export const Deer: React.FC<{ position?: Vec3; rotationY?: number; pose?: DeerPose; time?: number; scale?: number; antlers?: boolean; color?: string }> = ({
  position = [0, 0, 0], rotationY = 0, pose = "graze", time = 0, scale = 1, antlers = false, color = "#B07A4E",
}) => {
  const ph = time * Math.PI * 2 * (pose === "walk" ? 1.4 : 0.3);
  const leg = pose === "walk" ? Math.sin(ph) * 0.45 : 0;
  const neck = pose === "graze" ? 1.05 + Math.sin(ph) * 0.08 : pose === "alert" ? -0.25 : 0.1;
  const belly = "#E8D2B4", dark = "#3A2A20";
  const legs: [number, number, number][] = [[-0.13, 0.42, 1], [0.13, 0.42, -1], [-0.13, -0.42, -1], [0.13, -0.42, 1]];
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Beine (Pivot oben) */}
      {legs.map(([x, z, s], i) => (
        <group key={i} position={[x, 0.78, z]} rotation={[leg * s, 0, 0]}>
          <Box size={[0.09, 0.78, 0.1]} color={color} position={[0, -0.39, 0]} bevel={0.2} />
          <Box size={[0.1, 0.08, 0.12]} color={dark} position={[0, -0.76, 0.01]} cast={false} />
        </group>
      ))}
      {/* Rumpf */}
      <Box size={[0.38, 0.4, 1.15]} color={color} position={[0, 0.98, 0]} />
      <Box size={[0.3, 0.12, 0.9]} color={belly} position={[0, 0.79, 0]} cast={false} />
      <Box size={[0.16, 0.18, 0.08]} color="#F4F0E8" position={[0, 1.05, -0.6]} cast={false} />
      {/* Hals + Kopf (Pivot an der Schulter) */}
      <group position={[0, 1.1, 0.5]} rotation={[neck, 0, 0]}>
        <Box size={[0.17, 0.5, 0.2]} color={color} position={[0, 0.22, 0.1]} rotation={[0.35, 0, 0]} />
        <group position={[0, 0.48, 0.2]}>
          <Box size={[0.2, 0.2, 0.36]} color={color} position={[0, 0, 0.1]} />
          <Box size={[0.1, 0.09, 0.08]} color={dark} position={[0, -0.03, 0.3]} cast={false} />
          <Box size={[0.04, 0.05, 0.02]} color={dark} position={[-0.1, 0.04, 0.12]} cast={false} />
          <Box size={[0.04, 0.05, 0.02]} color={dark} position={[0.1, 0.04, 0.12]} cast={false} />
          {[-1, 1].map((s) => (
            <Box key={s} size={[0.16, 0.06, 0.1]} color={color} position={[s * 0.15, 0.12, -0.04]} rotation={[0, 0, s * (pose === "alert" ? 0.6 : 0.25)]} cast={false} />
          ))}
          {antlers && [-1, 1].map((s) => (
            <group key={s} position={[s * 0.07, 0.12, 0]}>
              <Box size={[0.03, 0.3, 0.03]} color="#D9C7A8" position={[s * 0.04, 0.14, 0]} rotation={[0, 0, -s * 0.3]} cast={false} bevel={0} />
              <Box size={[0.03, 0.14, 0.03]} color="#D9C7A8" position={[s * 0.06, 0.18, 0.06]} rotation={[0.7, 0, 0]} cast={false} bevel={0} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};
