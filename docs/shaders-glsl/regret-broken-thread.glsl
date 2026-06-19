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
