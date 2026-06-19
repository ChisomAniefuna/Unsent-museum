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

void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.2+t*0.1+sv),fbm(uv*1.2-t*0.08)); vec2 r=vec2(fbm(uv*1.2+2.0*q+t*0.4),fbm(uv*1.2+2.0*q+vec2(5.0)-t*0.4));
  float f=fbm(uv*1.2+2.5*r); float band=0.5+0.5*sin((f*6.0+length(r)*3.0-t*2.0)*3.14159);
  vec3 col=mix(WINE,CRIM,f); col=mix(col,ROSE,smoothstep(0.5,0.85,f)); col=mix(col,BLUSH,pow(band,3.0)*0.5); col+=CREAM*pow(band,10.0)*0.4;
  col*=smoothstep(1.7,0.2,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
