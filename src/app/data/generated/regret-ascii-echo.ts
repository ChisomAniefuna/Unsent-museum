import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-ascii-echo",
  name: "ASCII Echo",
  description: "Rings of luminous ASCII glyphs ripple outward from a quiet source, each echo dimmer than the last yet never quite vanishing, faint character-ghosts lingering on a slow, warping indigo dark, the residue of words you cannot take back.",
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
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.55;
    float freq = 1.0;
    for(float i = 0.0; i < 4.0; i++){
        v += amp * vnoise(p * freq);
        freq *= 2.03;
        amp *= 0.5;
    }
    return v;
}

// Mirrored, structured 5x5 ASCII-like glyph. Coverage 0..1.
// Horizontal mirroring keeps it reading as a legible character, not noise.
float glyph(vec2 q, float id){
    if(q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0){ return 0.0; }
    vec2 cell = floor(q * 5.0);
    float mx = cell.x;
    if(mx > 2.0){ mx = 4.0 - mx; }
    float bits = hash21(vec2(id * 7.13 + mx * 2.07, id * 3.71 + cell.y * 1.31));
    float dens = 0.40 + 0.14 * hash11(id * 4.3 + 1.0);
    float on = step(1.0 - dens, bits);
    // ensure a connected spine so it never reads as empty noise
    if(cell.y == 2.0){ on = max(on, step(mx, 1.0)); }
    vec2 sub = fract(q * 5.0) - 0.5;
    float dot2 = smoothstep(0.55, 0.20, abs(sub.x)) * smoothstep(0.55, 0.20, abs(sub.y));
    return on * dot2;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    float t = u_time * 0.42;

    // ---- seed-gated variation (u_unique==0 -> fixed canonical look) ----
    float sd  = u_seed * u_unique;
    float ph  = sd * 6.2831853;
    float dir = mix(1.0, sign(hash11(sd + 2.17) - 0.5), u_unique);
    float pal = hash11(sd + 7.31) * u_unique;
    float baseAngle = (hash11(sd + 3.91) - 0.5) * 0.7 * u_unique;

    vec2 src = vec2(0.0, 0.0);
    src.x += (hash11(sd + 5.13) - 0.5) * 0.55 * u_unique;
    src.y += (hash11(sd + 9.47) - 0.5) * 0.35 * u_unique;

    // rotated frame for the background flow only
    vec2 rc = vec2(cos(baseAngle), sin(baseAngle));
    vec2 p  = vec2(uv.x * rc.x - uv.y * rc.y, uv.x * rc.y + uv.y * rc.x);

    // ---- slow, warping background (domain-warped fbm) ----
    vec2 wp = p * 1.25;
    vec2 warp;
    warp.x = fbm(wp + vec2(0.0, t * 0.9) + ph);
    warp.y = fbm(wp + vec2(5.2, -t * 0.55) + 2.3);
    float haze = fbm(wp + 1.5 * (warp - 0.5) + vec2(t * 0.28 * dir, t * 0.75));
    haze = pow(clamp(haze, 0.0, 1.0), 1.6);
    float deep = fbm(p * 0.65 + vec2(-t * 0.22, t * 0.42) + 3.7 + ph);

    // ---- palette (duotone indigo, wide value range) ----
    vec3 nearBlack = vec3(0.010, 0.016, 0.030);
    vec3 floorBlue = vec3(0.030, 0.058, 0.105);
    vec3 midBlue   = vec3(0.180, 0.498, 0.745);
    vec3 paleBlue  = vec3(0.840, 0.930, 1.000);
    midBlue = mix(midBlue, midBlue.zyx, 0.22 * pal);

    vec3 col = nearBlack;
    col = mix(col, floorBlue, haze * 0.65);
    col += floorBlue * deep * 0.18;

    float vgrad = smoothstep(-1.3, 1.3, p.y);
    col *= mix(0.78, 1.10, vgrad);

    // ---- rippling glyph echoes (travel outward, never fully fade) ----
    vec2 rp = uv - src;
    float r = length(rp);
    float ang = atan(rp.y, rp.x);

    float echo   = 0.0; // faint ambient ring wash
    float core   = 0.0; // glyph body
    float bright = 0.0; // glyph highlight
    float resid  = 0.0; // never-fading residue floor

    float speed = 1.0;

    for(float i = 0.0; i < 6.0; i++){
        float phase = fract(t * speed + i / 6.0);
        float radius = phase * 2.25;
        float ringWidth = 0.15 + 0.055 * phase;

        float band = smoothstep(ringWidth, 0.0, abs(r - radius));

        // lifecycle fade: dim with age, but floor it so echoes never vanish
        float age = 1.0 - phase;
        float ageFade = 0.18 + 0.82 * age * age;
        band *= ageFade;

        // angular glyph cells around the ring
        float circ = 6.2831853 * max(radius, 0.05);
        float cells = max(8.0, floor(circ * 3.2));
        float aCell = (ang / 6.2831853 + 0.5) * cells;
        aCell += dir * t * 1.4 + i * 1.7 + ph;
        float ai = floor(aCell);
        float af = fract(aCell);

        float gid = hash11(ai * 0.123 + i * 7.1 + floor(t * speed + i) * 3.7 + sd * 13.0);
        gid = floor(gid * 90.0);

        float radialCell = (r - radius) / ringWidth * 0.5 + 0.5;
        float g = glyph(vec2(af, radialCell), gid);

        float flick = 0.72 + 0.28 * sin(t * 3.0 + ai * 1.3 + i * 2.0);

        echo   += band * (0.09 + 0.05 * flick);
        core   += g * band * flick;
        bright += g * band * band * flick;
    }

    // persistent residue: faint standing rings that decay with radius but linger
    float residRings = 0.5 + 0.5 * sin(r * 9.0 - t * speed * 6.2831853 + ph);
    resid = residRings * residRings * smoothstep(2.4, 0.15, r) * 0.06;

    // ---- quiet resting field of dim glyphs (the unsaid, settled) ----
    vec2 gq = p * 9.0;
    gq.x += dir * sin(p.y * 2.0 + t * 0.5 + ph) * 0.4;
    vec2 gcell = floor(gq);
    vec2 gf = fract(gq);
    float ggid = floor(hash21(gcell + floor(sd * 5.0)) * 90.0);
    float gg = glyph(gf, ggid);
    float gpresent = step(0.84, hash21(gcell * 1.31 + 4.0));
    float gtwinkle = 0.5 + 0.5 * sin(t * 1.2 + hash21(gcell) * 30.0);
    float gdist = smoothstep(1.5, 0.2, r);
    float restGrid = gg * gpresent * gtwinkle * (0.08 + 0.10 * gdist);

    // ---- source glow (the origin of regret) ----
    float srcGlow = smoothstep(0.55, 0.0, r) * (0.18 + 0.10 * sin(t * 1.6 + ph));

    // ---- composite ----
    vec3 echoCol = mix(midBlue, paleBlue, 0.30);
    col += echoCol * echo * 0.55;
    col += floorBlue * (restGrid + resid) * 1.5;

    col = mix(col, midBlue, clamp(core * 1.05, 0.0, 1.0));
    col += paleBlue * clamp(bright, 0.0, 1.0) * 1.25;
    col += paleBlue * pow(clamp(bright, 0.0, 1.0), 2.0) * 0.7;

    col += midBlue * srcGlow * 0.5;

    // ---- grain, vignette, contrast lift ----
    float grain = hash21(gl_FragCoord.xy + fract(u_time) * 17.0) - 0.5;
    col += grain * 0.025;

    float vig = 1.0 - 0.55 * dot(uv * 0.66, uv * 0.66);
    col *= clamp(vig, 0.0, 1.0);

    col = pow(clamp(col, 0.0, 1.0), vec3(0.85));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
