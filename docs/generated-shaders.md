# New Shaders — Catalogue

The 25 bespoke shaders authored for The Unsent Museum, themed on African,
Japanese and Chinese visual languages and on rendering *forms* (halftone, ASCII,
silk). All obey the GLSL contract in `shader-system.md` and the `u_unique` gate in
`artifact-uniqueness.md`.

## Where they live

- **Per-room generated shaders** — one file each in `src/app/data/generated/<id>.ts`
  (default-exports a `ShaderDef`).
- **Index** — `src/app/data/generatedShaders.ts` imports them and exports
  `GENERATED: Record<room, ShaderDef[]>`.
- **Wiring** — `shaders.ts` imports `GENERATED` and spreads it per room:
  ```ts
  grief:   [ ...originalGrief,   griefLiquidAurora, ...GENERATED.grief   ],
  hope:    [ ...originalHope,    ...GENERATED.hope    ],
  closure: [ ...originalClosure, ...GENERATED.closure ],
  regret:  [ ...originalRegret,  ...GENERATED.regret  ],
  // love's cultural set lives directly in shaders.ts (see below)
  ```
- **Love + Liquid Aurora** are defined directly in `shaders.ts` (not in `generated/`).

New shaders surface on **new artifacts** (round-robin selection); existing demo
artifacts keep their original shaders until reseeded.

## Shared techniques

- **Domain warping** (`fbm(fbm(p))`) for flowing, living backgrounds.
- **Lifecycle motion** — sprout → open → close, draw-on, rise, ripple, coil.
- **Distribution** — many motifs across the field (grids/particles), not one centred shape.
- **Contrast** — clean dark/flowing background; motif reads clearly; monochrome/duotone use a wide value range.
- **Seed gating** — every variation `* u_unique` (see `artifact-uniqueness.md`).

---

## GRIEF — dirty purple / off-black / grey, cold pale highlights

| Name | Culture / form | Motif & motion | File |
|---|---|---|---|
| **Liquid Aurora** | silk form | Recursive double domain-warp "silk" with caustic filaments; folds endlessly. Grief recolour (off-black → dirty purple → grey → pale lilac). | `shaders.ts` (`griefLiquidAurora`) |
| **Kintsugi** | Japan | Gold-mended cracks (voronoi network) on dark broken ceramic; a gold "repair front" travels outward & settles; per-shard tinting, seam glints, filmic tonemap. | `generated/grief-kintsugi.ts` |
| **Sumi-e** | Japan / China | Ink-wash blooming and bleeding on rice paper; high-contrast monochrome (paper → grey → black ink). | `generated/grief-sumie.ts` |
| **Ladder of Death** | Africa (Akan/Adinkra, *Owuo Atwedeɛ*) | Grid of mourning ladder-stamps fading in/out at staggered times; the grid drifts. | `generated/grief-adinkra-owuo.ts` |
| **Ash Veil** | universal | Drifting ash + faint embers through a warping grief haze; particles rise. | `generated/grief-ash-veil.ts` |

## HOPE — gold / warm white, jade accents

| Name | Culture / form | Motif & motion | File |
|---|---|---|---|
| **Origami Crane** | Japan | Folded paper crane in golden light; wings ease, crane rises; rotating god-rays. *(Contrast boosted: darker field, tighter glow, dark separation ring.)* | `generated/hope-origami-crane.ts` |
| **Golden Dragon** | China | Sinuous scaled dragon of light coiling/travelling across frame; gold + jade. | `generated/hope-golden-dragon.ts` |
| **Rising Sun** | Africa (Akan) | Radiant sun climbing the horizon with turning rays. *(The Adinkra altar figures were removed per art direction — pure sunrise + rays.)* | `generated/hope-sunrise-adinkra.ts` |
| **Lantern Halftone** | halftone form | Halftone dot-field resolving into rising lanterns / a sun; dots rise. | `generated/hope-lantern-halftone.ts` |
| **ASCII Ascension** | ASCII form | Glyph columns streaming upward with bright crests; *(sped up ~4×, brighter)*. | `generated/hope-ascii-ascension.ts` |

