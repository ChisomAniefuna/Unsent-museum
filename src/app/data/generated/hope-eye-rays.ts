import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-eye-rays",
  name: "Eye Rays",
  description: "Twin golden eyes radiate pixelated beams of amber light, seeing what others cannot.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define GOLD    vec3(0.95, 0.82, 0.25)
#define AMBER   vec3(0.85, 0.55, 0.12)
#define ORANGE  vec3(0.78, 0.35, 0.08)
#define BROWN   vec3(0.45, 0.22, 0.06)
#define WHITE   vec3(1.0, 0.96, 0.88)
#define BG      vec3(0.02, 0.01, 0.0)

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

// Pixelate UV to give ASCII/pixel art feel
vec2 pixelate(vec2 uv, float size){
    return floor(uv * size) / size;
}

// Eye shape: almond/lenticular
float eyeShape(vec2 p, float w, float h){
    p.x /= w;
    p.y /= h;
    float d = length(p);
    float almond = max(abs(p.x), abs(p.y) * 1.8 + abs(p.x) * 0.5);
    return smoothstep(1.0, 0.85, almond);
}

// Iris with pupil
float iris(vec2 p, float radius, float t){
    float d = length(p);
    float ring = smoothstep(radius, radius - 0.02, d) * smoothstep(radius * 0.2, radius * 0.35, d);
    float pupil = smoothstep(radius * 0.35, radius * 0.25, d);
    // Iris pattern
    float a = atan(p.y, p.x);
    float pattern = sin(a * 8.0 + t * 2.0) * 0.3 + 0.7;
    pattern *= smoothstep(radius * 0.2, radius * 0.8, d);
    return ring * pattern - pupil * 0.5;
}

