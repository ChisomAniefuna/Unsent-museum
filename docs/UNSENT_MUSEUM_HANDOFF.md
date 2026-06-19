# The Unsent Museum — Engineering Handoff

## 0. Master Prompt for the Next AI (read this top-to-bottom, then act)

You are taking over **The Unsent Museum** in Figma Make. It is a competition-grade React + TypeScript + Vite app. Visitors enter an emotion room (Love, Grief, Hope, Regret, Closure), write a short message they never sent (max 180 chars), and it becomes an animated WebGL shader "artifact" in a public gallery. About 100,000 visitors are expected, so polish, performance, and visual correctness matter.

**Stack to use, no substitutions:** React 18 + TypeScript + Vite, React Router (`BrowserRouter`, not Hash), motion/react for animation, Tailwind utility classes for layout, **raw WebGL (no three.js, no regl)** for shaders, optional Supabase edge function (Hono on Deno + KV) for persistence. The app must fully degrade to mock data when the backend is down.

**Your concrete to-do list, in this order.** Walk through each item, open the named file in the project, verify the requirement is in place, and **implement it now if it isn't**. Do not skip a row because "it probably works" — if you can't confirm it from the code, treat it as missing and implement it. After each batch, reload the Figma Make preview and visually verify. Recipes for each item live in the section linked at the end of the row.

**A. Landing page (`src/app/pages/LandingPage.tsx`, `EmotionDoorImage.tsx`, `EmotionDoor.tsx`, `src/imports/*`):**
1. Outer section must be `<section className="h-[100dvh] overflow-hidden flex-col justify-center">` — page never scrolls on desktop OR mobile. → §5.1
2. Header is `text-[clamp(2.3rem,6vw,5rem)]` with `letterSpacing -0.05em`, `lineHeight 0.9`; subtitle `clamp(1.05rem,1.8vw,1.5rem)`. → §5.2
3. All 5 doors are 900px WebP at ~240 KB each (`src/imports/{love,grief,hope,regret,Closure}_door.webp`). Closure MUST have a `.webp`; it was originally PNG-only and dropped to the colour-arch. If any door is missing the WebP, regenerate from the PNG (`cwebp -q 82 -resize 900 0`). → §1A recipe #1
4. All 5 door WebPs are preloaded at high priority on module import (`<link rel="preload" as="image" fetchpriority="high">`) in `EmotionDoorImage.tsx`. → §1A recipe #2
5. Each door box reserves height via `aspect-ratio: 1340/2200` and shows a CSS colour-arch placeholder that fades out once the real door decodes (decode-probe via `new Image()` + `complete`). No layout jump on first paint. → §1A recipe #3
6. Hover-preview room images use `loading="lazy"`. If they go back to `eager` the doors lose the bandwidth race and the placeholder wins — user reaction: *"My doors. My doors."* → §1A recipe #4
7. Gallery entry button: grid icon on mobile (`<LayoutGrid className="sm:hidden">`), the literal text "Explore Gallery" on desktop (`<span className="hidden sm:inline">Explore Gallery</span>`), no icon on desktop. → §1 row "Gallery entry button"

**B. Shader pipeline (`src/app/components/shaderEngine.ts`, `WebGLCanvas.tsx`, `ShaderThumb.tsx`):**
8. ONE shared WebGL context across the entire app, in `shaderEngine.ts`. Per-card 2D canvases blit from that shared GL canvas. Never spawn a context per card. → §5.13
9. `ShaderThumb` runs a fps-capped `requestAnimationFrame` loop gated by an `IntersectionObserver` (visible → animate, off-screen → fully stop the rAF, keep last frame on the canvas). Cards animate ambiently — they are NOT hover-gated. → §5.13
10. **`u_seed` MUST be normalized to a 0–100 range before reaching GLSL.** Use `gl.uniform1f(u.seed, ((seed % 10000) + 10000) % 10000 / 100)`. Apply in BOTH `shaderEngine.ts` AND `WebGLCanvas.tsx` (both render loops in WebGLCanvas). Raw DNA seeds from `simpleHash(message + emotion + Date.now() + random)` reach 100M+ and break GLSL `fract(sin(dot(...)))` hash functions, making every user-created artifact render as a flat gradient. Mock artifacts have small hand-tuned seeds so they look fine — this masks the bug. **This is the single most common regression in the project. Do not "fix" it by changing `simpleHash` instead; the DNA seed must stay huge for collision detection and per-seed hue filtering.** → §5.13B
11. Uniforms exposed to every shader: `u_resolution, u_time, u_seed, u_intensity, u_unique`. The `shaderEngine` injects declarations for `u_seed` and `u_unique` if a shader source omits them. → §5.13

