import type { ShaderDef } from "../shaders";

// Grief uber-shader. One GLSL program; 5 gene axes selected from u_seed produce
// 8 x 4 x 5 x 3 x 3 = 1,440 distinct looks per artifact.
//
//   field   : flow | ridge | drift | void | whirlpool | tornado | well | dust
//   domain  : radial | wave | fractured | smoke    (spatial warp)
//   palette : ash | indigo | sepia | blue-grey | charcoal
//   surface : soft | grain | ribbon                (overlay)
//   decay   : slow | pulse | receding              (time shape)
//
// u_seed is normalized 0..100 at the GLSL boundary (see shader-seed-normalization).
// u_unique gates everything: 0 = canonical look, 1 = seed-driven variation.

const def: ShaderDef = {
  id: "grief-uber",
  name: "Grief Field",
  description: "A parametric grieving field. The seed chooses the form: flow, ridge, drift, or void.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }

float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    float a=hash21(i), b=hash21(i+vec2(1.0,0.0));
    float c=hash21(i+vec2(0.0,1.0)), d=hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; }
    return v;
}

// Gene extraction: hash the seed with a per-gene salt, scale to [0, n), floor.
// All pixels in one artifact resolve to the same integer, so the "branches"
// below are uniform-conditioned and not divergent on the GPU.
//
// The engine normalizes seed via (seed % 10000) / 100, so u_seed arrives in
// roughly [0, 100). Multiplier 7.13 (prime-ish) spreads adjacent seeds across
// the full hash range so neighbors don't collapse onto the same genes.
float gene(float salt, float n){
    return floor(hash11(u_seed*7.13 + salt*17.93) * n);
}