## CLOSURE — navy / blue / mint / sky

| Name | Culture / form | Motif & motion | File |
|---|---|---|---|
| **Ensō** | Japan (Zen) | A single brush circle draws itself round, breathes, then rests; luminous mint/white on deep ink. | `generated/closure-enso.ts` |
| **Raked Garden** | Japan (karesansui) | Concentric raked-sand ripples around stones expanding slowly; monochrome sand, wide value range. | `generated/closure-zen-garden.ts` |
| **Moon Gate** | China | Circular moon gate with rippling water reflection; the gate **breathes open/closed**, the moon rises through it on a faster cycle. | `generated/closure-moon-gate.ts` |
| **Tide Halftone** | halftone form | Halftone dots as a tide receding into calm; the wave travels out & settles. | `generated/closure-tide-halftone.ts` |
| **ASCII Settle** | ASCII form | A glyph downpour slowing into a quiet grid; *(no longer decays to a full stop — keeps a living drift; brighter)*. | `generated/closure-ascii-rain.ts` |

## REGRET — deep ocean blue / indigo, single warm accent

| Name | Culture / form | Motif & motion | File |
|---|---|---|---|
| **Willow Rain** | China | Weeping-willow strands behind falling rain; rain travels down, strands sway in warped wind. | `generated/regret-willow-rain.ts` |
| **Broken Thread** | Japan | A single red fate-thread fraying and drifting apart; duotone indigo + one crimson (max contrast). | `generated/regret-broken-thread.ts` |
| **Sankofa** | Africa (Akan) | The Sankofa bird / crossroads ("return and fetch it"); paths shift on a slow current; gold motif on indigo. | `generated/regret-sankofa.ts` |
| **Undertow Halftone** | halftone form | Halftone dots dragged into a spiralling undertow around a dark pull. | `generated/regret-undertow-halftone.ts` |
| **ASCII Echo** | ASCII form | Concentric glyph echoes ripple outward and never fully fade; *(sped up ~2.5–5×, brighter)*. | `generated/regret-ascii-echo.ts` |

## LOVE — wine / crimson / rose / blush / gold / cream (in `shaders.ts`)

| Name | Culture / form | Motif & motion | Const |
|---|---|---|---|
| **Peony Garden** | China (牡丹) | A field of peonies on a flowing wine background; each blooms sprout → open → close at staggered times. | `lovePeonyGarden` |
| **Sakura Drift** | Japan (桜) | Five-petal cherry blossoms drifting on a flowing dusk gradient. | `loveSakuraField` |
| **Halftone Heart** | halftone form | A heart resolving out of a pulsing dot field. | `loveHalftoneHeart` |
| **ASCII Heart** | ASCII form | Glyph characters raining into the shape of a heart. | `loveAsciiHeart` |
| **Silk Ribbon** | silk form | Folds of crimson silk turning through the dark (recursive domain warp). | `loveSilkRibbon` |

---

## Tuning history (applied to the live files)

- **Speed:** ASCII shaders raised ~4× (scroll/crest/ring rates); Moon Gate cycle ~3.6× + breathing; every generated shader's base `u_time` clock ×1.4 overall.
- **Contrast:** Origami Crane darkened field + dark separation ring + brighter crane; ASCII trio brightened (and ASCII Settle no longer settles to a dead stop).
- **Edit:** Rising Sun — Adinkra altar figures removed.
- **Palette:** seed hue-rotate range tightened to **±18°** so colours stay in each room's family.

## House rules for adding more

1. Author to the GLSL contract in `shader-system.md` (WebGL1, allowed uniforms, constant loop bounds).
2. Gate all seed variation by `u_unique`.
3. Drop the file in `src/app/data/generated/<id>.ts` (default export), add it to
   `generatedShaders.ts`, and it auto-joins its room.
4. Verify by rendering through the engine (a temporary `/verify` route that maps a
   room's `ShaderDef[]` through `ShaderThumb` with `unique` is the fastest QC) —
   agents can't see pixels, so a human/preview pass is mandatory.
