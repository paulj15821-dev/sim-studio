// Welten für „Was wäre, wenn alle Schulen für immer schließen?“ (POV).
// Klassenzimmer → dein Zimmer (Tag / Nacht / grau / Morgengrauen) → Freibad → Vorstellungsgespräch → zugewachsene Schule.
// Alles in Metern. Du = Ego-Kamera + EgoRig, Max sitzt/steht immer neben dir.
import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp, lerp, shake, keys3, type Key, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import { PALETTE } from "../../style/theme";
import { t as tr, getLang } from "../../lib/i18n";
import {
  Stage, Camera, Box, Max, Person, Character, Bed, Table, Tree, Bush, GrassBlades, Building, House, SkyDome, Cloud,
  Particles, Instanced, EgoRig, useStripedGrass, Ground, type EgoPose, type LightPreset, type Pose, type Joints, type Inst, type Outfit,
} from "../../three/kit";

export const EYE = 1.62;
export type View = { pos: Vec3; look: Vec3; fov?: number; roll?: number };
export type Times = { t: number; local: number; p: number };
export const sm = (a: number, b: number, x: number) => { const v = clamp((x - a) / (b - a)); return v * v * (3 - 2 * v); };

/** Kamerapfad aus absoluten Zeitpunkten: [[t, pos], …] */
export const path3 = (k: [number, Vec3][], t: number, e: Key<Vec3>["ease"] = "inOut") => keys3(k.map(([tt, v]) => ({ t: tt, v, ease: e })), t);

/** POV: Augenposition + Blickziel, dazu leichtes Atmen (bzw. Hüpfen beim Jubeln) */
export const pov = (t: number, eye: Vec3, look: Vec3, o: { fov?: number; roll?: number; bob?: number; f?: number } = {}): View => {
  const bob = o.bob ?? 0.008, f = o.f ?? 1.4;
  return {
    pos: [eye[0] + Math.sin(t * f * 0.5) * bob * 0.6, eye[1] + Math.abs(Math.sin(t * f)) * bob, eye[2]],
    look,
    fov: o.fov ?? 64,
    roll: o.roll ?? 0,
  };
};

// Du (für Außenansichten) – gleiche Ärmelfarbe wie die Ego-Arme
export const SLEEVE = "#3C4A63";
export const YOU: Outfit = { skin: "#D9A37A", hair: "#3A2A20", top: SLEEVE, pants: "#2F3B4C", shoes: "#F4F4F4" };
const TEACHER: Outfit = { skin: "#F1C7A0", hair: "#9A9590", top: "#8A6E5A", pants: "#4A4F5A", shoes: "#3A2A20" };
const BOSS: Outfit = { skin: "#E6B48E", hair: "#3A2A20", top: "#2F3B4C", pants: "#2F3B4C", shoes: "#1E1E24" };

// ═════════════════════════ Rahmen: Ego-Szene ═════════════════════════

export const Scene: React.FC<{
  shot: ShotInfo;
  preset: LightPreset;
  bg?: string;
  fog?: [string, number, number] | null;
  shadowSize?: number;
  shadowCenter?: Vec3;
  shadows?: boolean;
  bloom?: number;
  sunDir?: Vec3;
  sunIntensity?: number;
  env?: [string, string, string];
  envIntensity?: number;
  view: (c: Times) => View;
  ego?: EgoPose | ((t: number) => EgoPose) | false;
  right?: (t: number) => React.ReactNode;
  shakeAmp?: (t: number) => number;
  world: (c: Times) => React.ReactNode;
}> = ({ shot, preset, bg, fog, shadowSize = 8, shadowCenter = [0, 0, 0], shadows = true, bloom, sunDir, sunIntensity, env, envIntensity, view, ego = "idle", right, shakeAmp, world }) => {
  const { t, local, p } = useTimes(shot);
  const c = { t, local, p };
  const v = view(c);
  const amp = shakeAmp?.(t) ?? 0;
  const sh = amp > 0 ? shake(t, amp, 14) : ([0, 0, 0] as Vec3);
  const pos: Vec3 = [v.pos[0] + sh[0], v.pos[1] + sh[1], v.pos[2] + sh[2]];
  const look: Vec3 = [v.look[0] + sh[0] * 2, v.look[1] + sh[1] * 2, v.look[2]];
  const pose = typeof ego === "function" ? ego(t) : ego;
  return (
    <Stage preset={preset} bg={bg} fog={fog} shadowSize={shadowSize} shadowCenter={shadowCenter} shadows={shadows} bloom={bloom} sunDir={sunDir} sunIntensity={sunIntensity} env={env} envIntensity={envIntensity}>
      <Camera pos={pos} look={look} fov={v.fov ?? 64} roll={v.roll ?? 0} near={0.03} far={900} />
      {pose && <EgoRig eye={pos} look={look} pose={pose} time={t} sleeve={SLEEVE} roll={v.roll ?? 0} right={right?.(t)} />}
      {world(c)}
    </Stage>
  );
};

// ═════════════════════════ Canvas-Texturen ═════════════════════════

function useCanvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]) {
  return useMemo(() => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d")!);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    return tx;
  }, [...deps, getLang()]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Bemalte Fläche (Tafel, Poster, Blatt). +z = Vorderseite */
const Painted: React.FC<{ size: [number, number]; tex: THREE.Texture; position?: Vec3; rotation?: Vec3; glow?: boolean; rough?: number }> = ({ size, tex, position, rotation, glow, rough = 0.9 }) => (
  <mesh position={position} rotation={rotation} receiveShadow>
    <planeGeometry args={size} />
    {glow ? <meshBasicMaterial map={tex} toneMapped={false} /> : <meshStandardMaterial map={tex} roughness={rough} />}
  </mesh>
);

const font = (w: number, px: number, fam = "Inter, sans-serif") => `${w} ${px}px ${fam}`;

/** Mathe-Test auf dem Tisch (A4 liegend, Vorderseite nach oben) */
export const TestSheet: React.FC<{ position: Vec3; rotY?: number; graded?: boolean }> = ({ position, rotY = 0 }) => {
  const tex = useCanvasTex(420, 594, (g) => {
    g.fillStyle = "#FBF8F1"; g.fillRect(0, 0, 420, 594);
    g.fillStyle = "#1E2430"; g.font = font(800, 30); g.fillText(tr("MATHE – Klassenarbeit", "MATH – Final Test"), 26, 52);
    g.font = font(500, 20); g.fillStyle = "#444C58"; g.fillText(tr("Name: ____________   Note: ____", "Name: ____________   Grade: ____"), 26, 92);
    g.strokeStyle = "#D8D2C4"; g.lineWidth = 2;
    for (let y = 130; y < 580; y += 26) { g.beginPath(); g.moveTo(20, y); g.lineTo(400, y); g.stroke(); }
    g.fillStyle = "#1E2430"; g.font = font(600, 22);
    g.fillText("1)  3x² − 12 = 0", 26, 152);
    g.fillText(tr("2)  f(x) = 2x³ − 4x. Ableitung?", "2)  f(x) = 2x³ − 4x. Derivative?"), 26, 256);
    g.fillText(tr("3)  Beweise, dass √2 irrational ist.", "3)  Prove that √2 is irrational."), 26, 360);
    g.fillStyle = "#2B4FA8"; g.font = font(500, 24, "cursive"); g.fillText("x = ???", 60, 200);
    g.fillStyle = "#C8402F"; g.font = font(800, 26); g.fillText("20 Min.", 300, 52);
  }, []);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <Painted size={[0.21, 0.297]} tex={tex} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} />
      {/* Kuli */}
      <Box size={[0.012, 0.012, 0.15]} color="#2B4FA8" position={[0.15, 0.008, 0.02]} rotation={[0, 0.4, 0]} bevel={0.4} cast={false} />
    </group>
  );
};

