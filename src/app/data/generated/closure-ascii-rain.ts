import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "closure-ascii-rain",
  name: "ASCII Settle",
  description: "A downpour of luminous ASCII glyphs slows from a frantic rain into a quiet, settled grid as a slow warping mist drifts beneath, noise resolving into peace.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float p){
    p = fract(p*0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y)*p3.z);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0 - 2.0*f);
    float a = hash21(i + vec2(0.0,0.0));
    float b = hash21(i + vec2(1.0,0.0));
    float c = hash21(i + vec2(0.0,1.0));
    float d = hash21(i + vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.55;
    float f = 1.0;
    for(float i=0.0;i<4.0;i++){
        v += amp*vnoise(p*f);
        f *= 2.03;
        amp *= 0.5;
    }
    return v;
}

// Small procedural 5x5 ASCII-like glyph. Returns coverage 0..1.
// Mirrored horizontally so it reads as a legible character, not noise.
float glyph(vec2 g, float id){
    if(g.x < 0.0 || g.x > 1.0 || g.y < 0.0 || g.y > 1.0){ return 0.0; }
    vec2 cell = floor(g*5.0);
    float mx = cell.x;
    if(mx > 2.0){ mx = 4.0 - mx; }
    float bits = hash21(vec2(id*7.13 + mx*2.07, id*3.71 + cell.y*1.31));
    float on = step(0.46, bits);
    // a vertical spine is often lit so the shape stays character-like
    float spine = 0.0;
    if(abs(cell.x - 2.0) < 0.5){ spine = step(0.30, hash11(id*1.91 + cell.y)); }
    on = max(on, spine);
    vec2 fc = fract(g*5.0) - 0.5;
    float core = smoothstep(0.55, 0.16, max(abs(fc.x), abs(fc.y)));
    return on*core;
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;

    // --- gating: all seed variation rides on u_unique ---
    float seed   = u_seed*u_unique;
    float pShift = hash11(seed*1.37 + 0.5)*u_unique;
    float dir    = mix(1.0, sign(hash11(seed*2.3 + 0.7) - 0.5), u_unique);
    if(dir == 0.0){ dir = 1.0; }
    float hueShift = (hash11(seed*4.1 + 0.2) - 0.5)*u_unique;
    float arrange  = 23.0*hash11(seed*5.7 + 1.0);

    // gentle warp of the whole field, seed-tilted
    float angle = 0.10*sin(seed*4.0);
    float ca = cos(angle), sa = sin(angle);
    mat2 rot = mat2(ca, -sa, sa, ca);

    // --- lifecycle clock: rain is loud, then slows and settles ---
    // settle goes 0 (chaotic downpour) -> 1 (quiet, locked grid)
    float settle = 1.0 - exp(-u_time*0.045);
    float calm   = smoothstep(0.0, 14.0, u_time);
    float fall   = mix(1.0, 0.7, settle);   // slows but keeps a clear living drift

    float t = u_time*0.196;

    // --- flowing warped mist background (slow domain warp) ---
    vec2 wp = rot*uv*1.25;
    vec2 warp;
    warp.x = fbm(wp + vec2(0.0, t*0.55) + seed*3.1);
    warp.y = fbm(wp + vec2(5.2, -t*0.45) + dir*1.7 + seed*1.7);
    float field  = fbm(wp*1.4 + warp*1.7 + vec2(t*0.30, seed*2.0));
    float field2 = fbm(wp*0.75 - warp*1.0 + vec2(-t*0.40, seed));
    // the mist itself calms: contrast eases toward mid as peace arrives
    field = mix(field, 0.5 + 0.34*(field - 0.5), 0.55*calm);

    // --- duotone palette: deep teal night -> soft mint -> pale sky white ---
    vec3 nearBlack = vec3(0.010, 0.024, 0.030);
    vec3 deep      = vec3(0.020, 0.082, 0.100);
    vec3 mint      = vec3(0.46, 1.0, 0.80);
    vec3 sky       = vec3(0.74, 0.92, 1.0);
    mint += vec3(hueShift*0.12, hueShift*0.02, -hueShift*0.10);

    vec3 col = nearBlack;
    col = mix(col, deep, smoothstep(0.34, 0.95, field)*0.70);
    col += deep*0.40*smoothstep(0.45, 1.0, field2);
    // faint cool glow pooling in the brighter mist
    col += vec3(0.04, 0.10, 0.12)*pow(max(field - 0.55, 0.0)*2.2, 2.0);

    float vign = smoothstep(1.75, 0.15, length(uv*vec2(0.92, 1.0)));
    col *= mix(0.28, 1.0, vign);

    // --- ASCII glyph columns of rain ---
    float aspect = u_resolution.x/u_resolution.y;

    float colsAcross = 28.0;
    float gx    = uv.x*0.5*colsAcross + arrange;
    float colId = floor(gx);
    float fx    = fract(gx);

    float colRand  = hash11(colId*1.13 + 11.0 + seed*5.0);
    float colRand2 = hash11(colId*2.57 + 3.0  + seed*2.1);

    // each column falls at its own pace; everything decelerates with settle
    float speed   = mix(0.55, 1.25, colRand);
    float scrollY = uv.y*dir + u_time*fall*0.62*speed + pShift*6.2831;
    // mist nudges the stream so it breathes
    scrollY += 0.10*field*(1.0 - settle);

    float rows = 15.0;
    float gy    = scrollY*rows*0.5;
    float rowId = floor(gy);
    float fy    = fract(gy);

    // side-to-side jitter that quiets as the rain settles
    float jitter = sin(u_time*1.6 + colId*1.7 + colRand*6.28)*0.06*(1.0 - settle);
    fx = fract(gx + jitter);

    // glyph identity recycles per cell; flickers fast early, locks when calm
    float flickClock = floor(u_time*mix(6.0, 0.0, settle));
    float charSeed   = hash21(vec2(colId*0.91 + flickClock*0.013, rowId*1.7));
    float gid        = floor(charSeed*64.0);

    vec2 inCell = vec2(fx, fy);
    vec2 pad    = vec2(0.18, 0.12);
    vec2 gcoord = (inCell - pad)/(1.0 - 2.0*pad);
    float gShape = glyph(gcoord, gid);

    // a bright "head" of the rain streak travels down each column,
    // trailing a decaying tail, this is the falling motion
    float headPhase = fract(u_time*0.20*speed*fall + colRand + colRand2 + pShift);
    float headRow   = floor(headPhase*rows*4.0 - rows*2.0);
    float distHead  = (headRow - rowId)*dir;          // ahead of head -> positive
    float trail     = exp(-max(distHead, 0.0)*0.55);
    trail *= step(-0.5, distHead);

    // as peace arrives, glyphs stop streaking and just rest, softly lit
    float restLit = 0.34 + 0.52*settle*hash21(vec2(colId, rowId) + 0.7);
    float lum     = gShape*mix(0.16 + trail*1.05, restLit, settle);

    // sparse columns so the field stays legible
    float colMask = step(hash11(colId*3.7 + 7.0 + seed), 0.86);
    lum *= colMask;

    vec3 glyphCol = mix(mint, sky, smoothstep(0.40, 1.0, trail*(1.0 - settle) + settle*0.55));
    col += glyphCol*lum*(0.98 + 0.5*vign);

    // bright bloom at the streak head while the rain is still loud
    float headGlow = exp(-abs(distHead)*0.85)*gShape*(1.0 - settle);
    col += sky*headGlow*0.60*colMask;

    // --- a few free falling sparks that slow to a drift and settle ---
    float sparkN = 0.0;
    for(float i=0.0;i<3.0;i++){
        float fi = i + 1.0;
        float sx = (hash11(fi*12.7 + seed*3.0)*2.0 - 1.0)*aspect;
        float baseY = hash11(fi*5.3 + seed);
        // fall speed eases off as the room quiets
        float sy = fract(baseY - u_time*0.05*(0.6 + fi*0.2)*fall*dir)*2.4 - 1.2;
        float drift = sin(u_time*0.4 + fi*2.0)*0.12*(1.0 - settle);
        vec2 sc = uv - vec2(sx + drift, sy*dir);
        float d = length(sc*vec2(1.0, 0.7));
        sparkN += exp(-d*22.0);
    }
    col += mint*sparkN*0.55;
    col += sky*sparkN*sparkN*0.40;

    // a low resting line of calm light gathering at the bottom, the settle
    float restLine = smoothstep(-1.05, -0.4, -uv.y*dir)*settle;
    col += deep*1.6*restLine*0.30;
    col += mint*0.06*restLine*smoothstep(0.4, 1.0, field);

    // --- fine grain + contrast lift for a wide value range ---
    float grain = (hash21(gl_FragCoord.xy + fract(u_time)*vec2(13.1, 7.7))*2.0 - 1.0)*0.020;
    col += grain;

    col *= 1.05;
    col = pow(col, vec3(0.90));

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
