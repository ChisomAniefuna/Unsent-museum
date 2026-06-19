# CLOSURE — new shader code

## closure-ascii-rain.ts
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

## closure-enso.ts
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

## closure-moon-gate.ts
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

## closure-tide-halftone.ts
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

## closure-zen-garden.ts
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