// ═════════════════════════ Papierregen ═════════════════════════

/** Fliegende Blätter (Tests, Hefte). Startzeit t0; alles aus der Zeit berechnet. */
export const PaperStorm: React.FC<{ t: number; t0: number; n?: number; area?: [number, number, number, number]; seed?: number }> = ({ t, t0, n = 90, area = [-4, 4, -2.6, 1.9], seed = 4 }) => {
  const geo = useMemo(() => new THREE.BoxGeometry(0.21, 0.003, 0.297), []);
  const base = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }).map(() => ({
      x: r.range(area[0], area[1]), z: r.range(area[2], area[3]), y: r.range(0.9, 1.8),
      vy: r.range(2.6, 5.2), vx: r.range(-1.2, 1.2), vz: r.range(-1.0, 1.0), d: r.range(0, 0.7),
      ph: r.range(0, 6.28), spin: r.range(2, 6) * r.sign(), c: r.pick(["#FBF8F1", "#FFFFFF", "#F4EFE2", "#FFF6C9"]),
    }));
  }, [n, seed]);
  const items: Inst[] = [];
  for (const b of base) {
    const a = t - t0 - b.d;
    if (a < 0) continue;
    const tau = 0.38;
    const k = tau * (1 - Math.exp(-a / tau));
    let y = b.y + b.vy * k - 0.55 * a;
    const x = b.x + b.vx * k + Math.sin(a * 3 + b.ph) * 0.25 * clamp(a);
    const z = b.z + b.vz * k + Math.cos(a * 2.4 + b.ph) * 0.2 * clamp(a);
    const landed = y < 0.01;
    if (landed) y = 0.006;
    const rot: Vec3 = landed ? [0, b.ph, 0] : [Math.sin(a * b.spin + b.ph) * 1.2, a * b.spin * 0.6 + b.ph, Math.cos(a * b.spin * 0.8) * 0.9];
    items.push({ p: [x, y, z], r: rot, c: b.c });
  }
  return <Instanced items={items} geometry={geo} cast={false} />;
};

// ═════════════════════════ Klassenzimmer ═════════════════════════

const ROWS = [-1.9, -0.4, 1.1, 2.6];
const COLS = [-3.1, 0, 3.1];
/** Dein Platz (letzte Reihe, Mitte rechts) und Max' Platz daneben */
export const MY_SEAT: Vec3 = [0.36, 0, 3.1];
export const MAX_SEAT: Vec3 = [-0.36, 0, 3.1];
export const EYE_SEAT: Vec3 = [0.36, 1.24, 3.08];
export const DESK_Y = 0.75;

type Mood = "test" | "phones" | "cheer" | "after";
type Seat = { x: number; z: number; seed: number; onDesk: boolean };
const SEATS: Seat[] = (() => {
  const r = rng(31);
  const out: Seat[] = [];
  ROWS.forEach((z) => COLS.forEach((x) => [-0.36, 0.36].forEach((dx) => {
    if (x === 0 && (z === 2.6 || z === 1.1)) return; // du + Max, Blick zur Tafel frei
    if (r.next() < 0.12) return; // leerer Platz
    out.push({ x: x + dx, z: z + 0.5, seed: 200 + out.length * 7, onDesk: r.next() < 0.3 });
  })));
  return out;
})();

const Desk: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Box size={[1.4, 0.05, 0.62]} color="#D9B98A" position={[0, DESK_Y - 0.025, 0]} roughness={0.6} />
    <Box size={[1.36, 0.22, 0.03]} color="#7E8A96" position={[0, DESK_Y - 0.16, -0.28]} metalness={0.5} roughness={0.4} />
    {[[-0.64, -0.26], [0.64, -0.26], [-0.64, 0.26], [0.64, 0.26]].map(([x, z], i) => (
      <Box key={i} size={[0.04, DESK_Y - 0.05, 0.04]} color="#5E6B78" position={[x, (DESK_Y - 0.05) / 2, z]} metalness={0.6} roughness={0.4} bevel={0} />
    ))}
  </group>
);
const Chair: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Box size={[0.42, 0.04, 0.4]} color="#3D7DD8" position={[0, 0.45, 0]} roughness={0.5} />
    <Box size={[0.42, 0.36, 0.04]} color="#3D7DD8" position={[0, 0.72, 0.2]} roughness={0.5} />
    {[[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].map(([x, z], i) => (
      <Box key={i} size={[0.03, 0.44, 0.03]} color="#5E6B78" position={[x, 0.22, z]} bevel={0} />
    ))}
  </group>
);

/** Schüler auf seinem Platz – Pose je nach Stimmung */
const Student: React.FC<{ s: Seat; mood: Mood; t: number }> = ({ s, mood, t }) => {
  const r = rng(s.seed);
  const look = r.range(-0.3, 0.3);
  if (mood === "cheer") {
    const y = s.onDesk ? DESK_Y : 0;
    const z = s.onDesk ? s.z - 0.5 : s.z + 0.05;
    const jump = Math.max(0, Math.sin((t + r.range(0, 1)) * 7.5)) * 0.18;
    return <Person seed={s.seed} pose="cheer" time={t} speed={1.3 + r.range(0, 0.4)} position={[s.x, y + jump, z]} rotationY={Math.PI + r.range(-0.8, 0.8)} expression="happy" />;
  }
  if (mood === "phones") {
    return (
      <Person seed={s.seed} pose="sit" time={t} position={[s.x, 0, s.z]} rotationY={Math.PI} hold="phone" screen="#E9F2FF" expression={r.next() < 0.5 ? "shock" : "neutral"}
        joints={{ rArmX: -1.25, rArmZ: 0.25, lArmX: -0.9, lArmZ: -0.2, headX: 0.35, headY: look * 0.3 }} />
    );
  }
  if (mood === "after") {
    return <Person seed={s.seed} pose="sit" time={t} position={[s.x, 0, s.z]} rotationY={Math.PI} expression="shock" joints={{ headY: Math.PI * 0.75 * (s.x < 0 ? -0.2 : 0.2) + look, headX: -0.1 }} />;
  }
  // Test: Kopf über dem Blatt
  return <Person seed={s.seed} pose="sit" time={t} position={[s.x, 0, s.z]} rotationY={Math.PI} joints={{ headX: 0.45, rArmX: -0.75, lArmX: -0.6, headY: look * 0.2 }} />;
};

