import type { ShaderDef } from "../shaders";

// Closure uber-shader. 8 x 4 x 5 x 3 x 3 = 1,440 distinct looks.
//
//   field   : tide | gyroid | stillness | settling | horizon | breath | moon | enso
//   domain  : radial | wave | fractured | smoke
//   palette : mint | sky | abyss | sage | aurora
//   surface : soft | grain | film
//   decay   : slow | breath | settling

const def: ShaderDef = {
  id: "closure-uber",
  name: "Closure Field",
  description: "A parametric stillness. The seed chooses how peace arrives: tide, gyroid, horizon, or enso.",
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

float gene(float salt, float n){
    return floor(hash11(u_seed*7.13 + salt*17.93) * n);
}

vec3 palette(int p, float t){
    t = clamp(t, 0.0, 1.0);
    float lo = clamp(t*2.0, 0.0, 1.0);
    float hi = clamp(t*2.0 - 1.0, 0.0, 1.0);
    if (p == 0) { // mint: deep teal to mint to cream
        return mix(mix(vec3(0.02,0.10,0.10), vec3(0.18,0.62,0.55), lo),
                   vec3(0.86,0.96,0.88), hi);
    } else if (p == 1) { // sky: deep dawn-blue to soft sky to cream
        return mix(mix(vec3(0.04,0.08,0.16), vec3(0.32,0.56,0.78), lo),
                   vec3(0.92,0.96,1.00), hi);
    } else if (p == 2) { // abyss: deep navy to mid teal to soft white (ocean settling)
        return mix(mix(vec3(0.02,0.05,0.10), vec3(0.10,0.40,0.55), lo),
                   vec3(0.78,0.90,0.94), hi);
    } else if (p == 3) { // sage: deep moss to sage to ivory
        return mix(mix(vec3(0.06,0.10,0.06), vec3(0.42,0.58,0.42), lo),
                   vec3(0.92,0.95,0.84), hi);
    }
    // aurora: deep violet-teal to soft green-mint to cream
    return mix(mix(vec3(0.04,0.06,0.14), vec3(0.32,0.62,0.62), lo),
               vec3(0.85,0.95,0.92), hi);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy) / u_resolution.y;

    float sd = u_seed * u_unique;

    int gField   = int(mix(0.0, gene(1.0, 8.0), u_unique));
    int gDomain  = int(mix(0.0, gene(2.0, 4.0), u_unique));
    int gPalette = int(mix(0.0, gene(3.0, 5.0), u_unique));
    int gSurface = int(mix(0.0, gene(4.0, 3.0), u_unique));
    int gDecay   = int(mix(0.0, gene(5.0, 3.0), u_unique));

    float t;
    if (gDecay == 0) {
        t = u_time * 0.12;                                    // slow
    } else if (gDecay == 1) {
        t = u_time * 0.14 + 0.06 * sin(u_time * 0.30 + sd);   // breath, gentle inhale/exhale
    } else {
        // settling: motion that slows down asymptotically
        t = log(u_time * 0.4 + 1.0) * 0.55;
    }

    // ---- domain warp ----
    vec2 p = uv;
    if (gDomain == 1) {
        p.x += 0.14 * sin(uv.y * 2.5 + t + sd);
        p.y -= 0.06 * sin(uv.x * 1.8 - t * 0.7 + sd);
    } else if (gDomain == 2) {
        float k = 4.0 + hash11(sd + 11.0) * 6.0;
        vec2 cell = (floor(uv * k) + 0.5) / k;
        p = mix(cell, uv, 0.35);
    } else if (gDomain == 3) {
        vec2 warp = vec2(fbm(uv*1.1 + t*0.25 + sd),
                          fbm(uv*1.1 - t*0.30 + sd*1.7));
        p = uv + 0.32 * (warp - 0.5);
    }

    // ---- field ----
    float base;
    if (gField == 0) {
        // tide: gentle horizontal swells, lapping at rest
        float wave = 0.12 * sin(p.x * 1.8 + t * 0.6 + sd)
                   + 0.07 * sin(p.x * 4.2 - t * 0.4 + sd * 2.3);
        float d = abs(p.y - wave);
        float surface = exp(-d * 4.0);
        float depth = smoothstep(1.0, -0.5, p.y) * 0.30;
        base = clamp(surface + depth, 0.0, 1.0);
    } else if (gField == 1) {
        // gyroid: triply-periodic surface, the geometry of resolution
        float zoom = 1.4 + hash11(sd + 5.0) * 1.5;
        vec3 q = vec3(p * zoom + sd, t * 0.30 + sd * 0.5);
        float g = sin(q.x) * cos(q.y) + sin(q.y) * cos(q.z) + sin(q.z) * cos(q.x);
        // banded contours, soft transition
        float c1 = 1.0 - smoothstep(0.0, 0.20, abs(g));
        float c2 = 1.0 - smoothstep(0.0, 0.10, abs(g - 1.0));
        float c3 = 1.0 - smoothstep(0.0, 0.10, abs(g + 1.0));
        base = clamp(c1 * 0.85 + c2 * 0.45 + c3 * 0.45, 0.0, 1.0);
    } else if (gField == 2) {
        // stillness: vast soft radial gradient, almost no motion
        float r = length(p);
        float drift = fbm(p * 0.8 + t * 0.10 + sd) * 0.20;
        float core = exp(-r * 0.8) + drift;
        base = clamp(core, 0.0, 1.0);
    } else if (gField == 3) {
        // settling: particles slowly drifting to the bottom, accumulating
        float v = 0.0;
        for (float k = 0.0; k < 5.0; k++) {
            vec2 pp = p * (3.0 + k * 1.6);
            pp.y -= t * (0.20 + k * 0.06);     // very slow descent
            pp.x += 0.08 * sin(pp.y * 1.0 + t * 0.4 + k);
            vec2 c = floor(pp);
            vec2 f = fract(pp) - 0.5;
            vec2 r = vec2(hash21(c + sd + k * 13.7),
                          hash21(c + sd + k * 13.7 + 5.5));
            vec2 off = (r - 0.5) * 0.4;
            float d = length(f - off);
            float life = 0.5 + 0.5 * sin(r.y * 6.28 + t * 0.3);
            v += smoothstep(0.05, 0.0, d) * life * (0.50 + 0.50 * r.x);
        }
        // sediment glow at the bottom
        float floor_glow = smoothstep(-1.0, 0.2, -p.y) * 0.20;
        base = clamp(v + floor_glow, 0.0, 1.0);
    } else if (gField == 4) {
        // horizon: a clean horizon line, sky above, depth below
        float horizon = 0.0 + 0.08 * sin(p.x * 1.0 + sd);
        float d = p.y - horizon;
        float glow = exp(-abs(d) * 4.0) * 0.85;
        float sky = smoothstep(-0.1, 1.2, d) * 0.55;
        float sea = smoothstep(0.1, -1.2, d) * 0.30;
        base = clamp(glow + sky + sea, 0.0, 1.0);
    } else if (gField == 5) {
        // breath: a soft pulse expanding and contracting from center
        float r = length(p);
        float pulse = 0.5 + 0.5 * sin(t * 1.4 + sd);
        float band = exp(-pow(r - pulse * 0.6, 2.0) * 14.0);
        float core = exp(-r * 1.6) * 0.55;
        base = clamp(band + core, 0.0, 1.0);
    } else if (gField == 6) {
        // moon: a soft luminous disc, faint glow ring
        vec2 mc = vec2(0.1 * sin(t * 0.2 + sd), 0.05 * cos(t * 0.25 + sd));
        float r = length(p - mc);
        float disc = smoothstep(0.30, 0.27, r);
        float glow = exp(-r * 3.0) * 0.45;
        float halo = exp(-pow(r - 0.32, 2.0) * 50.0) * 0.30;
        base = clamp(disc + glow + halo, 0.0, 1.0);
    } else {
        // enso: a single ink ring, slightly broken, breathing
        float r = length(p);
        float target = 0.50 + 0.02 * sin(t * 0.6 + sd);
        float ring = exp(-pow(r - target, 2.0) * 280.0);
        // erode part of the ring so it has the calligraphic open spot
        float a = atan(p.y, p.x);
        float gap = smoothstep(0.30, -0.30, cos(a - sd));
        ring *= mix(1.0, 0.05, gap * 0.6);
        // ink wash inside
        float wash = exp(-r * 1.5) * 0.18;
        base = clamp(ring * 1.4 + wash, 0.0, 1.0);
    }

    base = clamp(base * 1.30 + 0.07, 0.0, 1.0);

    vec3 col = palette(gPalette, base);

    if (gSurface == 1) {
        float g = (hash21(gl_FragCoord.xy + fract(u_time * 0.4)) - 0.5) * 0.08;
        col += g;
    } else if (gSurface == 2) {
        // film: faint horizontal scan banding, like the surface of still water
        float band = 0.5 + 0.5 * sin(uv.y * 80.0 + sd);
        col *= 0.92 + 0.08 * band;
    }

    col *= smoothstep(1.70, 0.32, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;

