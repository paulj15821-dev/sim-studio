// LOOK-TEST – keine echte Episode. Zeigt den Render-Look (Licht, Materialien, Nachbearbeitung)
// in vier Stimmungen à 2 s. Nach Änderungen an Stage/Kit: `npm run preview -- Testbild --at 1,3,5,7`.
import React from "react";
import type { Episode, ShotInfo } from "../../types";
import { useTimes } from "../../lib/time";
import { keys3, type Vec3 } from "../../lib/anim";
import { PALETTE } from "../../style/theme";
import {
  Stage, Camera, Max, Person, Car, Road, Building, CityGrid, Tree, Bush, Ground, House, StreetLamp, Forest,
  SkyDome, Stars, Earth, Moon, SunGlow, SpaceStation, Particles,
} from "../../three/kit";

const cam = (p: number, a: Vec3, b: Vec3, la: Vec3, lb: Vec3) => ({ pos: keys3([{ t: 0, v: a }, { t: 1, v: b }], p), look: keys3([{ t: 0, v: la }, { t: 1, v: lb }], p) });

/** Tag: Straßenszene (Meter, AO + Schatten aktiv) */
const Street: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, p } = useTimes(shot);
  const c = cam(p, [5.5, 1.5, 7.5], [4.6, 1.6, 6.4], [0, 1.2, 0], [0, 1.3, 0]);
  const sun: Vec3 = [40, 55, 25];
  return (
    <Stage preset="day" sunDir={sun} shadowSize={30} shadowCenter={[0, 0, -4]}>
      <Camera pos={c.pos} look={c.look} fov={42} far={4000} />
      <SkyDome top="#4F8FDB" horizon="#D3E5F2" radius={3000} sun={sun} />
      <Ground color={PALETTE.grass} size={3000} y={-0.02} />
      <Road length={400} width={9} position={[0, 0, -7]} rotationY={Math.PI / 2} />
      <Building position={[-9, 0, -20]} size={[14, 22.4, 10]} seed={3} />
      <Building position={[7, 0, -21]} size={[12, 16, 10]} seed={8} />
      <Building position={[22, 0, -22]} size={[14, 28.8, 12]} seed={12} />
      <Building position={[-25, 0, -22]} size={[12, 12.8, 10]} seed={15} />
      {[-14, -4, 12, 18].map((x, i) => <Tree key={i} position={[x, 0, -12.5]} seed={i + 2} scale={1.3} />)}
      <Bush position={[-2.5, 0, 2]} seed={4} />
      <Bush position={[3.5, 0, -1]} seed={9} scale={0.8} />
      <StreetLamp position={[2.2, 0, -11.5]} />
      <Car seed={2} position={[-30 + t * 9, 0, -8.6]} rotationY={Math.PI / 2} wheelSpin={t * 8} />
      <Car seed={5} position={[18 - t * 7, 0, -5.4]} rotationY={-Math.PI / 2} wheelSpin={-t * 7} />
      <Max pose="walk" time={t} position={[-1.2 + t * 0.6, 0, 0.2]} rotationY={Math.PI / 2 - 0.4} expression="happy" />
      <Person seed={11} pose="idle" time={t} position={[1.8, 0, -1.6]} rotationY={-0.6} />
    </Stage>
  );
};

/** Abendsonne: Vorstadt, lange Schatten */
const Golden: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, p } = useTimes(shot);
  const c = cam(p, [-6, 1.2, 6], [-4.8, 1.3, 5.4], [1, 1.4, -2], [1, 1.5, -2]);
  const sun: Vec3 = [-50, 14, 40];
  return (
    <Stage preset="golden" sunDir={sun} shadowSize={28} shadowCenter={[0, 0, -4]}>
      <Camera pos={c.pos} look={c.look} fov={44} far={4000} />
      <SkyDome top="#5B78B5" horizon="#F7BE8A" radius={3000} sun={sun} sunColor="#FFC98E" sunSize={2} />
      <Ground color={PALETTE.grassDark} size={3000} y={-0.02} />
      <House position={[6, 0, -10]} rotationY={-0.3} seed={2} />
      <House position={[-8, 0, -16]} rotationY={0.2} seed={5} />
      <Forest n={40} area={[120, 50]} center={[0, 0, -45]} seed={3} />
      {[[-3, -4], [9, -2], [-12, -6]].map(([x, z], i) => <Tree key={i} position={[x, 0, z]} seed={i + 20} scale={1.4} />)}
      <Max pose="wave" time={t} position={[0.5, 0, -1]} rotationY={-0.7} expression="happy" />
      <Particles kind="dust" n={60} box={[8, 3, 8]} center={[0, 1.5, -1]} time={t} velocity={[0.15, 0.05, 0.1]} opacity={0.5} colors={["#FFE2B0"]} />
    </Stage>
  );
};

