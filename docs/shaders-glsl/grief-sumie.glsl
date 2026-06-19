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
