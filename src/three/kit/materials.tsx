import React from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Standard-Material des Looks: flat shaded (Low-poly-Facetten), physikalisch beleuchtet.
 *  Realismus kommt aus Licht (IBL, AO, Schatten) und leichtem Glanz – nicht aus mehr Polygonen. */
export const Flat: React.FC<{ color: string; emissive?: string; emissiveIntensity?: number; opacity?: number; side?: THREE.Side; roughness?: number; metalness?: number; vertexColors?: boolean; map?: THREE.Texture }> = ({
  color, emissive, emissiveIntensity = 1, opacity = 1, side, roughness = 0.78, metalness = 0, vertexColors, map,
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

/** Glas (Fenster, Kabinen, Kuppeln): spiegelt die Umgebung (Fresnel), an flachen Winkeln fast undurchsichtig. */
export const Glass: React.FC<{ color?: string; opacity?: number }> = ({ color = "#9CD3F0", opacity = 0.22 }) => (
  <meshPhysicalMaterial
    color={color}
    transparent
    opacity={opacity}
    roughness={0.04}
    metalness={0}
    ior={1.5}
    specularIntensity={1}
    clearcoat={1}
    clearcoatRoughness={0.05}
    envMapIntensity={1.6}
    depthWrite={false}
    side={THREE.DoubleSide}
  />
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
  /** Kantenradius relativ zur kleinsten Kante (0 = scharf). Leicht gerundete Kanten fangen Glanzlichter → wirkt echter. */
  bevel?: number;
  roughness?: number;
  metalness?: number;
}> = ({ size, color, position, rotation, cast = true, receive = true, emissive, opacity, map, bevel = 0.12, roughness, metalness }) => (
  <mesh position={position} rotation={rotation} castShadow={cast} receiveShadow={receive} geometry={boxGeo(size, map ? 0 : bevel)}>
    <Flat color={color} emissive={emissive} opacity={opacity} map={map} roughness={roughness} metalness={metalness} />
  </mesh>
);

const boxCache = new Map<string, THREE.BufferGeometry>();
/** Gecachte (abgerundete) Box-Geometrie – gleiche Größen teilen sich eine Geometrie. */
export function boxGeo(size: [number, number, number], bevel = 0.12) {
  const min = Math.min(size[0], size[1], size[2]);
  const r = Math.min(min * bevel, 0.06 * Math.max(1, min));
  const key = size.join(",") + "|" + r.toFixed(5);
  let g = boxCache.get(key);
  if (!g) {
    g = r > 0 && min > 0 ? new RoundedBoxGeometry(size[0], size[1], size[2], 2, r) : new THREE.BoxGeometry(...size);
    boxCache.set(key, g);
  }
  return g;
}
