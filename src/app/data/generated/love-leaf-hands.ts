import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "love-leaf-hands",
  name: "Reaching Hands",
  description:
    "Two hands made of ASCII characters reach toward each other across the dark, fingertips almost touching. A warm spark glows in the gap between them.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

/* ── palette ── */
#define BG      vec3(0.06, 0.01, 0.03)
#define BGFADE  vec3(0.12, 0.03, 0.06)
#define CRIM    vec3(0.72, 0.10, 0.14)
#define RED     vec3(0.85, 0.18, 0.18)
#define PINK    vec3(0.95, 0.55, 0.52)
#define PALE    vec3(0.98, 0.82, 0.76)
#define GOLD    vec3(1.00, 0.82, 0.36)
#define WHITE   vec3(1.00, 0.96, 0.92)

/* ── noise / hash ── */
float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

/* ════════════════════════════════════════════════════════
   Bitmap font: 5x7 glyphs packed into a float per row.
   Each glyph is 5 columns wide, 7 rows tall.
   We encode 16 characters: @ # $ % & * + = ~ : ; < > / \\ !
   stored as 7 floats (rows) of 5-bit patterns.
   ════════════════════════════════════════════════════════ */

// Returns 1.0 if the pixel at (cx, cy) in glyph index g is "on".
// cx: 0..4, cy: 0..6 (top to bottom)
float glyphPixel(int g, int cx, int cy) {
    // We store glyph bitmaps as constants.
    // Each glyph is 5 wide x 7 tall. We pack each row as 5 bits in an int.
    // bit4=leftmost column, bit0=rightmost column.

    // @ glyph (0)
    // .###.   01110 = 14
    // #...#   10001 = 17
    // #.##.   10110 = 22
    // #.#.#   10101 = 21
    // #.##.   10110 = 22
    // #....   10000 = 16
    // .###.   01110 = 14

    // # glyph (1)
    // .#.#.   01010 = 10
    // #####   11111 = 31
    // .#.#.   01010 = 10
    // #####   11111 = 31
    // .#.#.   01010 = 10
    // .....   00000 = 0
    // .....   00000 = 0

    // * glyph (2)
    // .....   00000 = 0
    // .#.#.   01010 = 10
    // ..#..   00100 = 4
    // #####   11111 = 31
    // ..#..   00100 = 4
    // .#.#.   01010 = 10
    // .....   00000 = 0

    // & glyph (3)
    // .##..   01100 = 12
    // #..#.   10010 = 18
    // .##..   01100 = 12
    // #..#.   10010 = 18
    // #..#.   10010 = 18
    // #..#.   10010 = 18
    // .##.#   01101 = 13

    // + glyph (4)
    // .....   00000 = 0
    // ..#..   00100 = 4
    // ..#..   00100 = 4
    // #####   11111 = 31
    // ..#..   00100 = 4
    // ..#..   00100 = 4
    // .....   00000 = 0

    // % glyph (5)
    // ##..#   11001 = 25
    // ##.#.   11010 = 26
    // ..#..   00100 = 4
    // .#...   01000 = 8
    // .#.##   01011 = 11
    // #..##   10011 = 19
    // .....   00000 = 0

    // $ glyph (6)
    // ..#..   00100 = 4
    // .####  01111 = 15
    // #.#..   10100 = 20
    // .###.   01110 = 14
    // ..#.#   00101 = 5
    // ####.  11110 = 30
    // ..#..   00100 = 4

    // = glyph (7)
    // .....   00000 = 0
    // .....   00000 = 0
    // #####   11111 = 31
    // .....   00000 = 0
    // #####   11111 = 31
    // .....   00000 = 0
    // .....   00000 = 0

    // We store them in arrays using ternary chains.
    // 8 glyphs, row by row. Access: rows[g*7 + cy], then test bit cx.
    int idx = g * 7 + cy;

    // Encode all glyph rows flat: 8 glyphs x 7 rows = 56 entries
    // We will use a lookup approach with comparisons to avoid arrays (GLSL ES 1.0).
    int row = 0;

    // glyph 0: @
    if(idx== 0) row=14; if(idx== 1) row=17; if(idx== 2) row=22;
    if(idx== 3) row=21; if(idx== 4) row=22; if(idx== 5) row=16;
    if(idx== 6) row=14;
    // glyph 1: #
    if(idx== 7) row=10; if(idx== 8) row=31; if(idx== 9) row=10;
    if(idx==10) row=31; if(idx==11) row=10; if(idx==12) row= 0;
    if(idx==13) row= 0;
    // glyph 2: *
    if(idx==14) row= 0; if(idx==15) row=10; if(idx==16) row= 4;
    if(idx==17) row=31; if(idx==18) row= 4; if(idx==19) row=10;
    if(idx==20) row= 0;
    // glyph 3: &
    if(idx==21) row=12; if(idx==22) row=18; if(idx==23) row=12;
    if(idx==24) row=18; if(idx==25) row=18; if(idx==26) row=18;
    if(idx==27) row=13;
    // glyph 4: +
    if(idx==28) row= 0; if(idx==29) row= 4; if(idx==30) row= 4;
    if(idx==31) row=31; if(idx==32) row= 4; if(idx==33) row= 4;
    if(idx==34) row= 0;
    // glyph 5: %
    if(idx==35) row=25; if(idx==36) row=26; if(idx==37) row= 4;
    if(idx==38) row= 8; if(idx==39) row=11; if(idx==40) row=19;
    if(idx==41) row= 0;
    // glyph 6: $
    if(idx==42) row= 4; if(idx==43) row=15; if(idx==44) row=20;
    if(idx==45) row=14; if(idx==46) row= 5; if(idx==47) row=30;
    if(idx==48) row= 4;
    // glyph 7: =
    if(idx==49) row= 0; if(idx==50) row= 0; if(idx==51) row=31;
    if(idx==52) row= 0; if(idx==53) row=31; if(idx==54) row= 0;
    if(idx==55) row= 0;

    // Test bit at column cx (bit 4-cx, since bit4 = leftmost)
    int bit = 4 - cx;
    // integer bit test: row / 2^bit mod 2
    int shifted = row;
    if(bit >= 4) shifted = shifted / 16;
    else if(bit >= 3) shifted = shifted / 8;
    else if(bit >= 2) shifted = shifted / 4;
    else if(bit >= 1) shifted = shifted / 2;
    return float(shifted - (shifted / 2) * 2);
}


