// Szenen für „Was wäre, wenn du nie aufhörst zu beschleunigen?“
// Max rennt Richtung −z und bleibt im Ursprung („floating origin“) – die Welt zieht an ihm vorbei.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { COLOR, FONT, PALETTE } from "../../style/theme";
import { clamp, colorStops, keys, keys3, mixHex, shake, type Vec3 } from "../../lib/anim";
import { rng } from "../../lib/random";
import { useTimes } from "../../lib/time";
import type { ShotInfo } from "../../types";
import {
  Stage, Camera, Box, Flat, Glass, Glow, Max, Car, House, Tree, Bush, Rock, SkyDome, Cloud, Stars, Earth, Moon, SunGlow,
  Particles, PlasmaShell, ShockRing, type Pose,
} from "../../three/kit";
import { V, X, EARTH_TIME, T_SOUND, T_ORBIT } from "./metric";

const wrap = (v: number, size: number) => ((((v + size / 2) % size) + size) % size) - size / 2;
const YEAR = 365.25 * 86400;

export type Cam = { pos: Vec3; look: Vec3; fov?: number; roll?: number };
export type CamFn = (c: { t: number; local: number; p: number; v: number; lift: number }) => Cam;

/** Kamera-Helfer: Fahrt a→b über die Shotdauer (relativ zu Max) */
export const move = (a: Vec3, b: Vec3, la: Vec3, lb?: Vec3, fov = 45, fov2?: number): CamFn => ({ p, lift }) => {
  const pos = keys3([{ t: 0, v: a }, { t: 1, v: b, ease: "inOut" }], p);
  const look = keys3([{ t: 0, v: la }, { t: 1, v: lb ?? la, ease: "inOut" }], p);
  return { pos: [pos[0], pos[1] + lift, pos[2]], look: [look[0], look[1] + lift, look[2]], fov: fov2 == null ? fov : fov + (fov2 - fov) * p };
};

/** Bein-Takt: schneller mit dem Tempo, aber lesbar */
const cadence = (v: number) => Math.min(3.2, 1.25 + Math.log2(1 + v / 3) * 0.32);

// ───────────── Bauteile ─────────────

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
};

/** Stadtbus (12 m, fährt Richtung −z) */
export const Bus: React.FC<{ position?: Vec3; wheelSpin?: number }> = ({ position = [0, 0, 0], wheelSpin = 0 }) => {
  const sign = useMemo(
    () => canvasTex(256, 64, (g) => {
      g.fillStyle = "#111418"; g.fillRect(0, 0, 256, 64);
      g.fillStyle = "#FFB547"; g.font = `700 40px ${FONT.sans}, sans-serif`; g.textBaseline = "middle";
      g.fillText("42  Bahnhof", 14, 34);
    }),
    []
  );
  const body = "#F2C14E";
  return (
    <group position={position}>
      <Box size={[2.55, 2.6, 12]} color={body} position={[0, 1.65, 0]} roughness={0.4} />
      <Box size={[2.45, 0.18, 11.8]} color="#E9E4DA" position={[0, 3.04, 0]} />
      {/* Fensterband */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.285, 2.15, 0.4]} rotation={[0, (s * Math.PI) / 2, 0]}>
          <planeGeometry args={[10.4, 1.1]} />
          <meshStandardMaterial color="#25323F" roughness={0.15} metalness={0.3} />
        </mesh>
      ))}
      {/* Front (−z) und Heck */}
      <mesh position={[0, 2.0, -6.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.3, 1.6]} />
        <meshStandardMaterial color="#25323F" roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.95, -6.02]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.9, 0.42]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.2, 6.01]}>
        <planeGeometry args={[2.2, 1.1]} />
        <meshStandardMaterial color="#25323F" roughness={0.15} metalness={0.3} />
      </mesh>
      {[-0.95, 0.95].map((x) => (
        <Box key={x} size={[0.35, 0.22, 0.05]} color="#D9302A" emissive="#B01010" position={[x, 0.9, 6.03]} cast={false} />
      ))}
      <Box size={[2.6, 0.35, 12.1]} color="#2B3036" position={[0, 0.45, 0]} />
      {[[-1.2, -4], [1.2, -4], [-1.2, 3.6], [1.2, 3.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.5, z]} rotation={[wheelSpin, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.35, 12]} />
          <Flat color="#1E2126" />
        </mesh>
      ))}
    </group>
  );
};

