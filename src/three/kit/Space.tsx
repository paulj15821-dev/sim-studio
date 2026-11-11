import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { fbm3, rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";
import { Box, Flat } from "./materials";

function faceColored(radius: number, detail: number, colorOf: (dir: THREE.Vector3) => THREE.Color | null) {
  const g = new THREE.IcosahedronGeometry(radius, detail); // nicht-indiziert
  const pos = g.attributes.position as THREE.BufferAttribute;
  const keepPos: number[] = [], cols: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const centroid = a.clone().add(b).add(c).divideScalar(3).normalize();
    const col = colorOf(centroid);
    if (!col) continue;
    for (const v of [a, b, c]) { keepPos.push(v.x, v.y, v.z); cols.push(col.r, col.g, col.b); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(keepPos, 3));
  out.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  out.computeVertexNormals();
  return out;
}

/** Atmosphären-Leuchten (Fresnel). Funktioniert mit logarithmischem Tiefenpuffer. */
export const Atmosphere: React.FC<{ radius: number; color?: string; power?: number; strength?: number }> = ({ radius, color = "#6FB7FF", power = 2.6, strength = 1.25 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) }, uPow: { value: power }, uStr: { value: strength } },
        vertexShader: `
          #include <common>
          #include <logdepthbuf_pars_vertex>
          varying vec3 vN; varying vec3 vV;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
            #include <logdepthbuf_vertex>
          }`,
        fragmentShader: `
          #include <logdepthbuf_pars_fragment>
          uniform vec3 uColor; uniform float uPow; uniform float uStr;
          varying vec3 vN; varying vec3 vV;
          void main(){
            #include <logdepthbuf_fragment>
            float f = pow(1.0 - abs(dot(vN, vV)), uPow) * uStr;
            gl_FragColor = vec4(uColor * f, f);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      }),
    [color, power, strength]
  );
  return (
    <mesh material={mat} scale={radius * 1.025}>
      <sphereGeometry args={[1, 256, 128]} />
    </mesh>
  );
};

/** Low-poly-Erde mit Kontinenten, Eiskappen, Wolkenhülle und Atmosphäre. */
// ───────────── Planeten-Texturen (prozedural, einmal pro Tab berechnet) ─────────────

type RGB = [number, number, number];
const hex = (h: string): RGB => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Ruft fn(dir) für jedes Pixel einer Equirect-Textur auf (passend zu THREE.SphereGeometry-UVs). */
function equirect(w: number, h: number, fn: (x: number, y: number, z: number, lat: number) => [number, number, number, number]) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    const theta = ((j + 0.5) / h) * Math.PI;
    const st = Math.sin(theta), y = Math.cos(theta);
    for (let i = 0; i < w; i++) {
      const phi = ((i + 0.5) / w) * Math.PI * 2;
      const x = -Math.cos(phi) * st, z = Math.sin(phi) * st;
      const o = (j * w + i) * 4;
      const v = fn(x, y, z, y);
      img.data[o] = v[0]; img.data[o + 1] = v[1]; img.data[o + 2] = v[2]; img.data[o + 3] = v[3];
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

const planetCache = new Map<string, any>();

// GLSL-Rauschen (Value-Noise + fbm) für prozedurale Planeten – auflösungsunabhängig, keine CPU-Kosten.
const NOISE_GLSL = /* glsl */ `
  float pHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float pNoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(pHash(i), pHash(i + vec3(1,0,0)), f.x), mix(pHash(i + vec3(0,1,0)), pHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(pHash(i + vec3(0,0,1)), pHash(i + vec3(1,0,1)), f.x), mix(pHash(i + vec3(0,1,1)), pHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float pFbm(vec3 p, int oct){ float v = 0.0, a = 0.5, n = 0.0; for (int i = 0; i < 10; i++){ if (i >= oct) break; v += a * pNoise(p); n += a; a *= 0.5; p = p * 2.03 + vec3(1.7, 9.2, 3.1); } return v / n; }
`;

/** Erde komplett im Shader: Kontinente, Klimazonen, Gebirge, Eis; Ozean glänzt (niedrige Rauheit). */
function earthMaterial(seed: number, night: boolean) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSeed = { value: seed * 1.37 };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vObj; uniform float uSeed; float eWater;
        ${NOISE_GLSL}
        vec3 earthCol(vec3 d){
          vec3 o = vec3(uSeed, uSeed * 0.7, uSeed * 1.3);
          float n = pFbm(d * 1.6 + o, 9);
          float det = pFbm(d * 22.0 + o, 4);
          float lat = abs(d.y);
          eWater = 1.0 - smoothstep(0.495, 0.505, n);
          vec3 deep = vec3(0.012, 0.045, 0.11), mid = vec3(0.02, 0.10, 0.22), shallow = vec3(0.04, 0.24, 0.32);
          float t = smoothstep(0.36, 0.5, n);
          vec3 sea = t < 0.8 ? mix(deep, mid, t / 0.8) : mix(mid, shallow, (t - 0.8) / 0.2);
          float h = (n - 0.5) / 0.2 + (det - 0.5) * 0.4;
          float arid = smoothstep(0.12, 0.32, lat) * (1.0 - smoothstep(0.38, 0.5, lat));
          float wet = pFbm(d * 3.0 + o + 5.0, 4);
          vec3 green = vec3(0.10, 0.20, 0.05), forest = vec3(0.03, 0.10, 0.03), dry = vec3(0.42, 0.33, 0.16), desert = vec3(0.62, 0.47, 0.25);
          vec3 rock = vec3(0.24, 0.20, 0.16), snow = vec3(0.86, 0.89, 0.92), tundra = vec3(0.20, 0.22, 0.14), sand = vec3(0.60, 0.52, 0.34);
          vec3 land = mix(green, forest, smoothstep(0.45, 0.65, wet));
          land = mix(land, mix(dry, desert, det), smoothstep(0.35, 0.75, arid + (0.5 - wet) * 0.8));
          land = mix(land, tundra, smoothstep(0.62, 0.8, lat));
          land = mix(land, rock, smoothstep(0.55, 0.9, h));
          land = mix(land, snow, smoothstep(0.95, 1.15, h));
          land = mix(sand, land, smoothstep(0.0, 0.012, n - 0.5));
          land *= 0.8 + det * 0.4;
          vec3 c = mix(land, sea, eWater);
          float ice = smoothstep(0.88, 0.91, lat + (det - 0.5) * 0.06);
          c = mix(c, snow, ice); eWater *= 1.0 - ice;
          return c;
        }`
      )
      .replace("#include <map_fragment>", `#include <map_fragment>\n diffuseColor.rgb = earthCol(normalize(vObj))${night ? " * vec3(0.1, 0.12, 0.18)" : ""};`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(0.92, 0.32, eWater);");
  };
  m.customProgramCacheKey = () => `earth-${night}`;
  return m;
}

