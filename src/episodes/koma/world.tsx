// Szenen für „Was wäre, wenn du 30 Jahre im Koma liegst?“ – fast alles aus Max' Augen.
//  Street – Fahrt mit dem Rad (Ego), Blick aufs Handy, Auto, danach am Boden liegend (Blaulicht)
//  Ward   – Krankenzimmer: Ego (liegend/sitzend) oder von außen; Tageslicht, Jahreszeiten, Besucher, Pflanze, Monitor
//  Town   – Drohne über Krankenhaus und Stadt (Winter, Zukunft, Nacht)
import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { clamp, keys3, lerp, mixHex, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glow, Glass, Character, Max, Person, MAX_OUTFIT, Building, Road, Tree, Car, StreetLamp, CityGrid,
  SkyDome, Stars, Particles, Cloud, type Pose, type Outfit, type Joints,
} from "../../three/kit";
import { years } from "./metric";
import { intl, t as tr } from "../../lib/i18n";

export type Cam = { pos: Vec3; look: Vec3; fov?: number; roll?: number };
export type CamFn = (c: { t: number; local: number; p: number }) => Cam;

/** Kamerafahrt a → b über die Shotdauer */
export const move = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45): CamFn => ({ p }) => ({
  pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], p),
  look: keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la }], p),
  fov,
});

const V = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);
/** Orientierung „schaut von eye nach target“ (+z zeigt zur Kamera) */
const facing = (eye: Vec3, target: Vec3) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(V(eye), V(target), new THREE.Vector3(0, 1, 0)));

/** Quader zwischen zwei Punkten (Arme in Ego-Sicht) */
const Limb: React.FC<{ a: Vec3; b: Vec3; w: number; color: string }> = ({ a, b, w, color }) => {
  const A = V(a), B = V(b);
  const d = B.clone().sub(A);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const m = A.clone().add(B).multiplyScalar(0.5);
  return (
    <group position={[m.x, m.y, m.z]} quaternion={q}>
      <Box size={[w, len, w * 1.1]} color={color} cast={false} />
    </group>
  );
};

// ═════════════════════════ Handy (Canvas-Bildschirm) ═════════════════════════

export type ChatItem = { me?: boolean; text: string; time?: string } | { divider: string };
export type PhoneUI =
  | { kind: "chat"; contact: string; items: ChatItem[]; input?: string; cursor?: boolean; typing?: boolean; clock?: string }
  | { kind: "lock"; clock: string; date: string; notes: { app: string; text: string }[]; more?: number; battery?: number }
  | { kind: "dead" };

const CW = 400, CH = 828;
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { const n = cur ? cur + " " + w : w; if (g.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur);
  return lines;
}
function drawPhone(g: CanvasRenderingContext2D, ui: PhoneUI, time: number) {
  g.clearRect(0, 0, CW, CH);
  if (ui.kind === "dead") {
    g.fillStyle = "#050607"; g.fillRect(0, 0, CW, CH);
    return;
  }
  if (ui.kind === "lock") {
    const grd = g.createLinearGradient(0, 0, 0, CH); grd.addColorStop(0, "#2C3E66"); grd.addColorStop(1, "#7A5A8A");
    g.fillStyle = grd; g.fillRect(0, 0, CW, CH);
    g.fillStyle = "#FFFFFF"; g.textAlign = "center";
    g.font = "600 22px Inter, sans-serif"; g.fillText(ui.date, CW / 2, 118);
    g.font = "600 104px Inter, sans-serif"; g.fillText(ui.clock, CW / 2, 224);
    let y = 300;
    for (const n of ui.notes) {
      g.fillStyle = "rgba(255,255,255,0.88)"; rr(g, 22, y, CW - 44, 92, 22); g.fill();
      g.textAlign = "left"; g.fillStyle = "#1A2230"; g.font = "700 22px Inter, sans-serif"; g.fillText(n.app, 44, y + 36);
      g.fillStyle = "#2A3240"; g.font = "500 22px Inter, sans-serif"; g.fillText(n.text, 44, y + 68);
      y += 104;
    }
    if (ui.more) {
      g.textAlign = "center"; g.fillStyle = "#FFFFFF"; g.font = "700 26px Inter, sans-serif";
      g.fillText(`+ ${intl().format(ui.more)} ${tr("weitere", "more")}`, CW / 2, y + 40);
    }
    if (ui.battery != null) {
      g.strokeStyle = "#FFFFFF"; g.lineWidth = 3; rr(g, CW - 74, 22, 44, 22, 6); g.stroke();
      g.fillStyle = ui.battery < 0.1 ? "#FF5B4B" : "#FFFFFF"; g.fillRect(CW - 70, 26, Math.max(2, 36 * ui.battery), 14);
    }
    return;
  }
  // Chat
  g.fillStyle = "#EEF1F2"; g.fillRect(0, 0, CW, CH);
  g.fillStyle = "#1F2A30"; g.fillRect(0, 0, CW, 116);
  g.fillStyle = "#6FF2D0"; g.beginPath(); g.arc(58, 76, 26, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#1F2A30"; g.font = "700 26px Inter, sans-serif"; g.textAlign = "center"; g.fillText(ui.contact[0], 58, 85);
  g.textAlign = "left"; g.fillStyle = "#FFFFFF"; g.font = "700 28px Inter, sans-serif"; g.fillText(ui.contact, 100, 86);
  if (ui.clock) { g.font = "600 18px Inter, sans-serif"; g.fillText(ui.clock, 24, 30); }
  // Eingabe
  const inH = 74, inY = CH - inH - 22;
  g.fillStyle = "#FFFFFF"; rr(g, 16, inY, CW - 32, inH, 37); g.fill();
  g.font = "500 25px Inter, sans-serif"; g.fillStyle = ui.input ? "#1A2230" : "#9AA2A8";
  const txt = ui.input || tr("Nachricht", "Message");
  g.fillText(txt, 40, inY + 46);
  if (ui.cursor && Math.floor(time * 2.5) % 2 === 0) { const w = ui.input ? g.measureText(ui.input).width : 0; g.fillStyle = "#2BB894"; g.fillRect(42 + w, inY + 22, 3, 32); }
  // Nachrichten von unten nach oben
  let y = inY - 18;
  const items = [...ui.items];
  if (ui.typing) items.push({ text: "…" });
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k];
    if ("divider" in it) {
      g.font = "700 18px Inter, sans-serif";
      const w = g.measureText(it.divider).width + 32;
      y -= 40;
      g.fillStyle = "#D7DDE0"; rr(g, (CW - w) / 2, y, w, 32, 16); g.fill();
      g.fillStyle = "#4A5560"; g.textAlign = "center"; g.fillText(it.divider, CW / 2, y + 23); g.textAlign = "left";
      y -= 14;
      continue;
    }
    const isTyping = ui.typing && k === items.length - 1;
    g.font = "500 27px Inter, sans-serif";
    const lines = isTyping ? [""] : wrap(g, it.text, 250);
    const w = isTyping ? 96 : Math.max(...lines.map((l) => g.measureText(l).width)) + 36;
    const h = lines.length * 34 + (it.time ? 46 : 26);
    y -= h;
    const x = it.me ? CW - 18 - w : 18;
    g.fillStyle = it.me ? "#BFF5E3" : "#FFFFFF"; rr(g, x, y, w, h, 22); g.fill();
    if (isTyping) {
      for (let d = 0; d < 3; d++) { const a = 0.35 + 0.65 * Math.max(0, Math.sin(time * 7 - d * 0.9)); g.fillStyle = `rgba(90,100,110,${a})`; g.beginPath(); g.arc(x + 28 + d * 20, y + h / 2, 7, 0, Math.PI * 2); g.fill(); }
    } else {
      g.fillStyle = "#1A2230";
      lines.forEach((l, i) => g.fillText(l, x + 18, y + 36 + i * 34));
      if (it.time) { g.font = "500 16px Inter, sans-serif"; g.fillStyle = "#6A7680"; g.textAlign = "right"; g.fillText(it.time, x + w - 16, y + h - 14); g.textAlign = "left"; }
    }
    y -= 14;
  }
}

