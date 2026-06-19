# Shader Prompts — how every shader was (and can be) generated

The exact prompts behind the 25 new shaders. With these an AI can **regenerate**
any shader, **extend** the set, or understand the intent behind the code in
`shader-code.md`. Read `AI-PROMPT.md` first for the big picture.

The pipeline is two passes per shader: **DESIGN** (write it) → **HARDEN** (a strict
WebGL1 + art-director pass that fixes validity and pushes contrast/motion). Both
passes are given the same **CONTRACT**.

---

## A. The CONTRACT (given to every pass)

```
TECHNICAL CONTRACT — obey EXACTLY (renders in a shared WebGL1 engine):
- Output ONE WebGL1 fragment shader, GLSL ES 1.00. No #version. No vertex shader.
- Begin with:
  #ifdef GL_ES
  precision mediump float;
  #endif
- Declare and use ONLY these uniforms (NO others, NO textures/samplers):
  uniform vec2 u_resolution; uniform float u_time; uniform float u_seed; uniform float u_unique;
- Centred coords: vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
- GATING (critical): EVERY seed-driven variation is multiplied by u_unique so that
  when u_unique==0.0 the shader shows ONE fixed canonical composition, and when
  u_unique==1.0 it varies with u_seed (arrangement / phase / palette-shift /
  travel direction). e.g. hash(id + u_seed*u_unique), angle += u_seed*u_unique,
  or dir = mix(1.0, sign(hash(..)-0.5), u_unique).
- WebGL1 rules: ALL for-loops have CONSTANT bounds
  (for(float i=0.0;i<8.0;i++){ if(i>=n) break; ... }). NO while. NO non-constant
  array indexing. NO textures. Functions before use. Declare every variable.
- Animate with u_time, SLOW and graceful. Real motion REQUIRED: a flowing/warping
  background AND lifecycle or travel of the motif (open/close, sprout, rise, drift,
  ripple, coil). No static images.
- Performance: total per-pixel loop iterations <= ~120.
- Strong CONTRAST: clean dark flowing background; the motif reads clearly. If
  monochrome/duotone, use a WIDE value range (deep shadow -> bright highlight).
  Subtle grain/texture/intensity ramps/domain warping are welcome.
- End with: gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
- Original work, designed from the motif. Museum / competition quality.
```

## B. DESIGN prompt template (fill the {braces} from a brief in §D)

```
You are a master generative shader artist creating COMPETITION-GRADE art for
"The Unsent Museum" — room: {ROOM} (the emotion).
Cultural direction: {CULTURE}. Motif: {MOTIF}.
Palette (MUST have good contrast): {PALETTE}.
Required motion: {MOTION}.
Name it "{NAME}" (id "{ID}", room "{ROOM}"). Write a one-sentence poetic
description tying the motif to {ROOM}.
Make it OUTSTANDING — rich, layered, alive, premium. It must clearly evoke {ROOM}
through the {CULTURE} motif, with a flowing/warping background and real motion.
<CONTRACT>
Return id, name, description, room, and the full glsl.
```

## C. HARDEN prompt template (QC pass; pass the design output as {GLSL})

```
You are a strict WebGL1 (GLSL ES 1.00) compiler AND an exacting art director.
Below is a candidate shader for room {ROOM}, motif "{MOTIF}" ({CULTURE}).
Return an IMPROVED FINAL version that:
1) compiles as GLSL ES 1.00 with ZERO errors (fix non-constant loop bounds,
   while-loops, textures, missing precision, undeclared vars, wrong uniforms);
2) uses ONLY u_resolution, u_time, u_seed, u_unique;
3) gates ALL seed variation by u_unique (u_unique==0 -> fixed canonical look);
4) has STRONG CONTRAST and a clearly readable motif (deep value range; if
   monochrome/duotone, push shadow-to-highlight);
5) has rich, SLOW, graceful motion — flowing/warping background PLUS lifecycle or
   travel of the motif;
6) genuinely evokes {ROOM} via the {CULTURE} {MOTIF}; museum/competition quality.
Keep id "{ID}" and name "{NAME}".
<CONTRACT>
Candidate GLSL:
{GLSL}
Return the final improved shader.
```

---

## D. The 25 briefs (the {braces} for §B/§C)

