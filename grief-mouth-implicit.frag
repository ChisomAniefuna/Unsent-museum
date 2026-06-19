#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

// ----------------------------------------------------------------------------
// grief-mouth-implicit  (variant 4: "implicit-opening-field")
// A single human mouth. The OPENING is the implicit field between two lip
// centerlines yU(x) (upper) and yL(x) (lower); the lips are the fleshy bands
// hung off those lines, and the aperture is the signed gap between their inner
// edges. The opening height/width/corner-droop/skew are all driven by a fixed
// grief expression timeline, so open/close, droop, pout and bend stay directly
// controllable. Dark maroon void + faint teeth inside; soft flesh halo around.
// ----------------------------------------------------------------------------

// ---- small hashes / noise -------------------------------------------------
float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

mat2 rot(float a){
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

// ---- expression parameters bundled in a vec4 + extras ---------------------
// We pack the state into:
//   E.x = openAmount   (0 closed .. 1 wide)
//   E.y = press/pout   (0 normal .. 1 pursed/forward/fuller)
//   E.z = cornerDrop   (negative = corners up, positive = corners pulled DOWN)
//   E.w = bendAsym     (asymmetric trembling curl, signed)
// plus a separate tremble scalar returned via out-param.

// smooth pulse window helper: 1 inside [a,b] with eased edges of width e
float window(float t, float a, float b, float e){
    return smoothstep(a - e, a + e, t) * (1.0 - smoothstep(b - e, b + e, t));
}

vec4 expression(float tl, float seed, out float tremble){
    // tl is looped time in [0,16)
    // Segment-local easing weights (overlapping smoothsteps keep it continuous).
    float wSpeak  = window(tl, 0.0,  4.0,  0.45);
    float wPause  = window(tl, 4.0,  6.5,  0.45);
    float wPout   = window(tl, 6.5,  9.5,  0.45);
    float wFrown  = window(tl, 9.5,  12.5, 0.45);
    float wBend   = window(tl, 12.5, 15.0, 0.40);
    float wSettle = window(tl, 15.0, 16.0, 0.35);

    // --- SPEAKING (0..4): rhythmic open/close, ~4-5 syllables -------------
    // Use a couple of detuned sines so syllables are uneven, like real speech.
    float st = tl - 0.0;
    float syl = 0.5 + 0.5 * sin(st * 7.6 - 1.4);
    syl *= 0.6 + 0.4 * (0.5 + 0.5 * sin(st * 3.1 + 0.6));
    float speakOpen = pow(syl, 1.3) * 0.95;        // open amount while talking
    float speakDrop = -0.04;                        // corners nearly neutral

    // --- PAUSE (4..6.5): near-neutral, softly parted, almost still --------
    float pauseOpen = 0.10;
    float pauseDrop = 0.06;

    // --- POUT (6.5..9.5): pressed, fuller, pushed forward, pursed up ------
    float poutOpen  = 0.0;
    float poutPress = 1.0;
    float poutDrop  = -0.16;   // corners tucked slightly UP (sulking)

    // --- FROWN (9.5..12.5): corners pull DOWN, lips thin & tense ----------
    float frownOpen  = 0.04;
    float frownDrop  = 0.85;   // strong downturn
    float frownPress = 0.15;

    // --- BEND (12.5..15): asymmetric trembling curl, suppressed cry -------
    float bt = tl - 12.5;
    float bendDrop = 0.55 + 0.10 * sin(bt * 9.0);
    float bendAsym = 0.55 * sin(bt * 6.3 + seed * 6.28)
                   + 0.20 * sin(bt * 13.7);
    float bendOpen = 0.06 + 0.05 * (0.5 + 0.5 * sin(bt * 11.0));
    float bendPress = 0.20;

    // --- SETTLE (15..16): return to neutral resting -----------------------
    float settleOpen = 0.07;
    float settleDrop = 0.10;

    // Blend each parameter by its window weight, normalised so it sums ~1.
    float wsum = wSpeak + wPause + wPout + wFrown + wBend + wSettle + 1e-4;

    float openAmount =
        ( speakOpen  * wSpeak
        + pauseOpen  * wPause
        + poutOpen   * wPout
        + frownOpen  * wFrown
        + bendOpen   * wBend
        + settleOpen * wSettle ) / wsum;

    float press =
        ( 0.0        * wSpeak
        + 0.05       * wPause
        + poutPress  * wPout
        + frownPress * wFrown
        + bendPress  * wBend
        + 0.05       * wSettle ) / wsum;

    float cornerDrop =
        ( speakDrop  * wSpeak
        + pauseDrop  * wPause
        + poutDrop   * wPout
        + frownDrop  * wFrown
        + bendDrop   * wBend
        + settleDrop * wSettle ) / wsum;

    float asym =
        ( 0.0        * wSpeak
        + 0.0        * wPause
        + 0.0        * wPout
        + 0.05       * wFrown
        + bendAsym   * wBend
        + 0.0        * wSettle ) / wsum;

    // Constant grief quiver, stronger during bend; tiny everywhere else.
    float baseQuiver = 0.012 + 0.010 * (0.5 + 0.5 * sin(tl * 2.3 + seed));
    tremble = baseQuiver + 0.030 * wBend + 0.010 * wFrown;

    return vec4(clamp(openAmount, 0.0, 1.0), press, cornerDrop, asym);
}

// ---- mouth geometry --------------------------------------------------------
// "implicit-opening-field": the OPENING is the field between two lip
// centerlines. We model the upper-lip centerline yU(x) and lower-lip
// centerline yL(x) as functions of x. The aperture is where p.y lies between
// the inner edges of the two lips. Each lip is a thick band hung off its
// centerline. Width/height/corner-droop/skew all drive these two curves, so
// open/close, droop, pout and bend are directly controllable.
//
// mouthShape() fills in:
//   yU, yL   : centerline heights of upper / lower lip at this x
//   halfTU   : half-thickness of upper lip band at this x
//   halfTL   : half-thickness of lower lip band at this x
// and returns the corner falloff (1 at center -> 0 past the mouth corners).
float mouthShape(float x, float halfW, float openH, float drop, float asym,
                 float press, out float yU, out float yL,
                 out float halfTU, out float halfTL){
    float xn = x / max(halfW, 1e-3);          // -1..1 across the mouth
    // corner falloff: 1 across the body, easing to 0 at/just past the corners.
    float corner = 1.0 - smoothstep(0.62, 1.0, abs(xn));
    // a rounder profile so the lip body has a fuller belly toward center.
    float belly = sqrt(max(1.0 - xn * xn, 0.0)); // 1 center -> 0 at corner

    // baseline droop curve: corners move DOWN as drop increases.
    // (drop>0 => sorrowful downturn; drop<0 => slight upturn for pout)
    float droopY = -drop * (xn * xn) * 0.34;
    // asymmetric bend: tilt + a local waver on one side (suppressed cry).
    float bendY  = asym * (0.20 * xn + 0.12 * sin(xn * 4.5));

    float baseY = droopY + bendY;

    // The OPENING tapers to zero at the corners (lips meet there), so the two
    // lips read as one mouth pinched at the corners, not two floating bars.
    float openLocal = openH * belly;
    // upper lip: sits above the line, with a cupid's-bow dip at center.
    float bow = -0.040 * exp(-pow(xn / 0.34, 2.0));   // notch at top center
    float restGap = mix(0.010, 0.0, smoothstep(0.0, 0.4, openH)); // tiny seam
    yU = baseY + 0.5 * openLocal + restGap - bow;
    // lower lip: sits below the line, fuller.
    yL = baseY - 0.5 * openLocal - restGap;

    // lip thickness: fuller with pout, thinner/tenser when frowning. The body
    // is fullest at center (belly) and tapers toward the corners.
    float tenseThin = mix(1.0, 0.74, smoothstep(0.25, 0.9, drop));
    float fuller    = mix(1.0, 1.45, press);
    float taper     = 0.35 + 0.65 * belly;            // never fully zero -> corners join
    halfTU = (0.075 * mix(1.0, 1.18, press)) * tenseThin * taper;
    halfTL = (0.105 * fuller)                * tenseThin * taper;

    return corner;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    // per-artifact subtle variation, safe at zero
    float seed = u_seed * u_unique;
    float tOff = 0.18 * seed;
    float tl = mod(u_time + tOff, 16.0);

    float tremble;
    vec4 E = expression(tl, seed, tremble);
    float openAmount = E.x;
    float press      = E.y;
    float cornerDrop = E.z;
    float asym       = E.w + 0.12 * seed; // faint baseline asymmetry per artifact

    // ---- mouth local space ------------------------------------------------
    // Centered, scaled so the mouth reads large and fleshy.
    vec2 p = (uv - vec2(0.0, 0.0)) * 1.18;

    // Global grief tremble: tiny positional quiver + micro-rotation.
    float qx = (vnoise(vec2(u_time * 3.1, 11.0)) - 0.5);
    float qy = (vnoise(vec2(7.0, u_time * 2.7)) - 0.5);
    p += vec2(qx, qy) * tremble * 1.2;
    p = rot((vnoise(vec2(u_time * 1.7, 3.0)) - 0.5) * tremble * 0.9) * p;

    // mouth dimensions
    float halfW = mix(0.62, 0.50, press) * (1.0 + 0.015 * sin(u_time * 1.3)); // pout narrows
    float openH = mix(0.0, 0.40, openAmount);   // vertical opening of aperture

    // sample the two lip centerlines at this x
    float yU, yL, halfTU, halfTL;
    float corner = mouthShape(p.x, halfW, openH, cornerDrop, asym, press,
                              yU, yL, halfTU, halfTL);

    float aa = 2.5 / u_resolution.y;

    // ---- masks ------------------------------------------------------------
    // horizontal extent of the lips (close off just past the corners). The lip
    // thickness already tapers to a small value here, so this edge is hidden in
    // the corner pinch rather than reading as a vertical box.
    float inX = 1.0 - smoothstep(halfW * 0.995, halfW * 1.05, abs(p.x));

    // upper lip band: |p.y - yU| < halfTU
    float dU = abs(p.y - yU) - halfTU;
    float upperMask = (1.0 - smoothstep(-aa, aa, dU)) * inX;
    // lower lip band: |p.y - yL| < halfTL
    float dL = abs(p.y - yL) - halfTL;
    float lowerMask = (1.0 - smoothstep(-aa, aa, dL)) * inX;

    // aperture / interior: between the inner edges of the two lips.
    float innerU = yU - halfTU;   // bottom edge of upper lip
    float innerL = yL + halfTL;   // top edge of lower lip
    float gap = innerU - innerL;  // >0 means there is an opening
    float interiorMask = smoothstep(-aa, aa, innerU - p.y)
                       * smoothstep(-aa, aa, p.y - innerL)
                       * inX
                       * smoothstep(0.0, 0.02, gap); // vanish when lips meet

    // lips take precedence over interior on overlap
    float lipMask = max(upperMask, lowerMask);
    interiorMask *= (1.0 - lipMask);

    // ---- shading: lips ----------------------------------------------------
    // form coordinate across each lip band: -1 inner (vermilion), +1 outer
    float fU = (p.y - yU) / max(halfTU, 1e-3);    // upper: inner is +? -> inner edge is below
    float fL = (p.y - yL) / max(halfTL, 1e-3);
    // For the upper lip the vermilion (wet inner) edge faces DOWN (toward gap);
    // for the lower lip it faces UP. Build a single 0..1 "toward-skin" ramp.
    float upper = upperMask >= lowerMask ? 1.0 : 0.0; // 1 if this pixel is upper lip
    float toGap = upper > 0.5 ? -fU : fL; // -1 at gap edge, +1 at skin edge
    float t01 = clamp(toGap * 0.5 + 0.5, 0.0, 1.0);

    // grief lip palette
    vec3 lipLit    = vec3(0.55, 0.42, 0.46);  // pale dried-rose, lit
    vec3 lipMid    = vec3(0.40, 0.28, 0.33);  // mid
    vec3 lipShadow = vec3(0.24, 0.15, 0.20);  // darker mauve-grey shadow
    vec3 lipDeep   = vec3(0.16, 0.10, 0.15);  // vermilion-border deep edge

    // vermilion border dark at the gap edge, body brightening toward sheen,
    // skin edge falling back to shadow.
    vec3 lipCol = mix(lipDeep, lipShadow, smoothstep(0.0, 0.18, t01));
    lipCol = mix(lipCol, lipMid, smoothstep(0.12, 0.45, t01));
    lipCol = mix(lipCol, lipLit, smoothstep(0.35, 0.62, t01));
    lipCol = mix(lipCol, lipShadow, smoothstep(0.72, 1.0, t01)); // skin edge falloff

    // sheen ridge: soft highlight a bit toward the wet inner third.
    float sheen = exp(-pow((t01 - 0.40) / 0.16, 2.0));
    // lower lip catches more light (fuller, faces up)
    float lowerBoost = (upper > 0.5) ? 0.55 : 1.0;
    lipCol += sheen * vec3(0.20, 0.15, 0.16) * lowerBoost;

    // pout center highlight (forward-pushed lips)
    float poutHi = press * exp(-pow(p.x / (halfW * 0.55), 2.0)) * sheen;
    lipCol += poutHi * vec3(0.12, 0.09, 0.10);

    // tiny vertical lip-texture lines for realism (very subtle)
    float lines = 0.5 + 0.5 * cos(p.x * 95.0);
    lipCol *= 1.0 - 0.05 * lines * smoothstep(0.2, 0.8, t01);

    // ---- shading: interior (void + teeth hint) ----------------------------
    vec3 voidDeep = vec3(0.07, 0.03, 0.06);
    vec3 voidWarm = vec3(0.16, 0.06, 0.09);
    // depth: deeper (darker) toward vertical center of the opening
    float gapCenter = 0.5 * (innerU + innerL);
    float depth = 1.0 - smoothstep(0.0, max(gap * 0.6, 1e-3), abs(p.y - gapCenter));
    vec3 interiorCol = mix(voidWarm, voidDeep, depth);
    // throat shadow toward the top of the opening
    interiorCol *= mix(1.0, 0.5, smoothstep(innerL, innerU, p.y));

    // faint upper teeth: pale strip just under the upper lip when open enough
    float teethVis = smoothstep(0.30, 0.62, openAmount);
    float teethTop = innerU;                  // just below upper lip
    float teethH = min(gap * 0.42, 0.07);
    float teethBand = smoothstep(teethTop - teethH, teethTop - teethH * 0.15, p.y)
                    * (1.0 - smoothstep(teethTop - teethH * 0.1, teethTop, p.y));
    float teethScallop = 0.5 + 0.5 * cos(p.x / max(halfW, 1e-3) * 16.0);
    float teeth = teethVis * teethBand * (0.55 + 0.45 * teethScallop) * inX;
    interiorCol = mix(interiorCol, vec3(0.32, 0.29, 0.31), clamp(teeth, 0.0, 1.0) * 0.5);

    // ---- background: dark grief field ------------------------------------
    vec3 offBlack    = vec3(0.05, 0.04, 0.07);
    vec3 dirtyPurple = vec3(0.29, 0.24, 0.37);
    float haze = vnoise(uv * 1.3 + vec2(0.0, u_time * 0.03));
    haze = haze * 0.5 + 0.5 * vnoise(uv * 2.7 - vec2(u_time * 0.02, 0.0));
    vec3 bg = mix(offBlack, dirtyPurple * 0.45, haze * 0.16);
    bg = mix(bg, offBlack, smoothstep(0.4, 1.4, length(uv)) * 0.6);

    // ---- skin halo: soft flesh around the lips so it doesn't float naked --
    // Elliptical falloff centred on the mouth (NOT clipped by inX), so the
    // flesh fades smoothly into the dark with no boxy edge.
    float ell = length(p * vec2(0.85, 1.55));   // wider than tall, like a face plane
    float skinField = 1.0 - smoothstep(0.30, 0.78, ell);
    float skinHalo = skinField * (1.0 - lipMask) * (1.0 - interiorMask);
    // philtrum: subtle vertical shadow groove above the upper lip center
    float aboveUpper = smoothstep(0.0, 0.04, p.y - (yU + halfTU));
    float philtrum = aboveUpper * exp(-pow(p.x / 0.05, 2.0)) * 0.5;
    vec3 skinCol = vec3(0.17, 0.12, 0.15) * (1.0 - 0.4 * philtrum);
    bg = mix(bg, skinCol, skinHalo * 0.6);
    // chin/under-lip soft shadow for form
    float underLower = smoothstep(0.0, 0.14, (yL - halfTL) - p.y)
                     * (1.0 - smoothstep(0.30, 0.6, ell));
    bg = mix(bg, bg * 0.72, underLower * 0.5);

    // ---- composite --------------------------------------------------------
    vec3 col = bg;
    col = mix(col, interiorCol, interiorMask);
    col = mix(col, lipCol, lipMask);

    // ---- grief grain ------------------------------------------------------
    float grain = hash21(gl_FragCoord.xy + vec2(u_time * 60.0, u_time * 37.0));
    col += (grain - 0.5) * 0.035;

    // ---- vignette ---------------------------------------------------------
    float vig = smoothstep(1.5, 0.35, length(uv * vec2(0.85, 1.0)));
    col *= mix(0.5, 1.0, vig);

    // faint cool grief desaturation pass
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum) * vec3(0.92, 0.9, 1.0), 0.12);

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}
