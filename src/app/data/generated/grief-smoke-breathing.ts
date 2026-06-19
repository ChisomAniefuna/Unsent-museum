import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-smoke-breathing",
  name: "Smoke Breathing",
  description: "A column of soft purple smoke drifts and breathes, alive but not yet dispersed.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define LAV    vec3(0.65, 0.55, 0.75)
#define LILAC  vec3(0.75, 0.65, 0.85)
#define DUSK   vec3(0.45, 0.35, 0.55)
#define HAZE   vec3(0.85, 0.78, 0.90)
#define BG     vec3(0.0, 0.0, 0.0)

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

float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for(int i = 0; i < 6; i++){
        v += a * vnoise(p);
        p = p * 2.03 + vec2(1.7, -1.3);
        a *= 0.5;
    }
    return v;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.4;
    float sv = u_seed * u_unique * 0.01;

    vec3 col = BG;

    // Breathing scale: gentle in/out
    float breathe = 1.0 + sin(t * 0.6) * 0.08;
    // Horizontal drift
    float driftX = sin(t * 0.3) * 0.08;
    // Vertical drift (slow upward then back)
    float driftY = sin(t * 0.2 + 1.0) * 0.05;

    vec2 smokeUV = (uv - vec2(driftX, driftY)) / breathe;

    // Smoke column: vertical elongation
    vec2 colUV = smokeUV * vec2(1.0, 0.6);

    // Layered FBM for smoke texture
    vec2 q1 = vec2(
        fbm(colUV * 2.0 + vec2(t * 0.15, -t * 0.25 + sv)),
        fbm(colUV * 2.0 + vec2(5.2 - t * 0.1, 1.3 + sv))
    );

    vec2 q2 = vec2(
        fbm(colUV * 2.0 + 2.5 * q1 + vec2(1.7, 9.2)),
        fbm(colUV * 2.0 + 2.5 * q1 + vec2(8.3, 2.8))
    );

    float smoke = fbm(colUV * 1.8 + 3.0 * q2 + vec2(0.0, -t * 0.5));

    // Funnel shape: wider at top, narrows at bottom
    float widthMask = 1.0 - smoothstep(0.0, 0.7, abs(smokeUV.x) * (1.0 + smokeUV.y * 0.8));
    widthMask = max(widthMask, 0.0);

    // Vertical fade
    float vertFade = smoothstep(-0.95, 0.0, smokeUV.y) * smoothstep(1.1, 0.2, smokeUV.y);

    // Combine into density
    float density = smoke * widthMask * vertFade;
    density = pow(density, 1.5);

    // Inner hollow eye (matching the reference smoke void)
    float hollowY = -0.05 + sin(t * 0.4) * 0.03;
    float hollowD = length(smokeUV - vec2(0.0, hollowY)) * vec2(1.3, 1.0).x;
    float hollow = smoothstep(0.18, 0.10, hollowD);
    density *= 1.0 - hollow * 0.8;

    // Color: lavender / lilac / dusk gradient based on density and height
    vec3 smokeCol = mix(DUSK, LAV, density);
    smokeCol = mix(smokeCol, LILAC, smoothstep(0.4, 0.9, density));
    smokeCol = mix(smokeCol, HAZE, smoothstep(0.7, 1.0, density) * smoothstep(0.5, -0.3, smokeUV.y));

    // Internal glow where density is mid-range
    float glow = smoothstep(0.2, 0.6, density) * smoothstep(0.95, 0.5, density);
    smokeCol += HAZE * glow * 0.3;

    // Composite over pure black
    col = mix(BG, smokeCol, smoothstep(0.05, 0.4, density));

    // Subtle bottom shadow disc (base reflection)
    float baseDisc = exp(-pow(smokeUV.x * 1.8, 2.0) * 10.0) *
                     smoothstep(-1.1, -0.85, smokeUV.y) *
                     smoothstep(-0.7, -0.85, smokeUV.y);
    col += LAV * baseDisc * 0.25;

    // No vignette here - we want smoke to fade into pure black naturally

    // Very subtle grain (don't pixelate)
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.015;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
