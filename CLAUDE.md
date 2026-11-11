# Sim Studio – Anleitung für Claude Code

Dieses Repo produziert **virale Low-poly-3D-Simulationsvideos** („Was wenn..?“-Format) für TikTok/Shorts.
Der Nutzer gibt **eine Zeile** (Idee/Prämisse). Du lieferst ein **fertiges MP4** – ohne Rückfragen,
außer die Idee ist wirklich unverständlich. Sprache aller Texte im Video: **Deutsch**. Musik fügt der Nutzer selbst hinzu.

Lies vor der ersten Episode einer Session: `REZEPT.md` (warum es funktioniert) und `STIL.md` (wie es aussieht).
Die Beispiel-Episode `src/episodes/aufzug/` ist die Referenz für Aufbau, Dichte und Qualität.

## Technik in einem Satz
Remotion (React → Video) + React Three Fiber (Three.js). Eine Episode = TS-Datei mit HUD-Metrik, Untertiteln
und Shots; jeder Shot rendert eine 3D-Szene aus Bauteilen von `src/three/kit`. Overlays (Hook, HUD, Untertitel,
Grading, Übergänge) macht `src/SimVideo.tsx` automatisch.

```
src/
  types.ts            Episode / HudSpec / Caption / Shot
  SimVideo.tsx        setzt alles zusammen (nicht pro Episode ändern)
  overlay/            Hook, HUD, Untertitel, Grading, Übergänge
  lib/metric.ts       Wachstum (doubling, halving, distanceWithDoublingSpeed, logKeys, freezeAt, solveTime) + Formate (fmtLength, fmtSpeed, fmtDuration, fmtCount)
  lib/anim.ts         keys/keys3 (Keyframes), ease, colorStops, shake
  lib/time.ts         useTimes(shot) → { t, local, p }
  three/Stage.tsx     <Stage preset=…> Canvas + Licht + Nebel, <Camera pos look fov>
  three/kit/          Character (Max, Person, Crowd), Nature, City, Sky, Space, Micro, Interior, Particles
  episodes/<slug>/    index.tsx (Episode), metric.ts, world.tsx (eigene Szenen)
  episodes/index.ts   Registry – neue Episode hier eintragen
```

## Erste Session im Repo
Das Studio wurde ohne Testlauf ausgeliefert. Beim allerersten Mal: `npm install`, `npm run typecheck`,
`npm run preview -- Aufzug`, Bilder ansehen und alles Kaputte (Typfehler, leere/schwarze Bilder, falsche
Kamera, Überbelichtung) selbstständig reparieren, bevor neue Episoden gebaut werden.

## Ablauf bei „/video <Idee>“ (oder jeder Videoidee)

1. **Konzept (im Kopf, kurz ausgeben):** Prämisse als Frage, Format A (Exponential) oder B (Zeitsprung),
   die Regel (z. B. „×2 alle 2 s“), Start im Alltag, Ende im Extremen, **Twist/Pointe** für die letzten 4–6 s.
2. **Zahlen zuerst:** `metric.ts` der Episode schreiben. Meilenstein-Zeiten mit `solveTime()` berechnen
   (oder kurz per `node -e` / Python nachrechnen). Fakten müssen stimmen (Eiffelturm 330 m, Everest 8.849 m,
   ISS 408 km, Schall 343 m/s, Mond 384.400 km, Haar 70 µm, Bakterie 2 µm, Atom 0,1 nm …).
3. **Beat-Sheet:** 25–30 Untertitel, alle 1,5–2,5 s, je ≤ 8 Wörter; 18–24 Shots à 2–4 s; 5 Phasen
   (Alltag → Meilensteine → Wissen → Extrem → Payoff) wie in `REZEPT.md`. Mindestens 3 Perspektiven,
   2 Zoom-out-Momente, Farbwelt wechselt pro Phase. Untertitel-Timing = HUD-Timing (Vergleiche passen zur Zahl).
4. **Szenen bauen:** Kit wiederverwenden. Fehlt etwas (z. B. Vulkan, U-Bahn, Wal), **neues Bauteil** in
   `src/three/kit/` (allgemein wiederverwendbar) oder in `episodes/<slug>/world.tsx` (episodenspezifisch) schreiben.
   Der Kreativität sind keine Grenzen gesetzt – das Kit ist Startpunkt, nicht Grenze.
5. **Registrieren:** in `src/episodes/index.ts` eintragen. `npm run typecheck` muss sauber sein.
6. **Prüfen (Pflicht, nicht überspringen):** `npm run preview -- <Id>` → `out/preview/<Id>/sheet.jpg` mit dem
   Read-Tool **ansehen**. Dann 4–6 Schlüsselmomente in voller Größe: `npm run preview -- <Id> --at 1,10,30,58`.
   Checkliste unten abarbeiten, Fehler fixen, erneut prüfen (meist 2–3 Runden).