/** Wand mit Fensteröffnungen entlang z (für x = const). Öffnungen: [zMitte, Breite] */
const WindowWall: React.FC<{ x: number; depth: number; height: number; holes: [number, number][]; sill: number; top: number; color: string }> = ({ x, depth, height, holes, sill, top, color }) => {
  const parts: React.ReactNode[] = [];
  const z0 = -depth / 2;
  let cur = z0;
  const sorted = [...holes].sort((a, b) => a[0] - b[0]);
  sorted.forEach(([zc, w], i) => {
    const a = zc - w / 2, b = zc + w / 2;
    if (a > cur) parts.push(<Box key={`p${i}`} size={[0.2, height, a - cur]} color={color} position={[x, height / 2, (cur + a) / 2]} bevel={0} />);
    parts.push(<Box key={`s${i}`} size={[0.2, sill, w]} color={color} position={[x, sill / 2, zc]} bevel={0} />);
    parts.push(<Box key={`t${i}`} size={[0.2, height - top, w]} color={color} position={[x, (height + top) / 2, zc]} bevel={0} />);
    // Rahmen + Fensterbank
    parts.push(<Box key={`f${i}`} size={[0.08, top - sill, 0.06]} color="#F4F4F4" position={[x, (sill + top) / 2, zc]} cast={false} />);
    parts.push(<Box key={`b${i}`} size={[0.34, 0.05, w + 0.1]} color="#E6E2DA" position={[x + 0.08 * Math.sign(-x), sill + 0.02, zc]} />);
    cur = b;
  });
  if (cur < depth / 2) parts.push(<Box key="end" size={[0.2, height, depth / 2 - cur]} color={color} position={[x, height / 2, (cur + depth / 2) / 2]} bevel={0} />);
  return <group>{parts}</group>;
};

export const Classroom: React.FC<{
  t: number; mood: Mood; papers?: number; maxPose?: { pos: Vec3; rotY: number; pose: Pose; joints?: Partial<Joints>; expr?: "neutral" | "happy" | "shock" };
  teacher?: { pose: Pose; expr?: "neutral" | "happy" | "shock"; joints?: Partial<Joints> }; tear?: number;
}> = ({ t, mood, papers, maxPose, teacher = { pose: "idle" }, tear }) => {
  const W = 10, D = 9.2, H = 3.2;
  const board = useCanvasTex(900, 260, (g) => {
    g.fillStyle = "#24463A"; g.fillRect(0, 0, 900, 260);
    g.strokeStyle = "rgba(255,255,255,0.06)"; for (let i = 0; i < 40; i++) { g.beginPath(); g.moveTo(i * 37, 0); g.lineTo(i * 37 - 80, 260); g.stroke(); }
    g.fillStyle = "#F2F0E6"; g.font = font(700, 62, "'Comic Sans MS', cursive"); g.fillText(tr("KLASSENARBEIT", "MATH TEST"), 40, 92);
    g.font = font(500, 40, "'Comic Sans MS', cursive"); g.fillText(tr("Handys weg!  Zeit: 45 Min.", "Phones away!  Time: 45 min"), 44, 162);
    g.fillText("y = 3x² − 12", 520, 232);
  }, []);
  const clock = useCanvasTex(128, 128, (g) => {
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#222"; g.lineWidth = 6; g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 22); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.moveTo(64, 64); g.lineTo(88, 74); g.stroke();
  }, []);
  return (
    <group>
      {/* Boden, Decke, Wände */}
      <Box size={[W, 0.1, D]} color="#B89272" position={[0, -0.05, 0]} cast={false} roughness={0.55} bevel={0} />
      <Box size={[W, 0.1, D]} color="#F2F0EA" position={[0, H + 0.05, 0]} bevel={0} />
      <Box size={[W, H, 0.2]} color="#EDE3CF" position={[0, H / 2, -D / 2]} bevel={0} />
      <Box size={[W, H, 0.2]} color="#EDE3CF" position={[0, H / 2, D / 2]} bevel={0} />
      <WindowWall x={-W / 2} depth={D} height={H} holes={[[-2.6, 1.9], [0, 1.9], [2.6, 1.9]]} sill={0.9} top={2.6} color="#E8DCC4" />
      <Box size={[0.2, H, D]} color="#EDE3CF" position={[W / 2, H / 2, 0]} bevel={0} />
      {/* Tafel + Uhr + Poster */}
      <Box size={[4.8, 1.5, 0.08]} color="#3A3F47" position={[0.4, 1.75, -D / 2 + 0.12]} />
      <Painted size={[4.6, 1.33]} tex={board} position={[0.4, 1.75, -D / 2 + 0.17]} rough={0.95} />
      <Painted size={[0.42, 0.42]} tex={clock} position={[-3.2, 2.6, -D / 2 + 0.11]} />
      <Box size={[1.1, 0.8, 0.02]} color="#58B06C" position={[3.6, 1.8, -D / 2 + 0.11]} cast={false} />
      <Box size={[0.9, 0.6, 0.02]} color="#F2C14E" position={[W / 2 - 0.11, 1.8, -1.0]} rotation={[0, -Math.PI / 2, 0]} cast={false} />
      {/* Spinde hinten */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Box key={i} size={[0.5, 1.8, 0.45]} color={i % 2 ? "#3D7DD8" : "#E2473F"} position={[-3.2 + i * 0.55, 0.9, D / 2 - 0.35]} roughness={0.4} metalness={0.3} />
      ))}
      {/* Tür rechts */}
      <Box size={[0.08, 2.1, 1.0]} color="#8E6A4A" position={[W / 2 - 0.12, 1.05, -3.2]} />
      {/* Lehrerpult */}
      <Table position={[-2.2, 0, -3.3]} size={[1.6, 0.78, 0.8]} color="#A9805A" />
      {/* Deckenlampen */}
      {[-2.5, 0, 2.5].map((z) => [-2.5, 2.5].map((x) => (
        <Box key={`${x}${z}`} size={[1.2, 0.05, 0.3]} color="#FFFFFF" emissive="#FFF6E6" emissiveIntensity={1.4} position={[x, H - 0.03, z]} cast={false} />
      )))}
      {/* Tische + Stühle */}
      {ROWS.map((z) => COLS.map((x) => (
        <group key={`${x}${z}`}>
          <Desk position={[x, 0, z]} />
          <Chair position={[x - 0.36, 0, z + 0.5]} />
          <Chair position={[x + 0.36, 0, z + 0.5]} />
        </group>
      )))}
      {/* Mitschüler */}
      {SEATS.map((s, i) => <Student key={i} s={s} mood={mood} t={t} />)}
      {/* Lehrer */}
      <Character outfit={TEACHER} pose={teacher.pose} time={t} position={[0.9, 0, -3.4]} rotationY={-0.15} expression={teacher.expr ?? "neutral"} joints={teacher.joints} hold={teacher.pose === "phone" ? "phone" : undefined} />
      {/* Max */}
      {maxPose ? (
        <Max position={maxPose.pos} rotationY={maxPose.rotY} pose={maxPose.pose} time={t} joints={maxPose.joints} expression={maxPose.expr ?? "happy"} />
      ) : (
        <Max position={MAX_SEAT} rotationY={Math.PI} pose="sit" time={t} expression={mood === "test" ? "shock" : "happy"}
          joints={mood === "phones" ? { rArmX: -1.25, rArmZ: 0.25, lArmX: -0.9, lArmZ: -0.2, headX: 0.3, headY: -0.5 } : { headX: 0.4, rArmX: -0.75, lArmX: -0.6 }}
          hold={mood === "phones" ? "phone" : undefined} />
      )}
      {/* Dein Test (+ Max' Test, solange er sitzt) */}
      <TestSheet position={[MY_SEAT[0] + 0.02, DESK_Y, 2.72]} rotY={0.06} />
      {!maxPose && <TestSheet position={[MAX_SEAT[0], DESK_Y, 2.72]} rotY={-0.1} />}
      {/* zerrissener Test in Max' Händen */}
      {maxPose && tear != null && <TornTest pos={maxPose.pos} tear={tear} />}
      {papers != null && <PaperStorm t={t} t0={papers} />}
      {papers != null && <Particles kind="dust" n={120} box={[9, 2.6, 8]} center={[0, 1.5, 0]} time={t} sizeScale={0.5} />}
      {/* draußen: Schulhof-Bäume, Himmel */}
      <Ground color={PALETTE.grass} y={-0.02} size={200} />
      {[-4, -1, 2, 5].map((z, i) => <Tree key={i} position={[-10 - (i % 2) * 3, 0, z * 1.6]} scale={2.4} seed={i + 3} />)}
      <Building size={[30, 9, 10]} position={[-26, 0, 0]} color="#E3C7A1" seed={5} />
    </group>
  );
};

