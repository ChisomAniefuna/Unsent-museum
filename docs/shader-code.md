# Bundled Shader Code — all 25 new shaders

Concatenated verbatim from the source files. Each per-room shader is a
standalone module under `src/app/data/generated/<id>.ts` (default-exports a
`ShaderDef`). The Love set and Liquid Aurora live in `src/app/data/shaders.ts`.
Pair with `shader-prompts.md` (the prompts that produced these) and
`AI-PROMPT.md` (how the whole system fits together).

---

## Per-room generated shaders (src/app/data/generated/)

### closure-ascii-rain.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "closure-ascii-rain",
  name: "ASCII Settle",
  description: "A downpour of luminous ASCII glyphs slows from a frantic rain into a quiet, settled grid as a slow warping mist drifts beneath — noise resolving into peace.",
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
    // trailing a decaying tail — this is the falling motion
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

    // a low resting line of calm light gathering at the bottom — the settle
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
```

### closure-enso.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "closure-enso",
  name: "Ensō",
  description: "A single ink ensō circle brushes itself into being on flowing washi, then rests in quiet completion.",
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
  p *= p+33.33;
  p *= p+p;
  return fract(p);
}

float hash21(vec2 p){
  vec3 p3 = fract(vec3(p.xyx)*0.1031);
  p3 += dot(p3, p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}

float vnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash21(i+vec2(0.0,0.0));
  float b = hash21(i+vec2(1.0,0.0));
  float c = hash21(i+vec2(0.0,1.0));
  float d = hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0;
  float amp = 0.5;
  for(float i=0.0;i<5.0;i++){
    v += amp*vnoise(p);
    p = p*2.02 + vec2(11.3,7.7);
    amp *= 0.5;
  }
  return v;
}

mat2 rot(float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c,-s,s,c);
}

void main(){
  vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

  // ---- seed-gated variation (every term multiplied by u_unique) ----
  float seed      = u_seed*u_unique;
  float palShift  = 0.16*sin(seed*6.2831)*u_unique;
  float spin      = (hash11(seed+1.7)-0.5)*0.45*u_unique;
  float travelDir = mix(1.0, sign(hash11(seed+3.0)-0.5), u_unique);

  uv *= rot(spin);

  float t = u_time*0.154;

  // ---- flowing / warping washi-paper background ----
  vec2 wp = uv;
  float warp  = fbm(wp*1.4 + vec2(t*travelDir, -t*0.7));
  float warp2 = fbm(wp*2.6 - vec2(t*0.5, t*0.9*travelDir));
  vec2 flow = vec2(warp-0.5, warp2-0.5)*0.20;
  vec2 fuv = uv + flow;

  float clouds = fbm(fuv*1.9 + vec2(t*0.55*travelDir, t*0.3) + warp*1.4);
  clouds = pow(clamp(clouds,0.0,1.0), 1.7);

  // deep near-black ink ground -> faint cool paper bloom (wide value range)
  vec3 inkDeep = vec3(0.010,0.028,0.050);
  vec3 inkSoft = vec3(0.035,0.090,0.140);
  vec3 col = mix(inkDeep, inkSoft, clouds*0.85);

  // subtle paper-fiber texture
  float fiber = fbm(uv*vec2(3.0,38.0) + vec2(t*0.2,0.0));
  col += vec3(0.018,0.030,0.040)*fiber*0.5;

  // deep vignette to seat the circle in space
  float vign = 1.0 - dot(uv,uv)*0.16;
  col *= clamp(vign,0.0,1.0);

  // ---- ensō geometry ----
  float r   = length(uv);
  float ang = atan(uv.y, uv.x);

  // gentle breathing of the finished ring
  float breathe = 0.010*sin(u_time*0.45);
  float radius  = 0.60 + breathe;
  float baseW   = 0.056;

  // bristle / dry-brush texture along the stroke
  float texFlow  = u_time*0.30*travelDir;
  float bristle  = fbm(vec2(ang*3.8 + texFlow, r*9.0));
  float bristle2 = fbm(vec2(ang*9.0 - texFlow*1.3, r*4.0 + 2.0));
  float strokeWidth = baseW*(0.55 + 0.9*bristle);

  // stroke arc: starts top-ish, leaves the signature open gap
  float a0       = -1.9 + 0.30*(hash11(seed+5.0)-0.5)*u_unique;
  float startGap = 0.32 + 0.30*hash11(seed+7.0)*u_unique;
  float drawSpan = 6.2831853 - startGap;

  // ---- LIFECYCLE: draw -> hold(rest) -> dissolve -> reset ----
  float cyc   = fract(u_time*0.045);
  float drawP = smoothstep(0.0,0.42, cyc);            // 0..1 painting
  float draw  = smoothstep(0.0,1.0, drawP);
  float hold  = smoothstep(0.42,0.50, cyc);           // settled / whole
  float fade  = 1.0 - smoothstep(0.86,1.0, cyc);      // dissolve at cycle end
  float lifeFade = fade;

  float drawAng = a0 + draw*drawSpan;

  float rel = ang - a0;
  rel = mod(rel + 6.2831853, 6.2831853);
  float relEnd = drawAng - a0;

  float along    = clamp(rel/drawSpan, 0.0, 1.0);
  // pressure curve: thin start, full body, thin lifting tail
  float tipTaper = smoothstep(0.0,0.12,along)*(1.0-smoothstep(0.82,1.0,along));
  float wEff     = strokeWidth*(0.32 + 0.68*tipTaper);
  wEff = max(wEff, 0.004); // guard degenerate smoothstep edges

  float drawnMask = 1.0 - smoothstep(relEnd-0.05, relEnd+0.02, rel);

  // hand-shake of the brush
  float wobble  = 0.020*fbm(vec2(ang*2.0+seed, r*3.0 + t)) - 0.010;
  float ringDist= abs(r - radius - wobble + 0.018*sin(ang*3.0 + t*1.6));

  float stroke = 1.0 - smoothstep(0.0, wEff, ringDist);
  stroke *= drawnMask;

  // ragged dry-brush gaps (skips)
  float ragged = smoothstep(0.22,0.95,bristle2);
  stroke *= mix(0.45,1.0, ragged);

  float innerGlow = exp(-ringDist*ringDist*44.0)*drawnMask;
  float coreHi    = (1.0-smoothstep(0.0, wEff*0.42, ringDist))*drawnMask;

  // wet leading tip of the brush head while painting
  float headSharp = exp(-pow((rel-relEnd)*4.2,2.0))*(1.0-hold);
  float wetTip    = headSharp*innerGlow*1.5;

  // ---- ink palette (high contrast: near-black ground -> bright bone-white core) ----
  vec3 inkLo = vec3(0.30,0.62,0.66);
  vec3 inkHi = vec3(0.95,1.0,0.98);
  inkLo = mix(inkLo, inkLo.gbr, palShift);

  float strokeBright = clamp(stroke + coreHi*0.9 + wetTip, 0.0, 1.6);
  vec3  strokeCol    = mix(inkLo, inkHi, clamp(coreHi+wetTip*0.7,0.0,1.0));

  // apply ink, modulated by lifecycle fade
  col += strokeCol*strokeBright*lifeFade;
  col += inkLo*innerGlow*0.30*lifeFade;
  col += inkHi*wetTip*0.65*lifeFade;

  // pooled ink "start" blob where the brush first touched paper
  float startBlob = exp(-pow(rel*6.0,2.0)) * exp(-ringDist*ringDist*30.0);
  col += inkHi*startBlob*0.45*drawnMask*lifeFade;

  // ---- REST: a calm pulse once the circle is whole = completion ----
  float restPulse = (0.5+0.5*sin(u_time*0.35))*hold;
  col += inkLo*innerGlow*0.18*restPulse*lifeFade;

  // faint film grain
  float grain = (hash21(gl_FragCoord.xy + floor(u_time*24.0))-0.5)*0.030;
  col += grain;

  // tone map for punch and clean blacks
  col = col/(col+vec3(0.80))*1.90;

  gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}`,
};
export default def;
```

### closure-moon-gate.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "closure-moon-gate",
  name: "Moon Gate",
  description: "A circular moon gate draws its ring closed as the moon rises through it, mirrored in still jade water that ripples slowly into calm.",
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
`,
};
export default def;
```

### closure-tide-halftone.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "closure-tide-halftone",
  name: "Tide Halftone",
  description: "A halftone tide of dots rises, breaks into foam, then recedes — the field thinning to a wide, calm, settled stillness.",
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
`,
};
export default def;
```

### closure-zen-garden.ts
```ts
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
```

### grief-adinkra-owuo.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-adinkra-owuo",
  name: "Ladder of Death",
  description: "Owuo Atwedeɛ ladder stamps rise, fade, and dissolve to ash across a slow-warping mourning cloth.",
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
  vec2 sh = vec2(37.2, 17.7);
  for(float i = 0.0; i < 4.0; i++){
    v += amp * vnoise(p);
    p = p * 2.02 + sh;
    amp *= 0.5;
  }
  return v * 1.08;
}

float sdSeg(vec2 p, vec2 a, vec2 b, float r){
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float bar(float d, float soft){
  return 1.0 - smoothstep(0.0, soft, d);
}

// Owuo Atwedeɛ — the "ladder of death." Two rails, rungs, a peaked roof.
float ladderStamp(vec2 p, float rough){
  float thick = 0.050;
  float hh = 0.36;
  float soft = 0.020 + 0.018 * rough;
  float ink = 0.0;

  // rails
  float dl = sdSeg(p, vec2(-0.20, -hh), vec2(-0.20, hh), thick);
  float dr = sdSeg(p, vec2( 0.20, -hh), vec2( 0.20, hh), thick);
  ink = max(ink, bar(dl, soft));
  ink = max(ink, bar(dr, soft));

  // rungs (constant loop bound)
  for(float i = 0.0; i < 6.0; i++){
    float t = i / 5.0;
    float y = mix(-hh, hh, t);
    float rw = thick * (0.94 - 0.18 * sin(t * 3.14159265));
    float seg = sdSeg(p, vec2(-0.20, y), vec2(0.20, y), rw);
    ink = max(ink, bar(seg, soft));
  }

  // peaked roof — the apex everyone must climb toward
  vec2 ta = vec2(-0.20, hh);
  vec2 tb = vec2( 0.0, hh + 0.10);
  vec2 tc = vec2( 0.20, hh);
  float roof = min(sdSeg(p, ta, tb, thick * 0.85), sdSeg(p, tb, tc, thick * 0.85));
  ink = max(ink, bar(roof, soft));

  // small finial at the top — the rung beyond reach
  float cap = length(p - vec2(0.0, hh + 0.10)) - thick * 0.9;
  ink = max(ink, bar(cap, soft));

  return clamp(ink, 0.0, 1.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  // ---- seed-driven variation, fully gated by u_unique ----
  float seed   = u_seed * u_unique;
  float dirX   = mix(1.0, sign(hash11(seed + 4.7) - 0.5), u_unique);
  float dirY   = mix(1.0, sign(hash11(seed + 9.1) - 0.5), u_unique);
  float palShift = hash11(seed + 2.3) * u_unique;
  float rot    = (hash11(seed + 6.6) - 0.5) * 0.20 * u_unique;
  float phaseOff = hash11(seed + 1.9) * 6.2831 * u_unique;

  float t = u_time * 0.07;

  // gentle global rotation
  float ca = cos(rot);
  float sa = sin(rot);
  vec2 wuv = mat2(ca, -sa, sa, ca) * uv;

  // ---- flowing, warping background (mourning cloth) ----
  vec2 warp;
  warp.x = fbm(wuv * 1.25 + vec2(t * 0.6, -t * 0.35) + seed * 3.0);
  warp.y = fbm(wuv * 1.25 + vec2(-t * 0.45 + 8.0, t * 0.55) + seed * 3.0);
  vec2 flow = wuv + (warp - 0.5) * 0.55;

  float bgN  = fbm(flow * 2.1 + vec2(t * 0.35, -t * 0.28));
  float bgN2 = fbm(flow * 4.8 - vec2(t * 0.18, t * 0.22));

  vec3 deep        = vec3(0.018, 0.016, 0.032);
  vec3 charcoal    = vec3(0.068, 0.062, 0.096);
  vec3 dirtyPurple = vec3(0.250, 0.205, 0.318);

  vec3 col = mix(deep, charcoal, bgN * bgN);
  col = mix(col, dirtyPurple, smoothstep(0.46, 0.98, bgN) * (0.48 + 0.45 * bgN2));

  // woven warp/weft striations of the cloth
  float weave = 0.5 + 0.5 * sin((flow.x + flow.y) * 26.0 + bgN * 4.0);
  col *= 0.90 + 0.10 * weave;

  float vig = 1.0 - dot(uv, uv) * 0.30;
  col *= clamp(vig, 0.32, 1.0);

  // ---- grid of ladder stamps with lifecycle + travel ----
  float scale = 3.4;
  vec2 gridWarp = (warp - 0.5) * 0.18;
  vec2 travel = vec2(dirX * t * 0.75, dirY * t * 0.50);
  vec2 gv = (wuv + gridWarp) * scale + travel;

  vec2 cellId = floor(gv);
  vec2 cellUv = fract(gv) - 0.5;

  float stampSum = 0.0;
  vec3 stampCol = vec3(0.0);
  vec2 nbase = sign(cellUv);

  vec3 bone = vec3(0.918, 0.892, 0.828);
  bone = mix(bone, bone * vec3(1.05, 0.99, 0.90), palShift);

  for(float oy = 0.0; oy < 2.0; oy++){
    for(float ox = 0.0; ox < 2.0; ox++){
      vec2 off = vec2(ox, oy) * nbase;
      vec2 nId = cellId + off;
      vec2 local = cellUv - off;

      vec2 rnd = hash22(nId + seed * 11.0);
      float phase = rnd.x * 6.2831 + phaseOff;
      float rate = 0.45 + rnd.y * 0.55;

      // lifecycle: each stamp swells bright, then fades toward ash
      float wave = sin(t * 6.2831 * rate * 0.40 + phase + (nId.x * 0.6 + nId.y * 1.1));
      float life = 0.5 + 0.5 * wave;
      float bloom = smoothstep(0.10, 0.55, life);
      float ghost = 0.14 + 0.10 * hash21(nId + 1.7);

      // the ink also climbs: lower rungs fade first, top last (mourning ascent)
      float climb = smoothstep(-0.36, 0.46, local.y + (life - 0.5) * 0.7);

      float jx = (hash21(nId + 5.0) - 0.5) * 0.10 * u_unique;
      float jy = (hash21(nId + 9.0) - 0.5) * 0.10 * u_unique;
      vec2 sp = local - vec2(jx, jy);

      float sca = mix(0.94, 1.06, hash21(nId + 3.3));
      sp *= sca;

      float rough = vnoise((nId + sp) * 4.0 + seed);
      float inkRaw = ladderStamp(sp * 1.10, rough);

      // hand-stamp imperfection: broken, speckled ink
      float speck = step(0.55, hash21(floor((local + nId) * 12.0)));
      float ink = inkRaw * (0.80 + 0.20 * speck);
      ink *= mix(0.55, 1.0, climb);

      float fade = ink * mix(ghost, 1.0, bloom);
      stampSum = max(stampSum, fade);
      stampCol = max(stampCol, bone * fade);
    }
  }

  // faint mourning halo around the stamps
  float halo = smoothstep(0.0, 0.6, stampSum);
  col += dirtyPurple * halo * 0.12;
  col = mix(col, stampCol, clamp(stampSum * 1.06, 0.0, 1.0));

  // ---- ash rising from the fading stamps ----
  float ash = fbm(uv * 3.2 - vec2(travel.x * 0.4, t * 3.0));
  float ashMask = smoothstep(0.70, 0.96, ash) * (0.5 + 0.5 * sin(t * 2.0 + uv.x * 4.0));
  col += vec3(0.20, 0.18, 0.23) * ashMask * 0.14;

  // settling dust drifting down through the cloth
  float dust = fbm(flow * 8.5 + vec2(0.0, -t * 1.4));
  col += dirtyPurple * 0.06 * smoothstep(0.55, 1.0, dust);

  // slow grief glow gathered toward the top (the climb)
  float topGlow = smoothstep(0.95, -0.5, uv.y) * 0.12;
  col += dirtyPurple * topGlow * 0.45;

  // fine grain
  float grain = hash21(gl_FragCoord.xy + fract(u_time) * 100.0);
  col += (grain - 0.5) * 0.035;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
```

