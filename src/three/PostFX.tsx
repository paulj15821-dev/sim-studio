// Realismus-Pipeline für jede <Stage>: Umgebungslicht (IBL) + Nachbearbeitung.
// Alles deterministisch: useFrame wird hier NUR zum Rendern benutzt (Remotion ruft pro Frame
// genau einmal advance() auf), nie für Animation.
import React, { useLayoutEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

/** Ersetzt NaN/Inf-Pixel (z. B. aus Glanz bei extremen Maßstäben) – sonst verschmiert Bloom sie übers ganze Bild. */
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      bool bad = any(isnan(c)) || any(isinf(c)) || any(greaterThan(abs(c), vec4(60000.0)));
      gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : min(c, vec4(64.0));
    }`,
};
import type { Vec3 } from "../lib/anim";

/**
 * Prozedurale Umgebung → PMREM → scene.environment.
 * Gibt allen Standard-Materialien weiches Himmelslicht von oben, Bodenreflex von unten
 * und echte Glanzlichter/Spiegelungen (Glas, Metall, Wasser).
 */
export const Environment: React.FC<{ sky: string; horizon: string; ground: string; sun: string; sunDir: Vec3; intensity?: number; sunStrength?: number }> = ({
  sky, horizon, ground, sun, sunDir, intensity = 1, sunStrength = 18,
}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const tex = useMemo(() => {
    const env = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 48, 24);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const cSky = new THREE.Color(sky), cHor = new THREE.Color(horizon), cGnd = new THREE.Color(ground), cSun = new THREE.Color(sun);
    const sd = new THREE.Vector3(...sunDir).normalize();
    const cols: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const c = v.y >= 0 ? cHor.clone().lerp(cSky, Math.pow(v.y, 0.5)) : cHor.clone().lerp(cGnd, Math.min(1, -v.y * 4));
      // Halo um die Sonne (macht die Lichtrichtung auch im Umgebungslicht spürbar)
      const d = Math.max(0, v.dot(sd));
      c.add(cSun.clone().multiplyScalar(Math.pow(d, 8) * 0.6));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    // heller Sonnenfleck → scharfe Glanzlichter
    const disc = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 8), new THREE.MeshBasicMaterial({ color: cSun.clone().multiplyScalar(sunStrength) }));
    disc.position.copy(sd.clone().multiplyScalar(9));
    env.add(disc);
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(env, 0.02);
    pm.dispose();
    geo.dispose();
    return rt.texture;
  }, [gl, sky, horizon, ground, sun, sunDir[0], sunDir[1], sunDir[2], sunStrength]);
  useLayoutEffect(() => {
    scene.environment = tex;
    (scene as any).environmentIntensity = intensity;
  });
  return null;
};

/**
 * Nachbearbeitung: MSAA-Kantenglättung, GTAO (Kontaktschatten in Ecken/Fugen),
 * Bloom (nur sehr helle Stellen: Sonne, Lampen, Glühen) und korrektes Tone-Mapping.
 * AO wird bei logarithmischem Tiefenpuffer automatisch ausgelassen (liefert dort falsche Werte).
 */
export const PostFX: React.FC<{ ao?: number; aoRadius?: number; bloom?: number; bloomThreshold?: number; logDepth?: boolean }> = ({
  ao = 1, aoRadius = 0.6, bloom = 0.35, bloomThreshold = 0.9, logDepth = false,
}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const composer = useMemo(() => {
    const w = size.width, h = size.height;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, rt);
    c.setPixelRatio(1);
    c.setSize(w, h);
    c.addPass(new RenderPass(scene, camera));
    if (ao > 0 && !logDepth) {
      const g = new GTAOPass(scene, camera, w, h);
      g.updateGtaoMaterial({ radius: aoRadius, distanceExponent: 1.5, thickness: 1.5, scale: ao, samples: 12 });
      g.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      g.blendIntensity = 1;
      c.addPass(g);
    }
    c.addPass(new ShaderPass(SanitizeShader));
    if (bloom > 0) c.addPass(new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), bloom, 0.55, bloomThreshold));
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera, size.width, size.height, ao, aoRadius, bloom, bloomThreshold, logDepth]);
  useLayoutEffect(() => () => composer.dispose(), [composer]);
  useFrame(() => composer.render(), 1);
  return null;
};
