import { useCurrentFrame, useVideoConfig } from "remotion";
import type { ShotInfo } from "../types";

/**
 * Zeit-Hook für Szenen. Funktioniert auch INNERHALB von <Stage> (ThreeCanvas),
 * weil der Remotion-Frame dorthin durchgereicht wird.
 *  t     = Sekunden seit Videostart (für Metriken/HUD-synchrone Dinge)
 *  local = Sekunden seit Shot-Start (für Kamerafahrten)
 *  p     = Fortschritt im Shot 0..1
 */
export function useTimes(shot?: ShotInfo) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const start = shot?.start ?? 0;
  const end = shot?.end ?? start + 1;
  const local = t - start;
  const p = Math.min(1, Math.max(0, local / Math.max(0.001, end - start)));
  return { t, local, p, frame, fps, dur: end - start };
}
