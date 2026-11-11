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
    <mesh material={mat} scale={radius * 1.035}>
      <icosahedronGeometry args={[1, 5]} />
    </mesh>
  );
};

/** Low-poly-Erde mit Kontinenten, Eiskappen, Wolkenhülle und Atmosphäre. */
export const Earth: React.FC<{ radius?: number; position?: Vec3; rotationY?: number; clouds?: boolean; atmosphere?: boolean; night?: boolean; seed?: number; detail?: number; cloudHeight?: number }> = ({
  radius = 1, position = [0, 0, 0], rotationY = 0, clouds = true, atmosphere = true, night = false, seed = 3, detail = 5, cloudHeight = 0.015,
}) => {
  const ground = useMemo(
    () =>
      faceColored(1, detail, (d) => {
        const n = fbm3(d.x * 1.6 + 10, d.y * 1.6, d.z * 1.6, seed, 5);
        const lat = Math.abs(d.y);
        if (lat > 0.9) return new THREE.Color(PALETTE.earthIce);
        if (n < 0.5) return new THREE.Color(n > 0.46 ? PALETTE.earthSeaShallow : PALETTE.earthSea);
        if (night) return new THREE.Color(n > 0.56 && fbm3(d.x * 9, d.y * 9, d.z * 9, seed + 5, 2) > 0.55 ? "#FFD27A" : "#14202E");
        const idx = lat > 0.7 ? 3 : n > 0.62 ? 2 : n > 0.56 ? 1 : 0;
        return new THREE.Color(PALETTE.earthLand[idx]);
      }),
    [seed, detail, night]
  );
  const cloudGeo = useMemo(
    () => (clouds ? faceColored(1 + cloudHeight, 4, (d) => (fbm3(d.x * 3 + 4, d.y * 3, d.z * 3, seed + 99, 3) > 0.6 ? new THREE.Color("#FFFFFF") : null)) : null),
    [clouds, seed, cloudHeight]
  );
  return (
    <group position={position}>
      <group rotation={[0.41, rotationY, 0]} scale={radius}>
        <mesh geometry={ground} receiveShadow>
          <meshStandardMaterial vertexColors flatShading roughness={0.85} emissive={night ? "#FFD27A" : "#000000"} emissiveIntensity={night ? 0.0 : 0} />
        </mesh>
        {cloudGeo && (
          <mesh geometry={cloudGeo} rotation={[0, rotationY * 0.3, 0]}>
            <meshStandardMaterial vertexColors flatShading transparent opacity={0.88} roughness={1} depthWrite={false} />
          </mesh>
        )}
      </group>
      {atmosphere && <Atmosphere radius={radius} />}
    </group>
  );
};

export const Moon: React.FC<{ radius?: number; position?: Vec3; seed?: number }> = ({ radius = 1, position = [0, 0, 0], seed = 7 }) => {
  const geo = useMemo(
    () =>
      faceColored(1, 4, (d) => {
        const n = fbm3(d.x * 4, d.y * 4, d.z * 4, seed, 3);
        return new THREE.Color(n > 0.6 ? PALETTE.moon[1] : n < 0.4 ? PALETTE.moon[2] : PALETTE.moon[0]);
      }),
    [seed]
  );
  return (
    <mesh geometry={geo} position={position} scale={radius} castShadow receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
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
