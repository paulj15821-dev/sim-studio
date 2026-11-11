import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../lib/anim";

export type Inst = { p: Vec3; r?: Vec3; s?: Vec3 | number; c?: string };

/**
 * Viele gleiche Objekte in einem Draw-Call (Gebäude, Gras, Sterne, Bakterien …).
 * `geometry` z. B. new THREE.BoxGeometry(1,1,1) – Größe über `s` pro Instanz.
 */
export const Instanced: React.FC<{
  items: Inst[];
  geometry: THREE.BufferGeometry;
  color?: string;
  cast?: boolean;
  receive?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  basic?: boolean;
  opacity?: number;
}> = ({ items, geometry, color = "#ffffff", cast = true, receive = true, emissive, emissiveIntensity = 1, basic = false, opacity = 1 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.p[0], it.p[1], it.p[2]);
      const r = it.r ?? [0, 0, 0];
      o.rotation.set(r[0], r[1], r[2]);
      const s = it.s ?? 1;
      if (typeof s === "number") o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      col.set(it.c ?? color);
      m.setColorAt(i, col);
    });
    m.count = items.length;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  });
  if (!items.length) return null;
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, items.length]} castShadow={cast} receiveShadow={receive} frustumCulled={false}>
      {basic ? (
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent={opacity < 1} opacity={opacity} />
      ) : (
        <meshStandardMaterial
          color="#ffffff"
          flatShading
          roughness={0.88}
          emissive={emissive ?? "#000000"}
          emissiveIntensity={emissive ? emissiveIntensity : 0}
          transparent={opacity < 1}
          opacity={opacity}
        />
      )}
    </instancedMesh>
  );
};

/** Geometrien einmal erzeugen und wiederverwenden. */
export function useGeo<T extends THREE.BufferGeometry>(make: () => T, deps: unknown[] = []): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(make, deps);
}

/** Leicht verbeulte Low-poly-Kugel (Felsen, Baumkronen, Wolken, Planeten). */
export function lumpyIco(radius: number, detail: number, jitter: number, seed: number) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const pos = g.attributes.position as THREE.BufferAttribute;
  // gleiche Vertex-Positionen gleich verschieben, damit keine Risse entstehen
  const key = (x: number, y: number, z: number) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  const map = new Map<string, number>();
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < pos.count; i++) {
    const k = key(pos.getX(i), pos.getY(i), pos.getZ(i));
    if (!map.has(k)) map.set(k, 1 + (rnd() - 0.5) * 2 * jitter);
    const f = map.get(k)!;
    pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}