> Palettes give hex anchors + a contrast note; motion is the required animation.
> The generated code is in `shader-code.md` / `src/app/data/generated/<id>.ts`.

### GRIEF — dirty purple / off-black / grey, cold pale highlights
- **grief-kintsugi · "Kintsugi" · Japan** — *motif:* gold-mended cracks (kintsugi)
  spreading across dark broken ceramic — beauty in repair. *palette:* near-black
  ceramic #0d0b12, dirty purple #2a2336, molten GOLD veins #d4af37→#ffe6a3 (high
  contrast gold-on-black). *motion:* cracks travel/branch outward; the gold glows
  in pulses.
- **grief-sumie · "Sumi-e" · Japan/China** — *motif:* ink-wash (sumi-e) blooming &
  bleeding across rice paper. *palette:* MONOCHROME pale paper #ece7df, grey
  washes, black ink #0b0b0e (wide value range). *motion:* ink blooms outward,
  bleeds, drifts with domain-warp.
- **grief-adinkra-owuo · "Ladder of Death" · Africa (Akan/Adinkra, Owuo Atwedeɛ)**
  — *motif:* repeating mourning ladder-stamps fading in a grid. *palette:* charcoal
  #14121a, dirty purple #3a3048, bone-white stamps #d8d2c4. *motion:* stamps fade
  in/out at staggered times; the grid drifts.
- **grief-ash-veil · "Ash Veil" · universal** — *motif:* a veil of drifting ash &
  faint embers over a grieving haze. *palette:* off-black, dirty purple #4a3d5e,
  grey ash #7a7a7a, faint warm ember. *motion:* ash rises through warping haze;
  embers flicker.

### HOPE — gold / warm white, jade accents
- **hope-origami-crane · "Origami Crane" · Japan** — *motif:* a folded paper crane
  in golden light, wings easing. *palette:* deep warm #1a1206, GOLD #f2c14e, cream
  #fff3e0. *motion:* wings flex, crane rises; soft light rays rotate.
- **hope-golden-dragon · "Golden Dragon" · China** — *motif:* a sinuous Chinese
  dragon of scales/light coiling upward. *palette:* dark #120d04, GOLD scales
  #f2c14e→#fff3e0, JADE accent #2bb673. *motion:* serpentine body travels/coils;
  scales shimmer.
- **hope-sunrise-adinkra · "Rising Sun" · Africa (Akan)** — *motif:* a rising sun
  with turning rays. *palette:* dark earth #150c06, orange-gold sun #ff9d2f→#ffe6a3.
  *motion:* sun rises, rays rotate. *(Note: the Adinkra altar figures originally
  framing the sun were later removed per art direction.)*
- **hope-lantern-halftone · "Lantern Halftone" · halftone form** — *motif:*
  halftone dot-field resolving into rising lanterns / a sun. *palette:* deep night
  #0d0a05, GOLD dots #f2c14e, cream highlights. *motion:* dots scale with a rising
  wave; lanterns travel up.
- **hope-ascii-ascension · "ASCII Ascension" · ASCII form** — *motif:* glyph
  characters streaming UPWARD like sparks of becoming. *palette:* near-black, GOLD
  #f2c14e, warm-white leaders. *motion:* glyphs travel upward with bright crests.

### CLOSURE — navy / blue / mint / sky
- **closure-enso · "Ensō" · Japan (Zen)** — *motif:* a single ensō brush circle
  painting itself then resting. *palette:* deep ink #06121c, luminous MINT/white
  stroke #9fffe0→#ffffff (very high contrast). *motion:* circle draws itself,
  breathes; brush texture flows.
- **closure-zen-garden · "Raked Garden" · Japan (karesansui)** — *motif:*
  concentric raked-sand ripples around still stones. *palette:* MONOCHROME sand
  pale #d8d0bf, greys, shadow #1c2026 (wide value range). *motion:* ripples expand
  slowly & travel; gentle light sweep.
- **closure-moon-gate · "Moon Gate" · China** — *motif:* a circular moon gate with
  its reflection rippling on still water. *palette:* navy #0e3a5c, mid blue #2e7fb8,
  pale moon #e8f4ff, mint shimmer. *motion:* the gate breathes open/closed, the
  moon rises through it, water shimmers. *(Later tuned for clearer motion.)*
