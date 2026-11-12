import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { Episode } from "./types";
import { Hook, Captions } from "./overlay/Text";
import { Hud } from "./overlay/Hud";
import { Grade, TransitionFx } from "./overlay/Grade";
import { SoundLayer } from "./audio/SoundLayer";
import { coldOpenDur } from "./lib/episode";
import { langOfId, setLang } from "./lib/i18n";

/** Der jeweils aktive Shot (nach Episodenzeit) inkl. Whip-Übergang. */
const ShotView: React.FC<{ episode: Episode }> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const shots = [...episode.shots].sort((a, b) => a.at - b.at);
  let i = 0;
  for (let k = 0; k < shots.length; k++) if (t >= shots[k].at) i = k;
  const shot = shots[i];
  const end = shots[i + 1]?.at ?? episode.duration;
  const shotStartFrame = Math.round(shot.at * fps);
  // Whip: kurzer Bewegungsunschärfe-Schwenk in den neuen Shot
  const whip = shot.transition === "whip" ? interpolate(frame, [shotStartFrame, shotStartFrame + 6], [1, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill
      key={`${i}-${shot.at}`}
      style={whip > 0 ? { filter: `blur(${whip * 18}px)`, transform: `translateY(${whip * -120}px) scale(${1 + whip * 0.06})` } : undefined}
    >
      {shot.render({ start: shot.at, end })}
    </AbsoluteFill>
  );
};

/** Rückspul-Effekt am Ende des Cold Opens: Blitz + Bildzeilen-Verzerrung */
const RewindFx: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const d = frame - at;
  if (d < -5 || d > 7) return null;
  const flash = d < 0 ? interpolate(d, [-5, 0], [0, 0.9]) : interpolate(d, [0, 7], [0.9, 0]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "#FFFFFF", opacity: flash }} />
      <AbsoluteFill
        style={{
          opacity: flash * 0.6,
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 3px, rgba(255,255,255,0) 3px, rgba(255,255,255,0) 9px)",
          transform: `translateY(${(d * 37) % 9}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Setzt eine Episode zusammen: (Cold Open →) aktiver Shot → Grading → HUD → Untertitel → Hook + Ton.
 * layers: "all" = alles (Standard) · "scene" = nur 3D + Übergänge + Ton (sprachneutral, wird einmal gerendert)
 *         "text" = fertiges Szenen-Video (`baseSrc` in public/) + Texte der jeweiligen Sprache darüber.
 * Die Sprache kommt aus der Composition-ID („…-EN“ = Englisch).
 */
export const SimVideo: React.FC<{ episode: Episode; layers?: "all" | "scene" | "text"; baseSrc?: string }> = ({ episode, layers = "all", baseSrc }) => {
  const { fps, id } = useVideoConfig();
  setLang(langOfId(id));
  const coF = Math.round(coldOpenDur(episode) * fps);
  const shots = episode.shots;
  const scene = layers !== "text";
  const text = layers !== "scene";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {!scene && baseSrc && <OffthreadVideo src={staticFile(baseSrc)} />}
      {/* Cold Open: Höhepunkt zeigen (Episodenzeit ab coldOpen.at) */}
      {scene && coF > 0 && episode.coldOpen && (
        <Sequence from={-Math.round(episode.coldOpen.at * fps)} durationInFrames={Math.round(episode.coldOpen.at * fps) + coF} name="Cold Open">
          <ShotView episode={episode} />
          <Grade />
        </Sequence>
      )}
      {/* Hauptteil */}
      <Sequence from={coF} durationInFrames={Math.round(episode.duration * fps)} name="Episode">
        {scene && <ShotView episode={episode} />}
        {scene && <Grade />}
        {scene && shots.map((s, k) =>
          s.transition === "flash" || s.transition === "dip" ? <TransitionFx key={k} at={Math.round(s.at * fps)} kind={s.transition} /> : null
        )}
        {text && episode.hud && (Array.isArray(episode.hud) ? episode.hud : [episode.hud]).map((h, k) => <Hud key={k} hud={h} />)}
        {text && <Captions captions={episode.captions} duration={episode.duration} />}
      </Sequence>
      {scene && coF > 0 && <RewindFx at={coF} />}
      {text && <Hook hook={episode.hook} extra={coF / fps} />}
      {scene && <SoundLayer episode={episode} />}
      {scene && episode.music && <Audio src={staticFile(episode.music.src)} volume={episode.music.volume ?? 0.8} />}
    </AbsoluteFill>
  );
};
