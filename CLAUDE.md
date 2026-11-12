# Sim Studio – Anleitung für Claude Code

Dieses Repo produziert **virale Low-poly-3D-Simulationsvideos** („Was wenn..?“-Format) für TikTok/Shorts.
Der Nutzer gibt **eine Zeile** (Idee/Prämisse). Du lieferst ein **fertiges MP4** – ohne Rückfragen,
außer die Idee ist wirklich unverständlich. Sprache: **Deutsch** (nur Deutsch – keine englische Fassung bauen, außer der Nutzer fragt ausdrücklich). Musik und ggf. Voice-over fügt der Nutzer selbst hinzu –
**Soundeffekte gehören aber in jedes Video** (siehe „Sound-Design“).

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
  audio/sfx.ts        Sound-Bibliothek (SFX-Liste) + automatische Regeln; audio/SoundLayer.tsx spielt sie ab
  episodes/<slug>/    index.tsx (Episode), metric.ts, world.tsx (eigene Szenen)
  episodes/index.ts   Registry – neue Episode hier eintragen
scripts/make-sfx.mjs  synthetisiert alle Sounds nach public/sfx (läuft automatisch bei npm install)
scripts/sfx-mix.ts    schnelle Ton-Vorschau: npm run sfx -- <Id>
```

## Erste Session im Repo
Das Studio wurde ohne Testlauf ausgeliefert. Beim allerersten Mal: `npm install`, `npm run typecheck`,
`npm run preview -- Aufzug`, Bilder ansehen und alles Kaputte (Typfehler, leere/schwarze Bilder, falsche
Kamera, Überbelichtung) selbstständig reparieren, bevor neue Episoden gebaut werden.

## Ablauf bei „/video <Idee>“ (oder jeder Videoidee)

1. **Konzept (im Kopf, kurz ausgeben):** **Standard ist das POV-Format** (`REZEPT.md` §0, Referenz
   `src/episodes/asteroid-pov/`): du-Perspektive, Hände im Bild, Gefahr ab Sekunde 0–1, Befehle, Kapitel-Karten, Rot.
   Prämisse als Frage, Format A (Exponential) oder B (Zeitsprung),
   die Regel (z. B. „×2 alle 2 s“), Start im Alltag, Ende im Extremen, **Twist/Pointe** für die letzten 4–5 s,
   **Cold-Open-Moment** (spektakulärstes Bild des Videos). **Länge aktuell 30–40 s** (siehe REZEPT.md §2/§4).
2. **Zahlen zuerst:** `metric.ts` der Episode schreiben. Meilenstein-Zeiten mit `solveTime()` berechnen
   (oder kurz per `node -e` / Python nachrechnen). Fakten müssen stimmen (Eiffelturm 330 m, Everest 8.849 m,
   ISS 408 km, Schall 343 m/s, Mond 384.400 km, Haar 70 µm, Bakterie 2 µm, Atom 0,1 nm …).
3. **Beat-Sheet:** 14–18 Untertitel, alle 1,5–2,5 s, je ≤ 8 Wörter; 10–14 Shots à 2–3 s; 5 Phasen
   (Alltag max. 3 s → Meilensteine → Wissen → Extrem → Payoff) wie in `REZEPT.md`. Erster Wow-Moment ≤ 3 s.
   `coldOpen: { at, dur: 1.0 }` setzen (Pflicht). POV: `chapters` (alle 3–6 s), `accent: "red"`, Untertitel in der
   du-Form mit Befehlen in Gefahrenmomenten, persönliche Folgen statt Statistik, eine Entscheidung zum Streiten.
   Mindestens 3 Perspektiven,
   2 Zoom-out-Momente, Farbwelt wechselt pro Phase. Untertitel-Timing = HUD-Timing (Vergleiche passen zur Zahl).
4. **Szenen bauen:** Kit wiederverwenden. Fehlt etwas (z. B. Vulkan, U-Bahn, Wal), **neues Bauteil** in
   `src/three/kit/` (allgemein wiederverwendbar) oder in `episodes/<slug>/world.tsx` (episodenspezifisch) schreiben.
   Der Kreativität sind keine Grenzen gesetzt – das Kit ist Startpunkt, nicht Grenze.
4b. **Sound-Design (Pflicht):** Jeder Shot bekommt `ambience` (Atmo passend zur Szene: `amb_city`, `amb_nature`,
   `amb_wind(_strong)`, `amb_space`, `amb_interior`, `amb_night`, `amb_crowd`, `amb_underwater`, `amb_lava`, `fire`,
   `tension`, `muzak`). Jeder sichtbare Moment mit Aktion bekommt einen gezielten Cue in `episode.sfx`
   (Knall, Tür, Schritte, Handy, Einschlag, Riser vor dem Höhepunkt …) – siehe Aufzug/Asteroid als Referenz.
   Automatisch kommen dazu: Whoosh pro Schnitt, Blitz/Einschlag bei `flash`, Sub-Drop bei `dip`, Tick pro
   Verdopplung, Gong pro HUD-Meilenstein, Pop pro Untertitel. Fehlt ein Sound → in `scripts/make-sfx.mjs`
   synthetisieren und in `SFX` (src/audio/sfx.ts) eintragen. **Keine fremden Sounddateien** (Lizenz/Copyright).
4c. **Englisch: nicht machen** (Nutzer bleibt bei Deutsch – spart Zeit/Tokens). Die Technik existiert noch
   (`en`-Block → `<Id>-EN`, `npm run render -- <Id> --lang en`), nur auf ausdrücklichen Wunsch nutzen.
5. **Registrieren:** in `src/episodes/index.ts` eintragen. `npm run typecheck` muss sauber sein.
6. **Prüfen (Pflicht, nicht überspringen):** `npm run preview -- <Id>` → `out/preview/<Id>/sheet.jpg` mit dem
   Read-Tool **ansehen**. Dann 4–6 Schlüsselmomente in voller Größe: `npm run preview -- <Id> --at 1,10,30,58`.
   Checkliste unten abarbeiten, Fehler fixen, erneut prüfen (meist 2–3 Runden).
   **Ton prüfen:** `npm run sfx -- <Id>` → Cue-Liste lesen, `out/<Id>_ton.png` ansehen. Spitze muss ≤ -1 dBFS
   sein, keine „Zu laut bei“-Zeilen (sonst dort Lautstärken senken), Lautheit ca. -20 … -16 LUFS.
7. **Rendern:** `npm run render -- <Id>` → `out/<Id>.mp4`. Danach mit ffprobe Dauer/Auflösung/Ton prüfen.
8. **Ausliefern:** MP4 nach `renders/<Id>.mp4` kopieren, committen und pushen (der Nutzer lädt es über GitHub
   herunter, auch am iPad). Dazu Upload-Text aus `episode.upload` + beste Posting-Zeiten ausgeben.

## Qualitäts-Checkliste (jede Vorschau dagegen prüfen)

- [ ] Frame 0 = Cold Open: bedrohlichster Moment aus DEINER Sicht + fetter Hook, Schlüsselwort rot. In Sekunde 0–1
      passiert schon etwas (Alarm, Verschwinden, Riss) – kein Anlauf.
- [ ] POV: Ego-Kamera mit Händen im Bild (`EgoRig`), Kapitel-Karten, Befehle („Lauf!“), Max als Begleiter neben dir.
- [ ] HUD-Zahl tickt jeden Frame, Einheit wechselt sauber, Vergleiche passen zur Zahl.
- [ ] Kein Shot länger als 4 s, kein Standbild; Kamera bewegt sich immer.
- [ ] Jede Szene hat Tiefe: Vordergrund-Objekt, Mittelgrund (Max), Hintergrund (Himmel/Welt), Partikel.
- [ ] Nichts ist schwarz/leer/abgeschnitten (Far-Plane, Nebel, Objekte hinter der Kamera prüfen).
- [ ] Text nie in Sicherheitszonen (oben 160 px, unten 420 px, rechts 140 px), nie über Max' Gesicht.
- [ ] Farbwelt wechselt über die Phasen, aber jede Szene nutzt nur 3–5 Hauptfarben aus `PALETTE`.
- [ ] Ton: jede Szene hat Atmo, jede Aktion ihren Sound, Höhepunkt am lautesten, Spitze ≤ -1 dBFS.
- [ ] Pointe am Ende sitzt; Video endet direkt danach (kein Abspann). Länge 30–40 s inkl. Cold Open
      (später, im Creator-Programm: 61–65 s).

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
- Bereits gerendertes Video nachträglich vertonen (ohne Neu-Render): Video nach `out/<Id>.mp4`, dann
  `npm run sfx -- <Id> --mux` → `out/<Id>_mit_ton.mp4`.
- Nach Änderungen an Stage/Kit/Materialien: `npm run preview -- Testbild --at 1,3,5,7` ansehen (Look-Regression).

## Stil-Regeln
- Hauptfigur ist **du** (Ego-Kamera + `EgoRig`); **Max** ist immer dabei als dein Freund/Bruder neben dir.
  Nebenfiguren: `<Person seed>` / `<Crowd>`. (Altes Format „Max von außen“ nur noch, wenn die Idee es verlangt.)
- Farben aus `PALETTE`, Licht-Presets aus `Stage` (`day, golden, overcast, night, space, interior, underwater, lava, micro`).
- Untertitel: du-Form, knapp, ein Bild pro Zeile („Dein Vater ist weg. Sein Hemd hängt noch im Gurt.“), Befehle
  in Gefahr, trockener Humor zwischendurch. „…“ verbindet Beats. Zahlen deutsch („1.873 km“, „4,2 m“).
- Hook-Formel: „Was wäre, wenn [Ereignis] [heute/jetzt]?“ oder „POV: [Ereignis]“ – max. 12 Wörter, 1 Highlight (rot).

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
- Titel/Caption aus `episode.upload`, 3–6 Hashtags, Frage an die Zuschauer als Kommentar-Trigger – kopierfertig.
- Posting-Zeiten (deutsche Zeit): Mo–Fr 7:30 · 12:30 · 16:30 · 19:00 – Sa/So 10:00 · 13:00 · 17:00 · 20:30.
  Nur 1–2 Posts/Tag: 12:30 + 19:00. ≥ 3 h Abstand. Erste Stunde nach dem Posten: auf Kommentare antworten.
