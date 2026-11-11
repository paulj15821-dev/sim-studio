// Profilbild für den Kanal „Was wenn..?“ – quadratisch, aber für runden Zuschnitt komponiert
// (alles Wichtige im inneren Kreis). Rendern: npx remotion still src/index.ts Profilbild-<Variante> out/x.png
import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import { Stage, Camera, Max, Stars, Earth, SunGlow, SkyDome } from "../three/kit";
import { COLOR, FONT } from "../style/theme";

/** 3D-Fragezeichen mit Fase, zentriert */
export const QuestionMark: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; size?: number; glow?: number }> = ({
  position, rotation = [0, 0, 0], size = 1, glow = 1.2,
}) => {
  const geo = useMemo(() => {
    const font = new FontLoader().parse(fontJson as any);
    const g = new TextGeometry("?", { font, size: 1, depth: 0.28, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 4 });
    g.computeBoundingBox();
    const b = g.boundingBox!;
    g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -(b.max.z + b.min.z) / 2);
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} scale={size}>
      <meshStandardMaterial color={COLOR.accent} emissive={COLOR.accent} emissiveIntensity={glow} roughness={0.25} metalness={0.1} />
    </mesh>
  );
};

export type ProfileVariant = "orbit" | "studio" | "schrift";

export const ProfilePic: React.FC<{ variant: ProfileVariant }> = ({ variant }) => {
  const space = variant !== "studio";
  return (
    <AbsoluteFill>
      <Stage preset="space" bg={space ? "#04060E" : "#0B1A22"} fog={null} sunDir={[-2.2, 1.6, 2.6]} sunIntensity={3.4} shadowSize={3} shadowCenter={[0, 1.4, 0]} bloom={0.22}
        env={space ? undefined : ["#1E4A52", "#0F2A33", "#05090C"]} envIntensity={space ? 0.5 : 0.8}>
        <Camera pos={[0.75, 1.5, 4.1]} look={[0.3, 1.72, 0]} fov={30} near={0.05} far={20000} />
        {space ? (
          <>
            <Stars n={2200} radius={9000} size={2} />
            <SunGlow position={[-1600, 900, -2600]} size={900} opacity={0.8} />
            <Earth radius={60} position={[-6, -59, -30]} rotationY={2.2} tilt={1.1} />
          </>
        ) : (
          <SkyDome top="#0A2A30" horizon="#0E2328" bottom="#0E2328" radius={500} haze={0} />
        )}
        {/* Max: Kopf & Schultern, staunend, leicht zur Kamera gedreht */}
        <Max pose="idle" time={0.4} position={[0, 0, 0]} rotationY={0.32} expression="shock" />
        {/* Randlicht in Mint vom Fragezeichen + kühles Kantenlicht von hinten */}
        <pointLight position={[0.9, 2.3, -0.5]} intensity={1.6} distance={3} decay={2} color={COLOR.accent} />
        <directionalLight position={[2, 3, -3]} intensity={2.2} color="#BFD6FF" />
        <QuestionMark position={variant === "schrift" ? [0.85, 2.3, -0.6] : [0.8, 2.08, -0.6]} rotation={[0, -0.4, 0.14]} size={variant === "schrift" ? 0.62 : 0.8} glow={0.45} />
      </Stage>
      {variant === "schrift" && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 640, textAlign: "center", fontFamily: FONT.serif, fontSize: 150, color: "#FFFFFF", textShadow: "0 4px 24px rgba(0,0,0,0.6)", letterSpacing: "-0.01em" }}>
          Was wenn<span style={{ color: COLOR.accent }}>..?</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
