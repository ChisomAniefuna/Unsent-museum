# HOPE — new shader code

## hope-ascii-ascension.ts
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

## hope-golden-dragon.ts
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

## hope-lantern-halftone.ts
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

## hope-origami-crane.ts
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

## hope-sunrise-adinkra.ts
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

