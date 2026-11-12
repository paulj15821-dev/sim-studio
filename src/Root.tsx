import React from "react";
import { Composition, Folder, Still } from "remotion";
import { ProfilePic, type ProfileVariant } from "./branding/ProfilePic";
import { Banner } from "./branding/Banner";
import { EPISODES } from "./episodes";
import { SimVideo } from "./SimVideo";
import { VIDEO } from "./style/theme";
import type { Episode } from "./types";
import { localize, totalDuration } from "./lib/episode";

// Episoden enthalten Funktionen und JSX → nicht als Props serialisierbar.
// Darum bekommt jede Episode eine eigene, props-lose Komponente.
type Layers = "all" | "scene" | "text";
const cache = new Map<string, React.FC>();
const componentFor = (ep: Episode, key: string, layers: Layers = "all", baseSrc?: string) => {
  if (!cache.has(key)) {
    const C: React.FC = () => <SimVideo episode={ep} layers={layers} baseSrc={baseSrc} />;
    C.displayName = `Episode_${key}`;
    cache.set(key, C);
  }
  return cache.get(key)!;
};

/**
 * Pro Episode:  <Id> (deutsch), <Id>-EN (englisch, falls `en` vorhanden) – komplette Videos.
 * Render-Schichten (für npm run render, spart die doppelte 3D-Renderzeit):
 *   <Id>-SCENE (3D + Ton, ohne Text) → public/_base/<Id>-SCENE.mp4
 *   <Id>-TEXT / <Id>-EN-TEXT (Szenen-Video + Texte der Sprache)
 *   <Id>-EN-SCENE nur bei `sceneText: true` (Text in der 3D-Welt ist sprachabhängig)
 */
const comp = (id: string, ep: Episode, layers: Layers = "all", baseSrc?: string) => (
  <Composition
    key={id}
    id={id}
    component={componentFor(ep, id, layers, baseSrc)}
    durationInFrames={Math.round(totalDuration(ep) * VIDEO.fps)}
    fps={VIDEO.fps}
    width={VIDEO.width}
    height={VIDEO.height}
  />
);

export const Root: React.FC = () => (
  <>
    {EPISODES.map((ep) => comp(ep.id, ep))}
    {EPISODES.filter((ep) => ep.en).map((ep) => comp(`${ep.id}-EN`, localize(ep, "en")))}
    <Folder name="Render-Schichten">
      {EPISODES.map((ep) => comp(`${ep.id}-SCENE`, ep, "scene"))}
      {EPISODES.filter((ep) => ep.en && ep.sceneText).map((ep) => comp(`${ep.id}-EN-SCENE`, ep, "scene"))}
      {EPISODES.map((ep) => comp(`${ep.id}-TEXT`, ep, "text", `_base/${ep.id}-SCENE.mp4`))}
      {EPISODES.filter((ep) => ep.en).map((ep) =>
        comp(`${ep.id}-EN-TEXT`, localize(ep, "en"), "text", `_base/${ep.id}-${ep.sceneText ? "EN-" : ""}SCENE.mp4`)
      )}
    </Folder>
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
