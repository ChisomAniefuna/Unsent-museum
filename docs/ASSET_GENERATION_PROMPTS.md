# The Unsent Museum — Asset & Shader Generation Guide

> **What this file is for.** When the user asks you to add a new shader, a new artifact, or a new room visual, read this file FIRST. It tells you exactly how to author the shader, which reference images to feed an AI for inspiration, how to wire the result into the codebase, and how to keep every artifact visually unique.
>
> **What you must do (when adding a shader):**
> 1. Pick a reference image from §4 that matches the room and subject.
> 2. Send the §3 prompt template (with the reference image) to an image/code-capable AI.
> 3. Save the returned `ShaderDef` to `src/app/data/generated/<room>-<subject>.ts`.
> 4. Register it in `src/app/data/generatedShaders.ts` under the right room.
> 5. Add a `MOCK_ARTIFACT` in `src/app/data/artifacts.ts` whose `dna.shaderIndex` and `shader` point at it.
> 6. **Add the artifact id to `SEED_IDS` in `artifacts.ts`** — without this step it won't appear in the gallery.
> 7. Verify in the browser: open `/gallery/<room>`, confirm the new shader renders visibly (not a flat gradient — if blank, see [`UNSENT_MUSEUM_HANDOFF.md`](UNSENT_MUSEUM_HANDOFF.md) §5.13B on seed normalization).

---

## 0. IMPORTANT: the shaders use NO images

**Every shader in this app is pure procedural GLSL — math, not pictures.** No shader loads a `sampler2D`/texture; there is no image input to any shader. So there were never "images that made the shaders." When new shaders were authored, a **reference image was shown to the AI as inspiration** to reproduce a shape/pattern *procedurally* — but that image never enters the code or the running app.

The only image files the app actually consumes (verified by import scan):

| Image file | Where it's used | What it is |
|---|---|---|
| `imports/masked-face.webp` (86 KB) | `CryingMaskCard.tsx`, `CryingMaskExhibit.tsx` | the **crying-mask** canvas piece ("The Face We Wore") — pixelated from this photo |
| `imports/sadness-heads.webp` (62 KB) | `SadnessHeadsCard.tsx` | the **sad-heads** canvas piece ("Five Ways of Grieving") — ASCII-ified from this photo |
| `imports/{Love,grief,Hope,Regret,Closure}_door.webp` | `EmotionDoorImage.tsx` | the 5 landing **doors** (not shaders) |
| `imports/{love,Hope,Regret,closure}_image.webp`, `grief_image_opt.jpg` | `rooms.ts` | the 5 room **hero/fallback** photos (not shaders) |
| `imports/museum_hall_opt.jpg` (308 KB) | `LandingMuseumBackground.tsx` | the landing **hall background** (not a shader) |

So: **2 images power the two canvas art-pieces; ~11 images are doors/room/hall photos; 0 images power any shader.** To "get more shaders," you don't need images — you need GLSL (authored from the prompt templates below, optionally guided by a reference picture).

---

## 1. How a Shader Is Defined

Every shader is a `ShaderDef` (`src/app/data/shaders.ts`):

```ts
export interface ShaderDef {
  id: string;          // kebab-case, room-prefixed, unique, e.g. "hope-golden-peacock"
  name: string;        // short human name (NOT shown as the artifact title)
  description: string; // one-line poetic description
  glsl: string;        // fragment shader source
}
```

Available uniforms (auto-declared if you omit them — see `ensureSeedUniforms`):

```glsl
uniform vec2  u_resolution;  // canvas size in pixels
uniform float u_time;        // seconds since the card became visible (+ timeOffset)
uniform float u_seed;        // per-artifact deterministic seed
uniform float u_intensity;   // 0.3–1.0, brightness/energy
uniform float u_unique;      // 1 for new artifacts (apply seed variation), 0 for legacy
```

**Golden rule for variation:** gate every seed-driven term behind `u_unique`, so `u_unique = 0` renders the original and `u_unique = 1` renders a seed-varied arrangement:

```glsl
float sd = u_seed * u_unique;          // 0 → no variation
float ang   = 0.5 * sd;                // seeded rotation
float pShift= 0.13 * sin(sd * 4.7);    // seeded palette nudge
float phase = 6.2831 * fract(sin(sd) * 43758.5) * u_unique;
```

---