**C. Artifact data model (`src/app/data/artifacts.ts`, `src/app/data/shaders.ts`, `generatedShaders.ts`):**
12. Artifact DNA shape: `{ seed, shaderIndex, emotion, intensity, timeOffset, unique }`. `generateArtifact` is the single entry point that builds an Artifact from a user message; it stamps `createdAt: new Date().toISOString()` (today's real timestamp, never a baked-in date). → §5.12
13. `uniqueSeed(message, emotion)` re-rolls the seed (up to 8x) if `dnaKey(d)` (= `${emotion}:${shaderIndex}:${seed}`) is already known. `knownSeeds` is seeded from `MOCK_ARTIFACTS` on first use. → §5.10
14. New artifacts set `dna.unique = true` → drives the `u_unique` flag in GLSL + a per-seed `hue-rotate(±18°) saturate(+0–22%)` CSS filter on the thumbnail. This is how repeats of the same base shader still look distinct. → §5.11
15. `nextShaderIndex(emotion, count)` round-robins the room's shader family via localStorage, so all base shaders are used before any repeat. → §5.10
16. `withSafeShader(artifact)` rebuilds a missing `shader` field from `emotion + shaderIndex` so the reveal page never crashes on a lean (server-stripped) artifact. → §5.12

**D. Gallery (`src/app/pages/ArtifactGallery.tsx`, `src/app/hooks/useArtifacts.ts`):**
17. Gallery shows exactly **5 seed artifacts per room** (25 total). `SEED_IDS` in `artifacts.ts` is a hardcoded set; `SEED_ARTIFACTS = MOCK_ARTIFACTS.filter(a => SEED_IDS.has(a.id))`. The Regret 5 include `mock-mask` and `mock-heads`. → §5.15
18. `useArtifacts()` merges `[...created, ...SEED_ARTIFACTS]` deduped by id. **Server artifacts are NOT merged into the display list** — only seeds + locally-created. There is NO "Generate More" button and NO `curation.ts`. → §5.15
19. User-created artifacts go through `addCreatedArtifact(artifact)` → localStorage key `unsent_created_v1`, lean (shader stripped on write, rebuilt via `withSafeShader` on read), deduped by id, newest first. → §5.15
20. Default sort is **`"newest"`** so a fresh creation leads the gallery. Sort options remain `Newest / Most Liked / Most Shared`. → §5.16
21. Four filters live in the top-right control cluster IN THIS ORDER: 3D Flow ⇄ Grid toggle, Room dropdown, Sort dropdown, Search input. Never remove the Room filter — it has been deleted by accident before. → §5.4B
22. Emotion tags on cards show ONLY in "All Rooms" view (`showTags = activeEmotion === "all"`). In a specific room the visitor already knows the emotion. → §1 row "Gallery layout"
23. Regret room pins `custom` artifacts (mask + heads) to the front of `filtered` so they always lead. → §5.15
24. Back to Museum button is `position: fixed left-4 top-4 md:left-8 md:top-6 z-50` with backdrop blur — ALWAYS visible while scrolling, never inside the scrolling header. → §1 row "Back button pinned top-left"

**E. 3D Carousel (`src/app/components/ShaderCarousel3D.tsx`):**
25. Real coverflow ring with `perspective` + `preserve-3d`. Windows to `|index - center| <= 4` — only the center and its 8 neighbors animate; the rest hold a frozen last frame. Drag, mouse wheel, arrow keys, click-to-center, click-center-to-open. → §5.4
26. Keyboard handler must guard against form fields: `if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;` — otherwise typing in Search hijacks the carousel. → §1 row "3D carousel"
27. Branches on `artifact.custom` to render `CryingMaskCard` / `SadnessHeadsCard` / `ShaderArtifactCard` as REAL ring members (not a separate strip). → §1 row "Special cards in carousel"

**E2. Crying Mask + Sadness Heads cards (`src/app/components/CryingMaskCard.tsx`, `SadnessHeadsCard.tsx`, `src/imports/masked-face.webp`, `src/imports/sadness-heads.webp`):**

> **If the user reports the mask/heads cards are not showing in the gallery, jump here FIRST.** This bug has recurred more than once.

27a. The Regret room ships two non-shader canvas pieces — *"The Face We Wore"* (pixelated crying-mask portrait, id `mock-mask`) and *"Five Ways of Grieving"* (5-up ASCII sadness-heads grid, id `mock-heads`). Both are real members of `MOCK_ARTIFACTS` with `custom: "mask"` / `custom: "heads"`, and both ids MUST be in `SEED_IDS`. → §1D
27b. The source image files MUST exist on disk: `src/imports/masked-face.webp` (~86 KB) and `src/imports/sadness-heads.webp` (~62 KB). The renderers sample these images to drive their pixel/ASCII output. If the files are missing, both cards stay black. → §1D
27c. BOTH renderers (gallery masonry grid AND 3D carousel) MUST branch on `artifact.custom` before rendering — `"mask"` → `<CryingMaskCard …>`, `"heads"` → `<SadnessHeadsCard …>`, else `<ShaderArtifactCard …>`. If the branch is missing in either place, the slot either disappears or falls through to a regret shader. The exact branch block is in §1D. → §5.4 + §5.4B
27d. `withSafeShader` MUST preserve the `custom` field. If it strips or omits it, the card branch falls through to ShaderArtifactCard and the canvas piece vanishes. → §5.12
27e. The Regret room pin in `ArtifactGallery.tsx`'s `filtered` memo MUST surface `custom` artifacts first so they always appear in the opening view, not pushed off-screen by like-sorted shader cards. → §5.15
27f. Both card components MUST gate their canvas rAF loop with an `IntersectionObserver` (same pattern as `ShaderThumb`) so off-screen heads don't burn battery. → §1D
27g. The detail modal AND `/reveal/mock-mask`/`/reveal/mock-heads` MUST render the LIVE canvas (via `CryingMaskRender` / `SadnessHeadsRender`), NOT the fallback regret shader. → §1D
27h. Download of a `custom` piece MUST export the LIVE canvas (`previewRef.current.querySelector('canvas')`), NOT the fallback shader, via `downloadArtifact(artifact, bg, liveCanvas)`. → §1D + `downloadArtifact.ts`
27i. The `<canvas>` element in BOTH `CryingMaskRender` AND `SadnessHeadsRender` MUST use `touchAction: "manipulation"` (NOT `"none"`). `touchAction: "none"` blocks tap-to-click translation on mobile, which means tapping the card on a phone does NOT open the detail modal. This was a real bug that prevented mask/heads cards from being clickable on mobile. → §1D

**F. Form & creation flow (`src/app/components/ArtifactForm.tsx`, `EmotionRoom.tsx`):**
28. Message input capped at **180 characters** with `maxLength={180}`, an `.slice(0,180)` guard in onChange, a live counter, and `.trim()` on submit. Empty messages blocked. → §5.6
29. Generation loader text is personal, short, three stages: *"Listening to what you couldn't say…"*, *"Turning {emotion} into light…"*, *"Letting it breathe…"*. Per-stage delay 130ms, final pause 150ms. Total ~0.5s. Do NOT bring back "Shaping artifact DNA / Placing it in the museum." → §1 row "Generation loader text"
30. After `generateArtifact()`, `EmotionRoom.handleArtifactGenerated` calls `addCreatedArtifact(artifact)` BEFORE the network save so the artifact enters the gallery even if Supabase is down. → §5.15
31. The room (`EmotionRoom.tsx`) opens straight to the writing form, not a CTA card. The cinematic video + room card sit BEHIND the form so closing reveals the room. → memory `room-opens-to-form`

**G. Reveal page (`src/app/pages/ArtifactReveal.tsx`):**
32. Back button is `fixed left-4 top-4 md:left-8 md:top-6 z-50` glass-blur, IDENTICAL placement to the gallery back button. NOT centered in a row next to "View Gallery". → §1 row "Back button pinned top-left"
33. NO decorative "Artifact Born" badge above the title. The title leads. → §1 row "Reveal: Artifact Born badge removed"
34. Animation cascade fits in ~0.75s total (delays 0 → 0.75s, durations 0.4–0.6s). Do not stretch it back to 1.5s. → §1 row "Generation loader text"
35. On cold load `/reveal/:id` first checks `MOCK_ARTIFACTS.find(a => a.id === id)` before any network call, so shared links to seeded artifacts always resolve. → §1 row "Shared reveal links work"
36. Uses `downloadArtifact(artifact, bg, previewRef.current)` for downloads — passes the live preview canvas so custom (mask/heads) pieces export correctly. → §1 row "Mask/heads download fixed"

**H. Likes / Download / Share (`src/app/hooks/useLikeStore.ts`, `downloadArtifact.ts`):**
37. ONE shared like store (`useLikeStore.ts`) backed by localStorage via `useSyncExternalStore`. Exposes `useLiked(id)`, `toggleLike(id)`, `likeCount(id, base)`. One like per browser, toggleable. Replace any per-surface like state with this store. → §5.7
38. Downloads render the shader at 1024² through `renderShader`, blit to a 2D canvas, export PNG with a slugged filename. For `custom` artifacts, read the live on-screen canvas via `previewRef.current.querySelector('canvas')` instead. Defer `URL.revokeObjectURL` with `setTimeout(..., 0)` for Safari. → §5.8 + `downloadArtifact.ts`
39. Share uses Web Share API with clipboard fallback; builds `${origin}/reveal/${id}`. → §5.9

**I. Room copy (`src/app/data/rooms.ts`):**
40. Every room MUST have a `tagline` and `description` written in **first-person unsent-message voice**, not generic literary copy. The taglines sound like things a real person would whisper or text to someone they couldn't reach. → §1E
41. Required taglines (do not regress from this voice — see §1E for the full table and banned phrasings):
    - love: *"I almost said it. A hundred times."*
    - grief: *"I still set the table for two."*
    - hope: *"One day you'll read this and laugh."*
    - regret: *"I should have picked up the phone."*
    - closure: *"I forgive you. I forgive me."*
42. BANNED — do NOT bring these back, they were rewritten for being generic museum-brochure copy: *"Things the heart kept saying."*, *"Where absence becomes shape."*, *"Where light returns slowly."*, *"Where choices echo."*, *"Where endings learn to rest."* → §1E
43. Rule of thumb: if the line could appear on a self-help mug, it's generic. If it could be a real text someone sent themselves at 2am, it's right. → §1E

**J. Hard non-negotiables (breaking any of these is a failure):**
- Landing never scrolls.
- Every shader renders visibly. A flat-gradient card means `u_seed` normalization (#10) is broken.
- The user's message and title are sacred. The system only ever picks the *shader/visual* — never paraphrases, summarizes, or rewrites the message/title. Dates always reflect real creation time.
- No two artifacts identical (DNA-key re-roll guard, `u_unique` flag, per-seed CSS filter all working together).
- No "Generate More" button, no `curation.ts`, no top-5-by-likes default — that approach was removed.
- Never use em dashes anywhere (copy, comments, or chat); use commas, periods, or colons.

**K. How you should work:**
- Read §1A (landing), §1C (shaders), §5.13 + §5.13B, §5.15, and §8 in full before touching code. Most regressions come from not knowing these systems exist.
- Walk through items A–H above row by row and implement any that are missing. Recipes are linked.
- Only after that verification pass: fix what the user asks you to fix, in the smallest surgical change possible. Do not refactor, do not "improve" working systems, do not introduce abstractions for hypothetical future features.
- Verify every change in the Figma Make live preview. After every edit: reload the preview, watch the browser console for errors, and screenshot the affected screen before reporting "done". Never claim a change works without visual proof in the preview.
- Run §9's testing checklist end-to-end on desktop AND mobile before declaring a feature complete. Especially the "generate a fresh artifact in each of the 5 rooms → all show a visible animated shader" check.
- Companion file `DOCS/ASSET_GENERATION_PROMPTS.md` covers how to author new shaders (prompt template + reference images per room) and the exact wiring (`generated/*.ts` → `generatedShaders.ts` → `MOCK_ARTIFACT` → `SEED_IDS`). Read it before adding any shader.
- Where something is a recommended next step not yet wired in, it is explicitly marked **[TO APPLY]**.

Everything below this section is the supporting detail: the exact code, the file-by-file fix recipes, the full testing checklist, and the asset/Supabase docs. Use it as reference while you implement the list above.

---

---

## 1. Required Implementations (build every row into the app)

> **Treat this table as a work order, not a status report.** Every row below is a requirement that the final app MUST satisfy. Open the named file and build it. Some rows may already exist from an earlier version of the project; if they do, confirm they behave as described in the running preview and move on. If they don't, implement them per the linked recipe. The §1A and §1C tables that follow are stricter, file-level work orders for the two highest-risk surfaces (landing page and shader pipeline).


| Area | What changed |
|---|---|
| **Landing page — one screen** | Section changed from `min-h-full` (could overflow + scroll) to `h-[100dvh] overflow-hidden justify-center`. The whole hall (header + subtitle + 5 doors, or mobile door-carousel) now fits one viewport with no scroll on desktop and mobile. |
| **Header font** | Reduced from `text-[clamp(2.8rem,8vw,7.2rem)]` to `text-[clamp(2.3rem,6vw,5rem)]`; line-height `0.88`→`0.9`, tracking `-0.055em`→`-0.05em`. Subtitle shrunk too (`clamp(1.3rem,2.2vw,1.85rem)`→`clamp(1.05rem,1.8vw,1.5rem)`). |
| **Landing spacing** | Removed large fixed margins (`mt-16 md:mt-24`, `mt-[min(18vh,9rem)]`, `mt-[min(10vh,4rem)]`) in favour of `justify-center` + small clamped gaps (`mt-[min(7vh,3.5rem)]` desktop grid, `mt-[min(5vh,2.25rem)]` mobile carousel). |
| **Landing images → WebP / size reduction** | Door art was 2.4–3.9 MB PNGs (1340px); converted to **~240 KB WebP at 900px** (~90% smaller). Room hero/fallback images PNG ~2–2.8 MB → WebP ~100–160 KB. Special pieces: `masked-face.png` 2.2 MB → 86 KB WebP, `sadness-heads.png` → 62 KB WebP. Museum hall background → `museum_hall_opt.jpg` 308 KB. See §1A. |
| **Closure had only a PNG** | `Closure_door.png` (2.6 MB) had no optimized variant, so the closure door loaded slowly / fell back to the colour-arch. Added `Closure_door.webp` (242 KB) + `closure_image.webp`; closure now matches the other rooms. |
| **Doors load immediately, never the placeholder** | All 5 door WebPs are `<link rel="preload" as="image" fetchpriority="high">`-injected at module load; an instant CSS colour-arch placeholder (height reserved by `aspect-ratio: 1340/2200`) fades out once the real door decodes (probe via `new Image()` + `complete`); hover-preview images are `loading="lazy"` so they never starve the doors. See §1A. |
| **Gallery entry button** | Was "The Collection →". Now: **icon-only (grid) on mobile**, **"Explore Gallery" text-only on desktop** (`sm` breakpoint switches them). |
| **3D carousel** | Real coverflow ring. Removed the purple pixel-burst effect. Removed the like-count badge from cards (clutter). Added `showTags` so the emotion tag shows only in "All Rooms". Branches on `artifact.custom` to render the mask/heads canvases as real ring members. Keyboard handler now ignores typing in inputs. |
| **Gallery layout** | Carousel (default) + grid toggle. Emotion tags show **only** in "All Rooms" view. Room filter dropdown always visible. `deClumpByShader` spreads look-alikes apart. |
| **Special cards in carousel** | "The Face We Wore" (pixel mask) and "Five Ways of Grieving" (ASCII heads) became real `MOCK_ARTIFACTS` with `custom: "mask" \| "heads"`, riding the 3D ring (not a separate strip), with exported canvas renderers `CryingMaskRender` / `SadnessHeadsRender`. |
| **Mask + heads pinned in Regret** | The Regret room is editorially pinned so the mask + heads lead the room (for attention), regardless of like order. See §5.15. |
| **5 seed artifacts per room** | The gallery starts with **5 seed artifacts per room** (25 total, selected via `SEED_IDS` in `artifacts.ts`). Users create more by filling the form in any emotion room. Created artifacts are cached in localStorage (`addCreatedArtifact` / `unsent_created_v1`) and merged in `useArtifacts`, so every user-created artifact appears immediately and survives reload. Default sort is **Newest** so a fresh creation leads. Server artifacts are saved for persistence but not merged into the display list (gallery = seeds + locally created only). |
| **Exact user words** | The gallery card shows the visitor's **exact title and message** (excerpt = the full ≤180-char message, never paraphrased). Only the shader is system-chosen. |
| **Dates = generation day** | `generateArtifact` stamps `createdAt` with the current date, not a baked-in date. |
| **Unique seeds (no duplicates)** | `uniqueSeed`/`dnaKey` re-roll a generated seed if its `emotion:seed` already exists, so no two artifacts collide. |
| **Back button pinned top-left** | Both the gallery AND the reveal page have a `position: fixed` top-left back button (z-50, glass blur). Always visible while scrolling, never centered in a row with other buttons. |
| **Reveal: "Artifact Born" badge removed** | The decorative badge above the title on the reveal page was removed; the title leads now, cleaner focus. |
| **Generation loader text** | Less generic, more personal: *"Listening to what you couldn't say… / Turning {emotion} into light… / Letting it breathe…"* (was "Shaping artifact DNA / Placing it in the museum"). Per-stage timing dropped to 130ms; total generation flow ~0.5s (was ~2s). Reveal-page animation cascade compressed from 1.5s → 0.75s. |
| **Seed normalization (every shader renders)** | CRITICAL: shader uniforms now normalize `u_seed` into a 0–100 range (`((seed % 10000) + 10000) % 10000 / 100`) before passing to GLSL. Raw seeds from `simpleHash()` can be 100M+, which breaks `fract(sin(dot(...)))` hash functions inside shaders and produces flat-gradient output. Applied in `shaderEngine.ts` (gallery cards via `ShaderThumb`) AND `WebGLCanvas.tsx` (reveal page + downloads). Mock artifacts had small hand-tuned seeds (e.g. 1247) and worked fine, but EVERY user-created artifact would render blank without this fix. See §5.13B. |
| **Mask/heads download fixed** | Downloads of the canvas pieces export the **live canvas** (what's on screen), not the fallback shader; revoke is deferred for Safari (`downloadArtifact.ts`). |
| **Heads idle off-screen** | `SadnessHeadsRender` got an `IntersectionObserver` so it stops its particle loop when not visible. |
| **Shared reveal links work** | `/reveal/:id` resolves mock ids from the local set before any network call, so shared links to seeded artifacts never dead-end. |
| **Likes** | New shared store `useLikeStore.ts` (localStorage + `useSyncExternalStore`). Toggle on/off, persists, syncs across grid/carousel/modal/reveal. Replaces the old per-surface one-way local state. |
| **Download** | Renders the shader at 1024² through the shared engine, blits to a 2D canvas, exports PNG with a slugged filename. Works in modal, reveal, and grid card. |
| **Share** | Web Share API with clipboard fallback; builds `${origin}/reveal/${id}`. |
| **Message input** | Now capped at **180 characters** (museum card is small) with a live counter, hard `maxLength`, `.slice(0,180)` guard, and trim-on-submit. |
| **Artifact titles** | All ~82 mock titles rewritten to read like personal unsent messages ("Grief Has a Color", "I Take Up Space Again") instead of shader names. |
| **Seed / uniqueness** | New artifacts get `dna.unique = true`, which drives the `u_unique` shader flag + a per-seed hue-rotate/saturate filter, so repeats of the same base shader still look distinct. Round-robin `nextShaderIndex` cycles all base shaders before any repeat. |
| **New shaders** | Per-room bespoke shaders in `data/generated/*`. This session: dual-tone **Golden Peacock** rewrite, ASCII **Reaching Hands** rewrite, **closure-fluid-pixel** ("Becoming Water"), grief palette diversification, motion-speed increases. |
| **Grief palette diversity** | The grief room's shaders were all "dirty purple / off-black / grey". Re-tinted to distinct sub-palettes (midnight-blue grid, warm-amber ash, cold-teal veil, earthy-brown adinkra, grey-green ash-veil) while staying in the grief mood. |

---

## 1A. Landing Page — Implement Every Row

> **Work order.** Build the landing page so every row below is true. Each row is a requirement, not a description of existing code. The landing page broke in every one of these ways during earlier work — these rules are what makes it work. Do not "clean up", refactor, or "modernize" the asset pipeline; every line below is load-bearing.

**Required state of the landing page (every row MUST be true in the final app):**

| Requirement | How to verify in the preview | Implement per |
|---|---|---|
| Every door is a 900px WebP at ~240 KB (no PNG fallbacks served) | DevTools Network → reload → confirm 5 `.webp` doors, ~240 KB each | §1A recipe #1 |
| `Closure_door.webp` exists alongside the other four (it was originally PNG-only) | `ls src/imports/Closure_door.webp` | §1A recipe #1 |
| All 5 door WebPs are preloaded at high priority on module load | View source → confirm `<link rel="preload" as="image" fetchpriority="high">` for each | §1A recipe #2 |
| Door boxes reserve height via `aspect-ratio: 1340/2200` BEFORE images decode | Throttle network → page composition is complete from frame 0, no jump | §1A recipe #3 |
| First paint shows the real carved doors, NOT the flat colour-arch placeholder | Hard reload → photographic doors visible immediately | §1A recipes #1+#2+#3 together |
| Hover-preview images load `loading="lazy"` (NOT eager) | Search source for `loading="eager"` in EmotionDoor — must find nothing | §1A recipe #4 |
| Landing page never scrolls on desktop OR mobile | Resize 320–1920px wide → no vertical scrollbar appears | §5.1 |
| Gallery button = grid icon on mobile, "Explore Gallery" text on desktop | Resize across `sm` breakpoint → button content swaps | §1 row "Gallery entry button" |

---

### Why each rule above matters — the context you need before you build it

The landing page initially loaded slowly, jumped/reflowed as images arrived, and frequently showed a flat **CSS colour-arch placeholder** instead of the real carved doors — and **closure was the worst**, because it only had a heavy PNG with no optimized variant. This is how it was fixed:

### What was wrong
- **Door art was enormous:** each door was a 1340px PNG at **2.4–3.9 MB** (Love 3.9 MB, Hope 3.8 MB, Regret 3.3 MB, Grief 2.5 MB, Closure 2.6 MB). Five doors = ~16 MB just for the hall.
- **Closure had ONLY a PNG** (`Closure_door.png`, 2.6 MB) — no WebP — so it loaded last/slowest and dropped to the colour-arch.
- **Hover-preview room images loaded `eager`**, competing with the doors for bandwidth on first paint, so the doors lost the race and the bland palette arch showed (the user reacted: *"My doors. My doors."*).
- **No height reservation** → the door boxes collapsed then expanded as images decoded, causing layout jump.

### Fix recipe — door assets (use if doors load slow or look blurry)
1. **Every door must be a 900px WebP (~240 KB).** Check `src/imports/<room>_door.webp` exists. If a door went back to PNG, re-convert: `cwebp -q 82 -resize 900 0 <Room>_door.png -o <Room>_door.webp`. Same art, alpha preserved.
2. **Closure especially must have `Closure_door.webp`** (it was originally PNG-only at 2.6 MB and dropped to the colour-arch). Verify the file exists; if missing, regenerate it.
3. **Optimize room hero/fallback images to WebP** (PNG ~2–2.8 MB → ~100–160 KB). Grief uses an optimized JPG (`grief_image_opt.jpg`, 236 KB) because its art compresses better as JPG.
4. **Optimize the special-piece source art** (`masked-face.webp` 86 KB, `sadness-heads.webp` 62 KB) and the **museum hall background** (`museum_hall_opt.jpg`, 308 KB).

### Fix recipe — preload (use if first paint shows colour arches instead of doors)
5. **High-priority preload of every door WebP at module import**, so they fetch + decode before paint. This lives in `src/app/components/EmotionDoorImage.tsx` — see "Real code" below. Each door must have a `<link rel="preload" as="image" fetchpriority="high">` injected when the module loads. If you delete that block, doors will lose the race to the hover images and the placeholder will show.

### Fix recipe — placeholder + height reservation (use if layout jumps)
6. **Instant, height-reserved placeholder that fades on decode.** The door box reserves height via `aspect-ratio: 1340/2200`, shows a CSS colour-arch placeholder immediately, probes the real door with `new Image()` + `complete`, and fades the placeholder out once decode finishes. Removing `aspect-ratio` causes the box to collapse → jump when the image arrives.

### Fix recipe — hover images stay lazy (use if doors lose the race)
7. **Hover-preview room images must be `loading="lazy"`.** If they go back to `eager` they will compete with the doors for bandwidth on first paint, and the doors will lose — the user will see the bland colour arch ("My doors. My doors.").

### Real code

**Door WebP imports + high-priority preload** (`src/app/components/EmotionDoorImage.tsx`):
```tsx
// Optimized 900px webp (~240 KB) instead of the 1340px PNGs (2.4–3.8 MB each).
import griefDoor   from "../../imports/grief_door.webp";
import closureDoor from "../../imports/Closure_door.webp";
import loveDoor    from "../../imports/Love_door.webp";
import hopeDoor    from "../../imports/Hope_door.webp";
import regretDoor  from "../../imports/Regret_door.webp";

export const DOOR_IMAGE_SRC: Record<DoorId, string> = {
  love: loveDoor, grief: griefDoor, hope: hopeDoor, regret: regretDoor, closure: closureDoor,
};

// Preload every door the instant this module is imported (loads early via rooms.ts),
// at high priority, so visitors never catch the colour-arch placeholder on (re)load.
if (typeof document !== "undefined") {
  for (const href of Object.values(DOOR_IMAGE_SRC)) {
    if (document.querySelector(`link[rel="preload"][as="image"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
  }
}
```

**Instant placeholder, height reserved, fades once the real door decodes** (`src/app/components/EmotionDoor.tsx`):
```tsx
// Detect decode reliably — React onLoad misses already-cached images, so probe.
useEffect(() => {
  const probe = new Image();
  const done = () => setDoorLoaded(true);
  probe.src = room.doorImage;
  if (probe.complete) done();                 // cached → already decoded
  else { probe.addEventListener("load", done); probe.addEventListener("error", done); }
  return () => { probe.removeEventListener("load", done); probe.removeEventListener("error", done); };
}, [room.doorImage]);

// aspect-ratio reserves the door's exact height on first paint (art is ~1340×2200),
// so the box never collapses while images load.
<div className="relative w-full [perspective:1200px]" style={{ aspectRatio: "1340 / 2200" }}>
  {/* INSTANT colour-arch placeholder — complete from frame 0, fades out on decode */}
  <div aria-hidden className="absolute inset-[5%_12%] z-0"
    style={{
      background: `linear-gradient(165deg, ${room.palette.accent} 0%, ${room.palette.bg} 125%)`,
      borderRadius: ARCH_RADIUS,
      opacity: doorLoaded ? 0 : 0.7,
      transition: "opacity 0.5s ease",
    }} />
  {/* …the real <EmotionDoorImage> door on top… */}
</div>
```

**Hover-preview image is lazy** (so it never competes with the doors):
```tsx
<img src={room.fallbackImage} alt="" className="w-full h-full object-cover" loading="lazy" />
```

**Museum hall background: preload + CSS gradient fallback** (`src/app/components/LandingMuseumBackground.tsx`):
```tsx
const BACKGROUND_STYLE = {
  // photo on top, hall-like gradient beneath so it reads as a lit hall even before the image
  backgroundImage: `url(${museumLandingImage}), linear-gradient(180deg,#e8e0d2 0%,#ddd0b9 40%,#cdbd9f 70%,#c4b393 100%)`,
  backgroundSize: "cover, cover", backgroundPosition: "center top, center top", backgroundColor: "#cdbd9f",
};
useEffect(() => { /* inject <link rel="preload" as="image"> for museum_hall_opt.jpg once */ }, []);
```

### Asset size table (before → after)
| Asset | PNG | Optimized |
|---|---|---|
| Love door | 3885 KB | 250 KB WebP |
| Hope door | 3788 KB | 241 KB WebP |
| Regret door | 3340 KB | 244 KB WebP |
| Grief door | 2481 KB | 242 KB WebP |
| **Closure door** | **2611 KB (was PNG-only)** | **242 KB WebP** |
| Room hero images | ~2–2.8 MB each | 99–160 KB WebP (grief: 236 KB JPG) |
| masked-face | 2207 KB | 86 KB WebP |
| sadness-heads | (large) | 62 KB WebP |
| museum hall bg | — | 308 KB JPG (`museum_hall_opt.jpg`) |

> **Preserve this:** never revert doors to the PNGs or the hover image to `eager`; keep the preload + `aspect-ratio` height reservation + decode-probe fade; keep an optimized WebP for **every** room (closure included).

---

## 1C. Shader / Artifact — Implement Every Row

> **Work order.** Build the shader/artifact pipeline so every row below is true. Each row is a requirement, not a description of existing code.

**Required state (every row MUST be true in the final app):**

| Requirement | How to verify in the preview | Implement per |
|---|---|---|
| `u_seed` is normalized to 0–100 before reaching GLSL, in BOTH `shaderEngine.ts` AND `WebGLCanvas.tsx` | Search for `gl.uniform1f(u.seed,` — every match MUST wrap the seed in `((x % 10000) + 10000) % 10000 / 100` | §5.13B (this is THE single most common regression — every user-created artifact will render blank without it) |
| Every new artifact generated via the form renders a VISIBLE animated shader (not a flat gradient) on both gallery and reveal | Generate one in each of the 5 rooms → all 5 reveal pages show distinct visible shapes/motion | §5.13B |
| A new shader you authored appears in the gallery | After adding it, its `mock-XX` id MUST be in `SEED_IDS` in `artifacts.ts`, otherwise the gallery filters it out | §5.15 |
| `nextShaderIndex` round-robins so the same shader never picks twice in a row | Generate 5 artifacts in one room → each picks a different shader from the family | §5.10 / §5.14 |
| No two artifacts share a DNA — `dnaKey` / `uniqueSeed` re-rolls on collision | Stress-test: 10 generations in one room with the same message → all 10 have distinct seeds | §5.10 |
| Mask/heads download exports the LIVE canvas (the portrait), NOT the fallback shader | Open `/reveal/mock-mask`, click Download → file shows the pixel mask | §1 row "Mask/heads download fixed" + `downloadArtifact.ts` |
| `/reveal/mock-X` resolves locally and never redirects to "/" | Cold-load `/reveal/mock-40` → page loads the artifact | §1 row "Shared reveal links work" |
| Off-screen cards stop their rAF loop (IntersectionObserver gating) | Scroll a gallery page → DevTools Performance shows no GPU work for off-screen cards | §5.13 |

---

## 1D. Special Cards (Crying Mask + Sadness Heads) — Implement Every Row

> **Work order.** The Regret room has two non-shader canvas pieces — a pixelated crying-mask portrait ("The Face We Wore") and a 5-up ASCII sadness-heads grid ("Five Ways of Grieving"). They are NOT a separate strip; they are real members of the 3D ring and the masonry grid, alongside the shader cards. If you cannot see them, ONE of these requirements is broken — find which row and fix it. **This failure mode came back more than once during earlier work**; the rules below are why it now stays fixed.
>
> The two pieces ARE NOT shaders. They render to their own `<canvas>` via `CryingMaskRender` / `SadnessHeadsRender` (in `src/app/components/CryingMaskCard.tsx` and `SadnessHeadsCard.tsx`). They sample the source images `src/imports/masked-face.webp` and `src/imports/sadness-heads.webp` to drive their pixel/ASCII renderers. Without those image files, the canvases stay black.

**Required state (every row MUST be true in the final app):**

| Requirement | How to verify in the preview | Implement per |
|---|---|---|
| Two source image files exist: `src/imports/masked-face.webp` (~86 KB) and `src/imports/sadness-heads.webp` (~62 KB) | Open both files in the file explorer; if missing, regenerate from the PNGs in the same folder | §1A recipe #1 (same `cwebp` flow) |
| `MOCK_ARTIFACTS` in `src/app/data/artifacts.ts` contains TWO entries with `custom: "mask"` and `custom: "heads"` (ids `mock-mask`, `mock-heads`, both `emotion: "regret"`) | grep `custom: "mask"` and `custom: "heads"` in `artifacts.ts` — both MUST match | §5.15 |
| `SEED_IDS` in `artifacts.ts` includes both `"mock-mask"` and `"mock-heads"` | grep `mock-mask` and `mock-heads` in the SEED_IDS set — both MUST be present | §5.15 |
| The grid renderer (`src/app/pages/ArtifactGallery.tsx`, masonry block) branches on `artifact.custom`: `custom === "mask"` → `<CryingMaskCard …>`, `custom === "heads"` → `<SadnessHeadsCard …>`, else `<ShaderArtifactCard …>` | Open `/gallery/regret` in Grid view — mask + heads cards are visible alongside the shader cards | §5.4B |
| The 3D carousel (`src/app/components/ShaderCarousel3D.tsx`) branches on `artifact.custom` the SAME way and renders mask/heads as REAL ring members (not a separate strip below) | Open `/gallery/regret` in 3D Flow view — drag the ring; mask + heads cards appear in the ring rotation, not docked elsewhere | §5.4 + §1 row "Special cards in carousel" |
| The Regret editorial pin is in the `filtered` memo of `ArtifactGallery.tsx`: when `activeEmotion === "regret"`, `filtered` puts `a.custom` items first | `/gallery/regret` opens with the mask as card 1 of 5 (or 1 of 2 with the heads as card 2) | §5.15 |
| Both canvases use IntersectionObserver to stop their rAF loop when off-screen (battery on long scrolls) | Open `/gallery/regret`, scroll off the carousel area → DevTools Performance shows no continuous canvas work | §5.13 (same pattern as `ShaderThumb`) |
| Detail modal + reveal page render the LIVE canvas for `custom` pieces (NOT the fallback regret shader) | Open `/reveal/mock-mask` → the pixelated mask renders, not a swirling shader | §1 row "Mask/heads download fixed" + `downloadArtifact.ts` |
| Download of a `custom` piece exports the live canvas (mask portrait), NOT the fallback shader. The caller passes the live canvas via `liveCanvas` (read from a `previewRef`) | `/reveal/mock-mask` → click Download → file shows the pixel mask, not a swirl | `downloadArtifact.ts` |
| The `<canvas>` element in BOTH `CryingMaskRender` AND `SadnessHeadsRender` uses `touchAction: "manipulation"` (NOT `"none"`). `touchAction: "none"` blocks tap-to-click on mobile, so tapping the card on a phone does NOT open the detail modal — a real bug. Cursor should be `"pointer"`, not `"crosshair"`. | Open `/gallery/regret` on mobile (or DevTools device toolbar) → tap the mask card → modal opens | The `<canvas>` style in both renderers must be: `{ display: "block", width: "100%", height: "100%", background: "#…", cursor: "pointer", touchAction: "manipulation" }` |

**The minimal artifact entries (paste verbatim into `MOCK_ARTIFACTS` if they're missing):**
```ts
{
  id: "mock-mask",
  emotion: "regret",
  title: "The Face We Wore",
  messageExcerpt: "I kept smiling. For years. No one knew I was falling apart behind the mask.",
  messageVisibility: "excerpt",
  creatorDisplayName: "Anonymous Visitor",
  isAnonymous: true,
  avatarColor: "#0e3a5c",
  avatarInitials: "?",
  dna: { seed: 30, shaderIndex: 0, emotion: "regret", intensity: 0.85, timeOffset: 0 },
  shader: EMOTION_SHADERS.regret[0], // fallback only — the card renders the live canvas
  createdAt: "2025-06-17T20:00:00Z",
  likes: 312, shares: 88, downloads: 40,
  visibility: "public",
  interpretation: "A face held together by habit, the quiet regret of never letting anyone see the cracks.",
  custom: "mask",                       // ← THIS field is what the renderer branches on
},
{
  id: "mock-heads",
  emotion: "regret",
  title: "Five Ways of Grieving",
  messageExcerpt: "Each face carries the same weight. Just wearing it differently.",
  messageVisibility: "excerpt",
  creatorDisplayName: "Anonymous Visitor",
  isAnonymous: true,
  avatarColor: "#1a3a5c",
  avatarInitials: "?",
  dna: { seed: 30, shaderIndex: 1, emotion: "regret", intensity: 0.8, timeOffset: 0 },
  shader: EMOTION_SHADERS.regret[1],   // fallback only
  createdAt: "2025-06-17T19:30:00Z",
  likes: 287, shares: 94, downloads: 38,
  visibility: "public",
  interpretation: "Five portraits of the same sorrow, the many faces regret wears when it has nowhere to go.",
  custom: "heads",
},
```

**The branch every card renderer needs (gallery grid + carousel both):**
```tsx
{artifact.custom === "mask" ? (
  <CryingMaskCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
) : artifact.custom === "heads" ? (
  <SadnessHeadsCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
) : (
  <ShaderArtifactCard artifact={artifact} onClick={() => setSelectedArtifact(artifact)} showTag={showTags} />
)}
```

**Diagnostic checklist if you still cannot see the mask/heads cards:**

1. **Open the browser DevTools console on `/gallery/regret`.** Errors loading `masked-face.webp` or `sadness-heads.webp`? → image files are missing, regenerate them.
2. **Inspect the carousel/grid DOM.** Do you see `<canvas>` elements for two cards in Regret, or are those slots empty / showing a shader instead? Empty canvas → renderer (`CryingMaskRender`/`SadnessHeadsRender`) isn't being called; the parent branch (`artifact.custom === "mask"`) is missing. Showing a shader → the branch fell through to `ShaderArtifactCard`; the `custom` field on the artifact is undefined, meaning either the artifact isn't in MOCK_ARTIFACTS with `custom: "mask"` or `withSafeShader` is stripping it.
3. **Verify the SEED filter.** In `useArtifacts.ts`, log `SEED_ARTIFACTS.map(a => a.id)` — `mock-mask` and `mock-heads` MUST be in the list. If not, they're missing from `SEED_IDS`.
4. **Verify the artifact reaches the gallery.** In `ArtifactGallery.tsx`, log `filtered.map(a => ({id: a.id, custom: a.custom}))` while in the Regret room — you must see both `mock-mask` (custom: "mask") and `mock-heads` (custom: "heads").
5. **If `custom` is `undefined` in `filtered`** but defined in MOCK_ARTIFACTS, then `withSafeShader` is dropping the field. Fix `withSafeShader` to spread the original artifact first: `return { ...artifact, shader: artifact.shader || EMOTION_SHADERS[artifact.emotion][artifact.dna.shaderIndex] };`

---

## 1E. Room Copy (taglines + descriptions) — Implement Every Row

> **Work order.** Each of the 5 rooms in `src/app/data/rooms.ts` has a `tagline` (one-line subtitle) and a `description` (half-sentence used inside the room card and the form modal). They MUST sound like real unsent messages — first-person, personal, like something a real human would whisper or text to someone they couldn't reach. Earlier sessions had generic literary copy that read like an AI summarizing a museum brochure; that copy was rewritten and **must not be regressed**.

**Required state of `ROOMS` in `src/app/data/rooms.ts` (every row MUST match in tone, even if you want to wordsmith the exact phrasing later):**

| Room | Tagline (first-person, ~6 words) | Description (half-sentence) |
|---|---|---|
| love | *"I almost said it. A hundred times."* | *"for the I love yous you carried home, still folded in your pocket."* |
| grief | *"I still set the table for two."* | *"for the goodbye that never landed, and the room that kept your shape."* |
| hope | *"One day you'll read this and laugh."* | *"for the futures you whispered to yourself when no one else believed them yet."* |
| regret | *"I should have picked up the phone."* | *"for the apology you rehearsed in the shower, and never sent."* |
| closure | *"I forgive you. I forgive me."* | *"for the letters you finally stopped writing, because you didn't need to anymore."* |

**Voice rules (apply when rewriting):**
- First-person ("I…") or second-person reaching outward ("for the you…"), NEVER third-person abstract ("Where light returns slowly.").
- Concrete sensory detail, not abstract emotion: *"I still set the table for two"* (concrete), NOT *"Where absence becomes shape"* (abstract).
- A real human moment, not a literary observation: *"I should have picked up the phone"* (moment), NOT *"Where choices echo"* (observation).
- Rule of thumb: if the line could appear on a self-help mug or a yoga studio wall, it's generic — rewrite it. If it could be a real text someone sent themselves at 2am, it's right.

**Banned phrasings (do NOT regress to these or anything in their style):**
- *"Things the heart kept saying."*
- *"Where absence becomes shape."*
- *"Where light returns slowly."*
- *"Where choices echo."*
- *"Where endings learn to rest."*

These were the original generic taglines. If you see anything like them in `rooms.ts`, replace them with rows from the table above (or new lines in the same voice).

---

## 2. Original Problems Before the Fixes

- **Landing page was heavy and janky.** ~16 MB of door PNGs plus eager hover images made it load slowly, jump/reflow as images decoded, and frequently fall back to the flat CSS colour-arch instead of the real doors. **Closure was worst — it had only a PNG, no WebP.** (Full fix in §1A.)
- **Landing page overflowed and scrolled.** `min-h-full` let the header + doors exceed the viewport, so the page jumped/scrolled. The header was too large (`7.2rem` max), and big fixed margins pushed the doors below the fold.
- **Header dominated** and crowded the hero, leaving no room for the doors in one screen.
- **Gallery button copy** ("The Collection") was vague and always text+arrow, even on mobile where space is tight.
- **3D carousel** had a distracting purple pixel-burst on navigation and a like-count badge floating over each card.
- **Card cropping / containment**: the special pixel-mask and ASCII-heads pieces were NOT in the cards/ring — they sat in a separate strip and didn't behave like the other artifacts.
- **Likes were broken**: each surface had its own one-way local state. You couldn't un-like, state reset on remount, nothing persisted or synced.
- **Download** of shader artifacts didn't actually render the shader; **share** pointed at the wrong route.
- **Weak artifact generation**: titles were shader names, not human messages. Generated artifacts didn't feel connected to the curated set; repeats of a base shader looked identical (no per-seed variation), and there was no notion of artifact "DNA" driving uniqueness.
- **Grief shaders looked identical** to each other (same purple/grey palette) even though they were different shaders.
- **No message length limit** — long messages didn't fit the museum card.
- **(Backend)** the gallery's `filtered` memo dropped server data; reveal links to mock/seed artifacts dead-ended. (See §11 Supabase.)

---

## 3. How the Fixes Were Approached

- **Inspected the code** by reading the actual page/component/data files (`LandingPage.tsx`, `ShaderCarousel3D.tsx`, `ArtifactGallery.tsx`, `artifacts.ts`, `shaderEngine.ts`, `ShaderThumb.tsx`, the hooks) rather than guessing.
- **Found the landing overflow** by spotting `min-h-full` on the `<section>` (height tracks parent, content can spill) combined with fixed `mt-*` margins and a `7.2rem` header. Reproduced by measuring `document.documentElement.scrollHeight > window.innerHeight` in the live preview.
- **Made it fit one screen** by switching the section to `h-[100dvh] overflow-hidden` and centering its contents with `justify-center`, then replacing the fixed margins with small clamped gaps so the block self-centers at any height. Verified `scrollHeight === innerHeight` (800 === 800) on desktop and visually on mobile.
- **Reduced the header** by lowering the `clamp()` max from `7.2rem` to `5rem` and nudging line-height up to `0.9` so two-line wrap stays tight; shrank the subtitle proportionally. The design (Cinzel black, drop-shadow) is untouched — only the scale changed.
- **Preserved the existing UI** by editing class strings and a few style values in place; no components were deleted or restructured, no design tokens changed.
- **Fixed card containment** for the special pieces by giving the `Artifact` type a `custom?: "mask" | "heads"` discriminator and branching the renderers (carousel, modal, reveal, grid) on it, so the canvas pieces ride the same containers as shader cards (absolute-inset canvas inside the fixed-size card frame). The shader thumbnail itself is contained with `absolute inset-0` + `object`-fitted full-size canvas inside `overflow-hidden` rounded frames.
- **Preserved likes/download/share** by centralizing likes in one store and keeping the download/share handlers on every surface, then re-pointing share at `/reveal/:id` and making download actually call `renderShader`.
- **Handled seeds** with a deterministic `simpleHash(message + emotion + Date.now() + Math.random())`, feeding `intensity`, `timeOffset`, avatar colour, and the `u_seed` uniform.
- **Handled shader variation** with `u_unique`: new artifacts pass `1`, so each shader applies a seed-driven arrangement, plus a bounded per-seed `hue-rotate`/`saturate` CSS filter on the thumbnail — variation within the room's emotional family, never random nonsense.
- **Prevented duplicates** by round-robin cycling base shaders (`nextShaderIndex`) so all are used before any repeat, and by making each repeat visually distinct via seed + `u_unique`. (Stronger dedup is the **[TO APPLY]** DNA-key approach in §5.10.)
- **Kept artifacts alive** via the shared-engine `requestAnimationFrame` loop gated by an `IntersectionObserver` — visible cards animate ambiently, off-screen cards idle (keeping their last frame), so nothing is a "paused video" and the GPU isn't thrashed.

---

## 4. Files Changed

### File: `src/app/pages/LandingPage.tsx`
**Purpose:** The museum hall — header, subtitle, the 5 emotion doors (desktop grid / mobile snap-carousel), and the gallery-entry button.
**Changes made:** Section → `h-[100dvh] overflow-hidden justify-center`. Header font + margins reduced. Door-section margins replaced with clamped gaps. Gallery button → grid icon (mobile) / "Explore Gallery" (desktop), `LayoutGrid` imported.
**Why:** Make the page fit one screen, shrink the header, and clarify the gallery entry per device.

### Files: `src/app/components/EmotionDoorImage.tsx`, `EmotionDoor.tsx`, `LandingMuseumBackground.tsx` + `src/imports/*`
**Purpose:** Door art component (+ preload), the door tile (placeholder/decode/fade, hover video preload), and the hall background.
**Changes made:** All door art and room/hero/special-piece images converted to **WebP** (doors ~240 KB vs 2.4–3.9 MB PNGs); added the missing `Closure_door.webp`/`closure_image.webp`; hall background → `museum_hall_opt.jpg`. High-priority `<link rel="preload">` for all door WebPs at module load; CSS colour-arch placeholder with `aspect-ratio: 1340/2200` height reservation that fades once the door decodes (probe via `new Image()` + `complete`); hover-preview images switched to `loading="lazy"`.
**Why:** the page was multi-MB and janky, often showing the flat colour-arch instead of the doors (closure worst, PNG-only). See §1A.

### File: `src/app/components/ArtifactForm.tsx`
**Purpose:** The "leave something unsent" modal — title, message, name, anonymous toggle, generate flow + loader.
**Changes made:** Added `MESSAGE_MAX = 180`; textarea got `maxLength`, `.slice(0,180)` onChange, a live `count/180` counter; submit trims `message`/`title`/`displayName`. Generation stages are museum-themed and fast (~1.3–1.6 s total).
**Why:** The message shows on a small card; cap it and keep generation quick and on-theme.

### File: `src/app/components/ShaderCarousel3D.tsx`
**Purpose:** The 3D coverflow ring (default gallery view).
**Changes made:** Removed pixel-burst + like badge. Added `showTags` prop and `custom` branching (mask/heads canvases). Keyboard handler ignores `INPUT/TEXTAREA/contentEditable`.
**Why:** De-clutter, let special pieces ride the ring, stop hijacking the search field.

### File: `src/app/pages/ArtifactGallery.tsx`
**Purpose:** Gallery page — room filter, sort, search, carousel/grid toggle, detail modal.
**Changes made:** `showTags = activeEmotion === "all"`; filter dropdown always visible; grid branches on `custom`; `filtered` memo now includes `artifacts` in deps; `deClumpByShader` spreads look-alikes.
**Why:** Tags only in "All Rooms"; show server data once loaded; avoid look-alike clumping.

### File: `src/app/hooks/useLikeStore.ts` *(new)*
**Purpose:** Single shared like store.
**Changes made:** Created it — localStorage-backed `Set`, `useSyncExternalStore`, `useLiked`/`useLikedSet`/`toggleLike`/`likeCount`/`isLiked`.
**Why:** Consistent, persistent, toggleable likes across every surface.

### File: `src/app/components/ShaderArtifactCard.tsx`
**Purpose:** Grid card.
**Changes made:** Wired to the like store; share → `/reveal/:id`; download renders the shader at 1024² and exports PNG; `showTag` gates the emotion chip.
**Why:** Working likes/share/download; tags only where wanted.

### Files: `src/app/components/CryingMaskCard.tsx`, `SadnessHeadsCard.tsx`
**Purpose:** The pixel-mask and ASCII-heads canvas pieces.
**Changes made:** Exported standalone renderers `CryingMaskRender` / `SadnessHeadsRender`; accept an `artifact` prop wired to the like store; `showTag` support. (Mask uses an `IntersectionObserver` to idle off-screen; **heads still needs the same gating — [TO APPLY]**, see §11 perf.)
**Why:** Let them render anywhere (ring, modal, reveal, grid) as real artifacts.

### Files: `src/app/components/ArtifactDetailModal.tsx`, `src/app/pages/ArtifactReveal.tsx`
**Purpose:** Detail modal + permalink reveal page.
**Changes made:** Wired to the like store; branch on `custom` for canvas vs WebGL preview; download/share handlers.
**Why:** Consistent likes and correct rendering for special pieces.

### File: `src/app/data/artifacts.ts`
**Purpose:** `Artifact`/`ArtifactDNA` types, `generateArtifact`, `withSafeShader`, seed helpers, `MOCK_ARTIFACTS`.
**Changes made:** Added `custom` field; rewrote all mock titles to personal messages; added `mock-mask`/`mock-heads`/`mock-69` (closure fluid) entries; `unique: true` on generated DNA; round-robin `nextShaderIndex`.
**Why:** Human titles, special pieces as data, seeded uniqueness.

### Files: `src/app/data/generated/*.ts`, `src/app/data/generatedShaders.ts`, `src/app/data/shaders.ts`
**Purpose:** Bespoke per-room shaders + base emotion palettes.
**Changes made:** New `hope-golden-peacock` (dual-tone), `love-leaf-hands` (ASCII), `closure-fluid-pixel`. Grief base palettes re-tinted for variety. Motion multipliers raised on the newest assets.
**Why:** Distinct, recognizable, lively artifacts; no two grief shaders looking the same.

---

## 5. Exact Code Used

### 5.1 Landing Page — One-Screen Fix + Header
*(real, `src/app/pages/LandingPage.tsx`)*

```tsx
// Outer wrapper: fixed to one dynamic viewport height, no scroll, contents centered.
<section className="relative z-10 flex h-[100dvh] flex-col justify-center overflow-hidden px-4 py-8 md:px-8 md:py-10">

  {/* Gallery entry button: grid icon on mobile, "Explore Gallery" text on desktop */}
  <button
    type="button"
    onClick={() => navigate("/gallery")}
    aria-label="Explore the artifact gallery"
    className="group/col absolute right-4 top-4 md:right-8 md:top-6 z-30 inline-flex items-center gap-2 rounded-full p-3 sm:px-5 sm:py-2.5 font-['Cinzel'] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3a2c20] transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-black/25 outline-none"
    style={{
      background: "rgba(255,255,255,0.16)",
      backdropFilter: "blur(18px) saturate(180%)",
      WebkitBackdropFilter: "blur(18px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.55)",
      boxShadow:
        "0 8px 30px -10px rgba(58,44,32,0.35), inset 0 1px 0 0 rgba(255,255,255,0.7), inset 0 -10px 20px -12px rgba(255,255,255,0.3)",
    }}
  >
    <LayoutGrid aria-hidden size={15} strokeWidth={2.1} className="sm:hidden transition-transform duration-300 group-hover/col:scale-110" />
    <span className="hidden sm:inline">Explore Gallery</span>
  </button>

  <motion.header
    initial={false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    className="mx-auto text-center"
  >
    {/* Header font reduced: was clamp(2.8rem,8vw,7.2rem) → now clamp(2.3rem,6vw,5rem) */}
    <h1 className="font-['Cinzel'] text-[clamp(2.3rem,6vw,5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#0a0a0a] drop-shadow-[0_4px_16px_rgba(255,255,255,0.4)]">
      The Unsent<br className="sm:hidden" /> Museum
    </h1>
    <p className="mt-4 mx-auto max-w-3xl text-balance font-['Cormorant_Garamond'] text-[clamp(1.05rem,1.8vw,1.5rem)] font-medium italic leading-snug tracking-[0.01em] text-[#3a2c20]/80">
      Write the message you never sent, watch it become living art.
    </p>
  </motion.header>

  {/* Desktop: 5-column door grid — small clamped top gap so it self-centers */}
  <div className="hidden lg:grid mx-auto mt-[min(7vh,3.5rem)] w-full max-w-6xl grid-cols-5 gap-5">
    {/* ...EmotionDoor per room... */}
  </div>

  {/* Mobile + tablet: horizontal snap carousel */}
  <div className="lg:hidden mt-[min(5vh,2.25rem)] flex flex-col items-center w-full">
    {/* ...door carousel + dot indicators... */}
  </div>
</section>
```

**Header — before/after & why:** previous `clamp(2.8rem,8vw,7.2rem)` rendered ~115px on a 1440px screen, eating the vertical budget. `clamp(2.3rem,6vw,5rem)` caps at 80px, leaving room for the doors in one screen while staying bold. `leading-[0.9]` keeps the two-line mobile wrap tight.

> **Card size / animation are preserved.** Door sizing comes from `EmotionDoor` (fixed grid column / `72vw` carousel cell) and is unchanged. Shader cards animate ambiently via `ShaderThumb` (§5.13) regardless of these layout edits. The generation loader (§5.6) is short and museum-themed.

### 5.2 Header Sizing (isolated)
```tsx
<h1 className="font-['Cinzel'] text-[clamp(2.3rem,6vw,5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#0a0a0a] drop-shadow-[0_4px_16px_rgba(255,255,255,0.4)]">
  The Unsent<br className="sm:hidden" /> Museum
</h1>
```

### 5.3 UI Placement (landing)
- Section: `flex h-[100dvh] flex-col justify-center overflow-hidden px-4 py-8 md:px-8 md:py-10`
- Button: `absolute right-4 top-4 md:right-8 md:top-6 z-30` (floats top-right, above content via `z-30`).
- Header: `mx-auto text-center` (no fixed top margin; centered by parent `justify-center`).
- Desktop doors: `mt-[min(7vh,3.5rem)]`; Mobile carousel: `mt-[min(5vh,2.25rem)]`.

### 5.4 3D Carousel — how it works + the complete component

**The idea (coverflow ring).** Every card is absolutely centered (`left-1/2 top-1/2 translate(-50%,-50%)`) and then pushed along a virtual ring by its **offset from the active index**. The offset is computed *circularly* (shortest path), so the ribbon wraps: the card "before" index 0 is the last card. Each card's transform is a pure function of that offset:

- `translateX = offset * spacing` — spread left/right
- `rotateY = clamp(-offset*34°, ±48°)` — side cards tilt away
- `translateZ = -abs(offset)*190` — neighbours recede in depth (needs `perspective` on the parent)
- `scale = max(0.62, 1 - abs*0.12)` and `opacity = 1 - abs*0.16` — far cards shrink + fade
- `zIndex = 100 - abs` — the centre card sits on top

Only cards within `abs <= 4` render (DOM/shader **windowing** for performance); only the centre + immediate neighbours animate (`paused={abs>1}`). Navigation comes from four inputs that all just change `active`: **drag** (pointer), **wheel/trackpad** (throttled to one step per gesture), **arrow keys** (ignored while typing in a field), and **click** (centre card opens; side card centres). `perspective: 1700` lives on the track wrapper so the Z-translation reads as real depth.

*(complete real component, `src/app/components/ShaderCarousel3D.tsx` — copy/paste-able)*
```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Artifact } from "../data/artifacts";
import { ROOM_MAP } from "../data/rooms";
import { ShaderThumb } from "./ShaderThumb";
import { CryingMaskRender } from "./CryingMaskCard";
import { SadnessHeadsRender } from "./SadnessHeadsCard";

interface Props {
  artifacts: Artifact[];
  accentColor: string;
  onSelect: (a: Artifact) => void;
  showTags?: boolean;
}

export function ShaderCarousel3D({ artifacts, accentColor, onSelect, showTags }: Props) {
  const [active, setActive] = useState(0);
  const [cardW, setCardW] = useState(320);
  const dragX = useRef<number | null>(null);
  const dragged = useRef(false);
  const wheelLock = useRef(0);
  const total = artifacts.length;

  // Keep the active index in range when the filtered list shrinks (room switch etc.).
  useEffect(() => { setActive((a) => Math.min(a, Math.max(0, total - 1))); }, [total]);

  // Responsive card sizing.
  useEffect(() => {
    const measure = () => setCardW(Math.max(220, Math.min(window.innerWidth * 0.66, 360)));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const go = useCallback((dir: number) => {
    setActive((a) => (total === 0 ? a : (((a + dir) % total) + total) % total));
  }, [total]);

  const jumpTo = useCallback((i: number) => { setActive(i); }, []);

  // Keyboard nav — ignores typing in form fields (so the search box works).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "Enter" && artifacts[active]) onSelect(artifacts[active]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, active, artifacts, onSelect]);

  if (total === 0) return null;

  const spacing = cardW * 0.62;
  const shaderH = cardW; // square shader area

  // Pointer drag → swipe.
  function onPointerDown(e: React.PointerEvent) { dragX.current = e.clientX; dragged.current = false; }
  function onPointerMove(e: React.PointerEvent) {
    if (dragX.current === null) return;
    if (Math.abs(e.clientX - dragX.current) > 8) dragged.current = true;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragX.current !== null) {
      const dx = e.clientX - dragX.current;
      if (dx > 44) go(-1); else if (dx < -44) go(1);
    }
    dragX.current = null;
  }

  // Trackpad / wheel, throttled so one gesture = one step.
  function onWheel(e: React.WheelEvent) {
    const now = performance.now();
    if (now - wheelLock.current < 380) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 12) return;
    wheelLock.current = now;
    go(d > 0 ? 1 : -1);
  }

  return (
    <div className="relative w-full select-none" style={{ touchAction: "pan-y" }}>
      <div
        className="relative mx-auto"
        style={{ height: shaderH + 120, perspective: 1700, perspectiveOrigin: "50% 45%" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragX.current = null)}
        onWheel={onWheel}
      >
        {artifacts.map((artifact, i) => {
          // Circular (shortest-path) offset so the ribbon wraps.
          let offset = i - active;
          if (offset > total / 2) offset -= total;
          else if (offset < -total / 2) offset += total;
          const abs = Math.abs(offset);
          if (abs > 4) return null; // window the DOM/shaders for performance

          const x = offset * spacing;
          const rotateY = Math.max(-48, Math.min(48, -offset * 34));
          const z = -abs * 190;
          const scale = Math.max(0.62, 1 - abs * 0.12);
          const opacity = abs > 3.5 ? 0 : 1 - abs * 0.16;
          const isCenter = offset === 0;
          const room = ROOM_MAP[artifact.emotion];

          return (
            <div
              key={artifact.id}
              className="absolute left-1/2 top-1/2"
              style={{
                width: cardW,
                transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                transformStyle: "preserve-3d",
                transition: "transform 0.6s cubic-bezier(0.22,0.61,0.36,1), opacity 0.5s ease",
                opacity,
                zIndex: 100 - abs,
                cursor: "pointer",
                pointerEvents: opacity <= 0.05 ? "none" : "auto",
              }}
              onClick={() => { if (dragged.current) return; if (isCenter) onSelect(artifact); else jumpTo(i); }}
            >
              <div
                className="relative w-full overflow-hidden rounded-[20px]"
                style={{
                  height: shaderH,
                  border: `1px solid ${isCenter ? accentColor + "70" : "rgba(255,255,255,0.10)"}`,
                  boxShadow: isCenter
                    ? `0 18px 44px -26px rgba(0,0,0,0.5), 0 0 38px -18px ${accentColor}3a`
                    : "0 8px 22px -26px rgba(0,0,0,0.4)",
                  background: "#04030a",
                }}
              >
                {artifact.custom === "mask" ? (
                  <CryingMaskRender className="absolute inset-0" />
                ) : artifact.custom === "heads" ? (
                  <SadnessHeadsRender className="absolute inset-0" />
                ) : (
                  <ShaderThumb
                    fragmentShader={artifact.shader.glsl}
                    seed={artifact.dna.seed}
                    intensity={artifact.dna.intensity}
                    timeOffset={artifact.dna.timeOffset}
                    unique={!!artifact.dna.unique}
                    paused={abs > 1}
                    maxDpr={isCenter ? 2 : 1}
                    fps={30}
                  />
                )}
                {/* darken side cards so the centre reads as focus */}
                <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                     style={{ background: "#04030a", opacity: isCenter ? 0 : abs * 0.1 }} />
              </div>

              {/* Caption — emotion tag only in "All Rooms" */}
              <div className="mt-3 px-1 text-center" style={{ opacity: isCenter ? 1 : 0.5 }}>
                <p className="truncate" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", color: "rgba(255,255,255,0.92)" }}>
                  {artifact.title}
                </p>
                {showTags && (
                  <div className="mt-1 flex items-center justify-center text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span className="uppercase tracking-[0.18em]" style={{ color: room?.palette.glow || accentColor }}>
                      {artifact.emotion}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-2 flex items-center justify-center gap-5">
        <CarouselButton onClick={() => go(-1)} label="Previous artifact"><ChevronLeft size={20} /></CarouselButton>
        <span className="text-xs tabular-nums tracking-widest" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Cinzel', serif" }}>
          {active + 1} / {total}
        </span>
        <CarouselButton onClick={() => go(1)} label="Next artifact"><ChevronRight size={20} /></CarouselButton>
      </div>

      <p className="mt-4 text-center text-[11px] italic" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Cormorant Garamond', serif" }}>
        Drag, scroll, or use ← → · click an artifact to open it
      </p>
    </div>
  );
}

function CarouselButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="flex items-center justify-center rounded-full transition-all hover:bg-white/10"
      style={{ width: 44, height: 44, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.8)" }}>
      {children}
    </button>
  );
}
```

**Gotchas to keep:** the parent needs `perspective` + each card `transformStyle: preserve-3d`; clamp `active` when `total` shrinks; keep the `abs > 4` window or dozens of live shaders will tank the GPU; keep `dragged` so a drag doesn't fire a click-open; throttle the wheel (`wheelLock`).

### 5.4B Gallery Layout & Filters (DO NOT remove the filters)

The gallery (`src/app/pages/ArtifactGallery.tsx`) has a **single tidy control cluster** in the header, top-right, in this exact order: **① 3D Flow ⇄ Grid toggle · ② Room filter · ③ Sort · ④ Search**. All four must stay — an earlier mistake removed the Room filter and it had to be restored.

- **① View toggle** — one button that flips `view` between `"carousel"` (3D Flow, the lit/accent state) and `"grid"` (masonry).
- **② Room filter** — a glass `Dropdown` of `All Rooms + the 5 emotions`. Drives `activeEmotion`, which filters the list and decides tag visibility (`showTags = activeEmotion === "all"`). **Tags only show in "All Rooms"** (in a specific room you already know the emotion).
- **③ Sort** — `Dropdown` of `Newest / Most Liked / Most Shared`; default is **Newest**.
- **④ Search** — fixed-width (148px) glass input filtering title/emotion/excerpt.

The **grid** is `react-responsive-masonry` (`{320:1, 640:2, 900:3, 1200:4}` columns) and branches on `artifact.custom` to render `CryingMaskCard` / `SadnessHeadsCard` / `ShaderArtifactCard`. Both views render `filtered` directly (no curation layer, no "Generate More" button). Users create new artifacts by filling the form in any emotion room.

*(real control-cluster markup, `ArtifactGallery.tsx`)*
```tsx
<div className="flex flex-wrap items-center gap-2 md:justify-end">
  {/* ① 3D Flow ⇄ Grid — single toggle; 3D is the lit (accent) state */}
  {(() => {
    const is3D = view === "carousel";
    const Icon = is3D ? GalleryHorizontalEnd : LayoutGrid;
    return (
      <button onClick={() => setView(is3D ? "grid" : "carousel")}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] transition-all"
        style={{ background: is3D ? accentColor + "26" : "rgba(255,255,255,0.04)",
                 border: `1px solid ${is3D ? accentColor + "55" : "rgba(255,255,255,0.1)"}`,
                 color: is3D ? accentColor : "rgba(255,255,255,0.55)" }}>
        <Icon size={13} />{is3D ? "3D Flow" : "Grid"}
      </button>
    );
  })()}

  {/* ② Room filter — KEEP THIS. */}
  <Dropdown value={activeEmotion} onChange={setActiveEmotion} accent={accentColor}
    options={[{ value: "all", label: "All Rooms" },
              ...ROOMS.map((r) => ({ value: r.id, label: r.name, color: r.palette.glow }))]} />

  {/* ③ Sort — default "newest" */}
  <Dropdown value={sort} onChange={(v) => setSort(v as SortMode)} accent={accentColor}
    options={[{ value: "newest", label: "Newest" },
              { value: "liked", label: "Most Liked" },
              { value: "shared", label: "Most Shared" }]} />

  {/* ④ Search */}
  <SearchField value={search} onChange={setSearch} />
</div>
```

*(real `Dropdown` — glass popover with click-outside-to-close)*
```tsx
function Dropdown({ value, onChange, options, accent }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string; color?: string }[]; accent: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const current = options.find((o) => o.value === value) || options[0];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.72)" }}>
        {current?.color && <span className="w-2 h-2 rounded-full" style={{ background: current.color }} />}
        {current?.label}
        <ChevronDown size={13} style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence>{open && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
          className="absolute right-0 mt-2 z-50 min-w-[168px] rounded-2xl p-1"
          style={{ background: "rgba(14,10,20,0.96)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
          {options.map((o) => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl text-xs transition-colors hover:bg-white/5"
              style={{ background: o.value === value ? accent + "22" : "transparent", color: o.value === value ? accent : "rgba(255,255,255,0.6)" }}>
              {o.color && <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />}{o.label}
            </button>
          ))}
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
```

> **Known low-severity nit (documented, optional):** the Room dropdown sets local `activeEmotion` but does not push the URL, so `/gallery` can show a room visually without the address bar changing. To make the URL the single source of truth, change its `onChange` to `navigate(v === 'all' ? '/gallery' : '/gallery/' + v)` and let the existing `[emotion]` effect set `activeEmotion`. Keep Sort/Search local.

### 5.5 Artifact Card Containment
*(real, `src/app/components/ShaderArtifactCard.tsx`)*

```tsx
<motion.div
  className="w-full h-[430px] rounded-2xl overflow-hidden cursor-pointer flex flex-col"
  style={{ background: "rgba(8,5,14,0.9)", /* border + shadow */ }}
  whileHover={{ y: -4 }}
  onClick={onClick}
>
  {/* Shader preview — fixed-height, clipped, canvas absolutely filled */}
  <div className="relative h-[230px] shrink-0 overflow-hidden">
    <ShaderThumb
      fragmentShader={artifact.shader.glsl}
      className="absolute inset-0"
      timeOffset={artifact.dna.timeOffset}
      seed={artifact.dna.seed}
      intensity={artifact.dna.intensity}
      unique={!!artifact.dna.unique}
      paused={false}     // grid cards animate ambiently when on-screen
      maxDpr={1}
      fps={30}
    />
    {showTag && (
      <div className="absolute top-3 left-3">
        <span className="px-2.5 py-1 rounded-full text-xs capitalize tracking-wider" style={{ /* accent chip */ }}>
          {artifact.emotion}
        </span>
      </div>
    )}
  </div>

  {/* Body — flexes to fill, content clamped */}
  <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
    <h3 className="line-clamp-2" style={{ fontFamily: "Georgia, serif" }}>{artifact.title}</h3>
    {artifact.messageExcerpt && (
      <p className="text-xs line-clamp-2 leading-relaxed" style={{ fontStyle: "italic" }}>
        "{artifact.messageExcerpt}"
      </p>
    )}
    {/* creator row + actions… */}
  </div>
</motion.div>
```

The shader/canvas always fills its frame: parent is `relative … overflow-hidden`, the canvas/`ShaderThumb` is `absolute inset-0` with `width:100%;height:100%` (see §5.13), so it can never spill or get cropped wrong. Special pieces use the **same** frame via the `custom` branch.

### 5.6 Message Input — 180-Character Limit
*(real, `src/app/components/ArtifactForm.tsx`)*

```tsx
// The message is shown on a small museum card, so it is intentionally short.
const MESSAGE_MAX = 180;

// Generation stages — museum-themed, short (≈200–350ms each + 500ms ≈ 1.3–1.6s total)
const getGenStages = (emotionName: string) => [
  `Reading ${emotionName} texture…`,
  `Extracting memory fragments…`,
  `Shaping artifact DNA for ${emotionName}…`,
  `Giving it motion…`,
  `Placing it in the museum…`,
];

// state
const [message, setMessage] = useState("");

async function handleGenerate() {
  if (!message.trim()) return;            // empty-message prevention
  setGenerating(true);
  const stages = getGenStages(room?.name?.toLowerCase() || defaultEmotion);
  for (let i = 0; i < stages.length; i++) {
    setGenStage(i);
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 150));
  }
  const artifact = generateArtifact(
    defaultEmotion,
    message.trim(),          // trimmed
    title.trim(),
    displayName.trim(),
    isAnonymous, "public", "excerpt"
  );
  await new Promise((r) => setTimeout(r, 500));
  onArtifactGenerated(artifact);
}

// UI
<div className="flex items-baseline justify-between mb-2">
  <label className="…">Unsent Message</label>
  <span className="text-[10px] tabular-nums tracking-widest"
        style={{ color: message.length >= MESSAGE_MAX ? accentColor : "rgba(255,255,255,0.35)" }}>
    {message.length}/{MESSAGE_MAX}
  </span>
</div>
<textarea
  value={message}
  onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}  // hard guard
  maxLength={MESSAGE_MAX}                                             // native cap
  placeholder="I never told you that…"
  rows={5}
  /* …glass styling… */
/>

// Generate button is disabled until there's content:
<button onClick={handleGenerate} disabled={!message.trim() || generating}>Generate Artifact</button>
```

### 5.7 Likes
*(real, `src/app/hooks/useLikeStore.ts` — full file)*

```ts
import { useSyncExternalStore } from "react";
import { likeArtifact } from "./useArtifacts";

const KEY = "unsent_liked_v1";
const listeners = new Set<() => void>();

function load(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
  catch { return new Set(); }
}

// New Set instance on every mutation so useSyncExternalStore re-renders.
let likedSet: Set<string> = load();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify([...likedSet])); } catch {}
}
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }

