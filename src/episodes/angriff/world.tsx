// Szenen für „Was wäre, wenn Deutschland angegriffen wird?“
//  Bedroom     – 03:12 Uhr, Max' Handy schrillt (Warnstufe „Extreme Gefahr“)
//  Street/Sky  – Wohnviertel bei Nacht (Hometown aus asteroid) + Sirenenmast + Abfang-Spuren am Himmel
//  BunkerScene – öffentlicher Schutzraum mit Schlange
//  Count176    – 176 Menschen, nur einer hat einen Schutzraumplatz
//  Cellar      – Max' Keller
//  Parliament  – Parlamentsgebäude mit Glaskuppel am Morgen
//  EarthNato   – Erde bei Nacht, Bündnis-Ringe (Artikel 5)
//  Airbase     – Kampfjet startet
//  Market      – leerer Supermarkt
//  Truck       – Militär-Lkw (für Hometown-Extra)
import React, { useMemo } from "react";
import * as THREE from "three";
import { COLOR, FONT, PALETTE } from "../../style/theme";
import { clamp, keys3, lerp, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glow, Glass, Max, Person, Building, StreetLamp, Tree, Bush, Cloud,
  SkyDome, Stars, Earth, SunGlow, Particles, Instanced, Bed, Shelf, Crowd, Birds, Car, type Pose,
} from "../../three/kit";

export type Cam = { pos: Vec3; look: Vec3; fov?: number };
export type CamFn = (c: { t: number; local: number; p: number }) => Cam;
export const move = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p }) => ({
  pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], p),
  look: keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la }], p),
  fov,
});

const pulse = (t: number, f = 2.2) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * f);

// ═════════════════════════ Schild mit Text (Canvas-Textur) ═════════════════════════

export const TextPlate: React.FC<{ text: string; w: number; h: number; position?: Vec3; rotation?: Vec3; bg?: string; fg?: string; glow?: number; weight?: number }> = ({
  text, w, h, position, rotation, bg = "#2F7A4A", fg = "#FFFFFF", glow = 0, weight = 800,
}) => {
  const tex = useMemo(() => {
    const W = 1024, H = Math.max(64, Math.round((1024 * h) / w));
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = fg; g.lineWidth = H * 0.06; g.strokeRect(H * 0.08, H * 0.08, W - H * 0.16, H - H * 0.16);
    g.fillStyle = fg;
    g.textAlign = "center"; g.textBaseline = "middle";
    let size = H * 0.56;
    g.font = `${weight} ${size}px ${FONT.sans}`;
    while (g.measureText(text).width > W * 0.86 && size > 8) { size *= 0.94; g.font = `${weight} ${size}px ${FONT.sans}`; }
    g.fillText(text, W / 2, H / 2 + size * 0.04);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [text, w, h, bg, fg, weight]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} emissiveMap={tex} emissive={glow > 0 ? "#FFFFFF" : "#000000"} emissiveIntensity={glow} roughness={0.6} />
    </mesh>
  );
};

// ═════════════════════════ Schlafzimmer ═════════════════════════

export const Bedroom: React.FC<{ shot: ShotInfo; cam: CamFn }> = ({ shot, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const pl = pulse(t, 2.4);
  const W = 5.2, H = 2.7, D = 5;
  return (
    <Stage preset="night" bg="#0A1022" fog={null} sunDir={[-6, 5, -3]} sunIntensity={0.35} env={["#141C3A", "#2A3060", "#0A0A12"]} envIntensity={0.45} shadowCenter={[0, 1, -1]} shadowSize={5} aoRadius={0.4} bloom={0.7}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.05} far={2000} />
      {/* Raum */}
      <Box size={[W, 0.1, D]} color="#8A6A50" position={[0, -0.05, -0.5]} cast={false} />
      <Box size={[W, H, 0.15]} color="#5E6A86" position={[0, H / 2, -D / 2 - 0.5]} />
      <Box size={[0.15, H, D]} color="#56607C" position={[W / 2, H / 2, -0.5]} />
      {/* linke Wand mit Fenster */}
      <Box size={[0.15, H, 1.6]} color="#56607C" position={[-W / 2, H / 2, -2.2]} />
      <Box size={[0.15, H, 1.8]} color="#56607C" position={[-W / 2, H / 2, 1.1]} />
      <Box size={[0.15, 0.9, 1.6]} color="#56607C" position={[-W / 2, 0.45, -0.6]} />
      <Box size={[0.15, 0.5, 1.6]} color="#56607C" position={[-W / 2, H - 0.25, -0.6]} />
      <Box size={[0.2, 0.06, 1.6]} color="#DDE2EA" position={[-W / 2, 0.92, -0.6]} />
      <Box size={[W, 0.1, D]} color="#4A5470" position={[0, H + 0.05, -0.5]} cast={false} />
      {/* draußen */}
      <SkyDome top="#060A1E" horizon="#22305E" bottom="#0A0E1C" radius={900} />
      <Stars n={500} radius={850} opacity={0.9} />
      {[[-60, -6, -40], [-80, -8, 10], [-70, -10, -80]].map((b, i) => <Building key={i} position={b as Vec3} size={[14, 22, 14]} seed={120 + i} lit />)}
      {/* Bett, Nachttisch */}
      <Bed position={[0.2, 0, -1.4]} sheet="#7E8FC0" />
      <Box size={[1.5, 0.28, 1.25]} color="#7E8FC0" position={[0.2, 0.74, -0.25]} />
      <Box size={[0.5, 0.5, 0.45]} color="#A9805A" position={[-1.05, 0.25, -2.0]} />
      <mesh position={[-1.05, 0.7, -2.0]}><cylinderGeometry args={[0.1, 0.14, 0.32, 10]} /><Flat color="#E8DCC8" /></mesh>
      <Shelf position={[2.2, 0, -2.5]} width={1.2} />
      <Box size={[1.1, 0.7, 0.04]} color="#2A2D33" position={[1.6, 1.6, -2.5]} />
      {/* Max sitzt im Bett, Handy schreit rot */}
      <Max pose="sit" time={t} position={[0.2, 0.18, -1.0]} rotationY={0} expression="shock" hold="phone" screen="#FF3B30"
        joints={{ rArmX: -1.35, rArmZ: 0.3, lArmX: -1.0, lArmZ: -0.25, headX: 0.25 }} />
      <pointLight position={[0.3, 1.35, -0.3]} intensity={0.5 + pl * 1.3} distance={2.6} decay={2} color="#FF4A3A" />
      <pointLight position={[-3.2, 2.0, -0.6]} intensity={3} distance={9} decay={2} color="#6F86D8" />
      <Particles kind="dust" n={60} box={[3, 2, 3]} center={[0, 1.4, -0.8]} time={t} velocity={[0.05, 0.02, 0]} sizeScale={0.4} opacity={0.5} seed={5} />
    </Stage>
  );
};

