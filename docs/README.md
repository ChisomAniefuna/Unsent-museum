# Unsent Museum — Engineering Docs

Handoff documentation for the live-shader system, written so another developer or
**an AI with no prior context** can pick it up and execute.

**Start here → [AI-PROMPT.md](./AI-PROMPT.md)** — the master prompt. Paste the whole
file to the AI. It tells the story, teaches the mental models (especially **how
seeds work** and how nothing-old-changes), walks a seed end-to-end, and gives the
phased, verify-as-you-go plan. Everything else is the reference it points to.

### Rendering & system
1. **[shader-system.md](./shader-system.md)** — the bugs (cards not loading,
   unequal sizing, blank flashes, performance) and the fixes — one shared WebGL
   context, per-card 2D-canvas blit, `w-full` sizing, ambient animation. Full
   `shaderEngine.ts` and `ShaderThumb.tsx`.
2. **[artifact-uniqueness.md](./artifact-uniqueness.md)** — unique-but-reproducible
   artifacts without changing existing ones: Shader DNA, the `u_unique` gate,
   round-robin selection, hue-rotate palette, row de-clumping.

### The 25 new shaders
3. **[generated-shaders.md](./generated-shaders.md)** — catalogue (per-room tables:
   culture / motif / motion / file) + how they're wired + tuning history.
4. **[shader-prompts.md](./shader-prompts.md)** — the **prompts** that produced each
   shader: the reusable CONTRACT + DESIGN/HARDEN templates + all 25 briefs. Use
   these to regenerate or extend.
5. **[shader-code.md](./shader-code.md)** — the **actual GLSL code** of all 25
   shaders, concatenated verbatim from source (~145 KB). The runnable truth.
6. **[shaders/](./shaders/)** — the same code **split per room** for easy grabbing:
   [grief.md](./shaders/grief.md) · [hope.md](./shaders/hope.md) ·
   [closure.md](./shaders/closure.md) · [regret.md](./shaders/regret.md) ·
   [love.md](./shaders/love.md). 5 shaders each (25 total).

**Reading order for a fresh AI:** `AI-PROMPT.md` → `shader-system.md` (Phases A–D)
→ `artifact-uniqueness.md` (Phase E) → for shaders, `shader-prompts.md` to
generate + `shader-code.md` as reference (`generated-shaders.md` to navigate).
