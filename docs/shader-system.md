# Live-Shader Gallery — Rendering System & Fixes

A drop-in guide (prompt + working code) for making a gallery of animated WebGL
fragment-shader cards load smoothly, size consistently, and stay performant.
Pulled verbatim from the working Unsent Museum build.

> **Is this everything?** The two engine files + the `w-full` sizing fix +
> `paused={false}` animation are the core and make the gallery run smoothly.
> Caveats to honour for a clean drop-in elsewhere:
> 1. A **large/hero view** (modal, detail page) should keep its **own dedicated
>    WebGL context** — the shared engine is for the *many* thumbnails. One or two
>    hero instances never hit the context cap.
> 2. `ensureSeedUniforms` must run in **every** place shaders are compiled
>    (the shared engine AND any dedicated hero canvas).
> 3. Class names below assume **Tailwind**; otherwise use inline styles
>    (`width:100%`, fixed pixel heights, `flex`).
> 4. Non-WebGL cards (e.g. 2D-canvas particle effects) still need the **same
>    sizing fix** (Problem 2).

---

## The problems & root causes

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Most shader cards never load / load slow & janky | Each card made its **own WebGL context** (browser cap ~8–16 → silent failures); compile/link status queried right after compile → **~40ms synchronous GPU stall** each; compile only started once on-screen | One **shared WebGL context**, compile **once** per unique shader (cached), blit to per-card **2D canvas** |
| 2 | Cards have unequal, jumping width/height | Card root had fixed height but **no width**; preview canvas is `position:absolute` (0 layout width) → card collapsed to its **text width** | `w-full` on card root **and** its list wrapper; fixed-height preview box |
| 3 | Cards flash blank / show a generic gradient | Placeholder hid the real non-render | Render the **real shader's first frame synchronously** on scroll-in; 2D canvas keeps its last frame off-screen |
| 4 | Heavy / slow | `devicePixelRatio` (up to 2 = 4× pixels) at 60fps × many cards | Cap DPR to 1 for thumbnails; gate to 30fps |
| 5 | Every card looks identical | Shaders ignore a per-item seed | Feed `u_seed` gated by `u_unique` + CSS hue-rotate (see `artifact-uniqueness.md`) |

**Do NOT:** give each card its own WebGL context; query compile/link status on the
hot path; recompile a shader on every scroll; hide non-rendering behind a gradient;
run all cards at 60fps / DPR 2.

---

## 1. `shaderEngine.ts` — one shared context, compile-once, render-on-demand