// ═════════════════════════ Sirene + Abfang-Spuren (Extras für Hometown) ═════════════════════════

/** Elektronische Sirene auf Mast, mit Schallringen */
export const SirenMast: React.FC<{ position: Vec3; t: number; on: boolean; h?: number }> = ({ position, t, on, h = 9 }) => (
  <group position={position}>
    <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, h, 8]} /><Flat color={PALETTE.steel} roughness={0.45} metalness={0.4} /></mesh>
    {[0, 1, 2].map((k) => (
      <group key={k} position={[0, h + 0.3 + k * 0.62, 0]} rotation={[0, k * 0.5, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <Box size={[0.5, 0.5, 0.5]} color="#C9CED4" position={[0, 0, 0.3]} roughness={0.4} />
            <Box size={[0.38, 0.38, 0.05]} color="#2A2D33" position={[0, 0, 0.56]} cast={false} />
          </group>
        ))}
      </group>
    ))}
    {h > 5 && <Box size={[0.3, 0.6, 0.25]} color="#9AA2AA" position={[0, 1.4, 0.2]} />}
    {on && [0, 1, 2, 3].map((i) => {
      const ph = ((t * 0.9 + i * 0.25) % 1);
      return (
        <mesh key={i} position={[0, h + 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8 + ph * 7, 0.95 + ph * 7.3, 64]} />
          <Glow color="#FFE6C8" opacity={0.3 * (1 - ph)} side={THREE.DoubleSide} />
        </mesh>
      );
    })}
  </group>
);

/** Quadratische Bezierkurve */
const bez = (a: Vec3, b: Vec3, c: Vec3, u: number): Vec3 => {
  const v = 1 - u;
  return [v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1], v * v * a[2] + 2 * v * u * b[2] + u * u * c[2]];
};

/** Rauchspur als Röhre bis Fortschritt q */
const Trail: React.FC<{ a: Vec3; b: Vec3; c: Vec3; q: number; r: number; color: string; opacity: number; additive?: boolean }> = ({ a, b, c, q, r, color, opacity, additive = false }) => {
  const qq = Math.round(q * 80) / 80;
  const geo = useMemo(() => {
    if (qq <= 0.01) return null;
    const pts = Array.from({ length: 28 }, (_, i) => new THREE.Vector3(...bez(a, b, c, (i / 27) * qq)));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 6, false);
  }, [qq, r]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} fog={false} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} />
    </mesh>
  );
};

export type InterceptSpec = { launch: Vec3; hit: Vec3; from: Vec3; tHit: number; fly?: number };

/** Abfangrakete steigt auf, trifft das anfliegende Objekt hoch am Himmel: Blitz, Funkenregen, Rauch */
export const Intercept: React.FC<{ spec: InterceptSpec; t: number; scale?: number }> = ({ spec, t, scale = 1 }) => {
  const { launch, hit, from, tHit, fly = 1.6 } = spec;
  const tL = tHit - fly;
  const ctrl: Vec3 = [launch[0] * 0.75 + hit[0] * 0.25, hit[1] * 0.9, launch[2] * 0.75 + hit[2] * 0.25];
  const q = clamp((t - tL) / fly);
  const a = t - tHit; // Sekunden nach Treffer
  const head = bez(launch, ctrl, hit, q);
  // Bedrohung: gerade Linie from → hit
  const qt = clamp((t - (tHit - 2.4)) / 2.4);
  const th: Vec3 = [lerp(from[0], hit[0], qt), lerp(from[1], hit[1], qt), lerp(from[2], hit[2], qt)];
  const flash = a >= 0 ? Math.exp(-a * 1.6) : 0;
  const grow = a >= 0 ? 1 - Math.exp(-a * 14) : 0;
  return (
    <group>
      {/* Rauchspur (bleibt) + glühender Kern */}
      <Trail a={launch} b={ctrl} c={hit} q={q} r={2.2 * scale} color="#C8CCD8" opacity={0.42} />
      <Trail a={launch} b={ctrl} c={hit} q={q} r={0.7 * scale} color="#FFD9A8" opacity={a < 0 ? 0.7 : Math.max(0, 0.7 - a * 0.5)} additive />
      {a < 0 && q > 0 && <SunGlow position={head} size={46 * scale} color="#FFE2B0" />}
      {a < 0 && qt > 0 && (
        <>
          <SunGlow position={th} size={30 * scale} color="#FF8A5A" />
          <Trail a={from} b={[lerp(from[0], th[0], 0.5), lerp(from[1], th[1], 0.5), lerp(from[2], th[2], 0.5)]} c={th} q={1} r={0.6 * scale} color="#FF9A6A" opacity={0.35} additive />
        </>
      )}
      {a >= 0 && (
        <>
          <SunGlow position={hit} size={(40 + 260 * grow) * scale} color="#FFE6C8" opacity={flash * 0.8} />
          <SunGlow position={hit} size={(90 + 170 * grow) * scale} color="#FF9A40" opacity={Math.min(1, flash * 1.4)} />
          <SunGlow position={hit} size={(30 + 70 * grow) * scale} color="#FFFFFF" opacity={Math.min(1, flash * 2.2)} />
          <SunGlow position={hit} size={(18 + 30 * grow) * scale} color="#FFFFFF" opacity={Math.min(1, flash * 3)} />
          <mesh position={hit}>
            <sphereGeometry args={[(8 + a * 40) * scale, 24, 16]} />
            <Glow color="#FFB060" opacity={0.18 * flash} />
          </mesh>
          <mesh position={hit}>
            <sphereGeometry args={[(14 + a * 22) * scale, 16, 12]} />
            <meshBasicMaterial color="#3A4050" transparent opacity={0.22 * clamp(a * 2) * Math.exp(-a * 0.3)} depthWrite={false} fog={false} />
          </mesh>
          <Particles kind="embers" n={220} box={[60 + a * 160 * scale, 50 + a * 120 * scale, 60 + a * 160 * scale]} center={[hit[0], hit[1] - a * a * 18 * scale, hit[2]]} time={t} velocity={[0, -10 * scale, 0]} sizeScale={9 * scale} opacity={Math.min(1, flash * 2)} seed={41} />
          <pointLight position={hit} intensity={6 * flash} distance={0} decay={0} color="#FFC890" />
        </>
      )}
    </group>
  );
};

