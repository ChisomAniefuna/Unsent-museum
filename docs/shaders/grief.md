# GRIEF — new shader code

## grief-adinkra-owuo.ts
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

## grief-ash-veil.ts
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

## grief-kintsugi.ts
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

## grief-sumie.ts
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

## griefLiquidAurora (in shaders.ts)
```ts
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
```