export function isLiked(id: string): boolean { return likedSet.has(id); }

export function toggleLike(id: string): boolean {
  const wasLiked = likedSet.has(id);
  likedSet = new Set(likedSet);
  if (wasLiked) {
    likedSet.delete(id);                 // un-like (local)
  } else {
    likedSet.add(id);
    likeArtifact(id).catch(() => {});    // best-effort server increment; no-ops for mocks
  }
  persist();
  listeners.forEach((l) => l());
  return !wasLiked;
}

export function useLiked(id: string): boolean {
  return useSyncExternalStore(subscribe, () => likedSet.has(id), () => false);
}
export function useLikedSet(): Set<string> {
  return useSyncExternalStore(subscribe, () => likedSet, () => likedSet);
}
// Displayed count = static base + (this visitor liked it ? 1 : 0)
export function likeCount(baseLikes: number, liked: boolean): number {
  return baseLikes + (liked ? 1 : 0);
}
```

**One user can like once per browser** (a `Set` keyed by artifact id in localStorage); toggling removes it. There is no auth, so "one like per person" is per-device by design. Consumed as:
```tsx
const liked = useLiked(artifact.id);
const likes = likeCount(artifact.likes, liked);
<button onClick={(e) => { e.stopPropagation(); toggleLike(artifact.id); }}>
  <Heart fill={liked ? "#ff6b7a" : "none"} /> {likes}