// ═════════════════════════ Öffentlicher Schutzraum (Hochbunker) ═════════════════════════

const QUEUE = Array.from({ length: 24 }, (_, i): { p: Vec3; r: number } => ({ p: [0.25 * Math.sin(i * 1.7) - 0.4, 0, 10.6 + i * 0.85], r: Math.PI + 0.1 * Math.sin(i * 2.3) }));

export const BunkerScene: React.FC<{ shot: ShotInfo; cam: CamFn; max: (t: number) => { pos: Vec3; rotY: number; pose: Pose } }> = ({ shot, cam, max }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const m = max(t);
  return (
    <Stage preset="night" bg="#0A1230" fog={["#1A2448", 40, 380]} sunDir={[-30, 60, 20]} sunIntensity={0.5} shadowCenter={[0, 0, 14]} shadowSize={26} bloom={0.6}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.1} far={6000} />
      <SkyDome top="#070C24" horizon="#2A3A72" bottom="#121830" radius={4000} />
      <Stars n={1400} radius={3800} opacity={0.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[3000, 3000]} /><Flat color="#4A4F5A" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 16]} receiveShadow><planeGeometry args={[60, 26]} /><Flat color="#8E8A84" /></mesh>
      {/* Bunker */}
      <Box size={[22, 17, 18]} color="#9A968E" position={[0, 8.5, 0]} bevel={0.02} roughness={0.95} />
      <Box size={[23, 1.2, 19]} color="#86827A" position={[0, 17.4, 0]} bevel={0.02} />
      {[-7.5, -2.5, 2.5, 7.5].map((x) => [6, 11, 15].map((y) => <Box key={`${x}-${y}`} size={[1.4, 0.35, 0.1]} color="#2A2A2E" position={[x, y, 9.02]} cast={false} bevel={0} />))}
      {/* Tür offen, warmes Licht */}
      <Box size={[3.4, 3.4, 0.1]} color="#FFD9A0" emissive="#FFB060" emissiveIntensity={1.4} position={[0, 1.7, 9.0]} cast={false} bevel={0} />
      <group position={[1.7, 0, 9.1]} rotation={[0, 1.9, 0]}>
        <Box size={[3.4, 3.4, 0.35]} color="#5E6A5A" position={[-1.7, 1.7, 0]} roughness={0.5} metalness={0.3} />
      </group>
      <Box size={[4.2, 0.5, 0.6]} color="#86827A" position={[0, 3.65, 9.2]} />
      <TextPlate text="ÖFFENTLICHER SCHUTZRAUM" w={7.2} h={0.9} position={[0, 4.9, 9.06]} bg="#F2EFE8" fg="#1E3A6E" glow={0.35} />
      <pointLight position={[0, 2.6, 11]} intensity={14} distance={16} decay={2} color="#FFC890" />
      <pointLight position={[6, 6, 22]} intensity={40} distance={40} decay={2} color="#9FB4FF" />
      <pointLight position={[-4, 3.5, 30]} intensity={14} distance={18} decay={2} color="#FFD58A" />
      {/* Schlange */}
      {QUEUE.map((qq, i) => (
        <Person key={i} seed={300 + i * 7} pose={i % 5 === 2 ? "phone" : i % 4 === 1 ? "lookUp" : "idle"} hold={i % 5 === 2 ? "phone" : undefined} screen="#FF3B30" time={t} position={qq.p} rotationY={qq.r} />
      ))}
      <Max pose={m.pose} time={t} position={m.pos} rotationY={m.rotY} expression="shock" />
      {/* Umgebung */}
      {[[-34, 0, 4, 18, 26, 16], [34, 0, 2, 16, 30, 16], [-30, 0, 44, 20, 20, 14], [32, 0, 46, 18, 24, 14], [0, 0, -40, 40, 34, 16]].map(([x, y, z, w, h, d], i) => (
        <Building key={i} position={[x, y, z]} size={[w, h, d]} seed={140 + i} lit />
      ))}
      {[[-10, 0, 26], [10, 0, 26], [-14, 0, 8], [14, 0, 8]].map((l, i) => (
        <group key={i}>
          <StreetLamp position={l as Vec3} on />
          <pointLight position={[l[0] + 0.2, 4.6, l[2]]} intensity={18} distance={14} decay={2} color="#FFD58A" />
        </group>
      ))}
      <Car seed={4} position={[16, 0, 22]} rotationY={0.3} />
      <Tree position={[-16, 0, 20]} seed={4} scale={1.4} />
      <Tree position={[18, 0, 12]} seed={6} scale={1.2} />
      {/* Rauchspuren vom Abfangen am Himmel */}
      <Intercept spec={{ launch: [700, 0, -900], hit: [-120, 420, -700], from: [-900, 900, -800], tHit: shot.start - 2.5 }} t={t} />
      <Particles kind="dust" n={80} box={[20, 5, 20]} center={[0, 2, 16]} time={t} velocity={[0.2, 0.1, 0]} sizeScale={1.2} opacity={0.5} seed={7} />
    </Stage>
  );
};

// ═════════════════════════ 176 Menschen, ein Platz ═════════════════════════

const COLS = 16, ROWS = 11; // 176
const GRID = Array.from({ length: COLS * ROWS }, (_, i) => {
  const r = rng(i * 13 + 5);
  const col = i % COLS, row = Math.floor(i / COLS);
  return { x: (col - (COLS - 1) / 2) * 1.5 + r.range(-0.15, 0.15), z: -row * 1.6 + r.range(-0.15, 0.15), c: r.pick(["#9AA6B8", "#8A96A8", "#A8B2C2", "#8E9AAE"]) };
});
const LUCKY = 8 * COLS + 8; // Reihe 8, Spalte 8
const MAX_SLOT = 0 * COLS + 7;

