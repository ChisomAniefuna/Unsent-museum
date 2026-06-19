import type { ShaderDef } from "../shaders";

// Flower-Mandala uber-shader, inspired by the layered translucent petal
// illustrations (Marigold Heart, Hibiscus Flare, Honey Petal, Velvet Hibiscus).
//
// Architecture: each flower is N nested LAYERS of petals on a deep wine
// background. Each layer is a polar tile of petals at progressively smaller
// scale, rotated by an offset so adjacent layers interleave. Petals draw as
// translucent fills that ALPHA-COMPOSITE - the overlap is what gives the
// illustrations their depth. Center is a small gold bead.
//
//   field   : bloom | stacked | hibiscus | lotus | daisy | chrysanthemum
//             | starburst | dahlia       (8 arrangements)
//   palette : marigold | hibiscus | honey | velvet | coral | dahlia
//             | sunset | rose            (8 warm palettes)
//   petals  : 4 | 5 | 6 | 7 | 8         (5 petal counts for the outer layer)
//   center  : bead | crown | none       (3 center styles)
//   bg      : wine | claret | plum      (3 backgrounds)
//
// 8 x 8 x 5 x 3 x 3 = 2,880 distinct looks per artifact.

const def: ShaderDef = {
  id: "flower-mandala-uber",
  name: "Flower Mandala",
  description: "Layered translucent petal mandalas in warm tones on deep wine, the FLUID-style flower engine.",
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

float gene(float salt, float n){
    return floor(hash11(u_seed*7.13 + salt*17.93) * n);
}

// Three-stop interpolation across a palette: bg shadow -> mid -> highlight.
vec3 palette3(int p, float t){
    t = clamp(t, 0.0, 1.0);
    float lo = clamp(t*2.0, 0.0, 1.0);
    float hi = clamp(t*2.0 - 1.0, 0.0, 1.0);
    if (p == 0) { // marigold: deep orange to marigold to butter cream
        return mix(mix(vec3(0.32,0.05,0.04), vec3(0.95,0.55,0.18), lo),
                   vec3(1.00,0.92,0.68), hi);
    } else if (p == 1) { // hibiscus: deep crimson to scarlet to pale rose
        return mix(mix(vec3(0.32,0.04,0.08), vec3(0.92,0.22,0.34), lo),
                   vec3(1.00,0.78,0.78), hi);
    } else if (p == 2) { // honey: deep amber to honey to butter cream
        return mix(mix(vec3(0.28,0.10,0.04), vec3(0.95,0.62,0.18), lo),
                   vec3(1.00,0.94,0.72), hi);
    } else if (p == 3) { // velvet: deep wine to scarlet to pale cream
        return mix(mix(vec3(0.22,0.04,0.06), vec3(0.85,0.18,0.22), lo),
                   vec3(0.98,0.86,0.78), hi);
    } else if (p == 4) { // coral: deep coral to bright coral to ivory
        return mix(mix(vec3(0.32,0.08,0.06), vec3(0.98,0.42,0.32), lo),
                   vec3(1.00,0.88,0.78), hi);
    } else if (p == 5) { // dahlia: deep magenta to pink to cream
        return mix(mix(vec3(0.32,0.04,0.16), vec3(0.92,0.32,0.55), lo),
                   vec3(1.00,0.85,0.92), hi);
    } else if (p == 6) { // sunset: deep red-orange to coral to peach
        return mix(mix(vec3(0.32,0.06,0.04), vec3(0.95,0.45,0.22), lo),
                   vec3(1.00,0.85,0.62), hi);
    }
    // rose: deep rose to pink to soft cream
    return mix(mix(vec3(0.26,0.04,0.10), vec3(0.92,0.36,0.48), lo),
               vec3(1.00,0.86,0.84), hi);
}

vec3 background(int b){
    if (b == 0) return vec3(0.16, 0.04, 0.07);    // wine
    if (b == 1) return vec3(0.22, 0.05, 0.10);    // claret
    return vec3(0.14, 0.03, 0.10);                 // plum
}

// One petal mask in polar coords (r is radius from flower center, ang is the
// angular offset from THIS petal's center axis). Returns 0..1 fill amount.
// Different shapes for different fields - pointed, rounded, lotus-tipped.
float petalMask(float r, float ang, float layerScale, int shape){
    // angular width tapers linearly with radius so the petal is widest mid-length
    float taper = 1.0 - r / layerScale;
    float w     = 0.55 * taper;  // angular half-width at this radius

    // base teardrop: full inside the angular envelope, faded at the tip
    float inAngle  = smoothstep(w, w * 0.92, abs(ang));
    float inRadius = smoothstep(layerScale, layerScale * 0.95, r)
                   * smoothstep(0.04, 0.10, r);

    float fill = inAngle * inRadius;

    if (shape == 1) {
        // pointed: sharper tip, narrower top - more like a hibiscus petal
        float pointed = smoothstep(layerScale * 0.85, layerScale * 0.60, r);
        fill *= mix(0.85, 1.0, pointed);
    } else if (shape == 2) {
        // lotus: wider in the middle, rounded both ends
        float middle = exp(-pow(r / layerScale - 0.55, 2.0) * 8.0);
        fill *= 0.4 + 0.7 * middle;
    } else if (shape == 3) {
        // long thin daisy ray
        fill *= smoothstep(0.5, 0.05, abs(ang) / max(w, 0.001));
    }
    return clamp(fill, 0.0, 1.0);
}

// Alpha-composite a layer onto col. Layers nearer the viewer (drawn later)
// blend on top with their own alpha.
vec3 over(vec3 dst, vec3 src, float alpha){
    return mix(dst, src, clamp(alpha, 0.0, 1.0));
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    float sd  = u_seed * u_unique;
    float t   = u_time * 0.06;

    // ---- decode genes ----
    int gField   = int(mix(0.0, gene(1.0, 8.0), u_unique));
    int gPalette = int(mix(0.0, gene(2.0, 8.0), u_unique));
    int gPetals  = int(mix(3.0, gene(3.0, 5.0) + 3.0, u_unique));    // 3..7 mapped to 4..8 below
    int gCenter  = int(mix(0.0, gene(4.0, 3.0), u_unique));
    int gBg      = int(mix(0.0, gene(5.0, 3.0), u_unique));

    // outer petal count: 4, 5, 6, 7, or 8
    float petalCount = float(gPetals) + 1.0;

    // ---- field-specific layer config ----
    int   numLayers     = 4;
    float layerScaleK   = 0.78;      // each layer shrinks by this factor
    float layerRotStep  = 0.30;      // angular offset between layers (radians)
    float layerOpacity  = 0.62;      // alpha per layer
    int   petalShape    = 0;         // 0 rounded, 1 pointed, 2 lotus, 3 daisy

    if (gField == 0) {        // bloom: single layer, simple flower
        numLayers = 1;        layerScaleK = 1.0;        petalShape = 0;
    } else if (gField == 1) { // stacked: many tight concentric layers, same rotation
        numLayers = 5;        layerScaleK = 0.82;       layerRotStep = 0.0;      petalShape = 0;
    } else if (gField == 2) { // hibiscus: 2-3 layers, pointed petals, large outer
        numLayers = 3;        layerScaleK = 0.66;       layerRotStep = 0.55;     petalShape = 1;
    } else if (gField == 3) { // lotus: 4 layers, rounded mid-width petals, alternating rotation
        numLayers = 5;        layerScaleK = 0.78;       layerRotStep = 0.4;      petalShape = 2;
    } else if (gField == 4) { // daisy: outer ring of long thin petals + inner round body
        numLayers = 2;        layerScaleK = 0.45;       layerRotStep = 0.0;      petalShape = 3;
        petalCount = petalCount * 2.0;   // many more petals for daisy rays
    } else if (gField == 5) { // chrysanthemum: dense thin petals across many layers
        numLayers = 6;        layerScaleK = 0.85;       layerRotStep = 0.5;      petalShape = 3;
        petalCount = petalCount + 4.0;
        layerOpacity = 0.48;
    } else if (gField == 6) { // starburst: very pointed petals, fewer layers
        numLayers = 3;        layerScaleK = 0.60;       layerRotStep = 0.6;      petalShape = 1;
        layerOpacity = 0.74;
    } else {                  // dahlia: many layers, narrow rounded petals
        numLayers = 5;        layerScaleK = 0.80;       layerRotStep = 0.42;     petalShape = 0;
        petalCount = petalCount + 2.0;
    }

    // ---- background ----
    vec3 col = background(gBg);

    // Slow global rotation so the flower breathes.
    uv = rot(t * 0.3 + sd * 0.4) * uv;

    // ---- render layers, OUTER FIRST so inner layers composite on top ----
    for (int k = 0; k < 8; k++) {
        if (k >= numLayers) break;
        float fk = float(k);

        // Each layer at a smaller scale, rotated by layerRotStep * k
        float layerScale = pow(layerScaleK, fk);
        // Outermost layer (k=0) has the biggest scale = 1.0; we anchor to the
        // outermost so it fills the frame.
        layerScale = 1.0 * pow(layerScaleK, fk);

        vec2 lp = rot(fk * layerRotStep + sd * 0.05) * uv;
        float r = length(lp);
        if (r > layerScale * 1.05) continue;  // pixel is outside this layer entirely

        float a = atan(lp.y, lp.x);
        // snap to nearest petal axis
        float petalIdx     = floor(a * petalCount / TAU + 0.5);
        float petalCenter  = petalIdx * TAU / petalCount;
        float localAngle   = a - petalCenter;

        float fill = petalMask(r, localAngle, layerScale, petalShape);

        // layer color: outer layers darker/saturated, inner layers brighter/creamier
        float tone = mix(0.35, 0.92, fk / max(float(numLayers - 1), 1.0));
        vec3 layerColor = palette3(gPalette, tone);

        // outer layers a touch more saturated/dark, inner ones lifted toward cream
        col = over(col, layerColor, fill * layerOpacity);
    }

    // ---- center ----
    float rc = length(uv);
    if (gCenter == 0) {        // bead: small luminous gold sphere
        float bead    = smoothstep(0.035, 0.020, rc);
        float specular= smoothstep(0.020, 0.005, length(uv - vec2(0.012, 0.012)));
        col = over(col, vec3(0.78, 0.58, 0.16), bead);
        col = over(col, vec3(1.00, 0.95, 0.65), specular * 0.9);
    } else if (gCenter == 1) { // crown: ring of small beads around a gold center
        float core      = smoothstep(0.020, 0.010, rc);
        float ringR     = 0.055;
        float ringAng   = atan(uv.y, uv.x);
        float beadCount = 14.0;
        float beadAngle = ringAng * beadCount / TAU;
        float beadAlign = abs(fract(beadAngle) - 0.5) * 2.0;
        float beadBand  = exp(-pow(rc - ringR, 2.0) * 2200.0);
        float beadOn    = smoothstep(0.86, 1.0, 1.0 - beadAlign);
        col = over(col, vec3(0.92, 0.70, 0.20), core);
        col = over(col, vec3(0.95, 0.78, 0.32), beadBand * beadOn);
    }
    // gCenter == 2 (none): no center, the inner petal layer carries the focus

    // vignette: subtle so the deep wine bg eats the corners
    col *= smoothstep(1.75, 0.40, length(uv));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;