/** Test-Hälften vor Max (der steht und dich anschaut, rotY = 0 → schaut nach +z) */
const TornTest: React.FC<{ pos: Vec3; tear: number }> = ({ pos, tear }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 210; c.height = 297;
    const g = c.getContext("2d")!;
    g.fillStyle = "#FBF8F1"; g.fillRect(0, 0, 210, 297);
    g.fillStyle = "#1E2430"; g.font = font(800, 16); g.fillText(tr("MATHE – Klassenarbeit", "MATH – Final Test"), 12, 28);
    g.strokeStyle = "#D8D2C4"; for (let y = 60; y < 290; y += 14) { g.beginPath(); g.moveTo(8, y); g.lineTo(202, y); g.stroke(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  }, [getLang()]); // eslint-disable-line react-hooks/exhaustive-deps
  const halves = useMemo(() => [0, 1].map((i) => {
    const tx = tex.clone(); tx.needsUpdate = true; tx.repeat.set(0.5, 1); tx.offset.set(i * 0.5, 0); return tx;
  }), [tex]);
  const spread = tear * 0.32;
  return (
    <group position={[pos[0], pos[1] + 1.36, pos[2] + 0.5]}>
      {[0, 1].map((i) => {
        const sd = i ? 1 : -1;
        return (
          <mesh key={i} position={[sd * (0.0525 + spread), -tear * 0.04, 0]} rotation={[-0.25, sd * tear * 0.5, sd * tear * 0.35]}>
            <planeGeometry args={[0.105, 0.297]} />
            <meshStandardMaterial map={halves[i]} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
};

// ═════════════════════════ Dein Zimmer ═════════════════════════

export type RoomMood = "day" | "night" | "grey" | "dawn";
export const ROOM_LIGHT: Record<RoomMood, { preset: LightPreset; sunDir: Vec3; sky: [string, string]; sunI?: number; env?: [string, string, string] }> = {
  day: { preset: "interior", sunDir: [5, 9, -14], sky: ["#7FC0F0", "#DDEFF7"], sunI: 3.0 },
  night: { preset: "night", sunDir: [-4, 9, -14], sky: ["#070B1C", "#1A2448"], sunI: 0.25, env: ["#0A0E22", "#141A36", "#05060A"] },
  grey: { preset: "overcast", sunDir: [4, 12, -14], sky: ["#A9B3BD", "#C9D0D6"], sunI: 0.5 },
  dawn: { preset: "night", sunDir: [-6, 3, -14], sky: ["#1B2A5C", "#E79A6A"], sunI: 0.6, env: ["#16214A", "#3A3C66", "#0A0A12"] },
};

const RW = 4.6, RD = 4.6, RH = 2.6;
export const BED_POS: Vec3 = [-1.45, 0, -1.2];
export const EYE_PILLOW: Vec3 = [-1.45, 0.98, -1.95];
export const TV_POS: Vec3 = [RW / 2 - 0.08, 1.25, -0.4];
export const BEANBAG_YOU: Vec3 = [0.55, 0, -0.35];
export const BEANBAG_MAX: Vec3 = [0.75, 0, -1.45];

/** Spielbildschirm (animiert) */
const GameScreen: React.FC<{ t: number; w: number; h: number }> = ({ t, w, h }) => {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 288;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, tex: tx };
  }, []);
  const g = canvas.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 288); sky.addColorStop(0, "#3B2A8A"); sky.addColorStop(1, "#E85AA0");
  g.fillStyle = sky; g.fillRect(0, 0, 512, 288);
  g.fillStyle = "#2A1F5A";
  for (let i = 0; i < 6; i++) { const x = ((i * 120 - t * 60) % 720 + 720) % 720 - 100; g.beginPath(); g.moveTo(x, 210); g.lineTo(x + 70, 110 + (i % 3) * 20); g.lineTo(x + 140, 210); g.fill(); }
  g.fillStyle = "#1B1440"; g.fillRect(0, 210, 512, 78);
  // Spielfigur + Gegner
  const jy = Math.abs(Math.sin(t * 4)) * 40;
  g.fillStyle = "#6FF2D0"; g.fillRect(120, 170 - jy, 28, 40);
  g.fillStyle = "#FFD23F"; for (let i = 0; i < 3; i++) { const x = ((300 + i * 110 - t * 140) % 520 + 520) % 520; g.fillRect(x, 182, 24, 28); }
  // Funken
  g.fillStyle = "#FFFFFF"; for (let i = 0; i < 12; i++) { const a = t * 3 + i; g.fillRect(150 + Math.sin(a * 2.1) * 60, 150 + Math.cos(a * 1.7) * 40 - jy, 4, 4); }
  g.fillStyle = "#FFFFFF"; g.font = font(900, 30); g.fillText(`COMBO x${12 + Math.floor(t * 3) % 40}`, 18, 40);
  g.fillStyle = "#FF5B4B"; g.fillRect(330, 18, 160, 14); g.fillStyle = "#6FF2D0"; g.fillRect(330, 18, 160 * (0.6 + 0.3 * Math.sin(t)), 14);
  tex.needsUpdate = true;
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

const DigitClock: React.FC<{ text: string; position: Vec3; rotY?: number }> = ({ text, position, rotY = 0 }) => {
  const tex = useCanvasTex(256, 110, (g) => {
    g.fillStyle = "#0B0B0F"; g.fillRect(0, 0, 256, 110);
    g.fillStyle = "#FF4B3B"; g.font = font(800, 78, "monospace"); g.textAlign = "center"; g.fillText(text, 128, 84);
  }, [text]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <Box size={[0.26, 0.12, 0.08]} color="#1C1E24" position={[0, 0, -0.045]} cast={false} />
      <Painted size={[0.23, 0.1]} tex={tex} glow />
    </group>
  );
};

const PizzaBox: React.FC<{ position: Vec3; rotY?: number; open?: boolean }> = ({ position, rotY = 0, open }) => (
  <group position={position} rotation={[0, rotY, 0]}>
    <Box size={[0.36, 0.04, 0.36]} color="#D9B98A" position={[0, 0.02, 0]} roughness={0.95} />
    {open && <Box size={[0.36, 0.36, 0.02]} color="#D9B98A" position={[0, 0.2, -0.18]} rotation={[-0.25, 0, 0]} roughness={0.95} />}
    {open && <Box size={[0.12, 0.012, 0.1]} color="#C8402F" position={[0.06, 0.045, 0.05]} bevel={0} cast={false} />}
  </group>
);
const Can: React.FC<{ position: Vec3; color?: string; down?: boolean }> = ({ position, color = "#3D7DD8", down }) => (
  <mesh position={[position[0], position[1] + (down ? 0.033 : 0.06), position[2]]} rotation={down ? [0, 0.6, Math.PI / 2] : [0, 0, 0]} castShadow>
    <cylinderGeometry args={[0.033, 0.033, 0.12, 10]} />
    <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
  </mesh>
);
const Beanbag: React.FC<{ position: Vec3; color: string }> = ({ position, color }) => (
  <mesh position={[position[0], 0.26, position[2]]} scale={[0.52, 0.3, 0.52]} castShadow receiveShadow>
    <icosahedronGeometry args={[1, 2]} />
    <meshStandardMaterial color={color} roughness={0.8} flatShading />
  </mesh>
);

export const Bedroom: React.FC<{
  t: number; mood: RoomMood; mess?: number; tv?: boolean; clock?: string;
  max?: { pos: Vec3; rotY?: number; rotation?: Vec3; pose: Pose; joints?: Partial<Joints>; expr?: "neutral" | "happy" | "shock"; eyesClosed?: boolean };
  you?: { pos: Vec3; rotY: number; pose: Pose; joints?: Partial<Joints> };
}> = ({ t, mood, mess = 0, tv = false, clock, max, you }) => {
  const L = ROOM_LIGHT[mood];
  const night = mood === "night" || mood === "dawn";
  const clutter = useMemo(() => {
    const rr = rng(91);
    return Array.from({ length: 22 }).map(() => ({ x: rr.range(-1.0, 1.9), z: rr.range(-1.9, 1.9), rot: rr.range(0, 6.28), k: rr.int(0, 3), c: rr.pick(["#3D7DD8", "#E2473F", "#58B06C", "#F2C14E"]) }));
  }, []);
  return (
    <group>
      <SkyDome top={L.sky[0]} horizon={L.sky[1]} radius={300} sun={L.sunDir} sunSize={mood === "day" ? 1.2 : 0.6} />
      {/* Nachbarhäuser vor dem Fenster */}
      {[-14, -2, 10].map((x, i) => <House key={i} position={[x, -0.2, -24 - (i % 2) * 6]} seed={i + 11} scale={1.1} />)}
      {[-8, 5].map((x, i) => <Tree key={i} position={[x, -0.2, -12]} scale={2.2} seed={i + 21} />)}
      <Ground color={night ? "#2E4A3A" : PALETTE.grass} y={-0.25} size={300} />
      {/* Raum */}
      <Box size={[RW, 0.1, RD]} color="#A8835E" position={[0, -0.05, 0]} cast={false} roughness={0.6} bevel={0} />
      <Box size={[RW, 0.1, RD]} color="#F4F1EC" position={[0, RH + 0.05, 0]} bevel={0} />
      {/* Rückwand mit Fenster (Öffnung x 0..1.6, y 0.9..2.1) */}
      <Box size={[RW / 2, RH, 0.15]} color="#B9C7D6" position={[-RW / 4, RH / 2, -RD / 2]} bevel={0} />
      <Box size={[RW / 2 - 1.6, RH, 0.15]} color="#B9C7D6" position={[(1.6 + RW / 2) / 2, RH / 2, -RD / 2]} bevel={0} />
      <Box size={[1.6, 0.9, 0.15]} color="#B9C7D6" position={[0.8, 0.45, -RD / 2]} bevel={0} />
      <Box size={[1.6, RH - 2.1, 0.15]} color="#B9C7D6" position={[0.8, (RH + 2.1) / 2, -RD / 2]} bevel={0} />
      <Box size={[0.06, 1.2, 0.08]} color="#F4F4F4" position={[0.8, 1.5, -RD / 2]} cast={false} />
      <Box size={[1.7, 0.05, 0.3]} color="#E6E2DA" position={[0.8, 0.92, -RD / 2 + 0.12]} />
      <Box size={[RW, RH, 0.15]} color="#B9C7D6" position={[0, RH / 2, RD / 2]} bevel={0} />
      <Box size={[0.15, RH, RD]} color="#C9D3DE" position={[-RW / 2, RH / 2, 0]} bevel={0} />
      <Box size={[0.15, RH, RD]} color="#C9D3DE" position={[RW / 2, RH / 2, 0]} bevel={0} />
      {/* Poster */}
      <Box size={[0.6, 0.85, 0.02]} color="#E2473F" position={[-RW / 2 + 0.09, 1.75, -0.5]} rotation={[0, Math.PI / 2, 0]} cast={false} />
      <Box size={[0.5, 0.7, 0.02]} color="#9A5FD0" position={[-RW / 2 + 0.09, 1.6, 0.5]} rotation={[0, Math.PI / 2, 0]} cast={false} />
      <Box size={[0.7, 0.5, 0.02]} color="#F2C14E" position={[-0.6, 1.75, RD / 2 - 0.09]} cast={false} />
      <Box size={[0.45, 0.6, 0.02]} color="#3FAE6B" position={[-1.3, 1.85, -RD / 2 + 0.09]} cast={false} />
      {/* LED-Streifen (lila) */}
      <Box size={[RW - 0.3, 0.03, 0.03]} color="#C77DFF" emissive="#B45CFF" emissiveIntensity={night ? 3 : 0.6} position={[0, RH - 0.06, RD / 2 - 0.1]} cast={false} />
      <Box size={[0.03, 0.03, RD - 0.3]} color="#C77DFF" emissive="#B45CFF" emissiveIntensity={night ? 3 : 0.6} position={[-RW / 2 + 0.1, RH - 0.06, 0]} cast={false} />
      {night && <pointLight color="#B45CFF" intensity={4} distance={5} decay={2} position={[-1.6, RH - 0.3, 1.2]} />}
      {/* Bett */}
      <Bed position={BED_POS} sheet={mood === "grey" ? "#9AA5B1" : "#5E7FB0"} />
      {/* Nachttisch + Wecker */}
      <Box size={[0.42, 0.5, 0.4]} color="#D9C2A0" position={[-0.38, 0.25, -2.0]} />
      {clock && <DigitClock text={clock} position={[-0.38, 0.56, -2.0]} rotY={-Math.PI / 2 + 0.35} />}
      {/* TV-Wand + Konsole */}
      <Box size={[0.06, 0.86, 1.48]} color="#16181D" position={[TV_POS[0] + 0.02, TV_POS[1], TV_POS[2]]} metalness={0.4} roughness={0.3} />
      {tv ? (
        <group position={[TV_POS[0] - 0.015, TV_POS[1], TV_POS[2]]} rotation={[0, -Math.PI / 2, 0]}><GameScreen t={t} w={1.4} h={0.78} /></group>
      ) : (
        <Box size={[0.01, 0.78, 1.4]} color="#08090C" position={[TV_POS[0] - 0.015, TV_POS[1], TV_POS[2]]} roughness={0.15} metalness={0.2} cast={false} bevel={0} />
      )}
      {tv && <pointLight color="#8FA8FF" intensity={7} distance={6} decay={2} position={[TV_POS[0] - 0.6, TV_POS[1], TV_POS[2]]} />}
      <Box size={[0.4, 0.45, 1.6]} color="#2A2D33" position={[RW / 2 - 0.25, 0.22, -0.4]} />
      <Box size={[0.25, 0.06, 0.3]} color="#F4F4F4" position={[RW / 2 - 0.25, 0.48, -0.1]} cast={false} />
      {/* Sitzsäcke */}
      <Beanbag position={BEANBAG_YOU} color="#E2473F" />
      <Beanbag position={BEANBAG_MAX} color="#3FAE6B" />
      {/* Kram auf dem Boden (Pizza, Dosen, Klamotten) */}
      {clutter.slice(0, Math.round(mess * clutter.length)).map((c, i) =>
        c.k === 0 ? <PizzaBox key={i} position={[c.x, 0, c.z]} rotY={c.rot} open={i % 3 === 0} /> :
        c.k === 1 ? <Can key={i} position={[c.x, 0, c.z]} color={c.c} down={i % 2 === 0} /> :
        <Box key={i} size={[0.42, 0.06, 0.3]} color={c.c} position={[c.x, 0.03, c.z]} rotation={[0, c.rot, 0.05]} bevel={0.4} />
      )}
      {/* Max (+ du in Außenansicht) */}
      {max && <Max position={max.pos} rotation={max.rotation} rotationY={max.rotY} pose={max.pose} time={t} joints={max.joints} expression={max.expr ?? "neutral"} eyesClosed={max.eyesClosed} />}
      {you && <Character outfit={YOU} position={you.pos} rotationY={you.rotY} pose={you.pose} time={t} joints={you.joints} expression="happy" />}
      {/* Staub im Licht */}
      {mood === "day" && <Particles kind="sparkle" n={70} box={[2, 1.6, 3]} center={[0.6, 1.2, -1.0]} time={t} sizeScale={0.35} opacity={0.7} />}
    </group>
  );
};

// ═════════════════════════ Freibad ═════════════════════════

const POOL = { w: 12, l: 25, depth: 1.4, water: -0.12 };
export const BOARD_END: Vec3 = [0, 1.05, -POOL.l / 2 + 2.6];

/** Wasserspritzer (Arschbombe) ab Zeit t0 an Position p */
const Splash: React.FC<{ t: number; t0: number; p: Vec3 }> = ({ t, t0, p }) => {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const base = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 140 }).map(() => {
      const a = r.range(0, Math.PI * 2), sp = r.range(0.6, 3.2);
      return { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: r.range(3.5, 7.5), s: r.range(0.03, 0.09), d: r.range(0, 0.12) };
    });
  }, []);
  const a0 = t - t0;
  if (a0 < 0) return null;
  const items: Inst[] = [];
  for (const b of base) {
    const a = a0 - b.d;
    if (a < 0) continue;
    const y = p[1] + b.vy * a - 4.9 * a * a;
    if (y < POOL.water - 0.05) continue;
    items.push({ p: [p[0] + b.vx * a, y, p[2] + b.vz * a], s: b.s, c: "#E8F8FF" });
  }
  const ring = clamp(a0 / 1.2);
  return (
    <group>
      <Instanced items={items} geometry={geo} cast={false} />
      <mesh position={[p[0], POOL.water + 0.01, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3 + ring * 2.4, 0.5 + ring * 2.6, 40]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7 * (1 - ring)} />
      </mesh>
    </group>
  );
};

