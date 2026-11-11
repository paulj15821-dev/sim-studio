import type { ReactNode } from "react";

/** Eine HUD-Anzeige (links). Mehrere Zeilen möglich (z. B. Höhe + Tempo). */
export type HudSpec = {
  /** Kleines Label in Versalien, z. B. "HÖHE" */
  label: string;
  /** Wert zum Zeitpunkt t (Sekunden seit Videostart) in Basiseinheit */
  value: (t: number) => number;
  /** Formatierung des Werts, z. B. fmtLength */
  format: (v: number) => string;
  /** Vergleichszeilen: die letzte erreichte wird angezeigt. `at` = Wert (nicht Zeit). */
  compare?: { at: number; text: string }[];
  /** "down" = Wert fällt (Countdown, Abstand): angezeigt wird die zuletzt unterschrittene Schwelle. Standard "up". */
  compareDir?: "up" | "down";
  /** Pille mit Countdown bis zur nächsten Verdopplung */
  pill?: { every: number; text: (secondsLeft: string) => string; startAt?: number; stopAt?: number };
  /** Zweite, kleine Kennzahl unter der Pille (z. B. Tempo) */
  secondary?: { label: string; value: (t: number) => number; format: (v: number) => string };
  /** Größenordnungs-Leiste: von → bis (Basiseinheit) */
  scaleBar?: { from: number; to: number };
  /** HUD erst ab / bis Sekunde x zeigen */
  from?: number;
  until?: number;
};

export type Caption = {
  at: number; // Sekunde
  text: string;
  /** Wörter in Akzentfarbe */
  highlight?: string[];
  /** Anzeigedauer; Standard: bis zur nächsten Caption */
  dur?: number;
  italic?: boolean;
};

export type Transition = "cut" | "flash" | "dip" | "whip";

/** Start/Ende des Shots in Sekunden (global). An Szenen als Prop `shot` durchreichen. */
export type ShotInfo = { start: number; end: number };

export type Shot = {
  at: number; // Startsekunde, Shot läuft bis zum nächsten
  /** Die Szene. Gib `shot` an deine Szene weiter: render: (s) => <MeineSzene shot={s} /> */
  render: (shot: ShotInfo) => ReactNode;
  transition?: Transition;
  /** Name für Logs/Vorschau */
  name?: string;
};

export type Episode = {
  id: string; // Composition-ID, nur [A-Za-z0-9-]
  title: string; // für Upload-Text
  duration: number; // Sekunden (61–65 empfohlen)
  hook: { text: string; highlight?: string[]; until?: number };
  /** Ein HUD oder mehrere nacheinander (mit from/until, z. B. Countdown → Zeit danach) */
  hud?: HudSpec | HudSpec[];
  captions: Caption[];
  shots: Shot[];
  /** Optional: Musik-/SFX-Datei in public/, z. B. "music/epic.mp3" */
  music?: { src: string; volume?: number };
  /** Upload-Infos (werden von /video mit ausgegeben) */
  upload?: { caption: string; hashtags: string[] };
};
