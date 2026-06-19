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
    // canonical undertow turns one way; seed may reverse it and re-orient.
    float dir = mix(1.0, sign(hash11(seed + 2.1) - 0.5), u_unique);
    float ang0 = (hash11(seed + 4.7) - 0.5) * 6.2831 * u_unique;
    float ca = cos(ang0);
    float sa = sin(ang0);
    mat2 srot = mat2(ca, -sa, sa, ca);
    float palShift = (hash11(seed + 11.3) - 0.5) * 0.5 * u_unique;

    // ---- slow global lifecycle: the undertow deepens, then eases, forever ----
    float t = u_time * 0.224;
    float breath = 0.5 + 0.5 * sin(u_time * 0.075);   // 0 calm .. 1 deep pull
    breath = smoothstep(0.0, 1.0, breath);

    // ---- flowing / warping background (domain-warped current) ----
    vec2 wuv = srot * uv;
    vec2 warp;
    warp.x = fbm(wuv * 1.2 + vec2(t * 0.30, -t * 0.20));
    warp.y = fbm(wuv * 1.2 + vec2(-t * 0.24, t * 0.27) + 4.7);
    vec2 fuv = wuv + (warp - 0.5) * 0.42;

    // ---- spiral coordinate frame: angle bent by an inward swirl ----
    float r = length(fuv) + 1e-4;
    float a = atan(fuv.y, fuv.x);
    // swirl strength grows toward the eye but is clamped so it never aliases.
    float pull = 1.0 / (r * r * 5.0 + 0.55);
    pull = min(pull, 2.6);
    float swirl = dir * (pull * 1.15 + t * 0.85 * (0.7 + 0.6 * breath));
    float sa2 = a + swirl;

    // logarithmic spiral arms drawn in the bent frame -> a vortex of bands
    float lr = log(r + 0.05);
    float spiralPhase = lr * 4.5 - dir * sa2 * 1.0 + dir * t * 1.2;
    float arms = 0.5 + 0.5 * sin(spiralPhase);
    arms = pow(arms, 1.4);   // sharpen the dark lanes between arms

    // ---- DRIFT / TRAVEL: a phase that pours dots down the throat ----
    // higher = closer to being swallowed; born at the rim, dies at the eye.
    float life = fract(lr * 0.9 - dir * t * 0.9);
    // born bright at the rim, stretched & dimmed as it spirals inward
    float bornFade = smoothstep(0.0, 0.18, life) * smoothstep(1.0, 0.62, life);

    // ---- HALFTONE DOT FIELD in the spiral frame (stable per-cell sampling) ----
    // polar grid: columns along the arms, rows along the spiral radius.
    vec2 polar = vec2(sa2, lr);
    float cellsA = 14.0;   // dots around
    float cellsR = 9.0;    // dots along radius
    vec2 g = polar * vec2(cellsA / 6.2831, cellsR);
    g.x += dir * t * 1.4;             // dots march around the swirl
    g.y -= dir * t * 1.1;             // and slide down toward the eye

    vec2 gid = floor(g);
    vec2 gf  = fract(g) - 0.5;
    float jit = hash21(gid + floor(seed * 7.0) * u_unique + 3.0);

    // per-cell undertow value: brightest on the arm crests, sucked dark inward
    float cellArm = 0.5 + 0.5 * sin(spiralPhase);
    float intake = smoothstep(0.06, 0.55, r);          // the eye eats the dots
    float ringFade = intake * smoothstep(2.0, 0.85, r); // outer rim falloff
    float ctide = mix(0.10, 1.0, cellArm) * ringFade;
    ctide *= bornFade;

    // dot radius swells on the crest, shrinks to nothing at the eye (swallowed)
    float baseR = 0.10 + 0.40 * ctide;
    baseR *= mix(1.0, 0.80 + 0.25 * jit, u_unique);
    baseR *= mix(0.85, 1.15, breath);

    // stretch the dot tangentially as it is dragged -> smeared, falling marks
    float stretch = 1.0 + (1.0 - intake) * 1.6;        // strongest near the eye
    vec2 dp = gf;
    dp.x /= stretch;
    float dotDist = length(dp);
    float aa = 0.07 + (1.0 - r) * 0.05;
    aa = clamp(aa, 0.04, 0.16);
    float dotMask = smoothstep(baseR + aa, baseR - aa, dotDist);

    // a ripple of brightness rolling down the dot field
    float rip = 0.5 + 0.5 * sin(lr * 10.0 - dir * u_time * 1.6 + jit * 6.2831);
    float dotBright = mix(0.45, 1.0, ctide) * (0.6 + 0.4 * rip);

    // ---- COLOUR: deep drowned-teal shadow -> cold bright crest (WIDE range) ----
    vec3 deepest = vec3(0.006, 0.022, 0.040);
    vec3 deep    = vec3(0.018, 0.060, 0.098);
    vec3 dotLow  = vec3(0.060, 0.300, 0.520);
    vec3 dotHigh = vec3(0.720, 0.910, 0.985);
    dotHigh = clamp(dotHigh + vec3(palShift * 0.16, palShift * 0.06, -palShift * 0.10), 0.0, 1.0);
    dotLow  = clamp(dotLow  + vec3(palShift * 0.10, palShift * 0.04, -palShift * 0.06), 0.0, 1.0);

    // background: dark current, arms faintly luminous, eye sinking to black
    float bgFlow = fbm(fuv * 1.6 + vec2(t * 0.4, -t * 0.25));
    vec3 col = mix(deepest, deep, bgFlow * 0.7 + arms * 0.25);
    col = mix(col, deepest, smoothstep(0.42, 0.0, r));   // the eye is darkest
    col += dotLow * arms * 0.10 * ringFade;              // ghost of the spiral

    // lay the halftone dots
    vec3 dotCol = mix(dotLow, dotHigh, clamp(dotBright, 0.0, 1.0));
    float core = smoothstep(baseR, 0.0, dotDist);
    dotCol += vec3(0.14, 0.20, 0.24) * core * ctide;     // crisp specular core
    col = mix(col, dotCol, clamp(dotMask * ringFade, 0.0, 1.0));

    // a thin cold gleam circling the rim of the eye where dots vanish
    float rim = exp(-abs(r - 0.40) * 14.0);
    float rimRoll = 0.5 + 0.5 * sin(sa2 * 3.0 - dir * u_time * 1.2);
    col += vec3(0.10, 0.26, 0.34) * rim * (0.4 + 0.6 * rimRoll) * (0.6 + 0.4 * breath);

    // fine residual stipple in the deep water (secondary halftone grain)
    vec2 ff = fract(polar * vec2(36.0, 30.0)) - 0.5;
    float fdot = smoothstep(0.18, 0.05, length(ff));
    float fineTide = (0.5 + 0.5 * sin(lr * 9.0 - dir * u_time * 1.0)) * ringFade;
    col += dotLow * 0.18 * fdot * fineTide * (1.0 - dotMask);

    // ---- finishing: vignette, grain, contrast lift ----
    float vig = 1.0 - 0.62 * dot(uv, uv) * 0.5;
    col *= clamp(vig, 0.30, 1.0);

    float grain = hash21(gl_FragCoord.xy + fract(u_time) * 60.0);
    col += (grain - 0.5) * 0.022;

    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.12);            // a touch of saturation
    col = (col - 0.5) * 1.16 + 0.5;             // push contrast
    col = pow(clamp(col, 0.0, 1.0), vec3(0.90));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
