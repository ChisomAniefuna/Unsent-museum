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

vec2 hash22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
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
        freq *= 2.02;
        amp *= 0.5;
    }
    return v;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    float t = u_time * 0.08;

    // Per-composition variation, fully gated by u_unique.
    float sd = u_seed * u_unique;
    float pal = hash11(sd + 7.31) * u_unique;          // palette drift
    float dir = mix(1.0, sign(hash11(sd + 2.17) - 0.5), u_unique); // travel/warp direction
    float ph = sd * 6.2831;                              // phase offset

    // --- Domain-warped grieving haze (flowing/warping background) ---
    vec2 wp = uv * 1.35;
    wp.x += 0.20 * dir * sin(t * 0.7 + ph);
    vec2 warp;
    warp.x = fbm(wp + vec2(0.0, t * 1.1) + ph);
    warp.y = fbm(wp + vec2(5.2, -t * 0.6) + 2.3);
    float haze = fbm(wp + 1.6 * warp + vec2(t * 0.3 * dir, t * 0.9));
    haze = pow(clamp(haze, 0.0, 1.0), 1.4);

    // A second slow layer gives the haze grieving depth.
    float deep = fbm(uv * 0.7 + vec2(-t * 0.25, t * 0.5) + 3.7 + ph);

    // --- Palette ---
    vec3 offBlack = vec3(0.035, 0.030, 0.045);
    vec3 dirtyPurple = vec3(0.290, 0.239, 0.369); // #4a3d5e
    vec3 greyAsh = vec3(0.478, 0.478, 0.478);     // #7a7a7a
    vec3 ember = vec3(1.0, 0.52, 0.20);

    // Palette shift: nudge the purple hue/balance when seeded.
    dirtyPurple = mix(dirtyPurple, dirtyPurple.zxy, 0.35 * pal);

    // Base: deep off-black floor lifting into dirty purple haze.
    vec3 col = offBlack;
    col = mix(col, dirtyPurple, haze * 0.85);
    col += dirtyPurple * deep * 0.22;

    // Cold ash-grey veil washing through the mid-tones.
    float veil = smoothstep(0.35, 0.85, haze) * (0.45 + 0.55 * deep);
    col = mix(col, greyAsh, veil * 0.40);

    // Subtle vertical mourning gradient (heavier below, thin light above).
    float vgrad = smoothstep(-1.1, 1.2, uv.y);
    col *= mix(0.78, 1.12, vgrad);

    // --- Drifting ash particles rising upward through the haze ---
    float ash = 0.0;
    for(float i = 0.0; i < 5.0; i++){
        // Each layer of ash drifts upward at its own slow pace.
        float fi = i + 1.0;
        float scl = 7.0 + i * 4.5;
        float rise = t * (0.55 + i * 0.18);
        vec2 gp = uv * scl;
        // Lateral warp so particles weave through the warping haze.
        gp.x += 0.9 * dir * sin(uv.y * (1.5 + i) + t * (0.8 + i * 0.2) + ph);
        gp.y += rise * scl * 0.18;

        vec2 cell = floor(gp);
        vec2 f = fract(gp) - 0.5;
        vec2 rnd = hash22(cell + fi * 19.7 + sd * 3.0);
        // Position jitter inside the cell.
        vec2 off = (rnd - 0.5) * 0.7;
        float d = length(f - off);

        // Lifecycle: fade in and out (birth -> drift -> dissolve).
        float life = fract(rnd.x * 4.0 + t * (0.5 + i * 0.12) + rnd.y);
        float fade = sin(life * 3.14159);
        float size = 0.030 + 0.045 * rnd.y;
        float spark = smoothstep(size, 0.0, d) * fade;
        ash += spark * (0.5 + 0.5 * rnd.x);
    }
    ash = clamp(ash, 0.0, 1.0);
    // Ash reads as pale grey, slightly warmed by surrounding haze.
    vec3 ashCol = mix(greyAsh, vec3(0.86, 0.84, 0.82), 0.5);
    col = mix(col, ashCol, ash * 0.55);

    // --- Flickering embers (sparse, bright, high contrast) ---
    float emb = 0.0;
    for(float j = 0.0; j < 4.0; j++){
        float fj = j + 1.0;
        float scl = 3.0 + j * 2.0;
        float rise = t * (0.30 + j * 0.10);
        vec2 gp = uv * scl;
        gp.x += 0.6 * dir * cos(uv.y * (1.2 + j) - t * 0.5 + ph);
        gp.y += rise * scl * 0.20;

        vec2 cell = floor(gp);
        vec2 f = fract(gp) - 0.5;
        vec2 rnd = hash22(cell + fj * 41.3 + sd * 5.0 + 100.0);

        // Only a fraction of cells host an ember.
        float present = step(0.86, rnd.x);
        vec2 off = (hash22(cell + 7.0) - 0.5) * 0.6;
        float d = length(f - off);

        // Flicker: fast shimmer modulated by a slow lifecycle.
        float flick = 0.5 + 0.5 * sin(t * (9.0 + 12.0 * rnd.y) + rnd.x * 30.0);
        float life = sin(fract(rnd.y * 5.0 + t * (0.4 + j * 0.1)) * 3.14159);
        float core = smoothstep(0.045, 0.0, d);
        float glow = smoothstep(0.22, 0.0, d) * 0.35;
        emb += present * (core + glow) * flick * life;
    }
    emb = clamp(emb, 0.0, 1.6);

    // Embers burn brightest where the haze is denser (settling in the murk).
    vec3 emberHot = mix(ember, vec3(1.0, 0.86, 0.55), 0.4);
    col += emberHot * emb * (0.55 + 0.45 * haze);
    // Tiny ember bloom into the purple.
    col += ember * pow(emb, 2.0) * 0.25;

    // --- Faint warm undertone from a distant, unseen fire below ---
    float floorGlow = smoothstep(0.9, -0.4, uv.y) * (0.5 + 0.5 * deep);
    col += ember * floorGlow * 0.06;

    // --- Grain: the dust of memory ---
    float grain = hash21(gl_FragCoord.xy + fract(u_time) * 13.0) - 0.5;
    col += grain * 0.035;

    // --- Vignette to draw the eye into the grieving center ---
    float vig = 1.0 - 0.55 * dot(uv * 0.62, uv * 0.62);
    col *= clamp(vig, 0.0, 1.0);

    // Gentle contrast lift for premium value range.
    col = pow(clamp(col, 0.0, 1.0), vec3(0.92));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