## 2. Where Shaders Live & How to Add One

1. Create `src/app/data/generated/<room>-<name>.ts` exporting a default `ShaderDef`.
2. Import + append it in `src/app/data/generatedShaders.ts` under the right room in `GENERATED`.
3. It's now part of `EMOTION_SHADERS[room]` and reachable by `shaderIndex`.
4. **To surface it in the gallery immediately**, a `MOCK_ARTIFACT` must reference its index (the gallery only shows artifacts, not raw shaders). Add an entry to `MOCK_ARTIFACTS` in `src/app/data/artifacts.ts`:

```ts
{
  id: "mock-XX",
  emotion: "hope",
  title: "I Take Up Space Again",            // PERSONAL message, never the shader name
  messageExcerpt: "…the visitor's words…",
  messageVisibility: "excerpt",
  creatorDisplayName: "Anonymous Visitor",
  isAnonymous: true,
  avatarColor: "#d4ac0d",
  avatarInitials: "?",
  dna: { seed: 7240, shaderIndex: 17, emotion: "hope", intensity: 0.88, timeOffset: 4.5, unique: true },
  shader: EMOTION_SHADERS.hope[17],          // index must match the new shader's position
  createdAt: "2025-06-18T17:00:00Z",
  likes: 342, shares: 119, downloads: 71,
  visibility: "public",
  interpretation: "…museum's interpretation…",
}
```

> Titles must read like unsent messages (e.g. "Gold Where I Broke"), never "Kintsugi"/"Golden Peacock".

---

## 3. Prompt Template — ask an AI to author a museum shader

Paste this, filling the brackets:

> Write a single GLSL ES 1.0 fragment shader as a `ShaderDef` for "The Unsent Museum".
> **Room:** `[grief|hope|love|regret|closure]`. **Subject:** `[e.g. a dual-tone peacock / two hands reaching / a kintsugi crack]`.
> **Mood:** `[the emotion]`. **Palette:** `[2–4 hex colours + background]` — stay within this family.
> **Motion:** slow and alive (use `u_time`, multiplier ~`0.6–1.3`), never a static frame.
> **Requirements:**
> - `#ifdef GL_ES precision mediump float; #endif`
> - uniforms: `u_resolution, u_time, u_seed, u_unique` (add `u_intensity` if used)
> - Center/normalize: `vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;`
> - Gate all seed variation behind `u_unique` (so `u_unique=0` is the canonical look).
> - Build the subject from SDFs/loops so it is **recognizable at a glance**.
> - Include subtle film grain and a vignette; clamp final colour `[0,1]`.
> - No textures, no external assets, no `#version` line (WebGL1).
> Return only the `ShaderDef` object (`id`, `name`, `description`, `glsl`).

**Style add-ons** (mix in as needed): "dual-tone / screen-print halftone dots", "ASCII character grid built from 5×7 bitmap glyphs", "ink-wash sumi-e", "filigree / lacework line art", "fluid flow-field via domain-warped fbm", "voronoi crack network", "pixelated (snap `gl_FragCoord` to a coarse grid)".

---

## 4. Reference Images to Use

You don't feed images to the WebGL shader at runtime — you give a **reference image to the AI** and ask it to reproduce the silhouette/pattern procedurally in GLSL. Good sources per room:

| Room | Look for reference images of… |
|---|---|
| **Grief** | kintsugi (gold-mended ceramic), sumi-e ink wash, Adinkra cloth stamps, falling ash/embers, weeping faces in bronze |
| **Hope** | gold peacocks (woodblock/risograph), filigree butterflies, origami cranes, sunrise mandalas, lanterns rising |
| **Love** | camellia/rose blooms, two hands almost touching, scattered petals, intertwined leaves, heart-spark glows |
| **Regret** | willow rain, broken threads, undertow/whirlpool, crystal-mind figures, echoing ripples |
| **Closure** | enso circles, zen gardens, moon gates, ocean tides/flow fields, falling glyph rain |

**How to convert a reference → shader prompt:** "Here is a reference image of `[describe]`. Recreate its silhouette and key motifs procedurally in a GLSL ES fragment shader for the `[room]` room using the `[palette]` palette, dual-tone/screen-print style, with slow `u_time` animation. Do not trace pixels — approximate the forms with SDFs and patterned fills." (This is exactly how the dual-tone Golden Peacock and ASCII Reaching Hands were produced.)

