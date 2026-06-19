import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "love-spiral-ripples",
  name: "Spiral Ripples",
  description: "A rose-and-gold spiral spins above concentric elliptical ripples that pulse in sync with its turning.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define ROSE    vec3(0.95, 0.45, 0.55)
#define BLUSH   vec3(0.98, 0.70, 0.75)
#define CRIMSON vec3(0.78, 0.15, 0.30)
#define PINK    vec3(0.92, 0.55, 0.70)
#define GOLD    vec3(0.92, 0.75, 0.35)
#define BG      vec3(0.0, 0.0, 0.0)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 ripplePalette(float t){
    t = fract(t);
    if(t < 0.25) return mix(ROSE, BLUSH, t / 0.25);
    if(t < 0.5) return mix(BLUSH, CRIMSON, (t - 0.25) / 0.25);
    if(t < 0.75) return mix(CRIMSON, PINK, (t - 0.5) / 0.25);
    return mix(PINK, GOLD, (t - 0.75) / 0.25);
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.6;
    float sv = u_seed * u_unique * 0.01;

    vec3 col = BG;

    // ─── BACKGROUND: Concentric elliptical ripple rings ───
    float ringRot = t * 0.15 + sv;
    float ca = cos(ringRot), sa = sin(ringRot);
    vec2 ringUV = vec2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);
    // Elliptical squash
    ringUV.x *= 1.0 + sin(t * 0.4) * 0.15;
    ringUV.y *= 1.0 - sin(t * 0.4) * 0.15;

    float ringR = length(ringUV);
    for(float i = 1.0; i < 8.0; i++){
        float ringRadius = i * 0.13 + sin(t * 0.8 - i * 0.3) * 0.02;
        float ringWidth = 0.008 + sin(t * 1.2 + i) * 0.003;
        float ring = smoothstep(ringWidth, 0.0, abs(ringR - ringRadius));
        // Pulse opacity
        float pulse = 0.4 + 0.6 * sin(t * 2.0 - i * 0.5);
        // Color drifts with time and radius
        vec3 ringCol = ripplePalette(i / 8.0 + t * 0.1);
        col += ringCol * ring * pulse * 0.5;
    }

    // ─── FOREGROUND: Bright spiral marks (no rectangle) ───
    // Use polar coordinates with rotating angle
    float spiralRot = t * 0.8;
    float ca2 = cos(spiralRot), sa2 = sin(spiralRot);
    vec2 spUV = vec2(uv.x * ca2 - uv.y * sa2, uv.x * sa2 + uv.y * ca2);

    float r = length(spUV);
    float a = atan(spUV.y, spUV.x);

    // 5 petals like the reference
    float petalCount = 5.0;
    float petalShape = abs(sin(a * petalCount * 0.5 + t * 0.3));

    // Spiral stripes flowing outward
    float spiralBands = sin(a * petalCount + log(r + 0.01) * 6.0 - t * 2.5);
    float spiralLine = smoothstep(0.6, 0.95, abs(spiralBands));

    // Petal envelope: defines where spirals appear
    float petalRadius = 0.45 + petalShape * 0.20;
    float petalEnvelope = smoothstep(0.05, 0.0, abs(r - petalRadius * 0.7)) +
                         smoothstep(0.08, 0.0, abs(r - petalRadius * 0.4));

    // Crisscross filaments inside petals
    float cross1 = sin(a * 30.0 + r * 25.0 - t * 3.0);
    float cross2 = sin(a * 25.0 - r * 20.0 + t * 2.5);
    float filaments = smoothstep(0.7, 0.95, abs(cross1)) * smoothstep(0.7, 0.95, abs(cross2));
    filaments *= smoothstep(0.7, 0.2, r) * smoothstep(0.05, 0.25, r);

    // Color the spiral with rose/blush/crimson/pink/gold gradient
    float colorPhase = a / 6.2832 + 0.5 + t * 0.05;
    vec3 spiralCol = ripplePalette(colorPhase);

    // Apply spiral lines
    col += spiralCol * spiralLine * petalEnvelope * 0.8;
    col += spiralCol * filaments * 0.5;

    // Inner bright core: rose-gold
    float core = exp(-r * 14.0) * 1.5;
    vec3 coreCol = mix(GOLD, BLUSH, 0.5 + 0.5 * sin(t * 2.0));
    col += coreCol * core * (0.7 + 0.3 * sin(t * 6.0));

    // Center sparkle
    float sparkle = exp(-r * 40.0) * (0.8 + 0.2 * sin(t * 12.0));
    col += vec3(1.0) * sparkle;

    // Soft falloff to black (no rectangular frame)
    col *= smoothstep(1.3, 0.3, length(uv));

    // Grain
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.025;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