export const Count176: React.FC<{ shot: ShotInfo; cam: CamFn }> = ({ shot, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const body = useMemo(() => new THREE.BoxGeometry(0.5, 1.15, 0.3), []);
  const head = useMemo(() => new THREE.BoxGeometry(0.34, 0.34, 0.32), []);
  const others = GRID.filter((_, i) => i !== LUCKY && i !== MAX_SLOT);
  const lk = GRID[LUCKY];
  const on = clamp((local - 0.5) / 0.4);
  return (
    <Stage preset="night" bg="#070B1A" fog={["#0A1028", 24, 110]} sunDir={[14, 30, 24]} sunIntensity={1.3} env={["#2A3A70", "#3A4A80", "#101420"]} envIntensity={0.8} shadowCenter={[0, 0, -8]} shadowSize={18} bloom={0.7}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.1} far={500} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[400, 400]} /><Flat color="#28325A" /></mesh>
      <Instanced geometry={body} items={others.map((g) => ({ p: [g.x, 0.95, g.z], c: g.c }))} />
      <Instanced geometry={head} items={others.map((g) => ({ p: [g.x, 1.72, g.z], c: "#C9A88A" }))} />
      {/* Max vorne, der Glückliche hinten im Licht */}
      <Max pose="idle" time={t} position={[GRID[MAX_SLOT].x, 0, GRID[MAX_SLOT].z + 0.6]} rotationY={0.25} expression="shock" />
      <Person seed={77} pose="cheer" time={t} position={[lk.x, 0, lk.z]} rotationY={0.3} expression="happy" />
      <mesh position={[lk.x, 0.03, lk.z]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.0, 32]} /><Glow color={COLOR.accent} opacity={0.75 * on} /></mesh>
      <mesh position={[lk.x, 3, lk.z]}><cylinderGeometry args={[0.9, 1.0, 6, 24, 1, true]} /><Glow color={COLOR.accent} opacity={0.12 * on} side={THREE.DoubleSide} /></mesh>
      <pointLight position={[lk.x, 3.2, lk.z + 0.6]} intensity={14 * on} distance={8} decay={2} color="#BFFFEF" />
      <pointLight position={[GRID[MAX_SLOT].x + 0.5, 2.6, 2.6]} intensity={6} distance={7} decay={2} color="#FFE2C0" />
      <Particles kind="dust" n={120} box={[30, 6, 20]} center={[0, 2, -8]} time={t} velocity={[0.1, 0.05, 0]} sizeScale={0.8} opacity={0.5} seed={9} />
    </Stage>
  );
};

// ═════════════════════════ Keller ═════════════════════════

export const Cellar: React.FC<{ shot: ShotInfo; cam: CamFn; max: (t: number) => { pos: Vec3; rotY: number; pose: Pose }; quake?: number }> = ({ shot, cam, max, quake = 0 }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const m = max(t);
  const sw = Math.sin(t * 2.2) * 0.12 * (1 + quake);
  const flick = quake > 0 && Math.sin(t * 37) > 0.75 ? 0.35 : 1;
  const W = 5, H = 2.4, D = 5;
  return (
    <Stage preset="interior" bg="#1A1612" fog={null} sunDir={[2, 6, 3]} sunIntensity={0.1} env={["#3A3028", "#4A3E32", "#201A14"]} envIntensity={0.35} shadowCenter={[0, 1, -0.5]} shadowSize={4} aoRadius={0.4} bloom={0.5}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.05} far={100} />
      <Box size={[W, 0.1, D]} color="#6E6A64" position={[0, -0.05, -0.5]} cast={false} />
      <Box size={[W, H, 0.2]} color="#9A958C" position={[0, H / 2, -D / 2 - 0.5]} bevel={0.02} />
      <Box size={[0.2, H, D]} color="#8E8A82" position={[-W / 2, H / 2, -0.5]} bevel={0.02} />
      <Box size={[0.2, H, D]} color="#8E8A82" position={[W / 2, H / 2, -0.5]} bevel={0.02} />
      <Box size={[W, 0.15, D]} color="#7E7A72" position={[0, H + 0.07, -0.5]} cast={false} />
      {/* Rohre an der Decke */}
      <mesh position={[0, H - 0.18, -2.4]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.06, W, 8]} /><Flat color="#A86A4A" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0, H - 0.3, -2.25]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, W, 8]} /><Flat color="#C9CED4" metalness={0.5} roughness={0.4} /></mesh>
      {/* Tür hinten links */}
      <Box size={[1.0, 2.05, 0.08]} color="#5E6A5A" position={[-1.6, 1.02, -2.88]} roughness={0.5} metalness={0.3} />
      {/* Regal mit Vorräten, Waschmaschine, Getränkekisten */}
      <group position={[1.75, 0, -2.6]}><Shelf width={1.3} /></group>
      <group position={[2.25, 0, -1.0]}>
        <Box size={[0.6, 0.85, 0.6]} color="#F2F0EC" position={[0, 0.43, 0]} roughness={0.35} />
        <mesh position={[-0.31, 0.45, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.03, 20]} /><Glass color="#3A4A5A" opacity={0.8} /></mesh>
      </group>
      {[0, 1, 2].map((i) => <Box key={i} size={[0.4, 0.3, 0.3]} color={i === 1 ? "#E2473F" : "#3D7DD8"} position={[-2.1, 0.15 + i * 0.3, -1.6]} />)}
      <Box size={[0.8, 0.45, 0.5]} color="#B88A5E" position={[-1.9, 0.22, -0.6]} />
      {/* Glühbirne */}
      <group position={[0, H, -0.7]} rotation={[sw, 0, sw * 0.5]}>
        <Box size={[0.015, 0.5, 0.015]} color="#2A2D33" position={[0, -0.25, 0]} bevel={0} cast={false} />
        <mesh position={[0, -0.56, 0]}><sphereGeometry args={[0.07, 12, 10]} /><Glow color="#FFE2A8" opacity={flick} additive={false} /></mesh>
        <pointLight position={[0, -0.62, 0]} intensity={5 * flick} distance={9} decay={2} color="#FFC888" castShadow />
      </group>
      <Max pose={m.pose} time={t} position={m.pos} rotationY={m.rotY} expression="shock" />
      <Particles kind="dust" n={quake > 0 ? 160 : 60} box={[4, 2.2, 4]} center={[0, 1.2, -0.6]} time={t} velocity={[0, quake > 0 ? -0.5 : 0.02, 0]} sizeScale={quake > 0 ? 0.35 : 0.3} opacity={0.6} seed={11} colors={["#B8B0A4", "#D2CABE"]} />
    </Stage>
  );
};

// ═════════════════════════ Parlament mit Glaskuppel ═════════════════════════

const FlagPole: React.FC<{ position: Vec3; t: number; h?: number }> = ({ position, t, h = 9 }) => (
  <group position={position}>
    <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.08, 0.1, h, 8]} /><Flat color="#DDE2E8" metalness={0.4} roughness={0.35} /></mesh>
    {["#1E1E22", "#D8302A", "#F2C14E"].map((col, i) => (
      <group key={i} position={[0, h - 0.4 - i * 0.6, 0]} rotation={[0, Math.sin(t * 2.3 + i * 0.3) * 0.18, 0]}>
        <Box size={[3.0, 0.6, 0.04]} color={col} position={[1.5, 0, 0]} bevel={0} />
      </group>
    ))}
  </group>
);

