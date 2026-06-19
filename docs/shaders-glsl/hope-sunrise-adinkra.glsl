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
