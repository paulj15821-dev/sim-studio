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

## Grading
Leichte Vignette + feines Korn über allem (`<Grade>`), wärmt flache 3D-Renderings an.
