# LOVE — new shader code

Shared header + the five cultural Love shaders (in shaders.ts).

```ts
const LOVE_HEAD = `
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
`;

const lovePeonyGarden: ShaderDef = {
  id: "love-peony-garden",
  name: "Peony Garden",
  description: "A courtyard of peonies sprouting, opening and folding closed — Chinese 牡丹, love and abundance.",
  glsl: LOVE_HEAD + `
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
`,
};

const loveSakuraField: ShaderDef = {
  id: "love-sakura-field",
  name: "Sakura Drift",
  description: "Cherry blossoms drifting on dusk air — Japanese 桜, the tenderness of fleeting things.",
  glsl: LOVE_HEAD + `
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.4; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.2+t*0.08+sv),fbm(uv*1.2-t*0.07)); float n=fbm(uv*1.2+1.2*q);
  vec3 col=mix(vec3(0.13,0.02,0.08),vec3(0.46,0.16,0.30),(uv.y+1.0)*0.5+n*0.2);
  float dir=mix(1.0,sign(hash(vec2(7.0))-0.5+sv),u_unique);
  vec2 g=uv*3.0; g.y+=t*0.55*dir; g.x+=sin(g.y*1.3+t)*0.35; vec2 id=floor(g),f=fract(g)-0.5; float h=hash(id+sv);
  f=rot(h*TAU+t*0.7)*f; float pr=length(f),pa=atan(f.y,f.x); float shape=0.30+0.05*cos(pa*5.0); float notch=1.0-0.5*pow(max(0.0,cos(pa*5.0+3.14159)),6.0);
  float petal=smoothstep(0.025,0.0,pr-shape*notch); vec3 pink=mix(ROSE,BLUSH,h); float core=smoothstep(0.06,0.0,pr)*step(0.35,h);
  col=mix(col,pink,petal*step(0.35,h)); col=mix(col,CRIM,core*0.6); col+=CREAM*petal*step(0.35,h)*0.12;
  col*=smoothstep(1.6,0.2,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

const loveHalftoneHeart: ShaderDef = {
  id: "love-halftone-heart",
  name: "Halftone Heart",
  description: "A heart resolving out of a field of dots — print-room halftone, love made of small marks.",
  glsl: LOVE_HEAD + `
float heartIn(vec2 uv,float s){ vec2 hp=uv*s; hp.y=-hp.y-0.2; float e=pow(hp.x*hp.x+hp.y*hp.y-1.0,3.0)-hp.x*hp.x*hp.y*hp.y*hp.y; return smoothstep(0.06,-0.06,e); }
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  float field=fbm(uv*1.5+t*0.2+sv); float inside=heartIn(uv,1.4);
  vec2 cell=fract(uv*12.0)-0.5; float pulse=0.5+0.5*sin(length(uv)*6.0-t*3.0);
  float sz=0.08+(field*0.45+inside*0.5+pulse*0.1)*0.45; float dot=smoothstep(sz,sz-0.07,length(cell));
  vec3 base=mix(ROSE,CRIM,field); base=mix(base,GOLD,inside*0.5);
  vec3 col=mix(WINE*0.3,base,dot); col*=smoothstep(1.6,0.3,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

const loveAsciiHeart: ShaderDef = {
  id: "love-ascii-heart",
  name: "ASCII Heart",
  description: "Glyph characters raining into the shape of a heart — a love letter typed by the machine.",
  glsl: LOVE_HEAD + `
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
`,
};

const loveSilkRibbon: ShaderDef = {
  id: "love-silk-ribbon",
  name: "Silk Ribbon",
  description: "Folds of crimson silk turning through the dark — the warmth of closeness, always moving.",
  glsl: LOVE_HEAD + `
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.2+t*0.1+sv),fbm(uv*1.2-t*0.08)); vec2 r=vec2(fbm(uv*1.2+2.0*q+t*0.4),fbm(uv*1.2+2.0*q+vec2(5.0)-t*0.4));
  float f=fbm(uv*1.2+2.5*r); float band=0.5+0.5*sin((f*6.0+length(r)*3.0-t*2.0)*3.14159);
  vec3 col=mix(WINE,CRIM,f); col=mix(col,ROSE,smoothstep(0.5,0.85,f)); col=mix(col,BLUSH,pow(band,3.0)*0.5); col+=CREAM*pow(band,10.0)*0.4;
  col*=smoothstep(1.7,0.2,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

```
