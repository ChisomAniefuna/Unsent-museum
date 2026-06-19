import { useEffect, useRef, useState } from "react";
import { ensureSeedUniforms } from "./shaderEngine";

// ---------------------------------------------------------------------------
// Module-level WebGL context pool
// Browsers allow ~8-16 simultaneous WebGL contexts. We cap at 8 to be safe.
// Canvases that are in-viewport get a slot; ones that scroll out release theirs.
// This prevents context-limit blanks entirely.
// ---------------------------------------------------------------------------
const MAX_GL_CONTEXTS = 8;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(onGranted: () => void) {
  if (activeCount < MAX_GL_CONTEXTS) {
    activeCount++;
    onGranted();
  } else {
    waitQueue.push(onGranted);
  }
}

function releaseSlot() {
  activeCount = Math.max(0, activeCount - 1);
  const next = waitQueue.shift();
  if (next) {
    activeCount++;
    next();
  }
}

// ---------------------------------------------------------------------------

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

interface Props {
  fragmentShader: string;
  className?: string;
  paused?: boolean;
  timeOffset?: number;
  seed?: number;
  intensity?: number;
  // Accent color for the instant "never blank" poster shown until the first
  // shader frame draws. Mirrors the aurora-fallback pattern in the 2D cards.
  poster?: string;
  // Cap on the device-pixel-ratio used for the drawing buffer. Fragment cost
  // scales with the SQUARE of this, so small card previews pass 1 (≈4x cheaper
  // than the default 2 on retina) while large hero views can pass 2 for crispness.
  maxDpr?: number;
  // Frame-rate cap. Ambient backgrounds look fine at 30fps and it halves GPU
  // work vs 60. 0 means uncapped (run at display refresh rate).
  fps?: number;
  // Enables the shader's seed-driven unique arrangement (new artifacts). Older
  // artifacts pass false so they render exactly as before.
  unique?: boolean;
}

interface Uniforms {
  res: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  seed: WebGLUniformLocation | null;
  intensity: WebGLUniformLocation | null;
  unique: WebGLUniformLocation | null;
}

interface GLState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  vert: WebGLShader;
  frag: WebGLShader;
  raf: number;
  start: number;
  // Uniform locations are resolved once at link time and reused every frame , 
  // looking them up per-frame is pure overhead.
  uniforms: Uniforms;
}

