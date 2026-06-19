import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-kintsugi",
  name: "Kintsugi",
  description: "Veins of gold slowly mend a dark, broken ceramic, grief turned luminous through repair.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

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
vec2 hash22(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.xx+p3.yz)*p3.zy);
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

// Voronoi crack network. Returns:
//   x = ridge distance (small near a shard boundary -> the crack seam)
//   y = nearest-cell distance (shard interior depth)
//   z = per-shard random id (for shading individual ceramic plates)
vec3 cracks(vec2 p, float drift){
  vec2 ip=floor(p);
  vec2 fp=fract(p);
  float f1=8.0;
  float f2=8.0;
  float id=0.0;
  for(float y=-1.0;y<=1.0;y++){
    for(float x=-1.0;x<=1.0;x++){
      vec2 g=vec2(x,y);
      vec2 o=hash22(ip+g);
      // slow breathing of cell sites so the ceramic seems to settle and shift
      o=0.5+0.42*sin(drift+6.2831*o);
      vec2 r=g+o-fp;
      float d=dot(r,r);
      if(d<f1){
        f2=f1;
        f1=d;
        id=hash21(ip+g);
      } else if(d<f2){
        f2=d;
      }
    }
  }
  return vec3(sqrt(f2)-sqrt(f1),sqrt(f1),id);
}

void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

  // ---- seed-gated variation (every term multiplied by u_unique) ----
  float sd=u_seed*u_unique;
  float ang=0.5*sd;
  float ca=cos(ang), sa=sin(ang);
  vec2 ruv=mat2(ca,-sa,sa,ca)*uv;
  float pShift=0.13*sin(sd*4.7);
  float travelDir=mix(1.0,sign(hash11(sd+3.0)-0.5),u_unique);
  float phase=6.2831*hash11(sd+11.0)*u_unique;

  float t=u_time;

  // ---- flowing, warping dark background (the ceramic glaze) ----
  vec2 q=ruv*1.35;
  vec2 warp=vec2(
    fbm(q*1.05+vec2(0.0,t*0.045)+sd),
    fbm(q*1.05+vec2(5.2,-t*0.038)-sd)
  );
  float field=fbm(q+1.7*warp+vec2(t*0.018*travelDir,0.0));
  float field2=fbm(q*2.4-1.1*warp-vec2(0.0,t*0.013));

  // deep value range: near-black trough -> faint cool glaze sheen
  vec3 ink=vec3(0.014,0.012,0.024);
  vec3 glaze=vec3(0.120,0.105,0.175);
  float mottle=smoothstep(0.18,0.94,field*0.7+field2*0.45);
  vec3 col=mix(ink,glaze,mottle);
  float sheen=smoothstep(0.30,0.95,field2*0.6+0.4*fbm(q*3.1+warp));
  col+=glaze*sheen*0.40;
  col*=0.40+0.60*smoothstep(0.04,0.86,field);

  // ---- ceramic shard structure (large plates) ----
  vec2 cp=ruv*2.6;
  cp+=0.85*warp;
  cp+=vec2(0.035,0.018)*travelDir*t;
  cp+=0.16*vec2(fbm(cp*0.8+t*0.025),fbm(cp*0.8-t*0.022));
  vec3 c1=cracks(cp, t*0.10+phase);
  float edge=c1.x;
  float shardId=c1.z;

  // subtle per-shard tint variation lifts/darkens individual plates
  float plate=0.5+0.5*sin(shardId*30.0+sd*6.0);
  col*=0.74+0.34*plate;
  // shard relief: brighten plate interiors, deepen the seams
  col*=0.82+0.34*smoothstep(0.02,0.35,c1.y);

  // finer secondary crack web for delicacy
  vec2 cp2=ruv*5.4+1.3*warp+vec2(0.022,0.011)*travelDir*t;
  float edge2=cracks(cp2, t*0.08-phase).x;

  // ---- crack masks ----
  float vein =1.0-smoothstep(0.0,0.058,edge);
  float vein2=(1.0-smoothstep(0.0,0.038,edge2))*0.55;
  float allVein=clamp(vein+vein2,0.0,1.0);

  // ---- LIFECYCLE: gold mends the cracks, spreading outward then settling ----
  float rad=length(uv);
  float pulse=0.5+0.5*sin(t*0.10+phase);
  float grow=mix(0.30,1.30,smoothstep(0.0,1.0,pulse));
  float front=smoothstep(grow+0.30,grow-0.22,rad);
  // gold creeps along the seam: flow factor runs down the crack over time
  float flow=0.5+0.5*sin(rad*7.0-t*0.55+edge*40.0+phase);
  float fill=clamp(front*(0.45+0.55*flow)+0.28,0.0,1.0);

  float gold=allVein*fill;

  // molten travelling glint that races along the seams (the "mending")
  float glint=pow(0.5+0.5*sin(rad*16.0-t*1.1+phase),6.0);
  float seamGlint=vein*glint*front;

  // ---- gold material with deep-to-bright range ----
  vec3 goldDeep =vec3(0.40,0.25,0.04);
  vec3 goldMid  =vec3(0.88,0.63,0.17);
  vec3 goldBright=vec3(1.0,0.94,0.68);
  goldDeep =clamp(goldDeep +vec3(pShift,pShift*0.4,-pShift*0.5),0.0,1.0);
  goldMid  =clamp(goldMid  +vec3(pShift,pShift*0.4,-pShift*0.5),0.0,1.0);

  // value across the seam: deep edges -> bright core
  float core=pow(vein,2.0);
  vec3 goldCol=mix(goldDeep,goldMid,gold);
  goldCol=mix(goldCol,goldBright,core*fill);

  // lay the gold into the seams
  col=mix(col,goldCol*0.45,gold*0.6);           // settled gold body
  col=mix(col,goldCol,gold*fill);               // filled, lit gold
  // warm wide halo bleeding from the seams into the dark glaze
  float halo=(1.0-smoothstep(0.0,0.20,edge))*front;
  col+=goldDeep*halo*0.60;
  col+=goldMid*halo*0.28*pulse;
  // bright specular travelling core
  col+=goldBright*core*fill*(0.5+0.5*flow)*0.95;
  col+=goldBright*seamGlint*1.15;

  // crisp dark lip flanking each seam for contrast (broken-edge shadow)
  float lip=smoothstep(0.058,0.090,edge)*(1.0-smoothstep(0.090,0.150,edge));
  col*=1.0-lip*0.48*front;

  // ---- finishing ----
  float vig=1.0-0.58*dot(uv*0.60,uv*0.60);
  col*=clamp(vig,0.0,1.0);

  float grain=hash21(gl_FragCoord.xy+floor(t*24.0));
  col+=(grain-0.5)*0.022;

  col=col/(1.0+0.10*col)*1.12;
  col=pow(col,vec3(0.90));

  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