### grief-ash-veil.ts
```ts
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
    vec3 offBlack    = vec3(0.018, 0.014, 0.026);
    vec3 dirtyPurple = vec3(0.290, 0.239, 0.369);
    vec3 greyAsh     = vec3(0.520, 0.515, 0.530);
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
```

### grief-kintsugi.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-kintsugi",
  name: "Kintsugi",
  description: "Veins of gold slowly mend a dark, broken ceramic — grief turned luminous through repair.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float p){
  p=fract(p*0.1031);
  p*=p+33.33;
  p*=p+p;
  return fract(p);
}
float hash21(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}
vec2 hash22(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.xx+p3.yz)*p3.zy);
}
float vnoise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash21(i);
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0;
  float a=0.5;
  mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(float i=0.0;i<5.0;i++){
    v+=a*vnoise(p);
    p=m*p;
    a*=0.5;
  }
  return v;
}

// Voronoi crack network. Returns:
//   x = ridge distance (small near a shard boundary -> the crack seam)
//   y = nearest-cell distance (shard interior depth)
//   z = per-shard random id (for shading individual ceramic plates)
vec3 cracks(vec2 p, float drift){
  vec2 ip=floor(p);
  vec2 fp=fract(p);
  float f1=8.0;
  float f2=8.0;
  float id=0.0;
  for(float y=-1.0;y<=1.0;y++){
    for(float x=-1.0;x<=1.0;x++){
      vec2 g=vec2(x,y);
      vec2 o=hash22(ip+g);
      // slow breathing of cell sites so the ceramic seems to settle and shift
      o=0.5+0.42*sin(drift+6.2831*o);
      vec2 r=g+o-fp;
      float d=dot(r,r);
      if(d<f1){
        f2=f1;
        f1=d;
        id=hash21(ip+g);
      } else if(d<f2){
        f2=d;
      }
    }
  }
  return vec3(sqrt(f2)-sqrt(f1),sqrt(f1),id);
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

  // ---- seed-gated variation (every term multiplied by u_unique) ----
  float sd=u_seed*u_unique;
  float ang=0.5*sd;
  float ca=cos(ang), sa=sin(ang);
  vec2 ruv=mat2(ca,-sa,sa,ca)*uv;
  float pShift=0.13*sin(sd*4.7);
  float travelDir=mix(1.0,sign(hash11(sd+3.0)-0.5),u_unique);
  float phase=6.2831*hash11(sd+11.0)*u_unique;

  float t=u_time;

  // ---- flowing, warping dark background (the ceramic glaze) ----
  vec2 q=ruv*1.35;
  vec2 warp=vec2(
    fbm(q*1.05+vec2(0.0,t*0.045)+sd),
    fbm(q*1.05+vec2(5.2,-t*0.038)-sd)
  );
  float field=fbm(q+1.7*warp+vec2(t*0.018*travelDir,0.0));
  float field2=fbm(q*2.4-1.1*warp-vec2(0.0,t*0.013));

  // deep value range: near-black trough -> faint cool glaze sheen
  vec3 ink=vec3(0.014,0.012,0.024);
  vec3 glaze=vec3(0.120,0.105,0.175);
  float mottle=smoothstep(0.18,0.94,field*0.7+field2*0.45);
  vec3 col=mix(ink,glaze,mottle);
  float sheen=smoothstep(0.30,0.95,field2*0.6+0.4*fbm(q*3.1+warp));
  col+=glaze*sheen*0.40;
  col*=0.40+0.60*smoothstep(0.04,0.86,field);

  // ---- ceramic shard structure (large plates) ----
  vec2 cp=ruv*2.6;
  cp+=0.85*warp;
  cp+=vec2(0.035,0.018)*travelDir*t;
  cp+=0.16*vec2(fbm(cp*0.8+t*0.025),fbm(cp*0.8-t*0.022));
  vec3 c1=cracks(cp, t*0.10+phase);
  float edge=c1.x;
  float shardId=c1.z;

  // subtle per-shard tint variation lifts/darkens individual plates
  float plate=0.5+0.5*sin(shardId*30.0+sd*6.0);
  col*=0.74+0.34*plate;
  // shard relief: brighten plate interiors, deepen the seams
  col*=0.82+0.34*smoothstep(0.02,0.35,c1.y);

  // finer secondary crack web for delicacy
  vec2 cp2=ruv*5.4+1.3*warp+vec2(0.022,0.011)*travelDir*t;
  float edge2=cracks(cp2, t*0.08-phase).x;

  // ---- crack masks ----
  float vein =1.0-smoothstep(0.0,0.058,edge);
  float vein2=(1.0-smoothstep(0.0,0.038,edge2))*0.55;
  float allVein=clamp(vein+vein2,0.0,1.0);

  // ---- LIFECYCLE: gold mends the cracks, spreading outward then settling ----
  float rad=length(uv);
  float pulse=0.5+0.5*sin(t*0.10+phase);
  float grow=mix(0.30,1.30,smoothstep(0.0,1.0,pulse));
  float front=smoothstep(grow+0.30,grow-0.22,rad);
  // gold creeps along the seam: flow factor runs down the crack over time
  float flow=0.5+0.5*sin(rad*7.0-t*0.55+edge*40.0+phase);
  float fill=clamp(front*(0.45+0.55*flow)+0.28,0.0,1.0);

  float gold=allVein*fill;

  // molten travelling glint that races along the seams (the "mending")
  float glint=pow(0.5+0.5*sin(rad*16.0-t*1.1+phase),6.0);
  float seamGlint=vein*glint*front;

  // ---- gold material with deep-to-bright range ----
  vec3 goldDeep =vec3(0.40,0.25,0.04);
  vec3 goldMid  =vec3(0.88,0.63,0.17);
  vec3 goldBright=vec3(1.0,0.94,0.68);
  goldDeep =clamp(goldDeep +vec3(pShift,pShift*0.4,-pShift*0.5),0.0,1.0);
  goldMid  =clamp(goldMid  +vec3(pShift,pShift*0.4,-pShift*0.5),0.0,1.0);

  // value across the seam: deep edges -> bright core
  float core=pow(vein,2.0);
  vec3 goldCol=mix(goldDeep,goldMid,gold);
  goldCol=mix(goldCol,goldBright,core*fill);

  // lay the gold into the seams
  col=mix(col,goldCol*0.45,gold*0.6);           // settled gold body
  col=mix(col,goldCol,gold*fill);               // filled, lit gold
  // warm wide halo bleeding from the seams into the dark glaze
  float halo=(1.0-smoothstep(0.0,0.20,edge))*front;
  col+=goldDeep*halo*0.60;
  col+=goldMid*halo*0.28*pulse;
  // bright specular travelling core
  col+=goldBright*core*fill*(0.5+0.5*flow)*0.95;
  col+=goldBright*seamGlint*1.15;

  // crisp dark lip flanking each seam for contrast (broken-edge shadow)
  float lip=smoothstep(0.058,0.090,edge)*(1.0-smoothstep(0.090,0.150,edge));
  col*=1.0-lip*0.48*front;

  // ---- finishing ----
  float vig=1.0-0.58*dot(uv*0.60,uv*0.60);
  col*=clamp(vig,0.0,1.0);

  float grain=hash21(gl_FragCoord.xy+floor(t*24.0));
  col+=(grain-0.5)*0.022;

  col=col/(1.0+0.10*col)*1.12;
  col=pow(col,vec3(0.90));

  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### grief-sumie.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-sumie",
  name: "Sumi-e",
  description: "A single ink bloom opens, swells and bleeds in feathered capillaries across breathing rice paper, then dissolves back into the page — grief soaking outward and quietly receding.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define TAU 6.28318530718

float hash11(float p){
  p=fract(p*0.1031);
  p*=p+33.33;
  p*=p+p;
  return fract(p);
}
float hash21(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}
float vnoise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash21(i);
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0;
  float a=0.5;
  mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(float i=0.0;i<5.0;i++){
    v+=a*vnoise(p);
    p=m*p;
    a*=0.5;
  }
  return v;
}
mat2 rot(float a){
  float c=cos(a),s=sin(a);
  return mat2(c,-s,s,c);
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

  // ---- seed-gated variation (everything multiplied by u_unique) ----
  float sd=u_seed*u_unique;
  float spin=0.55*sd;                                  // canonical 0 when u_unique==0
  vec2 ruv=rot(spin)*uv;
  float phase=TAU*hash11(sd+11.0)*u_unique;            // 0 when canonical
  float pShift=(hash11(sd+5.0)-0.5)*0.05*u_unique;     // warm/cool paper tint
  float travel=mix(1.0,sign(hash11(sd+3.0)-0.5),u_unique);
  // canonical drop sits just above center; varies on seed
  vec2 dropOff=mix(vec2(0.0,0.07),
                   (vec2(hash11(sd+7.0),hash11(sd+9.0))-0.5)*0.7,
                   u_unique);

  float t=u_time*0.224;

  // ---- flowing, warping background: damp paper, ink diffusing through fibers
  vec2 q=ruv*1.4;
  vec2 warp=vec2(
    fbm(q*1.05+vec2(0.0,t*0.30)+phase),
    fbm(q*1.05+vec2(5.2,-t*0.26)-phase)
  );
  vec2 w=ruv+0.9*(warp-0.5);                           // domain-warped space
  vec2 p=w-dropOff;

  // a slower second bleed field for the soft halo around the bloom
  vec2 warp2=vec2(
    fbm(q*2.2+1.8*warp+vec2(t*0.20*travel,1.7)),
    fbm(q*2.2+1.8*warp+vec2(-1.3,t*0.18))
  );
  vec2 wb=p+0.8*(warp2-0.5);

  // ---- LIFECYCLE: the bloom opens, swells, bleeds, then fades and reopens ----
  float life=0.5-0.5*cos(t*0.42+phase);               // slow 0->1->0 breath
  float open=smoothstep(0.0,0.55,life);               // bloom growth
  float fade=smoothstep(0.78,1.0,life);               // dissolve at the end
  float bloomR=mix(0.10,0.62,open);                   // wet front travels outward

  // irregular feathered edge driven by warped noise (capillary bleed)
  float edgeNoise=fbm(wb*3.2+vec2(-t*0.18,t*0.15)+phase);
  float dist=length(wb*rot(0.18*sin(t*0.6)));
  float rim=dist-bloomR-(edgeNoise-0.5)*0.34*open;     // signed distance to front

  // ink density: saturated core, soft bleeding falloff into paper
  float core=smoothstep(0.0,-0.30,rim);               // 1 deep inside the bloom
  float bleed=smoothstep(0.34,-0.05,rim);             // wide feathered halo
  float feather=smoothstep(0.06,-0.10,rim);           // crisp inner wet edge

  // internal tonal variation of the wash (pooling, uneven brush loading)
  float pool=fbm(wb*2.6+vec2(t*0.22,-t*0.18));
  pool=pow(pool,1.5);
  float density=core*(0.55+0.85*pool)+bleed*0.45;

  // granulation: pigment settling into the paper's tooth
  float gran=fbm(wb*9.0-vec2(t*0.30))*fbm(wb*16.0+phase);
  density+=gran*core*0.45;
  // darker accumulation along the dried wet edge (tide line)
  density+=feather*(0.45+0.5*pool)*0.7;

  // ---- capillary tendrils: thin ink fingers crawling out along fibers ----
  float tendril=0.0;
  for(float i=0.0;i<4.0;i++){
    float ang=i*1.9+phase+0.12*sin(t*0.5+i);
    vec2 dirv=vec2(cos(ang),sin(ang));
    float reach=(0.30+0.20*i)*open;                   // grows as bloom opens
    vec2 wob=0.16*vec2(vnoise(wb*1.2+i+t*0.2),
                       vnoise(wb*1.2+i+9.0-t*0.2))-0.08;
    vec2 rel=wb-wob;
    float along=clamp(dot(rel,dirv),0.0,reach);
    float dl=length(rel-dirv*along);                  // distance to finger segment
    float ripple=abs(sin((wb.x+wb.y)*4.0+t*1.1*travel+i*1.7));
    float fingerMask=smoothstep(0.10,0.0,dl);
    tendril+=fingerMask*(0.35+0.55*ripple)*(0.30-i*0.05);
  }
  density+=max(tendril,0.0)*(0.7+0.5*pool)*open;

  // ---- sparse spatter droplets flung from the brush ----
  vec2 dp=wb*3.4+phase;
  float spat=smoothstep(0.94,0.995,hash21(floor(dp)))
            *smoothstep(0.42,0.0,length(fract(dp)-0.5));
  density+=spat*0.5*open;

  // dissolve the whole bloom as it fades back into the page
  density*=(1.0-0.9*fade);
  density=clamp(density,0.0,1.4);

  // ---- rice paper substrate: fibers, mottling ----
  float fiberH=vnoise(ruv*vec2(180.0,2.5));
  float fiberV=vnoise(ruv*vec2(2.5,180.0));
  float fiber=0.5*fiberH+0.5*fiberV;
  float mottle=fbm(uv*1.2+10.0);

  vec3 paper=vec3(0.94,0.92,0.885);
  paper+=vec3(0.03,0.02,-0.015)*(mottle-0.5);          // warm/cool mottling
  paper-=0.05*(fiber-0.5);                             // visible fiber tooth
  paper+=vec3(pShift,pShift*0.5,-pShift);              // seeded tint shift

  // ---- ink material: deep blue-black, soft bloom in shadow ----
  vec3 inkDeep=vec3(0.022,0.022,0.040);
  vec3 inkMid =vec3(0.105,0.105,0.145);
  vec3 inkCol=mix(inkMid,inkDeep,smoothstep(0.2,1.0,density));

  // lay the ink onto the paper with a wide value range
  vec3 col=paper;
  col=mix(col,inkCol,smoothstep(0.03,0.65,density));   // soft bleed transition
  col=mix(col,inkDeep,smoothstep(0.70,1.20,density));  // saturated darkest core

  // bright damp halo just outside the wet front (paper soaked but pale)
  float wetHalo=smoothstep(0.30,0.0,abs(rim))*(1.0-core)*open;
  col+=vec3(0.05,0.05,0.045)*wetHalo*0.6;
  // faint paper sheen lifts highlights inside the bloom shoulder
  col+=paper*0.10*smoothstep(0.6,0.0,dist)*(1.0-core)*open;

  // ---- finishing ----
  float grain=hash21(gl_FragCoord.xy+floor(t*20.0));
  col+=(grain-0.5)*0.020;

  float vig=1.0-0.45*dot(uv*0.62,uv*0.62);
  col*=clamp(vig,0.0,1.0);

  // protect highlights, hold deep shadows -> strong readable contrast
  col=col/(1.0+0.08*col)*1.08;
  col=pow(col,vec3(0.95));

  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### hope-ascii-ascension.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-ascii-ascension",
  name: "ASCII Ascension",
  description: "Columns of luminous ASCII glyphs streaming upward like sparks of becoming, kindling bright at their crests and drifting through a slow warping gold dusk.",
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
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i+vec2(0.0,0.0));
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    float f = 1.0;
    for(float i=0.0;i<5.0;i++){
        v += amp*vnoise(p*f);
        f *= 2.02;
        amp *= 0.5;
    }
    return v;
}