/** Max: Anlauf auf dem Brett, Sprung, Arschbombe. Gibt Position + Gelenke zurück. */
export const cannonball = (t: number, t0: number) => {
  const run = clamp((t - t0) / 0.45);
  const air = t - (t0 + 0.45);
  const startZ = BOARD_END[2] - 2.2;
  if (air < 0) return { pos: [0, BOARD_END[1], lerp(startZ, BOARD_END[2], run)] as Vec3, pose: "run" as Pose, joints: {} as Partial<Joints>, rx: 0, inWater: false };
  const vy = 3.6, vz = 2.0;
  const y = BOARD_END[1] + vy * air - 4.9 * air * air;
  const tuck: Partial<Joints> = { lHip: -1.7, rHip: -1.7, lArmX: -1.4, rArmX: -1.4, lArmZ: -0.2, rArmZ: 0.2, headX: 0.3, bodyX: 0.4 };
  return { pos: [0, Math.max(y, POOL.water - 1.6), BOARD_END[2] + vz * air] as Vec3, pose: "idle" as Pose, joints: tuck, rx: -air * 1.2, inWater: y < POOL.water };
};
export const splashAt = (t0: number) => {
  // Zeitpunkt, an dem y = Wasser (0,45 s Anlauf + Flug)
  const vy = 3.6, h = BOARD_END[1] - POOL.water;
  const air = (vy + Math.sqrt(vy * vy + 4 * 4.9 * h)) / (2 * 4.9);
  return { at: t0 + 0.45 + air, p: [0, POOL.water, BOARD_END[2] + 2.0 * air] as Vec3 };
};

