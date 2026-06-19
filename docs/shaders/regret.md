# REGRET — new shader code

## regret-ascii-echo.ts
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

## regret-broken-thread.ts
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

## regret-sankofa.ts
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

## regret-undertow-halftone.ts
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

## regret-willow-rain.ts
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

