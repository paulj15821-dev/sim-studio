import React from "react";
import { Composition } from "remotion";
import { EPISODES } from "./episodes";
import { SimVideo } from "./SimVideo";
import { VIDEO } from "./style/theme";
import type { Episode } from "./types";

// Episoden enthalten Funktionen und JSX → nicht als Props serialisierbar.
// Darum bekommt jede Episode eine eigene, props-lose Komponente.
const cache = new Map<string, React.FC>();
const componentFor = (ep: Episode) => {
  if (!cache.has(ep.id)) {
    const C: React.FC = () => <SimVideo episode={ep} />;
    C.displayName = `Episode_${ep.id}`;
    cache.set(ep.id, C);
  }
  return cache.get(ep.id)!;
};

export const Root: React.FC = () => (
  <>
    {EPISODES.map((ep) => (
      <Composition
        key={ep.id}
        id={ep.id}
        component={componentFor(ep)}
        durationInFrames={Math.round(ep.duration * VIDEO.fps)}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    ))}
  </>
);
