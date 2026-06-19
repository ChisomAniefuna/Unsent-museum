import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-crystal-mind",
  name: "Crystal Mind",
  description: "A monochrome figure stands still while crystalline thoughts cool and fracture across the skull.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define MONO_DARK  vec3(0.04, 0.04, 0.05)
#define MONO_MID   vec3(0.12, 0.12, 0.14)
#define MONO_LIGHT vec3(0.22, 0.22, 0.25)
#define CRYS_BLUE  vec3(0.18, 0.25, 0.85)
#define CRYS_PURP  vec3(0.50, 0.15, 0.75)
#define CRYS_PINK  vec3(0.70, 0.20, 0.65)
#define CRYS_WHITE vec3(0.75, 0.80, 0.95)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
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
    for(int i = 0; i < 5; i++){
        v += a * vnoise(p);
        p *= 2.03;
        a *= 0.48;
    }
    return v;
}

// Voronoi for crystal facets
float voronoi(vec2 p, out vec2 cellCenter){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float minD = 1.0;
    cellCenter = vec2(0.0);
    for(int y = -1; y <= 1; y++){
        for(int x = -1; x <= 1; x++){
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash22(i + neighbor);
            vec2 diff = neighbor + point - f;
            float d = dot(diff, diff);
            if(d < minD){
                minD = d;
                cellCenter = i + neighbor + point;
            }
        }
    }
    return sqrt(minD);
}

// Body silhouette: shoulders + torso
float bodySDF(vec2 uv){
    // Torso: wide rectangle tapering up
    float torsoW = 0.45 - uv.y * 0.15;
    float torso = smoothstep(torsoW, torsoW - 0.03, abs(uv.x));
    torso *= smoothstep(-1.2, -0.5, uv.y) * smoothstep(0.0, -0.15, uv.y);

    // Shoulders: curved connection
    float shoulderY = -0.05;
    float shoulderD = length(vec2(abs(uv.x) - 0.35, uv.y - shoulderY));
    float shoulders = smoothstep(0.22, 0.18, shoulderD);
    shoulders *= smoothstep(-0.25, -0.05, uv.y);

    // Neck
    float neck = smoothstep(0.1, 0.07, abs(uv.x));
    neck *= smoothstep(-0.05, 0.15, uv.y) * smoothstep(0.35, 0.15, uv.y);

    return max(max(torso, shoulders), neck);
}

