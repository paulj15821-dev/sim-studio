import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT, LAYOUT } from "../style/theme";
import { clamp, invLerp } from "../lib/anim";
import { magnitude } from "../lib/metric";
import type { HudSpec } from "../types";
import { intl } from "../lib/i18n";

const nf1 = () => intl({ minimumFractionDigits: 1, maximumFractionDigits: 1 });

const label: React.CSSProperties = {
  fontFamily: FONT.sans,
  fontWeight: 600,
  fontSize: 22,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.92)",
  textShadow: COLOR.shadow,
};

export const Hud: React.FC<{ hud: HudSpec }> = ({ hud }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (hud.from != null && t < hud.from) return null;
  if (hud.until != null && t > hud.until) return null;
  const fadeIn = interpolate(t, [hud.from ?? 0, (hud.from ?? 0) + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const v = hud.value(t);
  const cmp = !hud.compare
    ? undefined
    : hud.compareDir === "down"
      ? [...hud.compare].sort((a, b) => b.at - a.at).filter((c) => Math.abs(v) <= c.at).pop()
      : [...hud.compare].sort((a, b) => a.at - b.at).filter((c) => Math.abs(v) >= c.at).pop();

  let pillText: string | null = null;
  if (hud.pill && t >= (hud.pill.startAt ?? 0) && t <= (hud.pill.stopAt ?? Infinity)) {
    const e = hud.pill.every;
    const left = e - (((t - (hud.pill.startAt ?? 0)) % e) + e) % e;
    pillText = hud.pill.text(nf1().format(left));
  }
  // Pille pulsiert kurz bei jeder Verdopplung
  const pulse = hud.pill ? Math.max(0, 1 - (((t - (hud.pill.startAt ?? 0)) % hud.pill.every) / 0.25)) : 0;

  let bar: number | null = null;
  if (hud.scaleBar) {
    const a = magnitude(hud.scaleBar.from), b = magnitude(hud.scaleBar.to);
    bar = clamp(invLerp(a, b, magnitude(v)));
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fadeIn }}>
      <div style={{ position: "absolute", left: LAYOUT.hudX, top: LAYOUT.hudY, width: 620 }}>
        <div style={label}>{hud.label}</div>
        <div
          style={{
            fontFamily: FONT.serif,
            fontSize: 96,
            lineHeight: 1.0,
            color: COLOR.text,
            textShadow: COLOR.shadow,
            marginTop: 6,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {hud.format(v)}
        </div>
        {cmp && <div style={{ ...label, fontSize: 20, marginTop: 10, color: "rgba(255,255,255,0.85)" }}>{cmp.text}</div>}
        {pillText && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
              padding: "7px 14px 7px 12px",
              borderRadius: 999,
              background: `rgba(10,20,24,${0.42 + pulse * 0.3})`,
              border: `1.5px solid rgba(111,242,208,${0.35 + pulse * 0.65})`,
              ...label,
              fontSize: 19,
            }}
          >
            <span style={{ width: 11, height: 11, borderRadius: 99, background: COLOR.accent, boxShadow: `0 0 ${6 + pulse * 14}px ${COLOR.accent}` }} />
            {pillText}
          </div>
        )}
        {hud.secondary && (
          <div style={{ ...label, fontSize: 19, marginTop: 12, color: "rgba(255,255,255,0.8)" }}>
            {hud.secondary.label} <span style={{ color: COLOR.text }}>{hud.secondary.format(hud.secondary.value(t))}</span>
          </div>
        )}
        {bar != null && (
          <div style={{ marginTop: 16, width: 300, height: 6, borderRadius: 6, background: "rgba(255,255,255,0.22)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${bar * 100}%`, borderRadius: 6, background: COLOR.accent, boxShadow: `0 0 10px ${COLOR.accent}` }} />
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: `${i * 10}%`, top: -3, width: 2, height: 12, background: "rgba(255,255,255,0.45)" }} />
            ))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