- **closure-tide-halftone · "Tide Halftone" · halftone form** — *motif:* halftone
  dots as a tide receding into calm. *palette:* deep navy #06121c, cyan/sky dots
  #2e7fb8→#9fd4e8. *motion:* dot sizes follow a tide wave that travels out & settles.
- **closure-ascii-rain · "ASCII Settle" · ASCII form** — *motif:* gentle glyph rain
  slowing & settling — peace after noise. *palette:* near-black, mint/sky glyphs
  #7fffd4→#9fd4e8. *motion:* glyphs fall & settle (but keep a living drift — never
  a full stop).

### REGRET — deep ocean blue / indigo, single warm accent allowed
- **regret-willow-rain · "Willow Rain" · China** — *motif:* a weeping willow's
  strands behind falling rain — longing. *palette:* indigo #16223e, ocean blue
  #2e7fb8, pale rain #9fd4e8. *motion:* rain travels down, strands sway in warped
  wind.
- **regret-broken-thread · "Broken Thread" · Japan** — *motif:* a single red
  fate-thread fraying & drifting apart. *palette:* DUOTONE deep indigo #121a2e + ONE
  crimson thread #e3344c (maximum contrast). *motion:* thread unravels, fibers
  drift apart slowly.
- **regret-sankofa · "Sankofa" · Africa (Akan)** — *motif:* the Sankofa bird
  looking back / crossroads — return and fetch it. *palette:* indigo #16223e, ocean
  blue, GOLD sankofa accent #e0b24a. *motion:* paths shift, the motif turns; slow
  domain-warp current.
- **regret-undertow-halftone · "Undertow Halftone" · halftone form** — *motif:*
  halftone dots dragged into a spiralling undertow. *palette:* deep #06121c, blue
  dots #2e7fb8→#9fd4e8. *motion:* dots spiral inward (travel) around a dark pull;
  pulsing.
- **regret-ascii-echo · "ASCII Echo" · ASCII form** — *motif:* glyphs rippling
  outward in echoes that never fully fade. *palette:* near-black, blue/pale glyphs
  #2e7fb8→#cfe8ff. *motion:* concentric glyph echoes travel outward & fade.

### LOVE — wine/crimson/rose/blush/gold/cream (defined in shaders.ts)
- **lovePeonyGarden · "Peony Garden" · China (牡丹)** — *motif:* a courtyard of
  peonies on a flowing wine background. *motion:* each bloom **sprout → open →
  close** at staggered times.
- **loveSakuraField · "Sakura Drift" · Japan (桜)** — *motif:* five-petal cherry
  blossoms drifting on a flowing dusk gradient. *motion:* petals drift/fall, sway.
- **loveHalftoneHeart · "Halftone Heart" · halftone form** — *motif:* a heart
  resolving out of a pulsing dot field.
- **loveAsciiHeart · "ASCII Heart" · ASCII form** — *motif:* glyph characters
  raining into the shape of a heart.
- **loveSilkRibbon · "Silk Ribbon" · silk form** — *motif:* folds of crimson silk
  turning through the dark (recursive domain warp).

### GRIEF bonus
- **griefLiquidAurora · "Liquid Aurora" · silk form** — *motif:* recursive double
  domain-warp "silk" with caustic filaments, folding endlessly; grief recolour
  (off-black → dirty purple → grey → pale lilac). *technique:* `fbm(fbm(p))` domain
  warp + bright thin filament lines where the warp folds.

---

## E. How to regenerate or add a shader

1. Pick/author a brief (room, culture, motif, palette+contrast, motion).
2. Run the **DESIGN** prompt (§B) with the **CONTRACT** (§A).
3. Run the **HARDEN** prompt (§C) on the result.
4. Save to `src/app/data/generated/<id>.ts` (default-export a `ShaderDef`),
   register it in `generatedShaders.ts`, and it auto-joins its room.
5. **Render it in the app and look** — agents can't see pixels; use a temporary
   `/verify` grid (see `AI-PROMPT.md` §9). Fix flat/low-contrast/broken output.

> Reminder: gate every seed term by `u_unique` (§A) so existing artifacts never
> change — see `artifact-uniqueness.md`.