// Single ray beam
float ray(vec2 uv, float angle, float width, float len, float t){
    float ca = cos(angle), sa = sin(angle);
    vec2 r = vec2(uv.x * ca + uv.y * sa, -uv.x * sa + uv.y * ca);
    float beam = smoothstep(width, 0.0, abs(r.y));
    beam *= smoothstep(0.0, 0.05, r.x) * smoothstep(len, len * 0.3, r.x);
    // Taper and pulse
    beam *= 0.5 + 0.5 * sin(r.x * 15.0 - t * 4.0);
    return beam;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.8;
    float sv = u_seed * u_unique * 0.01;

    // Pixelate for ASCII feel
    float pixSize = 80.0 + sv * 20.0;
    vec2 pxUV = pixelate(uv, pixSize);

    vec3 col = BG;

    // Warm background glow
    float bgGlow = exp(-length(uv) * 1.2) * 0.15;
    col += vec3(0.12, 0.06, 0.0) * bgGlow;

    // Two eye positions
    vec2 eyeL = vec2(-0.28, 0.0);
    vec2 eyeR = vec2(0.28, 0.0);

    // Rays from each eye - radiating outward
    float rays = 0.0;
    for(float i = 0.0; i < 16.0; i++){
        float baseAngle = (i / 16.0) * 6.2832;
        float wobble = sin(t * 2.7 + i * 1.3 + sv) * 0.08;
        float angle = baseAngle + wobble;

        float rayLen = 0.6 + sin(t * 4.0 + i * 0.8) * 0.15;
        float rayW = 0.015 + sin(t * 3.0 + i * 2.1) * 0.005;

        rays += ray(pxUV - eyeL, angle, rayW, rayLen, t) * 0.35;
        rays += ray(pxUV - eyeR, angle, rayW, rayLen, t) * 0.35;
    }

    // Stronger diagonal rays (like the reference image)
    for(float i = 0.0; i < 8.0; i++){
        float angle = (i / 8.0) * 6.2832 + t * 0.15;
        float pulse = 0.5 + 0.5 * sin(t * 3.4 + i * 1.7);
        float rayLen = 0.8 + pulse * 0.3;
        float rayW = 0.008 + pulse * 0.004;

        rays += ray(pxUV - eyeL, angle, rayW, rayLen, t) * 0.5 * pulse;
        rays += ray(pxUV - eyeR, angle, rayW, rayLen, t) * 0.5 * pulse;
    }

    // Color the rays with animated gold/amber/orange palette
    float rayHue = sin(t * 3.4 + pxUV.x * 2.0 + pxUV.y * 1.5) * 0.5 + 0.5;
    vec3 rayCol = mix(GOLD, AMBER, rayHue);
    rayCol = mix(rayCol, ORANGE, sin(t * 2.0 + length(pxUV) * 5.0) * 0.3 + 0.2);
    col += rayCol * rays;

    // Central bridge glow between eyes
    float bridge = exp(-abs(pxUV.y) * 12.0) * exp(-abs(pxUV.x) * 4.0);
    float bridgePulse = 0.5 + 0.5 * sin(t * 4.2);
    col += GOLD * bridge * 0.3 * bridgePulse;

    // Left eye
    vec2 relL = pxUV - eyeL;
    float eyeL_shape = eyeShape(relL, 0.18, 0.08);
    if(eyeL_shape > 0.01){
        // Eyeball white
        vec3 eyeCol = mix(BROWN * 0.3, vec3(0.9, 0.85, 0.75), smoothstep(0.18, 0.1, length(relL)));
        // Iris
        float irisVal = iris(relL, 0.065, t);
        vec3 irisCol = mix(BROWN, GOLD, irisVal * 0.8 + 0.2);
        irisCol = mix(irisCol, AMBER, sin(atan(relL.y, relL.x) * 6.0 + t) * 0.3 + 0.3);
        eyeCol = mix(eyeCol, irisCol, smoothstep(0.07, 0.05, length(relL)));
        // Pupil
        float pupilD = length(relL);
        eyeCol = mix(eyeCol, vec3(0.01), smoothstep(0.025, 0.015, pupilD));
        // Catchlight
        float catchlight = smoothstep(0.015, 0.005, length(relL - vec2(0.015, 0.015)));
        eyeCol += WHITE * catchlight * 0.9;
        // Eyelid shadow
        float lidShadow = smoothstep(0.06, 0.08, relL.y + abs(relL.x) * 0.4);
        eyeCol *= 1.0 - lidShadow * 0.5;

        col = mix(col, eyeCol, eyeL_shape);
    }

    // Right eye (mirrored)
    vec2 relR = pxUV - eyeR;
    float eyeR_shape = eyeShape(relR, 0.18, 0.08);
    if(eyeR_shape > 0.01){
        vec3 eyeCol = mix(BROWN * 0.3, vec3(0.9, 0.85, 0.75), smoothstep(0.18, 0.1, length(relR)));
        float irisVal = iris(relR, 0.065, t);
        vec3 irisCol = mix(BROWN, GOLD, irisVal * 0.8 + 0.2);
        irisCol = mix(irisCol, AMBER, sin(atan(relR.y, relR.x) * 6.0 + t) * 0.3 + 0.3);
        eyeCol = mix(eyeCol, irisCol, smoothstep(0.07, 0.05, length(relR)));
        float pupilD = length(relR);
        eyeCol = mix(eyeCol, vec3(0.01), smoothstep(0.025, 0.015, pupilD));
        float catchlight = smoothstep(0.015, 0.005, length(relR - vec2(-0.015, 0.015)));
        eyeCol += WHITE * catchlight * 0.9;
        float lidShadow = smoothstep(0.06, 0.08, relR.y + abs(relR.x) * 0.4);
        eyeCol *= 1.0 - lidShadow * 0.5;

        col = mix(col, eyeCol, eyeR_shape);
    }

    // Eyebrow arcs above each eye
    for(float side = -1.0; side <= 1.0; side += 2.0){
        vec2 browCenter = vec2(side * 0.28, 0.09);
        vec2 browRel = pxUV - browCenter;
        float browCurve = browRel.y + browRel.x * browRel.x * 2.5 * side;
        float brow = smoothstep(0.015, 0.005, abs(browCurve)) *
                     smoothstep(0.22, 0.05, abs(browRel.x));
        col = mix(col, BROWN * 0.6, brow * 0.8);
    }

    // ASCII overlay texture
    float asciiGrid = smoothstep(0.45, 0.35, length(fract(uv * pixSize) - 0.5));
    col *= 0.92 + asciiGrid * 0.08;

    // Pixel edge emphasis
    vec2 pixEdge = abs(fract(uv * pixSize) - 0.5);
    float edge = smoothstep(0.48, 0.5, max(pixEdge.x, pixEdge.y));
    col *= 1.0 - edge * 0.15;

    // Vignette
    col *= smoothstep(1.5, 0.3, length(uv));

    // Grain
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.04;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
