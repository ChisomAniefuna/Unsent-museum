import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-weeping-orb",
  name: "Weeping Orb",
  description: "A tarnished bronze sphere holds three sorrowing faces; tears slide endlessly down its weathered, gilded surface.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define BG     vec3(0.04, 0.035, 0.03)
#define BRONZE vec3(0.55, 0.36, 0.20)
#define BRDARK vec3(0.18, 0.11, 0.06)
#define BRLIT  vec3(0.85, 0.62, 0.38)
#define FLESH  vec3(0.78, 0.62, 0.50)
#define FLDARK vec3(0.32, 0.22, 0.17)
#define TEAR   vec3(0.70, 0.80, 0.88)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x),
               mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<6;i++){ v+=a*vnoise(p); p=p*2.03+vec2(1.7,-1.3); a*=0.5; }
    return v;
}

// A soft face mask centered at c, scaled by s. Returns coverage and a shading term.
float faceMask(vec2 p, vec2 c, vec2 s, out float shade){
    vec2 q = (p - c) / s;
    // head: oval
    float head = length(q * vec2(1.0, 0.82));
    float m = smoothstep(1.0, 0.92, head);
    // simple modelling: brow shadow, cheeks, jaw
    float brow = smoothstep(0.05, 0.0, abs(q.y - 0.18)) * smoothstep(0.7,0.0,abs(q.x));
    float eyes = smoothstep(0.16, 0.10, length((q-vec2(-0.28,0.10))*vec2(1.0,1.4)))
               + smoothstep(0.16, 0.10, length((q-vec2( 0.28,0.10))*vec2(1.0,1.4)));
    float nose = smoothstep(0.05,0.0,abs(q.x)) * smoothstep(0.1,-0.25,q.y)*smoothstep(-0.4,-0.1,q.y);
    float mouth= smoothstep(0.05,0.0,abs(q.y+0.45)) * smoothstep(0.35,0.0,abs(q.x));
    shade = 0.6 + 0.4*(q.y) - brow*0.5 - eyes*0.7 - mouth*0.5 + nose*0.2;
    return m;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.85;
    float sv = u_seed * u_unique * 0.01;

    vec3 col = BG;
    // faint vignette glow behind orb
    col += BRDARK * 0.5 * smoothstep(1.1, 0.0, length(uv));

    // ─── The sphere ───
    float R = 0.78;
    float d = length(uv);
    float sphere = smoothstep(R, R - 0.01, d);
    if(sphere > 0.001){
        // spherical normal for shading (fake 3D)
        float z = sqrt(max(0.0, R*R - d*d));
        vec3 n = normalize(vec3(uv, z));
        vec3 lightDir = normalize(vec3(-0.4, 0.6, 0.8));
        float diff = clamp(dot(n, lightDir), 0.0, 1.0);
        float rim = pow(1.0 - n.z, 2.0);

        // weathered patina: fbm patches of dark tarnish over bronze
        vec2 sphUV = n.xy * 2.2 + vec2(sv, 0.0);
        float patina = fbm(sphUV * 1.6);
        float scratch = smoothstep(0.75, 0.95, fbm(sphUV * 7.0 + 3.0));
        vec3 metal = mix(BRDARK, BRONZE, smoothstep(0.3, 0.7, patina));
        metal = mix(metal, BRLIT, diff * 0.7);
        metal = mix(metal, BRDARK, smoothstep(0.55, 0.85, patina) * 0.6); // dark blotches
        metal += BRLIT * scratch * 0.15;

        // vertical "petal" segment seams of the orb (like the reference)
        float seams = abs(sin(atan(n.x, n.z) * 3.0));
        metal *= 0.8 + 0.2 * smoothstep(0.0, 0.25, seams);

        // ─── three faces embedded ───
        float shadeC, shadeL, shadeR;
        float fc = faceMask(uv, vec2(0.0, -0.02), vec2(0.26, 0.34), shadeC);
        float fl = faceMask(uv, vec2(-0.34, -0.04), vec2(0.20, 0.30), shadeL);
        float fr = faceMask(uv, vec2( 0.34, -0.04), vec2(0.20, 0.30), shadeR);
        // side faces sit slightly behind/darker
        vec3 faceColC = mix(FLDARK, FLESH, clamp(shadeC,0.0,1.0)) ;
        vec3 faceColL = mix(FLDARK, FLESH, clamp(shadeL,0.0,1.0)) * 0.7;
        vec3 faceColR = mix(FLDARK, FLESH, clamp(shadeR,0.0,1.0)) * 0.7;
        faceColC = mix(faceColC, BRLIT*0.8, 0.25); // bronze-lit skin
        faceColL = mix(faceColL, BRLIT*0.7, 0.3);
        faceColR = mix(faceColR, BRLIT*0.7, 0.3);

        vec3 surf = metal;
        surf = mix(surf, faceColL, fl * 0.9);
        surf = mix(surf, faceColR, fr * 0.9);
        surf = mix(surf, faceColC, fc * 0.95);

        // ─── tears: thin bright streaks sliding down from the eyes ───
        float tears = 0.0;
        vec2 eyesC[2]; eyesC[0]=vec2(-0.075,0.07); eyesC[1]=vec2(0.075,0.07);
        for(int e=0;e<2;e++){
            vec2 ec = eyesC[e];
            float xline = smoothstep(0.012, 0.0, abs(uv.x - ec.x - sin(uv.y*8.0)*0.004));
            // tear travels downward, recurring
            float flow = fract((ec.y - uv.y) * 1.3 - t * 0.6);
            float drop = smoothstep(0.0, 0.1, flow) * smoothstep(0.6, 0.2, flow);
            float below = smoothstep(ec.y + 0.02, ec.y - 0.5, uv.y);
            tears += xline * drop * below;
            // a couple of discrete falling beads
            float bead = smoothstep(0.018, 0.0, length(uv - vec2(ec.x, ec.y - fract(t*0.5 + float(e)*0.5)*0.45)));
            tears += bead;
        }
        surf += TEAR * tears * fc * 1.2;
        surf += TEAR * 0.4 * tears; // glint even off-face

        // apply lighting falloff and rim
        surf *= 0.55 + 0.6 * diff;
        surf += BRLIT * rim * 0.25;

        col = mix(col, surf, sphere);

        // contact shadow under the orb
    }
    float groundShadow = smoothstep(0.05, 0.6, abs(uv.x)) ; // unused softener
    col -= BG * smoothstep(0.0, 0.5, -uv.y - 0.7) * 0.0;

    // overall painterly grain
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.03;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