```ts
// One shared WebGL context for the whole app. Compiles each unique fragment
// shader ONCE (cached by source) and renders on demand. Callers blit the result
// onto their own cheap 2D canvas — sidestepping the browser's WebGL-context cap.

const VERT_SRC = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FALLBACK_FRAG = `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.3;
  float n = sin(st.x * 4.0 + t) * cos(st.y * 4.0 - t) * 0.5 + 0.5;
  gl_FragColor = vec4(mix(vec3(0.04,0.02,0.08), vec3(0.10,0.05,0.18), n), 1.0);
}
`;

function sanitizeGLSL(src: string): string {
  return src.replace(/[​‌‍﻿­]/g, "").replace(/\r\n/g, "\n");
}

// Auto-declares u_seed / u_unique if a shader references them but didn't declare
// them, so per-shader code only needs the seed INJECTION, not the boilerplate.
export function ensureSeedUniforms(src: string): string {
  let inject = "";
  if (!/uniform\s+float\s+u_seed\s*;/.test(src)) inject += "uniform float u_seed;\n";
  if (!/uniform\s+float\s+u_unique\s*;/.test(src)) inject += "uniform float u_unique;\n";
  if (!inject) return src;
  if (src.includes("precision mediump float;")) {
    return src.replace("precision mediump float;", "precision mediump float;\n" + inject);
  }
  return inject + src;
}

interface Uniforms {
  res: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  seed: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
  unique: WebGLUniformLocation | null;
}
interface Entry { program: WebGLProgram; uniforms: Uniforms; }

let glCanvas: HTMLCanvasElement | null = null;
let gl: WebGLRenderingContext | null = null;
let sharedVert: WebGLShader | null = null;
let fallbackEntry: Entry | null = null;
const cache = new Map<string, Entry>();
let curW = 0, curH = 0, initTried = false;

function buildStatics() {
  if (!gl) return;
  sharedVert = gl.createShader(gl.VERTEX_SHADER);
  if (sharedVert) { gl.shaderSource(sharedVert, VERT_SRC); gl.compileShader(sharedVert); }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

function ensure(): boolean {
  if (initTried) return !!gl;
  initTried = true;
  glCanvas = document.createElement("canvas");
  glCanvas.width = 2; glCanvas.height = 2;
  gl = (glCanvas.getContext("webgl", {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "low-power",
  }) || glCanvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return false;
  glCanvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
  glCanvas.addEventListener("webglcontextrestored", () => {
    cache.clear(); fallbackEntry = null; sharedVert = null; curW = 0; curH = 0; buildStatics();
  });
  buildStatics();
  return true;
}

function buildProgram(fragSrc: string): Entry | null {
  if (!gl || !sharedVert) return null;
  const frag = gl.createShader(gl.FRAGMENT_SHADER);
  if (!frag) return null;
  gl.shaderSource(frag, sanitizeGLSL(ensureSeedUniforms(fragSrc)));
  gl.compileShader(frag);
  const program = gl.createProgram();
  if (!program) { gl.deleteShader(frag); return null; }
  gl.bindAttribLocation(program, 0, "a_position");
  gl.attachShader(program, sharedVert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  // One-time status check (cached after) — NOT a per-frame stall.
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program); gl.deleteShader(frag); return null;
  }
  return {
    program,
    uniforms: {
      res: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      seed: gl.getUniformLocation(program, "u_seed"),
      intensity: gl.getUniformLocation(program, "u_intensity"),
      unique: gl.getUniformLocation(program, "u_unique"),
    },
  };
}

function getEntry(fragSrc: string): Entry | null {
  const cached = cache.get(fragSrc);
  if (cached) return cached;
  const built = buildProgram(fragSrc);
  if (built) { cache.set(fragSrc, built); return built; }
  if (!fallbackEntry) fallbackEntry = buildProgram(FALLBACK_FRAG);
  if (fallbackEntry) cache.set(fragSrc, fallbackEntry);
  return fallbackEntry;
}

// Render one frame into the shared canvas; return it so the caller can blit
// immediately & synchronously (it's overwritten by the next call).
export function renderShader(
  fragSrc: string, w: number, h: number,
  time: number, seed: number, intensity: number, unique: number = 0,
): HTMLCanvasElement | null {
  if (!ensure() || !gl || !glCanvas || gl.isContextLost()) return null;
  const entry = getEntry(fragSrc);
  if (!entry) return null;
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (curW !== w || curH !== h) {
    glCanvas.width = w; glCanvas.height = h; curW = w; curH = h; gl.viewport(0, 0, w, h);
  }
  gl.useProgram(entry.program);
  const u = entry.uniforms;
  if (u.res) gl.uniform2f(u.res, w, h);
  if (u.time) gl.uniform1f(u.time, time);
  if (u.seed) gl.uniform1f(u.seed, seed);
  if (u.intensity) gl.uniform1f(u.intensity, intensity);
  if (u.unique) gl.uniform1f(u.unique, unique);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return glCanvas;
}
```

---

## 2. `ShaderThumb.tsx` — per-card 2D canvas that blits the engine

