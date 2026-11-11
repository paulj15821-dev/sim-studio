# Stil-Guide „Was wenn..?“ – Sim-Format

Alles hier ist in `src/style/theme.ts` als Code hinterlegt. Änderst du dort etwas, ändert sich jedes Video.

## Format
- 1080 × 1920, 30 fps, 61–65 s, H.264 (CRF 18). Kein Ton (Musik fügst du selbst hinzu).

## Schrift
- **Instrument Serif** – Hook, Untertitel, HUD-Zahl.
- **Inter** (600, Versalien, Sperrung 0.14em) – HUD-Labels und Pillen.

## Farben
| Rolle | Wert |
|---|---|
| Akzent (Hook-Wort, Pille, Leiste) | `#6FF2D0` Mint |
| Text | `#FFFFFF` mit Schatten `0 2px 12px rgba(0,0,0,.45)` |
| Warnung/Extrem | `#FF6B5B` |

3D-Paletten (flat shading, leicht pastellig): siehe `PALETTE` in `theme.ts`
(Gras, Asphalt, Fassaden, Haut, Wolken, Erde, Lava, Wasser, Mikrowelt …).

## Layout (Sicherheitszonen beachten)
- **Hook**: oben mittig, y ≈ 300 px, 76 px, 2 Zeilen, Schlüsselwort in Mint. Nur 0–2,6 s.
- **HUD**: links, x = 70 px, y ≈ 650 px. Label 24 px → Zahl 96 px → Vergleich 22 px → Pille → Leiste.
- **Untertitel**: mittig, y ≈ 1120 px, 58 px, max. 2 Zeilen, Breite ≤ 820 px.
- Unten 420 px und rechts 140 px frei.

## Maskottchen „Max“
Blockiger Low-poly-Typ: gelbe Mütze, grüner Hoodie, blaue Jeans, weiße Sneaker, große dunkle Augen.
Posen: `idle, walk, run, wave, lookUp, press, sit, fall, shock, dig, swim, float`.
Jede Episode nutzt Max als Hauptfigur (Wiedererkennung). Nebenfiguren via `<Person>` mit Farbvarianten.

## Kamera & Schnitt
- Kamera bewegt sich **immer** (min. langsamer Dolly). Brennweite fov 35–55.
- Ein Shot = 2–4 s. Harte Schnitte als Standard, `flash` für Knall-Momente, `dip` für Zeitsprünge.
- Pro Episode mind. 3 Perspektiven: nah/Follow, Drohne/Weit, Ego oder Froschperspektive.

## Look: „stilisierter Realismus“
Formen bleiben blockig/low-poly (Wiedererkennung, Max), **Licht und Material sind realistisch**.
Das macht `<Stage>` automatisch (abschaltbar mit `realism={false}`):
- **Umgebungslicht (IBL)** pro Preset: weiches Himmelslicht, Bodenreflex, echte Spiegelungen in Glas/Metall/Wasser.
- **Nachbearbeitung** (`src/three/PostFX.tsx`): MSAA, Ambient Occlusion (Kontaktschatten, nur ohne `logDepth`),
  Bloom für sehr helle Stellen (Sonne, Lampen, Fenster bei Nacht), ACES-Tonemapping.
- **Schatten** 4096er-Map – `shadowCenter`/`shadowSize` eng um die Action legen.

Bauteile:
- `Box` hat leicht gerundete Kanten (`bevel`, Standard 0,12) → fängt Glanzlichter. Für sehr lange/dünne Teile `bevel={0}`.
- `Glass` = physikalisches Glas (Fresnel-Spiegelung). `Building`-Fassaden: Rahmen, Jalousien, spiegelnde Scheiben; `lit` = Nachtfenster.
- `SkyDome sun={sunDir}` zeichnet Sonnenscheibe + Lichthof + Horizontdunst – immer dieselbe Richtung wie `sunDir` der Stage.
- `Earth`/`Moon` sind prozedural im Shader (scharf in jeder Entfernung). Ozean glänzt, Wüsten/Wälder/Eis nach Breite.
  `tilt` so wählen, dass unter der Kamera nicht der Pol liegt (~0,9–1,2 bei Blick von oben). `lowpoly` = alter Look.
- Nachts: echte `pointLight`s an Laternen (intensity ~18, distance ~14) – Bloom macht den Rest.

Faustregeln: Sonne nie frontal hinter der Kamera (flach) – lieber seitlich/Gegenlicht. Abendsonne flach (y klein).
Glanz kommt aus `roughness` (0,3–0,5 für Lack/Plastik/Metall), nicht aus Farbe. Look prüfen: `npm run preview -- Testbild --at 1,3,5,7`.

## Grading
Leichte Vignette + feines Korn über allem (`<Grade>`), wärmt flache 3D-Renderings an.