// A small procedural 5x5 ASCII-like glyph. Returns coverage in 0..1.
float glyph(vec2 g, float id){
    if(g.x<0.0||g.x>1.0||g.y<0.0||g.y>1.0) return 0.0;
    vec2 cell = floor(g*5.0);
    // Mirror left/right for legible, character-like symmetry.
    float mx = cell.x;
    if(mx > 2.0){ mx = 4.0 - mx; }
    float bits = hash21(vec2(id*7.13 + mx*2.0, id*3.71 + cell.y));
    float on = step(0.42, bits);
    // Keep a vertical spine often lit so glyphs read as characters, not noise.
    float spine = 0.0;
    if(abs(cell.x - 2.0) < 0.5){ spine = step(0.25, hash11(id*1.91 + cell.y)); }
    on = max(on, spine);
    vec2 fc = fract(g*5.0);
    float core = smoothstep(0.62, 0.12, length(fc-0.5));
    return on*core;
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;

    // --- gating: all seed variation rides on u_unique ---
    float seed = u_seed*u_unique;
    float pShift = hash11(seed*1.37 + 0.5);
    float dir = mix(1.0, sign(hash11(seed*2.3 + 0.7) - 0.5), u_unique);
    if(dir == 0.0){ dir = 1.0; }
    float hueShift = (hash11(seed*4.1 + 0.2) - 0.5) * u_unique;

    // --- palette: deep night -> ember gold -> warm white ---
    vec3 nearBlack = vec3(0.015,0.013,0.022);
    vec3 deepGold  = vec3(0.22,0.13,0.035);
    vec3 gold      = vec3(0.96,0.76,0.30);
    vec3 warmWhite = vec3(1.0,0.97,0.88);
    gold += vec3(hueShift*0.10, hueShift*0.02, -hueShift*0.10);

    float t = u_time*0.336;

    // --- flowing warped background (slow domain warp) ---
    vec2 wp = uv*1.3;
    vec2 warp;
    warp.x = fbm(wp + vec2(0.0, t*0.6) + seed*3.1);
    warp.y = fbm(wp + vec2(5.2, -t) + seed*1.7);
    float field  = fbm(wp*1.4 + warp*1.6 + vec2(seed*2.0, t*0.8));
    float field2 = fbm(wp*0.7 - warp*1.1 + vec2(-t*0.5, seed));

    vec3 col = nearBlack;
    col = mix(col, deepGold, smoothstep(0.30,0.95,field)*0.65);
    col += deepGold*0.45*smoothstep(0.40,1.0,field2);
    // upward updraft glow brightening toward the top of frame
    float updraft = smoothstep(-1.2, 1.4, uv.y);
    col += deepGold*0.30*updraft*smoothstep(0.35,1.0,field);

    float vign = smoothstep(1.8,0.15,length(uv));
    col *= mix(0.30,1.0,vign);

    // --- ASCII glyph columns ---
    float aspect = u_resolution.x/u_resolution.y;
    vec2 gp = uv;

    float colsAcross = 26.0;
    float gx = uv.x*0.5*colsAcross;
    float colId = floor(gx + colsAcross*0.5);
    float fx = fract(gx);

    float colRand  = hash11(colId*1.13 + 11.0 + seed*5.0);
    float colRand2 = hash11(colId*2.57 + 3.0  + seed*2.1);

    // each column rises at its own slow pace; dir flips with seed
    float speed = mix(0.40,1.05, colRand);
    float scrollY = uv.y*dir - u_time*0.85*speed - pShift*6.2831*u_unique;

    float rows = 13.0;
    float gy = scrollY*rows*0.5;
    float rowId = floor(gy);
    float fy = fract(gy);

    // gentle side-to-side sway so the stream feels alive
    float wob = sin(u_time*0.35 + colId*1.3)*0.05;
    fx = fract(gx + wob);

    // glyph identity recycles per row, so characters "become" anew
    float charSeed = hash21(vec2(colId*0.91, rowId*1.7));
    float gid = floor(charSeed*64.0);

    vec2 inCell = vec2(fx, fy);
    vec2 pad = vec2(0.16,0.10);
    vec2 gcoord = (inCell-pad)/(1.0-2.0*pad);
    float gShape = glyph(gcoord, gid);

    // --- spark head: a bright crest travels up each column, trailing fade ---
    float headPhase = fract(u_time*0.26*speed + colRand + colRand2);
    float headRow = floor(headPhase*rows*4.0 - rows*2.0);
    float distFromHead = (rowId - headRow)*dir;

    float trail = exp(-max(distFromHead,0.0)*0.50);
    float behind = step(-0.5, distFromHead);
    trail *= behind;

    // occasionally a column is dim (sparse field, more legible)
    float colMask = step(hash11(colId*3.7 + 7.0 + seed), 0.84);
    gShape *= colMask;

    float glyphLum = gShape*(0.16 + trail*1.05);

    vec3 glyphCol = mix(gold, warmWhite, smoothstep(0.45,1.0,trail));
    col += glyphCol * glyphLum * (1.05 + 0.55*vign);

    // bright bloom right at the spark head
    float headGlow = exp(-abs(distFromHead)*0.85)*gShape;
    col += warmWhite*headGlow*0.65;

    // --- a few free-floating sparks rising and drifting ---
    float sparkN = 0.0;
    for(float i=0.0;i<3.0;i++){
        float fi = i+1.0;
        float sx = (hash11(fi*12.7 + seed*3.0)*2.0-1.0)*aspect;
        float baseY = hash11(fi*5.3 + seed);
        float sy = fract(baseY + u_time*0.07*(0.5+fi*0.2)*dir)*2.4 - 1.2;
        float drift = sin(u_time*0.5 + fi*2.0)*0.15;
        vec2 sc = gp - vec2(sx+drift, sy*dir);
        float d = length(sc*vec2(1.0,0.7));
        sparkN += exp(-d*24.0);
    }
    col += gold*sparkN*0.65;
    col += warmWhite*sparkN*sparkN*0.45;

    // subtle vertical light shafts reinforcing the upward read
    float shaft = smoothstep(0.0,1.0, field*0.5+0.5);
    col += gold*0.05*shaft*updraft;

    // --- fine grain + contrast lift ---
    float grain = (hash21(gl_FragCoord.xy + fract(u_time))*2.0-1.0)*0.020;
    col += grain;

    col *= 1.06;
    col = pow(col, vec3(0.90));

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### hope-golden-dragon.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-golden-dragon",
  name: "Golden Dragon",
  description: "A sinuous Chinese dragon of scales and light coils upward toward a flaming pearl — hope ascending out of a warm dark void.",
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
    p *= p+33.33;
    p *= p+p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p){
    float s = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6,1.2,-1.2,1.6);
    for(float i=0.0;i<5.0;i++){
        s += a*vnoise(p);
        p = m*p;
        a *= 0.5;
    }
    return s;
}

mat2 rot(float a){
    float c = cos(a);
    float s = sin(a);
    return mat2(c,-s,s,c);
}

