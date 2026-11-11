// YouTube-Kanalbanner 2560×1440. Sicherer Bereich (überall sichtbar): mittig 1546×423 px
// → x 507–2053, y 508–931. Titel + Max liegen dort; alles außerhalb ist Kulisse (Desktop/TV).
// Rendern: npx remotion still src/index.ts Banner out/banner.png
import React from "react";
import { AbsoluteFill } from "remotion";
import { Stage, Camera, Max, Stars, Earth, Moon, SunGlow } from "../three/kit";
import { COLOR, FONT } from "../style/theme";
import { QuestionMark } from "./ProfilePic";

export const SAFE = { x: 507, y: 508, w: 1546, h: 423 };

export const Banner: React.FC<{ showSafe?: boolean }> = ({ showSafe = false }) => (
  <AbsoluteFill style={{ background: "#04060E" }}>
    <Stage preset="space" bg="#04060E" fog={null} sunDir={[-2, 1.2, 2.4]} sunIntensity={3.2} shadows={false} bloom={0.25} envIntensity={0.5}>
      <Camera pos={[0, 0, 10]} look={[0, 0, 0]} fov={40} near={0.05} far={50000} />
      <Stars n={3500} radius={20000} size={2.2} />
      <SunGlow position={[-9000, 4200, -14000]} size={4200} opacity={0.85} />
      {/* Erde als Horizont unten, Mond oben rechts */}
      <Earth radius={160} position={[0, -167.2, -40]} rotationY={2.0} tilt={1.05} />
      <Moon radius={1.15} position={[8.6, 3.3, -6]} />
      {/* Max schwebt links im sicheren Bereich */}
      <Max pose="float" time={0.35} position={[-2.75, -0.62, 1.5]} rotation={[0.1, 0.55, -0.14]} scale={0.66} expression="shock" />
      <pointLight position={[-2.0, 0.5, 2.6]} intensity={1.4} distance={3} decay={2} color={COLOR.accent} />
      <directionalLight position={[3, 2, -4]} intensity={2} color="#BFD6FF" />
      {/* Fragezeichen rechts außen (Desktop/TV), zweites klein links oben */}
      <QuestionMark position={[6.1, 0.4, -1]} rotation={[0, -0.5, 0.15]} size={1.2} glow={0.3} />
      <QuestionMark position={[-7.6, 2.6, -3]} rotation={[0.2, 0.6, -0.2]} size={0.8} glow={0.4} />
    </Stage>
    {/* Titel + Untertitel im sicheren Bereich, rechts von Max */}
    <div style={{ position: "absolute", left: SAFE.x + 470, top: SAFE.y + 52, width: SAFE.w - 520, color: "#FFFFFF", textShadow: "0 6px 30px rgba(0,0,0,0.65)" }}>
      <div style={{ fontFamily: FONT.serif, fontSize: 210, lineHeight: 0.95, letterSpacing: "-0.015em" }}>
        Was wenn<span style={{ color: COLOR.accent }}>..?</span>
      </div>
      <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 34, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 34, opacity: 0.92 }}>
        3D-Simulationen <span style={{ color: COLOR.accent }}>·</span> jeden Tag neu
      </div>
    </div>
    {showSafe && <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y, width: SAFE.w, height: SAFE.h, border: "4px dashed #FF6B5B" }} />}
  </AbsoluteFill>
);