export const Freibad: React.FC<{ t: number; jump: number }> = ({ t, jump }) => {
  const cb = cannonball(t, jump);
  const sp = splashAt(jump);
  const swimmers = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 16 }).map((_, i) => ({ x: r.range(-5, 5), z: r.range(-5, 11), seed: 400 + i * 3, rot: r.range(0, 6.28), ph: r.range(0, 6) }));
  }, []);
  const towels = useMemo(() => {
    const r = rng(19);
    return Array.from({ length: 12 }).map((_, i) => ({ x: (i % 2 ? 1 : -1) * r.range(9, 15), z: r.range(-12, 12), c: r.pick(["#E2473F", "#F2C14E", "#3D7DD8", "#9A5FD0", "#FF8A3D"]), seed: 500 + i * 5, sit: r.next() < 0.6 }));
  }, []);
  return (
    <group>
      <SkyDome top="#4C9BE8" horizon="#CFE9F7" radius={600} sun={[30, 60, -40]} />
      {[[-60, 40, -120], [40, 55, -160], [90, 45, -90]].map((p, i) => <Cloud key={i} position={p as Vec3} scale={9} seed={i + 2} />)}
      {/* Rasen mit Aussparung fürs Becken */}
      {(() => { const hw = POOL.w / 2 + 2, hl = POOL.l / 2 + 2, S = 200; return [[0, hl + S / 2, 2 * S, S], [0, -hl - S / 2, 2 * S, S], [hw + S / 2, 0, S, 2 * hl], [-hw - S / 2, 0, S, 2 * hl]].map(([x, z, w, l], i) => (
        <Box key={i} size={[w, 0.1, l]} color={PALETTE.grass} position={[x, -0.06, z]} cast={false} roughness={0.95} bevel={0} />
      )); })()}
      {/* Beckenrand (Platten) */}
      {[[0, (POOL.l + 2) / 2, POOL.w + 4, 2], [0, -(POOL.l + 2) / 2, POOL.w + 4, 2], [(POOL.w + 2) / 2, 0, 2, POOL.l], [-(POOL.w + 2) / 2, 0, 2, POOL.l]].map(([x, z, w, l], i) => (
        <Box key={i} size={[w, 0.1, l]} color="#E9E4DA" position={[x, -0.04, z]} cast={false} roughness={0.8} bevel={0} />
      ))}
      {/* Becken: Wände + Boden (hellblau gefliest) */}
      <Box size={[POOL.w, 0.1, POOL.l]} color="#7FD3EA" position={[0, -POOL.depth, 0]} cast={false} bevel={0} />
      {[[POOL.w / 2, POOL.l, 0.12], [-POOL.w / 2, POOL.l, 0.12]].map(([x, l], i) => <Box key={i} size={[0.12, POOL.depth, l]} color="#8EDCF0" position={[x, -POOL.depth / 2 + 0.02, 0]} bevel={0} cast={false} />)}
      {[POOL.l / 2, -POOL.l / 2].map((z, i) => <Box key={i} size={[POOL.w, POOL.depth, 0.12]} color="#8EDCF0" position={[0, -POOL.depth / 2 + 0.02, z]} bevel={0} cast={false} />)}
      {/* Bahnen auf dem Boden */}
      {[-3, 0, 3].map((x) => <Box key={x} size={[0.25, 0.02, POOL.l - 2]} color="#2F6FA8" position={[x, -POOL.depth + 0.06, 0]} bevel={0} cast={false} />)}
      {/* Wasser */}
      <mesh position={[0, POOL.water, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[POOL.w - 0.1, POOL.l - 0.1, 1, 1]} />
        <meshStandardMaterial color="#2FB4E0" transparent opacity={0.72} roughness={0.08} metalness={0.1} />
      </mesh>
      <Particles kind="sparkle" n={160} box={[POOL.w - 1, 0.02, POOL.l - 1]} center={[0, POOL.water + 0.02, 0]} time={t} sizeScale={0.8} />
      {/* Sprungbrett */}
      <Box size={[0.6, 0.08, 3.2]} color="#F4F4F4" position={[0, BOARD_END[1] - 0.04, BOARD_END[2] - 1.4]} roughness={0.4} />
      <Box size={[0.5, BOARD_END[1], 0.5]} color="#3D7DD8" position={[0, BOARD_END[1] / 2, BOARD_END[2] - 2.8]} />
      {/* Max */}
      <Max position={cb.pos} rotation={[cb.rx, 0, 0]} pose={cb.pose} time={t} joints={cb.joints} expression="happy" speed={1.6} />
      <Splash t={t} t0={sp.at} p={sp.p} />
      {/* Leute im Wasser (Oberkörper raus) */}
      {swimmers.map((s, i) => (
        <Person key={i} seed={s.seed} pose={i % 3 === 0 ? "cheer" : "idle"} time={t} position={[s.x, POOL.water - 1.15 + Math.sin(t * 2 + s.ph) * 0.04, s.z]} rotationY={s.rot} expression="happy" />
      ))}
      {/* Liegewiese */}
      {towels.map((w, i) => (
        <group key={i}>
          <Box size={[0.9, 0.02, 1.8]} color={w.c} position={[w.x, 0.01, w.z]} bevel={0} cast={false} />
          <Person seed={w.seed} pose={w.sit ? "sit" : "idle"} time={t} position={[w.x, w.sit ? 0.02 - 0.0 : 0, w.z]} rotationY={w.x > 0 ? -Math.PI / 2 : Math.PI / 2} expression="happy" />
        </group>
      ))}
      {/* Bäume + Hecke + Bademeister-Turm */}
      {Array.from({ length: 10 }).map((_, i) => <Tree key={i} position={[(i % 2 ? 1 : -1) * (20 + (i % 3) * 4), 0, -20 + i * 4.5]} scale={2.6} seed={i + 30} />)}
      {Array.from({ length: 8 }).map((_, i) => <Bush key={i} position={[-30 + i * 8.5, 0, -24]} scale={2.2} seed={i + 7} />)}
      <Box size={[0.2, 2.2, 0.2]} color="#F4F4F4" position={[POOL.w / 2 + 1.2, 1.1, 2]} />
      <Box size={[0.8, 0.1, 0.8]} color="#E2473F" position={[POOL.w / 2 + 1.2, 2.2, 2]} />
      <GrassBlades n={1600} area={[60, 60]} center={[0, 0, 0]} height={[0.06, 0.16]} />
    </group>
  );
};

