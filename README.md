# The Unsent Museum

An interactive memorial museum where visitors write a message they never sent and watch it become living shader art.

Five rooms (Love, Grief, Hope, Regret, Closure), each a portal into a particular kind of unsaid thing. A visitor enters a room, writes the message they never sent (up to 180 characters), and gets back a procedural WebGL artifact: a piece of living shader art born from their words, displayed in a gallery alongside other visitors' unsent messages.

## Run it

```
npm install
npm run dev
```

Then open http://localhost:5173.

Routes:

| Path | What |
|------|------|
| `/` | Landing page: the five doors |
| `/room/:emotion` | Room intro video, then ENTER MEMORY to write |
| `/gallery` and `/gallery/:emotion` | Full artifact gallery (3D coverflow + grid views) |
| `/reveal/:id` | A single artifact page (linkable, shareable) |
| `/uber` | Shader playground: Love, Grief, Hope, Regret, Closure, Flower, ASCII tabs |

## The shader system

The gallery shows artifacts produced by a procedural shader engine. Three layers, all sharing one WebGL context.

**Hand-crafted shaders.** ~50 individual GLSL pieces, one per visual idea (kintsugi, sumie, adinkra, enso, halftone, willow-rain), distributed across the five emotion rooms. These are the cultural and narrative pieces of the museum, each one written deliberately.

**Uber-shaders.** One parametric "mega-shader" per emotion (`grief-uber.ts`, `hope-uber.ts`, `love-uber.ts`, `regret-uber.ts`, `closure-uber.ts`) that produces ~1,440 distinct seed-reproducible looks via a five-gene system:

| Gene | Examples (Grief) |
|------|------------------|
| `field` | flow, ridge, drift, void, whirlpool, tornado, well, dust |
| `domain` | radial, wave, fractured, smoke |
| `palette` | ash, indigo, sepia, blue-grey, charcoal |
| `surface` | soft, grain, ribbon |
| `decay` | slow, pulse, recede |

Same gene structure across all five emotions, different vocabularies per room.

**Special shaders.** A flower-mandala uber that produces layered translucent petal mandalas in warm tones on deep wine (Marigold Heart, Hibiscus Flare, Honey Petal, Velvet Hibiscus vibe). A 16-scene ASCII grief shader (crying face, weeping eye, broken heart, empty chair, melting candle, hidden moon, spiral void, etc.) that renders each frame as a coarse character grid where every cell carries a glyph chosen from the scene's SDF intensity at that point.

The engine itself (`src/app/components/shaderEngine.ts`) compiles each fragment shader once, caches the program, and blits results to per-card 2D canvases so the gallery can show dozens of live shaders at once without exhausting the browser's WebGL context limit (~8-16). Seeds are normalized to the range 0..100 at the GLSL boundary so hash functions stay numerically coherent.

## The artifact pipeline

When a visitor writes a message, `generateArtifact()` produces an `Artifact` object with:

- a deterministic `seed` (so visiting the artifact again yields the same look)
- a `shaderIndex` picked from the emotion's full shader pool (including the new uber-shaders and ASCII scenes)
- a generated title, interpretation, and metadata

The artifact persists to the `public.artifacts` table in Supabase via the JS client (with Row Level Security enforcing anonymous-write / public-read), and is also cached in `localStorage` so it appears in the gallery immediately even if the backend is unreachable.

## Accessibility

Passes WCAG 2.1 AA:

- Global `:focus-visible` ring; no element relies on default browser focus
- `prefers-reduced-motion` honored via framer-motion's `MotionConfig reducedMotion="user"` and a CSS guard
- `<main id="main">` landmark + skip-to-content link
- Modals carry `role="dialog"` + `aria-modal` + Esc handler + focus-return
- 3D carousel exposes `role="region"` + `aria-roledescription="carousel"` + per-slide `role="group"`
- Form labels associated via `htmlFor`; character counter announced via `aria-live="polite"`
- Body-text contrast at 4.5:1+ against the deep wine background

## Project layout

```
src/
  app/
    pages/                    : LandingPage, EmotionRoom, ArtifactGallery, ArtifactReveal, UberPlayground
    components/               : ShaderCarousel3D, ShaderArtifactCard, ArtifactDetailModal, ArtifactForm, ...
    components/shaderEngine.ts: shared WebGL context, program cache, normalized u_seed
    data/
      artifacts.ts            : seed/mock artifacts + generateArtifact()
      shaders.ts              : in-line emotion shaders + EMOTION_SHADERS export map
      uberGenes.ts            : gene decoder + per-emotion gene labels (shared by playground + modal)
      generated/              : per-shader files (kintsugi, sumie, *-uber.ts, ascii-scenes, ...)
      generatedShaders.ts     : registry pulling all generated/ shaders into a GENERATED map
    hooks/                    : useArtifacts (Supabase fetch + local cache), useLikeStore
  styles/
    a11y.css                  : global focus ring, skip link, prefers-reduced-motion guard
    theme.css                 : design tokens
supabase/
  setup.sql                   : artifacts table + RLS policies + atomic counter functions
  migrations/                 : versioned schema for `supabase db push`
```

## The playground

`/uber` is the shader playground. Use it to:

- Switch between Love / Grief / Hope / Regret / Closure / Flower / ASCII shaders
- Slide through 10,000 seeds; randomize, step forward/back
- Toggle `seed on` vs `canonical` to compare the seed-driven look against the baseline
- Read the decoded genes (field / domain / palette / surface / decay) for the current seed
- See the shader source path printed at the top so you know exactly which file to edit

Vite HMR picks up GLSL edits live, so iterating on a shader is: edit the `glsl` template string, save, watch the playground reload.

## Built with

- React + React Router + framer-motion (`motion/react`)
- Vite
- Raw WebGL 1.0 fragment shaders (no Three.js, no ogl)
- Tailwind CSS + custom design tokens
- Supabase (Postgres + RLS) for persistence, accessed directly via `@supabase/supabase-js`
- shadcn/ui for some primitives

## Credits

Built by [@ChisomAniefuna](https://github.com/ChisomAniefuna).

The shader engine architecture borrows ideas from solo-builder generative tools that proved the "one uber-shader, many seeds, polished export" pattern works:

- [LUMEN](https://github.com/Leonxlnx/lumenshaders) by Leonxlnx: one WebGL2 uber-shader with a 12-gene synthesizer
- [DESIGN≒FORMULA](https://amix-design.com/asoboad/tools/d-formula/) by ASOBOAD: parametric Lissajous/rose/spirograph curves with smart SVG export
- [FLUID v2](https://fluid.krackeddevs.com/) by TheMasterOfNone: noise/flow/gyroid fields with stackable post-effects and embed-able iframes
- [ASCII Magic](https://www.ascii-magic.com/) by Kailash: image/video to ASCII, 13 styles, stacked post-effects, MP4 export

Pair-programmed with Claude Opus.
