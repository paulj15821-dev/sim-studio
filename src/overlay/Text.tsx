import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FONT, LAYOUT } from "../style/theme";
import type { Caption, Episode } from "../types";

/** Text mit hervorgehobenen Wörtern (Akzentfarbe). Groß/klein egal, Satzzeichen erlaubt. */
export const Highlighted: React.FC<{ text: string; highlight?: string[] }> = ({ text, highlight = [] }) => {
  if (!highlight.length) return <>{text}</>;
  const esc = highlight.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${esc.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        highlight.some((h) => h.toLowerCase() === p.toLowerCase()) ? (
          <span key={i} style={{ color: COLOR.accent }}>{p}</span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
};

/**
 * Hook: groß, fett, auf dunklen Textkästen (lesbar auf jedem Hintergrund), ab Bild 0 voll sichtbar
 * (Bild 0 = Vorschaubild beim Scrollen). Kurzer „Punch“ in den ersten Frames, Schlüsselwort in Mint.
 * `extra` = Sekunden, um die der Hook länger steht (Cold Open).
 */
export const Hook: React.FC<{ hook: Episode["hook"]; extra?: number }> = ({ hook, extra = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const until = ((hook.until ?? 2.6) + extra) * fps;
  if (frame > until) return null;
  const op = interpolate(frame, [until - 6, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const punch = interpolate(frame, [0, 2, 6], [1.06, 1.06, 1], { extrapolateRight: "clamp" });
  const size = hook.text.length > 62 ? 70 : hook.text.length > 48 ? 78 : 86;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: LAYOUT.hookY - 40,
          left: 70,
          right: 150,
          textAlign: "center",
          opacity: op,
          transform: `scale(${punch})`,
          transformOrigin: "50% 0%",
        }}
      >
        <span
          style={{
            fontFamily: FONT.sans,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.22,
            letterSpacing: "-0.025em",
            color: COLOR.text,
            background: "rgba(8, 11, 18, 0.72)",
            padding: "4px 20px",
            borderRadius: 16,
            boxDecorationBreak: "clone",
            WebkitBoxDecorationBreak: "clone",
          }}
        >
          <Highlighted text={hook.text} highlight={hook.highlight} />
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC<{ captions: Caption[]; duration: number }> = ({ captions, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sorted = [...captions].sort((a, b) => a.at - b.at);
  const idx = sorted.findIndex((c, i) => {
    const end = c.dur != null ? c.at + c.dur : sorted[i + 1]?.at ?? duration;
    return t >= c.at && t < end;
  });
  if (idx < 0) return null;
  const c = sorted[idx];
  const end = c.dur != null ? c.at + c.dur : sorted[idx + 1]?.at ?? duration;
  const local = frame - c.at * fps;
  const toEnd = end * fps - frame;
  const inOp = interpolate(local, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  const outOp = c.dur != null || !sorted[idx + 1] ? interpolate(toEnd, [0, 5], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const y = interpolate(local, [0, 7], [14, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: LAYOUT.captionY,
          left: (1080 - LAYOUT.captionMaxW) / 2,
          width: LAYOUT.captionMaxW,
          textAlign: "center",
          fontFamily: c.italic ? FONT.serifItalic : FONT.sans,
          fontStyle: c.italic ? "italic" : "normal",
          fontWeight: c.italic ? 400 : 750,
          fontSize: c.italic ? 66 : 56,
          lineHeight: 1.15,
          letterSpacing: c.italic ? "0" : "-0.015em",
          color: COLOR.text,
          textShadow: "0 0 3px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.8), 0 4px 22px rgba(0,0,0,0.55)",
          opacity: inOp * outOp,
          transform: `translateY(${y}px)`,
        }}
      >
        <Highlighted text={c.text} highlight={c.highlight} />
      </div>
    </AbsoluteFill>
  );
};
