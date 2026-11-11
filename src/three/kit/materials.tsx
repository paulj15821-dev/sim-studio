import React from "react";
import * as THREE from "three";

/** Standard-Material des Looks: flat shaded, matt. */
export const Flat: React.FC<{ color: string; emissive?: string; emissiveIntensity?: number; opacity?: number; side?: THREE.Side; roughness?: number; metalness?: number; vertexColors?: boolean; map?: THREE.Texture }> = ({
  color, emissive, emissiveIntensity = 1, opacity = 1, side, roughness = 0.88, metalness = 0, vertexColors, map,
}) => (
  <meshStandardMaterial
    color={color}
    flatShading
    roughness={roughness}
    metalness={metalness}
    emissive={emissive ?? "#000000"}
    emissiveIntensity={emissive ? emissiveIntensity : 0}
    transparent={opacity < 1}
    opacity={opacity}
    depthWrite={opacity >= 1}
    side={side}
    vertexColors={vertexColors}
    map={map}
  />
);

/** Leuchtendes, unbeleuchtetes Material (Glühen, Sonne, Funken). */
export const Glow: React.FC<{ color: string; opacity?: number; additive?: boolean; side?: THREE.Side }> = ({ color, opacity = 1, additive = true, side }) => (
  <meshBasicMaterial
    color={color}
    transparent
    opacity={opacity}
    depthWrite={false}
    blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
    toneMapped={false}
    side={side}
  />
);

/** Glas (Fenster, Kabinen, Kuppeln) */
export const Glass: React.FC<{ color?: string; opacity?: number }> = ({ color = "#9CD3F0", opacity = 0.22 }) => (
  <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.1} metalness={0.1} depthWrite={false} side={THREE.DoubleSide} />
);

/** Box mit Schatten – das wichtigste Bauteil. */
export const Box: React.FC<{
  size: [number, number, number];
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  cast?: boolean;
  receive?: boolean;
  emissive?: string;
  opacity?: number;
  map?: THREE.Texture;
}> = ({ size, color, position, rotation, cast = true, receive = true, emissive, opacity, map }) => (
  <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow={receive}>
    <boxGeometry args={size} />
    <Flat color={color} emissive={emissive} opacity={opacity} map={map} />
  </mesh>
);