// Parametric dragon spine: returns position along the coil for parameter s in [0,1].
// travel slides the wave; sway adds a slow whole-body roll.
vec2 spine(float s, float travel, float phase){
    float ph = s*9.2 - travel + phase;
    float amp = 0.66*(0.32+0.72*s);          // wider sweep toward the rising head
    float x = sin(ph)*amp;
    x += 0.16*sin(ph*0.5 + 1.3);             // secondary undulation
    float y = (s*2.55 - 1.30) + 0.16*sin(ph*0.5);
    return vec2(x,y);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    // ---- seed variation, fully gated by u_unique ----
    float vary    = u_seed*u_unique;
    float phase   = vary*6.28318;
    float dir     = mix(1.0, sign(hash11(u_seed+3.7)-0.5), u_unique);
    float hueShift= (hash11(u_seed+11.3)-0.5)*0.16*u_unique;

    float t = u_time*0.168*dir;

    // ---- flowing warm-dark nebula background ----
    vec2 wp = uv*1.3;
    float warp = fbm(wp*1.1 + vec2(t*0.6, -t*0.4) + phase);
    wp += 0.55*vec2(fbm(wp+warp+phase), fbm(wp.yx-warp-phase));
    float neb = fbm(wp*1.4 + vec2(-t*0.3, t*0.5));
    neb = pow(neb, 1.6);

    vec3 deep = vec3(0.085,0.058,0.020);
    vec3 dark = vec3(0.012,0.008,0.004);
    vec3 col  = mix(dark, deep, neb);
    col += vec3(0.02,0.07,0.05) * pow(fbm(wp*0.8 - t*0.2),3.0) * 0.9;
    float vig = smoothstep(1.85,0.15,length(uv));
    col *= mix(0.35,1.0,vig);

    // ---- the flaming pearl the dragon coils toward (top of frame) ----
    float bob = 0.05*sin(u_time*0.5+phase);
    vec2 pearlPos = vec2(0.04*sin(u_time*0.3+phase), 1.02 + bob);
    float pd = length(uv-pearlPos);
    float pearlCore = smoothstep(0.10,0.0,pd);
    float flame = fbm(uv*5.0 + vec2(0.0,-u_time*1.2) + phase);
    float pearlHalo = smoothstep(0.42,0.0,pd) * (0.55+0.45*flame);
    float pearlPulse = 0.78+0.22*sin(u_time*1.4+phase);

    // ---- march the spine, find nearest segment to this pixel ----
    float travel = t*1.7;

    float bodyMask = 0.0;
    float bestS    = 0.0;
    float bestRel  = 1.0;   // normalised distance across the body (0 center -> 1 edge)
    float bestSide = 0.0;   // signed across-body coordinate
    vec2  bestTang = vec2(0.0,1.0);
    vec2  headPos  = vec2(0.0,0.0);

    const float N = 30.0;
    for(float i=0.0;i<30.0;i++){
        float s = i/(N-1.0);
        vec2 P  = spine(s, travel, phase);
        vec2 Pn = spine(s+0.012, travel, phase);
        vec2 tang = normalize(Pn - P + 1e-4);
        vec2 norm = vec2(-tang.y, tang.x);

        vec2 d   = uv - P;
        float across = dot(d, norm);
        float along  = dot(d, tang);
        float dist   = length(d);

        // tapered radius: thin neck, full belly, fine tail
        float taper = smoothstep(0.0,0.10,s) * (1.0 - 0.45*smoothstep(0.62,1.0,s));
        float rad   = 0.205*taper + 0.018;

        float seg = smoothstep(rad, rad*0.40, dist);
        if(seg > bodyMask){
            bodyMask = seg;
            bestS    = s;
            bestRel  = clamp(dist/max(rad,0.001), 0.0, 1.0);
            bestSide = across/max(rad,0.001);
            bestTang = tang;
        }
        // remember head (tip of the parameter range)
        if(i >= N-1.0){ headPos = P; }
    }

    // ---- scales: stable lattice in (arc-length, across-body) space ----
    float along  = bestS*34.0;
    float across = bestSide*3.2;
    vec2 g = vec2(along, across);
    g.x += 0.5*floor(g.y);                 // brick offset
    vec2 cell = fract(g)-0.5;
    float scaleD = length(cell*vec2(1.0,1.25));
    float scales = smoothstep(0.5,0.16,scaleD);
    float shimmer = 0.5+0.5*sin(bestS*30.0 - u_time*2.2*dir + across*1.4 + phase);
    shimmer = pow(shimmer,2.0);
    float scaleField = scales * (0.5+0.6*shimmer);

    // body shading
    float core = smoothstep(1.0,0.0,bestRel);   // 1 at center, 0 at rim
    float rim  = smoothstep(0.55,1.0,bestRel)*bodyMask;

    vec3 goldDeep = vec3(0.55,0.33,0.07);
    vec3 goldMid  = vec3(0.96,0.76,0.30);
    vec3 goldHi   = vec3(1.0,0.96,0.86);
    vec3 jade     = vec3(0.16,0.72,0.45);

    vec3 body = mix(goldDeep, goldMid, smoothstep(0.0,0.65,core));
    body = mix(body, goldHi, smoothstep(0.55,1.0,core)*0.95);
    body = mix(body*0.62, body+goldHi*0.30, scaleField);
    float jadeGlint = pow(shimmer,3.0)*scales*0.6;
    body = mix(body, jade, jadeGlint*0.5);
    // hue drift (seed gated through hueShift)
    body = mix(body, body.gbr, max(hueShift,0.0));
    body += jade*max(-hueShift,0.0)*0.4;

    // dorsal crest ridge running along the back (one side of the body)
    float crest = smoothstep(0.55,0.95,bestSide) * bodyMask
                * (0.4+0.6*shimmer) * smoothstep(0.04,0.25,bestS);

    // ---- head + eye + glow near the rising tip ----
    float hd = length(uv - headPos);
    float headLobe = smoothstep(0.20,0.0,hd);          // bright muzzle mass
    vec2  eyeOff = bestTang*0.045 + vec2(bestTang.y,-bestTang.x)*0.05;
    float ed = length(uv - (headPos + eyeOff));
    float eye = smoothstep(0.030,0.0,ed);              // dark eye socket
    float eyeSpark = smoothstep(0.012,0.0,length(uv-(headPos+eyeOff-vec2(0.01,-0.008))));
    float headGlow = smoothstep(0.32,0.0,hd) * (0.6+0.4*pearlPulse);

    // ---- composite the dragon ----
    col = mix(col, body, bodyMask*0.97);
    col += mix(goldHi, jade, 0.5) * crest * 0.55;
    col = mix(col, goldHi, headLobe*0.85);
    col = mix(col, vec3(0.05,0.03,0.01), eye*0.9);     // carve the eye dark
    col += goldHi * eyeSpark * 1.2;                     // catchlight
    col += goldMid * headGlow * 0.4;

    // halo around the whole body
    col += mix(goldMid, jade, 0.25) * rim * 0.7;
    float aura = bodyMask;
    col += goldMid * pow(aura,1.5) * 0.12;
    col += jade   * pow(aura,3.0) * 0.06;

    // ---- the pearl on top (drawn over body so it reads as a focal point) ----
    col += vec3(1.0,0.86,0.55) * pearlHalo * 0.55 * pearlPulse;
    col = mix(col, vec3(1.0,0.97,0.90), pearlCore*pearlPulse);

    // ---- drifting golden motes / sparks rising ----
    float motes = 0.0;
    for(float i=0.0;i<8.0;i++){
        float fi   = i;
        float seed = hash11(fi*1.7+1.0+vary*fi);
        float mx   = (seed-0.5)*2.6;
        float sp   = 0.10+0.07*hash11(fi*3.1+2.0);
        float my   = fract(seed + u_time*sp*0.25) * 2.6 - 1.3;
        vec2  mp   = vec2(mx + 0.18*sin(u_time*0.5+fi+phase), my);
        float md   = length(uv-mp);
        float tw   = 0.5+0.5*sin(u_time*3.0+fi*2.0);
        motes += smoothstep(0.04,0.0,md)*(0.4+0.6*tw);
    }
    col += mix(goldHi, jade, 0.2) * motes * 0.5;

    // ---- finishing: grain + tone ----
    float grain = (hash21(gl_FragCoord.xy + u_time)-0.5)*0.03;
    col += grain;
    col = pow(max(col,0.0), vec3(0.90));
    col *= 1.05;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### hope-lantern-halftone.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-lantern-halftone",
  name: "Lantern Halftone",
  description: "A printed halftone dusk resolves into a rising sun and a slow procession of paper lanterns lifting through warping night air — ink dots swelling from shadow into warm light.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define TAU 6.28318530718

float hash11(float p){
  p=fract(p*0.1031);
  p*=p+33.33;
  p*=p+p;
  return fract(p);
}

float hash21(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}

float vnoise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash21(i);
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0;
  float amp=0.55;
  mat2 rot=mat2(0.80,-0.60,0.60,0.80);
  for(float i=0.0;i<4.0;i++){
    v+=amp*vnoise(p);
    p=rot*p*2.02+5.13;
    amp*=0.5;
  }
  return v;
}

// continuous brightness field: sun + dawn + lanterns. driven by a warped uv.
// returns intensity in roughly [0,1.4]; also outputs lantern-only glow via 'glowOut'.
float scene(vec2 p, float t, float seed, float dir, out float glowOut){
  float field=0.0;
  glowOut=0.0;

  // --- dawn gradient: warm light pooling up from the horizon ---
  float dawn=1.0-smoothstep(-0.95,0.75,p.y);
  dawn=pow(dawn,1.55);
  field+=dawn*0.34;

  // --- the rising sun ---
  // slow lifecycle: the sun breathes upward over a long arc, never leaving frame.
  float climb=0.5+0.5*sin(t*0.16-1.5707963);
  float sunY=-0.62+0.30*climb;
  float sunX=(hash11(seed+1.9)-0.5)*0.55*u_unique;
  vec2 sunP=vec2(sunX,sunY);
  vec2 sd=(p-sunP)*vec2(1.0,1.12);
  float sunDist=length(sd);
  float sunPulse=0.88+0.12*sin(t*0.9);
  float sunCore=smoothstep(0.42,0.0,sunDist);
  float sunHalo=smoothstep(1.05,0.0,sunDist);
  // slowly rotating rays
  float ang=atan(sd.y,sd.x);
  float rays=0.5+0.5*sin(ang*10.0+t*0.5*dir);
  rays=pow(rays,2.2);
  field+=sunCore*1.30*sunPulse;
  field+=sunHalo*sunHalo*0.42;
  field+=sunHalo*rays*0.18*smoothstep(0.0,0.8,sunDist);

  // --- rising paper lanterns ---
  float lant=0.0;
  for(float i=0.0;i<7.0;i++){
    float r1=hash11(i*7.13+1.0+seed*2.0);
    float r2=hash11(i*3.91+5.0+seed*1.3);
    float r3=hash11(i*5.27+2.0+seed*0.7);

    // canonical evenly-spread columns; seed perturbs spread when unique
    float baseX=mix((i/6.0-0.5)*2.1, (r1-0.5)*2.3, u_unique);
    float speed=0.085+r2*0.075;
    float phase=r3;
    float life=fract(phase+t*speed);             // 0 launch -> 1 vanish high
    float yPos=mix(-1.15,1.45,life);
    float sway=dir*(0.16+r1*0.13)*sin(life*TAU*(0.8+r2)+i*1.7);
    vec2 lp=vec2(baseX+sway,yPos);

    float fade=smoothstep(0.0,0.10,life)*smoothstep(1.0,0.80,life);
    float size=0.085+r2*0.045;

    vec2 ld=(p-lp)*vec2(1.0,0.82);   // gentle vertical stretch -> teardrop body
    // bias bottom heavier for a lantern silhouette
    ld.y+=clamp(-ld.y,0.0,0.4)*0.35;
    float d=length(ld);

    float core=smoothstep(size,size*0.15,d)*fade;
    float warmth=0.9+r3*0.6;
    lant+=core*warmth;

    float g=smoothstep(size*5.0,0.0,d)*fade;
    glowOut+=g*0.30*warmth;

    // trailing ember spark beneath each lantern
    float trail=smoothstep(size*0.6,0.0,length(vec2(ld.x,ld.y+0.10)))*fade*0.4;
    lant+=trail;
  }
  field+=lant;

  field+=glowOut*0.55;
  return field;
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

  float t=u_time;

  // seed only matters when u_unique==1.0
  float seed=u_seed*u_unique;
  float palShift=(hash11(seed+3.7)-0.5)*u_unique;
  float dir=mix(1.0,sign(hash11(seed+9.1)-0.5),u_unique);
  float rot=(hash11(seed+13.0)-0.5)*0.5*u_unique;
  float cr=cos(rot), sr=sin(rot);
  mat2 grot=mat2(cr,-sr,sr,cr);

  float tt=t*0.20;

  // ------------------------------------------------------------------
  // FLOWING / WARPING NIGHT AIR (domain warp shared by field + screen)
  // ------------------------------------------------------------------
  vec2 wp=grot*uv*1.35;
  wp.x+=dir*0.14*sin(uv.y*1.4+tt*0.7);
  float wA=fbm(wp+vec2(0.0,-tt*0.95)+seed);
  float wB=fbm(wp*1.65+vec2(wA*1.4,-tt*1.25)+seed*0.5);
  vec2 warp=vec2(wA,wB)-0.5;
  vec2 fld=grot*uv+warp*0.34;

  float glow;
  float field=scene(fld,t,seed,dir,glow);

  // ------------------------------------------------------------------
  // HALFTONE SCREEN  (the motif's form)
  // dot radius driven by local brightness -> the dot-field "resolves"
  // the sun and lanterns out of the dark print.
  // ------------------------------------------------------------------
  float cells=44.0;
  vec2 gp=uv;
  gp.y+=tt*0.30;                                  // screen drifts slowly upward
  gp.x+=dir*0.035*sin(uv.y*3.0+t*0.6);
  gp=grot*gp;
  vec2 grid=gp*cells;
  // breathing ripple through the screen so dots pulse like a living print
  grid+=vec2(fbm(uv*2.0+tt*0.25)-0.5,0.0)*1.1;

  vec2 cellId=floor(grid);
  vec2 cf=fract(grid)-0.5;
  float jitter=(hash21(cellId+11.0)-0.5)*0.16*u_unique;
  cf+=jitter;

  // sample the same field at the cell center for stable dot sizing
  float cellBright=field;
  float wave=0.5+0.5*sin(uv.y*3.5-t*0.9+fbm(uv+tt*0.4)*2.0);
  cellBright*=(0.70+0.50*wave);

  float radius=clamp(cellBright,0.0,1.0);
  radius=pow(radius,1.10)*0.60;

  float dotDist=length(cf);
  float aa=1.5/cells;
  float dotMask=smoothstep(radius+aa,radius-aa,dotDist);

  // ------------------------------------------------------------------
  // DUOTONE PALETTE — deep ink night -> warm cream highlight
  // ------------------------------------------------------------------
  vec3 deep =vec3(0.012,0.020,0.045);            // near-black blue ink
  vec3 night=vec3(0.045,0.055,0.105);
  vec3 gold =vec3(0.965,0.745,0.300);
  vec3 amber=vec3(0.945,0.520,0.165);
  vec3 cream=vec3(1.000,0.945,0.760);

  // gated palette drift (warm <-> cooler gold)
  gold=clamp(gold+vec3(palShift*0.05,palShift*0.10,palShift*0.16),0.0,1.0);

  // background: cool night, lifting toward the warm horizon
  float dawnBg=1.0-smoothstep(-0.95,0.85,fld.y);
  vec3 bg=mix(deep,night,smoothstep(-1.0,1.0,fld.y+wA*0.4));
  bg=mix(bg,amber*0.22,pow(dawnBg,2.0)*0.55);
  bg+=gold*0.04*pow(dawnBg,1.5);

  // dot ink color ramps with local brightness: deep amber -> gold -> cream
  float db=clamp(cellBright*1.10,0.0,1.45);
  vec3 dotCol=mix(amber*0.55,gold,smoothstep(0.05,0.65,db));
  dotCol=mix(dotCol,cream,smoothstep(0.75,1.30,db));

  vec3 col=bg;
  col=mix(col,dotCol,dotMask);

  // soft additive glow so the lanterns/sun bleed light past the screen
  col+=gold*glow*0.22;
  float sunGlow=smoothstep(1.0,0.0,length((fld-vec2(0.0,-0.4))*vec2(1.0,1.1)));
  col+=amber*sunGlow*0.05;

  // ------------------------------------------------------------------
  // GRADE: vignette, contrast push, grain, gamma
  // ------------------------------------------------------------------
  float vig=1.0-0.40*dot(uv,uv)*0.55;
  col*=clamp(vig,0.35,1.0);

  // strong contrast: deep shadow -> bright highlight
  col=(col-0.5)*1.22+0.5;
  float lum=dot(col,vec3(0.299,0.587,0.114));
  col=mix(vec3(lum),col,1.12);

  float grain=hash21(gl_FragCoord.xy+fract(t)*57.0);
  col+=(grain-0.5)*0.026;

  col=pow(clamp(col,0.0,1.0),vec3(0.90));

  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### hope-origami-crane.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-origami-crane",
  name: "Origami Crane",
  description: "A folded paper crane rises through warm domain-warped light, wings easing open and closed like a slow held breath of hope.",
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
    p *= p+33.33;
    p *= p+p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<5;i++){
        v += a*noise(p);
        p = m*p;
        a *= 0.5;
    }
    return v;
}

