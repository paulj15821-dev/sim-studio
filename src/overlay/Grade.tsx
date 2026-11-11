import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

/** Vignette + feines Filmkorn. Liegt über der 3D-Szene, unter dem Text. */
export const Grade: React.FC<{ vignette?: number; grain?: number }> = ({ vignette = 0.38, grain = 0.06 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${vignette}) 100%)` }}
      />
      {grain > 0 && (
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: grain, mixBlendMode: "overlay" }}>
          <filter id="g">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#g)" />
        </svg>
      )}
    </AbsoluteFill>
  );
};

/** Übergangs-Overlay rund um einen Schnitt (Frame `at`). */
export const TransitionFx: React.FC<{ at: number; kind: "flash" | "dip" }> = ({ at, kind }) => {
  const frame = useCurrentFrame();
  if (kind === "flash") {
    const op = interpolate(frame, [at, at + 7], [0.95, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    if (frame < at || op <= 0) return null;
    return <AbsoluteFill style={{ background: "#FFFFFF", opacity: op, pointerEvents: "none" }} />;
  }
  const op = interpolate(frame, [at - 6, at, at + 8], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (op <= 0) return null;
  return <AbsoluteFill style={{ background: "#000000", opacity: op, pointerEvents: "none" }} />;
};
