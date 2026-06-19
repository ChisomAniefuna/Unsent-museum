import type { ShaderDef } from "../shaders";

// Inspired by the gold-on-wine peacock-paisley illustrations. We do NOT try to
// render a bird silhouette here (that needs SDF body work). What we DO render
// is the motif vocabulary the images repeat:
//   - a radial ring of teardrop "eyes" with concentric ring fills
//   - a small central rosette
//   - the gold-on-deep-wine palette
//
// Restraint over complexity: previous iterations tried to add paisley curls,
// outer-ring eyes, and bead trails all at once and the layers fought. One ring,
// one rosette, clean teardrops.

const def: ShaderDef = {
  id: "hope-paisley-fan",
  name: "Golden Paisley",
  description: "A ring of peacock-eye paisleys in gold on deep wine, the ornate side of hope.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define TAU 6.28318530718

float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

// One teardrop eye in local coords. y is the "outward" axis; x is tangential.
// The shape is wider at the base (large y) and tapers to a point (small y).
float eye(vec2 p, float ringCount){
    // Body silhouette: half-ellipse shape, narrower at top than bottom.
    float widthFactor = mix(0.18, 0.06, smoothstep(-0.18, 0.18, p.y));
    float d = abs(p.x) / widthFactor + (p.y * p.y) * 3.0;
    float body = smoothstep(1.05, 0.95, d);

    // Concentric rings within the body.
    float r = length(p);
    float rings = 0.5 + 0.5 * sin(r * ringCount * TAU);
    rings = pow(rings, 2.0);

    // Bright central spot.
    float core = smoothstep(0.040, 0.015, r);

    return body * (0.35 + 0.55 * rings) + core * 0.45;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    float sd  = u_seed * u_unique;
    float t   = u_time * 0.10;
    uv = rot(t * 0.30 + sd * 0.30) * uv;

    // Number of eyes in the ring varies 10-14 by seed.
    float N         = 10.0 + floor(hash11(sd + 11.0) * 5.0);
    float ringDist  = 0.62;
    float ringCount = 4.0 + floor(hash11(sd + 3.7) * 4.0);

    float total = 0.0;
    for (float k = 0.0; k < 16.0; k++) {
        if (k >= N) break;
        float ang = k * TAU / N + sd * 0.20;
        vec2 c    = vec2(cos(ang), sin(ang)) * ringDist;
        // local frame: y points outward from center, x tangential
        vec2 lp = rot(-ang + 1.5708) * (uv - c);
        total += eye(lp, ringCount);
    }

    // Central rosette: a small flower of 6 petals + a disc center.
    float rc       = length(uv);
    float ra       = atan(uv.y, uv.x);
    float petals   = 0.5 + 0.5 * cos(ra * 6.0 + sd);
    float roseBody = smoothstep(0.16, 0.13, rc) * (0.55 + 0.45 * petals);
    float roseCore = smoothstep(0.045, 0.025, rc);
    total += roseBody * 0.65 + roseCore * 0.55;

    // Outer dotted ring at radius 0.95: small bright dots, one per eye, between eyes.
    float ringRadius   = 0.95;
    float ringBand     = exp(-pow(rc - ringRadius, 2.0) * 800.0);
    float dotAngle     = ra * N / TAU + 0.5;
    float dotAlign     = abs(fract(dotAngle) - 0.5) * 2.0;
    float dotIntensity = smoothstep(0.95, 1.0, 1.0 - dotAlign);
    total += ringBand * dotIntensity * 0.6;

    total = clamp(total, 0.0, 1.0);

    // Palette: deep wine background -> warm gold -> bright leaf gold.
    vec3 wine = vec3(0.10, 0.02, 0.06);
    vec3 gold = vec3(0.92, 0.70, 0.18);
    vec3 leaf = vec3(1.00, 0.92, 0.65);

    float lo = clamp(total * 2.0, 0.0, 1.0);
    float hi = clamp(total * 2.0 - 1.0, 0.0, 1.0);
    vec3 col = mix(mix(wine, gold, lo), leaf, hi);

    // Soft luminous glow on the brightest pixels.
    col += vec3(0.28, 0.18, 0.06) * smoothstep(0.72, 0.95, total);

    col *= smoothstep(1.70, 0.32, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;
