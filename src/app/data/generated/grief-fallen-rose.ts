import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-fallen-rose",
  name: "Fallen Rose",
  description: "Petals drift and curl downward through three tones of fading beauty, a flower that has let go.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

// Triple tone palette: dusty rose, deep burgundy, ashen grey
#define TONE_ROSE vec3(0.72, 0.42, 0.48)
#define TONE_WINE vec3(0.30, 0.08, 0.14)
#define TONE_ASH  vec3(0.35, 0.32, 0.34)
#define BG        vec3(0.04, 0.02, 0.05)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0, amp = 0.5;
    for(int i = 0; i < 5; i++){
        v += amp * vnoise(p);
        p *= 2.03;
        amp *= 0.48;
    }
    return v;
}

// Soft petal shape: heart-like cardioid
float petalShape(vec2 p, float size){
    float a = atan(p.y, p.x);
    float r = length(p);
    float petal = size * (0.5 + 0.5 * sin(a)) * (0.6 + 0.4 * cos(a * 2.0));
    return smoothstep(petal, petal - 0.04 * size, r);
}

// Single falling petal with curl and tumble
float fallingPetal(vec2 uv, float id, float t, float sv){
    float h = hash11(id + sv);
    float h2 = hash11(id * 7.13 + sv);
    float h3 = hash11(id * 13.37 + sv);

    float speed = 0.12 + h * 0.15;
    float drift = sin(t * (0.4 + h2 * 0.3) + id * 2.5) * (0.3 + h3 * 0.4);
    float tumble = t * (0.8 + h * 1.2) + id * 6.28;

    float startX = (h - 0.5) * 2.4;
    float startY = 1.2 + h2 * 0.8;

    vec2 pos = vec2(
        startX + drift,
        startY - mod(t * speed + h3 * 10.0, 3.5)
    );

    vec2 rel = uv - pos;
    float ca = cos(tumble), sa = sin(tumble);
    rel = vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);

    float size = 0.06 + h * 0.06;
    float curl = sin(t * 0.5 + id) * 0.3;
    rel.x += curl * rel.y;

    return petalShape(rel, size);
}

// Triple-tone mapping
vec3 triTone(float v){
    v = clamp(v, 0.0, 1.0);
    if(v < 0.4){
        return mix(BG, TONE_WINE, v / 0.4);
    } else if(v < 0.7){
        return mix(TONE_WINE, TONE_ASH, (v - 0.4) / 0.3);
    } else {
        return mix(TONE_ASH, TONE_ROSE, (v - 0.7) / 0.3);
    }
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.6;
    float sv = u_seed * u_unique * 0.01;

    // Slow drifting background fog
    vec2 fogUV = uv * 1.5 + vec2(t * 0.05, -t * 0.03);
    float fog = fbm(fogUV + sv);
    float fog2 = fbm(fogUV * 1.5 + vec2(fog * 0.5, t * 0.02));

    // Vignette-weighted background
    float vig = smoothstep(1.6, 0.3, length(uv));
    vec3 bgCol = triTone(fog2 * 0.5) * vig;

    // Subtle vertical grief rain
    float rain = 0.0;
    for(float i = 0.0; i < 3.0; i++){
        vec2 rp = uv * vec2(20.0 + i * 5.0, 1.0);
        rp.y += t * (0.8 + i * 0.3);
        rp.x += sin(rp.y * 0.3 + i) * 0.5;
        float streak = smoothstep(0.48, 0.5, fract(rp.x)) * smoothstep(0.52, 0.5, fract(rp.x));
        float fade = smoothstep(0.0, 0.3, fract(rp.y)) * smoothstep(1.0, 0.6, fract(rp.y));
        rain += streak * fade * 0.08;
    }
    bgCol += TONE_ASH * rain * vig;

    // Fallen stem silhouette at bottom
    float stemX = sin(uv.y * 2.0 + sv * 5.0) * 0.08 + sv * 0.3;
    float stem = smoothstep(0.025, 0.01, abs(uv.x - stemX)) *
                 smoothstep(-1.2, -0.3, uv.y) * smoothstep(0.1, -0.2, uv.y);
    float stemBend = smoothstep(-0.2, 0.1, uv.y);
    stem *= 1.0 - stemBend * 0.8;
    bgCol = mix(bgCol, TONE_WINE * 0.4, stem * 0.7);

    // Fallen petals accumulating at the bottom
    float groundPetals = 0.0;
    for(float i = 0.0; i < 5.0; i++){
        float h = hash11(i * 3.7 + sv);
        vec2 gpos = vec2((h - 0.5) * 1.6, -0.85 - h * 0.15);
        vec2 grel = uv - gpos;
        float ga = h * 3.14;
        float ca = cos(ga), sa = sin(ga);
        grel = vec2(grel.x * ca - grel.y * sa, grel.x * sa + grel.y * ca);
        grel.y *= 2.5;
        groundPetals += petalShape(grel, 0.07 + h * 0.04);
    }
    groundPetals = clamp(groundPetals, 0.0, 1.0);
    vec3 groundCol = mix(TONE_WINE, TONE_ROSE, groundPetals * 0.5 + fog * 0.3);
    bgCol = mix(bgCol, groundCol * 0.6, groundPetals * 0.8 * vig);

    // Animated falling petals
    float petals = 0.0;
    float petalTone = 0.0;
    for(float i = 0.0; i < 12.0; i++){
        float p = fallingPetal(uv, i, t, sv);
        if(p > 0.01){
            float toneVal = hash11(i * 5.3 + sv);
            petalTone = mix(petalTone, toneVal, p);
            petals = max(petals, p);
        }
    }
    vec3 petalCol = triTone(0.5 + petalTone * 0.5);
    petalCol += TONE_ROSE * petals * 0.3;
    bgCol = mix(bgCol, petalCol, petals * 0.9 * vig);

    // Central fading bloom (the dying flower)
    vec2 bloomCenter = vec2(sin(sv * 3.0) * 0.1, 0.15);
    float bloomDist = length(uv - bloomCenter);
    float bloom = 0.0;
    for(float i = 0.0; i < 5.0; i++){
        float angle = i * 1.2566 + t * 0.1 + sv;
        vec2 pdir = vec2(cos(angle), sin(angle));
        vec2 rel = uv - bloomCenter - pdir * 0.12;
        float ca = cos(angle + t * 0.05), sa = sin(angle + t * 0.05);
        rel = vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);
        float droop = sin(t * 0.3 + i) * 0.05 * (1.0 + t * 0.02);
        rel.y += droop;
        bloom += petalShape(rel, 0.09 - i * 0.005) * (1.0 - i * 0.12);
    }
    bloom = clamp(bloom, 0.0, 1.0);
    float bloomFade = smoothstep(0.0, 0.5, sin(t * 0.08) * 0.5 + 0.5);
    vec3 bloomCol = mix(TONE_WINE, TONE_ROSE, bloom * 0.7 + fog * 0.2);
    bloomCol = mix(bloomCol, TONE_ASH, bloomFade * 0.4);
    bgCol = mix(bgCol, bloomCol, bloom * (0.7 - bloomFade * 0.3) * vig);

    // Final color grading: desaturate slightly for sadness
    float lum = dot(bgCol, vec3(0.299, 0.587, 0.114));
    bgCol = mix(vec3(lum), bgCol, 0.75);

    // Subtle grain
    float grain = (hash21(uv * u_resolution.xy + fract(t * 0.1)) - 0.5) * 0.06;
    bgCol += grain;

    gl_FragColor = vec4(clamp(bgCol, 0.0, 1.0), 1.0);
}
`,
};
export default def;
