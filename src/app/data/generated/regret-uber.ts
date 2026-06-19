import type { ShaderDef } from "../shaders";

// Regret uber-shader. 8 x 4 x 5 x 3 x 3 = 1,440 distinct looks.
//
//   field   : ripple | undertow | fragment | echo | mist | spiral | fissure | drift
//   domain  : radial | wave | fractured | smoke
//   palette : ocean | ink | rust | slate | violet
//   surface : soft | grain | wash
//   decay   : slow | pulse | sinking

const def: ShaderDef = {
  id: "regret-uber",
  name: "Regret Field",
  description: "A parametric undertow. The seed chooses how regret moves: ripple, fissure, echo, or drift.",
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
    if (p == 0) { // ocean: abyss navy to mid blue to soft mist
        return mix(mix(vec3(0.02,0.04,0.10), vec3(0.18,0.35,0.55), lo),
                   vec3(0.78,0.88,0.95), hi);
    } else if (p == 1) { // ink: black to deep blue-grey to soft slate
        return mix(mix(vec3(0.03,0.03,0.06), vec3(0.22,0.24,0.32), lo),
                   vec3(0.70,0.72,0.78), hi);
    } else if (p == 2) { // rust: deep brown to rust to warm tan
        return mix(mix(vec3(0.08,0.04,0.02), vec3(0.55,0.28,0.16), lo),
                   vec3(0.92,0.78,0.62), hi);
    } else if (p == 3) { // slate: deep grey to slate to soft white
        return mix(mix(vec3(0.05,0.06,0.08), vec3(0.32,0.36,0.40), lo),
                   vec3(0.82,0.86,0.88), hi);
    }
    // violet: deep indigo to violet to soft lavender
    return mix(mix(vec3(0.05,0.04,0.12), vec3(0.32,0.22,0.55), lo),
               vec3(0.82,0.74,0.95), hi);
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
        t = u_time * 0.16;
    } else if (gDecay == 1) {
        t = u_time * 0.22 + 0.10 * sin(u_time * 0.40 + sd);
    } else {
        // sinking: t curls back on itself, things move INWARD
        t = u_time * 0.20;
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
        // ripple: concentric rings expanding from where you threw something in
        float r = length(p) + 0.005;
        float rings = sin(r * 18.0 - t * 4.0 + sd) * 0.5 + 0.5;
        float falloff = exp(-r * 0.9);
        base = clamp(rings * falloff * 1.4, 0.0, 1.0);
    } else if (gField == 1) {
        // undertow: pulled toward bottom-center, currents visible
        vec2 sink = p - vec2(0.0, -0.5);
        float r = length(sink) + 0.01;
        float a = atan(sink.y, sink.x);
        // flow lines spiraling inward
        float flow = sin(a * 3.0 + log(r) * 5.0 - t * 2.0 + sd);
        float pull = exp(-r * 0.7);
        base = clamp(pull * (0.45 + 0.55 * flow), 0.0, 1.0);
    } else if (gField == 2) {
        // fragment: broken shards scattered, lit unevenly
        float v = 0.0;
        for (float k = 0.0; k < 5.0; k++) {
            vec2 pp = p * (1.5 + k * 0.9);
            float ang = hash11(sd + k * 7.7) * 6.28;
            vec2 dir = vec2(cos(ang), sin(ang));
            vec2 perp = vec2(-dir.y, dir.x);
            float along = dot(pp - vec2(hash11(sd + k * 3.1) * 2.0 - 1.0,
                                        hash11(sd + k * 5.1) * 2.0 - 1.0), dir);
            float across = dot(pp, perp);
            // long thin shard, fading along its length
            float shard = exp(-abs(across) * 28.0) * smoothstep(0.5, 0.0, abs(along));
            v += shard * (0.5 + 0.5 * hash11(sd + k * 11.1));
        }
        base = clamp(v * 1.2, 0.0, 1.0);
    } else if (gField == 3) {
        // echo: repeating fading copies (something said too many times)
        float r = length(p);
        float pulse = 0.0;
        for (float k = 0.0; k < 4.0; k++) {
            float phase = fract(t * 0.35 - k * 0.25 + sd) * 1.4;
            float ring = exp(-pow(r - phase, 2.0) * 60.0);
            pulse += ring * (1.0 - k * 0.22);
        }
        base = clamp(pulse, 0.0, 1.0);
    } else if (gField == 4) {
        // mist: heavy fog drifting horizontally
        vec2 mp = p * vec2(1.0, 1.6);
        mp.x -= t * 0.4;
        float fog = fbm(mp * 1.5 + sd);
        float band = exp(-abs(p.y + 0.1) * 1.4);
        base = clamp(fog * (0.6 + 0.6 * band), 0.0, 1.0);
    } else if (gField == 5) {
        // spiral: descending log-spiral, dark at the center
        float r = length(p) + 0.01;
        float a = atan(p.y, p.x);
        float arms = 3.0 + floor(hash11(sd + 21.0) * 3.0);
        float spiral = sin(a * arms - log(r) * 8.0 + t * 2.0 + sd);
        float mass = smoothstep(0.95, 0.15, r);
        float eye = smoothstep(0.18, 0.0, r);
        base = clamp(mass * (0.45 + 0.55 * spiral) - eye * 0.8, 0.0, 1.0);
    } else if (gField == 6) {
        // fissure: cracks branching out across the frame
        float v = 0.0;
        for (float k = 0.0; k < 4.0; k++) {
            float ang = (k / 4.0) * 6.28 + sd;
            vec2 dir = vec2(cos(ang), sin(ang));
            vec2 perp = vec2(-dir.y, dir.x);
            float along = dot(p, dir);
            float across = dot(p, perp);
            float wig = 0.18 * sin(along * 5.0 + sd) + 0.10 * sin(along * 13.0 - sd);
            float d = abs(across - wig);
            float crack = smoothstep(0.018, 0.0, d) * smoothstep(1.2, 0.0, abs(along));
            v += crack;
        }
        base = clamp(v * 1.1, 0.0, 1.0);
    } else {
        // drift: things floating away to the right, slowly fading
        float v = 0.0;
        for (float k = 0.0; k < 5.0; k++) {
            vec2 pp = p * (2.5 + k * 1.4);
            pp.x -= t * (0.5 + k * 0.18);
            pp.y += 0.12 * sin(pp.x * 1.5 + t + k);
            vec2 c = floor(pp);
            vec2 f = fract(pp) - 0.5;
            vec2 r = vec2(hash21(c + sd + k * 17.3),
                          hash21(c + sd + k * 17.3 + 5.5));
            vec2 off = (r - 0.5) * 0.45;
            float d = length(f - off);
            // longer fade as they go right
            float fade = smoothstep(1.0, -1.0, p.x);
            v += smoothstep(0.06, 0.0, d) * fade * (0.55 + 0.45 * r.x);
        }
        base = clamp(v * 1.2, 0.0, 1.0);
    }

    base = clamp(base * 1.35 + 0.07, 0.0, 1.0);

    vec3 col = palette(gPalette, base);

    if (gSurface == 1) {
        float g = (hash21(gl_FragCoord.xy + fract(u_time * 0.5)) - 0.5) * 0.10;
        col += g;
    } else if (gSurface == 2) {
        // wash: subtle bluish-grey desaturation, like water film over the frame
        float wash = 0.5 + 0.5 * sin(uv.y * 4.0 + sd);
        col = mix(col, vec3(dot(col, vec3(0.333))) * 1.05, wash * 0.18);
    }

    col *= smoothstep(1.60, 0.28, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;
