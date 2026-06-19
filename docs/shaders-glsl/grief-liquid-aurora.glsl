#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*vnoise(p); p=p*2.02+vec2(1.7,9.2); a*=0.5; } return v; }
// Grief palette: off-black → dirty purple → grey → pale lilac
vec3 aurora(float t){ t=fract(t);
  vec3 c0=vec3(0.05,0.04,0.07), c1=vec3(0.29,0.24,0.37), c2=vec3(0.48,0.48,0.50), c3=vec3(0.78,0.74,0.86);
  if(t<0.33) return mix(c0,c1,t/0.33);
  if(t<0.66) return mix(c1,c2,(t-0.33)/0.33);
  return mix(c2,c3,(t-0.66)/0.34);
}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
  float t=u_time*0.16 + u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.6+vec2(0.0,t)), fbm(uv*1.6+vec2(5.2,-t)));
  vec2 r=vec2(fbm(uv*1.6+2.4*q+vec2(1.7,9.2)+t*0.5), fbm(uv*1.6+2.4*q+vec2(8.3,2.8)-t*0.5));
  float f=fbm(uv*1.6+3.0*r);
  float band=0.5+0.5*sin((f*5.0 + length(r)*3.0 - t*2.0)*3.14159);
  vec3 col=aurora(f + length(r)*0.25 + t*0.1);
  float fil=smoothstep(0.0,0.04,abs(r.x-r.y));
  col += aurora(f+0.5)*(1.0-fil)*0.5;
  col *= 0.35 + 0.75*band;
  col += vec3(0.82,0.80,0.92)*pow(band,8.0)*0.45;
  vec3 bg=vec3(0.03,0.025,0.045);
  col=mix(bg,col,smoothstep(0.05,0.6,f+band*0.3));
  col*=smoothstep(1.7,0.2,length(uv));
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
