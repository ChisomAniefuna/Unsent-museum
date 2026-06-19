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

// Owuo Atwedeɛ, the "ladder of death." Two rails, rungs, a peaked roof.
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

  // peaked roof, the apex everyone must climb toward
  vec2 ta = vec2(-0.20, hh);
  vec2 tb = vec2( 0.0, hh + 0.10);
  vec2 tc = vec2( 0.20, hh);
  float roof = min(sdSeg(p, ta, tb, thick * 0.85), sdSeg(p, tb, tc, thick * 0.85));
  ink = max(ink, bar(roof, soft));

  // small finial at the top, the rung beyond reach
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

  vec3 deep        = vec3(0.022, 0.018, 0.014);
  vec3 charcoal    = vec3(0.08, 0.065, 0.05);
  vec3 dirtyPurple = vec3(0.22, 0.16, 0.12);

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
