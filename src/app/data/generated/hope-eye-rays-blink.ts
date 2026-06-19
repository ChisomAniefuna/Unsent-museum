import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-eye-rays-blink",
  name: "Awakening Eyes",
  description: "Twin golden eyes blink open and closed, each opening releasing a fresh burst of pixelated light.",
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

vec2 pixelate(vec2 uv, float size){
    return floor(uv * size) / size;
}

// Eye shape parameterized by openness (0 = closed, 1 = fully open)
float eyeShape(vec2 p, float w, float h, float openness){
    p.x /= w;
    p.y /= (h * openness + 0.001);
    float almond = max(abs(p.x), abs(p.y) * 1.8 + abs(p.x) * 0.5);
    return smoothstep(1.0, 0.85, almond);
}

// Iris with pupil that dilates as eye opens
float iris(vec2 p, float radius, float t, float openness){
    p.y /= max(openness, 0.05);
    float d = length(p);
    float ring = smoothstep(radius, radius - 0.02, d) * smoothstep(radius * 0.2, radius * 0.35, d);
    float pupil = smoothstep(radius * 0.35, radius * 0.25, d);
    float a = atan(p.y, p.x);
    float pattern = sin(a * 8.0 + t * 2.0) * 0.3 + 0.7;
    pattern *= smoothstep(radius * 0.2, radius * 0.8, d);
    return (ring * pattern - pupil * 0.5) * openness;
}

// Single ray beam
float ray(vec2 uv, float angle, float width, float len, float t){
    float ca = cos(angle), sa = sin(angle);
    vec2 r = vec2(uv.x * ca + uv.y * sa, -uv.x * sa + uv.y * ca);
    float beam = smoothstep(width, 0.0, abs(r.y));
    beam *= smoothstep(0.0, 0.05, r.x) * smoothstep(len, len * 0.3, r.x);
    beam *= 0.5 + 0.5 * sin(r.x * 15.0 - t * 4.0);
    return beam;
}

// Blink cycle: returns openness from 0 (closed) to 1 (open)
// Pattern: long open period, fast close, brief shut, fast open
float blinkCycle(float t, float offset){
    float cycle = mod(t + offset, 4.5);
    if(cycle < 3.5){
        // Mostly open with subtle micro-movements
        return 1.0 - 0.05 * sin(cycle * 3.0);
    } else if(cycle < 3.8){
        // Closing fast
        return smoothstep(3.8, 3.5, cycle);
    } else if(cycle < 4.05){
        // Closed briefly
        return 0.0;
    } else {
        // Opening fast (snap back)
        return smoothstep(4.05, 4.4, cycle);
    }
}