export const Parliament: React.FC<{ shot: ShotInfo; cam: CamFn }> = ({ shot, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const sand = "#CDBB9C";
  const sun: Vec3 = [70, 26, 60];
  return (
    <Stage preset="golden" bg="#7EA6D8" fog={["#C8B49C", 160, 1400]} sunDir={sun} sunIntensity={2.1} envIntensity={0.7} shadowCenter={[0, 0, 10]} shadowSize={60}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.5} far={8000} />
      <SkyDome top="#4E7CC8" horizon="#E8B888" bottom="#B8A088" radius={5000} sun={sun} sunColor="#FFE2B8" haze={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[4000, 4000]} /><Flat color={PALETTE.grassDark} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 60]} receiveShadow><planeGeometry args={[110, 70]} /><Flat color={PALETTE.grass} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 40]} receiveShadow><planeGeometry args={[14, 60]} /><Flat color="#D8CDB8" /></mesh>
      {/* Hauptbau */}
      <Building size={[64, 20, 44]} color={sand} roof="#B8AE9C" seed={7} />
      {[[-32, -22], [32, -22], [-32, 22], [32, 22]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Building size={[13, 27, 13]} color="#C4B294" roof="#A89E8C" seed={20 + i} />
          <Box size={[14, 1.2, 14]} color="#CFC2AA" position={[0, 27.4, 0]} bevel={0.02} />
          <FlagPole position={[0, 28, 0]} t={t + i} h={6} />
        </group>
      ))}
      {/* Portikus */}
      <group position={[0, 0, 22]}>
        <Box size={[30, 2.2, 8]} color="#D8CCB6" position={[0, 1.1, 4]} bevel={0.02} />
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[-11.5 + i * 4.6, 10.2, 6.5]} castShadow receiveShadow><cylinderGeometry args={[0.85, 0.95, 16, 14]} /><Flat color="#EFE6D6" /></mesh>
        ))}
        <Box size={[28, 2.4, 8]} color="#E3D6C0" position={[0, 19.2, 4]} bevel={0.02} />
        <mesh position={[0, 22.2, 4]} rotation={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 15.5, 4, 3, 1]} />
          <Flat color="#DCCFB8" />
        </mesh>
      </group>
      {/* Glaskuppel */}
      <group position={[0, 20, 0]}>
        <mesh><sphereGeometry args={[13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><Glass color="#B8DCF0" opacity={0.35} /></mesh>
        {Array.from({ length: 16 }).map((_, i) => (
          <mesh key={i} rotation={[0, (i / 16) * Math.PI * 2, 0]}>
            <torusGeometry args={[13.05, 0.12, 4, 32, Math.PI]} />
            <Flat color="#C9D2DA" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        {[3, 6.5, 9.5].map((y) => {
          const rr = Math.sqrt(13 * 13 - y * y);
          return <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[rr, 0.12, 4, 48]} /><Flat color="#C9D2DA" metalness={0.6} roughness={0.3} /></mesh>;
        })}
        <mesh position={[0, 4, 0]}><coneGeometry args={[3.5, 9, 16, 1, true]} /><Flat color="#DDE6EE" metalness={0.8} roughness={0.2} side={THREE.DoubleSide} /></mesh>
      </group>
      <FlagPole position={[-9, 0, 50]} t={t} h={11} />
      <FlagPole position={[9, 0, 50]} t={t + 0.7} h={11} />
      {/* Presse */}
      <Crowd n={26} seed={8} area={[26, 8]} center={[0, 0, 60]} pose="phone" time={t} faceTo={[0, 0, 20]} />
      {[[-24, 66], [24, 68]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, i ? -0.3 : 0.3, 0]}>
          <Box size={[2.3, 2.6, 6]} color="#F4F4F4" position={[0, 1.6, 0]} />
          <mesh position={[0, 3.4, -1]} rotation={[0.8, 0, 0]}><cylinderGeometry args={[0.9, 0.9, 0.1, 16]} /><Flat color="#DDE2E8" /></mesh>
        </group>
      ))}
      {[[-60, 40], [60, 44], [-70, 90], [70, 96], [-52, -40], [56, -46]].map(([x, z], i) => <Tree key={i} position={[x, 0, z]} seed={i + 11} scale={2.4} />)}
      {[[-140, -60, 40, 30, 30], [150, -40, 44, 26, 34], [-180, 100, 40, 22, 30], [190, 110, 40, 28, 30]].map(([x, z, w, h, d], i) => (
        <Building key={i} position={[x, 0, z]} size={[w, h, d]} seed={60 + i} />
      ))}
      <Birds n={9} center={[20, 46, 40]} spread={26} time={t} />
      {[[-200, 160, -500], [260, 190, -700], [-60, 210, -900]].map((cp, i) => <Cloud key={i} position={cp as Vec3} scale={[60, 16, 30]} seed={i + 2} color="#FFF4EA" />)}
    </Stage>
  );
};

// ═════════════════════════ Erde bei Nacht, Bündnis-Ringe (km) ═════════════════════════

const R = 6371;
const N0 = new THREE.Vector3(0.3, 0.72, 0.62).normalize();
const ALLIES = (() => {
  const r = rng(32);
  const helper = new THREE.Vector3(0, 0, 1);
  const u = new THREE.Vector3().crossVectors(N0, helper).normalize();
  const v = new THREE.Vector3().crossVectors(N0, u).normalize();
  return Array.from({ length: 31 }, (_, i) => {
    const ang = i < 26 ? r.range(0.06, 0.32) : r.range(0.55, 0.85); // die letzten: über den Ozean
    const az = i < 26 ? r.range(0, Math.PI * 2) : r.range(2.4, 3.6);
    const n = N0.clone().multiplyScalar(Math.cos(ang)).add(u.clone().multiplyScalar(Math.sin(ang) * Math.cos(az))).add(v.clone().multiplyScalar(Math.sin(ang) * Math.sin(az))).normalize();
    return { n, ang };
  });
})();

