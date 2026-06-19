import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-golden-peacock",
  name: "Golden Peacock",
  description: "A bold dual-tone peacock in deep gold and burgundy, with a proud fanned tail of eye-spotted plumes.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define GOLD vec3(0.95, 0.78, 0.22)
#define PALE vec3(1.0, 0.94, 0.65)
#define DARK vec3(0.10, 0.02, 0.05)
#define WINE vec3(0.28, 0.06, 0.10)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}

float sdCircle(vec2 p, float r){ return length(p)-r; }

float sdEllipse(vec2 p, vec2 ab){
    vec2 q = p/ab;
    return (length(q)-1.0)*min(ab.x,ab.y);
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r){
    vec2 pa=p-a, ba=b-a;
    float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    return length(pa-ba*h)-r;
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;
    float t = u_time * 0.8;
    float sv = u_seed * u_unique * 0.01;

    float vig = smoothstep(1.6, 0.2, length(uv*vec2(0.9,1.0)));
    vec3 col = mix(DARK, WINE, vig*0.3);

    float breathe = 1.0 + sin(t*0.5)*0.012;
    vec2 p = uv / breathe;

    // ---- TAIL FAN: 11 feather shafts radiating from rump ----
    vec2 tailOrigin = vec2(0.0, -0.15);
    float bird = 0.0;
    float eyes = 0.0;

    for(float i = 0.0; i < 11.0; i++){
        float f = i / 10.0;
        float ang = mix(0.52, 2.62, f);
        float sway = sin(t*0.7 + i*0.55) * 0.03;
        ang += sway;

        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 tip = tailOrigin + dir * (0.58 + sin(i*1.7+sv)*0.04);

        // shaft
        float shaft = sdCapsule(p, tailOrigin, tip, 0.006);
        bird = max(bird, smoothstep(0.006, 0.0, shaft));

        // barbs along the shaft (wispy lines)
        vec2 rel = p - tailOrigin;
        float along = dot(rel, dir);
        float perp = dot(rel, vec2(-dir.y, dir.x));
        float barbZone = step(0.05, along) * smoothstep(length(tip-tailOrigin), 0.1, along);
        float barbWidth = 0.06 * (1.0 - along*1.0) * barbZone;
        float barb = smoothstep(barbWidth, barbWidth*0.4, abs(perp)) * barbZone * 0.4;
        bird = max(bird, barb);

        // eye-spot near each feather tip
        float eyeDist = length(p - (tailOrigin + dir*0.48));
        float outerRing = smoothstep(0.035, 0.028, eyeDist) - smoothstep(0.025, 0.018, eyeDist);
        float innerDot = smoothstep(0.014, 0.008, eyeDist);
        float eyeSpot = (outerRing + innerDot) * 0.9;
        eyes += eyeSpot;
    }

    // ---- BODY: round shape at bottom ----
    float bodyD = sdEllipse(p - vec2(0.0, -0.28), vec2(0.14, 0.16));
    float body = smoothstep(0.0, -0.012, bodyD);
    bird = max(bird, body);

    // body filigree texture
    vec2 bp = p - vec2(0.0, -0.28);
    float scroll = sin(bp.x*28.0 + sin(bp.y*20.0+t)*2.0) * sin(bp.y*24.0 - t*0.4);
    float filigree = smoothstep(0.5, 0.95, abs(scroll)) * body * 0.3;

    // ---- NECK: curved upward ----
    float neckD = sdCapsule(p, vec2(0.0,-0.18), vec2(-0.06, 0.12), 0.035);
    float neck = smoothstep(0.0, -0.008, neckD);
    bird = max(bird, neck);

    // ---- HEAD ----
    float headD = sdCircle(p - vec2(-0.08, 0.18), 0.055);
    float head = smoothstep(0.0, -0.008, headD);
    bird = max(bird, head);

    // beak
    vec2 beakP = p - vec2(-0.14, 0.19);
    float beak = step(beakP.x, 0.0) * step(-0.04, beakP.x)
               * smoothstep(0.0, -0.006, abs(beakP.y + beakP.x*0.25) - (-beakP.x)*0.2);
    bird = max(bird, beak);

    // eye (dark cutout)
    float eyeHole = smoothstep(0.014, 0.008, length(p - vec2(-0.065, 0.20)));

    // ---- CREST: spiky plumes from top of head ----
    for(float k = 0.0; k < 3.0; k++){
        float ca = mix(1.1, 1.7, k/2.0) + sin(t*0.6+k*1.5)*0.04;
        vec2 cd = vec2(cos(ca), sin(ca));
        vec2 cBase = vec2(-0.07, 0.23);
        float cLen = 0.09 + k*0.02;
        float cD = sdCapsule(p, cBase, cBase + cd*cLen, 0.003);
        float spike = smoothstep(0.003, 0.0, cD);
        // bead at tip
        float bead = smoothstep(0.009, 0.004, length(p - (cBase + cd*cLen)));
        bird = max(bird, max(spike, bead));
    }

    // ---- COMPOSE ----
    float mask = clamp(bird, 0.0, 1.0);
    float eyeMask = clamp(eyes, 0.0, 1.0);

    // halftone dots for the body/tail tonal variation
    vec2 hg = fract(p * 28.0) - 0.5;
    float halftone = smoothstep(0.22, 0.18, length(hg));
    float bodyTone = halftone * body * 0.2;

    // gold rendering
    vec3 goldShade = mix(GOLD*0.7, GOLD, 0.5 + 0.5*sin(p.y*3.0+t*0.3));
    col = mix(col, goldShade, mask * 0.92);
    col = mix(col, PALE, eyeMask * 0.7);
    col += GOLD * filigree;
    col -= vec3(bodyTone * 0.15);

    // eye cutout (dark pupil on head)
    col = mix(col, DARK, eyeHole * head);

    // shimmer sweep
    float shimmer = smoothstep(0.88, 1.0, sin(p.x*2.5 - p.y*1.5 - t*1.0));
    col += PALE * shimmer * mask * 0.2;

    // floating gold dust
    for(float i = 0.0; i < 8.0; i++){
        float h = hash21(vec2(i, floor(sv*50.0)));
        vec2 dustP = vec2((h-0.5)*1.6, fract(h*7.0+t*0.04)*1.4-0.7);
        float d = smoothstep(0.008, 0.0, length(p - dustP));
        col += GOLD * d * (0.3 + 0.4*sin(t*2.5+i));
    }

    col *= vig;
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.025;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