// Palettes lift the dark end so every field reads, even at low intensity.
// Each palette has a distinct hue identity at the mid-tone so adjacent seeds
// with different palettes look unmistakably different.
vec3 palette(int p, float t){
    t = clamp(t, 0.0, 1.0);
    float lo = clamp(t*2.0, 0.0, 1.0);
    float hi = clamp(t*2.0 - 1.0, 0.0, 1.0);
    if (p == 0) { // ash: pale neutral grey
        return mix(mix(vec3(0.10,0.10,0.10), vec3(0.55,0.53,0.50), lo),
                   vec3(0.92,0.90,0.85), hi);
    } else if (p == 1) { // indigo: cold purple
        return mix(mix(vec3(0.06,0.04,0.14), vec3(0.32,0.24,0.55), lo),
                   vec3(0.78,0.70,0.95), hi);
    } else if (p == 2) { // sepia: warm brown
        return mix(mix(vec3(0.10,0.06,0.04), vec3(0.55,0.38,0.20), lo),
                   vec3(0.95,0.82,0.62), hi);
    } else if (p == 3) { // blue-grey: cold steel
        return mix(mix(vec3(0.04,0.07,0.12), vec3(0.30,0.42,0.55), lo),
                   vec3(0.72,0.84,0.92), hi);
    }
    // charcoal: deep neutral with cool cast
    return mix(mix(vec3(0.05,0.05,0.07), vec3(0.32,0.30,0.36), lo),
               vec3(0.68,0.66,0.72), hi);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy) / u_resolution.y;

    float sd = u_seed * u_unique;

    int gField   = int(mix(0.0, gene(1.0, 8.0), u_unique));
    int gDomain  = int(mix(0.0, gene(2.0, 4.0), u_unique));
    int gPalette = int(mix(0.0, gene(3.0, 5.0), u_unique));
    int gSurface = int(mix(0.0, gene(4.0, 3.0), u_unique));
    int gDecay   = int(mix(0.0, gene(5.0, 3.0), u_unique));

    // ---- decay shapes time ----
    float t;
    if (gDecay == 0) {
        t = u_time * 0.112;
    } else if (gDecay == 1) {
        t = u_time * 0.18 + 0.06 * sin(u_time * 0.40 + sd);
    } else {
        t = log(u_time * 0.5 + 1.0) * 0.60;
    }

    // ---- domain warp ----
    vec2 p = uv;
    if (gDomain == 1) {
        p.x += 0.18 * sin(uv.y * 3.0 + t + sd);
        p.y -= 0.08 * sin(uv.x * 2.0 - t * 0.7 + sd);
    } else if (gDomain == 2) {
        float k = 4.0 + hash11(sd + 11.0) * 6.0;
        vec2 cell = (floor(uv * k) + 0.5) / k;
        p = mix(cell, uv, 0.35);
    } else if (gDomain == 3) {
        vec2 warp = vec2(fbm(uv*1.30 + t*0.30 + sd),
                          fbm(uv*1.30 - t*0.40 + sd*1.7));
        p = uv + 0.40 * (warp - 0.5);
    }
    // domain 0 (radial) leaves p == uv

    // ---- field ----
    float base;
    if (gField == 0) {
        // flow: domain-warped fbm clouds
        vec2 q = vec2(fbm(p*1.30 + t + sd), fbm(p*1.30 - t*0.70 + sd*2.1));
        base = fbm(p*1.10 + 1.40 * q + t*0.20);
        base = pow(clamp(base, 0.0, 1.0), 1.3);
    } else if (gField == 1) {
        // ridge: sharp valleys, crumpled-paper feel
        float n = fbm(p*1.50 + t*0.40 + sd);
        base = 1.0 - abs(2.0 * n - 1.0);
        base = pow(clamp(base, 0.0, 1.0), 1.5);
    } else if (gField == 2) {
        // drift: motes tumbling on a slow rise
        float v = 0.0;
        for (float k = 0.0; k < 4.0; k++) {
            vec2 pp = p * (3.0 + k * 2.0);
            pp.y += t * (0.30 + k * 0.10);
            vec2 c = floor(pp);
            vec2 f = fract(pp) - 0.5;
            vec2 r = vec2(hash21(c + sd + k * 19.7),
                          hash21(c + sd + k * 19.7 + 7.7));
            vec2 off = (r - 0.5) * 0.6;
            float d = length(f - off);
            float life = 0.5 + 0.5 * sin(t * (0.8 + k * 0.2) + r.x * 6.28);
            v += smoothstep(0.07, 0.0, d) * (0.55 + 0.45 * r.x) * life;
        }
        base = clamp(v, 0.0, 1.0);
    } else if (gField == 3) {
        // void: radial dim with noise crust
        float r = length(p);
        float crust = fbm(p * 2.50 + t * 0.30 + sd);
        base = (1.0 - smoothstep(0.0, 1.20, r)) * crust;
        base = clamp(base * 1.4, 0.0, 1.0);
    } else if (gField == 4) {
        // whirlpool: log-spiral arms rotating around a dark eye
        float r = length(p) + 0.01;
        float a = atan(p.y, p.x);
        float arms  = 4.0 + floor(hash11(sd + 13.0) * 4.0);
        float spiral = sin(a * arms + log(r) * 7.0 - t * 2.8 + sd);
        float mass   = smoothstep(0.95, 0.10, r);
        float swirl  = mass * (0.50 + 0.55 * spiral);
        float eye    = smoothstep(0.12, 0.0, r);
        base = clamp(swirl - eye * 0.9, 0.0, 1.0);
    } else if (gField == 5) {
        // tornado: tapered vertical funnel that twists, debris swirling
        float taper  = 0.40 + 0.85 * smoothstep(-1.0, 1.0, p.y);
        float r      = abs(p.x) / taper;
        float twist  = p.y * 4.5 + t * 1.8 + sd;
        float column = exp(-r * 3.2) * (0.55 + 0.45 * sin(twist + p.x * 5.5));
        // dust skirt around the column
        vec2 dp = vec2(p.x * 1.2, p.y - t * 0.6);
        float debris = fbm(dp * (3.5 + hash11(sd + 9.1) * 4.0) + sd);
        base = clamp(column + debris * 0.28, 0.0, 1.0);
    } else if (gField == 6) {
        // sinking well: log-spaced rings collapsing inward, dark bottom
        float r     = length(p) + 0.005;
        float rings = sin(log(r) * 9.0 - t * 3.2 + sd) * 0.5 + 0.5;
        rings       = pow(rings, 1.7);
        float pull  = smoothstep(0.05, 1.10, r);
        base = clamp(rings * pull, 0.0, 1.0);
        base *= smoothstep(0.06, 0.20, r); // black hole at the bottom
    } else {
        // dust rising: many small motes drifting upward with horizontal sway
        float v = 0.0;
        for (float k = 0.0; k < 5.0; k++) {
            vec2 pp = p * (4.0 + k * 3.0);
            pp.y -= t * (1.20 + k * 0.40);
            pp.x += 0.20 * sin(pp.y * 2.0 + t + k);
            vec2 c   = floor(pp);
            vec2 f   = fract(pp) - 0.5;
            vec2 rnd = vec2(hash21(c + sd + k * 11.3),
                            hash21(c + sd + k * 11.3 + 5.5));
            vec2 off = (rnd - 0.5) * 0.4;
            float d  = length(f - off);
            float life = 0.5 + 0.5 * sin(rnd.y * 6.28 + t * 0.6);
            v += smoothstep(0.05, 0.0, d) * life * (0.50 + 0.50 * rnd.x);
        }
        base = clamp(v * 1.20, 0.0, 1.0);
    }

    // Lift the base value so dim seeds still hit the palette mid-tones and
    // bright seeds blow into the highlights. Without this, every grief look
    // collapses to the palette's near-black end and seeds look identical.
    base = clamp(base * 1.45 + 0.10, 0.0, 1.0);

    // ---- palette ----
    vec3 col = palette(gPalette, base);

    // ---- surface overlay ----
    if (gSurface == 1) {
        // grain: film dust
        float g = (hash21(gl_FragCoord.xy + fract(u_time * 0.6)) - 0.5) * 0.12;
        col += g;
    } else if (gSurface == 2) {
        // ribbon: anisotropic vertical streaks
        float r = sin(uv.x * (14.0 + hash11(sd + 3.7) * 12.0) + sd) * 0.5 + 0.5;
        r = smoothstep(0.55, 1.0, r);
        col = mix(col, col * 1.22, r * 0.38);
    }

    // vignette always
    col *= smoothstep(1.50, 0.25, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;