/* ══════════════════════════════════════════════════
   Hand silhouette SDF. Built from capsules/ellipses.
   hand at origin, fingers pointing +y, palm centered.
   ══════════════════════════════════════════════════ */

// Signed distance to a capsule from a to b with radius r.
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// Signed distance to an ellipse (approximate).
float sdEllipse(vec2 p, vec2 center, vec2 radii) {
    vec2 q = (p - center) / radii;
    return (length(q) - 1.0) * min(radii.x, radii.y);
}

// Full hand SDF: fingers + palm. Returns negative inside.
float handSDF(vec2 p) {
    float d = 1e5;

    // Palm: ellipse
    d = min(d, sdEllipse(p, vec2(0.0, 0.0), vec2(0.14, 0.11)));

    // Thumb: angled outward
    vec2 thumbBase = vec2(-0.11, -0.02);
    vec2 thumbTip  = vec2(-0.20, 0.10);
    d = min(d, sdCapsule(p, thumbBase, thumbTip, 0.025));

    // Index finger
    vec2 idxBase = vec2(-0.06, 0.09);
    vec2 idxTip  = vec2(-0.08, 0.30);
    d = min(d, sdCapsule(p, idxBase, idxTip, 0.022));

    // Middle finger (longest)
    vec2 midBase = vec2(-0.01, 0.10);
    vec2 midTip  = vec2(-0.01, 0.34);
    d = min(d, sdCapsule(p, midBase, midTip, 0.024));

    // Ring finger
    vec2 rngBase = vec2(0.05, 0.09);
    vec2 rngTip  = vec2(0.06, 0.29);
    d = min(d, sdCapsule(p, rngBase, rngTip, 0.021));

    // Pinky
    vec2 pnkBase = vec2(0.10, 0.06);
    vec2 pnkTip  = vec2(0.13, 0.23);
    d = min(d, sdCapsule(p, pnkBase, pnkTip, 0.018));

    // Wrist
    vec2 wrstA = vec2(-0.08, -0.10);
    vec2 wrstB = vec2(0.08, -0.10);
    d = min(d, sdCapsule(p, wrstA, wrstB, 0.06));

    return d;
}


