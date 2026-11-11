import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";

const serif = loadSerif("normal", { weights: ["400"], subsets: ["latin"] });
const serifItalic = loadSerif("italic", { weights: ["400"], subsets: ["latin"] });
const sans = loadSans("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });

export const FONT = {
  serif: serif.fontFamily,
  serifItalic: serifItalic.fontFamily,
  sans: sans.fontFamily,
};

export const VIDEO = { width: 1080, height: 1920, fps: 30 };

export const COLOR = {
  accent: "#6FF2D0",
  warn: "#FF6B5B",
  text: "#FFFFFF",
  shadow: "0 2px 12px rgba(0,0,0,0.45), 0 0 2px rgba(0,0,0,0.35)",
};

/** Layout in Pixeln (1080x1920), Sicherheitszonen von TikTok/Shorts berücksichtigt. */
export const LAYOUT = {
  hookY: 300,
  hudX: 70,
  hudY: 650,
  captionY: 1120,
  captionMaxW: 820,
};

/** 3D-Palette – flat shaded, leicht pastellig. Nimm Farben von hier statt frei zu erfinden. */
export const PALETTE = {
  // Natur
  grass: "#7CC46B",
  grassDark: "#5FA457",
  leaf: ["#6DBE5A", "#4FA35A", "#8BCF63", "#3E8E55"],
  trunk: "#8A5A3B",
  rock: ["#B9B2A6", "#9C968C", "#D2CBBE"],
  dirt: "#9A6B47",
  sand: "#E6D3A3",
  snow: "#F4F7FA",
  water: "#3FA7D6",
  waterDeep: "#1F5F8B",
  // Stadt
  asphalt: "#4A4F5A",
  sidewalk: "#C9C4BA",
  roadLine: "#F2F0E6",
  facade: ["#E8DCC8", "#D9B99B", "#C97B5B", "#9FB4C7", "#F2E6D0", "#B7C9A8", "#E3C7A1"],
  glass: "#9CD3F0",
  roof: ["#7A6F66", "#8E5A4A", "#5E6B78"],
  car: ["#E2473F", "#F2C14E", "#3D7DD8", "#F4F4F4", "#2F3B4C", "#58B06C"],
  metal: "#8B95A1",
  steel: "#3B434D",
  // Figuren
  skin: ["#F1C7A0", "#D9A37A", "#A8714D", "#7A4E33"],
  hair: ["#3A2A20", "#6B4428", "#C9A15B", "#1E1E1E"],
  shirt: ["#E2473F", "#F2C14E", "#3D7DD8", "#F4F4F4", "#9A5FD0", "#58B06C", "#FF8A3D"],
  pants: ["#3E5C8A", "#2F3B4C", "#7A6F66", "#C9C4BA"],
  // Max (Maskottchen)
  max: { beanie: "#FFD23F", hoodie: "#3FAE6B", pants: "#3E5C8A", shoes: "#F4F4F4", skin: "#F1C7A0", eyes: "#1E1E24" },
  // Himmel & All
  skyDay: "#9ED3F5",
  skyHorizon: "#DDEFF7",
  skyGolden: "#F5B98A",
  skyNight: "#0E1630",
  space: "#04060D",
  cloud: "#FFFFFF",
  earthSea: "#2E6FB7",
  earthSeaShallow: "#3F8FD0",
  earthLand: ["#5DA34E", "#7DB35A", "#C9B37A", "#8C8A5A"],
  earthIce: "#EEF4F8",
  moon: ["#BDBAB4", "#A19E98", "#CFCBC4"],
  sun: "#FFF4D6",
  // Extrem
  lava: "#FF6A1A",
  lavaGlow: "#FFB347",
  magma: "#C2361B",
  plasma: "#FF9E5E",
  // Mikrowelt
  microBg: "#1E7A7A",
  microFog: "#2A8C8A",
  bacteria: ["#8E6BE0", "#6CCB7A", "#E07BB5", "#F2C14E"],
  virus: "#D8DDE3",
  pollen: "#E8C93A",
  atomO: "#D93C3C",
  atomH: "#F4F4F4",
  atomC: "#3A3A3A",
} as const;
