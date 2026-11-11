// Deterministischer Zufall – NIE Math.random() benutzen (Remotion rendert Frames parallel).

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rng(seed: number) {
  const r = mulberry32(seed);
  return {
    next: r,
    range: (min: number, max: number) => min + (max - min) * r(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * r()),
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)],
    sign: () => (r() < 0.5 ? -1 : 1),
  };
}

/** Einfaches 3D-Value-Noise (deterministisch), Werte 0..1 */
function hash3(x: number, y: number, z: number, seed: number) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647 + seed * 144269504;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
export function noise3(x: number, y: number, z: number, seed = 1) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf
  );
}
export function fbm3(x: number, y: number, z: number, seed = 1, octaves = 4) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise3(x * f, y * f, z * f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / norm;
}