const SphereRing: React.FC<{ ang: number; color: string; opacity: number; width?: number }> = ({ ang, color, opacity, width = 0.012 }) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), N0), []);
  if (opacity <= 0.01 || ang <= 0.001) return null;
  const rr = R * Math.sin(ang);
  const h = R * Math.cos(ang) + 12;
  return (
    <mesh position={[N0.x * h, N0.y * h, N0.z * h]} quaternion={q}>
      <ringGeometry args={[rr * (1 - width / Math.max(0.05, ang)), rr, 128]} />
      <Glow color={color} opacity={opacity} side={THREE.DoubleSide} />
    </mesh>
  );
};

export const EarthNato: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, local, p } = useTimes(shot);
  const d = 11000 + p * 9000;
  const cdir = N0.clone().add(new THREE.Vector3(0.25, -0.35, 0.3)).normalize();
  const ringAng = clamp((local - 0.4) / 1.9) * 0.9;
  const sunDir: Vec3 = [-cdir.x * 40 + 30, -cdir.y * 40 + 10, -cdir.z * 40 - 20];
  return (
    <Stage preset="space" bg="#03050C" fog={null} sunDir={sunDir} sunIntensity={2.0} shadows={false} logDepth bloom={0.8}>
      <Camera pos={[cdir.x * d, cdir.y * d, cdir.z * d]} look={[N0.x * R * 0.75, N0.y * R * 0.75, N0.z * R * 0.75]} fov={40} near={1} far={4_000_000} />
      <Stars n={2600} radius={1_500_000} />
      <Earth radius={R} night tilt={0} rotationY={0.4} />
      {/* Deutschland (Mitte) pulsiert */}
      <mesh position={[N0.x * (R + 15), N0.y * (R + 15), N0.z * (R + 15)]}><sphereGeometry args={[70 + pulse(t, 1.6) * 30, 16, 12]} /><Glow color={COLOR.warn} opacity={0.95} /></mesh>
      <SunGlow position={[N0.x * (R + 40), N0.y * (R + 40), N0.z * (R + 40)]} size={900} color={COLOR.warn} opacity={0.8} />
      {/* Ring breitet sich aus, Verbündete leuchten auf */}
      <SphereRing ang={ringAng} color={COLOR.accent} opacity={0.85 * (1 - clamp((ringAng - 0.75) / 0.15))} />
      <SphereRing ang={ringAng * 0.6} color={COLOR.accent} opacity={0.35} />
      {ALLIES.map((a, i) => {
        const on = clamp((ringAng - a.ang) / 0.06);
        if (on <= 0) return null;
        const h = R + 14;
        return (
          <group key={i}>
            <mesh position={[a.n.x * h, a.n.y * h, a.n.z * h]}><sphereGeometry args={[55, 12, 8]} /><Glow color={COLOR.accent} opacity={on} /></mesh>
            <SunGlow position={[a.n.x * (h + 20), a.n.y * (h + 20), a.n.z * (h + 20)]} size={420 * on} color={COLOR.accent} opacity={0.7} />
          </group>
        );
      })}
    </Stage>
  );
};

// ═════════════════════════ Kampfjet + Flugplatz ═════════════════════════

