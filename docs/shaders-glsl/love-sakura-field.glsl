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

void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.4; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.2+t*0.08+sv),fbm(uv*1.2-t*0.07)); float n=fbm(uv*1.2+1.2*q);
  vec3 col=mix(vec3(0.13,0.02,0.08),vec3(0.46,0.16,0.30),(uv.y+1.0)*0.5+n*0.2);
  float dir=mix(1.0,sign(hash(vec2(7.0))-0.5+sv),u_unique);
  vec2 g=uv*3.0; g.y+=t*0.55*dir; g.x+=sin(g.y*1.3+t)*0.35; vec2 id=floor(g),f=fract(g)-0.5; float h=hash(id+sv);
  f=rot(h*TAU+t*0.7)*f; float pr=length(f),pa=atan(f.y,f.x); float shape=0.30+0.05*cos(pa*5.0); float notch=1.0-0.5*pow(max(0.0,cos(pa*5.0+3.14159)),6.0);
  float petal=smoothstep(0.025,0.0,pr-shape*notch); vec3 pink=mix(ROSE,BLUSH,h); float core=smoothstep(0.06,0.0,pr)*step(0.35,h);
  col=mix(col,pink,petal*step(0.35,h)); col=mix(col,CRIM,core*0.6); col+=CREAM*petal*step(0.35,h)*0.12;
  col*=smoothstep(1.6,0.2,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
