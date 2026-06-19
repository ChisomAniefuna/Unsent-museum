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
