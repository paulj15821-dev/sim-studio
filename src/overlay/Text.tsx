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

export const Hook: React.FC<{ hook: Episode["hook"] }> = ({ hook }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const until = (hook.until ?? 2.6) * fps;
  const op = interpolate(frame, [0, 3, until - 6, until], [0.0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame > until) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: LAYOUT.hookY,
          left: 90,
          right: 90,
          textAlign: "center",
          fontFamily: FONT.serif,
          fontSize: 76,
          lineHeight: 1.08,
          color: COLOR.text,
          textShadow: COLOR.shadow,
          opacity: op,
          letterSpacing: "-0.01em",
        }}
      >
        <Highlighted text={hook.text} highlight={hook.highlight} />
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
          fontFamily: c.italic ? FONT.serifItalic : FONT.serif,
          fontStyle: c.italic ? "italic" : "normal",
          fontSize: 58,
          lineHeight: 1.12,
          color: COLOR.text,
          textShadow: COLOR.shadow,
          opacity: inOp * outOp,
          transform: `translateY(${y}px)`,
        }}
      >
        <Highlighted text={c.text} highlight={c.highlight} />
      </div>
    </AbsoluteFill>
  );
};