---

## 5. Keeping Every Artifact Unique (presets + seeded variation)

This is the part that separates a real shader gallery from "weak random nonsense". Two layers:

**A. Presets (controlled families).** Each room has a curated set of shaders (`EMOTION_SHADERS[room]`). Generation never invents a shader from scratch — it **picks a preset** by round-robin so the whole family is used before any repeat:

```ts
function nextShaderIndex(emotion: string, count: number): number {
  const key = `unsent_genidx_${emotion}`;
  let cur = parseInt(localStorage.getItem(key) || "0", 10) || 0;
  const idx = cur % count;
  localStorage.setItem(key, String((cur + 1) % (count * 1000)));
  return idx;
}
```

**B. Seeded variation (within a preset).** The seed = `simpleHash(message + emotion + Date.now() + random)` and drives:
- `u_intensity` (0.3–1.0), `timeOffset` (starting phase),
- the in-shader `u_unique` arrangement (rotation/phase/palette nudge),
- a bounded CSS `hue-rotate(±18°) saturate(+0–22%)` on the thumbnail.

So even two artifacts on the **same** preset look different (different hue, energy, phase, arrangement) — variation **inside the emotional family**, never garbage.

**C. Hard duplicate guard [TO APPLY]:**
```ts
export function dnaKey(d: ArtifactDNA): string { return `${d.emotion}:${d.shaderIndex}:${d.seed}`; }
// On generate: if dnaKey exists in the known set, re-hash the seed and retry (≤8x).
```

**D. Adding a new seed artifact to the gallery.** After registering a new shader (steps A-C above), add a `MOCK_ARTIFACT` entry in `artifacts.ts` with a personal title and the correct `shaderIndex`, then add its `id` to the `SEED_IDS` set so it appears in the gallery:
```ts
// In the SEED_IDS set (bottom of artifacts.ts), add:
"mock-XX",  // "Your Personal Title Here" (room)
```

---

## 6. "Tell my system to get them for me" — a generation recipe

To batch-produce a set of new room shaders with an AI/agent:

1. For each `(room, subject, palette)` you want, send the **§3 prompt** (optionally with a **§4 reference image**).
2. Save each result as `src/app/data/generated/<room>-<subject>.ts`.
3. Append imports to `generatedShaders.ts` under the room.
4. Add one `MOCK_ARTIFACT` per shader (personal title + the index it landed at).
5. Verify in the gallery: each room's carousel should show distinct, recognizable, animating pieces; confirm no two share a palette/silhouette.

**Acceptance checks for any new shader:** compiles (no fallback), recognizable subject, on-palette, visibly animating, varies with seed when `u_unique=1`, and titled like a human message.

---

## 7. This Session's New / Updated Assets

| File | What it is |
|---|---|
| `generated/hope-golden-peacock.ts` | Dual-tone peacock (SDF body/neck/head/crest + fanned eye-spot tail), gold-on-burgundy, halftone shading. |
| `generated/love-leaf-hands.ts` | ASCII "Reaching Hands" — 5×7 bitmap glyph grid inside two hand SDFs leaning to touch, gold spark between fingertips. |
| `generated/closure-fluid-pixel.ts` | "Becoming Water" — pixelated fluid flow-field (domain-warped fbm) in the closure Ocean palette. |
| `shaders.ts` (grief base) | Re-tinted grid→midnight-blue, ash→amber, veil→teal so grief shaders stop looking identical. |
| `generated/grief-adinkra-owuo.ts`, `grief-ash-veil.ts` | Re-tinted to earthy-brown and grey-green for palette distinction. |
| Motion bumps | `love-camellia-bloom` 0.5→0.9, `grief-weeping-orb` 0.4→0.85, `hope-filigree-butterfly` 1.0→1.3. |

---

---

## 8. Full Shader Inventory (the bespoke "new" shaders)

These 35 bespoke shaders live in `src/app/data/generated/` and are registered in `generatedShaders.ts` under `GENERATED[room]`. (They are *in addition to* the original base shaders defined inline in `shaders.ts` — vortex/grid/ash/veil/flow-ocean and the LMN1 presets.) None of them use an image; the "reference" column is the picture you'd hand an AI to author a similar one.