/** Smartphone (9 × 15,5 cm). +z = Bildschirmseite. */
export const Phone: React.FC<{ ui: PhoneUI; time: number; position?: Vec3; quaternion?: THREE.Quaternion; rotation?: Vec3; scale?: number }> = ({ ui, time, position, quaternion, rotation, scale = 1 }) => {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement("canvas"); c.width = CW; c.height = CH;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    return { canvas: c, tex: tx };
  }, []);
  const g = canvas.getContext("2d")!;
  drawPhone(g, ui, time);
  tex.needsUpdate = true;
  return (
    <group position={position} quaternion={quaternion} rotation={quaternion ? undefined : rotation} scale={scale}>
      <Box size={[0.077, 0.158, 0.009]} color="#1C2026" roughness={0.3} metalness={0.4} cast={false} bevel={0.4} />
      <mesh position={[0, 0, 0.0047]}>
        <planeGeometry args={[0.069, 0.143]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={ui.kind === "dead" ? "#000000" : "#E8E8E8"} />
      </mesh>
    </group>
  );
};

// ═════════════════════════ Straße (Ego auf dem Rad) ═════════════════════════

const MEDIC: Outfit = { skin: "#D9A37A", hair: "#3A2A20", top: "#E2473F", pants: "#2F3B4C", shoes: "#2F3B4C" };
const MEDIC2: Outfit = { skin: "#F1C7A0", hair: "#C9A15B", top: "#FF8A3D", pants: "#2F3B4C", shoes: "#2F3B4C" };
const LANE = 1.7;
export const bikeZ = (t: number) => 20 - t * 5.6; // 20 km/h nach -z
const CRASH_Z = -4.6;
const carX = (t: number) => LANE + (4.45 - t) * 13;

export type StreetPhase = "ride" | "phone" | "car" | "ground";