/** Wolkenhülle im Shader (Wirbel, Bänder) */
function cloudMaterial(seed: number) {
  const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 1, transparent: true, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSeed = { value: seed * 2.11 };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vObj; uniform float uSeed;\n${NOISE_GLSL}`)
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        { vec3 d = normalize(vObj); vec3 o = vec3(uSeed);
          vec3 w = vec3(pFbm(d * 2.0 + o, 3), pFbm(d * 2.0 + o + 4.0, 3), pFbm(d * 2.0 + o + 8.0, 3)) * 2.2;
          float n = pFbm(vec3(d.x * 3.2, d.y * 6.0, d.z * 3.2) + w + o, 10);
          float band = 0.08 * cos(abs(d.y) * 9.42);
          float fine = pFbm(d * 40.0 + o, 5);
          diffuseColor.a *= smoothstep(0.57, 0.68, n + band + (fine - 0.5) * 0.25) * 0.97; }`
      );
  };
  m.customProgramCacheKey = () => "earth-clouds";
  return m;
}

function moonTexture(seed: number) {
  const key = `moon${seed}`;
  if (planetCache.has(key)) return planetCache.get(key);
  const r = rng(seed);
  const craters = Array.from({ length: 140 }).map(() => {
    const u = r.range(-1, 1), th = r.range(0, Math.PI * 2), s = Math.sqrt(1 - u * u);
    return { d: [Math.cos(th) * s, u, Math.sin(th) * s], rad: Math.pow(r.next(), 3) * 0.22 + 0.015 };
  });
  const light = hex("#BDB8AE"), dark = hex("#6E6C68"), mare = hex("#57575A");
  const c = equirect(1024, 512, (x, y, z) => {
    const n = fbm3(x * 2.2, y * 2.2, z * 2.2, seed, 5);
    const d = fbm3(x * 14, y * 14, z * 14, seed + 4, 3);
    let col = mix(light, dark, sstep(0.35, 0.7, d));
    col = mix(col, mare, sstep(0.52, 0.6, n) * 0.85); // dunkle „Meere“
    let shade = 0;
    for (const cr of craters) {
      const dot = x * cr.d[0] + y * cr.d[1] + z * cr.d[2];
      const ang = Math.acos(Math.min(1, dot));
      if (ang > cr.rad * 1.3) continue;
      const q = ang / cr.rad;
      shade += q < 0.85 ? -0.12 * (1 - q) : q < 1.1 ? 0.22 : 0; // Mulde + heller Rand
    }
    col = [col[0] * (1 + shade), col[1] * (1 + shade), col[2] * (1 + shade)];
    return [Math.min(255, col[0]), Math.min(255, col[1]), Math.min(255, col[2]), 255];
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const out = { map: t };
  planetCache.set(key, out);
  return out;
}

/** `tilt` = Achsneigung (rad) um X. Achtung: bei 0,41 liegt der Pol fast genau oben (+Y) –
 *  wer von oben auf die Erde schaut (z. B. Aufzug), sollte ~0,9 nehmen, sonst sieht man nur Eis/Tundra.
 *  `lowpoly` = alter Facetten-Look. Standard ist die realistische, texturierte Erde. */
export const Earth: React.FC<{ radius?: number; position?: Vec3; rotationY?: number; tilt?: number; clouds?: boolean; atmosphere?: boolean; night?: boolean; seed?: number; detail?: number; cloudHeight?: number; lowpoly?: boolean }> = ({
  radius = 1, position = [0, 0, 0], rotationY = 0, tilt = 0.41, clouds = true, atmosphere = true, night = false, seed = 3, detail = 5, cloudHeight = 0.015, lowpoly = false,
}) => {
  const ground = useMemo(
    () =>
      lowpoly
        ? faceColored(1, detail, (d) => {
            const n = fbm3(d.x * 1.6 + 10, d.y * 1.6, d.z * 1.6, seed, 5);
            const lat = Math.abs(d.y);
            if (lat > 0.9) return new THREE.Color(PALETTE.earthIce);
            if (n < 0.5) return new THREE.Color(n > 0.46 ? PALETTE.earthSeaShallow : PALETTE.earthSea);
            if (night) return new THREE.Color(n > 0.56 && fbm3(d.x * 9, d.y * 9, d.z * 9, seed + 5, 2) > 0.55 ? "#FFD27A" : "#14202E");
            const idx = lat > 0.7 ? 3 : n > 0.62 ? 2 : n > 0.56 ? 1 : 0;
            return new THREE.Color(PALETTE.earthLand[idx]);
          })
        : null,
    [seed, detail, night, lowpoly]
  );
  const mats = useMemo(() => (lowpoly ? null : { ground: earthMaterial(seed, night), clouds: cloudMaterial(seed) }), [seed, night, lowpoly]);
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 384, 192), []);
  const cloudGeo = useMemo(
    () => (clouds && lowpoly ? faceColored(1 + cloudHeight, 4, (d) => (fbm3(d.x * 3 + 4, d.y * 3, d.z * 3, seed + 99, 3) > 0.6 ? new THREE.Color("#FFFFFF") : null)) : null),
    [clouds, seed, cloudHeight, lowpoly]
  );
  return (
    <group position={position}>
      <group rotation={[tilt, rotationY, 0]} scale={radius}>
        {ground ? (
          <mesh geometry={ground} receiveShadow>
            <meshStandardMaterial vertexColors flatShading roughness={0.85} />
          </mesh>
        ) : (
          <mesh geometry={sphere} material={mats!.ground} />
        )}
        {cloudGeo && (
          <mesh geometry={cloudGeo} rotation={[0, rotationY * 0.3, 0]}>
            <meshStandardMaterial vertexColors flatShading transparent opacity={0.88} roughness={1} depthWrite={false} />
          </mesh>
        )}
        {clouds && mats && <mesh geometry={sphere} material={mats.clouds} scale={1 + Math.max(cloudHeight, 0.0012)} rotation={[0, rotationY * 0.3, 0]} />}
      </group>
      {atmosphere && <Atmosphere radius={radius} />}
    </group>
  );
};

