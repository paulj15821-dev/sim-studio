import React from "react";
import { PALETTE } from "../../style/theme";
import type { Vec3 } from "../../lib/anim";
import { Box, Flat, Glass } from "./materials";

/**
 * Raum mit Boden, 3 Wänden (vorne offen für die Kamera) und optionalem Fenster.
 * Ursprung = Bodenmitte. Kamera typischerweise bei z ≈ +size/2.
 */
export const Room: React.FC<{ size?: Vec3; floor?: string; wall?: string; window?: boolean; ceiling?: boolean; position?: Vec3 }> = ({
  size = [8, 3, 8], floor = "#C9A27A", wall = "#EDE7DD", window = true, ceiling = false, position = [0, 0, 0],
}) => {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <Box size={[w, 0.1, d]} color={floor} position={[0, -0.05, 0]} cast={false} />
      <Box size={[w, h, 0.15]} color={wall} position={[0, h / 2, -d / 2]} />
      <Box size={[0.15, h, d]} color={wall} position={[-w / 2, h / 2, 0]} />
      <Box size={[0.15, h, d]} color={wall} position={[w / 2, h / 2, 0]} />
      {ceiling && <Box size={[w, 0.1, d]} color="#F4F1EC" position={[0, h + 0.05, 0]} cast={false} />}
      {window && (
        <group position={[w * 0.15, h * 0.55, -d / 2 + 0.09]}>
          <Box size={[2.2, 1.5, 0.05]} color="#BFE3FF" emissive="#9ED3F5" cast={false} />
          <Box size={[2.4, 0.1, 0.12]} color="#FFFFFF" position={[0, 0.8, 0]} />
          <Box size={[2.4, 0.1, 0.12]} color="#FFFFFF" position={[0, -0.8, 0]} />
          <Box size={[0.08, 1.6, 0.12]} color="#FFFFFF" />
        </group>
      )}
    </group>
  );
};

export const Bed: React.FC<{ position?: Vec3; rotationY?: number; sheet?: string }> = ({ position = [0, 0, 0], rotationY = 0, sheet = "#BFD3EE" }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <Box size={[1.6, 0.4, 2.1]} color="#C9A27A" position={[0, 0.2, 0]} />
    <Box size={[1.55, 0.22, 2.0]} color="#FFFFFF" position={[0, 0.51, 0]} />
    <Box size={[1.58, 0.1, 1.4]} color={sheet} position={[0, 0.66, 0.3]} />
    <Box size={[0.6, 0.15, 0.4]} color="#FFFFFF" position={[-0.35, 0.7, -0.75]} />
    <Box size={[0.6, 0.15, 0.4]} color="#FFFFFF" position={[0.35, 0.7, -0.75]} />
    <Box size={[1.6, 0.9, 0.1]} color="#A9805A" position={[0, 0.45, -1.05]} />
  </group>
);

export const Table: React.FC<{ position?: Vec3; size?: Vec3; color?: string }> = ({ position = [0, 0, 0], size = [1.4, 0.75, 0.8], color = "#B88A5E" }) => (
  <group position={position}>
    <Box size={[size[0], 0.06, size[2]]} color={color} position={[0, size[1], 0]} />
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
      <Box key={i} size={[0.06, size[1], 0.06]} color={color} position={[(x * size[0]) / 2.2, size[1] / 2, (z * size[2]) / 2.2]} />
    ))}
  </group>
);

export const CeilingLight: React.FC<{ position: Vec3; on?: boolean }> = ({ position, on = true }) => (
  <group position={position}>
    <Box size={[1.2, 0.06, 1.2]} color="#FFFFFF" emissive={on ? "#FFFFFF" : undefined} cast={false} />
    {on && <pointLight intensity={6} distance={10} decay={2} color="#FFF4E0" position={[0, -0.3, 0]} />}
  </group>
);

export const Door: React.FC<{ position?: Vec3; open?: number; color?: string }> = ({ position = [0, 0, 0], open = 0, color = "#8E6A4A" }) => (
  <group position={position}>
    <group position={[-0.5, 0, 0]} rotation={[0, -open * 1.6, 0]}>
      <Box size={[1, 2.1, 0.08]} color={color} position={[0.5, 1.05, 0]} />
    </group>
  </group>
);

export const Shelf: React.FC<{ position?: Vec3; width?: number; seed?: number }> = ({ position = [0, 0, 0], width = 2 }) => (
  <group position={position}>
    <Box size={[width, 2, 0.4]} color="#D9C2A0" position={[0, 1, 0]} />
    {[0.5, 1.1, 1.7].map((y, i) =>
      Array.from({ length: Math.floor(width / 0.25) }).map((_, k) => (
        <Box key={`${i}-${k}`} size={[0.18, 0.35, 0.3]} color={PALETTE.shirt[(k + i) % PALETTE.shirt.length]} position={[-width / 2 + 0.15 + k * 0.25, y, 0.05]} />
      ))
    )}
  </group>
);

export { Glass, Flat };
