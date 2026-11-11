// Alle Episoden. Neue Episode: Ordner unter src/episodes/<slug>/ anlegen und hier eintragen.
import type { Episode } from "../types";
import { aufzug } from "./aufzug";
import { testbild } from "./testbild";

export const EPISODES: Episode[] = [
  aufzug,
  testbild, // Look-Test, keine Episode zum Posten
];