export const Moon: React.FC<{ radius?: number; position?: Vec3; seed?: number; lowpoly?: boolean }> = ({ radius = 1, position = [0, 0, 0], seed = 7, lowpoly = false }) => {
  const geo = useMemo(
    () =>
      lowpoly
        ? faceColored(1, 4, (d) => {
            const n = fbm3(d.x * 4, d.y * 4, d.z * 4, seed, 3);
            return new THREE.Color(n > 0.6 ? PALETTE.moon[1] : n < 0.4 ? PALETTE.moon[2] : PALETTE.moon[0]);
          })
        : new THREE.SphereGeometry(1, 128, 64),
    [seed, lowpoly]
  );
  const tex = useMemo(() => (lowpoly ? null : moonTexture(seed)), [seed, lowpoly]);
  return (
    <mesh geometry={geo} position={position} scale={radius} castShadow receiveShadow>
      {tex ? <meshStandardMaterial map={tex.map} roughness={1} envMapIntensity={0.2} /> : <meshStandardMaterial vertexColors flatShading roughness={1} />}
    </mesh>
  );
};

/** Sonne/Lichtquelle als leuchtender Glow (Sprite) */
export const SunGlow: React.FC<{ position: Vec3; size: number; color?: string; opacity?: number }> = ({ position, size, color = PALETTE.sun, opacity = 1 }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.18, "rgba(255,250,235,0.95)");
    grd.addColorStop(0.4, "rgba(255,230,190,0.35)");
    grd.addColorStop(1, "rgba(255,220,170,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={tex} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
    </sprite>
  );
};

