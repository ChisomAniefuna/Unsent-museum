import type { ShaderDef } from "../shaders";

// Closure, the Fluid v2 "Flow" field rendered on a fully pixelated surface, in the
// Ocean palette. Ported from the fluid generator preset
//   p = 0.35, 2.3, 3, 0.03, 1, ... , 2
//   speed 0.35 · zoom 2.3 · warp 3 · grain 0.03 · field = Flow · palette = Ocean
// The whole frame is snapped to a coarse grid so the entire body reads as moving
// pixels, a slow current drifting toward stillness.
const def: ShaderDef = {
  id: "closure-fluid-pixel",
  name: "Becoming Water",
  description: "A slow current of pixels drifting toward stillness, closure rendered as moving water.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;
uniform float u_unique;

// Ocean palette (closure signature)
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 6; i++){ v += a * vnoise(p); p = p * 2.0 + vec2(3.1, 1.7); a *= 0.5; }
    return v;
}

vec3 pal(float t){
    t = fract(t);
    if(t < 0.33) return mix(C0, C1, t / 0.33);
    if(t < 0.66) return mix(C1, C2, (t - 0.33) / 0.33);
    return mix(C2, C3, (t - 0.66) / 0.34);
}

void main(){
    // Surface effect: pixelation. Snap the WHOLE frame to a coarse block grid so
    // the entire body becomes moving pixels (scales with canvas size).
    float px = max(6.0, u_resolution.y / 64.0);
    vec2 cell = floor(gl_FragCoord.xy / px);
    vec2 snapped = cell * px + px * 0.5;
    vec2 uv = (snapped * 2.0 - u_resolution.xy) / u_resolution.y;

    // Flow field. speed 0.35, zoom 2.3 (larger/calmer features), warp 3, grain 0.03.
    float t = u_time * 0.35;
    float sv = u_seed * u_unique;
    float zoom = 1.4;

    vec2 q = vec2(
        fbm(uv * zoom + vec2(t * 0.15 + sv, sv * 1.3)),
        fbm(uv * zoom + vec2(sv * 0.7, t * 0.12 + sv * 1.9))
    );
    vec2 w = uv + 1.5 * q;                 // warp strength 3
    float n = fbm(w * zoom + vec2(t * 0.10, -t * 0.08));

    vec3 col = pal(n + t * 0.05 + sv * 0.4);
    col = mix(BG, col, smoothstep(0.06, 0.62, n));
    col += pal(n + 0.5) * smoothstep(0.72, 0.94, n) * 0.30;

    // Grain 0.03, one value per pixel block.
    float grain = (hash(cell + fract(t)) - 0.5) * 0.03;
    col += grain;

    // Brightness honours intensity if the engine supplies it.
    col *= 0.85 + 0.3 * clamp(u_intensity, 0.0, 1.0);

    // Soft settle vignette.
    col *= smoothstep(1.65, 0.25, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
