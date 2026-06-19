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

float lobe(vec2 p,float w,float h){ p.y-=h*0.1; float d=length(vec2(p.x/w,p.y/h)); return smoothstep(1.0,0.84,d)*smoothstep(-h,h*0.3,p.y); }
float peony(vec2 p,float open){ float cover=0.0; for(float ring=0.0;ring<3.0;ring++){ float N=5.0+ring*3.0; float sc=1.0-ring*0.22; float ro=ring*0.5;
  for(float i=0.0;i<11.0;i++){ if(i>=N) break; float ang=i/N*TAU+ro; vec2 q=rot(-ang)*p; q.y-=sc*0.30*open; cover=max(cover,lobe(q,sc*0.13*(0.35+0.65*open),sc*0.30)); } } return cover; }
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.4+t*0.1+sv),fbm(uv*1.4+vec2(3.0,1.0)-t*0.09)); float n=fbm(uv*1.4+1.3*q+t*0.05);
  vec3 col=mix(WINE*0.5,CRIM*0.5,n); col=mix(col,ROSE*0.5,smoothstep(0.6,0.92,n)*0.4);
  vec2 cells=vec2(2.4,3.0); vec2 g=uv*cells; vec2 id=floor(g); vec2 f=fract(g)-0.5; float h=hash(id+sv);
  float dir=mix(1.0,sign(hash(id+1.7)-0.5),u_unique);
  float c=fract(t*0.22*dir+h); float sprout=smoothstep(0.0,0.16,c)*(1.0-smoothstep(0.84,1.0,c));
  float open=clamp(smoothstep(0.16,0.42,c)*(1.0-smoothstep(0.62,0.9,c))+0.12,0.0,1.0);
  float rr=length(f*2.4); float bloom= sprout>0.03 ? peony(f*2.4/sprout,open) : 0.0;
  vec3 petal=mix(ROSE,CRIM,smoothstep(0.1,0.6,rr)); petal=mix(GOLD,petal,smoothstep(0.0,0.2,rr));
  col+=ROSE*exp(-rr*rr*3.0)*0.18*sprout; col=mix(col,petal,bloom*0.95); col+=GOLD*exp(-rr*rr*18.0)*sprout*open*1.1;
  col*=smoothstep(1.7,0.25,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