// Head shape: oval
float headSDF(vec2 uv){
    vec2 headCenter = vec2(0.0, 0.42);
    vec2 d = (uv - headCenter) / vec2(0.22, 0.30);
    return smoothstep(1.0, 0.95, length(d));
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.5;
    float sv = u_seed * u_unique * 0.01;

    // Background: near-black
    vec3 col = MONO_DARK;
    float bgNoise = fbm(uv * 3.0 + sv) * 0.03;
    col += bgNoise;

    // Body: monochrome fabric, now washed by a slow shade of moving colour so the
    // figure is never fully still, the same thought keeps moving through it.
    float body = bodySDF(uv);
    if(body > 0.01){
        float fabric = fbm(uv * 12.0 + sv * 3.0) * 0.5 + 0.25;
        float fabricDetail = vnoise(uv * 40.0) * 0.1;
        vec3 bodyCol = mix(MONO_DARK, MONO_MID, fabric + fabricDetail);

        // A colour shade drifting down and across the torso over time.
        float flow = fbm(uv * 2.6 + vec2(sv, -t * 0.6));
        float sweep = sin(uv.y * 3.2 - t * 1.1 + flow * 3.0 + uv.x * 1.5) * 0.5 + 0.5;
        vec3 shade = mix(CRYS_BLUE, CRYS_PURP, sweep);
        shade = mix(shade, CRYS_PINK, fbm(uv * 1.8 - t * 0.25));
        bodyCol = mix(bodyCol, shade, 0.28 + sweep * 0.30);

        // Button hint at center neckline
        float buttonD = length(uv - vec2(0.0, -0.08));
        float button = smoothstep(0.015, 0.01, buttonD);
        bodyCol = mix(bodyCol, MONO_LIGHT, button * 0.4);

        col = mix(col, bodyCol, body);
    }

    // Head: crystalline cooling effect
    float head = headSDF(uv);
    if(head > 0.01){
        vec2 headCenter = vec2(0.0, 0.42);
        vec2 headUV = uv - headCenter;

        // Crystal voronoi facets that slowly shift
        vec2 crystUV = headUV * 8.0 + vec2(sin(t * 0.15), cos(t * 0.12)) * 0.5;
        crystUV += sv * 5.0;
        vec2 cellC;
        float v = voronoi(crystUV, cellC);

        // Cell-based coloring
        float cellHash = hash21(cellC);
        float cellHash2 = hash21(cellC * 7.3);

        // Cooling pulse: waves radiating from center outward
        float dist = length(headUV);
        float coolWave = sin(dist * 15.0 - t * 2.5) * 0.5 + 0.5;
        coolWave *= smoothstep(0.35, 0.05, dist);

        // Crystal color based on cell + cooling wave
        vec3 crystCol;
        float blend = cellHash + coolWave * 0.3;
        if(blend < 0.33){
            crystCol = mix(CRYS_BLUE, CRYS_PURP, blend / 0.33);
        } else if(blend < 0.66){
            crystCol = mix(CRYS_PURP, CRYS_PINK, (blend - 0.33) / 0.33);
        } else {
            crystCol = mix(CRYS_PINK, CRYS_BLUE, (blend - 0.66) / 0.34);
        }

        // Cell edge glow (facet lines)
        float edge = smoothstep(0.05, 0.02, v);
        crystCol = mix(crystCol, CRYS_WHITE, edge * 0.6);

        // Sparkle points: random bright spots that pulse
        float sparkle = 0.0;
        for(float i = 0.0; i < 8.0; i++){
            float sh = hash21(vec2(i, sv * 10.0 + 3.7));
            float sh2 = hash21(vec2(i * 3.1, sv * 10.0 + 7.1));
            vec2 sparkPos = (vec2(sh, sh2) - 0.5) * 0.5;
            float sparkDist = length(headUV - sparkPos);
            float pulse = sin(t * (2.0 + sh * 3.0) + i * 1.5) * 0.5 + 0.5;
            sparkle += smoothstep(0.03, 0.005, sparkDist) * pulse;
        }
        crystCol += CRYS_WHITE * sparkle * 0.8;

        // Frost creep: tendrils extending from head edges
        float frostAngle = atan(headUV.y, headUV.x);
        float frost = fbm(vec2(frostAngle * 3.0, dist * 10.0 - t * 0.5 + sv));
        float frostEdge = smoothstep(0.25, 0.3, dist) * smoothstep(0.38, 0.3, dist);
        crystCol += CRYS_WHITE * frost * frostEdge * 0.4;

        // Internal halftone/pixel pattern from the reference image
        vec2 pixUV = headUV * 30.0;
        float pixel = smoothstep(0.45, 0.35, length(fract(pixUV) - 0.5));
        crystCol *= 0.85 + pixel * 0.15;

        // Face features: subtle dark lines for eyes, nose, mouth
        // Eyes
        float eyeL = length(headUV - vec2(-0.07, 0.03));
        float eyeR = length(headUV - vec2(0.07, 0.03));
        float eyes = smoothstep(0.025, 0.015, eyeL) + smoothstep(0.025, 0.015, eyeR);
        // Eye glow
        crystCol += CRYS_WHITE * eyes * (0.5 + 0.3 * sin(t * 1.5));

        // Nose line
        float noseLine = smoothstep(0.008, 0.003, abs(headUV.x)) *
                         smoothstep(-0.08, -0.02, headUV.y) * smoothstep(0.04, -0.02, headUV.y);
        crystCol = mix(crystCol, CRYS_BLUE * 0.5, noseLine * 0.3);

        // Overall luminance modulation: cooling = slightly brighter over time
        float coolBrightness = 0.8 + 0.2 * sin(t * 0.3);
        crystCol *= coolBrightness;

        col = mix(col, crystCol, head);
    }

    // Vignette
    col *= smoothstep(1.6, 0.3, length(uv));

    // Grain
    float grain = (hash21(uv * u_resolution.xy + fract(t)) - 0.5) * 0.05;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
