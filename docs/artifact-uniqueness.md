# Artifact Uniqueness — "No Two Visitors Get the Same Artifact"

How every generated artifact ends up unique, reproducible, and on-brand for its
room — without changing any artifact already created. Pairs with
`shader-system.md` (rendering) and `generated-shaders.md` (the shaders themselves).

## Goals

1. **No two artifacts look alike** — each new creation is a unique variation.
2. **Faithful to the room** — variation stays inside the room's visual/emotional family (same shader identity, shifted arrangement & palette).
3. **Reproducible** — a returning visitor sees the *exact* same artifact, regenerated from saved data (never re-randomised).
4. **Existing artifacts never change** — turning the system on must not alter anything already in the gallery.
5. **No look-alikes in the same row** of the gallery.

## Core principle

> An artifact = **the room's existing shader** + a unique **Shader DNA**.
> Store the **DNA**, never a rendered image/video. (This is how Art Blocks / fxhash work.)

A 32-bit-ish random seed plus continuous variation ranges makes accidental
collisions astronomically unlikely — so you do **not** need a DB fingerprint or a
visual-similarity check. Keep it simple: a deterministic seed + (optionally) a
unique-hash DB constraint later if you ever want a hard guarantee.

---

## The data model

```ts
export interface ArtifactDNA {
  seed: number;        // drives everything; stored, so regeneration is deterministic
  shaderIndex: number; // which base shader in the room
  emotion: string;     // room id
  intensity: number;   // 0.3..1.0  (u_intensity)
  timeOffset: number;  // different starting frame so cards don't sync
  // True for artifacts created after seed-driven uniqueness was introduced.
  // Drives the u_unique shader flag: new artifacts (true) vary by seed;
  // older artifacts (undefined/false) render exactly as before.
  unique?: boolean;
}
```

## Generation

```ts
function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Round-robin through a room's base shaders so generations cycle through ALL of
// them before any repeats. With 5 base shaders: gen 1→0, 2→1 … 5→4, 6→0 (a new
// seed makes it LOOK different), 7→1, and so on. Counter persists per room.
function nextShaderIndex(emotion: string, count: number): number {
  if (typeof window === "undefined" || count <= 0) return 0;
  const key = `unsent_genidx_${emotion}`;
  let cur = 0;
  try { cur = parseInt(window.localStorage.getItem(key) || "0", 10) || 0; } catch { cur = 0; }
  const idx = cur % count;
  try { window.localStorage.setItem(key, String((cur + 1) % (count * 1000))); } catch {}
  return idx;
}

export function generateArtifact(emotion: string, message: string /* …other fields */) {
  // High-entropy seed → uniqueness. Stored on the artifact, so regeneration is
  // deterministic (a returning visitor re-renders from this exact seed).
  const seed = simpleHash(message + emotion + Date.now() + Math.random().toString());
  const shaders = EMOTION_SHADERS[emotion] || EMOTION_SHADERS.grief;

  // Round-robin pick (cycles all base shaders before repeating); seed stays
  // highly random so a repeated base shader still looks different.
  const shaderIndex = nextShaderIndex(emotion, shaders.length);
  const shader = shaders[shaderIndex];

  const intensity  = 0.3 + ((seed % 100) / 100) * 0.7; // visually distinct
  const timeOffset = (seed % 1000) / 10;               // de-sync start frames

  return {
    /* …id, title, etc… */
    dna: { seed, shaderIndex, emotion, intensity, timeOffset, unique: true },
    shader,
  };
}
```

> **Returning visitor:** load the saved `dna` and re-render — do **not** call
> `generateArtifact` again. Same seed → identical artifact.

---

## The `u_unique` gate (this is what protects existing artifacts)

Every seed-driven term in a shader is **multiplied by `u_unique`**:

```glsl
// arrangement:  hash(id + u_seed * u_unique)
// phase/spin:   angle += u_seed * u_unique
// palette ramp: pal(t + u_seed * u_unique * 0.4)
// direction:    dir = mix(1.0, sign(hash(seed)-0.5), u_unique)
```

- **Existing artifacts** have no `unique` flag → the render layer passes
  `u_unique = 0` → every seed term zeroes out → the shader shows its **fixed
  canonical composition**, exactly as before the system existed.
- **New artifacts** have `unique: true` → `u_unique = 1` → arrangement, phase,
  palette and travel direction all vary by `u_seed`.

The shared engine's `ensureSeedUniforms` (see `shader-system.md`) auto-declares
`u_seed`/`u_unique`, so a shader can just *use* them without boilerplate.

### Plumbing the flag through the render layer

```tsx
// engine: renderShader(frag, w, h, time, seed, intensity, unique /* 0|1 */)
// card:
<ShaderThumb
  fragmentShader={artifact.shader.glsl}
  seed={artifact.dna.seed}
  timeOffset={artifact.dna.timeOffset}
  intensity={artifact.dna.intensity}
  unique={!!artifact.dna.unique}   // ← gate
  paused={false} maxDpr={1} fps={30}
/>
// hero/detail canvas: pass the same unique / seed.
```

---

## Palette expansion (colour variation, in-family)

Rather than editing 25 shaders, palette variation is a **CSS hue-rotate +
saturation** on the canvas, derived from the seed and gated by `unique`:

```tsx
const filter = unique
  ? `hue-rotate(${(seed % 37) - 18}deg) saturate(${1 + (seed % 22) / 100})`
  : "none";
// applied to the <canvas> in ShaderThumb AND the hero canvas.
```

±18° keeps each artifact recognisably within its room's palette while still
reading as a distinct colourway across the collection. Widen the range for more
variety, narrow it to stay tighter to the room.

> Shaders that drive palette **internally** (via `pal(... + u_seed*u_unique*K)`)
> get colour variation even without the CSS filter; the filter is a universal
> top-up that also covers shaders whose palette is otherwise fixed.

---

## No look-alikes in the same row

When listing a room, spread identical shaders apart so two of the same don't land
side-by-side (which reads as a duplicate). Keeps sort order otherwise:

```ts
function deClumpByShader<T extends { dna: { shaderIndex: number } }>(items: T[]): T[] {
  const pending = [...items];
  const out: T[] = [];
  while (pending.length) {
    const recent = out.slice(-3).map((a) => a.dna.shaderIndex);
    let idx = pending.findIndex((a) => !recent.includes(a.dna.shaderIndex));
    if (idx === -1) idx = 0; // all remaining clash — take the next anyway
    out.push(pending.splice(idx, 1)[0]);
  }
  return out;
}
// apply to the filtered+sorted list right before rendering the grid.
```

(With per-seed palette variation on, even same-shader cards differ — but this
guarantees row-level distinctness regardless.)

---

## What NOT to do

- Don't store rendered output (video/image) — store DNA.
- Don't let an artifact change across reloads (no live `Math.random()` at render time; randomness happens once, at creation, then the seed is saved).
- Don't add variation a shader can't actually render — wire it through a parameter the shader has (the `u_seed`/`u_unique` injection points above).
- Don't build a visual-similarity service up front — unnecessary at this seed entropy.

## Checklist

- [ ] `ArtifactDNA.unique` added; `generateArtifact` sets `unique: true` + round-robins `shaderIndex`.
- [ ] Render layer passes `seed` and `unique` into `renderShader` / card / hero.
- [ ] Each shader gates seed terms by `u_unique`.
- [ ] CSS hue-rotate applied (gated by `unique`) in both card and hero canvases.
- [ ] `deClumpByShader` applied to the room list.
- [ ] Verify: an existing artifact (no `unique`) looks identical to before; two new artifacts on the same shader look clearly different; same artifact re-renders identically on reload.