// ═════════════════════════ Vorstellungsgespräch ═════════════════════════

export const EYE_OFFICE: Vec3 = [0, 1.22, 1.05];
export const Office: React.FC<{ t: number; boss: { pose: Pose; joints?: Partial<Joints>; expr?: "neutral" | "happy" | "shock" } }> = ({ t, boss }) => {
  const cv = useCanvasTex(420, 594, (g) => {
    g.fillStyle = "#FFFFFF"; g.fillRect(0, 0, 420, 594);
    g.fillStyle = "#1E2430"; g.font = font(800, 36); g.fillText(tr("LEBENSLAUF", "RÉSUMÉ"), 30, 64);
    g.font = font(600, 22); g.fillStyle = "#444C58";
    const rows: [string, string][] = getLang() === "en"
      ? [["Diploma:", "—"], ["Training:", "—"], ["Spanish:", "“sí”"], ["Math:", "—"], ["Strengths:", "Gaming, sleeping"]]
      : [["Schulabschluss:", "—"], ["Ausbildung:", "—"], ["Englisch:", "„yes“"], ["Mathe:", "—"], ["Stärken:", "Zocken, Schlafen"]];
    rows.forEach(([a, b], i) => { g.fillText(a, 30, 130 + i * 56); g.fillStyle = i === 4 ? "#2B4FA8" : "#C8402F"; g.font = font(800, 24); g.fillText(b, 220, 130 + i * 56); g.fillStyle = "#444C58"; g.font = font(600, 22); });
  }, []);
  return (
    <group>
      <SkyDome top="#6FA8DC" horizon="#D8E8F2" radius={400} sun={[-20, 30, -40]} />
      {/* Skyline hinter der Glaswand */}
      {Array.from({ length: 9 }).map((_, i) => <Building key={i} size={[12, 30 + (i * 13) % 40, 12]} position={[-48 + i * 12, -20, -50 - (i % 3) * 14]} seed={i + 40} />)}
      {/* Boden, Wände */}
      <Box size={[7, 0.1, 7]} color="#6A6E76" position={[0, -0.05, -1]} cast={false} roughness={0.7} bevel={0} />
      <Box size={[7, 0.1, 7]} color="#F2F2F0" position={[0, 2.95, -1]} cast={false} bevel={0} />
      <Box size={[0.15, 3, 7]} color="#E9ECEF" position={[3.5, 1.5, -1]} bevel={0} />
      <Box size={[0.15, 3, 7]} color="#E9ECEF" position={[-3.5, 1.5, -1]} bevel={0} />
      <Box size={[7, 3, 0.15]} color="#E9ECEF" position={[0, 1.5, 2.5]} bevel={0} />
      {/* Glaswand hinten */}
      {[-3, -1.5, 0, 1.5, 3].map((x) => <Box key={x} size={[0.06, 3, 0.06]} color="#3B434D" position={[x, 1.5, -4.4]} metalness={0.6} roughness={0.3} />)}
      <Box size={[7, 0.08, 0.1]} color="#3B434D" position={[0, 0.04, -4.4]} />
      {/* Tür rechts */}
      <Box size={[0.08, 2.2, 1.0]} color="#8E6A4A" position={[3.42, 1.1, 0.8]} />
      <Box size={[0.05, 0.05, 0.18]} color="#C9C4BA" position={[3.36, 1.05, 0.45]} metalness={0.8} roughness={0.3} />
      <Box size={[0.04, 0.3, 0.7]} color="#58B06C" emissive="#58B06C" emissiveIntensity={0.6} position={[3.4, 2.5, 0.8]} cast={false} />
      {/* Schreibtisch */}
      <Box size={[1.9, 0.06, 0.95]} color="#F4F4F4" position={[0, 0.74, -0.3]} roughness={0.35} />
      <Box size={[1.8, 0.7, 0.04]} color="#D2D6DB" position={[0, 0.38, -0.7]} />
      <Box size={[0.55, 0.36, 0.03]} color="#1C2026" position={[-0.5, 1.02, -0.55]} rotation={[0, 0.5, 0]} metalness={0.4} roughness={0.3} />
      <Painted size={[0.21, 0.297]} tex={cv} position={[0.12, 0.775, -0.05]} rotation={[-Math.PI / 2, 0, 0.12]} />
      <mesh position={[0.6, 0.8, -0.4]} castShadow><cylinderGeometry args={[0.04, 0.035, 0.1, 10]} /><meshStandardMaterial color="#FFFFFF" roughness={0.3} /></mesh>
      {/* Pflanze */}
      <group position={[-2.6, 0, -3.4]}>
        <Box size={[0.4, 0.45, 0.4]} color="#F4F4F4" position={[0, 0.22, 0]} />
        <Bush position={[0, 0.5, 0]} scale={0.8} seed={4} />
      </group>
      {/* Chefin */}
      <Character outfit={BOSS} pose={boss.pose} time={t} position={[0, 0, -1.25]} rotationY={0} expression={boss.expr ?? "neutral"} joints={boss.joints} hairLong={0.25} hairColor="#3A2A20" />
      <Box size={[0.5, 1.1, 0.12]} color="#1E1E24" position={[0, 0.75, -1.6]} />
    </group>
  );
};