**Grief** (7) — palette diversified so no two look alike:
| file / id | name | reference to use |
|---|---|---|
| `grief-kintsugi` | Kintsugi | gold-mended cracked ceramic |
| `grief-sumie` | Sumi-e | black ink-wash brush painting |
| `grief-adinkra-owuo` | Ladder of Death | Adinkra cloth stamps (earthy brown) |
| `grief-ash-veil` | Ash Veil | drifting ash + dying embers (grey-green) |
| `grief-fallen-rose` | Fallen Rose | wilting rose, wine/ash tones |
| `grief-smoke-breathing` | Smoke Breathing | lavender smoke column |
| `grief-weeping-orb` | Weeping Orb | bronze sphere of sorrowing faces |

**Hope** (9):
| `hope-origami-crane` | Origami Crane | folded paper crane |
| `hope-golden-dragon` | Golden Dragon | gold Chinese dragon |
| `hope-sunrise-adinkra` | Rising Sun | sunrise + Adinkra motif |
| `hope-lantern-halftone` | Lantern Halftone | rising paper lanterns, halftone |
| `hope-ascii-ascension` | ASCII Ascension | upward ASCII particle stream |
| `hope-eye-rays` | Eye Rays | radiant eye with light rays |
| `hope-eye-rays-blink` | Awakening Eyes | blinking radiant eyes |
| `hope-golden-peacock` | Golden Peacock | **dual-tone** gold peacock (woodblock/risograph) |
| `hope-filigree-butterfly` | Filigree Butterfly | gold lacework butterfly |

**Closure** (7):
| `closure-enso` | Ensō | single zen brush circle |
| `closure-zen-garden` | Raked Garden | raked sand zen garden |
| `closure-moon-gate` | Moon Gate | circular moon gate / portal |
| `closure-tide-halftone` | Tide Halftone | ocean tide, halftone |
| `closure-ascii-rain` | ASCII Settle | falling/settling ASCII rain |
| `closure-color-extension` | Color Extension | spreading color field |
| `closure-fluid-pixel` | Becoming Water | **pixelated fluid flow-field** (ocean palette) |

**Regret** (8):
| `regret-willow-rain` | Willow Rain | weeping willow in rain |
| `regret-broken-thread` | Broken Thread | snapped/frayed thread |
| `regret-sankofa` | Sankofa | Sankofa bird looking back |
| `regret-undertow-halftone` | Undertow Halftone | undertow/whirlpool, halftone |
| `regret-ascii-echo` | ASCII Echo | echoing ASCII ripples |
| `regret-crystal-mind` | Crystal Mind | crystalline figure (body has moving colour flow) |
| `regret-vortex-quake` | Vortex Quake | violent vortex |
| `regret-wave-rings` | Wave Rings | golden interference rings *(also surfaced in Hope via mock-75)* |

**Love** (4):
| `love-scattered-petals` | Scattered Petals | scattered flower petals |
| `love-spiral-ripples` | Spiral Ripples | spiral water ripples |
| `love-camellia-bloom` | Camellia Bloom | layered red/cream camellia flower |
| `love-leaf-hands` | Reaching Hands | **ASCII** hands leaning to touch, red palette |

Plus the **two image-based canvas pieces** (not GLSL): `CryingMaskRender` ("The Face We Wore", from `masked-face.webp`) and `SadnessHeadsRender` ("Five Ways of Grieving", from `sadness-heads.webp`).

### Created / changed in the recent sessions ("the new ones")
- **`hope-golden-peacock`** — fully rewritten as a bold **dual-tone** peacock (was an indistinct gold blob).
- **`love-leaf-hands`** — rewritten as **ASCII hands** reaching to touch with a spark between fingertips.
- **`closure-fluid-pixel`** ("Becoming Water") — **new** pixelated fluid flow-field.
- **Grief palette diversification** — `grief-adinkra-owuo`, `grief-ash-veil` re-tinted + the base grief shaders (grid→midnight-blue, ash→amber, veil→teal) so the grief room stops looking uniformly purple.
- **Motion speed-ups** — `love-camellia-bloom` (0.5→0.9), `grief-weeping-orb` (0.4→0.85), `hope-filigree-butterfly` (1.0→1.3).
- **`regret-crystal-mind`** — body given a moving blue→purple→pink colour flow.

---

*Companion file: `DOCS/UNSENT_MUSEUM_HANDOFF.md` (full engineering handoff, real code, testing checklist).*
