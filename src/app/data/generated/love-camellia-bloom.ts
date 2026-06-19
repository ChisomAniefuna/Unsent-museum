import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "love-camellia-bloom",
  name: "Camellia Bloom",
  description: "Layered petals of red, cream and gold unfurl in slow concentric rings around a beaded golden heart, a flower that keeps opening.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define BG     vec3(0.18, 0.03, 0.06)
#define BGDEEP vec3(0.09, 0.01, 0.03)
#define CRIM   vec3(0.78, 0.10, 0.16)
#define RED    vec3(0.92, 0.22, 0.22)
#define CORAL  vec3(0.96, 0.45, 0.42)
#define CREAM  vec3(0.98, 0.92, 0.80)
#define GOLD   vec3(0.92, 0.74, 0.30)
#define DGOLD  vec3(0.70, 0.48, 0.14)

float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}

// Petal SDF-ish mask in local space, pointing +y, with soft edge.
// Returns coverage 0..1 and writes a 0..1 radial coordinate along the petal.
float petalMask(vec2 p, float halfWidth, float length, out float along){
    // taper width along the petal
    float yN = clamp(p.y / length, 0.0, 1.0);
    along = yN;
    float w = halfWidth * sin(yN * 3.14159);          // 0 at base & tip, max mid
    w = max(w, 0.001);
    float body = smoothstep(w, w - 0.015, abs(p.x));
    float ends = step(0.0, p.y) * step(p.y, length);
    return body * ends;
}

// Seeded palette pick across the warm range.
vec3 ringColor(float ringT, float seed){
    float h = fract(ringT + seed * 0.21);
    if(h < 0.25) return mix(CRIM, RED,   h/0.25);
    if(h < 0.50) return mix(RED,  CORAL, (h-0.25)/0.25);
    if(h < 0.75) return mix(CORAL,CREAM, (h-0.50)/0.25);
    return            mix(CREAM, GOLD,  (h-0.75)/0.25);
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.9;
    float sv = u_seed * u_unique;
    float seed = fract(sv * 0.013);

    // Background: warm radial burgundy
    float vig = smoothstep(1.5, 0.1, length(uv));
    vec3 col = mix(BGDEEP, BG, vig);

    // Global slow rotation + breathing bloom
    float bloom = 1.0 + sin(t * 0.6) * 0.06;           // petals open/close
    float baseRot = t * 0.12 + seed * 6.2832;

    float r = length(uv) / bloom;
    float baseAng = atan(uv.y, uv.x);

    // Draw rings from outer (back) to inner (front) so inner overlaps outer.
    const float RINGS = 5.0;
    for(float ring = 0.0; ring < RINGS; ring++){
        float rf = ring / (RINGS - 1.0);               // 0 outer .. 1 inner
        float petalCount = floor(6.0 + mod(ring + floor(seed*4.0), 3.0) * 2.0); // 6,8,10
        float petalLen = mix(0.62, 0.20, rf);
        float petalHalf = petalLen * 0.42;
        float ringRadius = mix(0.06, 0.30, rf);        // base distance from center
        // each ring counter-rotates a little and offsets so petals interleave
        float ringRot = baseRot * (1.0 + rf * 0.4) * (mod(ring,2.0) < 1.0 ? 1.0 : -1.0);
        float offset = (mod(ring, 2.0) < 1.0) ? 0.0 : 3.14159 / petalCount;
        // subtle per-ring open/close phase
        float open = 1.0 + sin(t * 0.7 + ring * 0.8) * 0.05;

        // which petal sector are we in
        float ang = baseAng + ringRot + offset;
        float sector = 6.2832 / petalCount;
        float id = floor(ang / sector + 0.5);
        float cAng = id * sector;                       // center angle of nearest petal
        vec2 dir = vec2(cos(cAng - ringRot - offset), sin(cAng - ringRot - offset));
        vec2 perp = vec2(-dir.y, dir.x);

        // local coords with petal base at ringRadius from center
        vec2 base = dir * ringRadius;
        vec2 rel = uv / bloom - base;
        vec2 local = vec2(dot(rel, perp), dot(rel, dir)) ;
        local.y *= open;

        float along;
        float m = petalMask(local, petalHalf, petalLen, along);
        if(m > 0.001){
            vec3 pc = ringColor(rf * 0.8, seed);
            // shade: darker at base, luminous toward tip
            pc = mix(pc * 0.65, pc, smoothstep(0.0, 0.8, along));
            // central crease highlight
            float crease = smoothstep(0.05, 0.0, abs(local.x)) * smoothstep(0.0,0.3,along);
            pc += CREAM * crease * 0.25;
            // patterned veins (seed-varied: lines vs dots vs scales)
            float style = mod(floor(seed * 3.0) + ring, 3.0);
            float pat;
            if(style < 1.0){
                pat = sin(local.x * 60.0) * sin(along * 30.0);     // cross weave
            } else if(style < 2.0){
                pat = sin(along * 40.0 - t * 2.0);                 // radial ribs
            } else {
                vec2 q = vec2(local.x * 24.0, along * 18.0);       // dotted scales
                pat = sin(q.x)*sin(q.y);
            }
            pc += (pc * 0.0 + DGOLD) * smoothstep(0.6, 0.95, abs(pat)) * 0.18;
            // translucency: petals let the layer beneath show a touch
            float alpha = m * 0.92;
            col = mix(col, pc, alpha);
            // soft edge glow
            col += pc * smoothstep(petalHalf, petalHalf*0.6, abs(local.x)) * m * 0.05;
        }
    }

    // ─── Golden beaded heart ───
    float cr = length(uv);
    // disc
    float disc = smoothstep(0.085, 0.07, cr);
    col = mix(col, mix(DGOLD, GOLD, 0.5), disc);
    // ring of beads
    float beadAng = atan(uv.y, uv.x);
    float beads = 0.5 + 0.5 * sin(beadAng * 16.0 - t * 0.5);
    float beadRing = smoothstep(0.012, 0.0, abs(cr - 0.062)) * smoothstep(0.4, 0.95, beads);
    col += GOLD * beadRing * 0.9;
    // radiating stamens
    float stamens = smoothstep(0.9, 1.0, abs(sin(beadAng * 24.0))) *
                    smoothstep(0.13, 0.07, cr) * smoothstep(0.05, 0.07, cr);
    col += GOLD * stamens * 0.5;
    // bright core bead
    float core = smoothstep(0.03, 0.0, cr);
    col = mix(col, CREAM, core * 0.8);
    col += GOLD * smoothstep(0.05, 0.0, cr) * (0.4 + 0.3 * sin(t * 3.0));

    // Travelling sheen
    float sheen = smoothstep(0.8, 1.0, sin(baseAng * 2.0 - t * 1.5 - r * 4.0));
    col += CREAM * sheen * smoothstep(0.6, 0.1, r) * 0.06;

    col *= vig;
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.022;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
