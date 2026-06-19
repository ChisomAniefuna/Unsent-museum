import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-wave-rings",
  name: "Wave Rings",
  description: "Three colored ring systems, yellow, green, and red, interweave and spiral inward toward a vanishing center.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define YELLOW vec3(0.95, 0.80, 0.20)
#define GREEN  vec3(0.10, 0.55, 0.30)
#define RED    vec3(0.85, 0.20, 0.20)
#define ORANGE vec3(0.95, 0.45, 0.10)
#define BG     vec3(0.025, 0.045, 0.04)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// Single ring system: returns intensity at uv for a ring centered at center,
// rotated by angle, with ring spacing and total number of rings
float ringSystem(vec2 uv, vec2 center, float angle, float spacing, float thickness, float t){
    vec2 p = uv - center;
    float ca = cos(angle), sa = sin(angle);
    p = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);

    // Slight elliptical distortion
    p.x *= 1.1;
    p.y *= 0.9;

    float r = length(p);
    float a = atan(p.y, p.x);

    // Rings shrink slowly toward center (inward spiral feel)
    float ringPhase = r / spacing + t * 0.1;
    float ring = abs(sin(ringPhase * 3.14159));
    float ringEdge = smoothstep(1.0 - thickness, 1.0, ring);

    // Falloff
    float fadeIn = smoothstep(0.0, 0.05, r);
    float fadeOut = smoothstep(1.2, 0.4, r);

    return ringEdge * fadeIn * fadeOut;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.5;
    float sv = u_seed * u_unique * 0.01;

    vec3 col = BG;

    // Three offset ring systems with different colors and rotations
    // Yellow: top-right offset
    vec2 yCenter = vec2(0.08, 0.05) + vec2(sin(t * 0.3), cos(t * 0.4)) * 0.02;
    float yAngle = t * 0.2 + sv;
    float yellowRing = ringSystem(uv, yCenter, yAngle, 0.06, 0.15, t);

    // Green: top-left offset, opposite rotation
    vec2 gCenter = vec2(-0.10, 0.08) + vec2(cos(t * 0.4), sin(t * 0.3)) * 0.02;
    float gAngle = -t * 0.25 + sv * 1.3;
    float greenRing = ringSystem(uv, gCenter, gAngle, 0.05, 0.18, t);

    // Red: right side
    vec2 rCenter = vec2(0.15, -0.05) + vec2(sin(t * 0.5 + 1.0), cos(t * 0.35 + 1.0)) * 0.02;
    float rAngle = t * 0.18 + sv * 1.7;
    float redRing = ringSystem(uv, rCenter, rAngle, 0.07, 0.13, t);

    // Orange: bottom-left accent
    vec2 oCenter = vec2(-0.05, -0.15) + vec2(cos(t * 0.45 + 2.0), sin(t * 0.4 + 2.0)) * 0.02;
    float oAngle = -t * 0.3 + sv * 0.7;
    float orangeRing = ringSystem(uv, oCenter, oAngle, 0.055, 0.16, t);

    // Composite: additive blending feels like overlapping rings
    col += YELLOW * yellowRing * 0.7;
    col += GREEN * greenRing * 0.8;
    col += RED * redRing * 0.7;
    col += ORANGE * orangeRing * 0.6;

    // Central converging point: brightness builds up
    float centerR = length(uv);
    float centerBright = exp(-centerR * 10.0) * 0.4;
    vec3 centerCol = mix(YELLOW, RED, 0.5 + 0.5 * sin(t * 2.0));
    col += centerCol * centerBright * (0.6 + 0.4 * sin(t * 4.0));

    // Inner densification (rings meet at center)
    float innerDensity = smoothstep(0.15, 0.0, centerR);
    col *= 1.0 + innerDensity * 0.5;

    // Vignette
    col *= smoothstep(1.5, 0.3, length(uv));

    // Grain
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.025;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