/** Haltestellen-Schild (gelber Kreis, grünes H) */
const useHSign = () =>
  useMemo(
    () => canvasTex(128, 128, (g) => {
      g.fillStyle = "#F3C623"; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#1F7A3F"; g.lineWidth = 6; g.stroke();
      g.fillStyle = "#1F7A3F"; g.font = `800 84px ${FONT.sans}, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("H", 64, 70);
    }),
    []
  );

/** Bushaltestelle: Wartehäuschen + H-Schild. `ruin` 0..1 = verfallen (Glas weg, Schild schief, Rost) */
export const BusStop: React.FC<{ position?: Vec3; rotationY?: number; ruin?: number }> = ({ position = [0, 0, 0], rotationY = 0, ruin = 0 }) => {
  const h = useHSign();
  const frame = mixHex(PALETTE.steel, "#6E3E22", ruin);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Häuschen (offen zur Straße = +x) */}
      {[[-1.6, -0.6], [1.6, -0.6]].map(([z], i) => (
        <Box key={i} size={[0.08, 2.4, 0.08]} color={frame} position={[-0.7, 1.2, z]} bevel={0} />
      ))}
      {[-1.6, 1.6].map((z) => <Box key={z} size={[0.08, 2.4, 0.08]} color={frame} position={[0.5, 1.2, z]} bevel={0} />)}
      <group rotation={[0, 0, ruin * 0.25]} position={[0, ruin * -0.3, 0]}>
        <Box size={[1.5, 0.1, 3.5]} color={mixHex("#3A434D", "#4A2A1A", ruin)} position={[-0.1, 2.45, 0]} />
      </group>
      {ruin < 0.6 && (
        <mesh position={[-0.72, 1.3, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[3.2, 2.0]} />
          <Glass opacity={0.25 * (1 - ruin)} />
        </mesh>
      )}
      {/* Bank */}
      <Box size={[0.45, 0.08, 2.4]} color={mixHex("#B88A5E", "#3A2416", ruin)} position={[-0.35, 0.48, 0]} />
      {[-1, 1].map((s) => <Box key={s} size={[0.06, 0.45, 0.06]} color={frame} position={[-0.35, 0.24, s * 1.0]} bevel={0} />)}
      {/* Schild */}
      <group position={[0.9, 0, 2.6]} rotation={[ruin * 0.22, 0, -ruin * 0.35]}>
        <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 2.8, 8]} /><Flat color={frame} /></mesh>
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.035, 2.75, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <circleGeometry args={[0.32, 24]} />
            <meshStandardMaterial map={h} roughness={0.5} color={mixHex("#FFFFFF", "#8A5A3A", ruin * 0.8)} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** ICE-artiger Hochgeschwindigkeitszug, Front bei z=0, fährt Richtung −z, `cars` Wagen à 25 m */
const Train: React.FC<{ position?: Vec3; cars?: number }> = ({ position = [0, 0, 0], cars = 7 }) => (
  <group position={position}>
    {Array.from({ length: cars }).map((_, i) => (
      <group key={i} position={[0, 0, i * 25.6 + 12.5]}>
        <Box size={[3.0, 3.4, 25]} color="#F4F5F7" position={[0, 2.3, 0]} roughness={0.35} />
        <Box size={[3.04, 0.22, 25]} color="#D7262E" position={[0, 1.2, 0]} cast={false} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.51, 2.75, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <planeGeometry args={[22, 0.8]} />
            <meshStandardMaterial color="#1E2630" roughness={0.1} metalness={0.4} />
          </mesh>
        ))}
        <Box size={[2.6, 0.6, 24]} color="#3A3F46" position={[0, 0.55, 0]} cast={false} />
      </group>
    ))}
    {/* Nase */}
    <mesh position={[0, 2.3, -1.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.75]} castShadow>
      <coneGeometry args={[1.75, 5, 16, 1, false, 0, Math.PI * 2]} />
      <Flat color="#F4F5F7" roughness={0.35} />
    </mesh>
  </group>
);

/** Felder-Textur (kachelt) */
const useFields = (seed = 5) =>
  useMemo(
    () => canvasTex(1024, 1024, (g) => {
      const r = rng(seed);
      const fields = ["#8DBF6A", "#A9C979", "#C9C27A", "#7AA95C", "#B8B06A", "#94B56E", "#D8CC8E", "#6E9E52"];
      g.fillStyle = "#86B866"; g.fillRect(0, 0, 1024, 1024);
      for (let y = 0; y < 1024; y += 128) for (let x = 0; x < 1024; x += 128) {
        g.fillStyle = r.pick(fields);
        g.fillRect(x + 2, y + 2, 124, 124);
        // Ackerfurchen
        g.strokeStyle = "rgba(0,0,0,0.05)"; g.lineWidth = 2;
        for (let k = 8; k < 124; k += 10) { g.beginPath(); g.moveTo(x + 2, y + k); g.lineTo(x + 126, y + k); g.stroke(); }
      }
    }, [10, 10]),
    [seed]
  );

const useDashes = () =>
  useMemo(() => canvasTex(16, 128, (g) => { g.clearRect(0, 0, 16, 128); g.fillStyle = "#F4F1E8"; g.fillRect(4, 0, 8, 56); }, [1, 300]), []);

// ───────────── Bodenwelt (Meter) ─────────────

type Scenery = "town" | "rail" | "country";
type GroundProps = {
  shot: ShotInfo;
  cam: CamFn;
  scenery: Scenery;
  pose?: Pose;
  expression?: "neutral" | "happy" | "shock";
  /** Zeitverschiebung für Wolken/Abheben */
  lift?: boolean;
  /** Abendlicht: 0 = Tag, 1 = golden */
  warm?: number;
};

const sunGround: Vec3 = [-55, 38, -45];

/** Abheben ab Orbitgeschwindigkeit (künstlerisch überhöht) */
export const liftAt = (t: number) => (t < T_ORBIT - 0.1 ? 0 : 1.5 * (Math.pow(2, (t - (T_ORBIT - 0.1)) * 3.1) - 1));

export const GroundRun: React.FC<GroundProps> = ({ shot, cam, scenery, pose = "run", expression = "neutral", lift = false, warm = 0 }) => {
  const { t, local, p } = useTimes(shot);
  const v = V(t);
  const d = X(t);
  const ly = lift ? liftAt(t) : 0;
  const c = cam({ t, local, p, v, lift: ly });
  const amp = Math.min(0.12, 0.006 * Math.log2(1 + v / 5));
  const sh = shake(t, amp, 14);
  const fields = useFields(5);
  const dashes = useDashes();
  // Fahrbahnmarkierung mitschieben
  dashes.offset.y = (d / 20) % 1;
  const skyTop = mixHex("#6FB0EA", "#7A8FD0", warm);
  const skyHor = mixHex("#D8ECF7", "#F6C99A", warm);

  // Bus: startet 3 m vor Max, 9 m/s → Max überholt bei ~3 s
  const busZ = -3 - 9 * t + d - 6;
  // ICE: Front ab t=4 ca. 10 m vor Max, 83 m/s (300 km/h)
  const trainZ = -10 - 83 * (t - 4) + (d - X(4));
  // Mach-Kegel + Überschallknall
  const mach = v / 343;
  const cone = clamp(1 - Math.abs(mach - 1) / 0.35) * 0.9;
  const ringR = t > T_SOUND && t < T_SOUND + 1.6 ? 4 + (t - T_SOUND) * 240 : 0;
  const ringZ = d - X(T_SOUND);
  const plasma = clamp((t - 9.0) / 1.2) * (lift ? clamp(1 - (t - 12.6) / 1.0) : 1);
  const dustTrail = clamp((v - 150) / 250);

  // Wiederkehrende Kulisse (wrap um Max)
  const L = 480;
  const r = useMemo(() => {
    const g = rng(scenery === "rail" ? 11 : 23);
    return Array.from({ length: 34 }).map((_, i) => ({ z: (i / 34) * L, x: (g.next() < 0.5 ? -1 : 1) * g.range(14, 70), s: g.range(1.1, 2.0), seed: i + 3, kind: g.next() < 0.3 ? "pine" : "round" }));
  }, [scenery]);

  const groundY = 0;
  return (
    <Stage preset="day" bg={skyTop} fog={[skyHor, 180 + ly * 2, 2600 + ly * 8]} sunDir={sunGround} sunIntensity={2.7} shadowSize={ly > 60 ? 10 : 34} shadowCenter={[0, ly > 60 ? ly : 0, -8]} env={[skyTop, skyHor, "#6E7560"]}>
      <Camera pos={[c.pos[0] + sh[0], c.pos[1] + sh[1], c.pos[2] + sh[2]]} look={c.look} fov={c.fov ?? 45} roll={c.roll ?? 0} near={0.1} far={40000} />
      <SkyDome top={skyTop} horizon={skyHor} radius={30000} sun={sunGround} haze={1} />
      {/* Boden */}
      <group position={[0, groundY, wrap(d, 600)]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[6000, 6000]} />
          <Flat color="#FFFFFF" map={fields} roughness={1} />
        </mesh>
      </group>

      {scenery !== "rail" && (
        <group>
          {/* Straße entlang z */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2000]} receiveShadow>
            <planeGeometry args={[9, 8000]} />
            <Flat color={PALETTE.asphalt} roughness={0.85} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -2000]}>
            <planeGeometry args={[0.22, 8000]} />
            <meshStandardMaterial map={dashes} transparent roughness={0.6} />
          </mesh>
          {scenery === "town" &&
            [-1, 1].map((s) => (
              <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 6.0, 0.1, -2000]} receiveShadow>
                <planeGeometry args={[3, 8000]} />
                <Flat color={PALETTE.sidewalk} />
              </mesh>
            ))}
        </group>
      )}

      {scenery === "town" && (
        <group position={[0, 0, d]}>
          <BusStop position={[-6.6, 0.1, 1.5]} rotationY={0} />
          {Array.from({ length: 22 }).map((_, i) => {
            const side = i % 2 ? 1 : -1;
            const z = 30 - Math.floor(i / 2) * 15;
            return <House key={i} seed={i + 4} position={[side * 15, 0, z]} rotationY={side > 0 ? -Math.PI / 2 : Math.PI / 2} />;
          })}
          {Array.from({ length: 16 }).map((_, i) => (
            <Tree key={i} seed={i + 30} scale={1.2} position={[(i % 2 ? 1 : -1) * 9.0, 0, 22 - i * 9]} />
          ))}
          {[0, 1, 2].map((i) => (
            <Car key={i} seed={i + 5} position={[2.3, 0, -60 - i * 35 + 12 * t]} rotationY={0} wheelSpin={t * 12} />
          ))}
        </group>
      )}
      {scenery === "town" && <Bus position={[-2.3, 0, busZ]} wheelSpin={-t * 9} />}

      {scenery === "rail" && (
        <group>
          {/* Schotterbett, Schienen, Feldweg für Max */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7, 0.05, -2000]} receiveShadow>
            <planeGeometry args={[6, 8000]} />
            <Flat color="#9C968C" roughness={1} />
          </mesh>
          {[-7.75, -6.25].map((x) => <Box key={x} size={[0.12, 0.16, 8000]} color={PALETTE.steel} position={[x, 0.2, -2000]} bevel={0} metalness={0.6} roughness={0.35} cast={false} />)}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -2000]} receiveShadow>
            <planeGeometry args={[3.2, 8000]} />
            <Flat color="#C8B48A" roughness={1} />
          </mesh>
          {Array.from({ length: 16 }).map((_, i) => {
            const z = wrap(-i * 60 + d, 960) - 300;
            return (
              <group key={i} position={[-10, 0, z]}>
                <Box size={[0.25, 7.5, 0.25]} color="#8E969E" position={[0, 3.75, 0]} bevel={0} />
                <Box size={[3.6, 0.15, 0.15]} color="#8E969E" position={[1.7, 7.2, 0]} bevel={0} cast={false} />
              </group>
            );
          })}
          <Box size={[0.04, 0.04, 8000]} color="#3A3F46" position={[-7, 6.9, -2000]} bevel={0} cast={false} />
          <Train position={[-7, 0.3, trainZ]} />
        </group>
      )}

      {/* Bäume/Büsche als wiederkehrende Kulisse */}
      {scenery !== "town" &&
        r.map((o, i) => {
          const z = wrap(-o.z + d, L) - L * 0.3;
          return o.kind === "pine" || i % 3 ? (
            <Tree key={i} seed={o.seed} scale={o.s} kind={o.kind as "round" | "pine"} position={[o.x, 0, z]} />
          ) : (
            <Bush key={i} seed={o.seed} scale={o.s * 1.4} position={[o.x, 0, z]} />
          );
        })}
      {scenery === "country" &&
        Array.from({ length: 10 }).map((_, i) => {
          const z = wrap(-i * 140 + d * 0.999, 1400) - 400;
          return <House key={i} seed={i + 60} position={[(i % 2 ? 1 : -1) * (60 + (i % 3) * 40), 0, z]} rotationY={i} />;
        })}
      {scenery === "country" && (
        <>
          {/* Gegenverkehr */}
          {[0, 1, 2, 3].map((i) => (
            <Car key={i} seed={i + 9} position={[2.3, 0, wrap(-i * 90 + d + 30 * t, 1200) - 200]} rotationY={0} wheelSpin={t * 14} />
          ))}
        </>
      )}

      {/* Wolken */}
      {Array.from({ length: 14 }).map((_, i) => {
        const g = rng(100 + i);
        const x = g.range(-2500, 2500), z0 = g.range(0, 5000), y = g.range(700, 1300);
        return <Cloud key={i} seed={i + 1} scale={g.range(80, 200)} position={[x, y, wrap(-z0 + d * 0.9, 5000) - 2200]} />;
      })}

      {/* Max */}
      <group position={[0, ly, 0]}>
        <Max pose={pose} time={t} speed={cadence(v)} rotationY={Math.PI} expression={expression} position={[0.8, 0, 0]} />
        {/* Mach-Kegel (Dampf) */}
        {cone > 0.02 && (
          <mesh position={[0.8, 1.0, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[1.6, 3.2, 32, 1, true]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={cone * 0.55} side={THREE.DoubleSide} depthWrite={false} roughness={1} />
          </mesh>
        )}
        {/* Staubfahne hinter Max */}
        {dustTrail > 0.01 && (
          <mesh position={[0.8, 0.6, 26]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[4.5, 52, 24, 1, true]} />
            <meshStandardMaterial color="#D9C7A0" transparent opacity={dustTrail * 0.45 * (lift ? clamp(1 - ly / 40) : 1)} side={THREE.DoubleSide} depthWrite={false} roughness={1} />
          </mesh>
        )}
      </group>
      {ringR > 0 && <ShockRing radius={ringR} width={0.1} glow={false} color="#F4F1EA" opacity={clamp(1 - (t - T_SOUND) / 1.6) * 0.55} position={[0.8, 0.4, ringZ]} />}
      {/* Geschwindigkeitsstreifen + Staub */}
      <Particles kind="streaks" n={120} box={[40, 14, 120]} center={[0.8, 3 + ly, -10]} time={t} velocity={[0, 0, Math.min(Math.max(v, 5), 220)]} opacity={clamp(v / 60) * 0.6} seed={7} />
      <Particles kind="dust" n={140} box={[12, 2, 40]} center={[0.8, 0.6, 8]} time={t} velocity={[0, 0.3, Math.min(v, 60)]} opacity={clamp(v / 20) * (1 - clamp(ly / 10)) * 0.9} seed={8} />
      {plasma > 0.2 && <Particles kind="embers" n={90} box={[6, 4, 30]} center={[0.8, 1.2 + ly, 12]} time={t} velocity={[0, 0.5, 60]} stretch={6} opacity={plasma} seed={9} />}
    </Stage>
  );
};

// ───────────── Weltall (km; Max im Ursprung, im Maßstab 0.001) ─────────────

const R_E = 6371;
export const MOON_X = 6500, MOON_Y = 900;
const SUN_SPACE: Vec3 = [-40, 22, -60];

/** 1-px-Linie */
const Line: React.FC<{ a: Vec3; b: Vec3; color: string; opacity?: number }> = ({ a, b, color, opacity = 1 }) => {
  const obj = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color, transparent: true, toneMapped: false })), []);
  useLayoutEffect(() => {
    obj.geometry.setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    obj.geometry.computeBoundingSphere();
    (obj.material as THREE.LineBasicMaterial).opacity = opacity;
    obj.visible = opacity > 0;
  });
  return <primitive object={obj} />;
};

type SpaceProps = {
  shot: ShotInfo;
  /** Kamera in Metern relativ zu Max (wird ×0.001 skaliert), außer units="km" */
  cam: CamFn;
  units?: "m" | "km";
  pose?: Pose;
  expression?: "neutral" | "happy" | "shock";
  /** Doppler-Tunnel 0..1 */
  warp?: number | ((t: number) => number);
  /** Mond-Vorbeiflug: z-Position (km) als Funktion der Shot-Zeit 0..1 */
  moonZ?: (p: number) => number;
  marker?: boolean;
  /** Erde ausblenden (nur Sterne) */
  noEarth?: boolean;
};

export const SpaceRun: React.FC<SpaceProps> = ({ shot, cam, units = "m", pose = "run", expression = "neutral", warp = 0, moonZ, marker = false, noEarth = false }) => {
  const { t, local, p } = useTimes(shot);
  const v = V(t);
  const xk = X(t) / 1000;
  const lift = liftAt(t) / 1000; // km
  const c = cam({ t, local, p, v, lift: 0 });
  const k = units === "km" ? 1 : 0.001;
  const sh = shake(t, 0.03, 11);
  const pos: Vec3 = [c.pos[0] * k + sh[0] * 0.001, c.pos[1] * k + sh[1] * 0.001, c.pos[2] * k];
  const look: Vec3 = [c.look[0] * k, c.look[1] * k, c.look[2] * k];
  const w = typeof warp === "function" ? warp(t) : warp;
  const earthC: Vec3 = [0, -(R_E + Math.min(lift, 2)), xk];
  const dist = Math.hypot(pos[0], pos[1], pos[2]);
  // Doppler: vorne blau, hinten rot
  const blue = ["#BFD8FF", "#7FB0FF", "#FFFFFF", "#9C8CFF", "#6FF2D0"];
  return (
    <Stage preset="space" bg={mixHex(PALETTE.space, "#0A1238", w * 0.6)} fog={null} sunDir={SUN_SPACE} sunIntensity={3.0} shadows={false} logDepth>
      <Camera pos={pos} look={look} fov={c.fov ?? 45} roll={c.roll ?? 0} near={units === "km" ? 1 : 0.0003} far={3_000_000} />
      <Stars n={3000} radius={900_000} opacity={1 - w * 0.5} />
      <SunGlow position={[SUN_SPACE[0] * 9000, SUN_SPACE[1] * 9000, SUN_SPACE[2] * 9000]} size={60000} />
      {!noEarth && <Earth radius={R_E} position={earthC} rotationY={2.2 + t * 0.01} tilt={1.0} detail={6} cloudHeight={0.0016} />}
      {moonZ && <Moon radius={1737} position={[MOON_X, MOON_Y, moonZ(p)]} />}
      {marker && (
        <>
          <Line a={[0, -lift, xk]} b={[0, 0, 0]} color={COLOR.accent} opacity={0.9} />
          <SunGlow position={[0, 0, 0]} size={dist * 0.04} color={COLOR.accent} />
        </>
      )}
      <group scale={0.001}>
        {/* Fülllicht, sonst ist Max im All auf der Schattenseite schwarz */}
        <pointLight position={[2, 3, 3]} intensity={0.9} distance={0} decay={0} color="#C8D8FF" />
        <Max pose={pose} time={t} speed={pose === "run" ? cadence(v) : 1} rotationY={Math.PI} expression={expression} position={[0, -0.9, 0]} />
        {w > 0.01 && (
          <>
            <Particles kind="streaks" n={260} box={[70, 70, 600]} center={[0, 0, -200]} time={t} velocity={[0, 0, 300 + w * 900]} opacity={w} colors={blue} seed={31} />
            <Particles kind="streaks" n={140} box={[22, 22, 300]} center={[0, 0, -100]} time={t + 3} velocity={[0, 0, 200 + w * 700]} opacity={w * 0.8} colors={["#FFFFFF", "#CFE2FF"]} seed={32} />
          </>
        )}
        {w > 0.5 && <SunGlow position={[0, 0.2, -400]} size={120 * (w - 0.4)} color="#BFD8FF" opacity={(w - 0.5) * 1.6} />}
      </group>
    </Stage>
  );
};

// ───────────── Zeitraffer an der Haltestelle ─────────────

export const TimeLapse: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, p } = useTimes(shot);
  const e = EARTH_TIME(t);
  const yrs = e / YEAR;
  const lg = Math.log10(Math.max(1e-6, yrs)); // −6 … 9.7
  // Tag/Nacht flackert, immer schneller
  const day = e / 86400;
  const flick = 0.5 + 0.5 * Math.sin(day * Math.PI * 2 + 0.7);
  const ruin = clamp((lg - 1) / 3);
  const overgrown = clamp((lg - 1.5) / 2.5) * (1 - clamp((lg - 7.5) / 1.5));
  const desert = clamp((lg - 7.5) / 1.8);
  const houses = 1 - clamp((lg - 2.5) / 2);
  const skyDay = mixHex("#7FB6E8", "#E89A5A", desert);
  const sky = mixHex("#0D1530", skyDay, flick);
  const hor = mixHex("#1C2850", mixHex("#D8ECF7", "#F2B27A", desert), flick);
  const groundCol = mixHex(mixHex(PALETTE.grass, "#4E8E45", overgrown), "#B7643A", desert);
  const camPos = keys3([{ t: 0, v: [9, 2.2, 12] }, { t: 1, v: [7.5, 2.6, 9.5] }], p);
  const sunDir: Vec3 = [Math.cos(day * 6.283) * 60, 30 + Math.sin(day * 6.283) * 25, -30];
  return (
    <Stage preset="day" bg={sky} fog={[hor, 60, 600]} sunDir={sunDir} sunIntensity={0.6 + flick * 2.2} shadowSize={20} shadowCenter={[-4, 0, 0]} env={[sky, hor, "#5A5040"]} envIntensity={0.3 + flick * 0.6}>
      <Camera pos={camPos} look={[-5, 1.4, 0]} fov={46} />
      <SkyDome top={sky} horizon={hor} radius={3000} sun={sunDir} haze={flick} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[3000, 3000]} /><Flat color={groundCol} roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -50]} receiveShadow>
        <planeGeometry args={[9, 400]} />
        <Flat color={mixHex(mixHex(PALETTE.asphalt, "#5F6B4A", overgrown), "#9A5530", desert)} roughness={1} />
      </mesh>
      <BusStop position={[-6.6, 0.1, 1.5]} ruin={Math.max(ruin, desert)} />
      {houses > 0.02 &&
        Array.from({ length: 8 }).map((_, i) => (
          <group key={i} scale={[1, houses, 1]}>
            <House seed={i + 4} position={[(i % 2 ? 1 : -1) * 15, 0, 30 - Math.floor(i / 2) * 15]} rotationY={i % 2 ? -Math.PI / 2 : Math.PI / 2} />
          </group>
        ))}
      {overgrown > 0.02 &&
        Array.from({ length: 22 }).map((_, i) => {
          const g = rng(200 + i);
          const s = overgrown * g.range(1.0, 2.4);
          return <Tree key={i} seed={i + 70} scale={s} position={[g.range(-28, 22), 0, g.range(-60, 22)]} kind={i % 3 ? "round" : "pine"} />;
        })}
      {overgrown > 0.02 && Array.from({ length: 10 }).map((_, i) => <Bush key={i} seed={i + 90} scale={overgrown * 1.6} position={[-6 + (i % 5) * 2.4, 0, -6 + Math.floor(i / 5) * 9]} />)}
      {desert > 0.05 && Array.from({ length: 12 }).map((_, i) => { const g = rng(400 + i); return <Rock key={i} seed={i + 5} scale={g.range(0.6, 2.2) * desert} position={[g.range(-30, 25), 0, g.range(-60, 10)]} color="#8A4A2A" />; })}
      <Particles kind="dust" n={120} box={[30, 6, 30]} center={[-4, 2, 0]} time={t} velocity={[1.5, 0.2, 0]} opacity={0.7} />
    </Stage>
  );
};

// ───────────── Finale: 5 Mrd. Jahre später, Roter Riese ─────────────

export const Finale: React.FC<{ shot: ShotInfo; sitAt: number }> = ({ shot, sitAt }) => {
  const { t, local } = useTimes(shot);
  const land = clamp(local / 0.35);
  const dust = clamp(1 - local / 1.4);
  const sitting = t > sitAt;
  const walk = clamp((t - (sitAt - 0.9)) / 0.8);
  const camPos = keys3([{ t: 0, v: [0.6, 1.7, 10.5] }, { t: 4, v: [-3.0, 1.4, 6.2] }], local);
  const look = keys3([{ t: 0, v: [-2.6, 1.3, 3.6] }, { t: 2.0, v: [-5.0, 1.0, 2.6] }, { t: 4, v: [-6.0, 0.9, 1.8] }], local);
  const r = shake(t, Math.max(0, 0.1 - local * 0.12), 18);
  const sunDir: Vec3 = [-70, 14, -60];
  // Max landet neben dem Schild, geht zur Bank, setzt sich
  const maxPos: Vec3 = sitting ? [-6.95, 0.1, 1.5] : [keys(([{ t: 0, v: -2.2 }, { t: 1, v: -6.6 }]), walk), (1 - land) * 3, keys([{ t: 0, v: 4.2 }, { t: 1, v: 1.5 }], walk)];
  const pose: Pose = sitting ? "sit" : walk > 0.02 && walk < 1 ? "walk" : local < 0.4 ? "fall" : "shock";
  const rotY = sitting ? Math.PI / 2 : walk > 0.02 ? -Math.PI / 2 - 0.4 : -0.9;
  return (
    <Stage preset="lava" bg="#5A1A0C" fog={["#A8441C", 40, 900]} sunDir={sunDir} sunIntensity={2.6} shadowSize={16} shadowCenter={[-4, 0, 1]} env={["#7A2A10", "#E0703A", "#3A1408"]} bloom={0.5}>
      <Camera pos={[camPos[0] + r[0], camPos[1] + r[1], camPos[2] + r[2]]} look={look} fov={44} far={60000} />
      <SkyDome top="#3A0E0A" horizon="#E86A2A" bottom="#7A2A10" radius={20000} sun={sunDir} sunColor="#FF8A4A" sunSize={1} haze={1} />
      {/* Roter Riese */}
      <mesh position={[sunDir[0] * 160, sunDir[1] * 160 + 300, sunDir[2] * 160]}>
        <sphereGeometry args={[5200, 48, 24]} />
        <meshBasicMaterial color="#FF6A2A" toneMapped={false} fog={false} />
      </mesh>
      <SunGlow position={[sunDir[0] * 150, sunDir[1] * 150 + 300, sunDir[2] * 150]} size={26000} color="#FF7A3A" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[6000, 6000]} /><Flat color="#9A4A28" roughness={1} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -50]} receiveShadow><planeGeometry args={[9, 400]} /><Flat color="#6E3420" roughness={1} /></mesh>
      {/* Risse im Boden (Glut) */}
      {Array.from({ length: 14 }).map((_, i) => {
        const g = rng(500 + i);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, g.range(0, 3)]} position={[g.range(-40, 30), 0.03, g.range(-80, 8)]}>
            <planeGeometry args={[g.range(4, 14), 0.25]} />
            <Glow color="#FF8A3A" opacity={0.8} additive={false} />
          </mesh>
        );
      })}
      {Array.from({ length: 16 }).map((_, i) => { const g = rng(600 + i); return <Rock key={i} seed={i + 8} scale={g.range(0.5, 2.6)} position={[g.range(-40, 30), 0, g.range(-90, 6)]} color="#6E3420" />; })}
      <BusStop position={[-6.6, 0.1, 1.5]} ruin={1} />
      <Max pose={pose} time={t} position={maxPos} rotationY={rotY} expression={sitting ? "neutral" : "shock"} />
      <Particles kind="embers" n={140} box={[30, 10, 30]} center={[-4, 4, 0]} time={t} velocity={[1.2, 0.8, 0.2]} opacity={0.9} />
      <Particles kind="dust" n={160} box={[8, 2, 8]} center={[-2.2, 0.6, 4.2]} time={t} velocity={[1.2, 0.6, 0.8]} opacity={dust} colors={["#C27A50", "#8A4A2A"]} />
    </Stage>
  );
};

export { colorStops };
