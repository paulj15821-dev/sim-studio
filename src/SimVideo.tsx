import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { Episode } from "./types";
import { Hook, Captions } from "./overlay/Text";
import { Hud } from "./overlay/Hud";
import { Grade, TransitionFx } from "./overlay/Grade";
import { SoundLayer } from "./audio/SoundLayer";

/** Setzt eine Episode zusammen: aktiver Shot → Grading → HUD → Untertitel → Hook. */
export const SimVideo: React.FC<{ episode: Episode }> = ({ episode }) => {
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
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill
        key={`${i}-${shot.at}`}
        style={whip > 0 ? { filter: `blur(${whip * 18}px)`, transform: `translateY(${whip * -120}px) scale(${1 + whip * 0.06})` } : undefined}
      >
        {shot.render({ start: shot.at, end })}
      </AbsoluteFill>
      <Grade />
      {shots.map((s, k) =>
        s.transition === "flash" || s.transition === "dip" ? (
          <TransitionFx key={k} at={Math.round(s.at * fps)} kind={s.transition} />
        ) : null
      )}
      {episode.hud && <Hud hud={episode.hud} />}
      <Captions captions={episode.captions} duration={episode.duration} />
      <Hook hook={episode.hook} />
      <SoundLayer episode={episode} />
      {episode.music && <Audio src={staticFile(episode.music.src)} volume={episode.music.volume ?? 0.8} />}
    </AbsoluteFill>
  );
};
