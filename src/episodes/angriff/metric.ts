import { logKeys, solveTime } from "../../lib/metric";

// „Was wäre, wenn Deutschland angegriffen wird?“ – Format B (Zeit seit dem Alarm).
// Fakten (Stand 2025/26):
//  Warnung: Cell Broadcast, Warnstufe „Extreme Gefahr“; Sirene: 1 Minute auf- und abschwellender Heulton
//  Öffentliche Schutzräume (BBK-Bestandsaufnahme): 579 mit rund 478.000 Plätzen
//  84 Mio. Einwohner / 478.000 Plätze ≈ 176  → nur jeder 176. hat einen Platz
//  BBK-Rat bei Luftangriff: Keller oder innenliegender Raum, weg von Fenstern
//  Verteidigungsfall (Art. 115a GG): Bundestag mit 2/3-Mehrheit (+ Bundesrat)
//  Art. 115b GG: Befehls- und Kommandogewalt geht auf den Bundeskanzler über
//  NATO-Vertrag Art. 5: Angriff auf einen = Angriff auf alle; 32 Mitglieder
//  BBK-Empfehlung Notvorrat: 10 Tage
//  Wehrpflicht: seit 2011 ausgesetzt, lebt im Spannungs-/Verteidigungsfall wieder auf (Männer, 18–60)

/** Alarm um 03:12 Uhr nachts (Sekunden nach Mitternacht) */
export const ALARM_CLOCK = 3 * 3600 + 12 * 60;

/** Echte Sekunden seit dem Alarm (Videozeit → Echtzeit) */
export const SINCE = logKeys([
  { t: 0, v: 0 },
  { t: 2.6, v: 40 },
  { t: 5.0, v: 95 }, // Sirenen laufen
  { t: 6.4, v: 240 }, // 4 Min.: Abfangen
  { t: 7.8, v: 330 },
  { t: 10.4, v: 540 },
  { t: 13.0, v: 780 },
  { t: 15.2, v: 1_200 }, // 20 Min.: im Keller
  { t: 15.6, v: 17_400 }, // Zeitsprung → 08:02 Uhr
  { t: 18.2, v: 21_600 },
  { t: 20.6, v: 25_200 },
  { t: 23.4, v: 108_000 }, // Tag 2, 09:12 Uhr: Artikel 5
  { t: 26.0, v: 115_000 },
  { t: 28.6, v: 126_000 },
  { t: 31.0, v: 190_000 }, // Tag 3, ~08:00 Uhr: Post
  { t: 36, v: 192_000 },
]);

/** Uhrzeit (Sekunden nach Mitternacht) */
export const CLOCK = (t: number) => (ALARM_CLOCK + SINCE(t)) % 86_400;
/** Tag seit dem Alarm (1, 2, 3 …) */
export const DAY = (t: number) => Math.floor((ALARM_CLOCK + SINCE(t)) / 86_400) + 1;

export const at = (s: number) => solveTime(SINCE, s, 0, 36);

const two = (n: number) => String(Math.floor(n)).padStart(2, "0");
/** +00:04:12 – Stunden laufen über 24 hinaus (+54:12:00) */
export const fmtSince = (s: number) => `+${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}`;
/** 03:12 Uhr */
export const fmtClock = (s: number) => `${two(s / 3600)}:${two((s % 3600) / 60)} Uhr`;
