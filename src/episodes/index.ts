// Alle Episoden. Neue Episode: Ordner unter src/episodes/<slug>/ anlegen und hier eintragen.
import type { Episode } from "../types";
import { aufzug } from "./aufzug";
import { asteroid } from "./asteroid";
import { koma } from "./koma";
import { verschwinden } from "./verschwinden";
import { wachsen } from "./wachsen";
import { atombombe } from "./atombombe";
import { maenner } from "./maenner";
import { angriff } from "./angriff";
import { beschleunigen } from "./beschleunigen";
import { asteroidPov } from "./asteroid-pov";
import { schrumpfen } from "./schrumpfen";
import { testbild } from "./testbild";

export const EPISODES: Episode[] = [
  aufzug,
  asteroid,
  koma,
  verschwinden,
  wachsen,
  atombombe,
  maenner,
  angriff,
  beschleunigen,
  asteroidPov,
  schrumpfen,
  testbild, // Look-Test, keine Episode zum Posten
];
