import type { ShaderDef } from "./shaders";

import griefKintsugi from "./generated/grief-kintsugi";
import griefSumie from "./generated/grief-sumie";
import griefAdinkraOwuo from "./generated/grief-adinkra-owuo";
import griefAshVeil from "./generated/grief-ash-veil";
import griefFallenRose from "./generated/grief-fallen-rose";
import griefSmokeBreathing from "./generated/grief-smoke-breathing";
import griefWeepingOrb from "./generated/grief-weeping-orb";

import hopeOrigamiCrane from "./generated/hope-origami-crane";
import hopeGoldenDragon from "./generated/hope-golden-dragon";
import hopeSunriseAdinkra from "./generated/hope-sunrise-adinkra";
import hopeLanternHalftone from "./generated/hope-lantern-halftone";
import hopeAsciiAscension from "./generated/hope-ascii-ascension";
import hopeEyeRays from "./generated/hope-eye-rays";
import hopeEyeRaysBlink from "./generated/hope-eye-rays-blink";
import hopeGoldenPeacock from "./generated/hope-golden-peacock";
import hopeFiligreeButterfly from "./generated/hope-filigree-butterfly";

import closureEnso from "./generated/closure-enso";
import closureZenGarden from "./generated/closure-zen-garden";
import closureMoonGate from "./generated/closure-moon-gate";
import closureTideHalftone from "./generated/closure-tide-halftone";
import closureAsciiRain from "./generated/closure-ascii-rain";

import regretWillowRain from "./generated/regret-willow-rain";
import regretBrokenThread from "./generated/regret-broken-thread";
import regretSankofa from "./generated/regret-sankofa";
import regretUndertowHalftone from "./generated/regret-undertow-halftone";
import regretAsciiEcho from "./generated/regret-ascii-echo";
import regretCrystalMind from "./generated/regret-crystal-mind";
import regretVortexQuake from "./generated/regret-vortex-quake";
import regretWaveRings from "./generated/regret-wave-rings";

import loveScatteredPetals from "./generated/love-scattered-petals";
import loveSpiralRipples from "./generated/love-spiral-ripples";
import loveCamelliaBloom from "./generated/love-camellia-bloom";
import loveLeafHands from "./generated/love-leaf-hands";

import closureColorExtension from "./generated/closure-color-extension";
import closureFluidPixel from "./generated/closure-fluid-pixel";

// Bespoke per-room shaders produced by the museum-room-shaders workflow.
export const GENERATED: Record<string, ShaderDef[]> = {
  grief: [griefKintsugi, griefSumie, griefAdinkraOwuo, griefAshVeil, griefFallenRose, griefSmokeBreathing, griefWeepingOrb],
  hope: [hopeOrigamiCrane, hopeGoldenDragon, hopeSunriseAdinkra, hopeLanternHalftone, hopeAsciiAscension, hopeEyeRays, hopeEyeRaysBlink, hopeGoldenPeacock, hopeFiligreeButterfly],
  closure: [closureEnso, closureZenGarden, closureMoonGate, closureTideHalftone, closureAsciiRain, closureColorExtension, closureFluidPixel],
  regret: [regretWillowRain, regretBrokenThread, regretSankofa, regretUndertowHalftone, regretAsciiEcho, regretCrystalMind, regretVortexQuake, regretWaveRings],
  love: [loveScatteredPetals, loveSpiralRipples, loveCamelliaBloom, loveLeafHands],
};
