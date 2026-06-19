import type { ShaderDef } from "../shaders";

// Love uber-shader. 8 x 4 x 5 x 3 x 3 = 1,440 distinct looks.
//
//   field   : bloom | heart | tendrils | swirl | petals | embrace | ribbon | firefly
//   domain  : radial | wave | fractured | smoke
//   palette : rose | coral | wine | sunset | berry
//   surface : soft | grain | glow
//   decay   : slow | pulse | breath

const def: ShaderDef = {
  id: "love-uber",
  name: "Love Field",
  description: "A parametric field of warmth. The seed chooses how love arrives: bloom, heart, tendrils, or embrace.",
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
    if (p == 0) { // rose: wine to rose to soft pink
        return mix(mix(vec3(0.10,0.02,0.05), vec3(0.85,0.20,0.38), lo),
                   vec3(1.00,0.82,0.86), hi);
    } else if (p == 1) { // coral: deep peach to coral to cream
        return mix(mix(vec3(0.10,0.04,0.03), vec3(0.92,0.42,0.34), lo),
                   vec3(1.00,0.86,0.74), hi);
    } else if (p == 2) { // wine: deep claret to wine red to soft cream
        return mix(mix(vec3(0.08,0.02,0.03), vec3(0.62,0.10,0.18), lo),
                   vec3(0.98,0.78,0.72), hi);
    } else if (p == 3) { // sunset: deep magenta to warm pink to butter yellow
        return mix(mix(vec3(0.10,0.03,0.10), vec3(0.95,0.40,0.55), lo),
                   vec3(1.00,0.92,0.62), hi);
    }
    // berry: dark plum to magenta to soft lavender
    return mix(mix(vec3(0.06,0.02,0.10), vec3(0.78,0.18,0.58), lo),
               vec3(0.95,0.78,0.92), hi);
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
        t = u_time * 0.20;
    } else if (gDecay == 1) {
        t = u_time * 0.30 + 0.10 * sin(u_time * 0.80 + sd);  // pulse, heartbeat
    } else {
        t = u_time * 0.18 + 0.05 * sin(u_time * 0.35 + sd);  // breath, gentle inhale
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
        // bloom: warm radial bloom with petal noise
        float r = length(p);
        float petalNoise = fbm(p * 3.0 + t * 0.25 + sd);
        float core = exp(-r * 1.3);
        float bloomBody = exp(-r * 0.6) * petalNoise * 0.85;
        base = clamp(core + bloomBody, 0.0, 1.0);
    } else if (gField == 1) {
        // heart: parametric heart curve filled, pulsing
        float pulse = 1.0 + 0.08 * sin(t * 4.0 + sd);
        vec2 hp = p * pulse;
        float x = hp.x, y = hp.y * 1.05;
        // heart equation: (x^2 + y^2 - r^2)^3 = x^2 * y^3 (scaled)
        float h = pow(x*x + y*y - 0.30, 3.0) - x*x * y*y*y;
        float fill = smoothstep(0.05, -0.05, h);
        float halo = exp(-length(hp) * 1.4) * 0.45;
        base = clamp(fill + halo, 0.0, 1.0);
    } else if (gField == 2) {
        // tendrils: vine-like growth reaching outward from center
        float v = 0.0;
        for (float k = 0.0; k < 4.0; k++) {
            float ang = (k / 4.0) * 6.2831 + sd + t * 0.20;
            float reach = 0.5 + hash11(sd + k * 9.7) * 0.6;
            vec2 dir = vec2(cos(ang), sin(ang));
            // distance from a curved line growing outward
            float along = dot(p, dir);
            float across = dot(p, vec2(-dir.y, dir.x));
            float curl = 0.18 * sin(along * 4.5 + t * 1.2 + k + sd);
            float d = abs(across - curl);
            float grow = smoothstep(reach, 0.0, along) * smoothstep(0.0, 0.05, along);
            v += smoothstep(0.04, 0.0, d) * grow * 0.9;
        }
        base = clamp(v, 0.0, 1.0);
    } else if (gField == 3) {
        // swirl: soft warm rotating swirl
        float r = length(p) + 0.02;
        float a = atan(p.y, p.x) + log(r) * 1.8 + t * 0.9 + sd;
        float swirl = 0.5 + 0.5 * sin(a * 2.5);
        float mass  = exp(-r * 1.1);
        base = clamp(swirl * mass * 1.4, 0.0, 1.0);
    } else if (gField == 4) {
        // petals: floating petals on a soft current
        float v = 0.0;
        for (float k = 0.0; k < 5.0; k++) {
            vec2 pp = p * (2.5 + k * 1.4);
            pp.y += t * (0.30 + k * 0.10);                 // gently drifting down
            pp.x += 0.30 * sin(pp.y * 1.2 + t * 0.6 + k);  // swaying
            vec2 c = floor(pp);
            vec2 f = fract(pp) - 0.5;
            vec2 r = vec2(hash21(c + sd + k * 13.7),
                          hash21(c + sd + k * 13.7 + 5.5));
            // elongated petal shape
            vec2 q = f - (r - 0.5) * 0.5;
            float ang = r.x * 6.28 + t * 0.4;
            vec2 qr = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q;
            float petal = exp(-(qr.x*qr.x*8.0 + qr.y*qr.y*2.0) * 4.0);
            v += petal * (0.55 + 0.45 * r.x);
        }
        base = clamp(v * 1.2, 0.0, 1.0);
    } else if (gField == 5) {
        // embrace: two warm cores orbiting each other, glow merging
        float ang = t * 0.6 + sd;
        float dist = 0.32 + 0.06 * sin(t * 0.9);
        vec2 a = vec2(cos(ang), sin(ang)) * dist;
        vec2 b = -a;
        float da = length(p - a), db = length(p - b);
        float glowA = exp(-da * 2.5);
        float glowB = exp(-db * 2.5);
        // metaball merger: bright where they overlap
        float merge = exp(-(da * db) * 4.0) * 0.7;
        base = clamp(glowA + glowB + merge, 0.0, 1.0);
    } else if (gField == 6) {
        // ribbon: anisotropic silk band undulating across the frame
        float w = 0.10 + 0.06 * sin(p.x * 2.0 + t * 0.5);
        float yc = 0.20 * sin(p.x * 1.4 + t * 0.6 + sd) + 0.10 * sin(p.x * 3.5 + t + sd * 2.1);
        float dy = abs(p.y - yc);
        float ribbon = smoothstep(w, 0.0, dy);
        float shimmer = 0.5 + 0.5 * sin(p.x * 12.0 - t * 2.5 + sd);
        base = clamp(ribbon * (0.55 + 0.45 * shimmer), 0.0, 1.0);
    } else {
        // firefly: warm glowing dots drifting upward, flickering
        float v = 0.0;
        for (float k = 0.0; k < 5.0; k++) {
            vec2 pp = p * (3.0 + k * 1.8);
            pp.y -= t * (0.4 + k * 0.15);
            pp.x += 0.15 * sin(pp.y * 1.7 + t + k);
            vec2 c = floor(pp);
            vec2 f = fract(pp) - 0.5;
            vec2 r = vec2(hash21(c + sd + k * 19.3),
                          hash21(c + sd + k * 19.3 + 7.7));
            vec2 off = (r - 0.5) * 0.4;
            float d = length(f - off);
            float flicker = 0.5 + 0.5 * sin(t * (4.0 + r.y * 6.0) + r.x * 30.0);
            v += exp(-d * 18.0) * flicker * (0.6 + 0.4 * r.x);
        }
        base = clamp(v * 1.3, 0.0, 1.0);
    }

    // Lift so dim seeds still register.
    base = clamp(base * 1.30 + 0.07, 0.0, 1.0);

    vec3 col = palette(gPalette, base);

    // ---- surface overlay ----
    if (gSurface == 1) {
        float g = (hash21(gl_FragCoord.xy + fract(u_time * 0.6)) - 0.5) * 0.10;
        col += vec3(g * 1.1, g * 0.9, g);
    } else if (gSurface == 2) {
        // glow: bright halo over the brightest pixels
        float lum = max(max(col.r, col.g), col.b);
        col += vec3(0.35, 0.20, 0.25) * smoothstep(0.6, 0.95, lum);
    }

    // gentler vignette so warmth doesn't choke at the edges
    col *= smoothstep(1.70, 0.32, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;