</button>
```

### 5.8 Download
All three surfaces (grid card, modal, reveal) now call one shared helper. Shader artifacts render a fresh 1024² frame; **custom mask/heads pieces export the live on-screen canvas** (passed in), so the saved PNG matches what's displayed instead of an unrelated fallback shader. Revoke is **deferred a tick** for Safari.

*(real, `src/app/components/downloadArtifact.ts`)*
```ts
import { Artifact } from "../data/artifacts";
import { renderShader } from "./shaderEngine";

export function downloadArtifact(artifact: Artifact, bgColor: string, liveCanvas?: HTMLCanvasElement | null) {
  const SIZE = 1024;
  const out = document.createElement("canvas");
  out.width = SIZE; out.height = SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) return;

  if (artifact.custom && liveCanvas) {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(liveCanvas, 0, 0, SIZE, SIZE);      // export the canvas piece as shown
  } else {
    const src = renderShader(artifact.shader.glsl, SIZE, SIZE,
      artifact.dna.timeOffset || 0, artifact.dna.seed, artifact.dna.intensity, artifact.dna.unique ? 1 : 0);
    if (src) ctx.drawImage(src, 0, 0, SIZE, SIZE);
    else { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, SIZE, SIZE); }
  }

  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (artifact.title || "artifact").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    a.href = url; a.download = `unsent-${slug || "artifact"}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);     // defer so WebKit finishes reading the blob
  }, "image/png");
}
```

