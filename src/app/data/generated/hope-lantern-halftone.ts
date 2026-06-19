import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-lantern-halftone",
  name: "Lantern Halftone",
  description: "A printed halftone dusk resolves into a rising sun and a slow procession of paper lanterns lifting through warping night air, ink dots swelling from shadow into warm light.",
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
  // DUOTONE PALETTE, deep ink night -> warm cream highlight
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