/** Ego auf dem Fahrrad: Lenker, Arme, Handy. `look` relativ zum Kopf. */
export const Street: React.FC<{ shot: ShotInfo; phase: StreetPhase; look: (local: number) => Vec3; ui?: PhoneUI; lights?: (t: number) => number }> = ({ shot, phase, look, ui, lights }) => {
  const { t, local } = useTimes(shot);
  const ground = phase === "ground";
  const bz = ground ? CRASH_Z : bikeZ(t);
  const sway = Math.sin(t * 2.2) * 0.03;
  const eye: Vec3 = ground ? [LANE + 0.6, 0.22, CRASH_Z + 1.2] : [LANE + sway, 1.62 + Math.abs(Math.sin(t * 4.4)) * 0.012, bz];
  const lk = look(local);
  const target: Vec3 = [eye[0] + lk[0], eye[1] + lk[1], eye[2] + lk[2]];
  const sunDir: Vec3 = [-40, 9, -70];
  const blue = ground ? (Math.sin(t * 13) > 0 ? 1 : 0.15) : 0;
  const phoneOn = phase === "phone" || phase === "car";
  // Bike-Frame (Lenker) – lokal: -z = Fahrtrichtung
  const bp: Vec3 = [LANE + sway * 0.6, 0, bz];
  const grip = (s: number): Vec3 => [bp[0] + s * 0.3, 1.04, bz - 0.55];
  const shoulder = (s: number): Vec3 => [bp[0] + s * 0.24, 1.22, bz + 0.12];
  const phonePos: Vec3 = [LANE + 0.04, 1.42, bz - 0.29];
  const r = rng(5);
  const blocks = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number; d: number; seed: number }[] = [];
    for (const side of [-1, 1]) {
      let z = 40;
      while (z > -120) {
        const d = r.range(9, 16);
        if (!(z - d < -0.5 && z > -11.5)) out.push({ x: side * (11 + r.range(0, 1.5)), z: z - d / 2, w: r.range(7, 9), h: r.range(9, 19), d: d - 0.6, seed: r.int(1, 999) });
        z -= d;
        if (z < -0.5 && z > -11.5) z = -11.5;
      }
    }
    return out;
  }, []);
  return (
    <Stage preset="golden" sunDir={sunDir} sunIntensity={2.4} fog={["#E9A88A", 40, 260]} shadowCenter={[LANE, 0, bz - 6]} shadowSize={22} aoRadius={0.4}>
      <Camera pos={eye} look={target} fov={ground ? 58 : 62} near={0.03} far={6000} />
      <SkyDome top="#5C74C2" horizon="#FFB27A" bottom="#E9A47C" radius={4000} sun={sunDir} sunColor="#FFD2A0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow><planeGeometry args={[3000, 3000]} /><Flat color={PALETTE.sidewalk} /></mesh>
      <Road length={300} width={8} position={[0, 0, -40]} />
      <Road length={300} width={8} position={[0, 0.005, -6]} rotationY={Math.PI / 2} lines={false} />
      {/* Radweg-Markierung */}
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[3.0, 0.045, 40 - i * 4]}><planeGeometry args={[0.12, 2]} /><Flat color="#F2F0E6" /></mesh>
      ))}
      {/* Zebrastreifen */}
      {Array.from({ length: 7 }).map((_, i) => <Box key={i} size={[0.5, 0.02, 2.4]} color="#F2F0E6" position={[-3 + i * 1, 0.04, -0.8]} cast={false} bevel={0} />)}
      {blocks.map((b, i) => <Building key={i} position={[b.x, 0, b.z]} size={[b.w, b.h, b.d]} seed={b.seed} lit />)}
      {Array.from({ length: 12 }).map((_, i) => {
        const z = 36 - i * 13;
        if (z < 0 && z > -12) return null;
        return (
          <group key={i}>
            <Tree position={[6.4, 0, z]} seed={i + 2} scale={1.3} />
            <Tree position={[-6.4, 0, z - 6]} seed={i + 30} scale={1.2} />
            <StreetLamp position={[5.8, 0, z - 4]} on />
          </group>
        );
      })}
      {[[-3.0, 14, 0], [-3.0, 26, 0], [3.0, 30, Math.PI], [-3.0, -22, 0], [3.0, -30, Math.PI]].map(([x, z, ry], i) => (
        <Car key={i} seed={i + 4} position={[x, 0, z]} rotationY={ry} />
      ))}
      {/* Gegenverkehr in der Ferne */}
      <Car seed={9} position={[-1.8, 0, -60 + t * 9]} rotationY={0} />
      {/* Das Auto von rechts */}
      {!ground && <Car color="#3D7DD8" position={[carX(t), 0, -6.6 + 1.6]} rotationY={-Math.PI / 2} />}
      {!ground && t > 3.4 && <pointLight position={[carX(t) - 2.6, 0.9, -5]} intensity={25} distance={16} decay={2} color="#FFF2D0" />}

      {/* Ego: Fahrrad + Arme */}
      {!ground && (
        <group>
          <Box size={[0.66, 0.035, 0.035]} color="#2A2D33" position={[bp[0], 1.04, bz - 0.55]} bevel={0} roughness={0.4} metalness={0.5} />
          <Box size={[0.04, 0.32, 0.04]} color="#2A2D33" position={[bp[0], 0.9, bz - 0.6]} bevel={0} metalness={0.5} roughness={0.4} />
          <mesh position={[bp[0], 0.36, bz - 0.78]} rotation={[t * 9, 0, Math.PI / 2]}>
            <torusGeometry args={[0.34, 0.025, 6, 20]} />
            <Flat color="#1E1E22" />
          </mesh>
          {[-1, 1].map((s) => {
            const holding = phoneOn && s > 0;
            const hand: Vec3 = holding ? [phonePos[0] + 0.01, phonePos[1] - 0.085, phonePos[2] + 0.02] : grip(s);
            return (
              <group key={s}>
                <Limb a={shoulder(s)} b={hand} w={0.1} color={PALETTE.max.hoodie} />
                <Box size={[0.1, 0.08, 0.11]} color={PALETTE.max.skin} position={hand} cast={false} />
              </group>
            );
          })}
          {phoneOn && ui && <Phone ui={ui} time={t} position={phonePos} quaternion={facing(eye, phonePos)} />}
        </group>
      )}

      {/* Nach dem Unfall: am Boden, Sanitäter, Blaulicht */}
      {ground && (
        <group>
          <Car color="#3D7DD8" position={[LANE + 2.6, 0, -6.2]} rotationY={-Math.PI / 2 - 0.3} />
          {/* Rad liegt */}
          <group position={[LANE - 1.2, 0.05, CRASH_Z - 0.6]} rotation={[-Math.PI / 2, 0, 0.6]}>
            <mesh position={[-0.5, 0, 0]}><torusGeometry args={[0.34, 0.025, 6, 20]} /><Flat color="#1E1E22" /></mesh>
            <mesh position={[0.55, 0, 0]}><torusGeometry args={[0.34, 0.025, 6, 20]} /><Flat color="#1E1E22" /></mesh>
            <Box size={[1.05, 0.05, 0.05]} color="#E2473F" position={[0, 0.1, 0]} bevel={0.2} />
          </group>
          {/* Rettungswagen */}
          <group position={[-1.6, 0, CRASH_Z + 6]} rotation={[0, 0.2, 0]}>
            <Box size={[2.3, 2.5, 6]} color="#F4F4F4" position={[0, 1.55, 0]} />
            <Box size={[2.32, 0.35, 6.02]} color="#E8A33A" position={[0, 1.3, 0]} cast={false} />
            <Box size={[0.5, 0.18, 0.3]} color="#3D7DFF" emissive={blue > 0.5 ? "#5A9BFF" : "#0A1A40"} position={[-0.6, 2.9, -2.6]} />
            <Box size={[0.5, 0.18, 0.3]} color="#3D7DFF" emissive={blue > 0.5 ? "#0A1A40" : "#5A9BFF"} position={[0.6, 2.9, -2.6]} />
            {[[-1.0, -2.1], [1.0, -2.1], [-1.0, 2.0], [1.0, 2.0]].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.4, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 0.3, 10]} /><Flat color="#22252B" /></mesh>
            ))}
          </group>
          <pointLight position={[-1.6, 3.2, CRASH_Z + 3.4]} intensity={40 * blue} distance={22} decay={2} color="#4A8BFF" />
          {/* Sanitäter beugen sich über die Kamera */}
          <group position={[eye[0] - 0.1, 0, eye[2] - 1.35]} rotation={[0, 0.1, 0]}>
            <group rotation={[0.5 + Math.sin(t * 1.3) * 0.04, 0, 0]}>
              <Character outfit={MEDIC} pose="carry" time={t} expression="shock" />
            </group>
          </group>
          <group position={[eye[0] + 1.35, 0, eye[2] + 0.2]} rotation={[0, -Math.PI / 2 - 0.2, 0]}>
            <group rotation={[0.38, 0, 0]}>
              <Character outfit={MEDIC2} pose="point" time={t} />
            </group>
          </group>
          <Particles kind="dust" n={60} box={[4, 2, 4]} center={[eye[0], 1, eye[2] - 1]} time={t} velocity={[0.1, 0.05, 0]} sizeScale={0.6} />
        </group>
      )}
      <Particles kind="dust" n={90} box={[10, 4, 16]} center={[LANE, 2, bz - 6]} time={t} velocity={[0.2, 0.1, 0.3]} sizeScale={0.5} colors={["#FFE2B8", "#FFD2A0"]} seed={4} />
    </Stage>
  );
};

// ═════════════════════════ Krankenzimmer ═════════════════════════

