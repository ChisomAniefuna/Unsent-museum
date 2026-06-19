#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

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

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for(float i = 0.0; i < 5.0; i++){
        v += amp * vnoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return v;
}

const float PI = 3.14159265;

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    float t = u_time * 0.224;

    // ── seed variation, fully gated by u_unique ───────────────────────────
    float sd       = u_seed * u_unique;
    float palShift = (hash11(sd + 7.31) - 0.5) * 0.20 * u_unique;
    float driftDir = mix(1.0, sign(hash11(sd + 2.17) - 0.5), u_unique);
    float phase    = sd * 6.2831;

    float horizon = -0.04;

    // duotone-leaning palette: deep ink-navy -> jade -> bright moon white
    vec3 ink    = vec3(0.018, 0.043, 0.078);
    vec3 navy   = vec3(0.043, 0.180, 0.300);
    vec3 jade   = vec3(0.392, 0.831, 0.741);
    vec3 moonpal= vec3(0.965, 0.984, 1.000);

    navy += vec3(palShift * 0.30, palShift * 0.10, -palShift * 0.20);
    jade += vec3(-palShift * 0.20, palShift * 0.18, palShift * 0.22);

    // ── flowing night background (domain-warped) ──────────────────────────
    float warp  = fbm(uv * 1.3 + vec2(t * 0.22 * driftDir, -t * 0.15) + phase);
    vec2  fp    = uv + (warp - 0.5) * 0.40;
    float field = fbm(fp * 2.1 + vec2(t * 0.10 * driftDir, t * 0.06));

    float vgrad = smoothstep(-1.1, 1.0, uv.y);
    vec3 col = mix(ink, navy, vgrad);
    col += navy * 0.22 * field;
    col = mix(col, ink, smoothstep(0.0, -1.1, uv.y) * 0.55);

    // faint scatter of stars high in the sky
    float starField = vnoise(uv * vec2(60.0, 34.0) + 31.0);
    starField = pow(starField, 24.0);
    col += moonpal * starField * smoothstep(0.15, 0.9, uv.y) * 0.8;

    // ── moon-gate geometry ────────────────────────────────────────────────
    vec2  gateC = vec2(0.0, 0.34);
    float gateR = 0.46 + 0.045 * sin(t * 0.55 + phase);   // gate breathes open/closed
    float ringW = 0.050;

    // CLOSURE lifecycle: the ring draws itself shut, the moon rises & crosses,
    // then it all settles. One slow, graceful loop.
    float lifeT = fract(t * 0.18 + phase * 0.16);

    // 1) the gate ring sweeps closed from the bottom up to a full circle
    float draw  = smoothstep(0.0, 0.55, lifeT);             // 0..1 completion
    float settle= smoothstep(0.55, 1.0, lifeT);             // late calm

    // 2) the moon rises from the water through the gate
    float rise  = smoothstep(0.05, 0.70, lifeT);
    float moonY = mix(horizon + 0.02, gateC.y, rise);
    vec2  moonC = vec2(0.0, moonY);

    // 3) gentle breathing glow that calms as it settles
    float glowPulse = (0.78 + 0.22 * sin(t * 0.7 + phase * 0.5)) * mix(1.0, 0.85, settle);

    // angle around the gate, measured from the bottom going up both sides
    vec2  ga    = uv - gateC;
    float ang   = atan(ga.x, -ga.y);          // 0 at bottom, +-PI at top
    float closure = 1.0 - abs(ang) / PI;      // 1 at bottom, 0 at very top
    float drawnArc = smoothstep(draw - 0.06, draw + 0.02, closure); // unlit ahead
    float arcMask = 1.0 - drawnArc;           // 1 where ring is already drawn

    // ── the gate ring (carved stone catching moonlight) ───────────────────
    float dGate = abs(length(ga) - gateR);
    float ring  = smoothstep(ringW, ringW * 0.30, dGate) * arcMask;
    vec2  rn    = normalize(ga + 1e-5);
    float lit   = 0.5 + 0.5 * dot(rn, normalize(vec2(-0.55, 0.83)));
    // wide value range across the ring: deep shadow side -> bright moonlit side
    vec3 ringCol = mix(ink * 0.6, moonpal, pow(lit, 1.4));
    ringCol = mix(ringCol, jade, 0.16 * lit);
    // bright leading spark at the head of the drawing arc
    float head = exp(-pow((closure - draw) * 26.0, 2.0)) * (1.0 - settle);
    ringCol += moonpal * head * 0.9;

    float aboveMask = smoothstep(horizon - 0.05, horizon + 0.02, uv.y);

    // ── the rising moon disk seen through the gate ────────────────────────
    float distM = length(uv - moonC);
    float moonR = gateR - ringW * 1.4;
    float moonDisk = smoothstep(moonR, moonR - 0.018, distM);
    float maria = fbm((uv - moonC) * 5.0 + phase) * 0.20;
    vec3 moonCol = moonpal - maria * vec3(0.06, 0.05, 0.0);
    float limb = smoothstep(moonR, moonR * 0.18, distM);
    moonCol = mix(moonpal * 0.70, moonCol, limb);            // darkened limb -> bright core

    // halo of the moon, clipped softly so light spills through the gate
    float halo = exp(-distM * distM / (gateR * gateR * 0.80));
    vec3 glow = jade * halo * 0.55 * glowPulse;
    float haloOuter = exp(-distM * 2.4) * 0.38 * glowPulse;
    glow += moonpal * haloOuter;

    vec3 above = col;
    above += glow * aboveMask;
    above = mix(above, moonCol, moonDisk * aboveMask * rise);
    above = mix(above, ringCol, ring * aboveMask);

    // ── still-water reflection below the horizon ──────────────────────────
    vec2 ruv = uv;
    ruv.y = 2.0 * horizon - uv.y;
    float depth = clamp((horizon - uv.y), 0.0, 2.0);

    // slow ripples that ease toward stillness as the cycle settles
    float calm = mix(1.0, 0.35, settle);
    float rip1 = sin((uv.x * 5.5) + t * 1.0 + fbm(uv * 3.0 + t * 0.18) * 3.6);
    float rip2 = sin((-uv.x * 8.5) + uv.y * 2.6 - t * 0.7 + phase);
    float ripple = (rip1 * 0.6 + rip2 * 0.4) * calm;
    float shimmer = (0.018 + 0.042 * depth);
    ruv.x += ripple * shimmer * driftDir;
    ruv.y += ripple * shimmer * 0.5;

    vec2  rgm   = ruv - moonC;
    float rdistM= length(rgm);
    float rMoon = smoothstep(moonR, moonR - 0.03, rdistM);
    float rRingD= abs(length(ruv - gateC) - gateR);
    vec2  rga   = ruv - gateC;
    float rang  = atan(rga.x, -rga.y);
    float rclos = 1.0 - abs(rang) / PI;
    float rArc  = 1.0 - smoothstep(draw - 0.06, draw + 0.02, rclos);
    float rRing = smoothstep(ringW, ringW * 0.30, rRingD) * rArc;

    vec3 reflCol = navy * (0.40 + 0.32 * field);
    float rHalo = exp(-rdistM * rdistM / (gateR * gateR * 0.90)) * glowPulse;
    reflCol += jade * rHalo * (0.34 + 0.40 * abs(ripple)) * 0.65;
    reflCol = mix(reflCol, moonpal * 0.80, rMoon * (0.55 + 0.20 * abs(ripple)) * rise);
    reflCol = mix(reflCol, mix(jade, moonpal, 0.5), rRing * 0.45);

    // a column of moonlight glittering on the water surface
    float spark = vnoise(uv * vec2(44.0, 16.0) + vec2(t * 1.3 * driftDir, t));
    spark = pow(spark, 7.0);
    float lane = exp(-uv.x * uv.x / 0.10);                   // centred glitter lane
    reflCol += moonpal * spark * lane * (0.30 + 0.30 * depth) * calm;

    float reflFade = exp(-depth * 1.35);
    reflCol = mix(ink * 0.55, reflCol, reflFade);

    float horizGlow = exp(-abs(uv.y - horizon) * 20.0);
    reflCol += jade * horizGlow * 0.20 * glowPulse;

    float belowMask = smoothstep(horizon + 0.02, horizon - 0.05, uv.y);
    col = mix(above, reflCol, belowMask);

    // ── grade: vignette, grain, contrast ──────────────────────────────────
    float vig = smoothstep(1.55, 0.20, length(uv * vec2(0.85, 1.0)));
    col *= mix(0.66, 1.0, vig);

    float grain = (hash21(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.028;
    col += grain;

    // push contrast: deepen shadows, lift the moonlit highlights
    col = (col - 0.5) * 1.14 + 0.5;
    col = pow(max(col, 0.0), vec3(0.90));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
