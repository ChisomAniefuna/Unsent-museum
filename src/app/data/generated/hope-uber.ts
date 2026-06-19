import type { ShaderDef } from "../shaders";

// Hope uber-shader. One GLSL program; 5 gene axes selected from u_seed produce
// 8 x 4 x 5 x 3 x 3 = 1,440 distinct looks per artifact.
//
//   field   : beams | bloom | filaments | dawn | spiral | flame | lanterns | rays
//   domain  : radial | wave | fractured | smoke
//   palette : gold | dawn | candle | sunbeam | ember
//   surface : soft | grain | streak
//   decay   : slow | pulse | rising

const def: ShaderDef = {
  id: "hope-uber",
  name: "Hope Field",
  description: "A parametric field of light. The seed chooses how hope arrives: beams, bloom, filaments, or rays.",
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

// Hope palettes lean warm. Each rises into a luminous highlight at the top end
// so beams, blooms, and rays read as actual light, not just colored noise.
vec3 palette(int p, float t){
    t = clamp(t, 0.0, 1.0);
    float lo = clamp(t*2.0, 0.0, 1.0);
    float hi = clamp(t*2.0 - 1.0, 0.0, 1.0);
    if (p == 0) { // gold: deep amber to leaf gold to cream
        return mix(mix(vec3(0.10,0.06,0.02), vec3(0.78,0.52,0.16), lo),
                   vec3(1.00,0.92,0.72), hi);
    } else if (p == 1) { // dawn: indigo to coral to peach
        return mix(mix(vec3(0.08,0.06,0.18), vec3(0.85,0.40,0.42), lo),
                   vec3(1.00,0.80,0.68), hi);
    } else if (p == 2) { // candle: warm brown to soft yellow to white
        return mix(mix(vec3(0.10,0.07,0.04), vec3(0.85,0.65,0.35), lo),
                   vec3(1.00,0.96,0.82), hi);
    } else if (p == 3) { // sunbeam: charcoal to cream to white
        return mix(mix(vec3(0.05,0.05,0.06), vec3(0.78,0.74,0.62), lo),
                   vec3(1.00,0.98,0.92), hi);
    }
    // ember: deep wine to ember orange to bright gold
    return mix(mix(vec3(0.10,0.02,0.02), vec3(0.95,0.45,0.18), lo),
               vec3(1.00,0.82,0.42), hi);
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
        t = u_time * 0.18;                                     // slow
    } else if (gDecay == 1) {
        t = u_time * 0.25 + 0.10 * sin(u_time * 0.55 + sd);    // pulse, candle-flicker feel
    } else {
        t = u_time * 0.35;                                     // rising, faster forward motion
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

    // ---- field ----
    float base;
    if (gField == 0) {
        // beams: vertical columns of light ascending
        float cols = 0.0;
        for (float k = 0.0; k < 4.0; k++) {
            float fx = hash11(sd + k * 7.3) * 1.8 - 0.9;          // column x position
            float w  = 0.04 + hash11(sd + k * 11.1) * 0.06;        // beam width
            float d  = abs(p.x - fx);
            float beam = exp(-d * d / (w * w)) ;
            // shimmer along the beam, drifting upward
            float shimmer = 0.5 + 0.5 * sin(p.y * 8.0 - t * (3.0 + k) + sd);
            cols += beam * (0.55 + 0.45 * shimmer);
        }
        // brighter at the top, fading at the bottom (light from above)
        float vert = smoothstep(-0.9, 0.9, p.y);
        base = clamp(cols * (0.40 + 0.60 * vert), 0.0, 1.0);
    } else if (gField == 1) {
        // bloom: warm radial light expanding from center
        float r = length(p);
        float n = fbm(p * 2.5 + t * 0.35 + sd);
        float core = exp(-r * 1.4);
        float halo = exp(-r * 0.7) * 0.55;
        base = clamp(core + halo + n * 0.20, 0.0, 1.0);
    } else if (gField == 2) {
        // filaments: thin curved threads, like gold leaf veins
        float v = 0.0;
        for (float k = 0.0; k < 3.0; k++) {
            float bend  = 1.5 + k * 0.8 + hash11(sd + k * 3.7);
            float phase = hash11(sd + k * 5.5) * 6.283;
            float wave  = p.x + 0.45 * sin(p.y * bend + t * 1.5 + phase + sd);
            float d     = abs(wave - (hash11(sd + k * 13.0) * 1.4 - 0.7));
            v += smoothstep(0.025, 0.0, d) * 0.7;
        }
        base = clamp(v, 0.0, 1.0);
    } else if (gField == 3) {
        // dawn: glowing horizon line, brightness rises above it
        float horizon = -0.15 + 0.15 * sin(p.x * 1.5 + sd);
        float d = p.y - horizon;
        float glow = exp(-abs(d) * 3.2);
        float sky  = smoothstep(-0.2, 1.0, d) * 0.65;
        float crust = fbm(p * 2.0 + t * 0.20 + sd) * 0.30;
        base = clamp(glow + sky + crust, 0.0, 1.0);
    } else if (gField == 4) {
        // spiral: golden ratio spiral arms, rotating outward
        float r = length(p) + 0.01;
        float a = atan(p.y, p.x);
        float arms = 3.0 + floor(hash11(sd + 19.0) * 4.0);
        float spiral = sin(a * arms - log(r) * 6.0 + t * 1.8 + sd);
        float mass = exp(-r * 1.2);
        base = clamp(mass * (0.55 + 0.55 * spiral), 0.0, 1.0);
    } else if (gField == 5) {
        // flame: turbulent rising plumes
        vec2 fp = p * vec2(1.4, 1.0);
        fp.y -= t * 1.6;                    // upward motion
        float plume = fbm(fp * 2.2 + sd);
        // narrower toward the top so flames have a tapered crown
        float taper = smoothstep(1.0, -0.8, p.y);
        float column = exp(-abs(p.x) * (1.8 + taper * 1.0));
        base = clamp(plume * column * 1.4, 0.0, 1.0);
    } else if (gField == 6) {
        // lanterns: drifting glowing orbs rising
        float v = 0.0;
        for (float k = 0.0; k < 4.0; k++) {
            vec2 pp = p * (2.0 + k * 1.2);
            pp.y -= t * (0.5 + k * 0.2);
            pp.x += 0.15 * sin(pp.y * 1.5 + t + k);
            vec2 c = floor(pp);
            vec2 f = fract(pp) - 0.5;
            vec2 r = vec2(hash21(c + sd + k * 17.1),
                          hash21(c + sd + k * 17.1 + 5.5));
            vec2 off = (r - 0.5) * 0.5;
            float d = length(f - off);
            float life = 0.5 + 0.5 * sin(r.y * 6.28 + t * 0.4);
            v += exp(-d * 12.0) * life * (0.55 + 0.45 * r.x);
        }
        base = clamp(v * 1.1, 0.0, 1.0);
    } else {
        // rays: sunburst lines radiating from center
        float r = length(p) + 0.01;
        float a = atan(p.y, p.x);
        float rayCount = 16.0 + floor(hash11(sd + 31.0) * 16.0);
        float ray = 0.5 + 0.5 * cos(a * rayCount + t * 0.6 + sd);
        ray = pow(ray, 4.0);
        float falloff = exp(-r * 1.0);
        float core = exp(-r * 3.0) * 0.7;
        base = clamp(ray * falloff + core, 0.0, 1.0);
    }

    // Lift base so dim hopes still register; bright hopes blow into the highlight.
    base = clamp(base * 1.30 + 0.05, 0.0, 1.0);

    // ---- palette ----
    vec3 col = palette(gPalette, base);

    // ---- surface overlay ----
    if (gSurface == 1) {
        // grain: warm film grain
        float g = (hash21(gl_FragCoord.xy + fract(u_time * 0.6)) - 0.5) * 0.10;
        col += vec3(g * 1.1, g, g * 0.8);
    } else if (gSurface == 2) {
        // streak: horizontal anamorphic light streaks (cinematic glow)
        float s = exp(-abs(uv.y) * (3.0 + hash11(sd + 8.7) * 4.0));
        col = mix(col, col * 1.35 + vec3(0.15, 0.10, 0.04), s * 0.35);
    }

    // Hope vignette is GENTLER than grief; light shouldn't be choked at the edges.
    col *= smoothstep(1.70, 0.35, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;
