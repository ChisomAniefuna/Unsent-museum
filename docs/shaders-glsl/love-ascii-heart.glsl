#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution; uniform float u_time; uniform float u_seed; uniform float u_unique;
#define TAU 6.2831853
#define WINE vec3(0.34,0.03,0.12)
#define CRIM vec3(0.88,0.10,0.32)
#define ROSE vec3(1.0,0.46,0.62)
#define BLUSH vec3(1.0,0.80,0.86)
#define GOLD vec3(1.0,0.84,0.42)
#define CREAM vec3(1.0,0.96,0.90)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.02; a*=0.5; } return v; }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }

float heartIn(vec2 uv,float s){ vec2 hp=uv*s; hp.y=-hp.y-0.2; float e=pow(hp.x*hp.x+hp.y*hp.y-1.0,3.0)-hp.x*hp.x*hp.y*hp.y*hp.y; return smoothstep(0.06,-0.06,e); }
float box(vec2 p,vec2 b){ vec2 d=abs(p)-b; return 1.0-smoothstep(0.0,0.06,length(max(d,0.0))+min(max(d.x,d.y),0.0)); }
float glyph(vec2 p,float id){ id=fract(id); float g=0.0;
  if(id<0.33){ g+=box(p,vec2(0.06,0.26)); g+=box(p-vec2(0.0,-0.26),vec2(0.15,0.06)); }
  else if(id<0.66){ g+=box(p,vec2(0.2,0.06)); g+=box(p,vec2(0.06,0.2)); }
  else { g+=box(p-vec2(-0.12,0.0),vec2(0.05,0.26)); g+=box(p-vec2(0.12,0.0),vec2(0.05,0.26)); g+=box(p,vec2(0.16,0.05)); } return clamp(g,0.,1.); }
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.4; float sv=u_seed*u_unique;
  float dir=mix(1.0,sign(hash(vec2(3.0))-0.5+sv),u_unique);
  vec2 g=uv*14.0; g.y+=t*2.0*dir; vec2 id=floor(g),cell=fract(g)-0.5; float h=hash(id+sv);
  float inside=heartIn(uv,1.4); float flow=fbm(id*0.2+t*0.2); float bright=(inside*0.8+flow*0.4)*step(0.35,h);
  float gv=glyph(cell,h+floor(t*2.0+h*8.0)*0.2); vec3 col=mix(ROSE,CREAM,flow)*gv*bright; col+=CREAM*gv*bright*step(0.9,flow)*0.6;
  col=mix(WINE*0.18,col,step(0.04,gv*bright)); col*=smoothstep(1.6,0.3,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
