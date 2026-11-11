// Animations-Helfer. Alles ist eine Funktion der Zeit – kein useFrame, kein State.

export type Vec3 = [number, number, number];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const remap = (v: number, a: number, b: number, c: number, d: number) => lerp(c, d, invLerp(a, b, v));

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  sine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};
export type EaseName = keyof typeof ease;

/** Keyframes: [{t: Sekunden (lokal), v: Wert}] → interpolierter Wert */
export type Key<T> = { t: number; v: T; ease?: EaseName };
export function keys(k: Key<number>[], time: number): number {
  if (time <= k[0].t) return k[0].v;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (time <= b.t) return lerp(a.v, b.v, ease[b.ease ?? "inOut"](invLerp(a.t, b.t, time)));
  }
  return k[k.length - 1].v;
}
export function keys3(k: Key<Vec3>[], time: number): Vec3 {
  if (time <= k[0].t) return k[0].v;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (time <= b.t) return lerp3(a.v, b.v, ease[b.ease ?? "inOut"](invLerp(a.t, b.t, time)));
  }
  return k[k.length - 1].v;
}

/** Farb-Interpolation über Stopps (z. B. Himmel nach Höhe). */
export function hexToRgb(h: string): Vec3 {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]: Vec3) {
  return "#" + [r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("");
}
export function colorStops(stops: { at: number; c: string }[], v: number) {
  if (v <= stops[0].at) return stops[0].c;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (v <= b.at) return rgbToHex(lerp3(hexToRgb(a.c), hexToRgb(b.c), invLerp(a.at, b.at, v)));
  }
  return stops[stops.length - 1].c;
}
export function mixHex(a: string, b: string, t: number) {
  return rgbToHex(lerp3(hexToRgb(a), hexToRgb(b), clamp(t)));
}

/** Kamerawackeln, deterministisch */
export function shake(time: number, amp: number, freq = 9): Vec3 {
  const s = (o: number) => Math.sin(time * freq + o) * 0.6 + Math.sin(time * freq * 2.3 + o * 1.7) * 0.4;
  return [s(0) * amp, s(2.1) * amp, s(4.2) * amp * 0.5];
}
