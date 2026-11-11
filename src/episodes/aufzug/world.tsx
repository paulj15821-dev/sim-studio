// Szenen für die Beispiel-Episode „Aufzug“. Zeigt, wie man Kit-Bauteile zu einer Welt kombiniert.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { COLOR, FONT, PALETTE } from "../../style/theme";
import { colorStops, keys3, shake, type Vec3 } from "../../lib/anim";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glass, Max, Crowd, Car, Building, CityGrid, Tree, Bush, useAerialTexture,
  SkyDome, CloudLayer, Airplane, Stars, Earth, Moon, SunGlow, OrbitRing, Particles, PlasmaShell, Rubble, type Pose,
} from "../../three/kit";
import { H, V } from "./metric";

// ───────────── Kabine (Meter, Boden bei y=0, Rückwand am Turm bei z=-1.2) ─────────────

const useDisplay = (text: string) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 96;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const c = tex.image as HTMLCanvasElement;
  const g = c.getContext("2d")!;
  g.fillStyle = "#101418"; g.fillRect(0, 0, 256, 96);
  g.fillStyle = COLOR.accent;
  g.font = `600 ${text.length > 9 ? 30 : text.length > 5 ? 44 : 64}px ${FONT.sans}, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 128, 50);
  tex.needsUpdate = true;
  return tex;
};

/** `unit` = Weltmaßstab der Kabine (1 = Meter, 0.001 = km-Welt) – nötig, damit das Innenlicht korrekt abfällt. */
export const Cabin: React.FC<{ floorText: string; doors?: number; litButton?: boolean; unit?: number }> = ({ floorText, doors = 0, litButton = true, unit = 1 }) => {
  const display = useDisplay(floorText);
  const W = 2.4, Hh = 2.8, D = 2.4;
  const frame = PALETTE.steel;
  return (
    <group>
      {/* Glasboden mit Rahmen */}
      <Box size={[W, 0.08, 0.12]} color={frame} position={[0, -0.04, D / 2 - 0.06]} />
      <Box size={[W, 0.08, 0.12]} color={frame} position={[0, -0.04, -D / 2 + 0.06]} />
      <Box size={[0.12, 0.08, D]} color={frame} position={[W / 2 - 0.06, -0.04, 0]} />
      <Box size={[0.12, 0.08, D]} color={frame} position={[-W / 2 + 0.06, -0.04, 0]} />
      <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W - 0.2, D - 0.2]} />
        <Glass opacity={0.18} />
      </mesh>
      {/* Dach */}
      <Box size={[W + 0.1, 0.22, D + 0.1]} color="#2F3740" position={[0, Hh + 0.11, 0]} />
      {/* Eckpfosten */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <Box key={i} size={[0.1, Hh, 0.1]} color={frame} position={[(x * (W - 0.1)) / 2, Hh / 2, (z * (D - 0.1)) / 2]} />
      ))}
      {/* Seitenglas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2, Hh / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[D, Hh]} />
          <Glass opacity={0.16} />
        </mesh>
      ))}
      {/* Schiebetüren vorne */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (W / 4 + doors * (W / 2 - 0.1)), Hh / 2, D / 2]}>
          <mesh><planeGeometry args={[W / 2, Hh]} /><Glass opacity={0.16} /></mesh>
          <Box size={[0.05, Hh, 0.06]} color={frame} position={[(-s * W) / 4, 0, 0]} />
        </group>
      ))}
      {/* Rückwand mit Display und Tastenfeld */}
      <Box size={[W, Hh, 0.08]} color="#C9CED4" position={[0, Hh / 2, -D / 2]} />
      <mesh position={[0, Hh - 0.35, -D / 2 + 0.05]}>
        <planeGeometry args={[0.8, 0.3]} />
        <meshBasicMaterial map={display} toneMapped={false} />
      </mesh>
      <group position={[0.75, 1.25, -D / 2 + 0.06]}>
        <Box size={[0.32, 0.6, 0.03]} color="#9AA3AD" cast={false} />
        {Array.from({ length: 8 }).map((_, i) => {
          const lit = litButton && i === 5;
          return (
            <Box key={i} size={[0.07, 0.07, 0.03]} color={lit ? COLOR.accent : "#E6E9EE"} emissive={lit ? COLOR.accent : undefined} cast={false}
              position={[(i % 2) * 0.13 - 0.065, 0.2 - Math.floor(i / 2) * 0.13, 0.02]} />
          );
        })}
      </group>
      {/* Deckenlicht */}
      <Box size={[1.2, 0.03, 1.2]} color="#FFFFFF" emissive="#FFFFFF" position={[0, Hh - 0.02, 0]} cast={false} />
      {/* three.js begrenzt den Abfall auf 1/max(d², 0.01) → in der km-Welt (unit=0.001) wäre decay=2 ~10.000× zu dunkel.
          Darum dort ohne Abfall (decay 0) mit festen Intensitäten, die dem Meter-Look entsprechen. */}
      <pointLight position={[0, Hh - 0.3, 0]} intensity={unit === 1 ? 3 : 1.1} distance={6 * unit} decay={unit === 1 ? 2 : 0} color="#FFF4E0" />
      {/* Fülllicht vorne (reicht nur ~4 m) – sonst sind Max' Schattenseiten im All pechschwarz */}
      <pointLight position={[-0.6, 1.5, 1.0]} intensity={unit === 1 ? 1.2 : 0.6} distance={4 * unit} decay={unit === 1 ? 2 : 0} color="#E8F0FF" />
    </group>
  );
};

/** Schienen am Turm, die einfach „unendlich“ weitergehen */
const Rails: React.FC<{ below: number; above: number }> = ({ below, above }) => (
  <group>
    {[-1, 1].map((s) => (
      <Box key={s} size={[0.14, below + above, 0.14]} color={PALETTE.steel} position={[s * 1.32, (above - below) / 2, -1.32]} cast={false} bevel={0} />
    ))}
  </group>
);

export const floorText = (h: number) => {
  const f = Math.floor(h / 3.2);
  if (f < 1) return "EG";
  return new Intl.NumberFormat("de-DE").format(f);
};

// ───────────── Himmel nach Höhe ─────────────

/** Sonne im All steiler, damit die Erde unter der Kabine voll beleuchtet ist */
const SUN_HIGH: Vec3 = [45, 70, 30];

const skyTop = (h: number) =>
  colorStops([{ at: 0, c: "#7FC0F2" }, { at: 3000, c: "#6AAEEB" }, { at: 9000, c: "#4D86D6" }, { at: 16000, c: "#2E5BAE" }, { at: 30000, c: "#152559" }, { at: 60000, c: "#060A1A" }, { at: 110000, c: PALETTE.space }], h);
const skyHorizon = (h: number) =>
  colorStops([{ at: 0, c: "#DDEFF7" }, { at: 4000, c: "#CBE4F5" }, { at: 12000, c: "#A9CBEE" }, { at: 30000, c: "#6F95D4" }, { at: 60000, c: "#2A3E7A" }, { at: 120000, c: "#0B1024" }, { at: 300000, c: PALETTE.space }], h);

// ───────────── Welt ─────────────

export type Cam = { pos: Vec3; look: Vec3; fov?: number; units?: "m" | "km" };
export type CamFn = (c: { t: number; local: number; p: number; h: number }) => Cam;

type WorldProps = {
  shot: ShotInfo;
  mode: "low" | "high";
  cam: CamFn;
  pose?: Pose | ((t: number) => Pose);
  maxRotY?: number | ((t: number) => number);
  expression?: "neutral" | "happy" | "shock";
  shakeAmp?: number;
  marker?: boolean;
  rings?: boolean;
};

const LowWorld: React.FC<{ h: number; t: number; v: number }> = ({ h, t, v }) => {
  const aerial = useAerialTexture(3, 0.12);
  const crowdPose: Pose = t > 6 ? "lookUp" : "idle";
  return (
    <>
      <group position={[0, -h, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
          <planeGeometry args={[60000, 60000]} />
          <meshStandardMaterial map={aerial} roughness={1} />
        </mesh>
        <CityGrid blocks={6} blockSize={60} seed={4} clear={52} heights={[10, 42]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} receiveShadow>
          <planeGeometry args={[96, 96]} />
          <Flat color={PALETTE.sidewalk} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-26, 0.16, 22]} receiveShadow>
          <planeGeometry args={[26, 30]} />
          <Flat color={PALETTE.grass} />
        </mesh>
        <Building position={[0, 0, -13.4]} size={[24, 60, 24]} color="#EADFCC" roof="#5E6B78" seed={77} />
        {[[-30, 12], [-22, 30], [-34, 30], [24, 26], [34, 8]].map(([x, z], i) => (
          <Tree key={i} position={[x, 0, z]} seed={i + 3} scale={1.6} />
        ))}
        {[[-18, 14], [-30, 22], [20, 18]].map(([x, z], i) => <Bush key={i} position={[x, 0, z]} seed={i + 40} scale={1.3} />)}
        <Crowd n={14} seed={8} area={[30, 18]} center={[4, 0.12, 18]} pose={crowdPose} time={t} faceTo={[0, 0, 0]} />
        {[0, 1, 2, 3].map((i) => (
          <Car key={i} seed={i + 2} position={[-200 + ((t * 14 + i * 110) % 400), 0, 71.5 + (i % 2) * 5]} rotationY={Math.PI / 2} wheelSpin={t * 10} />
        ))}
      </group>
      <Rails below={Math.min(h + 1, 4000)} above={4000} />
      <CloudLayer n={70} y={2200 - h} area={9000} scale={[150, 420]} seed={21} clearRadius={300} />
      <CloudLayer n={16} y={2200 - h} area={700} scale={[35, 80]} seed={22} clearRadius={14} />
      <Airplane position={[45, 10600 - h, -70]} rotationY={Math.PI / 2} scale={1} />
      <Particles kind="streaks" n={90} box={[30, 60, 30]} center={[0, 1.4, 0]} time={t} velocity={[0, -Math.min(Math.max(v, 3), 120), 0]} opacity={Math.min(1, v / 40) * 0.7} seed={5} />
    </>
  );
};

/** 1-px-Linie (bleibt aus jeder Entfernung sichtbar) */
const Line: React.FC<{ a: Vec3; b: Vec3; color: string; opacity?: number }> = ({ a, b, color, opacity = 1 }) => {
  const obj = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false }));
  }, []);
  useLayoutEffect(() => {
    obj.geometry.setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    obj.geometry.computeBoundingSphere();
    (obj.material as THREE.LineBasicMaterial).opacity = opacity;
    obj.visible = opacity > 0;
  });
  return <primitive object={obj} />;
};

/** Leuchtender „Du bist hier“-Punkt, Größe passend zur Kameradistanz */
const Marker: React.FC<{ size: number }> = ({ size }) => <SunGlow position={[0, 0, 0]} size={size} color={COLOR.accent} />;

const GeoRing: React.FC<{ center: Vec3 }> = ({ center }) => {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2;
      pts.push(Math.cos(a) * 42157, Math.sin(a * 3) * 300, Math.sin(a) * 42157);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo} position={center} rotation={[0.41, 0, 0]}>
      <pointsMaterial size={4} sizeAttenuation={false} color="#FFFFFF" toneMapped={false} />
    </points>
  );
};

const HighWorld: React.FC<{ hk: number; t: number; markerSize: number; showMarker: boolean; rings: boolean }> = ({ hk, t, markerSize, showMarker, rings }) => {
  const R = 6371;
  const earthC: Vec3 = [0, -(R + hk), 0];
  const h = hk * 1000;
  const plasma = t < 27 ? 0 : t < 29 ? 1 : Math.max(0, 1 - (t - 29) / 2);
  return (
    <>
      {hk < 200 && <SkyDome top={skyTop(h)} horizon={skyHorizon(h)} bottom={skyHorizon(h)} radius={2500} sun={SUN_HIGH} haze={Math.max(0, 1 - hk / 80)} />}
      <Stars n={2600} radius={1_000_000} opacity={Math.min(1, Math.max(0, (hk - 25) / 60))} />
      <SunGlow position={[SUN_HIGH[0] * 4500, SUN_HIGH[1] * 4500, SUN_HIGH[2] * 4500]} size={42000} />
      <Earth radius={R} position={earthC} rotationY={1.1 + t * 0.02} tilt={0.95} detail={6} cloudHeight={0.0016} />
      {rings && <OrbitRing radius={R + 408} position={earthC} tilt={0.5} color={COLOR.accent} opacity={0.6} />}
      {rings && <GeoRing center={earthC} />}
      <Moon radius={1737} position={[0, 384400 - R - hk, 0]} />
      <Line a={[0, -hk, 0]} b={[0, 0, 0]} color={COLOR.accent} opacity={showMarker ? 0.8 : 0} />
      {showMarker && <Marker size={markerSize} />}
      <group scale={0.001}>
        <Rails below={4000} above={4000} />
        <PlasmaShell position={[0, 3.0, 0]} radius={1.9} strength={plasma} time={t} />
      </group>
    </>
  );
};

export const ElevatorWorld: React.FC<WorldProps> = ({ shot, mode, cam, pose = "idle", maxRotY = 0, expression = "neutral", shakeAmp, marker = false, rings = false }) => {
  const { t, local, p } = useTimes(shot);
  const h = H(t);
  const v = V(t);
  const c = cam({ t, local, p, h });
  const amp = shakeAmp ?? Math.min(0.06, 0.004 * Math.log2(1 + v));
  const sh = shake(t, amp, 13);
  // Kabinen-Maßstab: low = Meter, high = km (Kabine wird auf 0.001 skaliert)
  const k = mode === "high" ? 0.001 : 1;
  const camScale = mode === "high" && c.units !== "km" ? 0.001 : 1;
  const pos: Vec3 = [c.pos[0] * camScale + sh[0] * k, c.pos[1] * camScale + sh[1] * k, c.pos[2] * camScale + sh[2] * k];
  const look: Vec3 = [c.look[0] * camScale, c.look[1] * camScale, c.look[2] * camScale];
  const ps = typeof pose === "function" ? pose(t) : pose;
  const ry = typeof maxRotY === "function" ? maxRotY(t) : maxRotY;
  const dist = Math.hypot(pos[0], pos[1], pos[2]);
  const fog: [string, number, number] | null = mode === "low" ? [skyHorizon(h), 300 + h * 0.6, 2500 + h * 1.6] : null;

  const cabinAndMax = (
    <group scale={k}>
      <Cabin floorText={floorText(h)} unit={k} />
      <Max pose={ps} time={t} position={[0, 0, -0.1]} rotationY={ry} expression={expression} />
    </group>
  );

  return (
    <Stage
      preset={mode === "low" ? "day" : "space"}
      bg={skyTop(h)}
      fog={fog}
      sunDir={mode === "low" ? [60, 30, 40] : SUN_HIGH}
      sunIntensity={mode === "low" ? 2.6 : 3.0}
      shadowSize={h < 80 ? 70 : 12}
      shadowCenter={h < 80 ? [0, -h * 0.5, 0] : [0, 1, 0]}
      shadows={mode === "low"}
      logDepth
    >
      <Camera pos={pos} look={look} fov={c.fov ?? 45} near={mode === "low" ? 0.05 : 0.00005} far={mode === "low" ? 200000 : 3_000_000} />
      {mode === "low" ? (
        <>
          <SkyDome top={skyTop(h)} horizon={skyHorizon(h)} radius={80000} sun={[60, 30, 40]} />
          <LowWorld h={h} t={t} v={v} />
        </>
      ) : (
        <HighWorld hk={h / 1000} t={t} markerSize={dist * 0.035} showMarker={marker} rings={rings} />
      )}
      {cabinAndMax}
    </Stage>
  );
};

// ───────────── Finale: Mondlandung (Meter) ─────────────

export const MoonLanding: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, local } = useTimes(shot);
  const doors = Math.min(1, Math.max(0, (t - 56.7) / 0.8));
  const walkT = Math.min(1, Math.max(0, (t - 57.6) / 2.6));
  const walking = t > 57.6 && t < 60.2;
  const maxZ = -0.1 + walkT * 4.2;
  const camPos = keys3([{ t: 0, v: [5.5, 1.5, 9.5] }, { t: 6.1, v: [3.2, 1.7, 9.0] }], local);
  const look = keys3([{ t: 0, v: [0, 1.5, 0] }, { t: 6.1, v: [-1.3, 1.5, 2.6] }], local); // Max rechts der Mitte → HUD links verdeckt ihn nicht
  const dust = Math.max(0, 1 - local / 1.2);
  const r = shake(t, Math.max(0, 0.08 - local * 0.12), 20);
  return (
    <Stage preset="space" bg="#03040A" fog={null} sunDir={[50, 22, 35]} sunIntensity={3.2} shadowSize={14} shadowCenter={[0, 0, 2]}>
      <Camera pos={[camPos[0] + r[0], camPos[1] + r[1], camPos[2]]} look={look} fov={42} far={20000} />
      <Stars n={2500} radius={9000} />
      <SunGlow position={[5000, 2200, 3500]} size={900} />
      <Earth radius={70} position={[-500, 650, -1900]} rotationY={t * 0.05} detail={5} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6000, 6000, 1, 1]} />
        <Flat color={PALETTE.moon[0]} />
      </mesh>
      <Rubble n={260} area={[90, 90]} center={[0, 0, -10]} size={[0.15, 1.4]} seed={9} colors={PALETTE.moon} />
      {[[-9, -8, 5], [12, -20, 8], [-22, -30, 11], [6, 14, 3]].map(([x, z, rr], i) => (
        <mesh key={i} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[rr * 0.7, rr, 18]} />
          <Flat color={PALETTE.moon[1]} />
        </mesh>
      ))}
      <Particles kind="dust" n={160} box={[10, 1.4, 10]} center={[0, 0.5, 0]} time={t} velocity={[0.6, 0.2, 0.4]} opacity={dust} colors={[...PALETTE.moon]} />
      <Box size={[0.14, 5000, 0.14]} color={PALETTE.steel} position={[-1.32, 2500, -1.32]} bevel={0} />
      <Box size={[0.14, 5000, 0.14]} color={PALETTE.steel} position={[1.32, 2500, -1.32]} bevel={0} />
      <Cabin floorText="MOND" doors={doors} />
      <Max pose={walking ? "walk" : t > 60.2 ? "lookUp" : "idle"} time={t} position={[0, 0, maxZ]} rotationY={t > 60.2 ? -0.5 : 0} expression={t > 60.2 ? "shock" : "neutral"} />
    </Stage>
  );
};

