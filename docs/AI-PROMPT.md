# MASTER PROMPT — Fix & Extend the Live-Shader Museum

> Paste this whole file to the AI. It assumes the AI knows **nothing** about the
> project. It explains the situation, the mental models (especially how *seeds*
> work), the exact order to do things, and where to go next. The full source code
> lives in the sibling docs: `shader-system.md`, `artifact-uniqueness.md`,
> `generated-shaders.md` — this prompt tells the AI *how to think* and *what to do*;
> those give the *code*.

---

## 1. Who you are and what you're doing

You are a senior graphics + React/TypeScript engineer. You've inherited a web app
called **The Unsent Museum**. It's a gallery: visitors write an unsent message,
pick an emotion ("room"), and the app turns it into a one-of-a-kind **living
artifact** — a small card whose artwork is an **animated WebGL fragment shader**
(GLSL source code compiled and run on the GPU in real time; *not* a video or
image).

Your job, in order: (A) make the shaders **load and run smoothly**, (B) make the
cards **size consistently**, (C) make the motion feel **alive**, (D) keep it
**fast**, (E) make every visitor's artifact **unique but reproducible** without
disturbing artifacts that already exist, and (F) optionally add **new shaders**.

**Work in phases. After each phase, run the app in a browser and confirm it with
your own eyes / measurements before moving on. Do not claim a fix you haven't
observed.** GPU shader failures are *silent* (they fall back to a plain pattern),
so "no console error" is not proof — you must look.

---

## 2. The symptoms you're fixing (what the user reported)

- "The shaders are not loading / loading slow." Most cards showed nothing or a
  flat placeholder; a few worked; scrolling was janky.
- "The cards don't have equal height and width — it changes drastically." Some
  cards were full-width, some half-width, seemingly at random.