mat2 rot(float a){
    float c = cos(a);
    float s = sin(a);
    return mat2(c,-s,s,c);
}

float sdTri(vec2 p, vec2 a, vec2 b, vec2 c){
    vec2 e0=b-a, e1=c-b, e2=a-c;
    vec2 v0=p-a, v1=p-b, v2=p-c;
    vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.0,1.0);
    vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.0,1.0);
    vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.0,1.0);
    float s=sign(e0.x*e2.y-e0.y*e2.x);
    vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),
                   vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),
                   vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
    return -sqrt(d.x)*sign(d.y);
}

float sdSeg(vec2 p, vec2 a, vec2 b){
    vec2 pa=p-a, ba=b-a;
    float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    return length(pa-ba*h);
}

// smooth eased oscillation in [-1,1]
float ease(float x){
    float s = sin(x);
    return s*(1.0 - 0.18*s*s);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    float t = u_time;

    // ---- seed-gated variation (all multiplied by u_unique) ----
    float sd = u_seed*u_unique;
    float hueShift = (hash11(sd+1.7)-0.5)*u_unique;
    float travel = mix(1.0, sign(hash11(sd+4.2)-0.5), u_unique);
    float phase = hash11(sd+8.3)*6.2831*u_unique;
    float swirl = (hash11(sd+2.1)-0.5)*0.7*u_unique;

    // ---- flowing, domain-warped golden background ----
    vec2 bg = uv;
    float warpT = t*0.045;
    vec2 q = vec2(fbm(bg*1.3 + vec2(0.0, warpT)),
                  fbm(bg*1.3 + vec2(5.2,-warpT)));
    vec2 r = vec2(fbm(bg*1.5 + 2.0*q + vec2(1.7,9.2) + warpT),
                  fbm(bg*1.5 + 2.0*q + vec2(8.3,2.8) - warpT));
    float flow = fbm(bg*1.4 + 2.3*r + warpT*0.5);

    // deep value range for contrast
    vec3 deep  = vec3(0.018,0.012,0.006);
    vec3 amber = vec3(0.62,0.38,0.10);
    vec3 gold  = vec3(0.965,0.760,0.300);
    vec3 cream = vec3(1.0,0.965,0.890);

    // palette shift only when unique
    gold = mix(gold, gold.zxy, 0.12*max(hueShift,0.0));
    gold = mix(gold, gold.yzx, 0.12*max(-hueShift,0.0));

    vec3 col = deep;
    col = mix(col, amber, flow*flow*0.38);
    col += gold*0.07*flow;

    // central radiant glow (the "golden light") — tighter so the field stays dark
    float rad = length(uv*vec2(0.85,1.0));
    float glow = exp(-rad*1.95);
    col = mix(col, amber*1.3, glow*0.30);
    col += gold*glow*0.28;
    col += cream*glow*glow*0.13;

    // slow rotating god-rays
    vec2 rp = uv;
    rp *= rot(t*0.05 + swirl + phase*0.1);
    float ang = atan(rp.y, rp.x);
    float rays = 0.5 + 0.5*sin(ang*8.0 + t*0.20);
    rays = pow(rays, 3.0);
    float rayFall = exp(-rad*1.05);
    col += gold*rays*rayFall*0.28;
    vec2 rp2 = uv*rot(-t*0.035 - swirl*0.6);
    float ang2 = atan(rp2.y, rp2.x);
    float rays2 = pow(0.5+0.5*sin(ang2*15.0 - t*0.14), 4.0);
    col += cream*rays2*rayFall*0.10;

    // ---- crane lifecycle: rise + gentle sway + flap ----
    float rise  = sin(t*0.26 + phase)*0.17;
    float bob   = sin(t*0.55 + phase)*0.025;
    float drift = sin(t*0.15 + phase)*0.07*travel;
    vec2 cp = uv - vec2(drift, rise + bob);
    cp *= rot(ease(t*0.18 + phase)*0.06*travel);
    cp *= 1.0/0.92;

    // eased wing flap (slow, graceful)
    float wing = ease(t*0.7 + phase);
    float flap = wing*0.34;

    // ---- crane silhouette (folded triangular planes) ----
    float body  = sdTri(cp, vec2(0.0,0.34), vec2(-0.16,-0.02), vec2(0.18,-0.05));
    float bodyB = sdTri(cp, vec2(0.18,-0.05), vec2(-0.16,-0.02), vec2(-0.02,-0.40));
    float bodyD = min(body, bodyB);

    float tail  = sdTri(cp, vec2(-0.16,-0.02), vec2(-0.56,0.19), vec2(-0.20,0.06));

    float neck  = sdSeg(cp, vec2(0.04,0.18), vec2(0.30,0.52)) - 0.035;
    float beak  = sdTri(cp, vec2(0.30,0.52), vec2(0.45,0.50), vec2(0.31,0.44));
    float headD = min(neck, beak);

    vec2 lw = cp - vec2(-0.05,0.05);
    lw *= rot(0.55 + flap);
    float lwing  = sdTri(lw, vec2(0.0,0.0), vec2(0.64,0.32), vec2(0.10,-0.18));
    vec2 lw2 = cp - vec2(-0.05,0.05);
    lw2 *= rot(0.55 + flap*0.6);
    float lwing2 = sdTri(lw2, vec2(0.0,0.0), vec2(0.50,0.42), vec2(0.56,0.10));
    float leftWing = min(lwing, lwing2);

    vec2 rw = cp - vec2(0.02,0.04);
    rw.x = -rw.x;
    rw *= rot(0.55 + flap);
    float rwing  = sdTri(rw, vec2(0.0,0.0), vec2(0.64,0.32), vec2(0.10,-0.18));
    vec2 rw2 = cp - vec2(0.02,0.04);
    rw2.x = -rw2.x;
    rw2 *= rot(0.55 + flap*0.6);
    float rwing2 = sdTri(rw2, vec2(0.0,0.0), vec2(0.50,0.42), vec2(0.56,0.10));
    float rightWing = min(rwing, rwing2);

    float crane = min(min(bodyD, tail), min(headD, min(leftWing, rightWing)));

    float aa = 2.5/u_resolution.y;
    float mask = smoothstep(aa, -aa, crane);

    // faceted paper shading per fold plane
    float facet = 0.5 + 0.5*sin((cp.x*6.0 + cp.y*4.0) + flap*2.0);
    float planeL = smoothstep(-aa,aa, -leftWing)*facet;
    float planeR = smoothstep(-aa,aa, -rightWing)*(1.0-facet);

    vec3 paper = mix(cream, gold, 0.28 + 0.40*facet);
    float edge = smoothstep(0.0, aa*4.0, abs(crane));
    float rim  = 1.0 - edge;
    vec3 craneCol = paper;
    craneCol += cream*planeL*0.22;
    craneCol += gold*planeR*0.16;
    craneCol += cream*rim*0.55;

    // crisp fold creases for paper texture
    float creases = 0.5+0.5*sin(cp.x*38.0 + cp.y*22.0 + flap);
    craneCol -= amber*0.10*step(0.62,creases)*mask;

    // directional light catch (top-right), wide value range
    float lit = clamp(0.55 + 0.55*dot(normalize(cp+vec2(0.001)), vec2(0.25,0.80)), 0.0, 1.3);
    craneCol *= mix(0.62, 1.25, lit);

    // soft golden halo around the crane
    float halo = smoothstep(0.16, -0.02, crane) - mask;
    halo = max(halo, 0.0);
    // dark contrast ring hugging the crane so it reads against the glow
    float ring = smoothstep(0.13,-0.01,crane)*(1.0-mask);
    col *= 1.0 - ring*0.5;
    col += gold*halo*0.40;
    col += cream*halo*0.16;

    craneCol *= 1.14;
    col = mix(col, craneCol, mask);

    // ---- drifting luminous motes (gentle ascent) ----
    float motes = 0.0;
    for(int i=0;i<6;i++){
        float fi = float(i);
        float seedM = fi*13.13 + 4.0 + sd*0.7;
        float mx = (hash11(seedM)*2.0-1.0)*1.25;
        float speed = 0.05 + hash11(seedM+1.0)*0.05;
        float my = mod(hash11(seedM+2.0) + t*speed, 1.7)-0.85;
        my *= -1.0;
        vec2 mp = uv - vec2(mx + sin(t*0.25+fi)*0.05, my);
        float d = length(mp);
        float tw = 0.5+0.5*sin(t*1.6+fi*2.0);
        motes += smoothstep(0.020,0.0,d)*(0.4+0.6*tw);
    }
    col += cream*motes*0.55;
    col += gold*motes*0.28;

    // vignette + grain + tonemap for contrast
    float vig = smoothstep(1.65, 0.20, length(uv));
    col *= mix(0.45, 1.0, vig);

    float g = hash21(gl_FragCoord.xy + fract(t)*113.0);
    col += (g-0.5)*0.022;

    col = pow(max(col,0.0), vec3(0.90));
    col = col/(col+vec3(0.55))*1.42;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### hope-sunrise-adinkra.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-sunrise-adinkra",
  name: "Rising Sun",
  description: "A sun climbing slowly through a warping dusk sky, crowned with turning rays and ringed by glowing Akan Nyame Dua altars that breathe open like quiet prayers of hope.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash(float n){ return fract(sin(n*157.31)*43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

float noise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash2(i);
  float b=hash2(i+vec2(1.0,0.0));
  float c=hash2(i+vec2(0.0,1.0));
  float d=hash2(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

float fbm(vec2 p){
  float v=0.0;
  float a=0.5;
  for(int i=0;i<5;i++){
    v+=a*noise(p);
    p=p*2.02+vec2(11.3,7.7);
    a*=0.5;
  }
  return v;
}

mat2 rot(float a){ float c=cos(a); float s=sin(a); return mat2(c,-s,s,c); }

// rounded box field (negative inside)
float rbox(vec2 p, vec2 b, float r){
  vec2 d=abs(p)-b+r;
  return length(max(d,0.0))+min(max(d.x,d.y),0.0)-r;
}

// one bar -> filled mask with soft edge
float bar(vec2 p, vec2 b, float r, float aa){
  return smoothstep(aa,-aa,rbox(p,b,r));
}

// Nyame Dua "altar of God": a forked post crowned by a vessel/diamond.
// Returns coverage in 0..1. 'op' (0..1) is the lifecycle: prayer opening.
float nyameDua(vec2 p, float op, float aa){
  float m=0.0;
  // central post
  m=max(m, bar(p+vec2(0.0,0.10), vec2(0.085,0.62), 0.05, aa));
  // upper cross arms (open outward with lifecycle)
  float spread=mix(0.30,0.46,op);
  m=max(m, bar((p-vec2( spread,0.40))*rot(-0.50+op*0.18), vec2(0.30,0.075), 0.05, aa));
  m=max(m, bar((p-vec2(-spread,0.40))*rot( 0.50-op*0.18), vec2(0.30,0.075), 0.05, aa));
  // lower fork legs (the rooted four-pronged altar)
  m=max(m, bar((p-vec2( spread*0.85,-0.46))*rot( 0.46-op*0.16), vec2(0.26,0.07), 0.05, aa));
  m=max(m, bar((p-vec2(-spread*0.85,-0.46))*rot(-0.46+op*0.16), vec2(0.26,0.07), 0.05, aa));
  // crowning vessel: rotated diamond that grows as it opens
  float ds=mix(0.13,0.20,op);
  float dia=abs(p.x)*0.92+abs(p.y-0.80)-ds;
  m=max(m, smoothstep(aa*1.5,-aa*1.5,dia));
  // diamond hollow center (carved)
  float diaIn=abs(p.x)*0.92+abs(p.y-0.80)-ds*0.42;
  m=min(m, 1.0-smoothstep(aa*1.5,-aa*1.5,diaIn));
  return m;
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
  float t=u_time;

  // ---- seed variation, fully gated by u_unique ----
  float sh=hash(u_seed*u_unique+3.0);
  float palShift=(sh-0.5)*0.22*u_unique;
  float dir=mix(1.0, sign(hash(u_seed*u_unique+9.0)-0.5), u_unique);
  float phase=u_seed*u_unique*6.2831853;
  float spinSeed=(hash(u_seed*u_unique+17.0)-0.5)*u_unique;

  // ---- sunrise lifecycle: the sun climbs slowly and steadily ----
  float climb=0.5+0.5*sin(t*0.055+phase*0.3);          // 0..1 slow rise/fall
  float sunY=mix(-0.55,0.18,smoothstep(0.0,1.0,climb)); // low to high
  vec2 sc=vec2(0.0,sunY);
  float horizon=-0.46;

  vec2 d=uv-sc;
  float r=length(d);
  float ang=atan(d.y,d.x);

  // ---- flowing / warping dusk sky (domain warp) ----
  vec2 q=uv;
  q+=0.20*vec2(
    fbm(uv*1.5+vec2(t*0.045*dir, t*0.030)),
    fbm(uv*1.5+vec2(5.2-t*0.025, t*0.050))
  );
  float flow=fbm(q*2.1+vec2(t*0.05*dir,-t*0.028));
  float band=fbm(uv*vec2(0.9,3.2)+vec2(t*0.02*dir, t*0.06));

  float dayLight=smoothstep(-0.6,0.4,sunY); // brighter sky as sun rises

  // deep night base -> warm dusk near horizon/sun: WIDE value range
  vec3 deep =vec3(0.015,0.020,0.045);                 // near-black indigo
  vec3 mids =vec3(0.10,0.06,0.14);
  vec3 ember=mix(vec3(0.45,0.13,0.05),vec3(0.85,0.38,0.08),flow); // warm dusk
  ember=mix(ember, ember.zyx, palShift);              // seeded hue tilt

  float vGrad=smoothstep(0.9,-0.4,uv.y);              // warmth pools low
  vec3 col=mix(deep,mids,smoothstep(-0.2,0.9,uv.y+flow*0.25));
  col=mix(col,ember,vGrad*mix(0.35,0.7,dayLight));
  col+=0.06*band*vec3(0.6,0.3,0.1)*dayLight;          // streaked cloud glow

  // ground/earth below horizon: rich dark
  float ground=smoothstep(0.02,-0.02,uv.y-horizon);
  vec3 earth=mix(vec3(0.05,0.03,0.02),vec3(0.12,0.07,0.04),fbm(uv*3.0+vec2(0.0,t*0.02)));
  col=mix(col,earth,ground);

  // ---- the rising sun: bright core, warm halo (strong contrast) ----
  vec3 sunIn =vec3(1.0,0.97,0.82);
  vec3 sunMid=vec3(1.0,0.78,0.30);
  vec3 sunOut=vec3(1.0,0.50,0.12);
  sunOut=mix(sunOut,sunOut.zyx,palShift*0.6);

  float disc=smoothstep(0.27,0.0,r);
  float rim =smoothstep(0.30,0.24,r)-smoothstep(0.24,0.20,r);
  float halo=smoothstep(1.15,0.16,r);
  float glow=smoothstep(0.55,0.0,r);

  // halo bleeds into the sky, gated by being above earth
  float visible=1.0-ground;
  col=mix(col,sunOut,halo*0.45*visible);
  col=mix(col,sunMid,glow*0.55*visible);
  vec3 discCol=mix(sunMid,sunIn,smoothstep(0.27,0.0,r));
  col=mix(col,discCol,disc*visible);
  col+=rim*sunIn*0.6*visible;

  // ---- turning sun rays (two interleaved sets), slow ----
  float rayRot=t*0.06*dir + spinSeed*1.5;
  float rays=0.0;
  for(int i=0;i<2;i++){
    float fi=float(i);
    float n=mix(16.0,24.0,fi);
    float a2=ang+rayRot*(1.0-fi*0.4)+fi*0.20+phase*0.1;
    float beam=pow(0.5+0.5*cos(a2*n), mix(7.0,4.0,fi));
    float fall=smoothstep(1.10,0.20,r)*smoothstep(0.10,0.42,r);
    rays+=beam*fall*mix(0.55,0.30,fi);
  }
  col+=rays*sunIn*0.9*visible;

  // (Adinkra altar figures removed per art direction — pure sunrise + rays)

  // ---- horizon line catches the light ----
  float hz=smoothstep(0.010,0.0,abs(uv.y-horizon));
  col+=hz*sunMid*0.30*dayLight;

  // ---- subtle grain ----
  float g=hash2(gl_FragCoord.xy+floor(t*20.0))*0.05-0.025;
  col+=g*0.6;

  // ---- vignette + gamma for depth ----
  float vig=smoothstep(1.6,0.35,length(uv*vec2(0.85,1.0)));
  col*=mix(0.55,1.05,vig);
  col=pow(max(col,0.0),vec3(0.90));

  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### regret-ascii-echo.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-ascii-echo",
  name: "ASCII Echo",
  description: "Rings of luminous ASCII glyphs ripple outward from a quiet source, each echo dimmer than the last yet never quite vanishing — faint character-ghosts lingering on a slow, warping indigo dark, the residue of words you cannot take back.",
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
```

### regret-broken-thread.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-broken-thread",
  name: "Broken Thread",
  description: "The red thread of fate pulled taut, then slowly fraying — a torn gap opening at its heart, strands fanning apart and fibers drifting off into deep indigo: the quiet ache of a bond come undone.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float n){
  n=fract(n*0.1031);
  n*=n+33.33;
  n*=n+n;
  return fract(n);
}

float hash21(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}

float vnoise(vec2 p){
  vec2 i=floor(p);
  vec2 f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  float a=hash21(i+vec2(0.0,0.0));
  float b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0));
  float d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}

float fbm(vec2 p){
  float v=0.0;
  float amp=0.5;
  for(float i=0.0;i<5.0;i++){
    v+=amp*vnoise(p);
    p=p*1.92+vec2(13.1,7.3);
    amp*=0.55;
  }
  return v;
}

// soft glow falloff for a horizontal filament at height baseY
float filament(float y, float baseY, float thick){
  float dy=y-baseY;
  return thick/(abs(dy)+thick);
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

  float t=u_time*0.126;

  // ---- seed gating: u_unique==0 -> canonical; ==1 -> seed variation ----
  float seed=u_seed*u_unique;
  float ph=seed*6.2831853;
  float dir=mix(1.0,sign(hash11(seed*3.17+1.0)-0.5),u_unique);
  float palShift=(hash11(seed*5.31+2.0)-0.5)*0.10*u_unique;
  float baseAngle=(hash11(seed*7.91+3.0)-0.5)*0.42*u_unique;
  float lifeOff=hash11(seed*2.13+4.0)*6.2831853*u_unique;

  // gentle global tilt of the whole composition
  vec2 rot=vec2(cos(baseAngle),sin(baseAngle));
  vec2 p=vec2(uv.x*rot.x-uv.y*rot.y, uv.x*rot.y+uv.y*rot.x);

  // ---- flowing, domain-warped indigo background (still water at dusk) ----
  vec2 warp;
  warp.x=fbm(p*1.20+vec2(t*0.55,ph));
  warp.y=fbm(p*1.20+vec2(-t*0.45+5.2,ph+2.0));
  vec2 wp=p+(warp-0.5)*0.62;

  float field=fbm(wp*1.55+vec2(t*0.28,t*0.18+ph));
  field+=0.5*fbm(wp*3.20-vec2(t*0.22,ph));
  field=field/1.5;

  // slow drifting horizontal currents, like silk suspended in still water
  float silk=0.5+0.5*sin(p.y*5.0+fbm(wp*2.0+t*0.4)*4.0-t*1.1);
  field=mix(field,field*0.7+silk*0.3,0.32);

  vec3 indigo=vec3(0.060,0.092,0.172);
  vec3 indigoDeep=vec3(0.012,0.022,0.054);
  vec3 col=mix(indigoDeep,indigo,clamp(field*0.95+0.08,0.0,1.0));

  // depth vignette + soft central lift, widening the value range
  float vig=1.0-0.64*dot(uv,uv);
  col*=clamp(vig,0.0,1.0);
  col+=indigo*0.16*pow(max(0.0,1.0-length(uv*vec2(0.62,1.05))),2.2);

  // ---- the red thread of fate ----
  vec3 crimson=vec3(0.910,0.168,0.246);
  crimson.r=clamp(crimson.r+palShift,0.0,1.0);
  crimson.b=clamp(crimson.b-palShift*0.4,0.0,1.0);

  // LIFECYCLE: 0 = single taut thread, 1 = fully frayed & drifted, then re-knits
  float cyc=0.5-0.5*cos(t*0.40+lifeOff);   // 0..1..0 slow breathing
  float fray=smoothstep(0.04,0.96,cyc);    // unraveling amount
  float part=smoothstep(0.30,1.00,cyc);    // strands fanning apart
  float ember=smoothstep(0.55,1.00,cyc);   // late-stage scattering

  float thread=0.0;
  float glow=0.0;

  // 7 strands: at fray=0 they collapse onto one line; as fray rises they separate
  for(float i=0.0;i<7.0;i++){
    float fi=i/6.0;
    float strand=(fi-0.5)*2.0;          // -1..1 across the bundle

    // vertical separation grows with fraying, fanning out toward one side
    float spread=part*strand*0.30*dir;
    float fan=part*part*strand*0.24*dir;

    // organic wobble that increases as the strand loosens
    float wob=fbm(vec2(p.x*1.6+t*0.5+strand*3.0, i*2.3+ph))-0.5;
    float ripple=sin(p.x*2.6+t*1.0+strand*4.0+i)*0.045;

    float baseY=spread+fan*p.x;
    baseY+=wob*(0.05+0.34*fray*abs(strand))+ripple;
    baseY+=0.05*sin(p.x*3.4-t*0.85+i*1.7);

    // the thread snaps near the centre: a torn gap opens with fraying
    float tornGap=smoothstep(0.0,0.7,fray)*0.20*(0.4+0.6*abs(strand));
    float tear=1.0-tornGap*exp(-p.x*p.x*9.0);

    float thick=0.013+0.011*(1.0-abs(strand))*(1.0-fray*0.45);

    // ends fade off-screen; broken ends fade harder as it frays
    float fade=smoothstep(1.45,0.55,abs(p.x));
    float endFade=1.0-fray*0.55*smoothstep(0.10,1.0,abs(p.x));

    float core=filament(p.y,baseY,thick);
    core=pow(core,2.5)*fade*endFade*tear;
    core*=1.0-abs(strand)*0.60*fray;     // outer strands dim as they wander

    thread+=core;
    glow+=filament(p.y,baseY,thick*2.7)*0.16*fade*endFade;
  }

  // ---- drifting freed fibers (short curved filaments pulling away) ----
  float fibers=0.0;
  for(float j=0.0;j<6.0;j++){
    float fj=hash11(j*4.7+1.0);
    float sgn=mix(1.0,sign(fj-0.5),u_unique); // canonical: all drift same way
    float fx=hash11(j*9.1+ph)*2.0-1.0;
    float life2=fract(t*0.33+fj+ph*0.3);

    // fibers appear once fraying begins and drift outward over their life
    float px=fx*0.26+sgn*life2*1.5*dir;
    float py=(fj-0.5)*0.55+sgn*life2*0.55;
    py+=fbm(vec2(j*3.0+t*0.6,ph))*0.30-0.15;

    vec2 fp=p-vec2(px,py);
    float ang=fj*6.2831853+t*0.4*sgn;
    vec2 fr=vec2(cos(ang),sin(ang));
    vec2 lp=vec2(fp.x*fr.x-fp.y*fr.y, fp.x*fr.y+fp.y*fr.x);

    float len=0.09+fj*0.07;
    float seg=smoothstep(len,0.0,abs(lp.x));
    float fth=0.006;
    float fcore=pow(filament(lp.y,0.0,fth),2.0)*seg;

    float appear=sin(life2*3.14159)*fray;
    fibers+=fcore*appear*0.95;
  }

  // ---- late embers: scattered glints of the lost thread ----
  float spark=0.0;
  for(float k=0.0;k<4.0;k++){
    float fk=hash11(k*6.3+ph+1.0);
    float lifeK=fract(t*0.45+fk);
    vec2 sp=vec2((fk*2.0-1.0)*0.95+(lifeK-0.5)*0.5*dir,(hash11(k*2.1+ph)*2.0-1.0)*0.70);
    float d=length(p-sp);
    spark+=(0.0014/(d*d+0.0014))*sin(lifeK*3.14159)*ember*0.6;
  }

  // ---- composite: strong red against indigo ----
  float redMask=clamp(thread+fibers*0.90+spark*0.55,0.0,1.4);
  float glowMask=clamp(glow+fibers*0.30+spark*0.25,0.0,1.0);

  col+=crimson*glowMask*0.50;
  col=mix(col,crimson,clamp(redMask,0.0,1.0));
  col+=crimson*pow(clamp(redMask,0.0,1.0),3.0)*0.65;

  // bright silk highlight on the intact core -> deep shadow-to-highlight range
  float hi=pow(clamp(thread,0.0,1.0),5.0);
  col+=vec3(1.0,0.80,0.78)*hi*0.55;

  // faint reflection of red bleeding into the surrounding water
  float bleed=clamp(redMask,0.0,1.0);
  col+=crimson*0.06*fbm(p*3.0+t*0.5)*bleed;

  // subtle film grain
  float grain=hash21(gl_FragCoord.xy+vec2(t*60.0))-0.5;
  col+=grain*0.022;

  // gentle filmic lift + contrast push
  col=pow(max(col,0.0),vec3(0.90));
  col=(col-0.5)*1.10+0.5;

  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### regret-sankofa.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-sankofa",
  name: "Sankofa",
  description: "The Sankofa bird turns its head back to fetch the fallen egg while light travels the crossroads — go back and reclaim what was left.",
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
    p *= p+33.33;
    p *= p+p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 q = fract(vec3(p.xyx)*0.1031);
    q += dot(q, q.yzx+33.33);
    return fract((q.x+q.y)*q.z);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    for(float i=0.0;i<5.0;i++){
        v += amp*noise(p);
        p = p*1.92 + vec2(11.3,7.7);
        amp *= 0.52;
    }
    return v;
}

float sdSegment(vec2 p, vec2 a, vec2 b){
    vec2 pa = p-a;
    vec2 ba = b-a;
    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
    return length(pa - ba*h);
}

float sdCircle(vec2 p, vec2 c, float r){
    return length(p-c)-r;
}

mat2 rot(float a){
    float s = sin(a);
    float c = cos(a);
    return mat2(c,-s,s,c);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    // ---- seed gating: u_unique==0 -> canonical, ==1 -> varied ----
    float seed   = u_seed*u_unique;
    float sh     = hash11(seed+3.17);
    float palShift = (sh-0.5)*0.55*u_unique;
    float travel = mix(1.0, sign(hash11(seed+9.4)-0.5), u_unique);
    float t = u_time*0.119;

    // ---- flowing, warping background (domain warp) ----
    vec2 p = uv;
    p *= rot((0.10*sin(t*0.6) + seed*0.25)*u_unique);

    vec2 q = vec2(
        fbm(p*1.25 + vec2(0.0, t*0.45*travel) + seed),
        fbm(p*1.25 + vec2(5.2,-t*0.38) + seed*1.7)
    );
    vec2 r2 = vec2(
        fbm(p*1.6 + 2.3*q + vec2(1.7,9.2) - t*0.28*travel),
        fbm(p*1.6 + 2.3*q + vec2(8.3,2.8) + t*0.24)
    );
    float current = fbm(p*1.05 + 3.0*r2 + vec2(t*0.55*travel,-t*0.2));
    vec2 wp = p + (r2-0.5)*0.5;

    // ---- duotone palette: deep indigo shadow -> bright gold highlight ----
    vec3 abyss  = vec3(0.018,0.030,0.072);
    vec3 indigo = vec3(0.055,0.105,0.230);
    vec3 ocean  = vec3(0.075,0.235,0.395);
    vec3 gold   = vec3(0.905,0.690,0.255);
    vec3 goldHi = vec3(1.000,0.930,0.640);

    indigo.b += palShift*0.10;
    ocean.g  += palShift*0.06;

    vec3 col = mix(abyss, indigo, smoothstep(0.10,0.95,current));
    col = mix(col, ocean, smoothstep(0.55,0.98,current)*0.50);

    // moving caustic bands in the cloth
    float band = sin((wp.x*1.5 - wp.y*0.8)*3.0 + current*6.0 + t*1.1*travel);
    col += ocean*0.10*smoothstep(0.35,1.0,band)*current;

    float centerLift = smoothstep(1.35,0.05,length(uv));
    col *= 0.42 + 0.62*centerLift;

    // ---- crossroads paths (drawn beneath the bird, light travels along them) ----
    float pathW = 0.020;
    float roadGlow = 0.0;
    float roadFill = 0.0;
    for(float i=0.0;i<4.0;i++){
        float ang = (i/4.0)*3.14159 - 1.5708
                  + 0.18*sin(t*0.45 + i*2.1)
                  + seed*0.6*u_unique;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 a = vec2(0.0,-0.10);
        vec2 b = dir*1.7 + vec2(0.0,-0.10);
        float d = sdSegment(wp, a, b);
        float along = clamp(dot(wp-a, dir)/1.7, 0.0, 1.0);
        // a single bright pulse running outward, then back (return & fetch)
        float phase = fract(t*0.9*travel - i*0.21);
        float head = exp(-pow((along - phase)*7.5, 2.0));
        roadFill += smoothstep(pathW, 0.0, d);
        roadGlow += smoothstep(pathW*1.6, 0.0, d)*head;
    }

    // ---- the Sankofa bird (looking back to fetch the egg) ----
    vec2 cp = wp;
    // gentle sway; canonical orientation when u_unique==0
    cp *= rot(0.10*sin(t*0.5) + seed*0.35*u_unique);

    float beat     = 0.5+0.5*sin(t*0.9);          // breathing
    float lookBack = 0.18*sin(t*0.5)+0.18;        // head turning back

    float gscale = 1.45;
    vec2 g = cp*gscale + vec2(0.0, 0.18);

    // body: curved S-form (the iconic arched back)
    float bodyA = sdCircle(g, vec2(0.02,-0.02), 0.44);
    float bodyB = sdCircle(g, vec2(-0.04,-0.34), 0.27);
    float body  = min(bodyA, bodyB);
    body = max(body, -sdCircle(g, vec2(0.34,0.20), 0.30)); // scoop the chest open

    // neck + head reaching backward over the body
    vec2 neckTop = vec2(-0.22 - 0.06*beat, 0.44);
    float neck = sdSegment(g, vec2(-0.02,0.16), neckTop) - 0.075;

    vec2 hp = g - neckTop;
    hp *= rot(-0.55 - lookBack);
    float head = sdCircle(hp, vec2(0.0,0.0), 0.150);
    head = min(head, neck);

    // beak pointing back+down toward the egg
    vec2 bk = hp - vec2(0.0,0.01);
    bk *= rot(2.45);
    float beak = sdSegment(bk, vec2(0.0,0.0), vec2(0.0,0.30))
               - (0.050 - 0.12*clamp(bk.y/0.30,0.0,1.0));
    head = min(head, beak);

    // folded wing
    vec2 ep = g - vec2(0.16,0.04);
    ep *= rot(-0.45);
    float wing = sdSegment(ep, vec2(0.0,0.0), vec2(0.0,0.55))
               - (0.17 - 0.22*clamp(ep.y/0.55,0.0,1.0));

    // long tail sweeping down/forward
    vec2 tp = g - vec2(0.16,-0.30);
    tp *= rot(0.45 + 0.12*sin(t*0.8));
    float tail = sdSegment(tp, vec2(0.0,0.0), vec2(0.0,0.62))
               - (0.15 - 0.16*clamp(tp.y/0.62,0.0,1.0));

    float bird = min(min(body, head), min(wing, tail));

    // the egg it returns to fetch — pulses with life, sits below the beak
    vec2 beakTip = neckTop + rot(-0.55 - lookBack)*vec2(0.0,-0.34);
    vec2 eggC = beakTip + vec2(0.04, -0.16);
    float eggPulse = 0.5+0.5*sin(t*1.4);
    float egg = sdCircle(g, eggC, 0.058 + 0.012*eggPulse);

    float aa = 2.5/u_resolution.y;

    // gate crossroads to outside the bird and below it
    roadFill *= smoothstep(-0.02,-0.18, bird);
    roadGlow *= smoothstep(-0.02,-0.18, bird);
    col += gold*roadFill*0.18;
    col += goldHi*roadGlow*0.9;
    col += gold*roadGlow*roadGlow*0.5;

    // bird shading: bright duotone gold against deep indigo cloth
    float edge  = smoothstep(aa, -aa, bird);
    float rim   = smoothstep(0.05, 0.0, abs(bird));
    float inner = smoothstep(0.0,-0.24, bird);

    // adinkra-like surface pattern inside the body
    float patternA = sin(g.x*22.0 + g.y*9.0 + t*1.2*travel)*0.5+0.5;
    float patternB = sin(length(g)*28.0 - t*1.8)*0.5+0.5;
    float adinkra  = mix(patternA, patternB, 0.5);

    vec3 birdCol = mix(gold, goldHi, 0.35+0.55*adinkra*inner);
    birdCol = mix(birdCol, indigo*0.6, 0.18*inner); // interior depth for contrast

    col = mix(col, birdCol, edge);
    col += goldHi*rim*0.7*(0.55+0.45*beat);

    // the egg: brightest point in the frame, a beacon to return to
    float eggM   = smoothstep(aa, -aa, egg);
    float eggHalo= exp(-length(g-eggC)*7.0);
    col = mix(col, goldHi, eggM);
    col += goldHi*eggHalo*(0.30+0.30*eggPulse);

    // ---- atmosphere ----
    float dust = noise(uv*55.0 + t*4.0);
    col += (dust-0.5)*0.022;

    float spark = pow(max(noise(uv*7.0 - t*0.3*travel),0.0), 6.0);
    col += gold*spark*0.45*centerLift;

    float vig = smoothstep(1.55,0.32,length(uv*vec2(0.94,1.0)));
    col *= 0.30 + 0.80*vig;

    col = pow(col, vec3(0.90));
    col *= 1.06;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
```

### regret-undertow-halftone.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-undertow-halftone",
  name: "Undertow Halftone",
  description: "A field of halftone dots is dragged down a slow spiraling undertow — marks born bright at the rim, stretched, swallowed into a dark vortex, then surfacing again: regret circling and circling.",
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
`,
};
export default def;
```

### regret-willow-rain.ts
```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-willow-rain",
  name: "Willow Rain",
  description: "A weeping willow's strands reach and recoil through a slow curtain of rain, beads streaming down to ripple on dark water — a longing that keeps reaching and never arrives.",
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

float noise(vec2 p){
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
  float a = 0.5;
  for(float i = 0.0; i < 5.0; i++){
    v += a * noise(p);
    p = p * 2.02 + vec2(11.3, 7.7);
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  float t = u_time * 0.196;

  // ---- seed variation, fully gated by u_unique (u_unique==0 -> canonical) ----
  float seed = u_seed * u_unique;
  float palShift = (0.5 + 0.5 * sin(seed * 6.2831)) * u_unique;
  float dir = mix(1.0, sign(hash11(seed + 3.1) - 0.5), u_unique);
  float windPhase = seed * 5.0;
  float canopyX = (0.45 * sin(seed * 2.0) - 0.10) * u_unique;

  // slow "longing" breath shared by motion + light (0..1..0)
  float breath = 0.5 - 0.5 * cos(t * 0.45 + windPhase * 0.3);

  // ---- palette: deep indigo -> teal-ocean -> pale silver rain ----
  vec3 indigoDeep = vec3(0.020, 0.035, 0.085);
  vec3 indigo     = vec3(0.055, 0.090, 0.180);
  vec3 ocean      = vec3(0.150, 0.470, 0.690);
  vec3 rainCol    = vec3(0.760, 0.910, 0.965);
  // gated hue drift for variation
  ocean = mix(ocean, vec3(0.230, 0.430, 0.730), palShift * 0.5);

  // ---- flowing, domain-warped background mist ----
  vec2 w1;
  w1.x = fbm(uv * 1.20 + vec2(t * 0.30 * dir, -t * 0.40) + windPhase);
  w1.y = fbm(uv * 1.20 + vec2(-t * 0.22 + 4.0, t * 0.18 + windPhase + 2.0));
  vec2 wuv = uv + (w1 - 0.5) * 0.55;

  float depth = fbm(wuv * 1.9 + vec2(t * 0.10, t * 0.06));
  depth += 0.5 * fbm(wuv * 4.0 - vec2(t * 0.14, windPhase));
  depth /= 1.5;

  float sky = smoothstep(-1.25, 1.15, uv.y);
  vec3 col = mix(indigoDeep, indigo, sky);
  col = mix(col, ocean * 0.32, depth * 0.55);

  // slow vertical light shaft behind the tree, swelling with the breath
  float shaftX = uv.x + 0.22 * sin(t * 0.5) + canopyX * 0.5;
  float godray = pow(max(0.0, 1.0 - abs(shaftX) * 0.65), 3.0);
  col += ocean * 0.16 * godray * (0.45 + 0.55 * breath);

  // ---- wind: graceful coupled sway driving every strand ----
  float swayBase = sin(uv.y * 1.4 + t * 0.85 + windPhase) * 0.20
                 + sin(uv.y * 3.1 - t * 0.55) * 0.075;
  float gust = fbm(vec2(uv.y * 0.55 - t * 0.28, t * 0.20 + windPhase)) - 0.5;
  float sway = (swayBase + gust * 0.55) * dir;

  // ---- weeping willow strands hanging from the canopy ----
  float willow = 0.0;
  float glow = 0.0;
  float hi = 0.0;
  for(float i = 0.0; i < 14.0; i++){
    float fi = i / 13.0;
    float sx = (fi - 0.5) * 2.6 + canopyX;
    float h = hash11(i * 1.7 + 1.0 + floor(seed * 7.0));
    float originY = 1.12;
    // strands grow/retract slowly: longing reaching, never arriving
    float reach = mix(0.78, 1.0, 0.5 + 0.5 * sin(t * 0.30 + i * 0.7 + windPhase));
    float tipY = mix(originY, -1.05, reach);
    float localSway = sway * (0.50 + 0.95 * h);
    float curl = sin(uv.y * 5.5 + i * 1.9 + t * 0.8) * 0.022;
    float strandX = sx
                  + localSway * (originY - uv.y) * 0.55
                  + curl;
    float fall = clamp((originY - uv.y) / 2.2, 0.0, 1.0);
    float wdt = 0.009 + 0.013 * fall;
    float d = abs(uv.x - strandX);
    float strand = smoothstep(wdt, 0.0, d);
    float topMask = smoothstep(1.22, 0.62, uv.y);
    float tipFade = smoothstep(tipY - 0.10, tipY + 0.45, uv.y);
    // rain beads travelling down each strand (visible lifecycle / travel)
    float beadPhase = uv.y * 26.0 - t * 2.6 + h * 20.0 + i * 3.0;
    float beads = pow(0.5 + 0.5 * sin(beadPhase), 6.0);
    float body = strand * topMask * (0.35 + 0.65 * tipFade);
    willow = max(willow, body * (0.62 + 0.38 * beads));
    glow = max(glow, smoothstep(wdt * 4.0, 0.0, d) * topMask * (0.35 + 0.65 * tipFade));
    // bright bead specular for deep value range
    hi = max(hi, smoothstep(wdt * 0.6, 0.0, d) * topMask * tipFade * beads);
  }

  vec3 leafCol = mix(ocean, rainCol, 0.28 + 0.30 * palShift);
  col = mix(col, leafCol * 0.85, willow * 0.92);
  col += rainCol * willow * 0.22;
  col += leafCol * glow * 0.14;
  col += rainCol * hi * 0.85;

  // dense canopy crown above, breathing softly
  float canopy = smoothstep(0.52, 1.22, uv.y);
  float blob = fbm(vec2(uv.x * 2.4 - canopyX, uv.y * 1.9) + t * 0.10);
  col = mix(col, ocean * (0.55 + 0.15 * breath), canopy * blob * 0.50);

  // ---- falling rain: slow, slanted, layered curtain ----
  float rain = 0.0;
  for(float i = 0.0; i < 6.0; i++){
    float fi = i;
    float slant = 0.085 * dir;
    vec2 ruv = uv;
    ruv.x += slant * ruv.y;
    ruv.x += (w1.x - 0.5) * 0.12;
    float scale = 9.0 + fi * 5.0;
    float speed = 1.0 + fi * 0.32;
    float colX = floor(ruv.x * scale + fi * 13.0);
    float colRand = hash11(colX + fi * 31.0 + floor(seed * 9.0));
    float yy = ruv.y * scale - t * speed * (4.0 + colRand * 3.0) - colRand * 50.0;
    float cell = fract(yy);
    float streak = smoothstep(0.5, 0.0, abs(fract(ruv.x * scale) - 0.5) * 2.0);
    float drop = smoothstep(0.0, 0.15, cell) * smoothstep(0.85, 0.30, cell);
    float layer = streak * drop * (0.20 + 0.14 * colRand);
    float fade = smoothstep(1.30, 0.10, abs(uv.x));
    rain += layer * fade / (1.0 + fi * 0.40);
  }
  col += rainCol * rain;

  // ---- water surface: expanding ripples + shimmering reflection ----
  float ripY = -0.58;
  float ripple = 0.0;
  if(uv.y < ripY + 0.06){
    float rd = (ripY - uv.y);
    ripple = sin(uv.x * 11.0 + t * 3.0 + w1.x * 4.0) * sin(rd * 16.0 - t * 2.2);
    ripple = max(0.0, ripple) * smoothstep(-1.05, ripY, uv.y) * 0.18;
  }
  col += rainCol * ripple;

  float refl = 0.0;
  if(uv.y < ripY){
    float rx = uv.x + sin(uv.x * 7.0 + t * 1.8) * 0.025 + canopyX * 0.3;
    float band = abs(fract(rx * 2.8 + 0.5) - 0.5) - 0.02;
    refl = smoothstep(0.06, 0.0, band);
    refl *= smoothstep(-1.05, ripY, uv.y) * 0.14;
  }
  col += ocean * refl;
  col = mix(col, indigoDeep, smoothstep(ripY, -1.18, uv.y) * 0.50);

  // ---- finishing: vignette, grain, contrast ----
  float vig = 1.0 - dot(uv, uv) * 0.26;
  col *= clamp(vig, 0.0, 1.0);

  float grain = (hash21(gl_FragCoord.xy + t) - 0.5) * 0.035;
  col += grain;

  // push wide value range for strong contrast
  col = pow(max(col, 0.0), vec3(0.88));
  col = (col - 0.5) * 1.18 + 0.5;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
```

---

## Liquid Aurora + Love cultural set (excerpt from src/app/data/shaders.ts)

```ts
// ─── GRIEF — Liquid Aurora (original: recursive domain warp + caustic filaments) ──
const griefLiquidAurora: ShaderDef = {
  id: "grief-liquid-aurora",
  name: "Liquid Aurora",
  description: "Silk-like currents of sorrow folding endlessly into themselves.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*vnoise(p); p=p*2.02+vec2(1.7,9.2); a*=0.5; } return v; }
// Grief palette: off-black → dirty purple → grey → pale lilac
vec3 aurora(float t){ t=fract(t);
  vec3 c0=vec3(0.05,0.04,0.07), c1=vec3(0.29,0.24,0.37), c2=vec3(0.48,0.48,0.50), c3=vec3(0.78,0.74,0.86);
  if(t<0.33) return mix(c0,c1,t/0.33);
  if(t<0.66) return mix(c1,c2,(t-0.33)/0.33);
  return mix(c2,c3,(t-0.66)/0.34);
}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
  float t=u_time*0.16 + u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.6+vec2(0.0,t)), fbm(uv*1.6+vec2(5.2,-t)));
  vec2 r=vec2(fbm(uv*1.6+2.4*q+vec2(1.7,9.2)+t*0.5), fbm(uv*1.6+2.4*q+vec2(8.3,2.8)-t*0.5));
  float f=fbm(uv*1.6+3.0*r);
  float band=0.5+0.5*sin((f*5.0 + length(r)*3.0 - t*2.0)*3.14159);
  vec3 col=aurora(f + length(r)*0.25 + t*0.1);
  float fil=smoothstep(0.0,0.04,abs(r.x-r.y));
  col += aurora(f+0.5)*(1.0-fil)*0.5;
  col *= 0.35 + 0.75*band;
  col += vec3(0.82,0.80,0.92)*pow(band,8.0)*0.45;
  vec3 bg=vec3(0.03,0.025,0.045);
  col=mix(bg,col,smoothstep(0.05,0.6,f+band*0.3));
  col*=smoothstep(1.7,0.2,length(uv));
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

// ─── LOVE — cultural set (Africa · Japan · China), flowing bg + lifecycle motion ──
const LOVE_HEAD = `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution; uniform float u_time; uniform float u_seed; uniform float u_unique;
#define TAU 6.2831853
#define WINE vec3(0.34,0.03,0.12)
#define CRIM vec3(0.88,0.10,0.32)
#define ROSE vec3(1.0,0.46,0.62)
#define BLUSH vec3(1.0,0.80,0.86)
#define GOLD vec3(1.0,0.84,0.42)
#define CREAM vec3(1.0,0.96,0.90)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.02; a*=0.5; } return v; }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
`;

const lovePeonyGarden: ShaderDef = {
  id: "love-peony-garden",
  name: "Peony Garden",
  description: "A courtyard of peonies sprouting, opening and folding closed — Chinese 牡丹, love and abundance.",
  glsl: LOVE_HEAD + `
float lobe(vec2 p,float w,float h){ p.y-=h*0.1; float d=length(vec2(p.x/w,p.y/h)); return smoothstep(1.0,0.84,d)*smoothstep(-h,h*0.3,p.y); }
float peony(vec2 p,float open){ float cover=0.0; for(float ring=0.0;ring<3.0;ring++){ float N=5.0+ring*3.0; float sc=1.0-ring*0.22; float ro=ring*0.5;
  for(float i=0.0;i<11.0;i++){ if(i>=N) break; float ang=i/N*TAU+ro; vec2 q=rot(-ang)*p; q.y-=sc*0.30*open; cover=max(cover,lobe(q,sc*0.13*(0.35+0.65*open),sc*0.30)); } } return cover; }
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.4+t*0.1+sv),fbm(uv*1.4+vec2(3.0,1.0)-t*0.09)); float n=fbm(uv*1.4+1.3*q+t*0.05);
  vec3 col=mix(WINE*0.5,CRIM*0.5,n); col=mix(col,ROSE*0.5,smoothstep(0.6,0.92,n)*0.4);
  vec2 cells=vec2(2.4,3.0); vec2 g=uv*cells; vec2 id=floor(g); vec2 f=fract(g)-0.5; float h=hash(id+sv);
  float dir=mix(1.0,sign(hash(id+1.7)-0.5),u_unique);
  float c=fract(t*0.22*dir+h); float sprout=smoothstep(0.0,0.16,c)*(1.0-smoothstep(0.84,1.0,c));
  float open=clamp(smoothstep(0.16,0.42,c)*(1.0-smoothstep(0.62,0.9,c))+0.12,0.0,1.0);
  float rr=length(f*2.4); float bloom= sprout>0.03 ? peony(f*2.4/sprout,open) : 0.0;
  vec3 petal=mix(ROSE,CRIM,smoothstep(0.1,0.6,rr)); petal=mix(GOLD,petal,smoothstep(0.0,0.2,rr));
  col+=ROSE*exp(-rr*rr*3.0)*0.18*sprout; col=mix(col,petal,bloom*0.95); col+=GOLD*exp(-rr*rr*18.0)*sprout*open*1.1;
  col*=smoothstep(1.7,0.25,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

const loveSakuraField: ShaderDef = {
  id: "love-sakura-field",
  name: "Sakura Drift",
  description: "Cherry blossoms drifting on dusk air — Japanese 桜, the tenderness of fleeting things.",
  glsl: LOVE_HEAD + `
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.4; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.2+t*0.08+sv),fbm(uv*1.2-t*0.07)); float n=fbm(uv*1.2+1.2*q);
  vec3 col=mix(vec3(0.13,0.02,0.08),vec3(0.46,0.16,0.30),(uv.y+1.0)*0.5+n*0.2);
  float dir=mix(1.0,sign(hash(vec2(7.0))-0.5+sv),u_unique);
  vec2 g=uv*3.0; g.y+=t*0.55*dir; g.x+=sin(g.y*1.3+t)*0.35; vec2 id=floor(g),f=fract(g)-0.5; float h=hash(id+sv);
  f=rot(h*TAU+t*0.7)*f; float pr=length(f),pa=atan(f.y,f.x); float shape=0.30+0.05*cos(pa*5.0); float notch=1.0-0.5*pow(max(0.0,cos(pa*5.0+3.14159)),6.0);
  float petal=smoothstep(0.025,0.0,pr-shape*notch); vec3 pink=mix(ROSE,BLUSH,h); float core=smoothstep(0.06,0.0,pr)*step(0.35,h);
  col=mix(col,pink,petal*step(0.35,h)); col=mix(col,CRIM,core*0.6); col+=CREAM*petal*step(0.35,h)*0.12;
  col*=smoothstep(1.6,0.2,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

const loveHalftoneHeart: ShaderDef = {
  id: "love-halftone-heart",
  name: "Halftone Heart",
  description: "A heart resolving out of a field of dots — print-room halftone, love made of small marks.",
  glsl: LOVE_HEAD + `
float heartIn(vec2 uv,float s){ vec2 hp=uv*s; hp.y=-hp.y-0.2; float e=pow(hp.x*hp.x+hp.y*hp.y-1.0,3.0)-hp.x*hp.x*hp.y*hp.y*hp.y; return smoothstep(0.06,-0.06,e); }
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  float field=fbm(uv*1.5+t*0.2+sv); float inside=heartIn(uv,1.4);
  vec2 cell=fract(uv*12.0)-0.5; float pulse=0.5+0.5*sin(length(uv)*6.0-t*3.0);
  float sz=0.08+(field*0.45+inside*0.5+pulse*0.1)*0.45; float dot=smoothstep(sz,sz-0.07,length(cell));
  vec3 base=mix(ROSE,CRIM,field); base=mix(base,GOLD,inside*0.5);
  vec3 col=mix(WINE*0.3,base,dot); col*=smoothstep(1.6,0.3,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

const loveAsciiHeart: ShaderDef = {
  id: "love-ascii-heart",
  name: "ASCII Heart",
  description: "Glyph characters raining into the shape of a heart — a love letter typed by the machine.",
  glsl: LOVE_HEAD + `
float heartIn(vec2 uv,float s){ vec2 hp=uv*s; hp.y=-hp.y-0.2; float e=pow(hp.x*hp.x+hp.y*hp.y-1.0,3.0)-hp.x*hp.x*hp.y*hp.y*hp.y; return smoothstep(0.06,-0.06,e); }
float box(vec2 p,vec2 b){ vec2 d=abs(p)-b; return 1.0-smoothstep(0.0,0.06,length(max(d,0.0))+min(max(d.x,d.y),0.0)); }
float glyph(vec2 p,float id){ id=fract(id); float g=0.0;
  if(id<0.33){ g+=box(p,vec2(0.06,0.26)); g+=box(p-vec2(0.0,-0.26),vec2(0.15,0.06)); }
  else if(id<0.66){ g+=box(p,vec2(0.2,0.06)); g+=box(p,vec2(0.06,0.2)); }
  else { g+=box(p-vec2(-0.12,0.0),vec2(0.05,0.26)); g+=box(p-vec2(0.12,0.0),vec2(0.05,0.26)); g+=box(p,vec2(0.16,0.05)); } return clamp(g,0.,1.); }
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.4; float sv=u_seed*u_unique;
  float dir=mix(1.0,sign(hash(vec2(3.0))-0.5+sv),u_unique);
  vec2 g=uv*14.0; g.y+=t*2.0*dir; vec2 id=floor(g),cell=fract(g)-0.5; float h=hash(id+sv);
  float inside=heartIn(uv,1.4); float flow=fbm(id*0.2+t*0.2); float bright=(inside*0.8+flow*0.4)*step(0.35,h);
  float gv=glyph(cell,h+floor(t*2.0+h*8.0)*0.2); vec3 col=mix(ROSE,CREAM,flow)*gv*bright; col+=CREAM*gv*bright*step(0.9,flow)*0.6;
  col=mix(WINE*0.18,col,step(0.04,gv*bright)); col*=smoothstep(1.6,0.3,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

const loveSilkRibbon: ShaderDef = {
  id: "love-silk-ribbon",
  name: "Silk Ribbon",
  description: "Folds of crimson silk turning through the dark — the warmth of closeness, always moving.",
  glsl: LOVE_HEAD + `
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.2+t*0.1+sv),fbm(uv*1.2-t*0.08)); vec2 r=vec2(fbm(uv*1.2+2.0*q+t*0.4),fbm(uv*1.2+2.0*q+vec2(5.0)-t*0.4));
  float f=fbm(uv*1.2+2.5*r); float band=0.5+0.5*sin((f*6.0+length(r)*3.0-t*2.0)*3.14159);
  vec3 col=mix(WINE,CRIM,f); col=mix(col,ROSE,smoothstep(0.5,0.85,f)); col=mix(col,BLUSH,pow(band,3.0)*0.5); col+=CREAM*pow(band,10.0)*0.4;
  col*=smoothstep(1.7,0.2,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

```