export type WardWho = "mom" | "dad" | "leon" | "nurse" | "doc" | "physio" | number;
export type WardPerson = {
  who: WardWho;
  pos: Vec3;
  rotY: number;
  pose: Pose;
  /** Vorbeugen (rad) */
  lean?: number;
  expr?: "neutral" | "happy" | "shock";
  /** sichtbar von–bis (Videosekunden) */
  show?: [number, number];
  joints?: Partial<Joints>;
};

const momOutfit = (y: number): Outfit => ({ skin: "#F1C7A0", hair: mixHex("#5A3A28", "#E2E0DC", clamp(y / 28)), top: "#9A5FD0", pants: "#3E5C8A", shoes: "#7A4E33" });
const OUTFITS: Record<Exclude<WardWho, number | "mom">, Outfit> = {
  dad: { skin: "#F1C7A0", hair: "#7A6F66", top: "#3D7DD8", pants: "#2F3B4C", shoes: "#2F3B4C" },
  leon: { skin: "#A8714D", hair: "#1E1E1E", top: "#FF8A3D", pants: "#3E5C8A", shoes: "#F4F4F4" },
  nurse: { skin: "#D9A37A", hair: "#3A2A20", top: "#5FB8B0", pants: "#5FB8B0", shoes: "#F4F4F4" },
  doc: { skin: "#F1C7A0", hair: "#C9A15B", top: "#F4F4F4", pants: "#9FB4C7", shoes: "#2F3B4C" },
  physio: { skin: "#7A4E33", hair: "#1E1E1E", top: "#3E5C8A", pants: "#2F3B4C", shoes: "#F4F4F4" },
};
const GOWN = "#BFD6E6";

/** Max' Aussehen nach x Jahren Koma */
export const maxLook = (y: number) => ({
  beard: y < 0.02 ? 0 : 0.012 + Math.min(0.16, y * 0.0055),
  hairLong: Math.min(0.12, y * 0.012),
  hairColor: mixHex("#6B4428", "#D2CEC8", clamp((y - 6) / 22)),
});

const ECG = (ph: number) => {
  const x = ph % 1;
  const g = (c: number, w: number, a: number) => a * Math.exp(-Math.pow((x - c) / w, 2));
  return g(0.18, 0.035, 0.12) - g(0.3, 0.008, 0.12) + g(0.32, 0.012, 1) - g(0.345, 0.01, 0.28) + g(0.55, 0.05, 0.22);
};

/** Patientenmonitor mit EKG (Canvas) */
const Monitor: React.FC<{ time: number; hr: number; position: Vec3; rotationY: number }> = ({ time, hr, position, rotationY }) => {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 320; c.height = 220;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, tex: tx };
  }, []);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#04100C"; g.fillRect(0, 0, 320, 220);
  g.strokeStyle = "#3BFF9A"; g.lineWidth = 4; g.beginPath();
  const bps = hr / 60;
  for (let i = 0; i <= 230; i++) {
    const tt = time - (230 - i) / 115; // 2 s Fenster
    const y = 92 - ECG(tt * bps) * 62;
    if (i === 0) g.moveTo(10 + i, y); else g.lineTo(10 + i, y);
  }
  g.stroke();
  g.strokeStyle = "#56C8FF"; g.lineWidth = 3; g.beginPath();
  for (let i = 0; i <= 230; i++) { const tt = time - (230 - i) / 115; const y = 175 - Math.max(0, Math.sin(tt * bps * Math.PI * 2 - 0.6)) * 22; if (i === 0) g.moveTo(10 + i, y); else g.lineTo(10 + i, y); }
  g.stroke();
  g.fillStyle = "#3BFF9A"; g.font = "700 46px Inter, sans-serif"; g.textAlign = "right"; g.fillText(String(Math.round(hr)), 312, 60);
  g.fillStyle = "#56C8FF"; g.font = "700 34px Inter, sans-serif"; g.fillText("98", 312, 170);
  tex.needsUpdate = true;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box size={[0.62, 0.46, 0.12]} color="#D8DCDE" roughness={0.5} />
      <mesh position={[0, 0.01, 0.062]}><planeGeometry args={[0.54, 0.37]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <Box size={[0.05, 1.6, 0.05]} color="#8B95A1" position={[0, -0.95, -0.03]} bevel={0} metalness={0.6} roughness={0.35} />
      <pointLight position={[0, 0, 0.3]} intensity={0.5} distance={2} decay={2} color="#6AFFB0" />
    </group>
  );
};

/** Zimmerpflanze, wächst (height in m) */
const Plant: React.FC<{ position: Vec3; height: number; seed?: number }> = ({ position, height, seed = 3 }) => {
  const r = rng(seed);
  const n = Math.max(3, Math.round(4 + height * 9));
  const leaves = useMemo(() => Array.from({ length: 30 }).map(() => ({ a: r.range(0, Math.PI * 2), h: r.next(), s: r.range(0.8, 1.2), tilt: r.range(0.5, 1.1) })), []);
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[0.16, 0.12, 0.24, 8]} /><Flat color="#C97B5B" /></mesh>
      <mesh position={[0, height / 2 + 0.2, 0]} castShadow><cylinderGeometry args={[0.012 + height * 0.012, 0.02 + height * 0.02, height, 5]} /><Flat color="#6B8A3A" /></mesh>
      {leaves.slice(0, n).map((l, i) => {
        const y = 0.24 + l.h * height;
        const sz = (0.09 + height * 0.09) * l.s;
        return (
          <group key={i} position={[0, y, 0]} rotation={[0, l.a, 0]}>
            <mesh position={[sz * 0.9, 0, 0]} rotation={[0, 0, l.tilt - 0.6]} scale={[sz * 1.6, sz * 0.18, sz * 0.8]} castShadow>
              <octahedronGeometry args={[1, 0]} />
              <Flat color={i % 3 ? "#4FA35A" : "#6DBE5A"} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** Baum vor dem Fenster mit Jahreszeit s: 0 Sommer, 1 Herbst, 2 Winter, 3 Frühling (stufenlos, zyklisch) */
const SeasonTree: React.FC<{ position: Vec3; s: number; seed?: number; scale?: number }> = ({ position, s, seed = 4, scale = 1 }) => {
  const x = ((s % 4) + 4) % 4;
  const leaf = x < 1 ? mixHex("#4FA35A", "#E8A040", x) : x < 2 ? mixHex("#E8A040", "#C0603A", x - 1) : x < 3 ? "#8A5A3B" : mixHex("#9BD86A", "#4FA35A", x - 3);
  const amount = x < 1.2 ? 1 : x < 2 ? 1 - (x - 1.2) / 0.8 : x < 3 ? 0 : (x - 3);
  const geos = useMemo(() => [0, 1, 2, 3].map((i) => new THREE.IcosahedronGeometry(1, 1)), []);
  const r = rng(seed);
  const blobs = useMemo(() => [0, 1, 2, 3].map(() => [r.range(-1.2, 1.2), r.range(3.2, 4.6), r.range(-1.0, 1.0), r.range(1.2, 1.8)]), []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.8, 0]} castShadow><cylinderGeometry args={[0.18, 0.3, 3.6, 6]} /><Flat color={PALETTE.trunk} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`b${i}`} position={[Math.cos(i * 1.6) * 0.6, 3.4 + i * 0.3, Math.sin(i * 1.6) * 0.6]} rotation={[Math.sin(i) * 0.7, i, Math.cos(i * 1.6) * 0.8]} castShadow>
          <cylinderGeometry args={[0.05, 0.1, 1.8, 4]} />
          <Flat color={PALETTE.trunk} />
        </mesh>
      ))}
      {amount > 0.02 && blobs.map((b, i) => (
        <mesh key={i} geometry={geos[i]} position={[b[0], b[1], b[2]]} scale={b[3] * (0.4 + 0.6 * amount)} castShadow receiveShadow>
          <Flat color={leaf} />
        </mesh>
      ))}
    </group>
  );
};

