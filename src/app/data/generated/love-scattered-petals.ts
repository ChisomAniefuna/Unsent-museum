import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "love-scattered-petals",
  name: "Scattered Petals",
  description: "Dozens of rose petals drift and tumble across a warm void, love scattered but never gone.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define DEEP_PINK vec3(0.85, 0.15, 0.45)
#define SOFT_PINK vec3(0.92, 0.55, 0.65)
#define PALE      vec3(0.96, 0.85, 0.88)
#define BG        vec3(0.06, 0.03, 0.05)

float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

// Petal shape: rounded teardrop
float petal(vec2 p, float size){
    p.y *= 1.4;
    float r = length(p);
    float a = atan(p.y, p.x);
    float shape = size * (0.45 + 0.15 * cos(a * 1.0) + 0.1 * cos(a * 2.0));
    float edge = smoothstep(shape, shape - 0.015 * size, r);
    // Internal vein line
    float vein = smoothstep(0.02, 0.005, abs(p.x) * (1.0 + abs(p.y) * 3.0));
    return edge + vein * edge * 0.15;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.4;
    float sv = u_seed * u_unique * 0.01;

    // Warm dark background with subtle gradient
    float bgGrad = smoothstep(1.8, 0.0, length(uv));
    vec3 col = mix(BG, BG * 1.3, bgGrad);

    // Subtle background warmth
    float warmth = vnoise(uv * 2.0 + t * 0.05) * 0.08;
    col += vec3(warmth * 0.6, warmth * 0.1, warmth * 0.2);

    // Scattered petals - 40 of them
    for(float i = 0.0; i < 40.0; i++){
        float id = i + sv * 100.0;
        float h1 = hash11(id * 1.17);
        float h2 = hash11(id * 3.71);
        float h3 = hash11(id * 7.13);
        float h4 = hash11(id * 11.3);
        float h5 = hash11(id * 17.9);

        // Position: scattered across the canvas
        float px = (h1 - 0.5) * 3.0;
        float py = (h2 - 0.5) * 2.2;

        // Gentle drift animation
        float driftSpeed = 0.05 + h3 * 0.08;
        float driftAmp = 0.1 + h4 * 0.15;
        px += sin(t * driftSpeed * 2.0 + id * 1.7) * driftAmp;
        py += cos(t * driftSpeed * 1.5 + id * 2.3) * driftAmp * 0.6;

        // Slow settling downward
        py -= mod(t * (0.02 + h3 * 0.03) + h5 * 10.0, 3.0) * 0.3 - 0.3;

        vec2 rel = uv - vec2(px, py);

        // Rotation: slow tumble
        float angle = h4 * 6.28 + t * (0.2 + h5 * 0.3) * (h3 > 0.5 ? 1.0 : -1.0);
        float ca = cos(angle), sa = sin(angle);
        rel = vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);

        // Size variation
        float size = 0.04 + h5 * 0.05;

        // Slight perspective squash (petals at different angles)
        rel.x *= 1.0 + h3 * 0.6;

        float p = petal(rel, size);

        if(p > 0.01){
            // Color: mix between deep pink, soft pink, pale
            vec3 petalCol;
            if(h4 < 0.35){
                petalCol = mix(DEEP_PINK, SOFT_PINK, p);
            } else if(h4 < 0.7){
                petalCol = mix(SOFT_PINK, PALE, p * 0.7);
            } else {
                petalCol = mix(DEEP_PINK * 0.8, PALE, p);
            }

            // Edge darkening
            petalCol *= 0.85 + p * 0.15;

            // Subtle shadow underneath
            float shadow = petal(rel + vec2(0.005, -0.008), size) * 0.15;

            col = mix(col, col * (1.0 - shadow), step(0.01, shadow));
            col = mix(col, petalCol, p * 0.92);
        }
    }

    // Vignette
    col *= smoothstep(1.7, 0.4, length(uv));

    // Subtle grain
    float grain = (hash21(uv * u_resolution.xy + fract(t)) - 0.5) * 0.04;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
