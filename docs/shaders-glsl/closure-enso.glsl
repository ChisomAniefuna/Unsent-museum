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
}