export type WardProps = {
  shot: ShotInfo;
  cam: CamFn;
  /** Ego-Sicht: Max wird nicht gezeichnet (nur Decke/Bauch); "sit" = aufrecht im Bett */
  ego?: "lie" | "sit";
  /** Max sitzt (von außen) */
  sit?: boolean;
  /** Jahre im Koma (Aussehen), Standard aus HUD-Zeit */
  y?: (t: number) => number;
  /** Tageslicht 0 (Nacht) … 1 (Tag) */
  day?: (t: number, local: number) => number;
  /** Jahreszeit (zyklisch, s. SeasonTree) */
  season?: (t: number) => number;
  people?: WardPerson[];
  /** Pflanze auf der Fensterbank (Höhe m), 0 = keine */
  plant?: (t: number) => number;
  /** Handy auf dem Nachttisch */
  nightPhone?: (t: number) => PhoneUI | null;
  /** Handy in Max' Händen (Ego sitzend) */
  handPhone?: (t: number) => PhoneUI | null;
  hr?: (t: number) => number;
  /** sichtbare Hand auf der Decke, Fingerzucken 0..1 */
  twitch?: (t: number) => number;
  eyesOpen?: boolean;
  maxExpr?: "neutral" | "happy" | "shock";
  /** Bein wird von der Physio bewegt (rad) */
  legLift?: (t: number) => number;
  flowers?: boolean;
  /** Mama-Alter in Jahren seit Unfall (Haarfarbe), Standard = y */
  momY?: (t: number) => number;
};

const BED_Z = -2.15, MAT = 0.74;
export const EYE_LIE: Vec3 = [0, 1.08, -2.86];
export const EYE_SIT: Vec3 = [0, 1.66, -2.45];