// Eyelid (top and bottom) curves
float eyelid(vec2 p, float w, float h, float openness){
    // When closing, the lid sweeps down from above
    float lidY = mix(h * 1.2, -h * 0.05, openness);
    p.x /= w;
    float topLid = smoothstep(lidY + 0.02, lidY, p.y);
    float bottomLid = 1.0 - openness;
    bottomLid *= smoothstep(-h * 0.1, -h * 0.3, p.y);
    return max(topLid, bottomLid);
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.8;
    float sv = u_seed * u_unique * 0.01;

    // Blink: both eyes blink together with slight offset per side
    float openL = blinkCycle(t, sv * 2.0);
    float openR = blinkCycle(t, sv * 2.0 + 0.03);

    // Ray intensity surges right when eye reopens
    float rayBurstL = pow(openL, 0.3) * (0.6 + 0.4 * smoothstep(0.0, 0.4, openL));
    float rayBurstR = pow(openR, 0.3) * (0.6 + 0.4 * smoothstep(0.0, 0.4, openR));
    float rayBurst = max(rayBurstL, rayBurstR);

    // Pixelate for ASCII feel
    float pixSize = 80.0 + sv * 20.0;
    vec2 pxUV = pixelate(uv, pixSize);

    vec3 col = BG;

    float bgGlow = exp(-length(uv) * 1.2) * 0.15;
    col += vec3(0.12, 0.06, 0.0) * bgGlow * (0.5 + rayBurst * 0.5);

    vec2 eyeL = vec2(-0.28, 0.0);
    vec2 eyeR = vec2(0.28, 0.0);

    // Rays only emit when eyes are open
    float rays = 0.0;
    for(float i = 0.0; i < 16.0; i++){
        float baseAngle = (i / 16.0) * 6.2832;
        float wobble = sin(t * 2.7 + i * 1.3 + sv) * 0.08;
        float angle = baseAngle + wobble;

        float rayLen = 0.6 + sin(t * 4.0 + i * 0.8) * 0.15;
        float rayW = 0.015 + sin(t * 3.0 + i * 2.1) * 0.005;

        rays += ray(pxUV - eyeL, angle, rayW, rayLen, t) * 0.35 * rayBurstL;
        rays += ray(pxUV - eyeR, angle, rayW, rayLen, t) * 0.35 * rayBurstR;
    }

    // Diagonal sharper rays
    for(float i = 0.0; i < 8.0; i++){
        float angle = (i / 8.0) * 6.2832 + t * 0.15;
        float pulse = 0.5 + 0.5 * sin(t * 3.4 + i * 1.7);
        float rayLen = 0.8 + pulse * 0.3;
        float rayW = 0.008 + pulse * 0.004;

        rays += ray(pxUV - eyeL, angle, rayW, rayLen, t) * 0.5 * pulse * rayBurstL;
        rays += ray(pxUV - eyeR, angle, rayW, rayLen, t) * 0.5 * pulse * rayBurstR;
    }

    // Color the rays
    float rayHue = sin(t * 3.4 + pxUV.x * 2.0 + pxUV.y * 1.5) * 0.5 + 0.5;
    vec3 rayCol = mix(GOLD, AMBER, rayHue);
    rayCol = mix(rayCol, ORANGE, sin(t * 2.0 + length(pxUV) * 5.0) * 0.3 + 0.2);
    col += rayCol * rays;

    // Central bridge glow between eyes (also fades when closed)
    float bridge = exp(-abs(pxUV.y) * 12.0) * exp(-abs(pxUV.x) * 4.0);
    float bridgePulse = 0.5 + 0.5 * sin(t * 4.2);
    col += GOLD * bridge * 0.3 * bridgePulse * rayBurst;

    // Left eye
    vec2 relL = pxUV - eyeL;
    float eyeL_shape = eyeShape(relL, 0.18, 0.08, max(openL, 0.05));
    if(eyeL_shape > 0.01){
        vec3 eyeCol = mix(BROWN * 0.3, vec3(0.9, 0.85, 0.75), smoothstep(0.18, 0.1, length(relL)));
        float irisVal = iris(relL, 0.065, t, openL);
        vec3 irisCol = mix(BROWN, GOLD, irisVal * 0.8 + 0.2);
        irisCol = mix(irisCol, AMBER, sin(atan(relL.y, relL.x) * 6.0 + t) * 0.3 + 0.3);
        eyeCol = mix(eyeCol, irisCol, smoothstep(0.07, 0.05, length(relL)) * openL);
        float pupilD = length(relL);
        eyeCol = mix(eyeCol, vec3(0.01), smoothstep(0.025, 0.015, pupilD) * openL);
        float catchlight = smoothstep(0.015, 0.005, length(relL - vec2(0.015, 0.015))) * openL;
        eyeCol += WHITE * catchlight * 0.9;

        // Eyelid sweeping down when closing
        float lid = eyelid(relL, 0.18, 0.08, openL);
        eyeCol = mix(eyeCol, BROWN * 0.5, lid * 0.95);
        // Lash line on closed lid
        float lashLine = smoothstep(0.003, 0.0, abs(relL.y - mix(0.08, -0.005, openL))) *
                        smoothstep(0.18, 0.05, abs(relL.x)) * (1.0 - openL);
        eyeCol = mix(eyeCol, BROWN * 0.2, lashLine);

        col = mix(col, eyeCol, eyeL_shape);
    }

    // Right eye
    vec2 relR = pxUV - eyeR;
    float eyeR_shape = eyeShape(relR, 0.18, 0.08, max(openR, 0.05));
    if(eyeR_shape > 0.01){
        vec3 eyeCol = mix(BROWN * 0.3, vec3(0.9, 0.85, 0.75), smoothstep(0.18, 0.1, length(relR)));
        float irisVal = iris(relR, 0.065, t, openR);
        vec3 irisCol = mix(BROWN, GOLD, irisVal * 0.8 + 0.2);
        irisCol = mix(irisCol, AMBER, sin(atan(relR.y, relR.x) * 6.0 + t) * 0.3 + 0.3);
        eyeCol = mix(eyeCol, irisCol, smoothstep(0.07, 0.05, length(relR)) * openR);
        float pupilD = length(relR);
        eyeCol = mix(eyeCol, vec3(0.01), smoothstep(0.025, 0.015, pupilD) * openR);
        float catchlight = smoothstep(0.015, 0.005, length(relR - vec2(-0.015, 0.015))) * openR;
        eyeCol += WHITE * catchlight * 0.9;

        float lid = eyelid(relR, 0.18, 0.08, openR);
        eyeCol = mix(eyeCol, BROWN * 0.5, lid * 0.95);
        float lashLine = smoothstep(0.003, 0.0, abs(relR.y - mix(0.08, -0.005, openR))) *
                        smoothstep(0.18, 0.05, abs(relR.x)) * (1.0 - openR);
        eyeCol = mix(eyeCol, BROWN * 0.2, lashLine);

        col = mix(col, eyeCol, eyeR_shape);
    }

    // Eyebrows
    for(float side = -1.0; side <= 1.0; side += 2.0){
        vec2 browCenter = vec2(side * 0.28, 0.09);
        vec2 browRel = pxUV - browCenter;
        float browCurve = browRel.y + browRel.x * browRel.x * 2.5 * side;
        float brow = smoothstep(0.015, 0.005, abs(browCurve)) *
                     smoothstep(0.22, 0.05, abs(browRel.x));
        col = mix(col, BROWN * 0.6, brow * 0.8);
    }

    // ASCII overlay
    float asciiGrid = smoothstep(0.45, 0.35, length(fract(uv * pixSize) - 0.5));
    col *= 0.92 + asciiGrid * 0.08;

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
