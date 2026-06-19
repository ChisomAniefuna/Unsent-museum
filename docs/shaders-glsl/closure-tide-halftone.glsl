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
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.55;
    mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
    for(float i = 0.0; i < 4.0; i++){
        v += amp * vnoise(p);
        p = rot * p * 2.02 + 7.31;
        amp *= 0.5;
    }
    return v;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    // ---- seed variation, fully gated by u_unique ----
    float seed = u_seed * u_unique;
    float ang  = (hash11(seed + 11.0) - 0.5) * 6.2831 * u_unique;
    float ca = cos(ang);
    float sa = sin(ang);
    mat2 srot = mat2(ca, -sa, sa, ca);

    vec2 origin = vec2(
        (hash11(seed + 3.0) - 0.5) * 0.9 * u_unique,
        -0.35 + (hash11(seed + 5.0) - 0.5) * 0.6 * u_unique
    );
    float palShift = (hash11(seed + 19.0) - 0.5) * 0.5 * u_unique;

    // ---- slow global lifecycle: tide swells, then recedes into calm ----
    float t = u_time * 0.42;
    // breathing recession factor: 0 = tide high & active, 1 = receded & calm
    float recede = 0.5 + 0.5 * sin(u_time * 0.085);
    recede = smoothstep(0.0, 1.0, recede);

    // ---- flowing / warping background ----
    vec2 wuv = srot * uv;
    vec2 warp;
    warp.x = fbm(wuv * 1.3 + vec2(t * 0.35, -t * 0.22));
    warp.y = fbm(wuv * 1.3 + vec2(-t * 0.27, t * 0.31) + 4.7);
    vec2 fuv = wuv + (warp - 0.5) * 0.40;

    float flow  = fbm(fuv * 1.7 + vec2(t * 0.5, t * 0.18));
    float depth = fbm(fuv * 0.85 - vec2(t * 0.12, t * 0.2));

    vec3 navyDeep = vec3(0.012, 0.045, 0.078);
    vec3 navyMid  = vec3(0.045, 0.130, 0.205);
    vec3 col = mix(navyDeep, navyMid, depth * 0.85 + flow * 0.22);

    // strong vignette to deepen shadows toward the edges
    float vig = 1.0 - 0.70 * dot(uv, uv) * 0.5;
    col *= clamp(vig, 0.32, 1.0);

    // a faint calm band the tide settles toward
    float horizonY = origin.y + 0.30;
    float calm = smoothstep(-0.2, 1.5, fuv.y - horizonY);
    col += vec3(0.020, 0.055, 0.080) * calm * (0.6 + 0.4 * recede);

    // ---- radial tide geometry from origin ----
    vec2 ro = wuv - origin;
    float dist = length(ro);
    float radPhase = dist * 7.5 - u_time * 1.05;
    float settle = exp(-dist * (0.80 + 0.9 * recede));   // receding pulls energy inward
    float foamLine = sin(radPhase) * exp(-dist * 1.6);
    float foam = smoothstep(0.50, 0.95, foamLine) * (1.0 - recede);

    // ---- HALFTONE DOT FIELD ----
    float cell = 26.0;
    vec2 guv = fuv * 0.5;
    vec2 gid = floor(guv * cell);
    vec2 gf  = fract(guv * cell) - 0.5;

    // per-cell tide value sampled at cell center (stable, non-aliasing)
    vec2 cellCenterUV = (gid + 0.5) / cell * 2.0;
    vec2 cro = cellCenterUV - origin;
    float cdist = length(cro);
    float cradPhase = cdist * 7.5 - u_time * 1.05;
    float csettle = exp(-cdist * (0.80 + 0.9 * recede));
    float ctide = 0.5 + 0.5 * sin(cradPhase) * csettle;

    // gentle per-dot drift, fading as the tide recedes
    float jit = hash21(gid + 1.0);
    float driftAmt = csettle * 0.14 * (1.0 - 0.6 * recede);
    vec2 drift = vec2(
        sin(u_time * 0.55 + jit * 6.28),
        cos(u_time * 0.47 + jit * 6.28)
    ) * driftAmt;
    vec2 dotp = gf - drift;

    // dot radius: large/active where the tide is high, shrinking into calm
    float baseR = 0.14 + 0.34 * ctide;
    baseR *= mix(0.50, 1.0, smoothstep(0.0, 1.5, cdist + 0.2));
    baseR *= mix(1.0, 0.78 + 0.22 * jit, u_unique);
    // recession: dots far from origin shrink toward a tiny, even, calm grain
    baseR *= mix(1.0, 0.55, recede * smoothstep(0.3, 2.6, cdist));

    float dotDist = length(dotp);
    float aa = 1.4 / (cell * 2.0);
    float dotMask = smoothstep(baseR + aa, baseR - aa, dotDist);

    // ripple brightness across the dot field
    float rip = sin(cdist * 16.0 - u_time * 2.0) * 0.5 + 0.5;
    float dotBright = mix(0.50, 1.0, ctide) * (0.65 + 0.35 * rip);

    // WIDE value range: deep teal-blue shadow -> near-white crest
    vec3 dotLow  = vec3(0.090, 0.330, 0.560);
    vec3 dotHigh = vec3(0.780, 0.930, 0.985);
    dotHigh = clamp(dotHigh + vec3(palShift * 0.16, palShift * 0.05, -palShift * 0.10), 0.0, 1.0);
    vec3 dotCol = mix(dotLow, dotHigh, clamp(dotBright, 0.0, 1.0));

    // bright specular core on each dot for crispness
    float core = smoothstep(baseR, 0.0, dotDist);
    dotCol += vec3(0.16, 0.22, 0.26) * core * ctide;

    // dots fade with distance, never fully vanishing (a faint settled stipple remains)
    float fadeOut = smoothstep(3.4, 1.0, cdist);
    fadeOut = mix(fadeOut, 1.0, 0.30);
    float dotAlpha = dotMask * (0.30 + 0.70 * fadeOut);

    col = mix(col, dotCol, clamp(dotAlpha, 0.0, 1.0));

    // foam crest glow between the dots, only while the tide is in
    float foamGlow = foam * (1.0 - dotMask) * 0.45;
    col += vec3(0.30, 0.55, 0.62) * foamGlow * settle;

    // fine secondary halftone grain — the residue of the tide on the sand
    float fineCell = 70.0;
    vec2 ff = fract(fuv * 0.5 * fineCell) - 0.5;
    float fdot = smoothstep(0.16, 0.04, length(ff));
    float fineTide = 0.5 + 0.5 * sin(dist * 7.5 - u_time * 1.05 + 1.5) * settle;
    col += vec3(0.05, 0.12, 0.15) * fdot * fineTide * (1.0 - dotMask) * (0.4 + 0.5 * recede);

    // soft horizon glow where everything comes to rest
    float horizonGlow = exp(-abs(fuv.y - horizonY) * 3.2);
    col += vec3(0.06, 0.14, 0.18) * horizonGlow * (0.4 + 0.5 * recede);

    // subtle film grain
    float grain = hash21(gl_FragCoord.xy + fract(u_time) * 60.0);
    col += (grain - 0.5) * 0.022;

    // contrast lift + saturation
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.12);
    col = (col - 0.5) * 1.10 + 0.5;
    col = pow(clamp(col, 0.0, 1.0), vec3(0.90));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