*(call sites — pass the live canvas for custom pieces)*
```tsx
// grid card (shaders only): downloadArtifact(artifact, room?.palette.bg || "#0a0a0a");
// modal / reveal: grab the on-screen canvas from a ref'd preview container for custom pieces:
const liveCanvas = artifact.custom ? previewRef.current?.querySelector("canvas") : null;
downloadArtifact(artifact, room?.palette.bg || "#0a0a0a", liveCanvas);
```
No external library — pure canvas.

### 5.9 Share
*(real, `src/app/components/ShaderArtifactCard.tsx`)*

```tsx
function handleShare(e: React.MouseEvent) {
  e.stopPropagation();
  const url = `${window.location.origin}/reveal/${artifact.id}`;
  if (navigator.share) {
    navigator.share({
      title: `${artifact.title} · The Unsent Museum`,
      text: artifact.messageExcerpt,
      url,
    }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).catch(() => {});   // fallback (modal shows a "Copied!" toast)
  }
}
```

### 5.10 Seed System
*(real, `src/app/data/artifacts.ts`)*

```ts
function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Round-robin so generations cycle ALL base shaders before any repeat (per room).
function nextShaderIndex(emotion: string, count: number): number {
  if (typeof window === "undefined" || count <= 0) return 0;
  const key = `unsent_genidx_${emotion}`;
  let cur = 0;
  try { cur = parseInt(window.localStorage.getItem(key) || "0", 10) || 0; } catch {}
  const idx = cur % count;
  try { window.localStorage.setItem(key, String((cur + 1) % (count * 1000))); } catch {}
  return idx;
}

export function generateArtifact(emotion, message, title, displayName, isAnonymous, visibility, messageVisibility): Artifact {
  // Seed = message + emotion + time + randomness → highly unique per submission.
  const seed = simpleHash(message + emotion + Date.now() + Math.random().toString());
  const shaders = EMOTION_SHADERS[emotion] || EMOTION_SHADERS.grief;
  const shaderIndex = nextShaderIndex(emotion, shaders.length);
  const shader = shaders[shaderIndex];

  const intensity  = 0.3 + ((seed % 100) / 100) * 0.7;  // 0.3–1.0, visually distinct
  const timeOffset = (seed % 1000) / 10;                 // different starting phase

  const excerpt = message.length > 80 ? message.slice(0, 80) + "…" : message;

  return {
    id: `artifact-${seed}-${Date.now()}`,
    emotion,
    title: title || generateArtifactTitle(emotion, seed),   // user title kept; fallback only if blank
    messageExcerpt: excerpt,
    fullMessage: messageVisibility === "public" ? message : undefined,
    messageVisibility,
    creatorDisplayName: isAnonymous ? "Anonymous Visitor" : (displayName || "Anonymous Visitor"),
    isAnonymous,
    avatarColor: AVATAR_COLORS[seed % AVATAR_COLORS.length],
    avatarInitials: isAnonymous ? "?" : (displayName || "A").slice(0, 2).toUpperCase(),
    dna: { seed, shaderIndex, emotion, intensity, timeOffset, unique: true },
    shader,
    createdAt: new Date().toISOString(),
    likes: Math.floor(seed % 200) + 1,
    shares: Math.floor((seed * 7) % 80),
    downloads: Math.floor((seed * 3) % 50),
    visibility,
    interpretation: /* per-emotion, seed-picked */,
  };
}
```