7. **Rendern:** `npm run render -- <Id>` → `out/<Id>.mp4`. Danach mit ffprobe Dauer/Auflösung prüfen.
8. **Ausliefern:** MP4 nach `renders/<Id>.mp4` kopieren, committen und pushen (der Nutzer lädt es über GitHub
   herunter, auch am iPad). Dazu Upload-Text aus `episode.upload` + beste Posting-Zeit ausgeben.

## Qualitäts-Checkliste (jede Vorschau dagegen prüfen)

- [ ] Frame 0: Szene läuft schon, Hook gut lesbar, Schlüsselwort in Mint, Figur erkennbar.
- [ ] HUD-Zahl tickt jeden Frame, Einheit wechselt sauber, Vergleiche passen zur Zahl.
- [ ] Kein Shot länger als 4 s, kein Standbild; Kamera bewegt sich immer.
- [ ] Jede Szene hat Tiefe: Vordergrund-Objekt, Mittelgrund (Max), Hintergrund (Himmel/Welt), Partikel.
- [ ] Nichts ist schwarz/leer/abgeschnitten (Far-Plane, Nebel, Objekte hinter der Kamera prüfen).
- [ ] Text nie in Sicherheitszonen (oben 160 px, unten 420 px, rechts 140 px), nie über Max' Gesicht.
- [ ] Farbwelt wechselt über die Phasen, aber jede Szene nutzt nur 3–5 Hauptfarben aus `PALETTE`.
- [ ] Pointe am Ende sitzt; Video endet direkt danach (kein Abspann). Länge 61–65 s.

## Harte Regeln (sonst kaputte Renders)

- **Nie `Math.random()`, `Date.now()`, `useFrame`, `requestAnimationFrame`, `useState` für Animation.**
  Alles ist eine Funktion der Zeit (`useTimes`, `rng(seed)`). Remotion rendert Frames parallel in mehreren Tabs.
- Zeit/Positionen **außerhalb** des Canvas berechnen und als Props an 3D-Komponenten geben.
- Episoden **nicht** als Composition-Props übergeben (Funktionen sind nicht serialisierbar) – Root erledigt das.
- Große Distanzen: Welt um die Kamera herum bewegen („floating origin“), `logDepth` an Stage,
  ab ~15 km in km-Einheiten wechseln (siehe `aufzug/world.tsx`: LowWorld vs. HighWorld).
- Schatten nur in Meter-Szenen; `shadowCenter`/`shadowSize` um die Action legen.
- Geometrien/Texturen mit `useMemo` erzeugen, nicht pro Frame.
- Polygonbudget pro Shot ~300k Dreiecke; viele gleiche Dinge mit `<Instanced>`.
- **Look = stilisierter Realismus** (siehe `STIL.md`): `<Stage>` liefert IBL, AO, Bloom automatisch. Nicht abschalten,
  außer für Tests. `SkyDome` immer mit `sun={sunDir}`. Kein eigenes `useFrame` – die einzige Ausnahme ist `PostFX` (Rendern).
- Nach Änderungen an Stage/Kit/Materialien: `npm run preview -- Testbild --at 1,3,5,7` ansehen (Look-Regression).

## Stil-Regeln
- Hauptfigur ist immer **Max** (`<Max pose=… />`). Nebenfiguren: `<Person seed>` / `<Crowd>`.
- Farben aus `PALETTE`, Licht-Presets aus `Stage` (`day, golden, overcast, night, space, interior, underwater, lava, micro`).
- Untertitel: trocken, knapp, ein bisschen witzig. „…“ verbindet Beats. Zahlen deutsch („1.873 km“, „4,2 m“).
- Hook-Formel: „Was wäre, wenn [Alltag] [Regel]?“ – max. 12 Wörter, 1 Highlight.

## Rendern – Umgebung
- Cloud ohne GPU (Claude Code im Browser): Standard `GL=swangle` (Software). 62 s ≈ 1.900 Frames → mit dem
  realistischen Look (IBL/AO/Bloom) braucht ein Frame etwa 3–7× so lange wie vorher (Vorschau: ~1 s → ~7 s) –
  ein ganzes Video kann mehrere Stunden dauern. Vorher immer `--draft` oder Vorschau nutzen.
- Mit GPU (Mac/PC lokal): `GL=angle npm run render -- <Id>` ist um ein Vielfaches schneller.
- `npm install` meldet Peer-Dependency-Konflikte → `npm install --legacy-peer-deps`; alle `@remotion/*` müssen
  dieselbe Version haben (`npx remotion versions` prüft das).
- Falls Remotion den Headless-Browser nicht laden kann: Netzwerkzugriff der Umgebung auf „Voll“ stellen
  (Claude Code → Environment-Einstellungen) bzw. `npx remotion browser ensure` ausführen.

## Posting-Infos (bei jeder Auslieferung mitgeben)
- Titel/Caption aus `episode.upload`, 3–6 Hashtags, Frage an die Zuschauer als Kommentar-Trigger.
- Beste Zeiten (DE, Erfahrungswerte): Di–Do 18–21 Uhr, Sa/So 11–13 Uhr. Erste Stunde: auf Kommentare antworten.