- "Everything looks like a ball of gradients." (Placeholders were masking the fact
  that the real shaders weren't running.)
- "Some are slow / not moving; contrast is poor." (Animation + visual-quality.)
- "I don't want two people to have the same artifact." (Uniqueness.)

---

## 3. Three mental models — read before touching code

### Model 1 — WebGL contexts are *scarce*; everything else follows

A browser allows only **~8–16 simultaneous WebGL contexts**. The broken app gave
**every card its own WebGL context**, so once ~8 cards existed the rest silently
failed — that's why "most don't load." It also asked the GPU "did that compile?"
*right after* compiling, which **stalls the main thread ~40ms each**, and it only
started compiling a card's shader once it was already on screen.

**The fix is a change of architecture, not a tweak:** use **ONE shared WebGL
context** for the whole app. It compiles each unique shader **once** (cached by its
source string) and renders it into a single off-screen canvas. Each *card* is then
just a cheap **2D canvas** that copies ("blits") the engine's output via
`ctx.drawImage(...)`. 2D canvases have no practical count limit, so you can show
dozens of live shaders. Because programs are cached, a shader compiles the first
time it's ever needed and **never again** — so cards appear instantly after that.
→ Full code: `shader-system.md` (`shaderEngine.ts`, `ShaderThumb.tsx`).

### Model 2 — Seeds & determinism (this is the heart of uniqueness)

> The user asked: *"how are you approaching seeds?"* Here is the whole philosophy.

Think of every artifact as **"the room's shader + a single number (the seed)."**

- When a visitor creates an artifact, you generate one **`seed`** — a big pseudo-
  random integer derived from their text + time + randomness. This seed is **saved**
  on the artifact (its "DNA"). You never store the rendered picture.
- **Everything else about the artifact is derived deterministically from that
  seed**: which base shader it uses, its colour shift, its motion start-offset, its
  intensity, and — crucially — the *internal arrangement* of the shader (which
  flower grows where, which way the tornado spins, the crack pattern, the palette
  rotation).
- Because it's all derived from the saved seed, **regeneration is deterministic**:
  when the visitor comes back, you load the same seed and re-render — they get the
  *exact* same artifact. (This is the Art Blocks / fxhash model: store the token,
  reproduce the art.)
- Inside a shader, the seed arrives as a uniform called **`u_seed`**. The shader
  uses it to perturb its hashes / coordinates / palette lookups. Example: a flower
  shader picks each cell's flower with `hash(cellId)`. If you change that to
  `hash(cellId + u_seed)`, a different seed reshuffles which flower lands where —
  same shader identity, unique arrangement. You do the equivalent for colour
  (`palette(t + u_seed*…)`), rotation (`angle += u_seed`), direction, etc.
- A high-entropy seed makes two artifacts colliding astronomically unlikely. You do
  **not** need a database "is this a duplicate?" check or image fingerprinting.
  Keep it simple.

### Model 3 — The `u_unique` gate (never break the past)

Here's the subtlety that trips people up: if you wire `u_seed` into a shader, it
changes **every** artifact that uses that shader — including ones created *before*
you added the feature. The museum's promise is that an artifact, once made, is
permanent. So:

- Add a second uniform, **`u_unique`** (0.0 or 1.0), and **multiply every seed-
  driven term by it**: `hash(id + u_seed * u_unique)`, `angle += u_seed * u_unique`,
  `palette(t + u_seed * u_unique * 0.4)`.
- **Old artifacts** carry no "unique" flag → you pass `u_unique = 0` → all the seed
  terms vanish → the shader shows its **original, fixed look**, exactly as before.
- **New artifacts** are flagged unique → you pass `u_unique = 1` → they vary by
  seed.

So "how do things change?" → **only new creations change; everything already in the
gallery renders identically.** That's the whole point of the gate.
→ Full code & wiring: `artifact-uniqueness.md`.

---

## 4. How a seed flows — a concrete walk-through

A visitor in the "love" room writes "I never told you."

1. `seed = hash("I never told you" + "love" + Date.now() + random())` → e.g. `48217`.
2. **Which shader:** round-robin counter for "love" says "use base shader #2". (Round-
   robin = cycle through all of a room's base shaders before any repeats, so a
   visitor doesn't get the same family twice in a row; when a base shader does come
   back, the seed makes it look different anyway.)
3. **Derived values:** `intensity = 0.3 + (seed%100)/100*0.7`; `timeOffset =
   (seed%1000)/10` (so its animation starts at a different frame than its
   neighbours); `unique = true`.
4. Saved DNA: `{ seed:48217, shaderIndex:2, emotion:"love", intensity, timeOffset, unique:true }`.
5. **Render:** the card passes `seed`, `intensity`, `timeOffset`, and `unique?1:0`
   into the engine. The shader's `hash(id + u_seed*u_unique)` now lays out a flower
   field no other artifact has; a CSS `hue-rotate` derived from the seed nudges the
   colour within love's palette.
6. **Return visit:** load `dna`, render again → identical artifact, because nothing
   was random at render time — the randomness happened once, at step 1, and is
   frozen in `seed`.

That is the entire uniqueness approach: **one saved number → a deterministic,
unique, reproducible artifact, gated so the past is untouched.**

---

## 5. Your step-by-step plan (with verification gates)

> Do them in this order. Each builds on the last. Verify in a browser between steps.

**Phase A — Rendering (fixes "not loading").**
1. Add the shared engine (`shaderEngine.ts`) and the per-card component
   (`ShaderThumb.tsx`) from `shader-system.md`.
2. Replace the old per-card WebGL component in the gallery card with `ShaderThumb`.
3. *Verify:* scroll the whole gallery; **every visible card shows its real shader.**
   (Sample a card's 2D canvas with `getImageData` for non-black pixels, and eyeball
   it — silent fallbacks won't throw.)

**Phase B — Card sizing (fixes "unequal width/height").**
4. Give every card root **both** a width and a height: `w-full h-[430px] flex
   flex-col`; make the preview a fixed box `relative h-[230px] shrink-0` with the
   canvas `absolute inset-0`; body `flex-1 min-h-0`. Also add `w-full` to the
   **wrapper** around each card in the list/masonry. (Root cause: an absolutely-
   positioned canvas adds zero layout width, so a card with no `w-full` shrank to
   its text width.)
5. *Verify:* every card reports the same width & height (`getBoundingClientRect`),
   including a card with very short text.

**Phase C — Animation (fixes "feels dead").**
6. Pass `paused={false}` so on-screen cards animate ambiently (off-screen ones stop
   automatically via the IntersectionObserver). Render the real first frame
   immediately on scroll-in so it's never blank; the 2D canvas keeps its last frame
   when scrolled away.
7. *Verify:* cards animate when visible; scrolling away/back is instant, never blank.

**Phase D — Performance.**
8. In `ShaderThumb` cap the drawing-buffer DPR to 1 and the frame rate to ~30fps
   (fragment cost scales with the square of DPR). 
9. *Verify:* page holds ~60fps with several cards animating; idle (paused) cards do
   ~0 GPU work.

**Phase E — Uniqueness (fixes "everyone gets the same").**
10. Add `unique?: boolean` to the artifact DNA; in the generator set `unique:true`
    and choose the shader by round-robin; pass `seed`/`unique` through the render
    layer; gate every seed term in your shaders by `u_unique`; add the seed-based
    `hue-rotate`; de-clump same-shader cards in a row. (All in `artifact-uniqueness.md`.)
11. *Verify:* an old artifact (no `unique`) looks identical to before; two new
    artifacts on the same shader look clearly different; the same artifact re-renders
    identically after reload.

**Phase F — New shaders (optional).** Author more shaders to the GLSL contract,
gate seeds by `u_unique`, drop each in `generated/<id>.ts`, register in the index.
See `generated-shaders.md`.

---

## 6. The non-negotiable GLSL contract (for any shader you write or edit)

- Start with `#ifdef GL_ES` / `precision mediump float;` / `#endif`. No `#version`.
- Use **only** these uniforms: `u_resolution`, `u_time`, `u_seed`, `u_unique`
  (optional `u_intensity`). **No textures.**
- All `for` loops have **constant bounds** (`for(float i=0.;i<8.;i++){ if(i>=n) break; … }`).
  No `while`. Declare every variable. Define functions before use.
- Centred coords: `vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;`
- Animate with `u_time` (slow, graceful). End with
  `gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);`
- **Gate every seed-driven term by `u_unique`** (Model 3).
- Strong contrast: dark/flowing background, motif reads clearly; monochrome/duotone
  needs a wide value range.

---

## 7. What NOT to do

- Don't give each card its own WebGL context (the original bug).
- Don't query compile/link status on the per-frame/per-card path (it stalls).
- Don't recompile a shader on every scroll (cache by source).
- Don't hide a non-rendering shader behind a gradient — fix the render.
- Don't store rendered output; store the seed/DNA.
- Don't introduce randomness at render time (breaks reproducibility) — randomise
  once at creation, save the seed.
- Don't speed up / recolour shaders by editing them blindly; you can't see pixels —
  render them in the app and look.

---

## 8. Where to go from here (next steps & extension points)

- **Reseed the demo/sample data** so the gallery showcases the new shaders
  immediately (existing seeded cards still use the original shaders until reseeded).
- **Tune the hue-rotate range** (currently ±18°) — widen for more colour variety,
  narrow to hug each room's palette.
- **Hero/detail view:** keep a *dedicated* WebGL context for the single large
  shader (the shared engine is for the many thumbnails); it must run the same
  `ensureSeedUniforms` and accept the same `seed`/`unique`.
- **Hard uniqueness guarantee (only if ever needed):** add a `dnaHash` column with
  a unique DB constraint and regenerate-on-collision. Not necessary at this seed
  entropy.
- **More rooms / shaders:** follow §6 and `generated-shaders.md`'s "house rules".
- **Accessibility/perf knobs:** respect `prefers-reduced-motion` (pause animation),
  and consider lowering `fps` further on low-power devices.

---

## 9. Build a verification harness first (you can't see pixels otherwise)

Add a temporary route (e.g. `/verify`) that maps your shader list through
`ShaderThumb` with `unique={true}` in a labelled grid. Screenshot it, fix anything
flat/low-contrast/broken, then remove the route. This is the only reliable QC for
shader work — a human or a preview tool must look at the output.
