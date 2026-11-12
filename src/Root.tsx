import React from "react";
import { Composition, Still } from "remotion";
import { ProfilePic, type ProfileVariant } from "./branding/ProfilePic";
import { Banner } from "./branding/Banner";
import { EPISODES } from "./episodes";
import { SimVideo } from "./SimVideo";
import { VIDEO } from "./style/theme";
import type { Episode } from "./types";
import { totalDuration } from "./lib/episode";

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
        durationInFrames={Math.round(totalDuration(ep) * VIDEO.fps)}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    ))}
    {/* Kanal-Branding (Standbilder, 1080×1080) */}
    {(["orbit", "studio", "schrift"] as ProfileVariant[]).map((v) => (
      <Still key={v} id={`Profilbild-${v}`} component={ProfilePic} defaultProps={{ variant: v }} width={1080} height={1080} />
    ))}
    <Still id="Banner" component={Banner} defaultProps={{ showSafe: false }} width={2560} height={1440} />
    <Still id="Banner-Sicherheitszone" component={Banner} defaultProps={{ showSafe: true }} width={2560} height={1440} />
    {/* Englische Kanäle */}
    {(["orbit", "studio", "schrift"] as ProfileVariant[]).map((v) => (
      <Still key={`en-${v}`} id={`Profilbild-${v}-en`} component={ProfilePic} defaultProps={{ variant: v, lang: "en" as const }} width={1080} height={1080} />
    ))}
    <Still id="Banner-en" component={Banner} defaultProps={{ showSafe: false, lang: "en" as const }} width={2560} height={1440} />
    <Still id="Banner-Sicherheitszone-en" component={Banner} defaultProps={{ showSafe: true, lang: "en" as const }} width={2560} height={1440} />
  </>
);