void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 1.2;
    float sv = u_seed * u_unique;
    float seed = fract(sv * 0.013);

    /* ── background ── */
    float vig = smoothstep(1.6, 0.2, length(uv));
    vec3 col = mix(BG, BGFADE, vig * 0.5);

    /* ── breathing gap ── */
    float gap = 0.06 + sin(t * 0.4) * 0.02;

    /* ── cell grid: 6x10 pixel cells in UV space ── */
    float cellW = 6.0 / u_resolution.y;
    float cellH = 10.0 / u_resolution.y;

    /* ── transform UV for each hand ── */
    // Left hand: reaching from the left, tilted, fingertips near center
    // Right hand: mirror of left

    // Left hand placement
    vec2 leftWrist  = vec2(-0.58, 0.05 + sin(t * 0.3) * 0.02);
    float leftAngle = -0.15 + sin(t * 0.25) * 0.03; // slight tilt

    // Right hand placement (mirrored)
    vec2 rightWrist = vec2(0.58, -0.05 + sin(t * 0.35 + 1.0) * 0.02);
    float rightAngle = 3.14159 + 0.15 - sin(t * 0.25) * 0.03;

    /* Rotate + translate into hand-local space */
    // Left hand local coords
    float cL = cos(leftAngle), sL = sin(leftAngle);
    vec2 uvL = uv - leftWrist;
    uvL = vec2(uvL.x * cL + uvL.y * sL, -uvL.x * sL + uvL.y * cL);

    // Right hand local coords (mirrored x)
    float cR = cos(rightAngle), sR = sin(rightAngle);
    vec2 uvR = uv - rightWrist;
    uvR = vec2(uvR.x * cR + uvR.y * sR, -uvR.x * sR + uvR.y * cR);
    uvR.x = -uvR.x; // mirror so same SDF works

    float dL = handSDF(uvL);
    float dR = handSDF(uvR);

    /* ── ASCII rendering ── */
    // Grid cell coordinates
    vec2 cellIdL = floor(uvL / vec2(cellW, cellH));
    vec2 cellPosL = fract(uvL / vec2(cellW, cellH));
    vec2 cellIdR = floor(uvR / vec2(cellW, cellH));
    vec2 cellPosR = fract(uvR / vec2(cellW, cellH));

    // Pixel within cell (0..4 for x, 0..6 for y)
    int pxL = int(cellPosL.x * 5.0);
    int pyL = int(cellPosL.y * 7.0);
    int pxR = int(cellPosR.x * 5.0);
    int pyR = int(cellPosR.y * 7.0);

    // Pick glyph based on cell position + time (cycling characters)
    float charIdxL = hash21(cellIdL + vec2(seed, 0.0));
    float timeShiftL = floor(t * 0.8 + charIdxL * 6.0);
    int glyphL = int(mod(charIdxL * 37.0 + timeShiftL, 8.0));

    float charIdxR = hash21(cellIdR + vec2(0.0, seed));
    float timeShiftR = floor(t * 0.8 + charIdxR * 6.0);
    int glyphR = int(mod(charIdxR * 41.0 + timeShiftR, 8.0));

    // Get pixel value from glyph bitmap
    float charL = glyphPixel(glyphL, pxL, pyL);
    float charR = glyphPixel(glyphR, pxR, pyR);

    /* ── wave of brightness flowing through the hands ── */
    // Left hand: wave flows from wrist toward fingertips (along local y)
    float waveL = sin(uvL.y * 12.0 - t * 2.5 + charIdxL * 3.0) * 0.5 + 0.5;
    // Right hand: same
    float waveR = sin(uvR.y * 12.0 - t * 2.5 + charIdxR * 3.0) * 0.5 + 0.5;

    /* ── color for each hand ── */
    // Distance from fingertips (approximate: high local y = near tips)
    float tipFactorL = smoothstep(0.05, 0.30, uvL.y);
    float tipFactorR = smoothstep(0.05, 0.30, uvR.y);

    // Base color gradient: deep crimson at wrist, warm pink at fingertips
    vec3 handColL = mix(CRIM, RED, tipFactorL);
    handColL = mix(handColL, PINK, tipFactorL * tipFactorL * 0.6);
    // Brightness wave overlay
    handColL = mix(handColL, PALE, waveL * 0.25);
    // Slight per-cell color variation
    handColL *= 0.85 + 0.3 * hash21(cellIdL + 0.5);

    vec3 handColR = mix(CRIM, RED, tipFactorR);
    handColR = mix(handColR, PINK, tipFactorR * tipFactorR * 0.6);
    handColR = mix(handColR, PALE, waveR * 0.25);
    handColR *= 0.85 + 0.3 * hash21(cellIdR + 0.5);

    /* ── composite hands into scene ── */
    // Soft edge mask from SDF
    float maskL = smoothstep(0.01, -0.01, dL);
    float maskR = smoothstep(0.01, -0.01, dR);

    // Edge glow: faint outline
    float edgeL = smoothstep(0.03, 0.0, abs(dL)) * 0.4;
    float edgeR = smoothstep(0.03, 0.0, abs(dR)) * 0.4;

    // Apply character pixels inside the hand silhouettes
    // Characters are bright; background of cell is dim hand color
    float charBrightL = charL * 0.7 + 0.3; // char pixels are bright, gaps are dim
    float charBrightR = charR * 0.7 + 0.3;

    vec3 handRenderL = handColL * charBrightL;
    vec3 handRenderR = handColR * charBrightR;

    col = mix(col, handRenderL, maskL);
    col = mix(col, handRenderR, maskR);

    // Edge glow
    col += CRIM * edgeL * (1.0 - maskL);
    col += CRIM * edgeR * (1.0 - maskR);

    /* ── the spark between fingertips ── */
    // Approximate fingertip positions in world space
    // Left hand middle fingertip in local space: (−0.01, 0.34)
    // Transform back to world space
    vec2 tipLocalL = vec2(-0.01, 0.34);
    vec2 tipWorldL = vec2(
        tipLocalL.x * cL - tipLocalL.y * sL,
        tipLocalL.x * sL + tipLocalL.y * cL
    ) + leftWrist;

    vec2 tipLocalR = vec2(0.01, 0.34); // mirrored x
    vec2 tipWorldR = vec2(
        -(tipLocalR.x * cR - tipLocalR.y * sR),
        -(tipLocalR.x * sR + tipLocalR.y * cR)
    ) + rightWrist;

    // The gap center
    vec2 sparkPos = (tipWorldL + tipWorldR) * 0.5;
    sparkPos += vec2(sin(t * 0.7) * 0.008, cos(t * 0.9) * 0.006);

    float sparkDist = length(uv - sparkPos);

    // Pulsing warm glow
    float pulse = 0.6 + 0.4 * sin(t * 3.0);
    float core = smoothstep(0.025, 0.0, sparkDist) * pulse;
    float glow = exp(-sparkDist * 9.0) * 0.6 * pulse;
    float outerGlow = exp(-sparkDist * 4.0) * 0.2;

    col += GOLD * core * 1.5;
    col += mix(GOLD, WHITE, 0.3) * glow;
    col += mix(CRIM, GOLD, 0.5) * outerGlow;

    // Tiny orbiting sparks
    for(float i = 0.0; i < 6.0; i++) {
        float a = t * 1.8 + i * 1.047;
        float r = 0.03 + 0.01 * sin(t * 2.0 + i * 1.5);
        vec2 sp = sparkPos + vec2(cos(a), sin(a)) * r;
        float sd = length(uv - sp);
        col += GOLD * smoothstep(0.006, 0.0, sd) * (0.4 + 0.4 * sin(t * 4.0 + i * 2.0));
    }

    // Hands near the spark get warmly lit
    float sparkWarmth = exp(-sparkDist * 5.0) * 0.3;
    col += GOLD * (maskL + maskR) * sparkWarmth;

    /* ── vignette + grain ── */
    col *= vig;
    float grain = (hash21(gl_FragCoord.xy + fract(t * 0.1)) - 0.5) * 0.03;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
