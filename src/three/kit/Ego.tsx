// POV-Bausteine: Arme/Hände des Zuschauers („du“) im Bild – sie hängen an der Kamera.
// Nutzung in einer Szene (gleiche eye/look wie <Camera>):
//   <EgoRig eye={eye} look={look} pose="phone" time={t} right={<Phone … />} />
import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import type { Vec3 } from "../../lib/anim";
import { Box } from "./materials";

/** Zylinder-Glied von a nach b (Arm, Bein) */
export const Limb: React.FC<{ a: Vec3; b: Vec3; w: number; color: string }> = ({ a, b, w, color }) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return <Box size={[w, len, w * 1.1]} color={color} position={[mid.x, mid.y, mid.z]} rotation={new THREE.Euler().setFromQuaternion(q).toArray().slice(0, 3) as Vec3} cast={false} />;
};

export type EgoPose = "hidden" | "idle" | "phone" | "run" | "brace" | "reach" | "cover";

/**
 * Arme des Zuschauers, im Kamera-Raum (x rechts, y oben, −z nach vorn).
 *  pose: "phone" rechts Handy vors Gesicht · "run" Arme schwingen · "brace" Hände schützend vorn
 *        "reach" rechte Hand greift nach vorn (Tür) · "cover" Hände vors Gesicht · "idle" Hände unten am Bildrand
 *  right: Objekt in der rechten Hand (z. B. <Phone>), lokal: Handfläche zeigt zur Kamera
 */
export const EgoRig: React.FC<{ eye: Vec3; look: Vec3; pose?: EgoPose; time?: number; sleeve?: string; skin?: string; right?: React.ReactNode; roll?: number }> = ({
  eye, look, pose = "idle", time = 0, sleeve = "#4E5A68", skin = PALETTE.skin[1] ?? "#E8B58E", right, roll = 0,
}) => {
  const q = useMemo(() => new THREE.Quaternion(), []);
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...eye), new THREE.Vector3(...look), new THREE.Vector3(Math.sin(roll), Math.cos(roll), 0));
  q.setFromRotationMatrix(m);
  if (pose === "hidden") return null;
  const s = Math.sin(time * 9), c = Math.cos(time * 9);
  const hand = (side: -1 | 1): Vec3 => {
    switch (pose) {
      case "phone": return side > 0 ? [0.055, -0.13, -0.3] : [-0.26, -0.44, -0.28];
      case "run": return [side * 0.2, -0.33 + 0.07 * side * s, -0.34 - 0.08 * side * c];
      case "brace": return [side * 0.13 + 0.01 * s, -0.12 + 0.012 * c, -0.36];
      case "reach": return side > 0 ? [0.12, -0.1, -0.5] : [-0.24, -0.4, -0.3];
      case "cover": return [side * 0.06, -0.02, -0.2];
      default: return [side * 0.24, -0.4 + 0.01 * Math.sin(time * 1.4), -0.32];
    }
  };
  return (
    <group position={eye} quaternion={q}>
      {([-1, 1] as const).map((side) => {
        const h = hand(side);
        const shoulder: Vec3 = [side * 0.22, -0.34, 0.12];
        return (
          <group key={side}>
            <Limb a={shoulder} b={h} w={0.095} color={sleeve} />
            <Box size={[0.085, 0.075, 0.1]} color={skin} position={h} cast={false} />
            {side > 0 && right && <group position={[h[0] - 0.005, h[1] + 0.075, h[2] - 0.01]}>{right}</group>}
          </group>
        );
      })}
    </group>
  );
};