> **The user's own message and title are always preserved.** `messageExcerpt`/`fullMessage` come straight from their input; `title` is theirs unless they leave it blank. The museum only ever supplies the poetic `interpretation` (the museum *interpreting* the piece), never the user's words.

### 5.11 Seeded Randomness (in GLSL, driven by `u_seed` + `u_unique`)
Each shader gates its variation behind `u_unique` so old artifacts render identically and new ones vary. Canonical pattern (from `grief-kintsugi`):

```glsl
// every varied term is multiplied by u_unique, so unique=0 → original look
float sd = u_seed * u_unique;
float ang   = 0.5 * sd;                 // seeded rotation
float pShift= 0.13 * sin(sd * 4.7);     // seeded palette nudge
float phase = 6.2831 * hash11(sd + 11.0) * u_unique;
```
Plus a CSS-level per-seed colour shift on the thumbnail (see §5.13, `filter`).

### 5.12 Artifact DNA
*(real, `src/app/data/artifacts.ts`)*

```ts
export interface ArtifactDNA {
  seed: number;          // deterministic hash of message+emotion+time+rand
  shaderIndex: number;   // which base shader in EMOTION_SHADERS[emotion]
  emotion: string;
  intensity: number;     // 0.3–1.0  → u_intensity
  timeOffset: number;    // starting phase
  unique?: boolean;      // true for post-uniqueness artifacts → u_unique flag
}

export interface Artifact {
  id: string; emotion: string; title: string;
  messageExcerpt: string; fullMessage?: string;
  messageVisibility: "public" | "excerpt" | "hidden";
  creatorDisplayName: string; isAnonymous: boolean;
  avatarColor: string; avatarInitials: string;
  dna: ArtifactDNA; shader: ShaderDef;
  createdAt: string; likes: number; shares: number; downloads: number;
  visibility: "public" | "private" | "unlisted";
  interpretation: string;
  custom?: "mask" | "heads";   // canvas pieces that ride the gallery/ring
}

// Render-safe: rebuild shader from emotion+shaderIndex if missing (server round-trip).
export function withSafeShader(a: Artifact): Artifact {
  if (a?.shader && typeof a.shader.glsl === "string") return a;
  const list = EMOTION_SHADERS[a?.emotion] || EMOTION_SHADERS.grief;
  const shader = list[a?.dna?.shaderIndex ?? 0] || list[0];
  return { ...a, shader };
}
```

**DNA is created** in `generateArtifact`, **saved** with the artifact (the heavy `shader` is stripped before persistence and rebuilt via `withSafeShader` on read), **read back** by every renderer (`ShaderThumb`/`WebGLCanvas` consume `seed`/`intensity`/`timeOffset`/`unique`). Because the seed is a hash of the message + timestamp + randomness, two artifacts colliding is astronomically unlikely; `shaderIndex` + seed + `u_unique` make even same-base repeats look different.

**IMPLEMENTED — duplicate guard** *(real, `src/app/data/artifacts.ts`)*:
```ts
// A stable "DNA key" for an artifact's visual identity.
export function dnaKey(d: ArtifactDNA): string { return `${d.emotion}:${d.shaderIndex}:${d.seed}`; }

// Seeds already in use (mocks + this session's generations); lazily seeded from MOCK_ARTIFACTS.
let knownSeeds: Set<string> | null = null;
function ensureKnownSeeds(): Set<string> {
  if (knownSeeds) return knownSeeds;
  knownSeeds = new Set(MOCK_ARTIFACTS.map((a) => `${a.emotion}:${a.dna.seed}`));
  return knownSeeds;
}
// Hash message+emotion into a seed that isn't already taken (re-rolls up to 8x).
function uniqueSeed(message: string, emotion: string): number {
  const known = ensureKnownSeeds();
  let seed = simpleHash(message + emotion + Date.now() + Math.random().toString());
  let guard = 0;
  while (known.has(`${emotion}:${seed}`) && guard++ < 8) seed = simpleHash(seed + ":" + Math.random().toString());
  known.add(`${emotion}:${seed}`);
  return seed;
}
// generateArtifact now calls: const seed = uniqueSeed(message, emotion);
```

### 5.13 Shader Rendering — shared engine + animation loop
*(real, `src/app/components/shaderEngine.ts` — one WebGL context for the whole app)*

```ts
// ONE shared context; programs cached by source; callers blit the result to a 2D canvas.
export function renderShader(
  fragSrc: string, w: number, h: number,
  time: number, seed: number, intensity: number, unique: number = 0,
): HTMLCanvasElement | null {
  if (!ensure() || !gl || !glCanvas) return null;
  if (gl.isContextLost()) return null;

  const entry = getEntry(fragSrc);     // compile-once, cached; falls back to a safe shader on error
  if (!entry) return null;

  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (curW !== w || curH !== h) { glCanvas.width = w; glCanvas.height = h; curW = w; curH = h; gl.viewport(0, 0, w, h); }

  gl.useProgram(entry.program);
  const u = entry.uniforms;
  if (u.res)       gl.uniform2f(u.res, w, h);
  if (u.time)      gl.uniform1f(u.time, time);
  if (u.seed)      gl.uniform1f(u.seed, seed);
  if (u.intensity) gl.uniform1f(u.intensity, intensity);
  if (u.unique)    gl.uniform1f(u.unique, unique);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return glCanvas;     // valid until the next call — blit immediately
}

// Uniforms every shader gets (auto-declared if missing):
//   uniform vec2  u_resolution;  uniform float u_time;
//   uniform float u_seed;        uniform float u_intensity;  uniform float u_unique;
```

