import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp } from "../lib/anim";

/**
 * Ego-Perspektive: Augenlider, Unschärfe, Traum-Vignette über einer 3D-Szene.
 *  open  0 = Augen zu (schwarz), 1 = ganz offen
 *  blur  Unschärfe in px (Aufwachen, Benommenheit)
 *  dream 0..1 dunkler, weicher Rand (Koma-„Wahrnehmung“)
 * Nutzung im Shot: render: (s) => <EgoView open={…}><MeineSzene shot={s} /></EgoView>
 */
export const EgoView: React.FC<{ open?: number; blur?: number; dream?: number; tint?: string; children: React.ReactNode }> = ({
  open = 1, blur = 0, dream = 0, tint, children,
}) => {
  const o = clamp(open);
  const lid = (1 - o) * 56; // % Bildhöhe je Lid
  return (
    <AbsoluteFill>
      <AbsoluteFill style={blur > 0.05 ? { filter: `blur(${blur}px)`, transform: "scale(1.03)" } : undefined}>{children}</AbsoluteFill>
      {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: "multiply", pointerEvents: "none" }} />}
      {dream > 0 && (
        <AbsoluteFill
          style={{ pointerEvents: "none", background: `radial-gradient(ellipse 70% 52% at 50% 46%, rgba(10,14,22,0) 45%, rgba(10,14,22,${0.75 * dream}) 100%)` }}
        />
      )}
      {o < 0.999 && (
        <>
          <div
            style={{
              position: "absolute", left: "-25%", width: "150%", top: `${-12 + lid * 0.0}%`, height: `${12 + lid}%`, background: "#050506",
              borderRadius: "0 0 50% 50% / 0 0 38% 38%", boxShadow: `0 0 ${60 + 80 * (1 - o)}px ${40 + 60 * (1 - o)}px #050506`, pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute", left: "-25%", width: "150%", bottom: "-12%", height: `${12 + lid}%`, background: "#050506",
              borderRadius: "50% 50% 0 0 / 38% 38% 0 0", boxShadow: `0 0 ${60 + 80 * (1 - o)}px ${40 + 60 * (1 - o)}px #050506`, pointerEvents: "none",
            }}
          />
        </>
      )}
    </AbsoluteFill>
  );
};

/** Lidschlag-Kurve: 1 = offen. blinks = Zeitpunkte (s) der Lidschläge, dur = Dauer */
export const blinkAt = (t: number, blinks: number[], dur = 0.22) => {
  let o = 1;
  for (const b of blinks) {
    const x = (t - b) / dur;
    if (x > 0 && x < 1) o = Math.min(o, Math.abs(x * 2 - 1));
  }
  return o;
};
