# Das Rezept – warum diese Videos viral gehen

Abgeleitet aus 7 viralen Videos von @ifinity3d und @reality.simulated
(Graben, Springen, Schrumpfen ×2, Auto beschleunigt, Koma, alle verschwinden).
Alle sind **64–65 s lang**, 9:16, low-poly 3D, **keine Stimme** – nur Text + Musik.

---

## 1. Die Prämisse (die halbe Miete)

**„Was wäre, wenn [alltägliche Handlung] + [eine einzige Regel, die eskaliert]?"**

| Video | Handlung | Regel |
|---|---|---|
| Graben | du gräbst ein Loch | 2× schneller alle 2 s |
| Springen | du springst | jeder Sprung doppelt so hoch |
| Schrumpfen | du gehst spazieren | halb so groß alle 2 s |
| Auto | du fährst | Tempo verdoppelt sich alle 2 s |
| Koma | Fahrradunfall | Zeit springt (Tage → Jahre) |
| Alle weg | Stadt mit Freundin | 8 Mrd. Menschen verschwinden |

Zwei Formate:

- **A – Exponential-Simulation** (ifinity3d-Schwerpunkt): eine Zahl verdoppelt/halbiert sich
  im festen Takt. Der Zuschauer *weiß*, dass es eskaliert, und bleibt, um zu sehen, **wo es endet**.
- **B – Zeitsprung-Leben** (reality.simulated-Schwerpunkt): ein Zähler (Tage, Jahre, Menschen)
  läuft, die Welt verändert sich, am Ende ein **emotionaler oder witziger Twist**.

Gute Prämissen sind in **einem Satz** verständlich, starten **im Alltag** und enden **im Extremen**
(Erdkern, Weltall, Atome, Lichtgeschwindigkeit, Jahrzehnte).

## 2. Der Hook (Sekunde 0–3) – wichtigster Teil des Videos

**Eigene Zahlen (12.11., Aufzug + 2. Video):** 98 % der Aufrufe kommen aus „Für dich“, aber **~25 % sind nach
1 s weg, ~50 % nach 5 s**. Wer die ersten Sekunden übersteht, schaut lange. → Der Einstieg entscheidet alles.

- **Cold Open (Pflicht):** `coldOpen: { at: <Sekunde des Höhepunkts>, dur: 1.0 }` – Bild 0 zeigt das
  Spektakulärste des Videos (Einschlag, Mond, Erdkern …), dann Rückspul-Blitz und Start von vorn.
  Der Zuschauer sieht sofort, *wohin* es geht, und bleibt, um zu sehen *wie*.
- **Hook-Text** (macht `<Hook>` automatisch): fette Inter auf dunklen Textkästen, ab Bild 0 voll sichtbar
  (Bild 0 ist das Vorschaubild beim Scrollen). Max. 12 Wörter, **ein** Schlüsselwort in Mint.
- **Max groß** und in Bewegung in den ersten Sekunden – keine fremden Figuren im Vordergrund, kein Weitwinkel-Grau.
- **Erster Wow-Moment spätestens bei Sekunde 3** (nach dem Cold Open). Die Regel startet sofort, nicht nach
  5 s Alltag. Lieber höherer Startwert / schnellerer Takt als langsames Anlaufen.
- **Ton ab Bild 0**: Schlag + Atmo des Höhepunkts (kommt automatisch mit dem Cold Open).
- Ab Frame 1 tickt der Zähler. Bewegung + Zahl + Frage = Daumen stoppt.

## 3. Das HUD (das Markenzeichen)

Links auf halber Höhe, dauerhaft sichtbar:

```
DISTANZ GEGRABEN        ← kleines Label, Versalien, gesperrt
1.873 km                ← große Serifenzahl, tickt JEDEN Frame
SCHNELLER ALS EIN ICE   ← Vergleich, wechselt bei Meilensteinen
● ×2 IN 1,4 S           ← Countdown bis zur nächsten Verdopplung
```

