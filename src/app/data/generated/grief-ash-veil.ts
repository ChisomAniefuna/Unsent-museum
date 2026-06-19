import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-ash-veil",
  name: "Ash Veil",
  description: "Sheets of drifting ash and faint, dying embers rise through a slow, grieving haze.",
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

    float t = u_time * 0.112;

    // seed-gated variation (u_unique==0.0 => one fixed canonical look)
    float sd  = u_seed * u_unique;
    float pal = hash11(sd + 7.31) * u_unique;
    float dir = mix(1.0, sign(hash11(sd + 2.17) - 0.5), u_unique);
    float ph  = sd * 6.2831;

    // slow domain-warped grieving haze
    vec2 wp = uv * 1.30;
    wp.x += 0.18 * dir * sin(t * 0.55 + ph);
    vec2 warp;
    warp.x = fbm(wp + vec2(0.0, t * 0.95) + ph);
    warp.y = fbm(wp + vec2(5.2, -t * 0.55) + 2.3);
    float haze = fbm(wp + 1.7 * warp + vec2(t * 0.28 * dir, t * 0.80));
    haze = pow(clamp(haze, 0.0, 1.0), 1.5);

    float deep = fbm(uv * 0.65 + vec2(-t * 0.22, t * 0.46) + 3.7 + ph);

    // drifting translucent veil sheets (the body of the motif)
    float veilSheets = 0.0;
    for(float k = 0.0; k < 3.0; k++){
        float kf = k + 1.0;
        vec2 vp = uv * (0.9 + k * 0.55);
        vp.x += dir * (0.6 + k * 0.3) * sin(uv.y * (0.8 + k * 0.4) + t * (0.4 + k * 0.15) + ph + kf);
        vp.y -= t * (0.18 + k * 0.10);
        float sheet = fbm(vp + warp * 0.8 + kf * 13.0);
        sheet = smoothstep(0.42, 0.92, sheet);
        veilSheets += sheet * (0.55 - k * 0.12);
    }
    veilSheets = clamp(veilSheets, 0.0, 1.0);

    // palette: deep void -> dirty purple -> cold ash grey, with ember warmth
    vec3 offBlack    = vec3(0.016, 0.020, 0.018);
    vec3 dirtyPurple = vec3(0.20, 0.25, 0.22);
    vec3 greyAsh     = vec3(0.48, 0.50, 0.46);
    vec3 ember       = vec3(1.0, 0.50, 0.18);

    dirtyPurple = mix(dirtyPurple, dirtyPurple.zxy, 0.35 * pal);

    vec3 col = offBlack;
    col = mix(col, dirtyPurple, haze * 0.90);
    col += dirtyPurple * deep * 0.20;

    float veil = smoothstep(0.30, 0.85, haze) * (0.40 + 0.60 * deep);
    col = mix(col, greyAsh * 0.85, veil * 0.38);
    col = mix(col, greyAsh, veilSheets * 0.55);

    // vertical light gradient: brighter aloft, heavier below
    float vgrad = smoothstep(-1.2, 1.3, uv.y);
    col *= mix(0.62, 1.18, vgrad);

    // drifting ash flakes: tumble, rise, and fade out (lifecycle)
    float ash = 0.0;
    for(float i = 0.0; i < 5.0; i++){
        float fi  = i + 1.0;
        float scl = 7.0 + i * 4.5;
        float rise = t * (0.55 + i * 0.18);
        vec2 gp = uv * scl;
        gp.x += 0.9 * dir * sin(uv.y * (1.5 + i) + t * (0.8 + i * 0.2) + ph);
        gp.y += rise * scl * 0.18;

        vec2 cell = floor(gp);
        vec2 f    = fract(gp) - 0.5;
        vec2 rnd  = hash22(cell + fi * 19.7 + sd * 3.0);
        vec2 off  = (rnd - 0.5) * 0.7;
        float d   = length(f - off);

        float life = fract(rnd.x * 4.0 + t * (0.5 + i * 0.12) + rnd.y);
        float fade = sin(life * 3.14159);
        float size = 0.028 + 0.042 * rnd.y;
        float spark = smoothstep(size, 0.0, d) * fade;
        ash += spark * (0.5 + 0.5 * rnd.x);
    }
    ash = clamp(ash, 0.0, 1.0);
    vec3 ashCol = mix(greyAsh, vec3(0.92, 0.90, 0.88), 0.55);
    col = mix(col, ashCol, ash * 0.62);

    // faint embers: sparse, flickering, rising, then dying (lifecycle)
    float emb = 0.0;
    for(float j = 0.0; j < 4.0; j++){
        float fj  = j + 1.0;
        float scl = 3.0 + j * 2.0;
        float rise = t * (0.30 + j * 0.10);
        vec2 gp = uv * scl;
        gp.x += 0.6 * dir * cos(uv.y * (1.2 + j) - t * 0.5 + ph);
        gp.y += rise * scl * 0.20;

        vec2 cell = floor(gp);
        vec2 f    = fract(gp) - 0.5;
        vec2 rnd  = hash22(cell + fj * 41.3 + sd * 5.0 + 100.0);

        float present = step(0.86, rnd.x);
        vec2 off = (hash22(cell + 7.0) - 0.5) * 0.6;
        float d  = length(f - off);

        float flick = 0.5 + 0.5 * sin(t * (9.0 + 12.0 * rnd.y) + rnd.x * 30.0);
        float life  = sin(fract(rnd.y * 5.0 + t * (0.4 + j * 0.1)) * 3.14159);
        float core  = smoothstep(0.045, 0.0, d);
        float glow  = smoothstep(0.22, 0.0, d) * 0.35;
        emb += present * (core + glow) * flick * life;
    }
    emb = clamp(emb, 0.0, 1.6);

    vec3 emberHot = mix(ember, vec3(1.0, 0.85, 0.52), 0.4);
    col += emberHot * emb * (0.60 + 0.40 * haze);
    col += ember * pow(emb, 2.0) * 0.30;

    // faint warm glow welling up from below, where ash settles
    float floorGlow = smoothstep(0.9, -0.5, uv.y) * (0.5 + 0.5 * deep);
    col += ember * floorGlow * 0.05;

    // grain, vignette, and a contrast curve for a wide value range
    float grain = hash21(gl_FragCoord.xy + fract(u_time) * 13.0) - 0.5;
    col += grain * 0.030;

    float vig = 1.0 - 0.62 * dot(uv * 0.64, uv * 0.64);
    col *= clamp(vig, 0.0, 1.0);

    col = pow(clamp(col, 0.0, 1.0), vec3(0.88));
    col = (col - 0.5) * 1.12 + 0.5;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`,
};
export default def;