```tsx
import { useEffect, useRef } from "react";
import { renderShader } from "./shaderEngine";

interface Props {
  fragmentShader: string;
  className?: string;
  timeOffset?: number;
  seed?: number;
  intensity?: number;
  unique?: boolean;     // gates seed-driven variation + palette hue-rotate
  paused?: boolean;     // false = animate ambiently; !hovered = hover-only
  maxDpr?: number;      // 1 for thumbnails (fragment cost ∝ dpr²)
  fps?: number;         // 30 is plenty for ambient motion
}

export function ShaderThumb({
  fragmentShader, className, timeOffset = 0, seed = 0, intensity = 0.5,
  unique = false, paused = true, maxDpr = 1, fps = 30,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const lastDrawRef = useRef(0);
  const inViewRef = useRef(false);
  const startLoopRef = useRef<(() => void) | null>(null);

  const propsRef = useRef({ fragmentShader, timeOffset, seed, intensity, unique, paused, maxDpr, fps });
  propsRef.current = { fragmentShader, timeOffset, seed, intensity, unique, paused, maxDpr, fps };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, propsRef.current.maxDpr);
      const cw = canvas!.clientWidth || canvas!.offsetWidth || 300;
      const ch = canvas!.clientHeight || canvas!.offsetHeight || 230;
      const w = Math.max(1, Math.round(cw * dpr));
      const h = Math.max(1, Math.round(ch * dpr));
      if (canvas!.width !== w || canvas!.height !== h) { canvas!.width = w; canvas!.height = h; }
      return { w, h };
    }

    function renderOnce(now: number) {
      if (!alive || !ctx) return;
      const { w, h } = sizeCanvas();
      const p = propsRef.current;
      if (!startRef.current) startRef.current = now;
      const t = (now - startRef.current) / 1000 + p.timeOffset;
      const src = renderShader(p.fragmentShader, w, h, t, p.seed, p.intensity, p.unique ? 1 : 0);
      if (src) { ctx.clearRect(0, 0, canvas!.width, canvas!.height); ctx.drawImage(src, 0, 0, canvas!.width, canvas!.height); }
    }

    function loop() {
      if (!alive || !inViewRef.current || propsRef.current.paused) { rafRef.current = 0; return; }
      const now = performance.now();
      const interval = propsRef.current.fps > 0 ? 1000 / propsRef.current.fps : 0;
      if (interval > 0 && now - lastDrawRef.current < interval) { rafRef.current = requestAnimationFrame(loop); return; }
      lastDrawRef.current = now;
      renderOnce(now);
      rafRef.current = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (!alive || !inViewRef.current || propsRef.current.paused || rafRef.current) return;
      rafRef.current = requestAnimationFrame(loop);
    }
    startLoopRef.current = startLoop;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inViewRef.current = e.isIntersecting;
          if (e.isIntersecting) { renderOnce(performance.now()); startLoop(); }
          else if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        }
      },
      { threshold: 0.01, rootMargin: "300px" }, // begin ~300px before visible
    );
    io.observe(canvas);

    return () => { alive = false; io.disconnect(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentShader]);

  useEffect(() => { if (!paused) startLoopRef.current?.(); }, [paused]);

  // Per-seed palette expansion (gated by unique). ±18° keeps it in-family.
  const filter = unique
    ? `hue-rotate(${(seed % 37) - 18}deg) saturate(${1 + (seed % 22) / 100})`
    : "none";

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", background: "#04030a", filter }}
    />
  );
}
```

---

## 3. Card sizing fix (Problem 2)

Every card root needs **both** width and height; the preview is a fixed-height box;
the canvas fills it absolutely; the body flexes:

```tsx
<div className="w-full h-[430px] rounded-2xl overflow-hidden flex flex-col" /* ... */>
  <div className="relative h-[230px] shrink-0 overflow-hidden">
    <ShaderThumb
      fragmentShader={item.glsl}
      seed={item.seed} timeOffset={item.timeOffset}
      intensity={item.intensity} unique={!!item.unique}
      paused={false} maxDpr={1} fps={30}
      className="absolute inset-0"
    />
  </div>
  <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">{/* text */}</div>
</div>
```

And the **wrapper around each card in the list/masonry must also be `w-full`**, or
the card has no full-width parent to fill and collapses again:

```tsx
{items.map((a) => (
  <motion.div className="w-full" key={a.id}><Card item={a} /></motion.div>
))}
```

> Why: a flex/inline child with no explicit width sizes to its **content**, and an
> absolutely-positioned canvas contributes **zero** width — so the card was sizing
> to its text. `w-full` at *both* the card root and its wrapper fixes it.

(No Tailwind? Use `style={{ width: "100%", height: 430 }}` etc.)

---

## 4. Animation = ambient (not hover-gated)

Pass `paused={false}` so cards animate whenever they're on screen; off-screen ones
stop automatically via the IntersectionObserver. (Hover-only would be
`paused={!hovered}`.) This is affordable **only** because of the shared engine +
DPR 1 + 30fps cap.

---

## 5. Hero / detail view

For a single large shader (modal or detail page) keep a **dedicated WebGL
context** component (full DPR, uncapped fps is fine for one instance). It must run
the same `ensureSeedUniforms` on compile and accept the same `seed`/`unique` props
+ apply the same hue-rotate filter, so a hero view matches its card.

---

## GLSL rules (so authored/edited shaders compile in WebGL1)

- Start with `#ifdef GL_ES \n precision mediump float; \n #endif`; **no** `#version`.
- Use only `u_resolution, u_time, u_seed, u_unique` (+ optional `u_intensity`); **no textures**.
- `for` loops need **constant bounds** (`for(float i=0.;i<8.;i++){ if(i>=n) break; }`); **no** `while`; declare all vars; functions before use.
- End with `gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);`.

## Verification (must do in a browser)

1. Scroll the whole gallery → **every visible card shows its real shader** (sample
   a 2D canvas with `getImageData` for non-black pixels; WebGL fallbacks are silent,
   so eyeball too).
2. All cards report identical width & height via `getBoundingClientRect()` across
   breakpoints — test a card with very short text.
3. Idle `drawArrays`/sec ≈ 0 with `paused` true; ambient mode ~30fps/card, page ~60fps.
4. `console.error` count is 0 after a full reload (ignore stale HMR errors mid-edit).
