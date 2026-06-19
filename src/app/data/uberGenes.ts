// Gene decoder + per-emotion labels for uber-shader artifacts. Used by both
// the playground (live preview) and the artifact detail modal (formula strip).
//
// The 5-gene system is mirrored exactly in each *-uber.ts shader's GLSL. If
// you change a gene set or a multiplier here, change it in the corresponding
// shader too or the labels will not match what the shader rendered.

export type UberEmotion = "grief" | "hope" | "love" | "regret" | "closure";

const UBER_SHADER_IDS: Record<UberEmotion, string> = {
  grief:   "grief-uber",
  hope:    "hope-uber",
  love:    "love-uber",
  regret:  "regret-uber",
  closure: "closure-uber",
};

export const GENE_LABELS: Record<UberEmotion, {
  field: readonly string[];
  domain: readonly string[];
  palette: readonly string[];
  surface: readonly string[];
  decay: readonly string[];
}> = {
  grief: {
    field:   ["flow", "ridge", "drift", "void", "whirlpool", "tornado", "well", "dust"],
    domain:  ["radial", "wave", "fract", "smoke"],
    palette: ["ash", "indigo", "sepia", "blue-grey", "charcoal"],
    surface: ["soft", "grain", "ribbon"],
    decay:   ["slow", "pulse", "recede"],
  },
  hope: {
    field:   ["beams", "bloom", "filaments", "dawn", "spiral", "flame", "lanterns", "rays"],
    domain:  ["radial", "wave", "fract", "smoke"],
    palette: ["gold", "dawn", "candle", "sunbeam", "ember"],
    surface: ["soft", "grain", "streak"],
    decay:   ["slow", "pulse", "rising"],
  },
  love: {
    field:   ["bloom", "heart", "tendrils", "swirl", "petals", "embrace", "ribbon", "firefly"],
    domain:  ["radial", "wave", "fract", "smoke"],
    palette: ["rose", "coral", "wine", "sunset", "berry"],
    surface: ["soft", "grain", "glow"],
    decay:   ["slow", "pulse", "breath"],
  },
  regret: {
    field:   ["ripple", "undertow", "fragment", "echo", "mist", "spiral", "fissure", "drift"],
    domain:  ["radial", "wave", "fract", "smoke"],
    palette: ["ocean", "ink", "rust", "slate", "violet"],
    surface: ["soft", "grain", "wash"],
    decay:   ["slow", "pulse", "sinking"],
  },
  closure: {
    field:   ["tide", "gyroid", "stillness", "settling", "horizon", "breath", "moon", "enso"],
    domain:  ["radial", "wave", "fract", "smoke"],
    palette: ["mint", "sky", "abyss", "sage", "aurora"],
    surface: ["soft", "grain", "film"],
    decay:   ["slow", "breath", "settling"],
  },
};

// Mirrors the GLSL hash11(p) function exactly.
function hash11(p: number): number {
  p = p * 0.1031;
  p = p - Math.floor(p);
  p = p * (p + 33.33);
  p = p * (p + p);
  return p - Math.floor(p);
}

// Mirrors GLSL gene(salt, n): floor(hash11(u_seed * 7.13 + salt * 17.93) * n).
function pickGene(uSeed: number, salt: number, n: number): number {
  return Math.floor(hash11(uSeed * 7.13 + salt * 17.93) * n);
}

export interface DecodedGenes {
  seed: number;          // raw seed as stored on the artifact
  uSeed: number;         // engine-normalized seed (the value GLSL sees)
  field: string;
  domain: string;
  palette: string;
  surface: string;
  decay: string;
}

// The shader engine normalizes seed via ((s % 10000) + 10000) % 10000 / 100.
// Mirror that here so the displayed genes match what the canvas rendered.
export function decodeGenes(rawSeed: number, emotion: UberEmotion): DecodedGenes {
  const uSeed = (((rawSeed % 10000) + 10000) % 10000) / 100;
  const L = GENE_LABELS[emotion];
  return {
    seed: rawSeed,
    uSeed,
    field:   L.field[pickGene(uSeed, 1, 8)],
    domain:  L.domain[pickGene(uSeed, 2, 4)],
    palette: L.palette[pickGene(uSeed, 3, 5)],
    surface: L.surface[pickGene(uSeed, 4, 3)],
    decay:   L.decay[pickGene(uSeed, 5, 3)],
  };
}

// Does the artifact's shader carry a gene system we can read?
export function isUberShader(shaderId: string | undefined, emotion: string): emotion is UberEmotion {
  return !!shaderId && shaderId === UBER_SHADER_IDS[emotion as UberEmotion];
}
