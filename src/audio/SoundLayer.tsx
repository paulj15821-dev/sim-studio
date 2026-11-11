import React, { useMemo } from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import type { Episode } from "../types";
import { buildVoices, voiceGain } from "./sfx";

/** Spielt die komplette Tonspur (Atmos, Übergänge, HUD, Untertitel, Cues) einer Episode ab. */
export const SoundLayer: React.FC<{ episode: Episode }> = ({ episode }) => {
  const { fps } = useVideoConfig();
  const voices = useMemo(() => buildVoices(episode, fps), [episode, fps]);
  return (
    <>
      {voices.map((x, i) => {
        const from = Math.round(x.from * fps);
        const durF = x.dur != null ? Math.max(1, Math.round(x.dur * fps)) : undefined;
        return (
          <Sequence key={i} from={from} durationInFrames={durF} name={`sfx:${x.tag}:${x.sound}`} layout="none">
            <Audio
              src={staticFile(`sfx/${x.sound}.wav`)}
              loop={x.loop}
              playbackRate={x.rate}
              volume={(f) => (x.dur != null ? voiceGain(x, f / fps, x.dur) : x.volume)}
            />
          </Sequence>
        );
      })}
    </>
  );
};
