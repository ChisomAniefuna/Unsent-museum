# Plan: The Unsent Museum — Shader Gallery Edition

## Context
Build a full cinematic, immersive museum web app. The user has provided:
- 5 door PNG images (Love, Grief, Hope, Regret, Closure)
- ~30 GLSL fragment shaders organized by emotion room (Love, Grief, Hope, Regret, Closure)
- A full spec (unsent-museum-app.tsx) describing the complete museum experience
- The gallery artifacts ARE the live WebGL shaders in motion

The core gallery experience renders the GLSL shaders on WebGL canvases as living artifacts.

## Key Decisions
- **No Make Kit** — use shadcn/ui primitives already installed + Tailwind + Motion
- **WebGL system** — a reusable `WebGLCanvas` component compiles any GLSL fragment shader with `u_time`/`u_resolution` uniforms and animates it via `requestAnimationFrame`
- **State management** — React `useState`/`useContext` (no Zustand needed at this scale)
- **Routing** — React Router 7 with `BrowserRouter`; pages: `/`, `/corridor`, `/room/:emotion`, `/gallery/:emotion`, `/artifact/:id`
- **No real backend** — fully mock data, Supabase-ready structure

## Files to Create

### Core
- `src/app/App.tsx` — router shell
- `src/app/components/WebGLCanvas.tsx` — WebGL shader renderer (the engine)
- `src/app/components/ShaderArtifactCard.tsx` — card with live shader preview + like/share/download
- `src/app/components/PresenceAvatars.tsx` — avatar stack + visitor count

### Data
- `src/app/data/shaders.ts` — all GLSL shader strings organized by emotion
- `src/app/data/rooms.ts` — room metadata (name, palette, description, video URL, door image)
- `src/app/data/artifacts.ts` — mock artifact records

### Pages
- `src/app/pages/LandingPage.tsx` — cinematic entry, headline, CTA
- `src/app/pages/MuseumCorridor.tsx` — 5 emotion doors with 3D hover/click animation
- `src/app/pages/EmotionRoom.tsx` — video bg room with form CTA
- `src/app/pages/ArtifactGallery.tsx` — masonry gallery with filters, live shaders
- `src/app/pages/ArtifactReveal.tsx` — dramatic artifact reveal post-form

### Modals/Overlays
- `src/app/components/ArtifactForm.tsx` — glass modal with unsent message form + generation loader
- `src/app/components/ArtifactDetailModal.tsx` — full artifact detail view
- `src/app/components/DoorTransition.tsx` — 3D door opening overlay

## WebGL Canvas Design
```typescript
// Props: fragmentShader: string, className?: string, paused?: boolean
// Uses: WebGL2 context, compiles vertex + fragment shader
// Vertex shader: draws full-screen quad
// Fragment: receives u_time (float), u_resolution (vec2)
// Animation: requestAnimationFrame loop updating u_time
// Cleanup: cancels RAF, loses context on unmount
```

## Shader Organization (shaders.ts)
Each emotion gets an array of shader objects: `{ id, name, glsl }`. Selected shaders per emotion:

- **Grief** (2): "Vortex Mass" (spiral void), "Memory Grid" (cyan tunnel)
- **Closure** (2): "Glyph Fall" (falling glyphs tunnel), "Blue Descent" (blue glyph tunnel from regret file)
- **Love** (4): "Butterfly Net" (full butterfly+voronoi), "Peacock Grid" (grid butterflies), "Flower Bloom" (heart flowers), "Holding Hands"
- **Hope** (3): "Golden Recursion" (amber rays), "Ascending Light" (vertical beams), "Paper Lanterns" (lantern animation)
- **Regret** (3): "Spiral Smoke" (fbm spiral), "Neon Tunnel" (wireframe tunnel), "Wave Interference"

## Door Animation
- `EmotionDoor` uses CSS `perspective` + `rotateY` on click (transform-origin: left)
- Door image is the PNG asset, imported via ES module
- Behind the door: colored glow matching room palette
- Motion `whileHover` scale-up + glow pulse
- On click: rotateY(-75deg) with spring physics, then navigate after 600ms delay

## Gallery Layout (ArtifactGallery)
- `react-responsive-masonry` for masonry grid
- Each card: live WebGL shader (100×100px canvas), title, emotion tag, creator, likes
- Filter bar: by emotion, sort by newest/liked
- On hover: shader canvas enlarges with CSS transition
- On click: opens ArtifactDetailModal

## Artifact DNA Generation
When form is submitted, generate deterministic DNA from:
- message hash (simple numeric hash)
- emotion index
- timestamp + random salt
- Select shader index = hash % shaders[emotion].length
- Generate color palette variation (seed uniform offset)

## Room Videos
Use the Cloudinary URLs provided:
- Grief: `https://res.cloudinary.com/dofuxlbmq/video/upload/v1781127346/love_zxrvf8.mp4` (placeholder)
- Closure: `https://res.cloudinary.com/dofuxlbmq/video/upload/v1781534772/Closure_video_xtmue4.mp4`
- Regret: `https://res.cloudinary.com/dofuxlbmq/video/upload/v1781215901/Regret_axzl9b.mp4`
- Love: `https://res.cloudinary.com/dofuxlbmq/video/upload/v1781127346/love_zxrvf8.mp4`
- Hope: same Grief URL (placeholder per spec)

## Visual Style System
- Background: near-black `#050508` throughout
- Typography: serif for headings (Georgia/serif), sans for body
- Glass morphism: `backdrop-blur + bg-white/5 + border-white/10`
- Emotion palettes:
  - Love: `#820307` → `#FF4444` → `#FFC088`
  - Grief: `#0a0412` → `#3d1d6e` → `#c8b4ec`
  - Hope: `#030200` → `#8B6914` → `#FFD966`
  - Regret: `#010308` → `#0e3a5c` → `#9fd4e8`
  - Closure: `#040a07` → `#0a7a5c` → `#b8ff2e`

## Verification
1. Landing page renders with door images and CTAs
2. Click "Enter the Museum" → navigates to `/corridor`
3. Corridor shows 5 doors with door images and hover effects
4. Click a door → 3D rotation animation → navigates to `/room/:emotion`
5. Room shows video background + room info + presence avatars
6. Click "Leave an Unsent Message" → form modal opens
7. Submit form → generation loader → artifact reveal
8. "View Artifacts" → `/gallery/:emotion` with masonry WebGL shader cards
9. Click artifact card → detail modal opens
10. All WebGL shaders animate smoothly, no console errors
11. Responsive on mobile + desktop