/** Raumstation (ISS-artig) */
export const SpaceStation: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1.2, 1.2, 16, 10]} /><Flat color="#E6E9EE" /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[1, 1, 8, 10]} /><Flat color="#D2D6DC" /></mesh>
    <Box size={[34, 0.5, 0.5]} color="#8B95A1" />
    {[-15, -10, 10, 15].map((x) =>
      [-1, 1].map((s) => <Box key={`${x}${s}`} size={[4, 0.1, 9]} color="#C08A2E" position={[x, 0, s * 5.5]} emissive="#3A2208" />)
    )}
  </group>
);

export const Satellite: React.FC<{ position?: Vec3; rotation?: Vec3; scale?: number }> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <Box size={[1.6, 1.6, 2.2]} color="#D9B44A" />
    <Box size={[7, 0.08, 1.6]} color="#2B4C8C" emissive="#0A1830" />
    <mesh position={[0, 1.2, 0]}><coneGeometry args={[0.7, 0.6, 10, 1, true]} /><Flat color="#E6E9EE" side={THREE.DoubleSide} /></mesh>
  </group>
);

/** Umlaufbahn als dünner Ring */
export const OrbitRing: React.FC<{ radius: number; color?: string; opacity?: number; position?: Vec3; tilt?: number }> = ({ radius, color = "#FFFFFF", opacity = 0.5, position = [0, 0, 0], tilt = 0 }) => (
  <mesh position={position} rotation={[Math.PI / 2 + tilt, 0, 0]}>
    <torusGeometry args={[radius, radius * 0.002, 4, 160]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
  </mesh>
);

/** Erdquerschnitt (Kruste, Mantel, äußerer & innerer Kern) – für Grab-/Bohr-Prämissen */
export const EarthCrossSection: React.FC<{ radius?: number; position?: Vec3; rotationY?: number; glow?: number }> = ({ radius = 1, position = [0, 0, 0], rotationY = 0, glow = 1 }) => {
  const layers = [
    { r: 1.0, c: "#8C6A4A" },
    { r: 0.985, c: "#E07A2E" },
    { r: 0.55, c: "#F2A03A" },
    { r: 0.19, c: "#FFE9A8" },
  ];
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={radius}>
      {/* hintere Halbkugel (Ozean/Land), Schnittfläche zeigt nach +z zur Kamera */}
      <mesh rotation={[0, Math.PI, 0]}>
        <sphereGeometry args={[1, 40, 24, 0, Math.PI]} />
        <meshStandardMaterial color={PALETTE.earthSea} flatShading roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {layers.map((l, i) => (
        <mesh key={i} position={[0, 0, 0.001 * (i + 1)]}>
          <circleGeometry args={[l.r, 48]} />
          <meshStandardMaterial color={l.c} flatShading emissive={l.c} emissiveIntensity={i === 0 ? 0 : 0.25 * glow * i} />
        </mesh>
      ))}
    </group>
  );
};
