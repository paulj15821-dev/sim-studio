// Alle Episoden. Neue Episode: Ordner unter src/episodes/<slug>/ anlegen und hier eintragen.
import type { Episode } from "../types";
import { aufzug } from "./aufzug";
import { asteroid } from "./asteroid";
import { koma } from "./koma";
import { verschwinden } from "./verschwinden";
import { wachsen } from "./wachsen";
import { maenner } from "./maenner";
import { testbild } from "./testbild";

export const EPISODES: Episode[] = [
  aufzug,
  asteroid,
  koma,
  verschwinden,
  wachsen,
  maenner,
  testbild, // Look-Test, keine Episode zum Posten
];