- Einheit wechselt automatisch (cm → m → km; mm → µm → nm; km/h → % Lichtgeschw.).
- < 10: eine Nachkommastelle, ab 10 ganze Zahlen, ab 1000 nächste Einheit.
- Die ständig laufende Zahl ist der **Retention-Motor**: es passiert immer etwas.

## 4. Die Eskalationsleiter (der eigentliche Plot)

**Aktuell 30–40 s** (Wachstumsphase, höhere Durchschau-Quote). ~14–18 Beats à 2 s.
Jeder Beat = **neue Welt / neuer Vergleich**. Struktur (Zeiten ohne Cold Open):

1. **Alltag** (0–3 s): kurz! Max groß, Regel startet sofort.
2. **Bekannte Meilensteine** (3–12 s): Eiffelturm, Wolken, U-Bahn …
3. **Wissen/Staunen** (12–22 s): Schallmauer, Erdkrümmung, ISS …
4. **Extrem** (22–30 s): Mond, Erdkern, Atome, Lichtgeschwindigkeit.
5. **Payoff/Twist** (letzte 4–5 s): Pointe, Callback an den Anfang.

Später (ab Creator-Programm) wieder 61–65 s mit ~25 Beats; Phasen dann 0–5 / 5–20 / 20–40 / 40–56 / 56–64 s.

Regeln:
- **Echte Zahlen.** Meilensteine stimmen mit dem HUD überein (Eiffelturm erscheint, wenn HUD 330 m zeigt).
- **Farbwelt wechselt pro Phase** (grün → grau → braun → orange → blau → schwarz).
- **Zoom-out-Momente** als Atempause („Zoomen wir raus.“ → Erdquerschnitt, Planet, Stadt von oben).
- Kein Abspann, kein Call-to-Action. Das Video **endet abrupt nach der Pointe** → Rewatch + Kommentare.

## 5. Die Untertitel

- Mittig, ca. 58 % Bildhöhe, fette Inter, weiß mit kräftigem Schatten (aufs Handy optimiert), 1–2 Zeilen,
  **max. ~8 Wörter**. Kursiv (`italic: true`) = Serifen-Pointe.
- Wechsel alle 2–3 s, oft mit „…“ über zwei Beats gezogen („Und es verdoppelt sich…“ / „…immer weiter.“).
- Ton: trocken, knapp, leicht witzig. Fakten + Reaktion („Seine Schaufel glüht.“).

## 6. Der Look

- Low-poly, flat shading, weiches Sonnenlicht, weiche Schatten, leichter Nebel/Dunst.
- Gesättigt-pastellige Palette, wenige Farben pro Szene.
- Einfache Figuren (blockig oder simpel-gerigged), immer **dieselbe Hauptfigur** (Wiedererkennung).
- Kamera immer in Bewegung (Dolly, Orbit, Follow), nah an der Figur, mit Perspektivwechseln
  (Ego-Sicht, Drohne, Froschperspektive). Partikel überall: Staub, Funken, Blasen, Trümmer.

## 7. Plattform-Fakten

- **Länge aktuell 30–40 s** (Wachstum: Durchschau-Quote zählt). Sobald der Kanal im Creator-Programm ist:
  61–65 s (über 1 Minute ist Voraussetzung für TikTok Creator Rewards). YouTube Shorts bis 3 min ok.
- Ohne Voiceover international verständlich; Musik: ruhig-episch/ambient, wird von dir hinzugefügt.
- Sicherheitszonen: oben 160 px, unten 420 px, rechts 140 px frei lassen (TikTok-UI).

---

## Unser Dreh (nicht 1:1)

Prinzip und Qualität identisch – das Erscheinungsbild ist eigenständig. Details in `STIL.md`:

- **Eigenes Maskottchen „Max“** (gelbe Mütze, grüner Hoodie) statt Anzugmann/Blockmann.
- **Akzentfarbe Mint** statt Orange, andere Schriften (Instrument Serif + Inter).
- **HUD mit Größenordnungs-Leiste** (wie viele Zehnerpotenzen schon geschafft) – eigenes Erkennungsmerkmal.
- **Deutsch**, Zahlen im deutschen Format (1.873 km, 4,2 m).
