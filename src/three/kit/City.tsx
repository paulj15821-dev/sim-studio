import React, { useMemo } from "react";
import * as THREE from "three";
import { PALETTE } from "../../style/theme";
import { rng } from "../../lib/random";
import type { Vec3 } from "../../lib/anim";
import { Box, Flat, Glass } from "./materials";

// ───────────── Texturen ─────────────

const texCache = new Map<string, { map: THREE.CanvasTexture; rough: THREE.CanvasTexture; emit: THREE.CanvasTexture }>();
const TILE_X = 4, TILE_Y = 4; // eine Textur-Kachel = 4 Fensterachsen × 4 Etagen (mit Variation)

/**
 * Fassadentextur + passende Rauheits-/Metallkarte. Scheiben sind glatt und leicht metallisch →
 * sie spiegeln Himmel und Sonne (über das Umgebungslicht der Stage), die Wand bleibt matt.
 */
export function windowTextures(facade: string, lit = false) {
  const k = facade + lit;
  if (texCache.has(k)) return texCache.get(k)!;
  const S = 64, W = S * TILE_X, H = S * TILE_Y;
  const c = document.createElement("canvas"), cr = document.createElement("canvas"), ce = document.createElement("canvas");
  c.width = cr.width = ce.width = W; c.height = cr.height = ce.height = H;
  const g = c.getContext("2d")!, gr = cr.getContext("2d")!, ge = ce.getContext("2d")!;
  ge.fillStyle = "#000"; ge.fillRect(0, 0, W, H);
  const r = rng(facade.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) + (lit ? 7 : 0));
  // Wand mit leichtem Schmutz/Varianz
  g.fillStyle = facade; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(${r.next() < 0.5 ? "0,0,0" : "255,255,255"},${r.range(0.01, 0.04)})`;
    g.fillRect(r.range(0, W), r.range(0, H), r.range(2, 18), r.range(2, 18));
  }
  // Rauheit (G-Kanal) + Metall (B-Kanal): Wand rau, nicht metallisch
  gr.fillStyle = "rgb(0,235,0)"; gr.fillRect(0, 0, W, H);
  for (let fy = 0; fy < TILE_Y; fy++) {
    // Geschossband
    g.fillStyle = "rgba(0,0,0,0.10)"; g.fillRect(0, fy * S + S - 5, W, 5);
    g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(0, fy * S + S - 6, W, 1);
    for (let fx = 0; fx < TILE_X; fx++) {
      const x = fx * S + 13, y = fy * S + 14, w = 38, h = 36;
      // Laibung (Schatten oben/links)
      g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(x - 2, y - 2, w + 4, h + 4);
      const on = lit && r.next() < 0.4;
      // Scheibe: dunkles Blaugrau mit Himmelsverlauf (die echte Spiegelung kommt vom Umgebungslicht)
      const grd = g.createLinearGradient(0, y, 0, y + h);
      if (on) { grd.addColorStop(0, "#FFE9B0"); grd.addColorStop(1, "#F2C878"); }
      else { const t = r.range(0, 1); grd.addColorStop(0, t < 0.5 ? "#6F8CA8" : "#5A7590"); grd.addColorStop(1, "#2C3A4A"); }
      g.fillStyle = grd; g.fillRect(x, y, w, h);
      // Jalousie/Vorhang in manchen Fenstern
      if (!on && r.next() < 0.3) { g.fillStyle = r.pick(["#D9D2C3", "#BFB6A6", "#E8E3D8"]); g.fillRect(x, y, w, h * r.range(0.25, 0.7)); }
      // Fensterkreuz + Rahmen
      g.fillStyle = "#EDEDED"; g.fillRect(x + w / 2 - 1.5, y, 3, h); g.fillRect(x, y + h * 0.38, w, 2);
      g.strokeStyle = "#F4F4F4"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      // Fensterbank
      g.fillStyle = "rgba(255,255,255,0.55)"; g.fillRect(x - 3, y + h + 2, w + 6, 3);
      // Glas: glatt (Rauheit ~0.08) und etwas metallisch (stärkere Spiegelung)
      if (on) { ge.fillStyle = r.pick(["#FFD892", "#FFE6B8", "#F2B96A", "#CFE3FF"]); ge.globalAlpha = r.range(0.45, 1); ge.fillRect(x, y, w, h); ge.globalAlpha = 1; }
      gr.fillStyle = on ? "rgb(0,120,0)" : "rgb(0,20,150)"; gr.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
  }
  const mk = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  const out = { map: mk(c, true), rough: mk(cr, false), emit: mk(ce, true) };
  texCache.set(k, out);
  return out;
}
/** @deprecated – nur noch für Kompatibilität; liefert die Farbtextur */
export const windowTexture = (facade: string, lit = false) => windowTextures(facade, lit).map;

/** Fassade für ein Gebäude der Größe w×h×d (3,2 m pro Etage, 3 m pro Achse) */
function facadeTex(facade: string, w: number, h: number, lit = false) {
  const src = windowTextures(facade, lit);
  const rep = (t: THREE.Texture) => {
    const c = t.clone();
    c.needsUpdate = true;
    c.repeat.set(Math.max(1, Math.round(w / 3)) / TILE_X, Math.max(1, Math.round(h / 3.2)) / TILE_Y);
    return c;
  };
  return { map: rep(src.map), rough: rep(src.rough), emit: rep(src.emit) };
}

/** Riesige Luftbild-Textur: Stadtkern + Felder drumherum (für große Höhen) */
export function useAerialTexture(seed = 3, cityRatio = 0.25) {
  return useMemo(() => {
    const S = 2048;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const g = c.getContext("2d")!;
    const r = rng(seed);
    const fields = ["#8DBF6A", "#A9C979", "#C9C27A", "#7AA95C", "#B8B06A", "#94B56E", "#D8CC8E"];
    g.fillStyle = "#8DBF6A"; g.fillRect(0, 0, S, S);
    // Felder
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r.pick(fields);
      const w = r.range(30, 140), h = r.range(30, 140);
      g.save();
      g.translate(r.range(0, S), r.range(0, S));
      g.rotate(r.range(-0.3, 0.3));
      g.fillRect(-w / 2, -h / 2, w, h);
      g.restore();
    }
    // Fluss
    g.strokeStyle = "#4D93C8"; g.lineWidth = 14; g.beginPath();
    for (let x = 0; x <= S; x += 32) g.lineTo(x, S * 0.62 + Math.sin(x / 210) * 120 + Math.sin(x / 77) * 30);
    g.stroke();
    // Stadt
    const R = S * cityRatio;
    for (let y = S / 2 - R; y < S / 2 + R; y += 12) {
      for (let x = S / 2 - R; x < S / 2 + R; x += 12) {
        const d = Math.hypot(x - S / 2, y - S / 2) / R;
        if (d > 1 || r.next() < d * 0.6) continue;
        g.fillStyle = r.pick(["#CFC8BC", "#B9B2A6", "#D9CDB8", "#A9A39A", "#C4B49E", "#9FB4C7"]);
        g.fillRect(x + 1, y + 1, 9, 9);
      }
    }
    g.strokeStyle = "#7D818A"; g.lineWidth = 3;
    for (let k = -R; k <= R; k += 48) {
      g.beginPath(); g.moveTo(S / 2 - R, S / 2 + k); g.lineTo(S / 2 + R, S / 2 + k); g.stroke();
      g.beginPath(); g.moveTo(S / 2 + k, S / 2 - R); g.lineTo(S / 2 + k, S / 2 + R); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [seed, cityRatio]);
}

// ───────────── Bauteile ─────────────

export const Building: React.FC<{ size: Vec3; position?: Vec3; color?: string; roof?: string; lit?: boolean; seed?: number }> = ({ size, position = [0, 0, 0], color, roof, lit, seed = 1 }) => {
  const r = rng(seed);
  const facade = color ?? r.pick(PALETTE.facade);
  const [w, h, d] = size;
  const mats = useMemo(() => {
    const side = facadeTex(facade, w, h, lit);
    const side2 = facadeTex(facade, d, h, lit);
    const mk = (t?: { map: THREE.Texture; rough: THREE.Texture; emit: THREE.Texture }, col = "#ffffff") =>
      t
        ? new THREE.MeshStandardMaterial({ map: t.map, roughnessMap: t.rough, metalnessMap: t.rough, roughness: 1, metalness: 1, emissive: lit ? "#FFFFFF" : "#000000", emissiveMap: lit ? t.emit : null, emissiveIntensity: lit ? 0.75 : 0 })
        : new THREE.MeshStandardMaterial({ color: col, roughness: 0.92, flatShading: true });
    const top = mk(undefined, roof ?? r.pick(PALETTE.roof));
    return [mk(side2), mk(side2), top, top, mk(side), mk(side)];
  }, [facade, w, h, d, lit, roof]);
  return (
    <mesh position={[position[0], position[1] + h / 2, position[2]]} material={mats} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
    </mesh>
  );
};

export const House: React.FC<{ position?: Vec3; rotationY?: number; seed?: number; scale?: number }> = ({ position = [0, 0, 0], rotationY = 0, seed = 1, scale = 1 }) => {
  const r = rng(seed);
  const wall = r.pick(PALETTE.facade), roof = r.pick(["#C9705A", "#A65B4B", "#7A6F66", "#D58A5E"]);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Building size={[8, 6, 7]} color={wall} roof={roof} seed={seed} />
      <mesh position={[0, 7.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[6.4, 2.8, 4]} />
        <Flat color={roof} />
      </mesh>
      <Box size={[1.4, 2.4, 0.2]} color="#6B4A35" position={[0, 1.2, 3.55]} />
    </group>
  );
};

export const Road: React.FC<{ length: number; width?: number; position?: Vec3; rotationY?: number; lines?: boolean }> = ({ length, width = 10, position = [0, 0, 0], rotationY = 0, lines = true }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
      <planeGeometry args={[width, length]} />
      <Flat color={PALETTE.asphalt} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * (width / 2 + 1.5), 0.1, 0]} receiveShadow>
        <planeGeometry args={[3, length]} />
        <Flat color={PALETTE.sidewalk} />
      </mesh>
    ))}
    {lines &&
      Array.from({ length: Math.floor(length / 8) }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -length / 2 + i * 8 + 4]}>
          <planeGeometry args={[0.25, 3.5]} />
          <Flat color={PALETTE.roadLine} />
        </mesh>
      ))}
  </group>
);

export const Car: React.FC<{ position?: Vec3; rotationY?: number; color?: string; seed?: number; scale?: number; wheelSpin?: number }> = ({ position = [0, 0, 0], rotationY = 0, color, seed = 1, scale = 1, wheelSpin = 0 }) => {
  const c = color ?? rng(seed).pick(PALETTE.car);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <Box size={[1.9, 0.75, 4.2]} color={c} position={[0, 0.7, 0]} />
      <Box size={[1.7, 0.65, 2.2]} color={c} position={[0, 1.38, -0.25]} />
      <mesh position={[0, 1.38, 0.88]} rotation={[-0.5, 0, 0]}><boxGeometry args={[1.6, 0.6, 0.05]} /><Glass color="#2B3A4A" opacity={0.85} /></mesh>
      <Box size={[1.72, 0.45, 2.0]} color="#2B3A4A" position={[0, 1.4, -0.25]} cast={false} />
      <Box size={[0.4, 0.15, 0.05]} color="#FFF4C2" position={[-0.6, 0.8, 2.11]} emissive="#FFF4C2" />
      <Box size={[0.4, 0.15, 0.05]} color="#FFF4C2" position={[0.6, 0.8, 2.11]} emissive="#FFF4C2" />
      <Box size={[0.4, 0.15, 0.05]} color="#D9302A" position={[-0.6, 0.8, -2.11]} emissive="#801010" />
      <Box size={[0.4, 0.15, 0.05]} color="#D9302A" position={[0.6, 0.8, -2.11]} emissive="#801010" />
      {[[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z]} rotation={[wheelSpin, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.3, 10]} />
          <Flat color="#22252B" />
        </mesh>
      ))}
    </group>
  );
};

export const StreetLamp: React.FC<{ position?: Vec3; on?: boolean }> = ({ position = [0, 0, 0], on = false }) => (
  <group position={position}>
    <mesh position={[0, 2.5, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 5, 6]} /><Flat color={PALETTE.steel} /></mesh>
    <Box size={[0.5, 0.18, 0.3]} color={on ? "#FFE7A8" : PALETTE.steel} emissive={on ? "#FFD27A" : undefined} position={[0.2, 5, 0]} />
  </group>
);

/**
 * Stadtviertel mit Straßenraster. `blocks` = Blöcke pro Richtung, `blockSize` m.
 * `clear` = Radius um den Mittelpunkt ohne Gebäude (Platz für Hauptgebäude/Action).
 */
export const CityGrid: React.FC<{ blocks?: number; blockSize?: number; road?: number; seed?: number; heights?: [number, number]; clear?: number; position?: Vec3; lit?: boolean; downtown?: number }> = ({
  blocks = 6, blockSize = 60, road = 14, seed = 4, heights = [9, 45], clear = 0, position = [0, 0, 0], lit = false, downtown = 1.8,
}) => {
  const r = rng(seed);
  const cell = blockSize + road;
  const half = (blocks * cell) / 2;
  const items: { p: Vec3; s: Vec3; c: string; seed: number }[] = [];
  for (let bx = 0; bx < blocks; bx++)
    for (let bz = 0; bz < blocks; bz++) {
      const cx = -half + bx * cell + cell / 2, cz = -half + bz * cell + cell / 2;
      const n = 2;
      for (let i = 0; i < n; i++)
        for (let k = 0; k < n; k++) {
          const w = blockSize / n - 4, d = blockSize / n - 4;
          const x = cx - blockSize / 2 + (i + 0.5) * (blockSize / n), z = cz - blockSize / 2 + (k + 0.5) * (blockSize / n);
          if (Math.hypot(x, z) < clear) continue;
          const center = 1 - Math.min(1, Math.hypot(x, z) / half);
          const h = r.range(heights[0], heights[1]) * (1 + center * (downtown - 1)) * (r.next() < 0.08 ? 2 : 1);
          items.push({ p: [x, 0, z], s: [w * r.range(0.75, 1), Math.round(h / 3.2) * 3.2, d * r.range(0.75, 1)], c: r.pick(PALETTE.facade), seed: r.int(1, 9999) });
        }
    }
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[blocks * cell + road, blocks * cell + road]} />
        <Flat color={PALETTE.asphalt} />
      </mesh>
      {Array.from({ length: blocks * blocks }).map((_, i) => {
        const bx = i % blocks, bz = Math.floor(i / blocks);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-half + bx * cell + cell / 2, 0.08, -half + bz * cell + cell / 2]} receiveShadow>
            <planeGeometry args={[blockSize + 3, blockSize + 3]} />
            <Flat color={PALETTE.sidewalk} />
          </mesh>
        );
      })}
      {items.map((b, i) => <Building key={i} position={b.p} size={b.s} color={b.c} seed={b.seed} lit={lit} />)}
    </group>
  );
};