export const Ward: React.FC<WardProps> = ({
  shot, cam, ego, sit, y: yFn, day, season, people = [], plant, nightPhone, handPhone, hr, twitch, eyesOpen = false, maxExpr = "neutral", legLift, flowers = false, momY,
}) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const yrs = yFn ? yFn(t) : years(t);
  const look = maxLook(yrs);
  const d = clamp(day ? day(t, local) : 1);
  const seas = season ? season(t) : 0.2;
  const sx = ((seas % 4) + 4) % 4;
  const snow = sx > 1.7 && sx < 3.1 ? clamp(Math.min((sx - 1.7) / 0.3, (3.1 - sx) / 0.3)) : 0;
  const sunDir: Vec3 = [12, 5.5, -3];
  const skyTop = mixHex("#0B1430", snow > 0.5 ? "#9FB6CC" : "#6FA8E8", d);
  const skyHor = mixHex("#1C2A50", snow > 0.5 ? "#DCE4EA" : "#CFE6F5", d);
  const lamp = 1 - d; // Deckenlicht nachts gedimmt warm
  const W = 6, H = 3, D = 7;
  const wall = "#E3ECE8", wall2 = "#D2E2DC";
  const mom = momY ? momY(t) : yrs;
  const heart = hr ? hr(t) : 70;
  const lift = legLift ? legLift(t) : 0;
  const tw = twitch ? twitch(t) : -1;
  const np = nightPhone ? nightPhone(t) : null;
  const hp = handPhone ? handPhone(t) : null;
  const plantH = plant ? plant(t) : 0;
  const maxOutfit: Outfit = { ...MAX_OUTFIT, top: GOWN, pants: GOWN };

  return (
    <Stage preset="interior" bg={skyTop} fog={null} sunDir={sunDir} sunIntensity={0.3 + 2.4 * d} env={[mixHex("#2A3040", "#F2F4F2", d), mixHex("#3A4050", "#E4ECE8", d), mixHex("#30302C", "#A8A89A", d)]}
      envIntensity={0.35 + 0.6 * d} shadowCenter={[0.5, 1, -1.5]} shadowSize={5} aoRadius={0.35}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 50} roll={c.roll ?? 0} near={0.02} far={5000} />
      <SkyDome top={skyTop} horizon={skyHor} radius={3000} sun={d > 0.4 ? sunDir : undefined} haze={d} />
      {d < 0.5 && <Stars n={600} radius={2800} opacity={1 - d * 2} />}

      {/* ── Raum ── */}
      <Box size={[W, 0.1, D]} color="#C2CCD0" position={[0, -0.05, 0]} cast={false} roughness={0.35} />
      <Box size={[W, 0.1, D]} color="#F2F4F2" position={[0, H + 0.05, 0]} cast={false} />
      <Box size={[W, H, 0.12]} color={wall} position={[0, H / 2, -D / 2]} />
      <Box size={[W, 0.9, 0.13]} color={wall2} position={[0, 0.45, -D / 2 + 0.01]} cast={false} />
      <Box size={[0.12, H, D]} color={wall} position={[-W / 2, H / 2, 0]} />
      <Box size={[0.13, 0.9, D]} color={wall2} position={[-W / 2 + 0.01, 0.45, 0]} cast={false} />
      {/* Vorderwand mit Tür */}
      <Box size={[3.6, H, 0.12]} color={wall} position={[1.2, H / 2, D / 2]} />
      <Box size={[1.2, H, 0.12]} color={wall} position={[-2.4, H / 2, D / 2]} />
      <Box size={[1.2, 0.8, 0.12]} color={wall} position={[-1.2, H - 0.4, D / 2]} />
      <Box size={[1.1, 2.15, 0.06]} color="#B9A68A" position={[-1.2, 1.08, D / 2 - 0.02]} />
      <Box size={[0.14, 0.04, 0.06]} color="#8B95A1" position={[-0.8, 1.05, D / 2 - 0.07]} metalness={0.7} roughness={0.3} />
      {/* rechte Wand mit Fenster (x = +3, z −2 … +0.4, y 0,85 … 2,45) */}
      <Box size={[0.12, H, 1.5]} color={wall} position={[W / 2, H / 2, -2.75]} />
      <Box size={[0.12, H, 3.1]} color={wall} position={[W / 2, H / 2, 1.95]} />
      <Box size={[0.12, 0.85, 2.4]} color={wall} position={[W / 2, 0.425, -0.8]} />
      <Box size={[0.12, 0.55, 2.4]} color={wall} position={[W / 2, H - 0.275, -0.8]} />
      <Box size={[0.32, 0.05, 2.5]} color="#F4F4F4" position={[W / 2 - 0.12, 0.87, -0.8]} />
      <Box size={[0.08, 1.6, 0.06]} color="#F4F4F4" position={[W / 2, 1.65, -0.8]} bevel={0} />
      <mesh position={[W / 2, 1.65, -0.8]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.4, 1.6]} /><Glass opacity={0.12} /></mesh>
      {/* Deckenlichter */}
      {[-1.6, 1.4].map((z, i) => (
        <group key={i}>
          <Box size={[1.1, 0.04, 0.5]} color="#FFFFFF" emissive={lamp > 0.3 || d > 0.6 ? "#FFF6E6" : undefined} position={[0, H - 0.03, z]} cast={false} bevel={0} />
          <pointLight position={[0, H - 0.4, z]} intensity={lamp > 0.3 ? 2.2 * lamp : 1.2} distance={7} decay={2} color={lamp > 0.3 ? "#FFD9A8" : "#FFF6EC"} />
        </group>
      ))}
      {/* Wandschiene über dem Bett */}
      <Box size={[2.4, 0.18, 0.1]} color="#C8D0D4" position={[0, 1.55, -D / 2 + 0.1]} />
      {[-0.8, -0.5, 0.6].map((x, i) => <Box key={i} size={[0.08, 0.08, 0.05]} color={["#58B06C", "#F4F4F4", "#3D7DD8"][i]} position={[x, 1.55, -D / 2 + 0.17]} cast={false} />)}
      {/* Uhr */}
      <group position={[-W / 2 + 0.08, 2.2, -0.6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><cylinderGeometry args={[0.22, 0.22, 0.04, 20]} /><Flat color="#F4F4F4" /></mesh>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <Box size={[0.02, 0.16, 0.01]} color="#1E1E24" position={[0, 0, 0.025]} rotation={[0, 0, -t * 3]} bevel={0} />
          <Box size={[0.025, 0.11, 0.01]} color="#1E1E24" position={[0, 0, 0.03]} rotation={[0, 0, -t * 0.25]} bevel={0} />
        </group>
      </group>

      {/* ── Bett ── */}
      <group position={[0, 0, BED_Z]}>
        <Box size={[1.05, 0.12, 2.2]} color="#8B95A1" position={[0, 0.5, 0]} metalness={0.5} roughness={0.4} />
        {[[-0.45, -1], [0.45, -1], [-0.45, 1], [0.45, 1]].map(([x, z], i) => <Box key={i} size={[0.06, 0.5, 0.06]} color="#8B95A1" position={[x, 0.25, z]} metalness={0.5} roughness={0.4} bevel={0} />)}
        <Box size={[1.0, 0.18, 2.1]} color="#F4F6F6" position={[0, MAT - 0.09, 0]} />
        <Box size={[1.1, 0.75, 0.06]} color="#C8D0D4" position={[0, 0.95, -1.12]} />
        <Box size={[1.1, 0.45, 0.06]} color="#C8D0D4" position={[0, 0.8, 1.12]} />
        {[-0.54, 0.54].map((x, i) => <Box key={i} size={[0.03, 0.2, 1.1]} color="#B8C0C4" position={[x, MAT + 0.15, -0.1]} bevel={0} metalness={0.5} />)}
        {/* Kissen */}
        <Box size={[0.66, 0.14, 0.42]} color="#FFFFFF" position={[0, MAT + 0.06, -0.82]} bevel={0.45} />
        {/* Decke */}
        {legLift ? (
          <Box size={[1.06, 0.26, 0.42]} color="#9FC4DE" position={[0, MAT + 0.13, 0.82]} bevel={0.35} />
        ) : (
          <>
            <Box size={[1.06, 0.2, sit ? 1.45 : 1.62]} color="#9FC4DE" position={[0, MAT + 0.1, sit ? 0.32 : 0.24]} bevel={0.35} />
            <Box size={[1.07, 0.04, 0.22]} color="#F4F6F6" position={[0, MAT + 0.2, sit ? -0.36 : -0.5]} bevel={0.3} cast={false} />
          </>
        )}
      </group>

      {/* ── Max ── */}
      {!ego && !sit && (
        <group position={[0, MAT + 0.16, -1.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <Character outfit={maxOutfit} pose="idle" time={t} eyesClosed={!eyesOpen} expression={maxExpr} beard={look.beard} hairLong={look.hairLong} hairColor={look.hairColor}
            joints={{ lArmZ: 0.12, rArmZ: -0.12, lHip: lift, headX: 0.12 }} />
        </group>
      )}
      {!ego && sit && (
        <group position={[0, MAT - 0.5, -2.62]}>
          <Character outfit={maxOutfit} pose="sit" time={t} expression={maxExpr} beard={look.beard} hairLong={look.hairLong} hairColor={look.hairColor}
            joints={{ lArmX: -0.5, rArmX: -0.5, lArmZ: 0.2, rArmZ: -0.2, bodyX: -0.12 }} />
        </group>
      )}
      {/* Hand auf der Decke (Fingerzucken) */}
      {tw >= 0 && (
        <group position={[0.3, MAT + 0.21, -1.62]} rotation={[0, -0.25, 0]}>
          <Box size={[0.13, 0.11, 0.42]} color={GOWN} position={[0, 0.02, -0.26]} />
          <Box size={[0.12, 0.06, 0.13]} color={PALETTE.max.skin} position={[0, 0, 0.0]} cast={false} />
          {[-0.042, -0.014, 0.014, 0.042].map((x, i) => (
            <group key={i} position={[x, 0.0, 0.065]} rotation={[i === 1 ? -tw * 0.6 : 0, 0, 0]}>
              <Box size={[0.024, 0.03, 0.075]} color={PALETTE.max.skin} position={[0, 0, 0.037]} cast={false} bevel={0.3} />
            </group>
          ))}
        </group>
      )}
      {/* Ego liegend: Körper unter der Decke */}
      {ego === "lie" && <Box size={[0.56, 0.12, 1.2]} color="#9FC4DE" position={[0, MAT + 0.26, -1.55]} bevel={0.5} />}
      {/* Ego sitzend: Arme + Handy */}
      {ego === "sit" && hp && (() => {
        const ph: Vec3 = [0.0, 1.5, -2.14];
        return (
          <group>
            {[-1, 1].map((s) => {
              const hand: Vec3 = [ph[0] + s * 0.045, ph[1] - 0.08, ph[2] + 0.015];
              return (
                <group key={s}>
                  <Limb a={[s * 0.2, 1.12, -2.42]} b={hand} w={0.085} color={GOWN} />
                  <Box size={[0.07, 0.09, 0.08]} color={PALETTE.max.skin} position={hand} cast={false} />
                </group>
              );
            })}
            <Phone ui={hp} time={t} position={ph} quaternion={facing(EYE_SIT, ph)} />
          </group>
        );
      })()}

      {/* ── Geräte & Möbel ── */}
      <Monitor time={t} hr={heart} position={[-1.05, 1.7, -2.55]} rotationY={1.25} />
      <group position={[-0.85, 0, -1.9]}>
        <Box size={[0.03, 2.0, 0.03]} color="#B8C0C4" position={[0, 1.0, 0]} bevel={0} metalness={0.6} roughness={0.3} />
        <Box size={[0.18, 0.26, 0.05]} color="#E6F2F8" position={[0.08, 1.85, 0]} opacity={0.85} />
        <Box size={[0.4, 0.03, 0.4]} color="#8B95A1" position={[0, 0.02, 0]} bevel={0} />
      </group>
      {/* Nachttisch */}
      <group position={[0.95, 0, -2.85]}>
        <Box size={[0.5, 0.7, 0.45]} color="#E8DCC8" position={[0, 0.35, 0]} />
        <Box size={[0.42, 0.02, 0.02]} color="#B9A68A" position={[0, 0.5, 0.23]} cast={false} bevel={0} />
        {np && <Phone ui={np} time={t} position={[0, 0.712, 0.02]} rotation={[-Math.PI / 2, 0, 0.15]} />}
        {flowers && (
          <group position={[-0.13, 0.7, -0.08]}>
            <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.05, 0.04, 0.2, 8]} /><Glass opacity={0.4} /></mesh>
            {[0, 1, 2, 3, 4].map((i) => (
              <group key={i} position={[Math.cos(i * 1.3) * 0.05, 0.28 + (i % 2) * 0.05, Math.sin(i * 1.3) * 0.05]}>
                <Box size={[0.07, 0.07, 0.07]} color={["#E2473F", "#F2C14E", "#FF8A3D", "#E2473F", "#9A5FD0"][i]} bevel={0.5} />
              </group>
            ))}
          </group>
        )}
        <Box size={[0.14, 0.18, 0.02]} color="#3B434D" position={[0.12, 0.79, -0.12]} rotation={[-0.15, -0.3, 0]} />
      </group>
      {/* Stuhl */}
      <group position={[1.25, 0, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <Box size={[0.5, 0.06, 0.5]} color="#5E6B78" position={[0, 0.45, 0]} />
        <Box size={[0.5, 0.5, 0.06]} color="#5E6B78" position={[0, 0.72, -0.25]} />
        {[[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].map(([x, z], i) => <Box key={i} size={[0.04, 0.45, 0.04]} color="#3B434D" position={[x, 0.22, z]} bevel={0} />)}
      </group>
      {plantH > 0 && <Plant position={[W / 2 - 0.22, 0.89, -0.25]} height={plantH} />}

      {/* ── Menschen ── */}
      {people.map((pp, i) => {
        if (pp.show && (t < pp.show[0] || t >= pp.show[1])) return null;
        const outfit = pp.who === "mom" ? momOutfit(mom) : typeof pp.who === "number" ? undefined : OUTFITS[pp.who];
        const isMom = pp.who === "mom";
        return (
          <group key={i} position={pp.pos} rotation={[0, pp.rotY, 0]}>
            <group rotation={[pp.lean ?? 0, 0, 0]}>
              {outfit ? (
                <Character outfit={outfit} pose={pp.pose} time={t + i * 0.37} expression={pp.expr} joints={pp.joints} hairLong={isMom ? 0.14 : 0} />
              ) : (
                <Person seed={pp.who as number} pose={pp.pose} time={t} expression={pp.expr} joints={pp.joints} />
              )}
            </group>
          </group>
        );
      })}

      {/* ── Draußen ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7, 0]} receiveShadow><planeGeometry args={[3000, 3000]} /><Flat color={mixHex(PALETTE.grass, "#F4F7FA", snow)} /></mesh>
      <SeasonTree position={[8.5, -7, -1.4]} s={seas} scale={1.9} />
      <SeasonTree position={[15, -7, 4]} s={seas} seed={9} scale={2.1} />
      {[[30, -8, 18, 22], [32, 10, 12, 30], [44, -26, 16, 40], [26, 30, 14, 16]].map(([x, z, w, h], i) => (
        <Building key={i} position={[x, -7, z]} size={[w, h, w]} seed={i + 40} lit={d < 0.5} />
      ))}
      {snow > 0.05 && <Particles kind="snow" n={160} box={[6, 8, 6]} center={[6.5, 0, -0.8]} time={t} velocity={[0.3, -1.1, 0.1]} sizeScale={1.6} opacity={snow} seed={21} />}
      <Particles kind="dust" n={50} box={[4, 2.5, 5]} center={[0.6, 1.5, -1]} time={t} velocity={[0.04, 0.02, 0.03]} sizeScale={0.35} colors={["#FFF6E0"]} seed={7} />
    </Stage>
  );
};

// ═════════════════════════ Stadt / Krankenhaus von oben ═════════════════════════

export type TownEra = "winter" | "future" | "night";

/** Drohne */
const Drone: React.FC<{ position: Vec3; t: number; seed: number }> = ({ position, t, seed }) => (
  <group position={position}>
    <Box size={[0.8, 0.2, 0.8]} color="#2F3B4C" />
    {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.15, z]} rotation={[0, t * 40 + i + seed, 0]}><boxGeometry args={[0.6, 0.02, 0.06]} /><Flat color="#8B95A1" /></mesh>
    ))}
    <Box size={[0.4, 0.35, 0.4]} color="#D9B98A" position={[0, -0.32, 0]} />
    <Box size={[0.1, 0.1, 0.1]} color="#FF5B4B" emissive={Math.sin(t * 8 + seed) > 0 ? "#FF3B2B" : undefined} position={[0, 0.14, 0.42]} cast={false} />
  </group>
);

export const Town: React.FC<{ shot: ShotInfo; era: TownEra; cam: CamFn }> = ({ shot, era, cam }) => {
  const { t, local, p } = useTimes(shot);
  const c = cam({ t, local, p });
  const night = era === "night";
  const winter = era === "winter";
  const future = era !== "winter";
  const sunDir: Vec3 = winter ? [-60, 22, -40] : [50, 40, -30];
  const towers = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 14 }).map(() => {
      const a = r.range(0, Math.PI * 2), d = r.range(175, 330);
      return { x: Math.cos(a) * d, z: Math.sin(a) * d - 60, w: r.range(14, 24), h: r.range(70, 160), seed: r.int(1, 999) };
    });
  }, []);
  const drones = useMemo(() => {
    const r = rng(12);
    return Array.from({ length: 16 }).map(() => ({ a: r.range(0, 6.28), rad: r.range(30, 120), h: r.range(20, 55), sp: r.range(0.08, 0.2) * r.sign() }));
  }, []);
  return (
    <Stage preset={night ? "night" : winter ? "overcast" : "day"} sunDir={sunDir} logDepth={false} fog={night ? ["#141C3A", 150, 1400] : winter ? ["#D8E0E6", 120, 1100] : ["#CFE7F5", 200, 1600]}
      shadowCenter={[0, 0, 0]} shadowSize={90} aoRadius={1.2}>
      <Camera pos={c.pos} look={c.look} fov={c.fov ?? 45} near={0.5} far={9000} />
      <SkyDome top={night ? "#0A1230" : winter ? "#A9B8C6" : "#5E9BE0"} horizon={night ? "#2E3F78" : winter ? "#E6EAEE" : "#DDEFF7"} radius={4000} sun={night ? undefined : sunDir} />
      {night && <Stars n={1200} radius={3800} opacity={0.7} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow><planeGeometry args={[6000, 6000]} /><Flat color={winter ? "#EEF2F5" : night ? "#2A3440" : PALETTE.grassDark} /></mesh>
      <CityGrid blocks={8} blockSize={56} road={14} seed={6} heights={[10, 34]} clear={70} lit={night} position={[0, 0, -20]} />
      {winter && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, -20]}><planeGeometry args={[640, 640]} /><Flat color="#F4F7FA" opacity={0.55} /></mesh>
      )}
      {/* Park ums Krankenhaus */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow><circleGeometry args={[64, 32]} /><Flat color={winter ? "#F4F7FA" : PALETTE.grass} /></mesh>
      {Array.from({ length: 18 }).map((_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return <Tree key={i} position={[Math.cos(a) * 50, 0, Math.sin(a) * 50]} seed={i + 5} scale={2.4} kind={winter ? "bare" : "round"} />;
      })}
      {/* Krankenhaus */}
      <Building position={[0, 0, 0]} size={[44, 24, 24]} color="#EEF2F2" roof="#C8D0D4" seed={3} lit={night} />
      <Building position={[-26, 0, 6]} size={[14, 14, 30]} color="#DCE6EA" roof="#C8D0D4" seed={4} lit={night} />
      <mesh position={[8, 24.15, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[7, 24]} /><Flat color="#58B06C" /></mesh>
      <Box size={[1, 0.1, 5]} color="#F4F4F4" position={[6.5, 24.2, 0]} cast={false} bevel={0} />
      <Box size={[1, 0.1, 5]} color="#F4F4F4" position={[9.5, 24.2, 0]} cast={false} bevel={0} />
      <Box size={[3, 0.1, 1]} color="#F4F4F4" position={[8, 24.2, 0]} cast={false} bevel={0} />
      <group position={[-12, 26.5, 12.2]}>
        <Box size={[1.6, 5, 0.4]} color="#E2473F" emissive={night ? "#FF3B2B" : undefined} />
        <Box size={[5, 1.6, 0.4]} color="#E2473F" emissive={night ? "#FF3B2B" : undefined} />
      </group>
      {winter && <Particles kind="snow" n={500} box={[120, 60, 120]} center={[c.pos[0] * 0.6, 30, c.pos[2] * 0.6]} time={t} velocity={[1.5, -4, 0.6]} sizeScale={12} seed={31} />}
      {winter && [[-80, 60, -120], [60, 70, -160], [140, 55, -60]].map((cp, i) => <Cloud key={i} position={cp as Vec3} scale={14} seed={i + 2} color="#E6EAEE" />)}
      {/* Zukunft: Glastürme, Drohnen, Lufttaxis */}
      {future && towers.map((tw, i) => (
        <group key={i} position={[tw.x, 0, tw.z]}>
          <Building size={[tw.w, tw.h, tw.w]} color="#9FB4C7" roof="#5E6B78" seed={tw.seed} lit={night} />
          {night && <Box size={[tw.w + 0.4, 1.2, tw.w + 0.4]} color="#6FF2D0" emissive="#6FF2D0" position={[0, tw.h * 0.7, 0]} cast={false} bevel={0} />}
        </group>
      ))}
      {future && drones.map((dr, i) => {
        const a = dr.a + t * dr.sp;
        return <Drone key={i} position={[Math.cos(a) * dr.rad, dr.h + Math.sin(t + i) * 1.5, Math.sin(a) * dr.rad - 10]} t={t} seed={i} />;
      })}
      {night && Array.from({ length: 10 }).map((_, i) => {
        const x = -300 + (((t * 40 + i * 70) % 600) + 600) % 600;
        return <Box key={i} size={[3, 1.2, 1.6]} color="#F4F4F4" emissive="#FFE7A8" position={[x, 60 + i * 9, -120 + i * 22]} cast={false} />;
      })}
      {!night && !winter && [[-60, 90, -200], [120, 110, -260]].map((cp, i) => <Cloud key={i} position={cp as Vec3} scale={16} seed={i + 8} />)}
    </Stage>
  );
};

export { Glow, lerp };
