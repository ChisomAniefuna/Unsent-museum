// ─────────────────────────────────────────────────────────────────────────────
// Shared shader engine
//
// A browser allows only ~8-16 simultaneous WebGL contexts, so giving every card
// its own context (the old approach) meant most cards never rendered, they showed
// a placeholder forever. This module uses ONE shared WebGL context for the whole
// app: it compiles each unique fragment shader a single time (cached by source)
// and renders it on demand. Callers blit the result onto their own cheap 2D canvas
// (`<canvas>.getContext("2d")` has no practical count limit), so a gallery can show
// dozens of live shaders at once.
//
// Because programs are cached, a shader compiles only the first time it is needed , 
// never again on scroll, so cards appear effectively instantly after that.
// ─────────────────────────────────────────────────────────────────────────────

const VERT_SRC = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

// Safe shader used when a card's own shader fails to compile/link.
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

// Guarantees u_seed and u_unique are declared in any shader that references them,
// so individual shaders only need the seed INJECTION (in main), not the uniform
// boilerplate. Inserted after the precision line (float needs precision first).
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

interface Entry {
  program: WebGLProgram;
  uniforms: Uniforms;
}

let glCanvas: HTMLCanvasElement | null = null;
let gl: WebGLRenderingContext | null = null;
let sharedVert: WebGLShader | null = null;
let fallbackEntry: Entry | null = null;
const cache = new Map<string, Entry>();
let curW = 0;
let curH = 0;
let initTried = false;

function buildStatics() {
  if (!gl) return;
  // One vertex shader, reused by every program.
  sharedVert = gl.createShader(gl.VERTEX_SHADER);
  if (sharedVert) {
    gl.shaderSource(sharedVert, VERT_SRC);
    gl.compileShader(sharedVert);
  }
  // One fullscreen quad; attribute location 0 is enabled once and stays bound
  // (vertex-attrib state is global, not per-program).
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
  glCanvas.width = 2;
  glCanvas.height = 2;
  gl = (glCanvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  }) || glCanvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return false;

  glCanvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
  });
  glCanvas.addEventListener("webglcontextrestored", () => {
    // Drop cached programs/state; they belong to the lost context.
    cache.clear();
    fallbackEntry = null;
    sharedVert = null;
    curW = 0;
    curH = 0;
    buildStatics();
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
  if (!program) {
    gl.deleteShader(frag);
    return null;
  }
  gl.bindAttribLocation(program, 0, "a_position");
  gl.attachShader(program, sharedVert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  // Each shader links exactly once (then it's cached), so this one-time status
  // check is cheap overall, not the per-frame, per-card stall of the old code.
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteShader(frag);
    return null;
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
  if (built) {
    cache.set(fragSrc, built);
    return built;
  }

  // Compile/link failed, fall back to the safe shader and cache that under this
  // source so we don't retry the broken one every frame.
  if (!fallbackEntry) fallbackEntry = buildProgram(FALLBACK_FRAG);
  if (fallbackEntry) cache.set(fragSrc, fallbackEntry);
  return fallbackEntry;
}

/**
 * Render one frame of `fragSrc` at `w`×`h` into the shared canvas and return that
 * canvas so the caller can blit it (e.g. `ctx2d.drawImage(returned, ...)`).
 * Returns null only if WebGL is unavailable. The returned canvas is valid until
 * the next call, so blit immediately and synchronously.
 */
export function renderShader(
  fragSrc: string,
  w: number,
  h: number,
  time: number,
  seed: number,
  intensity: number,
  unique: number = 0,
): HTMLCanvasElement | null {
  if (!ensure() || !gl || !glCanvas) return null;
  if (gl.isContextLost()) return null;

  const entry = getEntry(fragSrc);
  if (!entry) return null;

  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  if (curW !== w || curH !== h) {
    glCanvas.width = w;
    glCanvas.height = h;
    curW = w;
    curH = h;
    gl.viewport(0, 0, w, h);
  }

  gl.useProgram(entry.program);
  const u = entry.uniforms;
  if (u.res) gl.uniform2f(u.res, w, h);
  if (u.time) gl.uniform1f(u.time, time);
  // Normalize seed to a small numerically-stable range (0-100) so GLSL hash
  // functions (which rely on fract(sin(dot(...)))) stay coherent. Raw seeds
  // from simpleHash() can be 100M+, which makes hash() produce per-pixel noise
  // and the shader renders as a flat gradient.
  if (u.seed) gl.uniform1f(u.seed, ((seed % 10000) + 10000) % 10000 / 100);
  if (u.intensity) gl.uniform1f(u.intensity, intensity);
  if (u.unique) gl.uniform1f(u.unique, unique);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  return glCanvas;
}

/** Whether a shader compiles & links cleanly (false → it would use the fallback). */
export function isShaderValid(fragSrc: string): boolean {
  if (!ensure() || !gl) return false;
  const entry = getEntry(fragSrc);
  return !!entry && entry !== fallbackEntry;
}