export const Jet: React.FC<{ position?: Vec3; rotation?: Vec3; ab?: number; t?: number; gear?: boolean }> = ({ position = [0, 0, 0], rotation = [0, 0, 0], ab = 0, t = 0, gear = true }) => {
  const wing = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(2.2, 0.7); s.lineTo(-3.8, 6.2); s.lineTo(-5.4, 6.2); s.lineTo(-5.6, 0.7); s.lineTo(2.2, 0.7);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false });
    return g;
  }, []);
  const fin = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-3.6, 0.5); s.lineTo(-6.0, 3.9); s.lineTo(-7.0, 3.9); s.lineTo(-6.8, 0.5); s.lineTo(-3.6, 0.5);
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false });
  }, []);
  const stab = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-5.0, 0.6); s.lineTo(-6.6, 2.8); s.lineTo(-7.3, 2.8); s.lineTo(-7.3, 0.6); s.lineTo(-5.0, 0.6);
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false });
  }, []);
  const body = "#7D8794", dark = "#5E6874";
  const fl = 1 + Math.sin(t * 41) * 0.08 + Math.sin(t * 67) * 0.06;
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.85, 0.75, 11, 12]} /><Flat color={body} roughness={0.45} metalness={0.35} /></mesh>
      <mesh position={[7.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow><coneGeometry args={[0.85, 3.8, 12]} /><Flat color={body} roughness={0.45} metalness={0.35} /></mesh>
      <mesh position={[3.3, 0.65, 0]} scale={[2.2, 0.62, 0.62]}><sphereGeometry args={[1, 16, 10]} /><Glass color="#3A4A5E" opacity={0.85} /></mesh>
      {/* Lufteinläufe */}
      {[-1, 1].map((sd) => <Box key={sd} size={[3.4, 0.9, 0.5]} color={dark} position={[1.2, -0.25, sd * 0.95]} />)}
      {/* Flügel */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} geometry={wing} rotation={[sd * Math.PI / 2, 0, 0]} position={[0, -0.1 + (sd < 0 ? 0.14 : 0), 0]} scale={[1, 1, 1]} castShadow>
          <Flat color={body} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {[-1, 1].map((sd) => (
        <mesh key={sd} geometry={stab} rotation={[sd * Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} castShadow>
          <Flat color={body} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {[-1, 1].map((sd) => (
        <mesh key={sd} geometry={fin} position={[0, 0.2, sd * 0.55]} rotation={[sd * 0.25, 0, 0]} castShadow>
          <Flat color={dark} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Düse + Nachbrenner */}
      <mesh position={[-5.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.62, 0.7, 0.9, 12, 1, true]} /><Flat color="#3A3E44" metalness={0.6} roughness={0.3} side={THREE.DoubleSide} /></mesh>
      {ab > 0.01 && (
        <group position={[-6.3, 0, 0]}>
          {[{ c: "#FFFFFF", r: 0.35, l: 2.2, o: 0.95 }, { c: "#8FB8FF", r: 0.55, l: 3.6, o: 0.55 }, { c: "#FF9A40", r: 0.75, l: 5.5, o: 0.45 }].map((L, i) => (
            <mesh key={i} position={[(-L.l * ab * fl) / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, ab * fl, 1]}>
              <coneGeometry args={[L.r, L.l, 12, 1, true]} />
              <Glow color={L.c} opacity={L.o} side={THREE.DoubleSide} />
            </mesh>
          ))}
          <SunGlow position={[-0.4, 0, 0]} size={4 * ab} color="#FFD0A0" />
          <pointLight intensity={8 * ab} distance={30} decay={2} color="#FFB070" />
        </group>
      )}
      {gear && (
        <>
          {[[4.5, 0], [-1.5, 1.4], [-1.5, -1.4]].map(([x, z], i) => (
            <group key={i} position={[x, -0.85, z]}>
              <Box size={[0.12, 0.9, 0.12]} color="#3A3E44" position={[0, -0.2, 0]} bevel={0} />
              <mesh position={[0, -0.7, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.32, 0.32, 0.22, 12]} /><Flat color="#1E2126" /></mesh>
            </group>
          ))}
        </>
      )}
    </group>
  );
};

/** Jet-Position: rollt an, hebt ab (x nach +) */
export const jetPath = (l: number): { pos: Vec3; pitch: number } => {
  const x = -70 + 24 * l + 10 * l * l;
  const lift = Math.max(0, l - 1.7);
  return { pos: [x, 2.05 + lift * lift * 6, 0], pitch: Math.min(0.22, lift * 0.35) };
};

export const Airbase: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, local } = useTimes(shot);
  const j = jetPath(local);
  const camPos: Vec3 = [lerp(-14, 22, clamp(local / 2.6)), 1.4, 26];
  const look: Vec3 = [j.pos[0] + 6, j.pos[1] + 0.5, 0];
  const sun: Vec3 = [-60, 30, 50];
  return (
    <Stage preset="day" bg="#7FA8DA" fog={["#AFC4DA", 200, 2400]} sunDir={sun} sunIntensity={2.4} shadowCenter={[j.pos[0], 0, 4]} shadowSize={30}>
      <Camera pos={camPos} look={look} fov={44} near={0.3} far={8000} />
      <SkyDome top="#3E72C6" horizon="#A8C2DE" bottom="#98A8B4" radius={6000} sun={sun} haze={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[8000, 8000]} /><Flat color="#7FA05E" /></mesh>
      {/* Startbahn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[200, 0.02, 0]} receiveShadow><planeGeometry args={[2400, 46]} /><Flat color="#555A62" /></mesh>
      {Array.from({ length: 60 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-400 + i * 30, 0.04, 0]}><planeGeometry args={[14, 0.8]} /><Flat color="#EDEBE4" /></mesh>
      ))}
      {[-1, 1].map((s) => <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[200, 0.04, s * 21]}><planeGeometry args={[2400, 0.6]} /><Flat color="#EDEBE4" /></mesh>)}
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh key={i} position={[-300 + i * 40, 0.3, 24]}><boxGeometry args={[0.4, 0.4, 0.4]} /><Flat color="#FFF2C0" emissive="#FFD27A" emissiveIntensity={1.2} /></mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-140, 0.03, -40]} receiveShadow><planeGeometry args={[60, 50]} /><Flat color="#62666E" /></mesh>
      {/* Jets */}
      <Jet position={j.pos} rotation={[0, 0, j.pitch]} ab={1} t={t} gear={local < 2.3} />
      <Jet position={[-150, 2.05, -34]} rotation={[0, 0.5, 0]} ab={0.5} t={t + 3} />
      <Jet position={[-128, 2.05, -48]} rotation={[0, 0.5, 0]} t={t} />
      {/* Hangars, Tower */}
      {[-260, -180, -100, -20].map((x, i) => (
        <group key={i} position={[x, 0, -150]}>
          <mesh rotation={[0, 0, 0]} castShadow><cylinderGeometry args={[18, 18, 40, 16, 1, false, Math.PI / 2, Math.PI]} /><Flat color="#7E8A7A" /></mesh>
        </group>
      ))}
      <group position={[90, 0, -110]}>
        <Box size={[7, 26, 7]} color="#D9D4CA" position={[0, 13, 0]} />
        <Box size={[11, 4.5, 11]} color="#3A4A5E" position={[0, 28, 0]} roughness={0.2} metalness={0.4} />
        <Box size={[12, 0.8, 12]} color="#D9D4CA" position={[0, 30.6, 0]} />
      </group>
      <Particles kind="dust" n={120} box={[30, 3, 8]} center={[j.pos[0] - 20, 1.5, 0]} time={t} velocity={[-8, 0.6, 0]} sizeScale={3} opacity={0.4} colors={["#C9C4BA", "#A8A49A"]} seed={17} />
      {[[-200, 260, -900], [300, 320, -1200], [800, 240, -700], [-700, 280, -1100]].map((cp, i) => <Cloud key={i} position={cp as Vec3} scale={[90, 24, 50]} seed={i + 4} />)}
      <Forest2 />
    </Stage>
  );
};

/** Waldrand hinter dem Flugplatz */
const Forest2: React.FC = () => {
  const items = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 160 }, () => ({ p: [r.range(-900, 1200), 0, r.range(-420, -260)] as Vec3, s: r.range(10, 18) }));
  }, []);
  const cone = useMemo(() => new THREE.ConeGeometry(0.45, 1.6, 6).translate(0, 0.8, 0), []);
  return <Instanced geometry={cone} items={items.map((it) => ({ p: it.p, s: it.s, c: "#3E6E45" }))} />;
};

// ═════════════════════════ Supermarkt ═════════════════════════

const Cart: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <Box size={[0.55, 0.45, 0.85]} color="#B8C0C8" position={[0, 0.75, 0]} opacity={0.75} metalness={0.6} roughness={0.3} />
    <Box size={[0.6, 0.04, 0.04]} color="#E2473F" position={[0, 1.05, -0.5]} bevel={0} />
    {[[-0.22, -0.35], [0.22, -0.35], [-0.22, 0.35], [0.22, 0.35]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.08, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.04, 8]} /><Flat color="#2A2D33" /></mesh>
    ))}
    <Box size={[0.04, 0.5, 0.04]} color="#9AA2AA" position={[-0.22, 0.3, 0.3]} bevel={0} />
    <Box size={[0.04, 0.5, 0.04]} color="#9AA2AA" position={[0.22, 0.3, 0.3]} bevel={0} />
  </group>
);

const AISLES = [-6, -2, 2, 6];
const SHELF_LEN = 16;
const ITEMS = (() => {
  const r = rng(91);
  const out: { p: Vec3; s: Vec3; c: string }[] = [];
  AISLES.forEach((x) => {
    [-1, 1].forEach((side) => {
      [0.45, 1.0, 1.55, 2.1].forEach((y) => {
        for (let z = -SHELF_LEN / 2 + 0.3; z < SHELF_LEN / 2; z += 0.32) {
          if (r.next() > 0.12) continue; // fast alles leer
          out.push({ p: [x + side * 0.32, y + 0.14, z], s: [0.22, r.range(0.18, 0.32), 0.22], c: r.pick(PALETTE.shirt) });
        }
      });
    });
  });
  return out;
})();