// ═════════════════════════ Deine alte Schule (Jahr 10, zugewachsen) ═════════════════════════

export const SchoolRuin: React.FC<{ t: number; max?: { pos: Vec3; rotY: number; pose: Pose; joints?: Partial<Joints>; expr?: "neutral" | "happy" | "shock" } }> = ({ t, max }) => {
  const sign = useCanvasTex(640, 120, (g) => {
    g.fillStyle = "#F2EEE4"; g.fillRect(0, 0, 640, 120);
    g.fillStyle = "#3A3F47"; g.font = font(900, 70); g.textAlign = "center"; g.fillText(tr("GESAMTSCHULE", "HIGH SCHOOL"), 320, 88);
  }, []);
  const closed = useCanvasTex(300, 150, (g) => {
    g.fillStyle = "#C8402F"; g.fillRect(0, 0, 300, 150);
    g.strokeStyle = "#FFFFFF"; g.lineWidth = 8; g.strokeRect(10, 10, 280, 130);
    g.fillStyle = "#FFFFFF"; g.font = font(900, 46); g.textAlign = "center"; g.fillText(tr("GESCHLOSSEN", "CLOSED"), 150, 82); g.font = font(700, 26); g.fillText(tr("seit 10 Jahren", "for 10 years"), 150, 120);
  }, []);
  const ivy = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 70 }).map(() => ({ p: [r.range(-19, 19), r.range(0.2, 8), -0.0] as Vec3, s: r.range(0.6, 1.8) }));
  }, []);
  const ivyGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const grass = useStripedGrass(20, "#6FAE4F" as typeof PALETTE.grass, "#5E9A45" as typeof PALETTE.grassDark);
  return (
    <group>
      <SkyDome top="#6E86B8" horizon="#F6C79A" radius={700} sun={[-60, 18, 30]} />
      <Ground map={grass} size={600} />
      {/* Stadt dahinter */}
      {Array.from({ length: 10 }).map((_, i) => <Building key={i} size={[14, 16 + (i * 17) % 30, 14]} position={[-80 + i * 18, 0, -70 - (i % 3) * 18]} seed={i + 60} />)}
      {/* Schulhof: rissiger Asphalt */}
      <Box size={[44, 0.06, 18]} color="#6B6E72" position={[0, 0.03, 4]} cast={false} roughness={0.95} bevel={0} />
      {Array.from({ length: 14 }).map((_, i) => <Box key={i} size={[0.08, 0.07, 3 + (i % 4)]} color="#3E4043" position={[-18 + i * 2.8, 0.04, 2 + (i % 5) * 2]} rotation={[0, (i * 0.7) % 1.6 - 0.8, 0]} bevel={0} cast={false} />)}
      {/* Schulgebäude */}
      <Building size={[40, 10, 12]} position={[0, 0, -6]} color="#E3C7A1" roof="#7A6F66" seed={9} />
      <Box size={[6.4, 1.3, 0.2]} color="#3A3F47" position={[0, 8.6, 0.1]} />
      <Painted size={[6.2, 1.15]} tex={sign} position={[0, 8.6, 0.22]} />
      {/* kaputte Fenster (dunkel) */}
      {[-14, -9, 6, 12, 16].map((x, i) => <Box key={i} size={[1.6, 1.2, 0.05]} color="#15171B" position={[x, 2 + (i % 3) * 3, 0.03]} bevel={0} cast={false} />)}
      {/* Efeu an der Fassade */}
      <Instanced items={ivy.map((v) => ({ p: [v.p[0], v.p[1], 0.1], s: [v.s, v.s * 0.8, 0.25], c: rng(Math.round(v.p[0] * 100)).pick(PALETTE.leaf) }))} geometry={ivyGeo} />
      {/* Bäume und Büsche, die im Hof wachsen */}
      {[[-12, 6], [-4, 9], [8, 5], [15, 9], [2, 3]].map(([x, z], i) => <Tree key={i} position={[x, 0, z]} scale={1.4 + (i % 3) * 0.5} seed={i + 50} />)}
      {Array.from({ length: 16 }).map((_, i) => <Bush key={i} position={[-20 + i * 2.7, 0, 0.8 + (i % 3) * 0.6]} scale={0.9 + (i % 4) * 0.3} seed={i + 70} />)}
      <GrassBlades n={4000} area={[44, 16]} center={[0, 0, 5]} height={[0.2, 0.6]} seed={3} />
      {/* Zaun + Tor mit Kette */}
      {Array.from({ length: 41 }).map((_, i) => {
        const x = -20 + i;
        if (Math.abs(x) < 2) return null;
        return <Box key={i} size={[0.06, 2, 0.06]} color="#4A4F5A" position={[x, 1, 13]} bevel={0} />;
      })}
      <Box size={[40, 0.06, 0.06]} color="#4A4F5A" position={[0, 1.95, 13]} bevel={0} />
      <Box size={[40, 0.06, 0.06]} color="#4A4F5A" position={[0, 0.3, 13]} bevel={0} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <Box size={[0.14, 2.4, 0.14]} color="#3B434D" position={[s * 2, 1.2, 13]} />
          {Array.from({ length: 9 }).map((_, i) => <Box key={i} size={[0.04, 1.8, 0.04]} color="#5E6B78" position={[s * (0.15 + i * 0.22), 1.0, 13]} bevel={0} />)}
          <Box size={[2, 0.06, 0.06]} color="#5E6B78" position={[s * 1, 1.85, 13]} bevel={0} />
          <Box size={[2, 0.06, 0.06]} color="#5E6B78" position={[s * 1, 0.25, 13]} bevel={0} />
        </group>
      ))}
      {/* Kette + Schloss */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-0.3 + i * 0.1, 1.1 - Math.sin((i / 6) * Math.PI) * 0.12, 13.06]} rotation={[0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2]}>
          <torusGeometry args={[0.045, 0.012, 6, 10]} />
          <meshStandardMaterial color="#8B95A1" metalness={0.8} roughness={0.45} />
        </mesh>
      ))}
      <Box size={[0.1, 0.12, 0.05]} color="#B08A3A" position={[0, 0.94, 13.08]} metalness={0.8} roughness={0.3} />
      <Painted size={[1.0, 0.5]} tex={closed} position={[0.9, 1.4, 13.05]} rotation={[0, 0, -0.06]} />
      {max && <Max position={max.pos} rotationY={max.rotY} pose={max.pose} time={t} joints={max.joints} expression={max.expr ?? "neutral"} />}
      <Particles kind="dust" n={160} box={[30, 8, 20]} center={[0, 3, 6]} time={t} sizeScale={0.7} colors={["#FFE7C2", "#FFF6E0"]} />
    </group>
  );
};

export { Particles, lerp };
