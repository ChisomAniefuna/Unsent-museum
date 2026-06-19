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
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  float field=fbm(uv*1.5+t*0.2+sv); float inside=heartIn(uv,1.4);
  vec2 cell=fract(uv*12.0)-0.5; float pulse=0.5+0.5*sin(length(uv)*6.0-t*3.0);
  float sz=0.08+(field*0.45+inside*0.5+pulse*0.1)*0.45; float dot=smoothstep(sz,sz-0.07,length(cell));
  vec3 base=mix(ROSE,CRIM,field); base=mix(base,GOLD,inside*0.5);
  vec3 col=mix(WINE*0.3,base,dot); col*=smoothstep(1.6,0.3,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