*(real, `src/app/components/ShaderThumb.tsx` — the rAF loop that keeps cards alive)*

```tsx
// Draws through the shared engine onto a plain 2D canvas; animates only while in view.
function renderOnce(now: number) {
  const { w, h } = sizeCanvas();
  const p = propsRef.current;
  if (!startRef.current) startRef.current = now;
  const t = (now - startRef.current) / 1000 + p.timeOffset;
  const src = renderShader(p.fragmentShader, w, h, t, p.seed, p.intensity, p.unique ? 1 : 0);
  if (src) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(src, 0, 0, canvas.width, canvas.height); }
}

function loop() {
  if (!alive || !inViewRef.current || propsRef.current.paused) { rafRef.current = 0; return; } // no idle spin
  const now = performance.now();
  const interval = propsRef.current.fps > 0 ? 1000 / propsRef.current.fps : 0;
  if (interval > 0 && now - lastDrawRef.current < interval) { rafRef.current = requestAnimationFrame(loop); return; }
  lastDrawRef.current = now;
  renderOnce(now);
  rafRef.current = requestAnimationFrame(loop);
}

// IntersectionObserver paints the first real frame immediately and starts/stops the loop.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    inViewRef.current = e.isIntersecting;
    if (e.isIntersecting) { renderOnce(performance.now()); startLoop(); }
    else if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } // keeps last frame
  }
}, { threshold: 0.01, rootMargin: "300px" });
io.observe(canvas);

return () => { alive = false; io.disconnect(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };

// Per-seed palette expansion, only for unique (new) artifacts (±~18° hue, +saturation):
const filter = unique
  ? `hue-rotate(${((seed % 37) - 18)}deg) saturate(${1 + (seed % 22) / 100})`
  : "none";
```

### 5.13B Seed Normalization (do not remove — every shader depends on this)

**The bug:** every shader in `EMOTION_SHADERS` uses GLSL hash functions of the form `fract(sin(dot(p + u_seed, vec2(12.9898, 78.233))) * 43758.5453)` to drive petal placement, particle positions, glyph identity, etc. These functions are only stable when their input stays in a small numerical range. Pass `u_seed = 793811260` (a real seed from `simpleHash("hello" + "love" + Date.now() + Math.random())`) and the `sin()` argument blows past float32 precision, the hash decoheres into per-pixel noise, and the shader output collapses into a flat background gradient — the artifact looks "blank."

Mock artifacts have hand-picked seeds like `1247`, `5291`, `8362`. They never tripped the bug, so the gallery looked fine and only user-created artifacts rendered blank.

**The fix:** normalize at the GLSL boundary, NOT at the seed generator. The DNA seed stays huge (drives `dnaKey` dedup, hue-rotate filter, `nextShaderIndex`, etc.) but what reaches the shader as `u_seed` is squeezed into 0–100.

*(real, `src/app/components/shaderEngine.ts`)*
```ts
// Normalize seed to a small numerically-stable range (0-100) so GLSL hash
// functions (which rely on fract(sin(dot(...)))) stay coherent. Raw seeds
// from simpleHash() can be 100M+, which makes hash() produce per-pixel noise
// and the shader renders as a flat gradient.
if (u.seed) gl.uniform1f(u.seed, ((seed % 10000) + 10000) % 10000 / 100);
```

*(same line in `src/app/components/WebGLCanvas.tsx`, both render loops)*
```ts
if (u.seed) gl.uniform1f(u.seed, ((seedRef.current % 10000) + 10000) % 10000 / 100);
```

**Why the formula:** `((x % 10000) + 10000) % 10000` is a safe positive-modulo (handles negative seeds), then `/ 100` gives a 0–100 float with two decimal places of variation. That range is what mock seeds happened to occupy, so shader authors implicitly tuned for it.

**If you add a new render path** (a new canvas surface, a new export route, anything that calls `gl.uniform1f(u.seed, …)`): apply the same normalization. Otherwise that one surface will render blank for every user-created artifact.

**Do NOT "fix" this by changing `simpleHash` to return small numbers** — it would break dnaKey collision detection, the per-seed hue filter (which uses `seed % 37`), and any consumer that treats the DNA seed as a unique identifier.

### 5.14 Preset System (shader families per emotion)
`EMOTION_SHADERS` (in `src/app/data/shaders.ts`, extended by `generatedShaders.ts`) is the preset registry: a `Record<emotion, ShaderDef[]>`. Each room has a documented palette and a family of shaders.

```ts
// src/app/data/shaders.ts
export interface ShaderDef { id: string; name: string; description: string; glsl: string; }

// Palettes are declared per room, e.g. GRIEF (now diversified):
//   vortex  → dirty purple / off-black / grey   (signature)
//   grid    → midnight blue / steel
//   ash     → warm charcoal / amber
//   veil    → cold teal / cyan
//   kintsugi→ near-black + gold ;  sumie → paper + ink ; adinkra → earthy brown/indigo
//   ash-veil→ grey-green + ember ; fallen-rose → rose/wine ; smoke → lavender ; weeping-orb → bronze

export const EMOTION_SHADERS: Record<string, ShaderDef[]> = {
  grief:   [...baseGrief,   ...GENERATED.grief],
  hope:    [...baseHope,    ...GENERATED.hope],
  closure: [...baseClosure, ...GENERATED.closure],
  regret:  [...baseRegret,  ...GENERATED.regret],
  love:    [...baseLove,    ...GENERATED.love],
};
```

**Variation rules:** preset (= `shaderIndex`) is chosen by round-robin (`nextShaderIndex`) so the family is fully used before repeats; seed then drives intensity, time offset, the in-shader `u_unique` arrangement, and the CSS hue/saturation — bounded so results stay inside the room's emotional palette, never random noise.

### 5.15 Seed Artifacts (5 per room) + User-Created Artifacts

The gallery starts with **5 seed artifacts per room** (25 total). There is no "Generate More" button and no `curation.ts`. Users create new artifacts by filling the form in any emotion room; those appear in the gallery immediately.

**How it works:**

1. `MOCK_ARTIFACTS` in `artifacts.ts` contains ~82 mock entries (for seed collision avoidance and reveal fallback).
2. A `SEED_IDS` set selects exactly 5 per room. `SEED_ARTIFACTS = MOCK_ARTIFACTS.filter(a => SEED_IDS.has(a.id))`.
3. `useArtifacts.ts` merges only `created` (localStorage) + `SEED_ARTIFACTS`. Server artifacts are saved for persistence but NOT displayed.
4. When a user fills the form, `addCreatedArtifact(artifact)` caches it in localStorage (`unsent_created_v1`), and it enters the gallery immediately.

*(real, `src/app/data/artifacts.ts`)*
```ts
const SEED_IDS = new Set([
  // Love (5)
  "mock-78",     // "You Keep Opening in Me"
  "mock-79",     // "The Space Between Our Hands"
  "mock-1",      // "I Never Said It Back"
  "mock-6",      // "Every Song After You"
  "mock-10",     // "We Both Knew"
  // Grief (5)
  "mock-80",     // "Grief Wears Every Face"
  "mock-2",      // "The Room Is Still Your Size"
  "mock-17",     // "I Still Reach for the Phone"
  "mock-7",      // "I Haven't Opened the Windows"
  "mock-22",     // "Nothing Dramatic, Just Quiet"
  // Hope (5)
  "mock-81",     // "I Take Up Space Again"
  "mock-82",     // "It Still Knows How to Fly"
  "mock-3",      // "I Still Believe in Us"
  "mock-8",      // "You Wouldn't Recognize Me"
  "mock-32",     // "Vast and Not Afraid"
  // Regret (5)
  "mock-mask",   // "The Face We Wore" (crying mask canvas)
  "mock-heads",  // "Five Ways of Grieving" (sadness heads canvas)
  "mock-4",      // "The Other Path"
  "mock-13",     // "That One Sentence"
  "mock-44",     // "Two Versions of My Life"
  // Closure (5)
  "mock-5",      // "It Took Seven Years"
  "mock-40",     // "I Forgive You"
  "mock-36",     // "A Conversation I Never Had"
  "mock-39",     // "Peace Arrived Quietly"
  "mock-69",     // "I Let It Become Water"
]);
export const SEED_ARTIFACTS: Artifact[] = MOCK_ARTIFACTS.filter((a) => SEED_IDS.has(a.id));
```

*(real, `src/app/hooks/useArtifacts.ts` -- merge logic)*
```ts
const created = loadCreated();
const seen = new Set<string>();
const allArtifacts = [...created, ...SEED_ARTIFACTS]
  .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
  .map(withSafeShader);
```

*(real, `addCreatedArtifact` -- localStorage cache)*
```ts
export function addCreatedArtifact(artifact: Artifact) {
  const { shader, ...lean } = artifact;
  const existing = JSON.parse(localStorage.getItem(CREATED_KEY) || "[]") as Artifact[];
  const deduped = existing.filter((a) => a.id !== artifact.id);
  localStorage.setItem(CREATED_KEY, JSON.stringify([lean, ...deduped]));
}
```

**Editorial pin -- mask + heads lead the Regret room.** The mask ("The Face We Wore") and heads ("Five Ways of Grieving") are pinned to the front of `filtered` in the Regret room so they always appear first. *(real, in the `filtered` memo of `ArtifactGallery.tsx`)*
```ts
const ordered = deClumpByShader(items);
if (activeEmotion === "regret") {
  const special = ordered.filter((a) => a.custom);
  if (special.length) return [...special, ...ordered.filter((a) => !a.custom)];
}
return ordered;
```

**Dates reflect real creation time.** `generateArtifact` stamps `createdAt: new Date().toISOString()` so user-created artifacts show their actual creation date. **Text ownership is absolute:** the system only ever chooses the *shader/visual*; the *message and title* are the user's exact words (`generateArtifact` uses `message.trim()` and the user's title, never rewrites them).

### 5.16 Gallery Sorting (default: Newest)
*(real, `src/app/pages/ArtifactGallery.tsx` — `filtered` memo)*

```tsx
const filtered = useMemo(() => {
  let items = artifacts.filter((a) => a.visibility === "public");
  if (activeEmotion !== "all") items = items.filter((a) => a.emotion === activeEmotion);
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      a.emotion.includes(q) ||
      a.messageExcerpt?.toLowerCase().includes(q));
  }
  if (sort === "liked")       items = [...items].sort((a, b) => b.likes - a.likes);
  else if (sort === "shared") items = [...items].sort((a, b) => b.shares - a.shares);
  else /* newest */           items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return deClumpByShader(items);
}, [artifacts, activeEmotion, sort, search]);   // ← artifacts IS in deps (server data shows up)
```
`deClumpByShader` (spreads look-alikes apart while keeping sort order):
```ts
function deClumpByShader(items: Artifact[]): Artifact[] {
  const pending = [...items]; const out: Artifact[] = [];
  while (pending.length) {
    const recent = out.slice(-3).map((a) => a.dna.shaderIndex);
    let idx = pending.findIndex((a) => !recent.includes(a.dna.shaderIndex));
    if (idx === -1) idx = 0;
    out.push(pending.splice(idx, 1)[0]);
  }
  return out;
}
```
The default `sort` is **`"newest"`** so a visitor's just-created artifact leads the gallery. The gallery renders `filtered` directly (no curation layer). See §5.15 for the seed system.

---

## 6. Drop-In Brief for the Next AI (copy-paste this block as the opening message)

Paste the block below verbatim into the next AI's first message. It tells them what they're working on, what is non-negotiable, and what they're allowed to do.

> You are continuing **The Unsent Museum**, an existing React + TypeScript + Vite app (React Router BrowserRouter, motion/react, Tailwind utility classes, raw WebGL, optional Supabase edge function). **Do not rebuild from scratch — extend the current code.** The user will tell you what to fix or add; your job is to make the smallest correct surgical change, verify it in a real browser, and not break anything in the preserve-list below.
>
> **Concept:** visitors enter an emotion room (Love/Grief/Hope/Regret/Closure), write a short unsent message, and it becomes an animated WebGL shader "artifact" in a public gallery.
>
> **Already implemented (preserve it):**
> - Landing page fits one screen: `<section className="h-[100dvh] overflow-hidden justify-center">`, reduced header `text-[clamp(2.3rem,6vw,5rem)]`, clamped door-section gaps. Gallery button: grid icon on mobile, "Explore Gallery" text on desktop.
> - Landing images are optimized WebP (every door + room, closure included; ~240 KB doors vs old multi-MB PNGs). Doors are preloaded at high priority, height-reserved via `aspect-ratio`, with a CSS colour-arch placeholder that fades once the real door decodes; hover-preview images are `loading="lazy"`. Never revert to PNGs or eager hover images.
> - 3D coverflow carousel (default) + grid toggle. Emotion tags show **only** in "All Rooms". Carousel windows to `abs<=4`, animates only center+neighbors, branches on `artifact.custom` for mask/heads canvases, and its keyboard handler ignores form fields.
> - Likes via a single shared store `useLikeStore.ts` (localStorage + `useSyncExternalStore`): `useLiked`, `toggleLike`, `likeCount`. One like per browser, toggleable, synced everywhere. Displayed count = `base + (liked?1:0)`.
> - Download = `renderShader` at 1024² → 2D canvas → PNG (slugged filename). Share = Web Share API + clipboard fallback to `${origin}/reveal/${id}`.
> - Message input capped at **180 chars** with a live counter and trim-on-submit; empty messages blocked.
> - Shaders render through ONE shared WebGL context (`shaderEngine.ts`), blitted to per-card 2D canvases; `ShaderThumb` runs a fps-capped rAF loop gated by an IntersectionObserver (visible = animate, off-screen = idle, keep last frame). Uniforms: `u_resolution, u_time, u_seed, u_intensity, u_unique`.
> - **`u_seed` MUST be normalized to 0–100 before reaching the GPU** (`((seed % 10000) + 10000) % 10000 / 100`). Raw DNA seeds from `simpleHash()` are 100M+ and would break shader `fract(sin(dot(...)))` hash functions — every user-created artifact would render as a flat gradient. Applied in `shaderEngine.ts` AND `WebGLCanvas.tsx`. See §5.13B.
> - Artifact **DNA** (`{ seed, shaderIndex, emotion, intensity, timeOffset, unique }`) drives generation. Seed = `simpleHash(message+emotion+Date.now()+random)`. New artifacts set `unique:true` (→ `u_unique` + per-seed hue/saturation), so repeats of a base shader still look distinct. `nextShaderIndex` round-robins the room's shader family before repeating. `withSafeShader` rebuilds a missing shader from emotion+index.
> - Titles read like personal unsent messages, NOT shader names. **Never write the user's message or title for them** — only the museum `interpretation` is auto-generated. Dates are always the generation day.
> - Gallery starts with **5 seed artifacts per room** (25 total, via `SEED_IDS` / `SEED_ARTIFACTS` in `artifacts.ts`). Users create more by filling the form in any emotion room. Created artifacts are cached in localStorage (`addCreatedArtifact` / `unsent_created_v1`) and merged in `useArtifacts` (seeds + created only, no server artifacts in display). Default sort **Newest**. The Regret room pins the mask + heads first. Mask/heads downloads export the live canvas; `/reveal/:id` resolves mock ids locally.
> - Gallery keeps four filters (View toggle, Room, Sort, Search). There is NO "Generate More" button and NO `curation.ts`.
>
> **Behaviour rules to keep:**
> - Landing must never scroll on desktop or mobile. Card sizes are fixed; layout edits must not change them, and shaders must keep animating ambiently.
> - Gallery shows 5 seeds per room; user-created artifacts from the form get added on top with real creation timestamps.
> - No two artifacts should be the same: enforce via seed + shaderIndex + `u_unique`; `dnaKey` re-roll guard prevents collisions.
> - Mobile responsiveness and the existing glassmorphic UI must be preserved.
>
> **Optional backend:** a Supabase edge function (`make-server-75cd8a5e`, Hono/Deno + KV) exposes `GET/POST /artifacts`, `GET /artifacts/:id`, `POST /artifacts/:id/like`. The app fully degrades to mock data when it's down. When you deploy it, add a MOCK fallback in `ArtifactReveal` so shared mock links don't dead-end.