export function WebGLCanvas({
  fragmentShader,
  className,
  paused = false,
  timeOffset = 0,
  seed = 0,
  intensity = 0.5,
  poster,
  maxDpr = 2,
  fps = 0,
  unique = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GLState | null>(null);
  // Instant poster stays visible until the first real shader frame is drawn,
  // so the card never flashes blank while the GPU compiles.
  const [posterVisible, setPosterVisible] = useState(true);
  const firstFrameRef = useRef(false);
  const pausedRef = useRef(paused);
  const fragmentRef = useRef(fragmentShader);
  const timeOffsetRef = useRef(timeOffset);
  const seedRef = useRef(seed);
  const intensityRef = useRef(intensity);
  const uniqueRef = useRef(unique);
  const maxDprRef = useRef(maxDpr);
  // Minimum ms between drawn frames (derived from fps; 0 = uncapped).
  const frameIntervalRef = useRef(fps > 0 ? 1000 / fps : 0);
  // Timestamp of the last drawn frame, for the fps gate.
  const lastDrawRef = useRef(0);
  // Track whether this canvas currently holds a context slot
  const hasSlotRef = useRef(false);
  // Track whether we're currently in the viewport
  const inViewRef = useRef(false);
  // rAF handle for the async parallel-compile poll, before stateRef exists
  const initRafRef = useRef(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { fragmentRef.current = fragmentShader; }, [fragmentShader]);
  useEffect(() => { timeOffsetRef.current = timeOffset; }, [timeOffset]);
  useEffect(() => { seedRef.current = seed; }, [seed]);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);
  useEffect(() => { uniqueRef.current = unique; }, [unique]);
  useEffect(() => { maxDprRef.current = maxDpr; }, [maxDpr]);
  useEffect(() => { frameIntervalRef.current = fps > 0 ? 1000 / fps : 0; }, [fps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // New shader → show the poster again until the first frame of the new one draws.
    firstFrameRef.current = false;
    setPosterVisible(true);

    // NOTE: we deliberately do NOT call getShaderParameter(COMPILE_STATUS) here.
    // Querying compile status forces the driver to finish compiling synchronously,
    // stalling the main thread (~40ms per shader). Instead we kick off the compile,
    // link, and let the program-level completion check (via KHR_parallel_shader_compile)
    // confirm success without blocking. Compile errors surface as a link failure,
    // which we recover from by falling back to FALLBACK_FRAG.
    function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
      if (gl.isContextLost()) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      const prepared = type === gl.FRAGMENT_SHADER ? ensureSeedUniforms(src) : src;
      gl.shaderSource(s, sanitizeGLSL(prepared));
      gl.compileShader(s);
      return s;
    }

    function buildFrame(gl: WebGLRenderingContext, program: WebGLProgram, start: number) {
      function frame() {
        if (!canvas || !stateRef.current) return;
        if (gl.isContextLost()) return;

        // FPS gate: keep requesting frames but only draw at the target rate.
        const interval = frameIntervalRef.current;
        if (interval > 0) {
          const now = performance.now();
          if (now - lastDrawRef.current < interval) {
            if (!pausedRef.current && stateRef.current) {
              stateRef.current.raf = requestAnimationFrame(frame);
            }
            return;
          }
          lastDrawRef.current = now;
        }

        const dpr = Math.min(devicePixelRatio, maxDprRef.current);
        const cw = canvas.clientWidth || canvas.offsetWidth || 300;
        const ch = canvas.clientHeight || canvas.offsetHeight || 300;
        const w = Math.max(Math.round(cw * dpr), 1);
        const h = Math.max(Math.round(ch * dpr), 1);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }

        const t = (performance.now() - start) / 1000 + timeOffsetRef.current;
        const u = stateRef.current.uniforms;
        if (u.res) gl.uniform2f(u.res, w, h);
        if (u.time) gl.uniform1f(u.time, t);
        if (u.seed) gl.uniform1f(u.seed, ((seedRef.current % 10000) + 10000) % 10000 / 100);
        if (u.intensity) gl.uniform1f(u.intensity, intensityRef.current);
        if (u.unique) gl.uniform1f(u.unique, uniqueRef.current ? 1 : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // First real frame is on screen, fade the poster away.
        if (!firstFrameRef.current) {
          firstFrameRef.current = true;
          setPosterVisible(false);
        }

        if (!pausedRef.current && stateRef.current) {
          stateRef.current.raf = requestAnimationFrame(frame);
        }
      }
      return frame;
    }

    interface BuiltProgram {
      program: WebGLProgram;
      vert: WebGLShader;
      frag: WebGLShader;
    }

    // Compile + link without ever querying status (which would block). Returns the
    // in-flight program; readiness is polled separately via the parallel-compile ext.
    function buildProgram(gl: WebGLRenderingContext, fragSrc: string): BuiltProgram | null {
      const vert = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
      const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
      if (!vert || !frag) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      return { program, vert, frag };
    }

    function activate(gl: WebGLRenderingContext, built: BuiltProgram) {
      const { program } = built;
      gl.useProgram(program);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      // Resolve uniform locations once, reused every frame.
      const uniforms: Uniforms = {
        res: gl.getUniformLocation(program, "u_resolution"),
        time: gl.getUniformLocation(program, "u_time"),
        seed: gl.getUniformLocation(program, "u_seed"),
        intensity: gl.getUniformLocation(program, "u_intensity"),
        unique: gl.getUniformLocation(program, "u_unique"),
      };

      const start = performance.now();
      stateRef.current = { gl, program, vert: built.vert, frag: built.frag, raf: 0, start, uniforms };
      stateRef.current.raf = requestAnimationFrame(buildFrame(gl, program, start));
    }

    function initGL() {
      // Guard: don't double-init
      if (stateRef.current) return;

      // Re-show the poster for every (re)init, including scroll-back after the
      // context was destroyed, so there's never a blank gap while it recompiles.
      firstFrameRef.current = false;
      setPosterVisible(true);

      const gl = (
        canvas!.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" }) ||
        canvas!.getContext("experimental-webgl", { alpha: false })
      ) as WebGLRenderingContext | null;

      if (!gl) return;

      // KHR_parallel_shader_compile lets the driver compile/link on a background
      // thread; we poll COMPLETION_STATUS_KHR instead of blocking on LINK_STATUS.
      const parallelExt = gl.getExtension("KHR_parallel_shader_compile") as
        | { COMPLETION_STATUS_KHR: number }
        | null;

      let built = buildProgram(gl, fragmentRef.current);
      let usedFallback = false;
      if (!built) {
        built = buildProgram(gl, FALLBACK_FRAG);
        usedFallback = true;
      }
      if (!built) return;

      function poll() {
        if (!built || gl!.isContextLost() || !inViewRef.current) {
          initRafRef.current = 0;
          return;
        }
        // If the extension is present, wait until compilation has actually finished.
        // Without it, fall through and check link status immediately.
        if (parallelExt && gl!.getProgramParameter(built.program, parallelExt.COMPLETION_STATUS_KHR) !== true) {
          initRafRef.current = requestAnimationFrame(poll);
          return;
        }

        initRafRef.current = 0;
        if (gl!.getProgramParameter(built.program, gl!.LINK_STATUS)) {
          activate(gl!, built);
          return;
        }

        // Link failed, clean up and retry once with the safe fallback shader.
        gl!.deleteProgram(built.program);
        gl!.deleteShader(built.vert);
        gl!.deleteShader(built.frag);
        if (!usedFallback) {
          usedFallback = true;
          built = buildProgram(gl!, FALLBACK_FRAG);
          if (built) initRafRef.current = requestAnimationFrame(poll);
        }
      }

      poll();
    }

    function destroyGL() {
      if (initRafRef.current) {
        cancelAnimationFrame(initRafRef.current);
        initRafRef.current = 0;
      }
      if (!stateRef.current) return;
      const { gl, program, vert, frag, raf } = stateRef.current;
      cancelAnimationFrame(raf);
      try {
        gl.deleteProgram(program);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
        // Resize to 0 to free GPU memory without the loseContext() race condition
        canvas!.width = 0;
        canvas!.height = 0;
      } catch (_) { /* best-effort cleanup */ }
      stateRef.current = null;
    }

    function pauseRAF() {
      if (!stateRef.current) return;
      cancelAnimationFrame(stateRef.current.raf);
      stateRef.current.raf = 0;
    }

    function resumeRAF() {
      if (!stateRef.current) return;
      if (stateRef.current.raf) return; // already running
      const { gl, program, start } = stateRef.current;
      stateRef.current.raf = requestAnimationFrame(buildFrame(gl, program, start));
    }

    // When the browser forcibly kills our context (too many open globally),
    // clean up and re-acquire a slot to rebuild it.
    function onContextLost(e: Event) {
      e.preventDefault();
      if (initRafRef.current) {
        cancelAnimationFrame(initRafRef.current);
        initRafRef.current = 0;
      }
      if (stateRef.current) {
        cancelAnimationFrame(stateRef.current.raf);
        stateRef.current = null;
      }
      // Give back our slot so others can use it
      if (hasSlotRef.current) {
        hasSlotRef.current = false;
        releaseSlot();
      }
      // Re-acquire and rebuild if still in view
      if (inViewRef.current) {
        acquireSlot(() => {
          hasSlotRef.current = true;
          initGL();
        });
      }
    }

    function onContextRestored() {
      if (inViewRef.current && !stateRef.current) {
        initGL();
      }
    }

    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inViewRef.current = entry.isIntersecting;

          if (entry.isIntersecting) {
            if (!hasSlotRef.current) {
              // Request a slot from the pool
              acquireSlot(() => {
                hasSlotRef.current = true;
                if (inViewRef.current) initGL();
                else {
                  // Slot granted but already left view, release immediately
                  hasSlotRef.current = false;
                  releaseSlot();
                }
              });
            } else {
              // We already have a slot, just resume the RAF
              if (!stateRef.current) initGL();
              else resumeRAF();
            }
          } else {
            // Scrolled out of view, pause rendering but keep the context alive
            // so scrolling back is instant. Only free the slot after a delay
            // to avoid thrashing during fast scroll.
            pauseRAF();
            // Don't release the slot immediately; give it 3s grace period
            const captured = setTimeout(() => {
              if (!inViewRef.current && stateRef.current) {
                destroyGL();
                if (hasSlotRef.current) {
                  hasSlotRef.current = false;
                  releaseSlot();
                }
              }
            }, 3000);
            // Cancel the timeout if we come back into view before it fires
            const earlyCancel = new IntersectionObserver(
              (e2) => {
                if (e2[0].isIntersecting) {
                  clearTimeout(captured);
                  earlyCancel.disconnect();
                }
              },
              { threshold: 0.01, rootMargin: "300px" }
            );
            earlyCancel.observe(canvas!);
          }
        }
      },
      // rootMargin pre-loads shaders ~300px before they scroll into view, so the
      // parallel compile finishes by the time the card is actually visible.
      { threshold: 0.01, rootMargin: "300px" }
    );

    observer.observe(canvas);

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      observer.disconnect();
      if (stateRef.current) destroyGL();
      if (hasSlotRef.current) {
        hasSlotRef.current = false;
        releaseSlot();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentShader, timeOffset]);

  // Handle pause/resume without re-init
  useEffect(() => {
    if (!stateRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const { gl, start } = stateRef.current;
    if (!paused) {
      function frame() {
        if (!canvas || !stateRef.current || gl.isContextLost()) return;
        const interval = frameIntervalRef.current;
        if (interval > 0) {
          const now = performance.now();
          if (now - lastDrawRef.current < interval) {
            if (!pausedRef.current && stateRef.current) {
              stateRef.current.raf = requestAnimationFrame(frame);
            }
            return;
          }
          lastDrawRef.current = now;
        }
        const dpr = Math.min(devicePixelRatio, maxDprRef.current);
        const w = Math.max(Math.round((canvas.clientWidth || 300) * dpr), 1);
        const h = Math.max(Math.round((canvas.clientHeight || 300) * dpr), 1);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        const t = (performance.now() - start) / 1000 + timeOffsetRef.current;
        const u = stateRef.current.uniforms;
        if (u.res) gl.uniform2f(u.res, w, h);
        if (u.time) gl.uniform1f(u.time, t);
        if (u.seed) gl.uniform1f(u.seed, ((seedRef.current % 10000) + 10000) % 10000 / 100);
        if (u.intensity) gl.uniform1f(u.intensity, intensityRef.current);
        if (u.unique) gl.uniform1f(u.unique, uniqueRef.current ? 1 : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // First real frame is on screen, fade the poster away.
        if (!firstFrameRef.current) {
          firstFrameRef.current = true;
          setPosterVisible(false);
        }
        if (!pausedRef.current && stateRef.current) {
          stateRef.current.raf = requestAnimationFrame(frame);
        }
      }
      cancelAnimationFrame(stateRef.current.raf);
      stateRef.current.raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(stateRef.current.raf);
    }
  }, [paused]);

  // Per-seed palette expansion for unique (new) artifacts; existing ones untouched.
  const filter = unique
    ? `hue-rotate(${((seed % 37) - 18)}deg) saturate(${1 + (seed % 22) / 100})`
    : "none";

  return (
    <div className={className} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", background: "#04030a", filter }}
      />
      {/* Instant poster, a palette-tinted gradient shown immediately, fading out
          the moment the first shader frame is drawn so the card is never blank. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: poster
            ? `radial-gradient(circle at 50% 42%, ${poster}40, #06040c 72%)`
            : "#04030a",
          opacity: posterVisible ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      />
    </div>
  );
}