export const Market: React.FC<{ shot: ShotInfo; cam: CamFn; maxPos: (t: number) => Vec3; maxPose: Pose; maxRot?: number }> = ({ shot, cam, maxPos, maxPose, maxRot = 0 }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mp = maxPos(t);
  return (
    <Stage preset="interior" bg="#E9E6E0" fog={["#E9E6E0", 20, 70]} sunDir={[6, 20, 10]} sunIntensity={0.6} envIntensity={0.55} shadowCenter={[0, 0, 0]} shadowSize={14} aoRadius={0.5}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.05} far={200} />
      <Box size={[24, 0.1, 30]} color="#DAD6CE" position={[0, -0.05, 0]} cast={false} />
      <Box size={[24, 0.1, 30]} color="#F2F0EC" position={[0, 4.6, 0]} cast={false} />
      <Box size={[24, 4.6, 0.2]} color="#B9C3CC" position={[0, 2.3, -12]} />
      <Box size={[0.2, 4.6, 30]} color="#E8E2D6" position={[-12, 2.3, 0]} />
      <Box size={[0.2, 4.6, 30]} color="#E8E2D6" position={[12, 2.3, 0]} />
      <Box size={[24, 4.6, 0.2]} color="#E8E2D6" position={[0, 2.3, 15]} />
      {/* Lichtbänder */}
      {[-4, 0, 4].map((x) => (
        <group key={x}>
          <Box size={[0.4, 0.06, 26]} color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={1.0} position={[x, 4.5, 0]} cast={false} bevel={0} />
          {[-8, 0, 8].map((z) => <pointLight key={z} position={[x, 4.0, z]} intensity={2.2} distance={12} decay={2} color="#F4F8FF" />)}
        </group>
      ))}
      {/* Regale (doppelseitig), fast leer */}
      {AISLES.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Box size={[0.25, 2.5, SHELF_LEN]} color="#C9CED4" position={[0, 1.25, 0]} />
          {[0.45, 1.0, 1.55, 2.1].map((y) => <Box key={y} size={[0.95, 0.05, SHELF_LEN]} color="#B8BEC6" position={[0, y, 0]} bevel={0} />)}
          <Box size={[0.95, 0.3, SHELF_LEN]} color="#8B95A1" position={[0, 0.15, 0]} />
        </group>
      ))}
      <Instanced geometry={box} items={ITEMS.map((it) => ({ p: it.p, s: it.s, c: it.c }))} />
      <TextPlate text="AUSVERKAUFT" w={1.4} h={0.35} position={[-1.5, 1.25, 2.5]} rotation={[0, Math.PI / 2, 0]} bg="#E2473F" fg="#FFFFFF" glow={0.3} />
      <TextPlate text="AUSVERKAUFT" w={1.4} h={0.35} position={[1.5, 1.8, -3.5]} rotation={[0, -Math.PI / 2, 0]} bg="#E2473F" fg="#FFFFFF" glow={0.3} />
      <TextPlate text="WASSER · KONSERVEN · NUDELN" w={6} h={0.6} position={[0, 3.6, -11.85]} bg="#3D7DD8" fg="#FFFFFF" glow={0.3} />
      {/* Kühltruhe am Ende */}
      <group position={[0, 0, -10.6]}>
        <Box size={[6, 0.9, 1.4]} color="#F4F4F4" position={[0, 0.45, 0]} />
        <mesh position={[0, 0.92, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5.8, 1.3]} /><Glass color="#BFE3FF" opacity={0.5} /></mesh>
      </group>
      {/* Leute mit Wagen */}
      {[
        { x: -4, z: 4 - local * 1.8, r: Math.PI, s: 401 }, { x: 4.1, z: -2 + local * 2.2, r: 0, s: 402 },
        { x: -8, z: -1 - local * 2.0, r: Math.PI, s: 403 }, { x: 8, z: 3 + local * 1.4, r: 0, s: 404 },
        { x: 3.8, z: 6 - local * 2.4, r: Math.PI, s: 405 },
      ].map((pp, i) => (
        <group key={i}>
          <Person seed={pp.s} pose={i % 2 ? "run" : "walk"} time={t} position={[pp.x, 0, pp.z]} rotationY={pp.r} />
          <Cart position={[pp.x, 0, pp.z + (pp.r === 0 ? 1.0 : -1.0)]} rotationY={pp.r} />
        </group>
      ))}
      <Person seed={406} pose="shock" time={t} position={[-4.3, 0, -6]} rotationY={-Math.PI / 2} />
      <Max pose={maxPose} hold={maxPose === "carry" ? "pizza" : undefined} time={t} position={mp} rotationY={maxRot} expression="happy" />
      {maxPose === "carry" && <pointLight position={[mp[0], 1.8, mp[2] + 1.2]} intensity={1.5} distance={3} decay={2} color="#FFE6C0" />}
    </Stage>
  );
};

// ═════════════════════════ Militär-Lkw (Hometown-Extra) ═════════════════════════

export const Truck: React.FC<{ position: Vec3; rotationY?: number; t: number }> = ({ position, rotationY = 0, t }) => {
  const olive = "#5A6A3E", dark = "#46522F";
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box size={[2.5, 1.0, 8.5]} color={dark} position={[0, 1.2, 0]} />
      <Box size={[2.5, 1.9, 2.4]} color={olive} position={[0, 2.5, 2.9]} />
      <mesh position={[0, 2.9, 4.11]}><boxGeometry args={[2.1, 0.8, 0.04]} /><Glass color="#2B3A4A" opacity={0.85} /></mesh>
      <Box size={[2.6, 2.4, 5.4]} color={olive} position={[0, 2.9, -1.4]} roughness={0.95} />
      {[3.6, 0.2, -2.4].map((z, i) => [-1, 1].map((s) => (
        <mesh key={`${i}${s}`} position={[s * 1.2, 0.55, z]} rotation={[t * 6, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.55, 0.55, 0.45, 12]} /><Flat color="#1E2126" /></mesh>
      )))}
      <Box size={[0.45, 0.22, 0.05]} color="#FFF4C2" emissive="#FFF4C2" position={[-0.85, 1.4, 4.27]} />
      <Box size={[0.45, 0.22, 0.05]} color="#FFF4C2" emissive="#FFF4C2" position={[0.85, 1.4, 4.27]} />
    </group>
  );
};

export { Glow, Bush };