---

## 7. Reusable Code Blocks

See §5 for the real, in-repo versions. Quick index:

- **Landing Page Layout** → §5.1
- **Header Sizing** → §5.2
- **3D Carousel (full component)** → §5.4
- **Gallery Layout & Filters** → §5.4B
- **Artifact Card Containment** → §5.5
- **Gallery Sorting** → §5.16
- **180-Character Message Limit** → §5.6
- **Likes** → §5.7
- **Download** → §5.8
- **Share** → §5.9
- **Seed Generation** → §5.10
- **Seeded Randomness** → §5.11
- **Artifact DNA** → §5.12
- **Presets** → §5.14
- **Shader Uniforms + Animation Loop** → §5.13

---

## 8. What Another AI Must Preserve

- One-screen landing (`h-[100dvh] overflow-hidden`), reduced header, door/grid + mobile carousel layout, and the dot indicators.
- **Landing image optimization (§1A):** optimized WebP for every door + room (closure included), high-priority door preload, `aspect-ratio` height reservation, decode-probe placeholder fade, and `loading="lazy"` hover images. Never revert to the PNGs or `eager` hover images.
- Gallery button: icon (mobile) / "Explore Gallery" (desktop).
- 3D carousel interaction (drag, wheel, arrows, click-to-center, click-center-to-open), windowing, and the form-field keyboard guard.
- Fixed card sizes and **ambient shader animation** (do not turn cards into static frames).
- Card containment (`absolute inset-0` canvas inside `overflow-hidden` fixed frames) for shaders AND the mask/heads canvases.
- Default sort **Newest**; emotion tags only in "All Rooms".
- The four gallery filters (View toggle, Room, Sort, Search). Never remove the Room filter. No "Generate More" button.
- 5 seed artifacts per room via `SEED_IDS` / `SEED_ARTIFACTS`. User-created artifacts merge from localStorage.
- The Regret editorial pin (mask + heads lead the room).
- Dates stamped to the generation day; the user's message/title are never rewritten (system only picks the shader).
- Mask/heads download exports the live canvas (not the fallback shader); deferred blob revoke.
- The `/reveal/:id` mock fallback (shared links to seeded artifacts resolve locally).
- The shared like store (one like per browser, toggle, persist, sync).
- Download (real shader → PNG) and Share (`/reveal/:id`).
- 180-char message limit + trim + empty-block.
- Seed system, Artifact DNA, `u_unique`, `withSafeShader`, round-robin presets, artifact uniqueness.
- Personal titles/messages — never auto-write the user's words.
- The single shared WebGL engine (don't spawn a context per card).
- **Seed normalization at the GLSL boundary** (§5.13B) — `u_seed` MUST be normalized to 0–100 before reaching every shader. Without it, every user-created artifact renders blank.
- Reveal page back button pinned `fixed top-4 left-4` (NOT centered in a row with View Gallery). No decorative "Artifact Born" badge above the title.
- Generation loader text stays personal (3 short stages), not robotic "Shaping DNA / Placing in museum".
- Mobile responsiveness and the glass UI.

---

## 9. Testing Checklist

- [ ] **Landing loads fast & shows the real doors** (§1A): on a cold load / hard reload, the photographic carved doors appear (not the flat colour-arch); no layout jump; **closure door looks as crisp/fast as the others**.
- [ ] **Door assets are WebP**: network panel shows ~240 KB WebP doors, not multi-MB PNGs; hover-preview images load lazily (after the doors).
- [ ] **Desktop landing** (≥1024px): header + 5 doors + labels fit one screen, no scroll (`scrollHeight === innerHeight`).
- [ ] **Mobile landing** (375px): header + door carousel + dots fit one screen; gallery button shows the **grid icon only**.
- [ ] **No unnecessary scroll**: resize 320–1920px wide; the landing never scrolls vertically.
- [ ] **Header size**: title is noticeably smaller than before, still bold/legible, two-line wrap tight on mobile.
- [ ] **Desktop gallery button**: reads "Explore Gallery", **no icon**.
- [ ] **Carousel**: drag/wheel/arrows cycle; center card opens on click; side card centers on click; tags show only in "All Rooms".
- [ ] **Card containment**: shader fills the frame, no overflow/letterboxing; mask + heads render inside cards in ring, grid, modal, reveal.
- [ ] **Face/head/object fit**: `mock-mask` and `mock-heads` look correct (not cropped, not the fallback shader) in every surface.
- [ ] **Gallery seeds**: each room shows exactly 5 seed artifacts; "All Rooms" shows 25 total. No "Generate More" button exists.
- [ ] **Gallery sorting**: default is "Newest"; user-created artifacts appear first.
- [ ] **User-created artifacts**: fill the form, generate an artifact, navigate to gallery. The new artifact appears at the top with the user's exact title and message, and the correct creation date.
- [ ] **Filters present**: View toggle, Room, Sort, Search all visible; choosing a room filters; tags hidden in a room, shown in "All Rooms".
- [ ] **Regret pin**: open `/gallery/regret` -> "The Face We Wore" (mask) and "Five Ways of Grieving" (heads) appear first.
- [ ] **Dates**: a newly generated artifact shows the real creation timestamp, not a baked-in date.
- [ ] **User-created shader renders (not blank)**: generate a new artifact via the form; the reveal page MUST show a visible animated shader (petals, halftone heart, peacock, etc.), not a flat gradient. Repeat in 2-3 rooms. Blank = seed normalization regression (§5.13B).
- [ ] **No "Artifact Born" badge** on the reveal page; the title leads.
- [ ] **Reveal back button** is fixed top-left, NOT centered next to "View Gallery".
- [ ] **Generation feels fast**: form submit → reveal in under 1 second.
- [ ] **Mask/heads download**: downloading the mask/heads (modal or `/reveal/mock-mask`) saves the portrait you see, not a swirl shader.
- [ ] **Shared mock link**: opening `/reveal/mock-40` (or any `mock-*`) cold loads the artifact, does not redirect to "/".
- [ ] **Like**: tap heart → fills + count +1; tap again → un-fills + count −1; reload → state persists; same artifact in grid/carousel/modal shows the same state.
- [ ] **Download**: produces a 1024² PNG of the actual shader with a slugged filename.
- [ ] **Share**: native sheet (or clipboard) with `…/reveal/<id>`.
- [ ] **Message limit**: cannot type past 180; counter turns accent at 180; pasting long text truncates.
- [ ] **Empty message**: Generate is disabled / no-ops with only whitespace.
- [ ] **Seed uniqueness**: generate several artifacts in one room → different look each time (intensity/phase/hue vary), base shaders cycle before repeating.
- [ ] **Duplicate prevention**: no two artifacts share the same `id`/DNA; repeats of a base shader still look distinct.
- [ ] **Shader animation**: visible cards animate; scroll away → idle (last frame held), not blank; scroll back → resumes smoothly.
- [ ] **Mobile responsiveness**: forms, modals, gallery, and carousel are usable on a phone.

---

## 10. Notes on Format & Status

- **Done in earlier sessions:** landing image optimization (§1A) — WebP conversion + MB reduction for all doors/rooms/special pieces, the missing closure WebP, high-priority door preload, height-reserved placeholder fade, lazy hover images; doors-always-show-photo behavior.
- **Done in earlier sessions:** landing image optimization (§1A).
- **Done & verified this session (batch 1):** header reduction, one-screen landing (desktop + mobile), gallery button (icon/text), 180-char message limit, dual-tone peacock, ASCII reaching-hands, grief palette diversity, motion-speed increases, the QA-fix for the `filtered` memo dependency and the carousel keyboard guard.
- **Done & verified this session (batch 2):** 5-per-room seed system (`SEED_IDS` / `SEED_ARTIFACTS` in `artifacts.ts`), user-created artifacts cached in localStorage (`addCreatedArtifact` / `unsent_created_v1`), default sort = **"Newest"**, gallery displays seeds + created only (no server artifacts in display list, no "Generate More" button, `curation.ts` deleted). DNA-key duplicate re-roll (`dnaKey`/`uniqueSeed` in `artifacts.ts`), mask/heads download export + deferred `URL.revokeObjectURL` (`src/app/components/downloadArtifact.ts`), IntersectionObserver gating for `SadnessHeadsRender`, and the Supabase **reveal mock-fallback** (`/reveal/:id` resolves mock ids locally before any redirect). Verified live: All Rooms = 25, each room = 5, Regret shows mask + heads, user-created artifact appears first with real timestamp.
- **Done & verified this session (batch 3):** Reveal page back button moved to fixed top-left (matching gallery style), "Artifact Born" badge removed, generation loader text rewritten ("Listening to what you couldn't say…" etc.) and timing halved, reveal animation cascade compressed from 1.5s→0.75s. **Critical fix: GLSL seed normalization** in `shaderEngine.ts` + `WebGLCanvas.tsx` — `u_seed` now clamped to 0–100 via `((seed % 10000) + 10000) % 10000 / 100` (see §5.13B). Without this, every user-created artifact rendered as a flat gradient because raw 100M+ seeds broke shader `fract(sin(dot(...)))` hash functions. Verified live: a fresh love-room generation renders a clean halftone-heart shader.

---

## 11. Supabase (optional persistence)

The app runs fully on mock data with the backend down. Edge function id: `make-server-75cd8a5e` (Hono on Deno, KV-backed). Endpoints the frontend calls:

| Method | Path | Used by |
|---|---|---|
| `GET`  | `/artifacts` | `useArtifacts` (gallery list) |
| `POST` | `/artifacts` | `saveArtifact` (create) — shader stripped, rebuilt on read |
| `GET`  | `/artifacts/:id` | `ArtifactReveal` (cold permalink) |
| `POST` | `/artifacts/:id/like` | `likeArtifact` (best-effort increment) |

Config lives in `utils/supabase/info.tsx` (`projectId`, `publicAnonKey`). Status of the known integration fixes: (a) `artifacts` is in the gallery memo deps — **done**; (b) `ArtifactReveal` resolves `MOCK_ARTIFACTS.find(a => a.id === id)` **before** any fetch, so shared mock links never dead-end — **done** (`src/app/pages/ArtifactReveal.tsx`); (c) **still open** — decide a single source of truth for like counts (the local +1 vs the server count) to avoid double-count drift once deployed.

---

## 12. How to Ensure the AI Succeeds (implementation playbook)

If you hand this project to another AI/developer, give them this playbook so they don't break working behavior:

**A. Read before you touch.** Read §1A (images), §5.4/§5.4B (carousel + filters), §5.7 (likes), §5.13 (shader engine), and §8 (preserve-list) first. Most regressions here come from not knowing these systems exist.

**B. Work in small, verified steps.** After every change, verify in the Figma Make live preview (don't ask the user to check): reload the preview, watch the browser console for errors, screenshot the affected screen.

**C. The non-negotiables (breaking any of these is a failure):**
1. Landing never scrolls (`h-[100dvh] overflow-hidden`); doors are WebP + preloaded; closure has an optimized asset.
2. The four gallery filters stay (View toggle, Room, Sort, Search); tags only in "All Rooms".
3. The carousel keeps `perspective` + `preserve-3d`, the `abs>4` window, and the form-field keyboard guard.
4. One shared WebGL context (`shaderEngine.ts`) — never a context per card.
5. Likes go through `useLikeStore` only; cards animate ambiently (don't freeze them).
6. The user's message + title are sacred — only the *shader* is system-chosen. Dates = generation day.
7. No two artifacts identical — keep `uniqueSeed`/`u_unique`.
8. **Every shader renders, never blank.** `u_seed` must be normalized to 0–100 at every GLSL render boundary (§5.13B). If you add a new render path, copy the normalization formula. Test by generating a fresh artifact in 2–3 rooms — if any reveal shows a flat gradient, the normalization is missing or broken.

**D. Verify each feature against §9's checklist** before declaring done. For shader/visual work, also confirm: compiles (no fallback), recognizable subject, on-palette, visibly animating, distinct per seed.

**E. When adding artifacts/shaders,** follow `DOCS/ASSET_GENERATION_PROMPTS.md` exactly (new `ShaderDef` file -> register in `generatedShaders.ts` -> add a `MOCK_ARTIFACT` with a personal title referencing the right index -> add its id to `SEED_IDS` if it should appear in the gallery). A shader with no referencing artifact in `SEED_IDS` will not appear in the gallery.

**F. If unsure about scope,** prefer additive changes and leave the documented [open] items ((c) above) as clearly-marked TODOs rather than half-implementing them.

**G. Definition of done:** the testing checklist (§9) passes end-to-end on desktop AND mobile, the console is clean, and none of the §8 preserve-list items regressed.

---

*End of handoff. Companion file: `DOCS/ASSET_GENERATION_PROMPTS.md` (how to produce new shaders/assets and the image references to use).*
