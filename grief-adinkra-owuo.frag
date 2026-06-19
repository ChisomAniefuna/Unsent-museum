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

float bar(float d, float w){
  return 1.0 - smoothstep(w, w + 0.025, d);
}

float ladderStamp(vec2 p, float rough){
  float thick = 0.052;
  float hh = 0.34;
  float d = 1e9;
  vec2 la = vec2(-0.20, -hh);
  vec2 lb = vec2(-0.20,  hh);
  vec2 ra = vec2( 0.20, -hh);
  vec2 rb = vec2( 0.20,  hh);
  d = min(d, sdSeg(p, la, lb, thick));
  d = min(d, sdSeg(p, ra, rb, thick));
  float m = 0.0;
  for(float i = 0.0; i < 6.0; i++){
    float t = i / 5.0;
    float y = mix(-hh, hh, t);
    float rw = thick * (0.92 - 0.20 * sin(t * 3.14159));
    float seg = sdSeg(p, vec2(-0.20, y), vec2(0.20, y), rw);
    m = max(m, bar(seg, 0.0));
  }
  float rails = max(bar(d, 0.0), m);
  vec2 ta = vec2(-0.20, hh);
  vec2 tb = vec2(0.0, hh + 0.085);
  vec2 tc = vec2(0.20, hh);
  float roof = min(sdSeg(p, ta, tb, thick * 0.9), sdSeg(p, tb, tc, thick * 0.9));
  rails = max(rails, bar(roof, 0.0));
  rails *= (0.78 + 0.22 * rough);
  return clamp(rails, 0.0, 1.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

  float seed = u_seed * u_unique;
  float dirX = mix(1.0, sign(hash11(seed + 4.7) - 0.5), u_unique);
  float dirY = mix(1.0, sign(hash11(seed + 9.1) - 0.5), u_unique);
  float palShift = hash11(seed + 2.3) * u_unique;
  float rot = (hash11(seed + 6.6) - 0.5) * 0.18 * u_unique;

  float t = u_time * 0.06;

  vec2 wuv = uv;
  float ca = cos(rot);
  float sa = sin(rot);
  wuv = mat2(ca, -sa, sa, ca) * wuv;

  vec2 warp;
  warp.x = fbm(wuv * 1.3 + vec2(t * 0.7, -t * 0.4) + seed * 3.0);
  warp.y = fbm(wuv * 1.3 + vec2(-t * 0.5 + 8.0, t * 0.6) + seed * 3.0);
  vec2 flow = wuv + (warp - 0.5) * 0.55;

  float bgN = fbm(flow * 2.2 + vec2(t * 0.4, -t * 0.3));
  float bgN2 = fbm(flow * 5.0 - vec2(t * 0.2, t * 0.25));

  vec3 charcoal = vec3(0.078, 0.071, 0.102);
  vec3 dirtyPurple = vec3(0.227, 0.188, 0.282);
  vec3 deep = vec3(0.043, 0.039, 0.063);

  vec3 col = mix(deep, charcoal, bgN);
  col = mix(col, dirtyPurple, smoothstep(0.45, 0.95, bgN) * (0.55 + 0.45 * bgN2));

  float vig = 1.0 - dot(uv, uv) * 0.28;
  col *= clamp(vig, 0.35, 1.0);

  float dust = fbm(flow * 9.0 + vec2(0.0, -t * 1.5));
  col += dirtyPurple * 0.06 * smoothstep(0.5, 1.0, dust);

  float scale = 3.6;
  vec2 gridWarp = (warp - 0.5) * 0.16;
  vec2 travel = vec2(dirX * t * 0.85, dirY * t * 0.55);
  vec2 gv = (wuv + gridWarp) * scale + travel;

  vec2 cellId = floor(gv);
  vec2 cellUv = fract(gv) - 0.5;

  float stampSum = 0.0;
  vec3 stampCol = vec3(0.0);

  vec2 nbase = sign(cellUv);
  for(float oy = 0.0; oy < 2.0; oy++){
    for(float ox = 0.0; ox < 2.0; ox++){
      vec2 off = vec2(ox, oy) * nbase;
      vec2 nId = cellId + off;
      vec2 local = cellUv - off;

      vec2 rnd = hash22(nId + seed * 11.0);
      float phase = rnd.x * 6.2831;
      float rate = 0.5 + rnd.y * 0.6;
      float wave = sin(t * 6.2831 * rate * 0.5 + phase + (nId.x * 0.6 + nId.y * 1.1));
      float life = 0.5 + 0.5 * wave;
      life = smoothstep(0.05, 0.5, life);
      float ghost = 0.16 + 0.10 * hash21(nId + 1.7);

      float jx = (hash21(nId + 5.0) - 0.5) * 0.08 * u_unique;
      float jy = (hash21(nId + 9.0) - 0.5) * 0.08 * u_unique;
      vec2 sp = local - vec2(jx, jy);

      float sca = mix(0.96, 1.05, hash21(nId + 3.3));
      sp *= sca;

      float rough = vnoise((nId + sp) * 4.0 + seed);
      float ink = ladderStamp(sp * 1.12, rough);

      float speck = step(0.6, hash21(floor((local + nId) * 11.0)));
      ink *= (0.82 + 0.18 * speck);

      float fade = ink * mix(ghost, 1.0, life);
      stampSum = max(stampSum, fade);

      vec3 bone = vec3(0.847, 0.824, 0.769);
      bone = mix(bone, bone * vec3(1.04, 0.99, 0.92), palShift);
      stampCol = max(stampCol, bone * fade);
    }
  }

  float halo = smoothstep(0.0, 0.6, stampSum);
  col += dirtyPurple * halo * 0.10;
  col = mix(col, stampCol, clamp(stampSum, 0.0, 1.0));

  float ash = fbm(uv * 3.0 - vec2(0.0, t * 3.0));
  float ashMask = smoothstep(0.72, 0.95, ash) * (0.5 + 0.5 * sin(t * 2.0 + uv.x * 4.0));
  col += vec3(0.18, 0.16, 0.20) * ashMask * 0.12;

  float grain = hash21(gl_FragCoord.xy + fract(u_time) * 100.0);
  col += (grain - 0.5) * 0.035;

  float topGlow = smoothstep(0.9, -0.4, uv.y) * 0.10;
  col += dirtyPurple * topGlow * 0.4;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
