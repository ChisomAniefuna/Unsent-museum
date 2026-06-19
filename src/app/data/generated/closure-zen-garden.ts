import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "closure-zen-garden",
  name: "Raked Garden",
  description: "Concentric raked ripples swell outward around still stones, then settle to rest.",
  glsl: `
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
    float s = 0.0;
    float amp = 0.5;
    float tot = 0.0;
    for(float i = 0.0; i < 4.0; i++){
        s += amp * vnoise(p);
        tot += amp;
        p = p * 2.02 + vec2(11.3, 7.1);
        amp *= 0.5;
    }
    return s / tot;
}

// stone center for index i; arrangement jitter gated by u_unique
vec2 stoneCenter(float fi, float seedB, float t){
    float ph = fi * 2.3994 + seedB * 6.2831;
    float rad = 0.40 + 0.26 * fi / 3.0;
    vec2 sc;
    sc.x = cos(ph) * rad + (hash11(fi + 11.0 + u_seed) - 0.5) * 0.30 * u_unique;
    sc.y = sin(ph) * rad * 0.70 - 0.10 + (hash11(fi + 23.0 + u_seed) - 0.5) * 0.20 * u_unique;
    float drift = 0.016 * sin(t * 0.10 + fi * 1.7);
    sc += vec2(drift, drift * 0.5);
    return sc;
}

// elliptical "radius" of a stone footprint at point p
float stoneEllipse(vec2 p, vec2 sc, out float sx, out float sy){
    vec2 d = p - sc;
    sx = 0.20 + 0.07 * hash11(floor(sc.x * 53.0 + sc.y * 31.0) + 5.0);
    sy = sx * (0.62 + 0.12 * hash11(floor(sc.x * 41.0 + sc.y * 19.0) + 9.0));
    return length(vec2(d.x / sx, d.y / sy));
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    float t = u_time;

    // ---- seed gating (u_unique==0 -> single canonical composition) ----
    float seedA = hash11(u_seed * 1.7 + 3.1) * u_unique;
    float seedB = hash11(u_seed * 2.3 + 7.9) * u_unique;
    float seedC = hash11(u_seed * 0.7 + 1.3) * u_unique;
    float travelDir = mix(1.0, sign(hash11(u_seed * 4.4 + 0.2) - 0.5), u_unique);

    // gentle framing variation (seed only)
    float gScale = 1.0 + 0.10 * (seedC - 0.5);
    uv *= gScale;
    float gAng = (seedA - 0.5) * 0.45;
    float cs = cos(gAng);
    float sn = sin(gAng);
    uv = mat2(cs, -sn, sn, cs) * uv;

    // ---- flowing domain warp: the whole sand bed breathes slowly ----
    vec2 warp;
    warp.x = fbm(uv * 1.25 + vec2(0.0, t * 0.030) + seedA * 10.0);
    warp.y = fbm(uv * 1.25 + vec2(5.2, -t * 0.026) + seedB * 10.0);
    vec2 fuv = uv + (warp - 0.5) * 0.30;

    // ---- stones: relief shading + ring influence that bends the rake lines ----
    float occ = 0.0;
    float stoneLit = 0.0;
    float field = 0.0;

    for(float i = 0.0; i < 3.0; i++){
        float fi = i;
        vec2 sc = stoneCenter(fi, seedB, t);
        float sx;
        float sy;
        float er = stoneEllipse(fuv, sc, sx, sy);

        float body = smoothstep(1.06, 0.90, er);
        // sculptural relief, light from upper-left
        vec2 d = fuv - sc;
        float light = clamp(0.55 - (d.x * 1.0 + d.y * 1.2), 0.0, 1.0);
        light = pow(light, 1.3);
        float sh = mix(0.05, 0.66, light);
        stoneLit = mix(stoneLit, sh, body);
        occ = max(occ, body);

        // raked rings hug each stone (closer => stronger displacement)
        float ringDist = abs(er - 1.0);
        field += 0.60 / (1.0 + ringDist * 12.0);
    }

    // ---- concentric raked ripples around the garden center ----
    vec2 rc = vec2(0.0, -0.05);
    float dist = length((fuv - rc) * vec2(1.0, 1.18));

    // the rake line phase: tight concentric furrows, bent near stones
    float freq = 28.0;
    float speed = 0.26 * travelDir;
    float phaseShift = seedC * 6.2831;
    float ripplePhase = dist * freq - t * speed + phaseShift + field * 3.4;
    float rake = sin(ripplePhase);

    // ---- LIFECYCLE: a swell of fresh raking travels outward, then settles ----
    // a slow band of amplitude sweeps from center to rim and fades = "closure"
    float cycle = fract(t * 0.045);                 // 0..1 slow cycle
    float front = cycle * 1.8;                       // raking front radius
    float band = exp(-pow((dist - front) * 2.4, 2.0)); // active raking band
    float settle = smoothstep(1.7, 0.2, dist + cycle * 1.2); // calm behind front
    float life = 0.34 + 0.66 * max(band, settle * 0.55);
    rake *= life;

    // micro tooth-marks of the rake teeth (fine high-frequency detail)
    float micro = (fbm(fuv * 9.0 + vec2(t * 0.018, 0.0)) - 0.5) * 0.36;
    rake += micro;

    // crisp furrows: sharpen the valleys
    float groove = smoothstep(-0.30, 0.85, rake);
    groove = pow(groove, 0.85);

    // ---- sand base value with wide dynamic range ----
    float sandFbm = fbm(fuv * 2.2 + seedA * 4.0);
    float base = 0.40 + (sandFbm - 0.5) * 0.20;

    float val = base;
    val += (groove - 0.5) * 0.58;

    // ridges catch light along the raking front (freshly turned sand glows)
    float ridge = smoothstep(0.55, 0.95, groove) * band;
    val += ridge * 0.22;

    // ambient occlusion toward garden center (depth in the bowl)
    float ao = 1.0 - smoothstep(0.0, 0.60, dist) * 0.12;
    val *= ao;

    // vignette frames the garden
    float vign = 1.0 - smoothstep(0.70, 1.70, length(uv));
    val *= mix(0.46, 1.0, vign);

    // ---- traveling light sweep (a low sun crossing the garden) ----
    float sweepDir = travelDir;
    float sweepPos = sin(t * 0.08) * 1.3 * sweepDir;
    float sweep = exp(-pow((uv.x - sweepPos) * 0.85, 2.0));
    float sweepCross = exp(-pow((uv.y - sin(t * 0.055 + 1.0) * 0.8) * 0.7, 2.0));
    val += sweep * 0.18 + sweepCross * sweep * 0.10;
    // grooves glint where the light grazes
    val += groove * sweep * 0.14;

    // ---- duotone-plus sand palette: deep shadow -> warm highlight ----
    vec3 sandLo = vec3(0.07, 0.08, 0.11);
    vec3 sandMid = vec3(0.52, 0.50, 0.45);
    vec3 sandHi = vec3(0.95, 0.91, 0.82);

    vec3 col = mix(sandLo, sandMid, smoothstep(0.0, 0.5, val));
    col = mix(col, sandHi, smoothstep(0.5, 1.0, val));

    // optional warm/cool palette shift gated by u_unique
    col = mix(col, col * vec3(1.06, 1.0, 0.92), (seedB - 0.5) * 0.6);

    // ---- composite stones (dark, still, with a lit rim) ----
    vec3 stoneCol = mix(vec3(0.04, 0.05, 0.07), vec3(0.44, 0.45, 0.48), stoneLit);
    float rim = smoothstep(0.0, 0.35, occ) * pow(stoneLit, 0.5);
    stoneCol += rim * 0.16 * sweep;
    col = mix(col, stoneCol, occ);

    // ---- cast shadows of stones onto the sand ----
    float shadow = 0.0;
    vec2 shOff = vec2(0.05, -0.06);
    for(float i = 0.0; i < 3.0; i++){
        float fi = i;
        vec2 sc = stoneCenter(fi, seedB, t);
        float sx;
        float sy;
        float er = stoneEllipse(fuv - shOff, sc, sx, sy);
        shadow = max(shadow, smoothstep(1.30, 0.94, er));
    }
    shadow *= (1.0 - occ);
    col *= mix(1.0, 0.58, shadow);

    // ---- fine grain + subtle texture ----
    float grain = (hash21(gl_FragCoord.xy + fract(t) * 13.0) - 0.5) * 0.040;
    col += grain;
    col *= 0.95 + 0.05 * sandFbm;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
