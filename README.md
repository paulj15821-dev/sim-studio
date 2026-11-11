# Sim Studio – „Was wenn..?“ 3D-Simulationsvideos aus einem Prompt

Low-poly-3D-Simulationsvideos im Stil viraler „What if“-Kanäle – eigener Look (Maskottchen **Max**, Mint-Akzent,
deutsche Texte), gleiches Prinzip und gleiche Struktur. Alles läuft in **Claude Code**.

## Einrichten (einmalig)
1. Diesen Ordner als eigenes GitHub-Repo hochladen (z. B. `Sim-Studio`).
2. In Claude Code (claude.ai/code) das Repo öffnen. Erste Nachricht: `npm install`
   (Umgebung braucht Internetzugriff für npm und den Headless-Browser von Remotion – ggf. Netzwerk auf „Voll“).
3. Test: `/check Aufzug` – Claude rendert Vorschaubilder der Beispiel-Episode und prüft sie.

## Benutzen
| Befehl | Was passiert |
|---|---|
| `/video du wirst alle 2 Sekunden doppelt so schwer` | komplettes Video: Konzept → Zahlen → 3D-Szenen → Prüfung → MP4 in `renders/` |
| `/ideen Weltall` | 10 neue Prämissen, landen in `IDEEN.md` |
| `/check <Id>` | bestehende Episode prüfen und verbessern |

Fertige Videos liegen danach in `renders/<Id>.mp4` im Repo → auf GitHub öffnen → „Download“.
Musik legst du selbst drunter (CapCut / TikTok-Editor). Wer Musik direkt einbauen will:
Datei nach `public/music/…` und in der Episode `music: { src: "music/datei.mp3" }`.

## Dateien
- `REZEPT.md` – die Analyse: warum diese Videos viral gehen (Hook, HUD, Eskalationsleiter, Pointe)
- `STIL.md` – unser eigener Look
- `CLAUDE.md` – Arbeitsanweisung für Claude Code (Ablauf, Checkliste, technische Regeln)
- `IDEEN.md` – 25 fertige Prämissen zum Loslegen
- `src/episodes/aufzug/` – Beispiel-Episode „Was wäre, wenn dein Aufzug alle 2 Sekunden doppelt so schnell wird?“

## Lokal (optional, mit GPU deutlich schneller)
```bash
npm install
npm run studio                       # Live-Vorschau im Browser
GL=angle npm run render -- Aufzug    # rendert out/Aufzug.mp4
```