/** Nacht: Stadt mit beleuchteten Fenstern, Bloom */
const Night: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, p } = useTimes(shot);
  const c = cam(p, [12, 2.0, 20], [10, 2.6, 17], [0, 6, -10], [0, 8, -12]);
  return (
    <Stage preset="night" shadowSize={40} shadowCenter={[0, 0, 0]}>
      <Camera pos={c.pos} look={c.look} fov={50} far={6000} />
      <SkyDome top="#050A1E" horizon="#1E2A52" radius={4000} />
      <Stars n={1500} radius={3500} />
      <Ground color="#20242C" size={4000} y={-0.05} />
      <CityGrid blocks={5} blockSize={50} seed={6} lit heights={[14, 60]} clear={18} />
      {[-6, 6].map((x) => [0, 12, 24].map((z) => <StreetLamp key={`${x}${z}`} position={[x, 0, z]} on />))}
      {[-6, 6].map((x) => [0, 12, 24].map((z) => <pointLight key={`l${x}${z}`} position={[x + 0.2, 4.8, z]} intensity={18} distance={14} decay={2} color="#FFD58A" />))}
      <Max pose="lookUp" time={t} position={[7, 0, 9]} rotationY={Math.PI + 0.6} />
    </Stage>
  );
};

/** Orbit: Erde, Mond, Station */
const Orbit: React.FC<{ shot: ShotInfo }> = ({ shot }) => {
  const { t, p } = useTimes(shot);
  const R = 6371;
  // km-Welt; Kamera 900 km über der Oberfläche, schaut über den Horizont
  const pos = keys3([{ t: 0, v: [0, 2600, 5200] }, { t: 1, v: [500, 2400, 4700] }], p);
  return (
    <Stage preset="space" sunDir={[1, 0.35, -0.4]} shadows={false} logDepth>
      <Camera pos={pos} look={[0, -2600, -2500]} fov={45} near={0.01} far={3_000_000} />
      <Stars n={3000} radius={1_000_000} />
      <SunGlow position={[600000, 210000, -240000]} size={60000} />
      <Earth radius={R} position={[0, -R, 0]} rotationY={0.6 + t * 0.02} tilt={1.15} />
      <Moon radius={1737} position={[-150000, 60000, -340000]} />
      <SpaceStation position={[pos[0] + 0.03, pos[1] - 0.06, pos[2] - 0.2]} rotation={[0.5, 0.9 + t * 0.15, 0.25]} scale={0.0011} />
    </Stage>
  );
};

export const testbild: Episode = {
  id: "Testbild",
  title: "Look-Test",
  duration: 8,
  hook: { text: "Look-Test: Licht, Material, Atmosphäre", highlight: ["Look-Test:"], until: 1.6 },
  captions: [
    { at: 0.2, text: "Tag" },
    { at: 2.1, text: "Abendsonne" },
    { at: 4.1, text: "Nacht" },
    { at: 6.1, text: "Orbit" },
  ],
  shots: [
    { at: 0, name: "Tag", render: (s) => <Street shot={s} /> },
    { at: 2, name: "Abendsonne", render: (s) => <Golden shot={s} /> },
    { at: 4, name: "Nacht", render: (s) => <Night shot={s} /> },
    { at: 6, name: "Orbit", render: (s) => <Orbit shot={s} /> },
  ],
};
