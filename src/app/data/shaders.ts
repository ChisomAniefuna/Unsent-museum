export interface ShaderDef {
  id: string;
  name: string;
  description: string;
  glsl: string;
}

// Bespoke per-room shaders (generated workflow). Imported after the interface so
// the generated modules can type against ShaderDef; spread into EMOTION_SHADERS below.
import { GENERATED } from "./generatedShaders";

// ─── GRIEF ────────────────────────────────────────────────────────────────────
// Palette: dirty purple, off-black, grey
// #4a3d5e (dirty purple) · #0d0b12 (off-black) · #7a7a7a (grey)

const griefVortex: ShaderDef = {
  id: "grief-vortex",
  name: "Vortex Mass",
  description: "A grieving spiral pulling inward, ever circling.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

vec3 grief(float x){
    vec3 c1 = vec3(0.05, 0.04, 0.07); // off-black
    vec3 c2 = vec3(0.29, 0.24, 0.37); // dirty purple
    vec3 c3 = vec3(0.48, 0.48, 0.48); // grey
    c2 += (fract(u_seed * 0.123) - 0.5) * 0.1;
    vec3 res = mix(c1, c2, x);
    res = mix(res, c3, smoothstep(0.8, 1.0, x) * 0.3);
    return res;
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t = u_time * (0.4 + u_intensity * 0.4);
    float s_mod = u_seed * 0.01;
    vec2 p = uv;
    float r = length(p);
    float a = atan(p.y,p.x);
    float spiral = sin(a*5.0 + log(r+0.05)*6.0 - t*3.0 + s_mod);
    float storm  = 0.5 + 0.5*sin(a*3.0 - r*(12.0 + u_intensity*8.0) + t*4.0);
    float mass = smoothstep(0.95, 0.18, r + spiral * (0.04 + u_intensity * 0.06));
    vec3 col = grief(mass * 0.8 + storm * 0.25);
    float hole = smoothstep(0.42, 0.04, r);
    col = mix(col, vec3(0.04, 0.03, 0.05), hole);
    float depth = abs(sin(log(r+0.025)*9.0 - t*3.0 + u_seed));
    depth = 1.0 - smoothstep(0.02, 0.12, depth);
    depth *= smoothstep(0.42, 0.05, r);
    col += vec3(0.35, 0.3, 0.45) * depth * (0.2 + u_intensity * 0.3);
    col *= smoothstep(1.45, 0.18, length(uv));
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

const griefGrid: ShaderDef = {
  id: "grief-grid",
  name: "Memory Grid",
  description: "Fractured tiles of what once was remembered.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

void main() {
    vec2 st = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float t = u_time * (0.15 + u_intensity * 0.2);
    vec2 p = abs(fract(st * (6.0 + mod(u_seed, 4.0)) + sin(t + u_seed)) - 0.5);
    float d = min(p.x, p.y);
    vec3 bg = vec3(0.03, 0.04, 0.08);
    vec3 accent = vec3(0.14, 0.20, 0.35);
    vec3 glow = vec3(0.30, 0.38, 0.52);
    vec3 col = mix(bg, accent, smoothstep(0.0, 0.05, d));
    col += glow * (0.008 / (d + 0.004)) * (0.5 + u_intensity * 0.5);
    col *= smoothstep(1.5, 0.2, length(st));
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

const griefAsh: ShaderDef = {
  id: "grief-ash",
  name: "Ash Drift",
  description: "Falling remnants of a memory, drifting in grey and deep purple.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * (0.6 + u_intensity * 0.4);
    
    vec2 p = uv * vec2(1.0, u_resolution.y/u_resolution.x);
    p.y += t * 0.2;
    p.x += sin(p.y * 4.0 + t) * 0.05;
    
    vec2 grid = floor(p * (20.0 + mod(u_seed, 10.0)));
    vec2 f = fract(p * (20.0 + mod(u_seed, 10.0))) - 0.5;
    
    float h = hash(grid + u_seed);
    float size = 0.1 + h * 0.3;
    float circle = smoothstep(size, size - 0.1, length(f));
    
    vec3 bg = vec3(0.06, 0.05, 0.04);
    vec3 ash = mix(vec3(0.45, 0.38, 0.30), vec3(0.35, 0.25, 0.18), h);
    
    vec3 col = mix(bg, ash, circle * h);
    col *= smoothstep(0.0, 0.5, uv.y) * smoothstep(1.0, 0.5, uv.y);
    
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

const griefVeil: ShaderDef = {
  id: "grief-veil",
  name: "The Veil",
  description: "A semi-transparent curtain of sorrow in dirty purple and grey.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * (0.5 + u_intensity * 0.5);
    
    float wave = sin(uv.x * 2.0 + t + u_seed) * 0.2;
    wave += sin(uv.x * 5.0 - t * 1.5) * 0.1;
    
    float d = abs(uv.y - wave);
    float veil = smoothstep(0.5, 0.0, d);
    
    vec3 col1 = vec3(0.12, 0.24, 0.28);
    vec3 col2 = vec3(0.28, 0.40, 0.42);

    vec3 col = mix(col1, col2, sin(uv.x + t) * 0.5 + 0.5);
    col *= veil * (0.3 + u_intensity * 0.4);

    vec3 bg = vec3(0.03, 0.05, 0.06);
    gl_FragColor = vec4(mix(bg, col, veil), 1.0);
}
`,
};

// ─── CLOSURE ──────────────────────────────────────────────────────────────────
// Palette shared by ocean-themed closure shaders
// #0e3a5c (dark navy) · #2e7fb8 (mid blue) · #9fd4e8 (light sky) · #16222e (abyss) · #030608 (near-black)

const closureFlowOcean: ShaderDef = {
  id: "closure-flow-ocean",
  name: "Deep Current",
  description: "An ocean current drifting toward stillness, closure as depth, not absence.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.0; a*=0.5; }
    return v;
}
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*2.4;
    // Domain warp, warp strength 1.3
    float sv=u_seed*u_unique;
    vec2 q=vec2(fbm(uv*3.2+vec2(t*0.11+sv,sv*1.3)), fbm(uv*3.2+vec2(sv*0.7,t*0.09+sv*1.9)));
    vec2 w=uv+1.3*q;
    float n=fbm(w*3.2+vec2(t*0.07,-t*0.05));
    // Grain 0
    vec3 col=pal(n+t*0.04+sv*0.4);
    col=mix(BG,col,smoothstep(0.1,0.65,n));
    col+=pal(n+0.5)*smoothstep(0.7,0.9,n)*0.35;
    col*=smoothstep(1.6,0.2,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const closureGyroidMint: ShaderDef = {
  id: "closure-gyroid-mint",
  name: "Mint Gyroid",
  description: "A triply-periodic surface blooming in mint, the geometry of things finally resolved.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.722,1.000,0.180)
#define C1 vec3(0.122,0.851,0.643)
#define C2 vec3(0.039,0.478,0.361)
#define C3 vec3(0.918,1.000,0.816)
#define BG vec3(0.016,0.028,0.039)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
float gyroid(vec3 p){ return sin(p.x)*cos(p.y)+sin(p.y)*cos(p.z)+sin(p.z)*cos(p.x); }
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*2.9;
    // Domain warp, warp 5.0
    vec2 w=uv+vec2(sin(uv.y*5.0+t*0.38),cos(uv.x*5.0-t*0.34))*0.22;
    // Gyroid, zoom 2.25
    float sv=u_seed*u_unique;
    vec3 p=vec3(w*2.25+sv,t*0.28+sv*0.5);
    float g=gyroid(p);
    float c1=1.0-smoothstep(0.0,0.18,abs(g));
    float c2=1.0-smoothstep(0.0,0.08,abs(g-1.2));
    float c3=1.0-smoothstep(0.0,0.08,abs(g+1.2));
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.125;
    vec3 col=pal(length(uv)*0.5+t*0.06+sv*0.4);
    col=mix(BG,col,c1*1.1+c2*0.5+c3*0.5);
    col+=pal(length(uv)*0.5+t*0.06+0.5)*c2*0.4;
    col+=grain*0.5;
    col*=smoothstep(1.6,0.25,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const closureGyroidMintPixel: ShaderDef = {
  id: "closure-gyroid-mint-pixel",
  name: "Mint Signal",
  description: "Pixelated gyroid, the moment something clicks into its final shape.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.722,1.000,0.180)
#define C1 vec3(0.122,0.851,0.643)
#define C2 vec3(0.039,0.478,0.361)
#define C3 vec3(0.918,1.000,0.816)
#define BG vec3(0.016,0.028,0.039)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
float gyroid(vec3 p){ return sin(p.x)*cos(p.y)+sin(p.y)*cos(p.z)+sin(p.z)*cos(p.x); }
void main(){
    // Pixelate 48, snap to coarse grid
    vec2 res48=u_resolution/48.0;
    vec2 pxUV=floor(gl_FragCoord.xy/48.0)*48.0+24.0;
    vec2 uv=(pxUV*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*2.9;
    // Domain warp, warp 5.0, zoom 1.55
    vec2 w=uv+vec2(sin(uv.y*5.0+t*0.38),cos(uv.x*5.0-t*0.34))*0.22;
    float sv=u_seed*u_unique;
    vec3 p=vec3(w*1.55+sv,t*0.28+sv*0.5);
    float g=gyroid(p);
    float c1=1.0-smoothstep(0.0,0.22,abs(g));
    float c2=1.0-smoothstep(0.0,0.10,abs(g-1.0));
    float grain=(hash(floor(uv*10.0)+fract(t))-0.5)*0.125;
    vec3 col=pal(length(uv)*0.5+t*0.06+sv*0.4);
    col=mix(BG,col,c1*1.1+c2*0.55);
    col+=pal(length(uv)*0.4+t*0.08+0.33)*c2*0.5;
    col+=grain*0.5;
    col*=smoothstep(1.6,0.25,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const closureNeonTruchet: ShaderDef = {
  id: "closure-neon-truchet",
  name: "Neon Release",
  description: "Electric green arcs, the energy of something finally let go.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.722,1.000,0.180)
#define C1 vec3(0.122,0.851,0.643)
#define C2 vec3(0.039,0.478,0.361)
#define C3 vec3(0.918,1.000,0.816)
#define BG vec3(0.016,0.028,0.039)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
float truchetArc(vec2 p,float s){
    p*=s; vec2 id=floor(p); vec2 lp=fract(p)-0.5;
    if(hash(id + vec2(u_seed*u_unique))>0.5) lp.x=-lp.x;
    return min(abs(length(lp-vec2(-0.5,0.5))-0.5),abs(length(lp-vec2(0.5,-0.5))-0.5));
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    // speed 0.83, warp 5.31, zoom ~6
    float t=u_time*0.83;
    vec2 w=uv+vec2(sin(uv.y*5.31+t*0.952),cos(uv.x*5.31-t*0.952))*0.169;
    float d =truchetArc(w,        32.0);
    float d2=truchetArc(w*0.5+t*0.04,16.0);
    float d3=truchetArc(w*2.0-t*0.03,64.0);
    float s1=1.0-smoothstep(0.0,0.018,d -0.012);
    float s2=1.0-smoothstep(0.0,0.015,d2-0.018);
    float s3=1.0-smoothstep(0.0,0.012,d3-0.018);
    float len=length(uv);
    float sv=u_seed*u_unique;
    vec3 col=BG;
    col=mix(col,pal(len*0.5+t*0.07+sv*0.4),       s1*1.2);
    col=mix(col,pal(len*0.5+t*0.07+0.33),  s2*0.75);
    col=mix(col,pal(len*0.5+t*0.07+0.66),  s3*0.60);
    col+=pal(len*0.5+t*0.07)*exp(-d*7.5)*s1*0.6;
    col+=pal(len*0.5+t*0.07+0.5)*exp(-d2*7.5)*s2*0.4;
    col*=smoothstep(1.5,0.25,len);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const closureOceanGyroid: ShaderDef = {
  id: "closure-ocean-gyroid",
  name: "Settling Gyroid",
  description: "Deep-ocean geometry slowly finding its form, what peace looks like on the inside.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
float gyroid(vec3 p){ return sin(p.x)*cos(p.y)+sin(p.y)*cos(p.z)+sin(p.z)*cos(p.x); }
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    // speed 0.91, warp 7.4, zoom ~1.08
    float t=u_time*0.91;
    vec2 w=uv+vec2(sin(uv.y*7.4+t*0.45),cos(uv.x*7.4-t*0.40))*0.18;
    float sv=u_seed*u_unique;
    vec3 p=vec3(w*1.08+sv,t*0.22+sv*0.5);
    float g=gyroid(p);
    float c1=1.0-smoothstep(0.0,0.15,abs(g));
    float c2=1.0-smoothstep(0.0,0.07,abs(g-1.1));
    float c3=1.0-smoothstep(0.0,0.07,abs(g+1.1));
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.06;
    vec3 col=pal(length(uv)*0.4+t*0.05+sv*0.4);
    col=mix(BG,col,c1*1.1+c2*0.55+c3*0.55);
    col+=pal(length(uv)*0.4+t*0.05+0.5)*c2*0.4;
    col+=grain;
    col*=smoothstep(1.6,0.25,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const closureOceanDeep: ShaderDef = {
  id: "closure-ocean-deep",
  name: "The Abyss Settles",
  description: "The deepest current slowing down, grief transmuted into peace.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
float gyroid(vec3 p){ return sin(p.x)*cos(p.y)+sin(p.y)*cos(p.z)+sin(p.z)*cos(p.x); }
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    // speed 1.65, warp 7.4, zoom ~1.39, faster, deeper
    float t=u_time*1.65;
    vec2 w=uv+vec2(sin(uv.y*7.4+t*0.46),cos(uv.x*7.4-t*0.41))*0.21;
    float sv=u_seed*u_unique;
    vec3 p=vec3(w*1.39+sv,t*0.18+sv*0.5);
    float g=gyroid(p);
    // Layered contours, tighter at this zoom
    float c1=1.0-smoothstep(0.0,0.12,abs(g));
    float c2=1.0-smoothstep(0.0,0.06,abs(g-1.4));
    float c3=1.0-smoothstep(0.0,0.06,abs(g+1.4));
    // Halftone-style square overlay
    vec2 htUV=uv*58.0;
    float ht=length(fract(htUV)-0.5);
    float halftone=smoothstep(0.44,0.32,ht)*(0.12+0.12*sin(g*3.0+t));
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.215;
    vec3 col=pal(length(uv)*0.45+t*0.04+sv*0.4);
    col=mix(BG,col,c1*1.1+c2*0.5+c3*0.5);
    col+=pal(length(uv)*0.45+t*0.04+0.5)*halftone;
    col+=grain*0.5;
    col*=smoothstep(1.6,0.25,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const closureGlyphs: ShaderDef = {
  id: "closure-glyphs",
  name: "Glyph Fall",
  description: "Letters of unsaid things descending through a silent hall.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

#define BASE   vec3(0.725, 0.796, 0.890)
#define WASH   vec3(0.867, 0.922, 0.980)
#define SHADOW vec3(0.557, 0.659, 0.784)
#define DEEP   vec3(0.012, 0.024, 0.055)

float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float box(vec2 p, vec2 b){
    vec2 d = abs(p) - b;
    float outside = length(max(d, 0.0));
    float inside = min(max(d.x, d.y), 0.0);
    return 1.0 - smoothstep(0.0, 0.015, outside + inside);
}

float glyph(vec2 p, float id){
    float g = 0.0;
    if (id < 0.25){
        g += box(p, vec2(0.04, 0.28));
        g += box(p - vec2(0.0, -0.38), vec2(0.05, 0.05));
    } else if (id < 0.5){
        g += box(p - vec2(-0.12, 0.0), vec2(0.04, 0.28));
        g += box(p - vec2(0.12, 0.0), vec2(0.04, 0.28));
        g += box(p, vec2(0.20, 0.035));
    } else if (id < 0.75){
        g += box(p + vec2(0.12, -0.12), vec2(0.18, 0.035));
        g += box(p - vec2(0.12, 0.12), vec2(0.18, 0.035));
    } else {
        g += box(p, vec2(0.22, 0.035));
        g += box(p, vec2(0.035, 0.22));
    }
    return g;
}

void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    float r = max(length(uv), 0.0001);
    float a = atan(uv.y, uv.x);
    float depth = 0.4 / r;
    vec2 tunnelUV = vec2(a / 6.28318, depth);
    tunnelUV.y -= u_time * 3.5;
    tunnelUV.x += u_time * 0.15;
    vec2 cells = vec2(20.0, 20.0);
    vec2 gridUV = tunnelUV * cells;
    vec2 id = floor(gridUV);
    vec2 gv = fract(gridUV) - 0.5;
    float rnd = hash21(id + vec2(u_seed*u_unique));
    float appear = step(0.45, rnd);
    float g = glyph(gv, rnd);
    vec3 col = DEEP;
    float flicker = 0.55 + 0.45 * sin(u_time * 12.0 + rnd * 20.0);
    col += WASH * g * appear * flicker;
    float centerHoleFade = smoothstep(0.0, 0.2, r);
    float cameraEdgeFade = smoothstep(1.5, 0.3, r);
    col *= centerHoleFade * cameraEdgeFade;
    gl_FragColor = vec4(col, 1.0);
}
`,
};

const closureOcean: ShaderDef = {
  id: "closure-ocean",
  name: "Settling Waters",
  description: "Where endings learn to rest beneath still blue.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}

void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.4;
    float sv=u_seed*u_unique;
    float n=noise(uv*3.0+t+sv)*0.5+noise(uv*6.0-t*0.5+sv*1.7)*0.25+noise(uv*12.0+t*0.3+sv*2.3)*0.125;
    vec3 deep=vec3(0.02,0.12,0.22);
    vec3 mid=vec3(0.05,0.35,0.55);
    vec3 surf=vec3(0.4,0.78,0.85);
    vec3 col=mix(deep,mid,n);
    col=mix(col,surf,smoothstep(0.6,0.85,n));
    col+=vec3(0.9,0.97,1.0)*smoothstep(0.82,0.95,n)*0.3;
    float vig=smoothstep(1.4,0.3,length(uv));
    gl_FragColor=vec4(col*vig,1.0);
}
`,
};

// ─── LOVE ─────────────────────────────────────────────────────────────────────

const loveButterfly: ShaderDef = {
  id: "love-butterfly",
  name: "Butterfly Net",
  description: "Wings caught in the net of feeling.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718
#define SEED 41.82
uniform float u_seed;
uniform float u_unique;

float hash(float n){ return fract(sin(n)*43758.5453123); }
float hash2(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+19.19); return fract(p.x*p.y); }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }

vec3 lovePalette(float t){
    t=fract(t);
    if(t<.143) return mix(vec3(.055,.0,.025),vec3(.82,.03,.07),t/.143);
    if(t<.286) return mix(vec3(.82,.03,.07),vec3(.96,.20,.26),(t-.143)/.143);
    if(t<.429) return mix(vec3(.96,.20,.26),vec3(1.,.38,.24),(t-.286)/.143);
    if(t<.571) return mix(vec3(1.,.38,.24),vec3(1.,.76,.55),(t-.429)/.143);
    if(t<.714) return mix(vec3(1.,.76,.55),vec3(1.,.62,.18),(t-.571)/.143);
    if(t<.857) return mix(vec3(1.,.62,.18),vec3(.05,.55,.50),(t-.714)/.143);
    return mix(vec3(.05,.55,.50),vec3(.45,.2,.62),(t-.857)/.143);
}

float butterflyMask(vec2 p){
    p.x=abs(p.x); float r=length(p),a=atan(p.y,p.x);
    float s=exp(-pow(a-.62,2.)*4.2)*.78+exp(-pow(a+.55,2.)*5.2)*.58+exp(-pow(a+1.18,2.)*16.)*.32+.012;
    return smoothstep(s,s-.025,r);
}
float body(vec2 p){
    p.x=abs(p.x);
    float b=smoothstep(.018,0.,length(vec2(p.x*2.8,p.y))-.035*(1.25-p.y*1.6));
    float a=smoothstep(.006,0.,abs(p.x-(.018+p.y*.14+sin(p.y*15.)*.01)));
    return clamp(b+a*smoothstep(.10,.16,p.y)*smoothstep(.46,.34,p.y),0.,1.);
}
vec2 voronoi2(vec2 p,float seed){
    vec2 i=floor(p),f=fract(p); float d1=8.,d2=8.;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
        vec2 n=vec2(float(x),float(y));
        vec2 rp=0.5+0.5*sin(u_time*0.3+TAU*vec2(hash2(i+n),hash2(i+n+vec2(31.41,17.3)))+seed);
        float d=length(n+rp-f);
        if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d;
    }
    return vec2(d1,d2);
}

void main(){
    vec2 st=(gl_FragCoord.xy*2.-u_resolution.xy)/u_resolution.y;
    float seed=SEED + u_seed * u_unique, flap=.5+.5*sin(u_time*3.2+seed);
    float f1=sin(st.x*3.+st.y*2.+u_time*.25);
    float f2=sin(length(st)*7.-u_time*.45);
    vec3 col=vec3(.055,.0,.025);
    col=mix(col,vec3(.18,.025,.055),.34+.24*f1);
    col=mix(col,vec3(.08,.015,.13),.25+.20*f2);
    vec2 v=voronoi2(st*4.5+vec2(u_time*.04,0.),seed);
    float lines=1.-smoothstep(0.,.06,v.y-v.x);
    col+=lovePalette(fract(u_time*.08+seed*.05))*lines*.55;
    vec2 warped=st+vec2(sin(u_time*.45+seed)*.035,cos(u_time*.55+seed)*.025);
    vec2 p=vec2(abs(warped.x)/(.18+.82*flap),warped.y);
    float mask=butterflyMask(p);
    float r=length(p), a=atan(p.y,p.x);
    vec3 accent=lovePalette(fract(u_time*.08+seed*.05)+length(warped)+seed*.1);
    vec3 wing=lovePalette(r*.85+u_time*.08+.15*sin(a*3.+u_time));
    float veins=(1.-smoothstep(.02,.07,abs(sin(a*18.+r*14.-u_time*1.6+seed))))*mask;
    wing+=accent*veins*.38;
    wing+=accent*smoothstep(.45,1.,sin(r*18.-u_time*2.+seed))*.24;
    wing=mix(wing,accent,smoothstep(.12,.045,length(p-vec2(.42,-.28)))*flap*.35);
    wing*=.48+.62*flap;
    col*=1.-mask*.22;
    col=mix(col,wing,mask*.95);
    col=mix(col,vec3(1.,.62,.18),body(warped)*.92);
    col+=vec3(1.,.20,.12)*exp(-length(warped)*5.5)*(.08+.16*flap)*mask;
    col*=smoothstep(1.38,.22,length(st));
    gl_FragColor=vec4(clamp(col,0.,1.),1.);
}
`,
};

const lovePeacockGrid: ShaderDef = {
  id: "love-peacock-grid",
  name: "Peacock Garden",
  description: "A garden of winged creatures blooming in every cell.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;
#define PI 3.14159265359
#define TAU 6.28318530718

float random(vec2 st){ return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123); }

vec3 lovePalette(float t){
    vec3 wine=vec3(0.06,0.00,0.025), red=vec3(0.82,0.03,0.07);
    vec3 rose=vec3(0.96,0.20,0.26), coral=vec3(1.00,0.38,0.24);
    vec3 cream=vec3(1.00,0.76,0.55), gold=vec3(1.00,0.62,0.18);
    t=fract(t);
    if(t<0.20) return mix(wine,red,t/0.20);
    if(t<0.40) return mix(red,rose,(t-0.20)/0.20);
    if(t<0.60) return mix(rose,coral,(t-0.40)/0.20);
    if(t<0.80) return mix(coral,cream,(t-0.60)/0.20);
    return mix(cream,gold,(t-0.80)/0.20);
}

float petal(vec2 p,float w,float h){
    p.y+=h*0.28;
    float d=length(vec2(p.x/w,p.y/h));
    return clamp((1.0-smoothstep(0.70,0.78,d))*smoothstep(-h*0.78,h*0.22,p.y),0.0,1.0);
}

mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

float feather(vec2 p,float angle,float scale){
    p=rot(-angle)*p;
    float f=petal(p,0.028*scale,0.16*scale);
    float vein=1.0-smoothstep(0.004,0.015,abs(p.x));
    vein*=smoothstep(-0.10*scale,0.08*scale,p.y);
    return clamp(f+vein*f*0.35,0.0,1.0);
}

float peacockSpread(vec2 st,float rnd){
    float fan=0.0;
    for(float i=0.0;i<22.0;i++){
        float k=i/21.0;
        float spread=mix(-1.15,1.15,k);
        float delay=k*4.5;
        float open=smoothstep(0.15,1.0,0.5+0.5*sin(u_time*1.2-delay+rnd*TAU));
        float radius=mix(0.16,0.68,k)*(0.75+0.35*open);
        vec2 pos=vec2(sin(spread)*radius,-0.08+cos(spread)*radius*0.38);
        float scale=mix(1.10,0.42,k)*(0.75+0.45*open);
        fan+=feather(st-pos,spread*0.85,scale);
    }
    return clamp(fan,0.0,1.0);
}

void main(){
    vec2 uv=gl_FragCoord.xy/u_resolution.xy;
    vec2 gridUV=vec2(uv.x*4.0,uv.y*3.0);
    vec2 cellID=floor(gridUV);
    vec2 st=fract(gridUV)*2.0-1.0;
    st.x*=(u_resolution.x/4.0)/(u_resolution.y/3.0);
    float rnd=random(cellID + u_seed * u_unique);
    st.x+=sin(u_time*0.45+rnd*10.0)*0.10;
    st.y+=cos(u_time*0.55+rnd*8.0)*0.08;
    vec3 bg=vec3(0.055,0.00,0.025)+vec3(0.12,0.02,0.05)*max(0.0,1.0-length(st));
    float fan=peacockSpread(st,rnd);
    vec3 finalColor=mix(bg,lovePalette(length(st)+rnd*0.4+u_time*0.08),fan*0.50);
    vec2 p=vec2(abs(st.x)/(0.18+0.82*(0.5+0.5*sin(u_time*(3.2+rnd*2.2)+rnd*TAU))),st.y);
    float r=length(p), a=atan(p.y,p.x);
    float upperWing=exp(-pow(a-0.62,2.)*4.2)*0.78;
    float lowerWing=exp(-pow(a+0.55,2.)*5.2)*0.58;
    float swallowTail=exp(-pow(a+1.18,2.)*16.)*0.32;
    float wingMask=smoothstep(upperWing+lowerWing+swallowTail+0.012,(upperWing+lowerWing+swallowTail+0.012)-0.025,r);
    vec3 wingBase=lovePalette(r*0.85+rnd*0.35+u_time*0.04);
    wingBase*=0.45+0.65*(0.5+0.5*sin(u_time*(3.2+rnd*2.2)+rnd*TAU));
    finalColor=mix(finalColor,wingBase,wingMask);
    float glow=exp(-length(st)*5.5)*(0.08+0.15*(0.5+0.5*sin(u_time*(3.2+rnd*2.2)+rnd*TAU)));
    finalColor+=vec3(1.0,0.20,0.12)*glow;
    gl_FragColor=vec4(clamp(finalColor,0.0,1.0),1.0);
}
`,
};

const loveFlower: ShaderDef = {
  id: "love-flower",
  name: "Heart Bloom",
  description: "Flowers opening in the shape of what was felt.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;
#define TAU 6.28318530718

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }

vec3 palette(float t){
    vec3 c[6];
    c[0]=vec3(.055,0,.025); c[1]=vec3(.82,.03,.07); c[2]=vec3(.96,.2,.26);
    c[3]=vec3(1,.38,.24); c[4]=vec3(1,.76,.55); c[5]=vec3(1,.62,.18);
    t=fract(t)*5.0; int i=int(t);
    if(i==0) return mix(c[0],c[1],fract(t));
    if(i==1) return mix(c[1],c[2],fract(t));
    if(i==2) return mix(c[2],c[3],fract(t));
    if(i==3) return mix(c[3],c[4],fract(t));
    return mix(c[4],c[5],fract(t));
}

float flower(vec2 uv,float numPetals,float seed){
    float t=u_time*1.2, f=0.0;
    for(float i=0.0;i<14.0;i++){
        if(i>=numPetals) break;
        vec2 p=rot(-(i/numPetals*TAU+t*.5+seed))*uv;
        p.y+=.42*.28-.32*(.85+.18*sin(t*1.5+seed));
        f+=(1.0-smoothstep(.68,.82,length(vec2(p.x/.11,p.y/.42))))*smoothstep(-.42*.75,.42*.22,p.y);
    }
    return clamp(f,0.,1.);
}

void main(){
    vec2 uv=gl_FragCoord.xy/u_resolution.xy;
    vec2 grid=vec2(4.0,3.0), id=floor(uv*grid), st=(fract(uv*grid)-0.5)*2.0;
    st.x*=(u_resolution.x/grid.x)/(u_resolution.y/grid.y);
    // u_seed reshuffles which flower type / petal count lands in each cell,
    // so every artifact gets a distinct arrangement (same floral identity).
    // u_unique gates it: 0 = original fixed layout (old artifacts), 1 = unique.
    float rand=hash(id + u_seed * u_unique);
    float type=floor(rand*3.0);
    float seed=rand*5.0, numPetals=type==0.0?6.0:(type==1.0?9.0:13.0);
    float d=length(st), mask=flower(st,numPetals,seed*TAU);
    vec3 bg=mix(vec3(.055,0.,.025),vec3(.09,.01,.04),exp(-d*4.0)*0.25);
    vec3 col=palette(d*.5+seed+u_time*.25);
    gl_FragColor=vec4(mix(bg,col,mask)*smoothstep(1.25,.35,d),1.0);
}
`,
};

const loveHolding: ShaderDef = {
  id: "love-holding",
  name: "Holding Hands",
  description: "Two lights finding each other in the dark.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718

mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }

vec3 touchPalette(float t,float shift){
    return vec3(0.5)+vec3(0.5)*cos(TAU*(vec3(t)+vec3(0.0,0.33,0.67)+vec3(shift)));
}

void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*1.5;
    vec2 handA=st-vec2(-0.35,0.0), handB=st-vec2(0.35,0.0);
    float dA=length(handA), dB=length(handB), dCenter=length(st);
    float angA=atan(handA.y,handA.x)+sin(dB*6.0-t*2.0)*0.4;
    float angB=atan(handB.y,handB.x)-sin(dA*6.0-t*2.0)*0.4;
    float tendrilsA=smoothstep(0.08,0.0,abs(sin(angA*(5.0+floor(u_seed*u_unique*4.0))+t)))*exp(-dA*1.2);
    float tendrilsB=smoothstep(0.08,0.0,abs(sin(angB*(5.0+floor(u_seed*u_unique*4.0))-t)))*exp(-dB*1.2);
    float gripArea=exp(-abs(dA-dB)*5.0)*exp(-dCenter*1.5);
    vec3 colA=touchPalette(dA*0.4-t*0.2,0.0);
    vec3 colB=touchPalette(dB*0.4-t*0.2,0.5);
    vec3 coreGlow=touchPalette(dCenter*1.2+t*0.6,0.25);
    vec3 ambientBg=vec3(0.005,0.002,0.01)*(1.0-dCenter);
    vec3 foreground=mix(colA*tendrilsA,colB*tendrilsB,0.5);
    vec3 pulseLight=coreGlow*gripArea*(1.0+0.4*sin(t*3.5))*1.8;
    float rimLight=(tendrilsA+tendrilsB)*smoothstep(0.1,0.8,gripArea)*0.35;
    vec3 col=ambientBg+foreground+pulseLight+rimLight;
    gl_FragColor=vec4(clamp(col,0.0,1.0)*smoothstep(1.5,0.3,length(st)),1.0);
}
`,
};

// ─── HOPE ─────────────────────────────────────────────────────────────────────

const hopeGolden: ShaderDef = {
  id: "hope-golden",
  name: "Golden Recursion",
  description: "Light folding back on itself, endlessly returning.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718

vec2 foldSpace(vec2 p,float i,float t){
    float angle=i*0.45+t*0.15+u_seed*u_unique;
    p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
    p.x+=sin(p.y*3.5+t*0.5)*0.12;
    p.y+=cos(p.x*3.5-t*0.4)*0.12;
    return p;
}

void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.5;
    float dCenter=length(st);
    vec3 pureGold=vec3(0.98,0.72,0.32);
    float recursiveField=0.0, lightWeight=0.0;
    vec2 p=st*0.9;
    for(float i=1.0;i<=4.0;i++){
        p=foldSpace(p,i,t);
        float d=length(p);
        float rays=abs(sin(atan(p.y,p.x)*4.0+t*1.2))*cos(d*6.0-t*i);
        float layerGlow=smoothstep(0.12,0.0,abs(rays*exp(-d*1.1)))*smoothstep(1.3/i,0.0,d);
        recursiveField+=layerGlow*(1.2/i);
        lightWeight+=(1.0/i)*smoothstep(0.35,0.0,d);
    }
    vec3 ambientDark=vec3(0.015,0.008,0.003);
    vec3 lightLayers=pureGold*recursiveField*1.6;
    vec3 fineHighlights=vec3(1.0,0.95,0.85)*pow(recursiveField,3.0)*0.4;
    vec3 centerCradle=pureGold*lightWeight*(1.2+0.3*sin(t*3.0));
    vec3 finalCol=mix(ambientDark,lightLayers+fineHighlights,smoothstep(0.02,0.9,recursiveField));
    finalCol+=centerCradle*0.5;
    gl_FragColor=vec4(clamp(finalCol,0.0,1.0)*smoothstep(1.5,0.35,dCenter),1.0);
}
`,
};

const hopeAscending: ShaderDef = {
  id: "hope-ascending",
  name: "Ascending Light",
  description: "Vertical beams of pure gold rising through the void.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718

vec2 ascendSpace(vec2 p,float i,float t){
    float angle=sin(t*0.1)*0.1+(i*0.2)+u_seed*u_unique*0.3;
    p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
    p.y-=abs(sin(p.x*2.0+t))*(0.15/i);
    p.x+=cos(p.y*3.0+t*0.8)*(0.1/i);
    return p*(1.1+0.05*sin(t));
}

void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.7;
    float dCenter=length(st);
    vec3 dawnGold=vec3(1.0,0.78,0.35), whiteCore=vec3(1.0,0.98,0.90);
    float recursiveLight=0.0, upwardDrive=0.0;
    vec2 p=st; p.y+=0.2;
    for(float i=1.0;i<=5.0;i++){
        p=ascendSpace(p,i,t);
        float d=length(p);
        float rays=smoothstep(0.04,0.0,abs(p.x)-(0.01*i))*cos(p.y*4.0-t*i);
        float aura=smoothstep(0.8/i,0.0,d)*(1.0-smoothstep(0.0,0.08,abs(p.x)));
        recursiveLight+=(rays+aura)*(1.5/i);
        upwardDrive+=(1.0/i)*smoothstep(0.4,0.0,length(p-vec2(0.0,0.3)));
    }
    vec3 velvetDark=vec3(0.01,0.01,0.015);
    vec3 lightField=mix(dawnGold,whiteCore,smoothstep(0.5,1.5,recursiveLight))*recursiveLight;
    vec3 spark=whiteCore*upwardDrive*(1.3+0.3*sin(t*5.0));
    vec3 finalCol=mix(velvetDark,lightField,smoothstep(0.01,0.8,recursiveLight));
    finalCol+=spark*0.6;
    float verticalBias=smoothstep(-1.2,0.8,st.y);
    finalCol*=verticalBias;
    gl_FragColor=vec4(clamp(finalCol,0.0,1.0)*smoothstep(1.6,0.4,dCenter),1.0);
}
`,
};

const hopeLanterns: ShaderDef = {
  id: "hope-lanterns",
  name: "Paper Lanterns",
  description: "Three lanterns swaying gently in museum air.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718

vec3 hammeredGold(vec2 uv,float brightness){
    float shimmer=fract(sin(dot(uv*150.0,vec2(12.9898,78.233)))*43758.5453);
    vec3 leafGold=vec3(0.92,0.68,0.22);
    vec3 polishedJewel=vec3(1.00,0.88,0.55);
    vec3 deepCopper=vec3(0.65,0.38,0.12);
    vec3 baseColor=mix(deepCopper,leafGold,smoothstep(0.1,0.5,brightness));
    baseColor=mix(baseColor,polishedJewel,smoothstep(0.5,1.0,brightness));
    return baseColor*(brightness+shimmer*0.07*step(0.1,brightness));
}

void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.7;
    float dCenter=length(st);
    float bgWaves=sin(st.x*3.0+t*0.5)*cos(st.y*4.0-t*0.3);
    vec3 ambientAir=vec3(0.02,0.012,0.008)*(1.0-dCenter*0.6);
    ambientAir+=vec3(0.85,0.55,0.2)*abs(bgWaves)*0.03*(1.0-dCenter);
    vec3 foregroundCol=vec3(0.0);
    for(float i=1.0;i<=3.0;i++){
        vec2 p=st-vec2((i-2.0)*0.65,0.15-i*0.12);
        float sway=sin(t*1.2+i*2.0+u_seed*u_unique)*0.06;
        p.x+=sway*(1.0-p.y*0.5);
        float dX=abs(p.x);
        float bodyFrame=smoothstep(0.24,0.22,dX+abs(p.y*0.4))*step(abs(p.y),0.32);
        float endCaps=smoothstep(0.14,0.12,dX)*smoothstep(0.02,0.0,abs(abs(p.y)-0.33));
        float hangerWire=smoothstep(0.005,0.0,dX)*step(0.33,p.y)*exp(-p.y*0.5);
        float waves=sin(p.x*60.0+sin(p.y*30.0))*cos(p.y*60.0);
        float filigreeGrid=smoothstep(0.1,0.3,abs(waves))*bodyFrame;
        float breathingPulse=0.7+0.3*sin(t*2.5+i*TAU/3.0);
        float coreEnergy=exp(-length(p*vec2(1.8,1.2))*4.0)*breathingPulse*2.2;
        float wrapAura=exp(-length(p*vec2(1.2,0.8))*1.8)*0.35*breathingPulse;
        vec3 internalIllumination=hammeredGold(p,coreEnergy)*(0.2+filigreeGrid*0.8);
        vec3 externalAura=vec3(0.95,0.65,0.25)*wrapAura;
        vec3 solids=hammeredGold(p,0.5)*endCaps+vec3(0.4,0.3,0.15)*hangerWire;
        foregroundCol+=(internalIllumination+externalAura)*bodyFrame+solids;
        ambientAir+=vec3(0.9,0.6,0.2)*exp(-length(p)*2.5)*0.04*breathingPulse;
    }
    float tinySparks=0.0;
    vec2 spUV=st*vec2(4.0,2.0);
    spUV.y-=t*0.8; spUV.x+=sin(spUV.y*2.0+t)*0.3;
    vec2 id=floor(spUV); vec2 local=fract(spUV)-0.5;
    float h=fract(sin(dot(id,vec2(45.13,92.87)))*9437.12);
    if(h>0.75) tinySparks=smoothstep(0.04*h,0.0,length(local))*smoothstep(-0.5,0.8,st.y);
    foregroundCol+=hammeredGold(st,tinySparks*0.9);
    vec3 finalCol=ambientAir+foregroundCol;
    gl_FragColor=vec4(clamp(finalCol,0.0,1.0)*smoothstep(1.7,0.5,dCenter),1.0);
}
`,
};

const hopeCrane: ShaderDef = {
  id: "hope-crane",
  name: "Paper Crane",
  description: "A folded wing suspended in golden air.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define VOID vec3(0.02, 0.01, 0.01)
#define GOLD vec3(0.84, 0.70, 0.56)
#define LIGHT vec3(0.95, 0.92, 0.81)

float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }

float craneShape(vec2 p){
    p.y+=0.2;
    float body=length(p*vec2(1.2,2.0))-0.15;
    float wingAngle=atan(p.y,abs(p.x)-0.2);
    float wings=length(p-vec2(0.0,0.1))-(0.4+0.15*sin(wingAngle*2.0));
    float neck=length(p-vec2(0.1,0.3))-0.08;
    return min(body,min(wings,neck));
}

void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    vec2 pos=st+vec2(0.0,0.25);
    pos.x+=sin(u_time*0.5)*0.05;
    float flex=sin(u_time*1.5)*0.02;
    float body=length(pos*vec2(1.2,2.0))-(0.15+flex);
    float wingAngle=atan(pos.y,abs(pos.x)-0.2);
    float wings=length(pos-vec2(0.0,0.1))-(0.4+0.1*sin(wingAngle*(2.0+u_seed*u_unique*2.0)+u_time));
    float neck=length(pos-vec2(0.1,0.3))-0.08;
    float d=min(body,min(wings,neck));
    float crane=1.0-smoothstep(0.0,0.02,d);
    float pulse=sin(u_time*1.2)*0.15+0.85;
    float glow=(0.06/(d+0.04))*(sin(u_time*1.5)*0.1+0.9);
    float grain=(hash(st*150.0+fract(u_time*0.2))-0.5)*0.12;
    vec3 col=VOID;
    col=mix(col,GOLD,crane);
    col+=LIGHT*glow;
    col+=grain;
    gl_FragColor=vec4(col,1.0);
}
`,
};

const hopeFluid1: ShaderDef = {
  id: "hope-fluid-1",
  name: "Neon Growth",
  description: "A generative structure reaching upward with bright lime and teal.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;

#define C0 vec3(0.722, 1.000, 0.180) 
#define C1 vec3(0.122, 0.851, 0.643) 
#define C2 vec3(0.039, 0.478, 0.361) 
#define C3 vec3(0.918, 1.000, 0.816) 
#define BG vec3(0.016, 0.027, 0.039) 

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

vec3 pal(float t){
    t = fract(t);
    if(t < 0.333) return mix(C0, C1, t / 0.333);
    if(t < 0.666) return mix(C1, C2, (t - 0.333) / 0.333);
    return mix(C2, C3, (t - 0.666) / 0.334);
}

float truchetArc(vec2 p, float s){
    p *= s;
    vec2 id = floor(p);
    vec2 lp = fract(p) - 0.5;
    if(hash(id) > 0.5) lp.x = -lp.x;
    float d1 = abs(length(lp - vec2(-0.5, 0.5)) - 0.5);
    float d2 = abs(length(lp - vec2( 0.5,-0.5)) - 0.5);
    return min(d1, d2);
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.89;

    vec2 w = uv + vec2(
        sin(uv.y * 5.603 + t * 0.957 + u_seed*u_unique),
        cos(uv.x * 5.603 - t * 0.957 + u_seed*u_unique*1.7)
    ) * 0.233;

    float d  = truchetArc(w,          41.0);
    float d2 = truchetArc(w * 0.5 + t * 0.05, 20.5);
    float d3 = truchetArc(w * 2.0 - t * 0.03, 82.0);

    float s1 = 1.0 - smoothstep(0.0, 0.018, d  - 0.012);
    float s2 = 1.0 - smoothstep(0.0, 0.015, d2 - 0.018);
    float s3 = 1.0 - smoothstep(0.0, 0.012, d3 - 0.018);

    float len = length(uv);
    vec3 col = BG;
    col = mix(col, pal(len * 0.46 + t * 0.08),         s1 * 1.175);
    col = mix(col, pal(len * 0.46 + t * 0.08 + 0.333), s2 * 0.75);
    col = mix(col, pal(len * 0.46 + t * 0.08 + 0.666), s3 * 0.60);
    col += pal(len * 0.46 + t * 0.08)       * exp(-d  * 7.5) * s1 * 0.6;
    col += pal(len * 0.46 + t * 0.08 + 0.5) * exp(-d2 * 7.5) * s2 * 0.4;
    col *= smoothstep(1.48, 0.3, len);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
};

const hopeFluid2: ShaderDef = {
  id: "hope-fluid-2",
  name: "Lime Cascade",
  description: "A bright, energetic pattern of cascading teal and yellow-green.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;

#define C0 vec3(0.722, 1.000, 0.180) 
#define C1 vec3(0.122, 0.851, 0.643) 
#define C2 vec3(0.039, 0.478, 0.361) 
#define C3 vec3(0.918, 1.000, 0.816) 
#define BG vec3(0.016, 0.027, 0.039) 

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

vec3 pal(float t){
    t = fract(t);
    if(t < 0.333) return mix(C0, C1, t / 0.333);
    if(t < 0.666) return mix(C1, C2, (t - 0.333) / 0.333);
    return mix(C2, C3, (t - 0.666) / 0.334);
}

float truchet(vec2 p, float s){
    p *= s;
    vec2 id = floor(p);
    vec2 lp = fract(p) - 0.5;
    if(hash(id) > 0.5) lp.x = -lp.x;
    return min(abs(length(lp - vec2(-0.5, 0.5)) - 0.5), abs(length(lp - vec2( 0.5,-0.5)) - 0.5));
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.929;

    vec2 w = uv + vec2(
        sin(uv.y * 4.985 + t * 0.74 + u_seed*u_unique),
        cos(uv.x * 4.985 - t * 0.74 + u_seed*u_unique*1.7)
    ) * 1.69;

    float d  = truchet(w,          12.716);
    float d2 = truchet(w * 0.5 + t * 0.05, 6.358);
    float d3 = truchet(w * 2.0 - t * 0.03, 25.432);

    float s1 = 1.0 - smoothstep(0.0, 0.018, d  - 0.012);
    float s2 = 1.0 - smoothstep(0.0, 0.015, d2 - 0.018);
    float s3 = 1.0 - smoothstep(0.0, 0.012, d3 - 0.018);

    float len = length(uv);
    vec3 col = BG;
    col = mix(col, pal(len * 0.46 + t * 0.08),         s1 * 1.175);
    col = mix(col, pal(len * 0.46 + t * 0.08 + 0.333), s2 * 0.75);
    col = mix(col, pal(len * 0.46 + t * 0.08 + 0.666), s3 * 0.60);
    col += pal(len * 0.46 + t * 0.08)       * exp(-d  * 7.5) * s1 * 0.6;
    col += pal(len * 0.46 + t * 0.08 + 0.5) * exp(-d2 * 7.5) * s2 * 0.4;
    col *= smoothstep(1.48, 0.3, len);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
};

// ─── REGRET ───────────────────────────────────────────────────────────────────

const regretSpiral: ShaderDef = {
  id: "regret-spiral",
  name: "Smoke Spiral",
  description: "Choices spiraling outward, never fully settling.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
#define BASE   vec3(0.725, 0.796, 0.890)
#define WASH   vec3(0.867, 0.922, 0.980)
#define SHADOW vec3(0.557, 0.659, 0.784)
#define DEEP   vec3(0.010, 0.020, 0.045)

float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }

float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    float a=hash21(i), b=hash21(i+vec2(1,0)), c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
    return v;
}

void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;
    float t=u_time*2.5;
    float r=length(uv), a=atan(uv.y,uv.x);
    float spiral=a+2.8/(r+0.18)+t*0.25+u_seed*u_unique;
    vec2 suv=vec2(cos(spiral),sin(spiral))*r;
    float smoke=fbm(suv*4.0+vec2(t*0.05,-t*0.04));
    float arm=sin(r*26.0-a*5.0+t*1.6+smoke*4.0);
    arm=smoothstep(0.15,1.0,arm);
    float glow=exp(-r*2.5);
    vec3 col=DEEP;
    col+=SHADOW*smoke*0.35;
    col+=BASE*arm*glow*0.75;
    col+=WASH*pow(arm,4.0)*glow*0.55;
    float vignette=1.0-smoothstep(0.75,1.3,r);
    col*=vignette;
    gl_FragColor=vec4(col,1.0);
}
`,
};

const regretTunnel: ShaderDef = {
  id: "regret-tunnel",
  name: "Neon Tunnel",
  description: "Falling through a corridor of unresolved moments.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
#define GLOW   vec3(0.35, 0.60, 0.95)
#define CORE   vec3(0.15, 0.30, 0.65)
#define SHADOW vec3(0.02, 0.05, 0.15)
#define DEEP   vec3(0.005, 0.01, 0.03)

float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }

float box(vec2 p,vec2 b){
    vec2 d=abs(p)-b;
    float outside=length(max(d,0.0));
    float inside=min(max(d.x,d.y),0.0);
    return 1.0-smoothstep(0.0,0.005,outside+inside);
}

float glyph(vec2 p,float id){
    float g=0.0;
    if(id<0.25){ g+=box(p,vec2(0.04,0.28)); g+=box(p-vec2(0.0,-0.38),vec2(0.05,0.05)); }
    else if(id<0.5){ g+=box(p-vec2(-0.12,0.0),vec2(0.04,0.28)); g+=box(p-vec2(0.12,0.0),vec2(0.04,0.28)); g+=box(p,vec2(0.20,0.035)); }
    else if(id<0.75){ g+=box(p+vec2(0.12,-0.12),vec2(0.18,0.035)); g+=box(p-vec2(0.12,0.12),vec2(0.18,0.035)); }
    else{ g+=box(p,vec2(0.22,0.035)); g+=box(p,vec2(0.035,0.22)); }
    return g;
}

void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*u_resolution.xy)/u_resolution.y;
    uv.x+=sin(u_time*0.4)*0.02;
    uv.y+=cos(u_time*0.3)*0.02;
    float r=max(length(uv),0.0001), a=atan(uv.y,uv.x);
    float warp=sin(r*15.0-u_time*1.5)*0.015;
    float depth=0.5/(r+warp);
    vec2 tunnelUV=vec2(a/6.28318,depth);
    tunnelUV.y-=u_time*2.0;
    tunnelUV.x+=sin(depth*1.5+u_time*0.5)*0.05;
    vec2 cells=vec2(24.0,24.0);
    vec2 gridUV=tunnelUV*cells;
    vec2 id=floor(gridUV);
    vec2 gv=fract(gridUV)-0.5;
    vec2 edge=smoothstep(0.46,0.5,abs(gv));
    float wireframe=max(edge.x,edge.y);
    float rnd=hash21(id + vec2(u_seed*u_unique));
    float appear=step(0.5,rnd);
    float g=glyph(gv,rnd);
    vec3 col=DEEP;
    float distFade=smoothstep(0.0,2.5,depth);
    col+=SHADOW*(1.0-distFade);
    col+=CORE*wireframe*0.35*(1.0-distFade);
    float flicker=0.8+0.2*sin(u_time*15.0+rnd*20.0);
    col+=GLOW*g*appear*flicker*(1.0-distFade);
    col+=CORE*g*appear*(1.0-distFade)*0.8;
    float voidPull=smoothstep(0.0,0.45,r);
    float vignette=smoothstep(1.3,0.15,r);
    col*=voidPull*vignette;
    gl_FragColor=vec4(col,1.0);
}
`,
};

const regretWave: ShaderDef = {
  id: "regret-wave",
  name: "Echo Waves",
  description: "Where choices echo outward, never truly fading.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;

void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float r=length(uv), a=atan(uv.y,uv.x);
    float t=u_time*1.2;
    float rings=sin(r*20.0-t*3.0+u_seed*u_unique)*0.5+0.5;
    float angular=sin(a*(8.0+floor(u_seed*u_unique*6.0))+t*0.5)*0.3+0.7;
    float field=rings*angular;
    float decay=exp(-r*1.2);
    vec3 deep=vec3(0.005,0.015,0.04);
    vec3 mid=vec3(0.1,0.28,0.55);
    vec3 hi=vec3(0.5,0.75,1.0);
    vec3 col=mix(deep,mid,field*decay);
    col=mix(col,hi,smoothstep(0.6,0.9,field)*decay*0.6);
    col*=smoothstep(1.3,0.1,r);
    gl_FragColor=vec4(col,1.0);
}
`,
};

// ─── GRIEF, LMN1 preset seed 9015 ────────────────────────────────────────────
// #19e3e3 teal · #ff2d78 hot-pink · #ff7a1a orange · #7a2dff purple · bg #040406
// scale 23 · speed 0.62 · density 0.957 · warp 5.603 · mix 0.233

const griefTruchet: ShaderDef = {
  id: "grief-truchet",
  name: "Chromatic Grief",
  description: "Dirty purple and grey arcs unravelling, the subtle motion of grief.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define C0 vec3(0.29, 0.24, 0.37)
#define C1 vec3(0.48, 0.48, 0.48)
#define C2 vec3(0.15, 0.12, 0.20)
#define C3 vec3(0.35, 0.35, 0.40)
#define BG vec3(0.05, 0.04, 0.07)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

vec3 pal(float t){
    t = fract(t);
    if(t < 0.333) return mix(C0, C1, t / 0.333);
    if(t < 0.666) return mix(C1, C2, (t - 0.333) / 0.333);
    return mix(C2, C3, (t - 0.666) / 0.334);
}

float truchetArc(vec2 p, float s){
    p *= s;
    vec2 id = floor(p);
    vec2 lp = fract(p) - 0.5;
    if(hash(id + u_seed) > 0.5) lp.x = -lp.x;
    float d1 = abs(length(lp - vec2(-0.5, 0.5)) - 0.5);
    float d2 = abs(length(lp - vec2( 0.5,-0.5)) - 0.5);
    return min(d1, d2);
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * (0.4 + u_intensity * 0.4);

    vec2 w = uv + vec2(
        sin(uv.y * 5.603 + t * 0.957),
        cos(uv.x * 5.603 - t * 0.957)
    ) * 0.233;

    float s = 15.0 + mod(u_seed, 20.0);
    float d  = truchetArc(w,          s);
    float d2 = truchetArc(w * 0.5 + t * 0.05, s * 0.5);
    float d3 = truchetArc(w * 2.0 - t * 0.03, s * 2.0);

    float s1 = 1.0 - smoothstep(0.0, 0.018, d  - 0.012);
    float s2 = 1.0 - smoothstep(0.0, 0.015, d2 - 0.018);
    float s3 = 1.0 - smoothstep(0.0, 0.012, d3 - 0.018);

    float len = length(uv);
    vec3 col = BG;
    col = mix(col, pal(len * 0.46 + t * 0.08),         s1 * 1.175);
    col = mix(col, pal(len * 0.46 + t * 0.08 + 0.333), s2 * 0.75);
    col = mix(col, pal(len * 0.46 + t * 0.08 + 0.666), s3 * 0.60);
    col += pal(len * 0.46 + t * 0.08)       * exp(-d  * 7.5) * s1 * 0.6;
    col += pal(len * 0.46 + t * 0.08 + 0.5) * exp(-d2 * 7.5) * s2 * 0.4;
    col *= smoothstep(1.48, 0.3, len);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

const griefFireSlow: ShaderDef = {
  id: "grief-fire-slow",
  name: "Slow Burn",
  description: "A grief that doesn't rage, it smoulders, quietly, in deep purple and grey.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define C0 vec3(0.25, 0.18, 0.32)
#define C1 vec3(0.12, 0.08, 0.15)
#define C2 vec3(0.42, 0.42, 0.48)
#define C3 vec3(0.20, 0.15, 0.25)
#define BG vec3(0.05, 0.04, 0.07)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

vec3 pal(float t){
    t=fract(t);
    if(t<0.333) return mix(C0,C1,t/0.333);
    if(t<0.666) return mix(C1,C2,(t-0.333)/0.333);
    return mix(C2,C3,(t-0.666)/0.334);
}

float truchet(vec2 p,float s){
    p*=s; vec2 id=floor(p); vec2 lp=fract(p)-0.5;
    if(hash(id + u_seed)>0.5) lp.x=-lp.x;
    return min(abs(length(lp-vec2(-0.5,0.5))-0.5),abs(length(lp-vec2(0.5,-0.5))-0.5));
}

void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*(0.3 + u_intensity * 0.3);
    vec2 w=uv+vec2(sin(uv.y*5.8+t*0.58),cos(uv.x*5.8-t*0.58))*0.21;
    float s = 100.0 + mod(u_seed, 100.0);
    float d =truchet(w,       s);
    float d2=truchet(w*0.5+t*0.02, s * 0.5);
    float d3=truchet(w*2.0-t*0.01, s * 2.0);
    float s1=1.0-smoothstep(0.0,0.008,d -0.004);
    float s2=1.0-smoothstep(0.0,0.008,d2-0.004);
    float s3=1.0-smoothstep(0.0,0.006,d3-0.003);
    float len=length(uv);
    vec3 col=BG;
    col=mix(col,pal(len*0.57+t*0.06),        s1*1.12);
    col=mix(col,pal(len*0.57+t*0.06+0.333),  s2*0.76);
    col=mix(col,pal(len*0.57+t*0.06+0.666),  s3*0.58);
    col+=pal(len*0.57+t*0.06)*exp(-d*12.0)*s1*0.5;
    col*=smoothstep(1.48,0.25,len);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const griefFireFast: ShaderDef = {
  id: "grief-fire-fast",
  name: "The Burning",
  description: "The kind of grief that moves fast, flickering in grey and purple.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define C0 vec3(0.35, 0.28, 0.45)
#define C1 vec3(0.15, 0.10, 0.22)
#define C2 vec3(0.55, 0.55, 0.60)
#define C3 vec3(0.30, 0.25, 0.35)
#define BG vec3(0.05, 0.04, 0.07)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

vec3 pal(float t){
    t=fract(t);
    if(t<0.333) return mix(C0,C1,t/0.333);
    if(t<0.666) return mix(C1,C2,(t-0.333)/0.333);
    return mix(C2,C3,(t-0.666)/0.334);
}

float truchet(vec2 p,float s){
    p*=s; vec2 id=floor(p); vec2 lp=fract(p)-0.5;
    if(hash(id + u_seed)>0.5) lp.x=-lp.x;
    return min(abs(length(lp-vec2(-0.5,0.5))-0.5),abs(length(lp-vec2(0.5,-0.5))-0.5));
}

void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*(1.2 + u_intensity * 0.8);
    vec2 w=uv+vec2(sin(uv.y*5.8+t*0.58),cos(uv.x*5.8-t*0.58))*0.215;
    float s = 40.0 + mod(u_seed, 40.0);
    float d =truchet(w,        s);
    float d2=truchet(w*0.5+t*0.05, s * 0.5);
    float d3=truchet(w*2.0-t*0.03, s * 2.0);
    float s1=1.0-smoothstep(0.0,0.014,d -0.007);
    float s2=1.0-smoothstep(0.0,0.014,d2-0.007);
    float s3=1.0-smoothstep(0.0,0.010,d3-0.005);
    float len=length(uv);
    vec3 col=BG;
    col=mix(col,pal(len*0.57+t*0.08),        s1*1.12);
    col=mix(col,pal(len*0.57+t*0.08+0.333),  s2*0.76);
    col=mix(col,pal(len*0.57+t*0.08+0.666),  s3*0.58);
    col+=pal(len*0.57+t*0.08)*exp(-d*8.0)*s1*0.6;
    col+=pal(len*0.57+t*0.08+0.5)*exp(-d2*8.0)*s2*0.4;
    col*=smoothstep(1.48,0.25,len);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

// ─── GRIEF, Fluid Gyroid · DUSK · zoom=3.6 warp=8.8 speed=1.2 grain=0.2 seed=40

const griefGyroidDusk: ShaderDef = {
  id: "grief-gyroid-dusk",
  name: "Dusk Gyroid",
  description: "A triply-periodic surface in dirty mauve and grey, the shape of something that cannot be closed.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define D0 vec3(0.05, 0.04, 0.07)
#define D1 vec3(0.20, 0.15, 0.25)
#define D2 vec3(0.30, 0.25, 0.40)
#define D3 vec3(0.45, 0.45, 0.50)
#define D4 vec3(0.25, 0.22, 0.35)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 dusk(float t){
    t=fract(t)*4.0; int i=int(t); float f=fract(t);
    if(i==0) return mix(D0,D1,f);
    if(i==1) return mix(D1,D2,f);
    if(i==2) return mix(D2,D3,f);
    return mix(D3,D4,f);
}
float gyroid(vec3 p){ return sin(p.x)*cos(p.y)+sin(p.y)*cos(p.z)+sin(p.z)*cos(p.x); }
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*(0.8 + u_intensity * 0.8);
    vec2 w=uv+vec2(sin(uv.y*8.8+t*0.4),cos(uv.x*8.8-t*0.35))*0.18;
    vec3 p=vec3(w*(2.0 + mod(u_seed, 3.0)), t*0.35 + u_seed);
    float g=gyroid(p);
    float c1=1.0-smoothstep(0.0,0.12,abs(g));
    float c2=1.0-smoothstep(0.0,0.06,abs(g-1.0));
    float c3=1.0-smoothstep(0.0,0.06,abs(g+1.0));
    vec2 htUV=uv*(30.0 + mod(u_seed, 20.0));
    float ht=length(fract(htUV)-0.5);
    float halftone=smoothstep(0.45,0.35,ht)*(0.15+0.15*sin(g*3.0+t));
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.2;
    vec3 col=dusk(length(uv)*0.5+t*0.07);
    col=mix(D0,col,c1*1.2+c2*0.6+c3*0.6);
    col+=dusk(length(uv)*0.5+t*0.07+0.5)*halftone;
    col+=grain*0.4;
    col*=smoothstep(1.6,0.3,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const griefAmber: ShaderDef = {
  id: "grief-amber",
  name: "Ash Echo",
  description: "Grief as cold ash, not extinguished, just changed in form.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define C0 vec3(0.25, 0.22, 0.32)
#define C1 vec3(0.40, 0.40, 0.45)
#define C2 vec3(0.15, 0.12, 0.20)
#define C3 vec3(0.08, 0.08, 0.12)
#define BG vec3(0.05, 0.04, 0.07)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.333) return mix(C0,C1,t/0.333);
    if(t<0.666) return mix(C1,C2,(t-0.333)/0.333);
    return mix(C2,C3,(t-0.666)/0.334);
}
float truchet(vec2 p,float s){
    p*=s; vec2 id=floor(p); vec2 lp=fract(p)-0.5;
    if(hash(id + u_seed)>0.5) lp.x=-lp.x;
    return min(abs(length(lp-vec2(-0.5,0.5))-0.5),abs(length(lp-vec2(0.5,-0.5))-0.5));
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*(0.9 + u_intensity * 0.4);
    vec2 w=uv+vec2(sin(uv.y*5.603+t*0.803),cos(uv.x*5.603-t*0.803))*0.233;
    w.y+=t*(-0.089)*0.01;
    float s = 80.0 + mod(u_seed, 50.0);
    float d =truchet(w,       s);
    float d2=truchet(w*0.5+t*0.04, s * 0.5);
    float d3=truchet(w*2.0-t*0.02, s * 2.0);
    float s1=1.0-smoothstep(0.0,0.012,d -0.006);
    float s2=1.0-smoothstep(0.0,0.012,d2-0.006);
    float s3=1.0-smoothstep(0.0,0.009,d3-0.005);
    float len=length(uv);
    vec3 col=BG;
    col=mix(col,pal(len*0.46+t*0.079),         s1*1.175);
    col=mix(col,pal(len*0.46+t*0.079+0.333),   s2*0.72);
    col=mix(col,pal(len*0.46+t*0.079+0.666),   s3*0.57);
    col+=pal(len*0.46+t*0.079)*exp(-d*9.0)*s1*0.55;
    col+=pal(len*0.46+t*0.079+0.5)*exp(-d2*9.0)*s2*0.38;
    col*=smoothstep(1.48,0.25,len);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const griefInterfereDusk: ShaderDef = {
  id: "grief-interfere-dusk",
  name: "Interference / Dusk",
  description: "Two grief-waves meeting in dirty purple and grey, the place where one loss disturbs another.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define D0 vec3(0.05, 0.04, 0.07)
#define D1 vec3(0.20, 0.15, 0.25)
#define D2 vec3(0.35, 0.32, 0.45)
#define D3 vec3(0.48, 0.48, 0.52)
#define D4 vec3(0.25, 0.20, 0.35)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 dusk(float t){
    t=fract(t)*4.0; int i=int(t); float f=fract(t);
    if(i==0) return mix(D0,D1,f);
    if(i==1) return mix(D1,D2,f);
    if(i==2) return mix(D2,D3,f);
    return mix(D3,D4,f);
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*(1.8 + u_intensity * 0.9);
    vec2 s1=vec2(cos(u_seed),sin(u_seed))*0.55;
    vec2 s2=vec2(-cos(u_seed),-sin(u_seed))*0.55;
    vec2 w=uv+vec2(sin(uv.y*9.0+t*0.4),cos(uv.x*9.0-t*0.38))*0.16;
    w*=(3.0 + mod(u_seed, 2.0));
    float r1=length(w-s1*4.0);
    float r2=length(w-s2*4.0);
    float wave1=sin(r1*6.28-t*2.5);
    float wave2=sin(r2*6.28+t*2.5);
    float field=(wave1+wave2)*0.5;
    float bright=smoothstep(-0.5,1.0,field);
    float rings=1.0-smoothstep(0.0,0.08,abs(field));
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.08;
    vec3 col=mix(D0,dusk(bright*0.7+t*0.05),bright);
    col+=dusk(length(uv)*0.4+t*0.07+0.5)*rings*0.6;
    col+=grain;
    col*=smoothstep(1.6,0.3,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const griefInterfereChrome: ShaderDef = {
  id: "grief-interfere-chrome",
  name: "Interference / Steel",
  description: "The cold, metallic interference of grief in grey and dirty purple, flat, reflective, unyielding.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define K0 vec3(0.05,0.04,0.07)
#define K1 vec3(0.20,0.20,0.25)
#define K2 vec3(0.35,0.35,0.40)
#define K3 vec3(0.48,0.48,0.52)
#define K4 vec3(0.40,0.35,0.45)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 chrome(float t){
    t=fract(t)*4.0; int i=int(t); float f=fract(t);
    if(i==0) return mix(K0,K1,f);
    if(i==1) return mix(K1,K2,f);
    if(i==2) return mix(K2,K3,f);
    return mix(K3,K4,f);
}
float hexDist(vec2 p){
    p=abs(p);
    return max(dot(p,normalize(vec2(1,1.732))),p.x);
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*(1.8 + u_intensity * 0.9);
    vec2 s1=vec2(cos(u_seed + 1.0),sin(u_seed + 1.0))*0.55;
    vec2 s2=vec2(-cos(u_seed + 1.0),-sin(u_seed + 1.0))*0.55;
    vec2 w=uv+vec2(sin(uv.y*9.0+t*0.4),cos(uv.x*9.0-t*0.38))*0.16;
    w*=(3.5 + mod(u_seed, 1.5));
    float r1=length(w-s1*4.0);
    float r2=length(w-s2*4.0);
    float field=(sin(r1*6.28-t*2.5)+sin(r2*6.28+t*2.5))*0.5;
    float bright=smoothstep(-0.5,1.0,field);
    vec2 hexUV=uv*(10.0 + mod(u_seed, 8.0));
    vec2 gv=fract(hexUV*vec2(1.0,0.5774))-0.5;
    float hexLine=1.0-smoothstep(0.44,0.46,hexDist(gv));
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.205;
    vec3 col=chrome(bright*0.7+t*0.04);
    col+=chrome(1.0-bright+t*0.04)*hexLine*0.35;
    col+=(1.0-smoothstep(0.0,0.08,abs(field)))*chrome(bright+0.3)*0.5;
    col+=grain;
    col*=smoothstep(1.6,0.3,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const griefMono: ShaderDef = {
  id: "grief-mono",
  name: "Null",
  description: "When grief has no colour left. Only the pattern of what was, in grey and off-black.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;

#define C0 vec3(0.45, 0.45, 0.50)
#define C1 vec3(0.12, 0.12, 0.15)
#define C2 vec3(0.08, 0.08, 0.10)
#define C3 vec3(0.35, 0.35, 0.40)
#define BG vec3(0.05, 0.04, 0.07)

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.333) return mix(C0,C1,t/0.333);
    if(t<0.666) return mix(C1,C2,(t-0.333)/0.333);
    return mix(C2,C3,(t-0.666)/0.334);
}
float truchetInv(vec2 p,float s){
    p*=s; vec2 id=floor(p); vec2 lp=fract(p)-0.5;
    if(hash(id + u_seed)<0.5) lp.x=-lp.x;
    return min(abs(length(lp-vec2(-0.5,0.5))-0.5),abs(length(lp-vec2(0.5,-0.5))-0.5));
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.04;
    vec2 w=uv+vec2(sin(uv.y*5.603),cos(uv.x*5.603))*0.095;
    float scale=50.0 + mod(u_seed, 40.0);
    float d =truchetInv(w,         scale);
    float d2=truchetInv(w*0.5+t*0.01,scale*0.5);
    float d3=truchetInv(w*2.0-t*0.005,scale*2.0);
    float s1=1.0-smoothstep(0.0,0.013,d -0.007);
    float s2=1.0-smoothstep(0.0,0.013,d2-0.007);
    float s3=1.0-smoothstep(0.0,0.010,d3-0.005);
    float len=length(uv);
    vec3 col=BG;
    col=mix(col,pal(len*0.68+t),         s1*1.24);
    col=mix(col,pal(len*0.68+t+0.333),   s2*0.95);
    col=mix(col,pal(len*0.68+t+0.666),   s3*0.62);
    col+=pal(len*0.68+t)*exp(-d*10.0)*s1*0.45;
    col*=smoothstep(1.48,0.3,len);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

// ─── LOVE, additional shaders ────────────────────────────────────────────────

const loveRippleButterfly: ShaderDef = {
  id: "love-ripple-butterfly",
  name: "Ripple Wings",
  description: "Wings that send concentric ripples through the space around them.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718
#define SEED 41.82
float hash(float n){ return fract(sin(n)*43758.5453123); }
float hash2(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+19.19); return fract(p.x*p.y); }
vec3 lovePalette(float t){
    t=fract(t);
    if(t<.16) return mix(vec3(.055,.0,.025),vec3(.82,.03,.07),t/.16);
    if(t<.32) return mix(vec3(.82,.03,.07),vec3(.96,.20,.26),(t-.16)/.16);
    if(t<.48) return mix(vec3(.96,.20,.26),vec3(1.,.38,.24),(t-.32)/.16);
    if(t<.64) return mix(vec3(1.,.38,.24),vec3(1.,.76,.55),(t-.48)/.16);
    if(t<.80) return mix(vec3(1.,.76,.55),vec3(1.,.62,.18),(t-.64)/.16);
    return mix(vec3(.05,.55,.50),vec3(.45,.2,.62),(t-.80)/.20);
}
float butterflyMask(vec2 p){
    p.x=abs(p.x); float r=length(p),a=atan(p.y,p.x);
    float s=exp(-pow(a-.62,2.)*4.2)*.78+exp(-pow(a+.55,2.)*5.2)*.58+exp(-pow(a+1.18,2.)*16.)*.32+.012;
    return smoothstep(s,s-.025,r);
}
float body(vec2 p){
    p.x=abs(p.x);
    float b=smoothstep(.018,0.,length(vec2(p.x*2.8,p.y))-.035*(1.25-p.y*1.6));
    float a=smoothstep(.006,0.,abs(p.x-(.018+p.y*.14+sin(p.y*15.)*.01)));
    return clamp(b+a*smoothstep(.10,.16,p.y)*smoothstep(.46,.34,p.y),0.,1.);
}
vec2 voronoi2(vec2 p,float seed){
    vec2 i=floor(p),f=fract(p); float d1=8.,d2=8.;
    for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
        vec2 n=vec2(float(x),float(y));
        vec2 rp=0.5+0.5*sin(u_time*0.3+TAU*vec2(hash2(i+n),hash2(i+n+vec2(31.41,17.3)))+seed);
        float d=length(n+rp-f);
        if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d;
    }
    return vec2(d1,d2);
}
void main(){
    vec2 st=(gl_FragCoord.xy*2.-u_resolution.xy)/u_resolution.y;
    float seed=SEED + u_seed*u_unique;
    float flap=.5+.5*sin(u_time*3.2+seed);
    float flapSpeed=abs(cos(u_time*3.2+seed));
    float dist=length(st);
    float ripple=sin(dist*18.-u_time*6.)*exp(-dist*2.5)*flapSpeed*.12;
    vec2 rippleUV=st+normalize(st+.0001)*ripple;
    vec2 v=voronoi2(rippleUV*4.5+vec2(u_time*.04,0.),seed);
    float lines=1.-smoothstep(0.,.06,v.y-v.x);
    vec3 netCol=lovePalette(fract(u_time*.08+seed*.05))*lines*(.55+flapSpeed*.8);
    vec3 col=vec3(.055,.0,.025);
    col=mix(col,vec3(.18,.025,.055),.34+.24*sin(st.x*3.+st.y*2.+u_time*.25));
    col+=netCol;
    vec2 p=vec2(abs(st.x)/(.18+.82*flap),st.y);
    float mask=butterflyMask(p);
    float r=length(p),a=atan(p.y,p.x);
    vec3 wing=lovePalette(r*.85+u_time*.08+.15*sin(a*3.+u_time));
    wing*=.48+.62*flap;
    col*=1.-mask*.22;
    col=mix(col,wing,mask*.95);
    col=mix(col,vec3(1.,.62,.18),body(st)*.92);
    col+=lovePalette(u_time*.08)*exp(-dist*3.)*flapSpeed*.5;
    col*=smoothstep(1.38,.22,dist);
    gl_FragColor=vec4(clamp(col,0.,1.),1.);
}
`,
};

const loveCosmicFlowers: ShaderDef = {
  id: "love-cosmic-flowers",
  name: "Cosmic Garden",
  description: "A neon cosmos of blooming hearts in every grid cell.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
vec3 cosmicPalette(float t){
    t=fract(t);
    if(t<0.25) return mix(vec3(0.95,0.05,0.65),vec3(0.05,0.95,0.90),t/0.25);
    if(t<0.50) return mix(vec3(0.05,0.95,0.90),vec3(0.45,0.10,0.95),(t-0.25)/0.25);
    if(t<0.75) return mix(vec3(0.45,0.10,0.95),vec3(0.00,0.40,0.98),(t-0.50)/0.25);
    return mix(vec3(0.00,0.40,0.98),vec3(0.05,0.95,0.50),(t-0.75)/0.25);
}
vec2 shapeShift(vec2 p,float cycle){
    float wave=sin(cycle*TAU)*0.15;
    p.x*=(1.1+wave);
    p.y-=(0.28+wave)*sqrt(abs(p.x));
    return p;
}
float bloomingFlower(vec2 uv,float cellTime){
    float stage=mod(cellTime*0.8,2.0);
    float bloom=0.5+0.5*sin(stage*TAU-(TAU*0.25));
    float petalWidth=0.11;
    if(stage>1.0){ float sp=sin((stage-1.0)*TAU-(TAU*0.25))*0.5+0.5; bloom=1.0+sp*0.35; petalWidth=0.11+sp*0.14; }
    float f=0.0;
    for(float i=0.0;i<10.0;i++){
        vec2 p=rot(-(i/10.0*TAU+cellTime*1.8))*uv;
        p.y+=.42*.28-.35*bloom;
        f+=(1.0-smoothstep(.62,.88,length(vec2(p.x/petalWidth,p.y/.46))))*smoothstep(-.46*.75,.46*.22,p.y);
    }
    return clamp(f,0.,1.);
}
void main(){
    vec2 uv=gl_FragCoord.xy/u_resolution.xy;
    vec2 grid=vec2(4.0,3.0),id=floor(uv*grid),st=(fract(uv*grid)-0.5)*2.0;
    st.x*=(u_resolution.x/grid.x)/(u_resolution.y/grid.y);
    float rand=hash(id + u_seed*u_unique);
    float cellTime=u_time*1.4+rand*7.0;
    vec2 morphSt=shapeShift(st*1.25,cellTime*0.8);
    float d=length(morphSt);
    vec3 col=cosmicPalette(d*0.55-cellTime*0.45);
    float mask=bloomingFlower(morphSt,cellTime);
    vec3 bg=mix(vec3(0.01,0.01,0.04),col*0.35,exp(-d*2.5));
    vec3 finalColor=mix(bg,col*1.5,mask);
    gl_FragColor=vec4(finalColor*smoothstep(1.35,.25,length(st)),1.0);
}
`,
};

const loveFusionFlower: ShaderDef = {
  id: "love-fusion-flower",
  name: "Sacred Lotus",
  description: "A geometric lotus blooming through cultural memory.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
vec3 fusionPalette(float t,float style){
    t=fract(t);
    if(style<1.0) return mix(vec3(0.95,0.01,0.05),vec3(1.0,0.80,0.0),smoothstep(0.0,1.0,sin(t*TAU)*0.5+0.5));
    if(style<2.0) return mix(vec3(0.02,0.01,0.05),vec3(1.0,0.45,0.65),t);
    return mix(vec3(0.85,0.25,0.05),vec3(0.0,0.95,0.50),abs(sin(t*TAU)));
}
void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*1.5,style=mod(floor(t*0.12)+floor(u_seed*u_unique*3.0),3.0);
    float petals=style==0.0?8.0:(style==1.0?12.0:16.0);
    vec2 hst=st*1.15; hst.x*=1.15;
    hst.y-=0.28*sqrt(abs(hst.x))+0.06*sin(hst.x*16.0+t*3.5);
    float d=length(hst),f=0.0;
    float bloom=0.5+(sin(t*0.8)*0.5+0.5)*0.4+(sin(t*1.6)*0.5+0.5)*0.3;
    float w=0.08+(sin(t*1.6)*0.5+0.5)*0.12;
    for(float i=0.0;i<16.0;i++){
        if(i>=petals) break;
        vec2 p=rot(-(i/petals*TAU+t*0.7+sin(d*4.0-t)))*hst;
        p.y+=0.126-0.38*bloom;
        f+=(1.0-smoothstep(0.5,0.85,length(vec2(p.x/w,p.y/0.45))))*(1.0-smoothstep(0.0,0.02,abs(p.x)-(0.12*(1.0-length(p)))))*smoothstep(-0.35,0.2,p.y);
    }
    float mask=clamp(f,0.,1.)*smoothstep(0.08,0.22,d);
    vec3 theme=fusionPalette(d*0.35-t*0.25,style);
    vec3 bg=mix(vec3(0.03,0.01,0.04),theme*0.7,exp(-d*0.8));
    bg+=theme*abs(sin(d*18.0-t*4.0))*smoothstep(0.05,0.8,d)*0.65*(0.4+0.6*sin(hst.x*6.0+t)*cos(hst.y*6.0-t));
    vec3 col=mix(bg,fusionPalette(d*0.5+t*0.3,style)*1.5+smoothstep(0.4,0.0,mask)*mask*0.4,mask);
    gl_FragColor=vec4(col*smoothstep(1.6,0.2,length(st)),1.0);
}
`,
};

// ─── HOPE, additional shaders ────────────────────────────────────────────────

const hopePhoenixMandala: ShaderDef = {
  id: "hope-phoenix-mandala",
  name: "Phoenix Mandala",
  description: "Counter-rotating rings of sacred geometry igniting into phoenix fire.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define TAU 6.28318530718
void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.8;
    float r=length(st),a=atan(st.y,st.x);
    vec3 col=vec3(0.0);
    float plasma=0.0;
    for(float i=1.0;i<=4.0;i++){
        float rotA=a+t*(mod(i,2.0)==0.0?0.4:-0.4)/i+u_seed*u_unique;
        float geo=sin(rotA*(4.0*i))*cos(rotA*8.0);
        float ripple=sin(r*20.0-t*(5.0+i)+geo*2.0);
        float ringMask=smoothstep(0.8/i,0.2/i,r)*smoothstep(0.0,0.3/i,r);
        plasma+=smoothstep(0.1,0.0,abs(ripple))*ringMask*(1.5/i);
    }
    float flarePulse=pow(abs(sin(t*1.5)),8.0);
    float flareShape=smoothstep(0.4,0.0,abs(sin(a*2.0+t*2.0)))*exp(-r*3.0);
    plasma+=flareShape*flarePulse*3.0;
    vec3 darkRed=vec3(0.4,0.05,0.02);
    vec3 brightGold=vec3(1.0,0.7,0.1);
    vec3 coreWhite=vec3(1.0,0.95,0.9);
    col=mix(darkRed,brightGold,smoothstep(0.0,0.6,plasma));
    col=mix(col,coreWhite,smoothstep(0.8,1.5,plasma));
    col*=(1.2-r*0.5);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const hopeGoldenSpiral: ShaderDef = {
  id: "hope-golden-spiral",
  name: "Golden Spiral",
  description: "A luminous spiral expanding outward through the dark.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define VOID  vec3(0.05,0.02,0.01)
#define GOLD  vec3(1.5,0.9,0.4)
#define LIGHT vec3(0.65,0.92,0.81)
#define MIST  vec3(0.70,0.76,1.10)
void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*1.1;
    float r=length(st),a=atan(st.y,st.x);
    float spiral=sin(a*4.0+log(r+0.08)*5.0-t+u_seed*u_unique);
    spiral=0.5+0.5*spiral;
    float wide=sin(a*2.0-log(r+0.12)*3.0+t*0.55);
    wide=0.5+0.5*wide;
    float presence=1.0-smoothstep(1.35,2.1,r);
    vec3 col=VOID;
    col=mix(col,GOLD,spiral*0.42*presence);
    col=mix(col,MIST,wide*0.18*presence);
    col+=LIGHT*pow(spiral,3.0)*0.18*presence;
    col+=LIGHT*exp(-r*3.2)*0.18;
    col*=smoothstep(2.0,0.15,r);
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const hopeMoonWire: ShaderDef = {
  id: "hope-moon-wire",
  name: "Moon & Sky",
  description: "A thin golden wire tracing the geometry of hope.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define MOON vec3(0.95,0.92,0.81)
#define SKY  vec3(0.74,0.84,0.96)
void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float x=sin(u_time*1.2)*cos(st.y*(3.0+u_seed*u_unique*2.0));
    float y=cos(u_time*0.9)*sin(st.x*(3.0+u_seed*u_unique*2.0));
    float d=abs(x+y);
    float line=smoothstep(0.05,0.02,d);
    vec3 col=mix(vec3(0.0),MOON,line);
    col+=mix(vec3(0.0),SKY,line*0.5);
    gl_FragColor=vec4(col,1.0);
}
`,
};

const hopeStainedGlass: ShaderDef = {
  id: "hope-stained-glass",
  name: "Stained Glass",
  description: "Color bands snapping into crisp light-wells like cathedral glass.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
vec3 getGoldPalette(float t){
    vec3 a=vec3(0.05,0.02,0.01);
    vec3 b=vec3(0.9,0.6,0.2);
    vec3 c=vec3(1.0,0.95,0.8);
    return a+b*cos(6.28318*(t+vec3(0.0,0.1,0.2)));
}
void main(){
    vec2 st=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float wave=sin(st.x*(4.0+u_seed*u_unique*2.0)+u_time)*cos(st.y*(4.0+u_seed*u_unique*2.0)-u_time);
    float sharpWave=floor(wave*5.0)/5.0;
    vec3 col=getGoldPalette(u_time*0.15+sharpWave*0.5+u_seed*u_unique*0.2);
    float grain=fract(sin(dot(st,vec2(12.9898,78.233)))*43758.5453);
    float bloom=(grain>0.985)?1.0:0.0;
    col+=bloom;
    gl_FragColor=vec4(col,1.0);
}
`,
};

// ─── CLOSURE, additional shader ─────────────────────────────────────────────

const closureRisingTide: ShaderDef = {
  id: "closure-rising-tide",
  name: "Rising Tide",
  description: "Ocean waves settling, the feeling of finally letting something rest.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
    vec2 i=floor(p),f=fract(p);
    float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
    vec2 u=f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}
float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; }
    return v;
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.4;
    float sv=u_seed*u_unique;
    float n=fbm(uv*2.5+vec2(t*0.3+sv,t*0.15+sv))*0.6+fbm(uv*5.0-vec2(t*0.2-sv*1.3,t*0.1))*0.25+fbm(uv*10.0+t*0.1+sv*2.0)*0.12;
    // Horizon line settling from above
    float settle=smoothstep(-0.2,0.6,uv.y+n*0.3);
    vec3 deepBlue=vec3(0.01,0.06,0.18);
    vec3 midTeal=vec3(0.04,0.28,0.45);
    vec3 surfCyan=vec3(0.32,0.70,0.82);
    vec3 foamWhite=vec3(0.78,0.92,0.96);
    vec3 col=mix(deepBlue,midTeal,n);
    col=mix(col,surfCyan,smoothstep(0.55,0.8,n));
    col+=foamWhite*smoothstep(0.76,0.9,n)*0.4;
    col=mix(vec3(0.008,0.014,0.032),col,settle);
    // Gentle light glyph-lines near the surface
    float lineN=abs(sin(uv.x*8.0+t*0.6+n*3.0));
    float glyphLine=smoothstep(0.12,0.0,lineN)*smoothstep(-0.1,0.3,uv.y)*0.22;
    col+=foamWhite*glyphLine;
    float vig=smoothstep(1.5,0.3,length(uv));
    gl_FragColor=vec4(col*vig,1.0);
}
`,
};

const regretInterfereOcean: ShaderDef = {
  id: "regret-interfere-ocean",
  name: "Interference / Ocean",
  description: "A dark blue wave interfering with the memory of the past.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define u_res u_resolution
#define u_t u_time

float u_nw_5_str = 1.3;
float u_nw_5_sc = 1.2;
float u_nw_5_sx = 1.0;
float u_nw_5_sy = 1.0;
float u_nw_5_sp = 0.11;
float u_nw_5_oc = 4.0;
float u_nw_5_it = 1.0;
float u_nw_5_ang = 2.932153;
int u_nw_5_nt = 0;
float u_op_5 = 1.0;
float u_lyr_5_tmul = 1.0;
float u_lyr_5_toff = 0.0;
float u_px_4_s = 4.0;
float u_op_4 = 1.0;
float u_lyr_4_tmul = 1.0;
float u_lyr_4_toff = 0.0;
float u_rp_3_cx = 0.5;
float u_rp_3_cy = 0.5;
float u_rp_3_fq = 10.0;
float u_rp_3_am = 0.03;
float u_rp_3_dc = 2.0;
float u_op_3 = 1.0;
float u_lyr_3_tmul = 1.0;
float u_lyr_3_toff = 0.0;
float u_pr_2_cx = 0.5;
float u_pr_2_cy = 0.5;
float u_pr_2_tw = 0.0;
float u_pr_2_zm = 1.0;
float u_op_2 = 1.0;
float u_lyr_2_tmul = 1.0;
float u_lyr_2_toff = 0.0;
float u_wv_1_f = 4.0;
float u_wv_1_a = 0.15;
float u_wv_1_p = 0.5;
float u_wv_1_e = 0.183;
float u_wv_1_ang = 0.0;
float u_wv_1_bn = 1.0;
float u_wv_1_bg = 0.2;
vec3 u_wv_1_c = vec3(0.419608, 0.498039, 0.909804);
float u_op_1 = 1.0;
float u_lyr_1_tmul = 0.6;
float u_lyr_1_toff = 0.0;

float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p),u2=f*f*(3.0-2.0*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),u2.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),u2.x),u2.y);}
float fbm(vec2 p,float oct){float v=0.0,a=0.5;for(int i=0;i<8;i++){if(float(i)>=oct)break;v+=vnoise(p)*a;p*=2.0;a*=0.5;}return v;}
vec2 pgrad(vec2 i){float h=hash2(i);float a=h*6.2831853;return vec2(cos(a),sin(a));}
float pnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);float a=dot(pgrad(i),f);float b=dot(pgrad(i+vec2(1.,0.)),f-vec2(1.,0.));float c=dot(pgrad(i+vec2(0.,1.)),f-vec2(0.,1.));float d=dot(pgrad(i+vec2(1.,1.)),f-vec2(1.,1.));return 0.5+0.5*mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float cnoise(vec2 p){vec2 i=floor(p),f=fract(p);float md=1.0;for(int yi=-1;yi<=1;yi++){for(int xi=-1;xi<=1;xi++){vec2 g=vec2(float(xi),float(yi));vec2 o=g+vec2(hash2(i+g),hash2(i+g+vec2(13.7,7.1)))-f;md=min(md,dot(o,o));}}return sqrt(md);}
float fbmAt(vec2 p,float oct,int nt){float v=0.0,a=0.5;for(int i=0;i<8;i++){if(float(i)>=oct)break;float n;if(nt==1)n=pnoise(p);else if(nt==2)n=cnoise(p);else n=vnoise(p);v+=n*a;p*=2.0;a*=0.5;}return v;}
vec2 rot2(vec2 p,float a){float c=cos(a),s2=sin(a);return vec2(p.x*c-p.y*s2,p.x*s2+p.y*c);}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  vec2 fragCoord_st = fragCoord;
  vec2 uv=fragCoord_st.xy/u_res;
  float t=u_t;
  vec2 rawuv=uv;
  float t_5=u_t*u_lyr_5_tmul+u_lyr_5_toff;
  float t_4=u_t*u_lyr_4_tmul+u_lyr_4_toff;
  float t_3=u_t*u_lyr_3_tmul+u_lyr_3_toff;
  float t_2=u_t*u_lyr_2_tmul+u_lyr_2_toff;
  float t_1=u_t*u_lyr_1_tmul+u_lyr_1_toff;
  vec3 col=vec3(0.0000,0.0000,0.0000);
  {
    float t=t_1;
    vec2 wuv=uv;
    {
      vec2 nwSrc=wuv;
      vec2 nwDrift=vec2(cos(u_nw_5_ang+u_seed*u_unique),sin(u_nw_5_ang+u_seed*u_unique))*t_5*u_nw_5_sp;
      vec2 nwScl=vec2(u_nw_5_sc*u_nw_5_sx,u_nw_5_sc*u_nw_5_sy);
      for(int _ni=0;_ni<4;_ni++){ if(float(_ni)>=u_nw_5_it) break; nwSrc+=u_nw_5_str*vec2(fbmAt(nwSrc*nwScl+nwDrift,u_nw_5_oc,u_nw_5_nt)-0.5,fbmAt(nwSrc*nwScl+nwDrift+vec2(5.2,1.3),u_nw_5_oc,u_nw_5_nt)-0.5); }
      wuv=nwSrc;
    }
    wuv=floor(wuv*(u_res/u_px_4_s))/(u_res/u_px_4_s);
    {
      float ar=u_res.x/u_res.y;
      vec2 rpC=vec2(u_rp_3_cx,u_rp_3_cy);
      vec2 rpD=(wuv-rpC)*vec2(ar,1.0);
      float rpLen=length(rpD);
      float rpPhase=sin(rpLen*u_rp_3_fq - t_3)*u_rp_3_am*exp(-rpLen*u_rp_3_dc);
      vec2 rpDir=rpLen>0.0001?rpD/rpLen:vec2(0.0);
      wuv+=rpDir*vec2(1.0/ar,1.0)*rpPhase;
    }
    {
      float ar=u_res.x/u_res.y;
      vec2 prC=vec2(u_pr_2_cx,u_pr_2_cy);
      vec2 prD=(wuv-prC)*vec2(ar,1.0);
      float prR=length(prD);
      float prA=atan(prD.y,prD.x);
      prA+=u_pr_2_tw*prR;
      prR/=max(u_pr_2_zm,0.001);
      vec2 prP=vec2(cos(prA),sin(prA))*prR;
      wuv=prC+prP*vec2(1.0/ar,1.0);
    }
  {
    vec2 ruv=rot2(wuv-0.5,u_wv_1_ang)+0.5;
    float wave=sin(ruv.x*u_wv_1_f*6.2832+t)*u_wv_1_a;
    float _mask=0.0;
    float _nb=max(u_wv_1_bn,1.0);
    float _gap=u_wv_1_bg;
    for(int _i=0;_i<8;_i++){ if(float(_i)>=_nb) break; float _off=(float(_i)-(_nb-1.0)*0.5)*_gap; float _m=smoothstep(u_wv_1_e,0.0,abs(ruv.y-(u_wv_1_p+_off+wave))-u_wv_1_e*0.3); _mask=max(_mask,_m); }
    vec3 fillC=u_wv_1_c;
    {
      vec3 _cbak=col;
      col=fillC;
      fillC=col;
      col=_cbak;
    }
    col=mix(col,fillC,_mask*u_op_1);
  }
  }
  fragColor=vec4(clamp(col,0.0,1.0),1.0);
}

void main(){
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`
};

// ─── REGRET, LMN1 ocean flow shaders ────────────────────────────────────────
// Decoded palette: #0e3a5c · #2e7fb8 · #9fd4e8 · #16222e · #030608
// All use warp=5.603 / speed=0.957 / ocean blues

const regretOceanFlow1: ShaderDef = {
  id: "regret-ocean-flow-1",
  name: "Inverted Current",
  description: "A reversed tide, the pull of regret running against time.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.0; a*=0.5; }
    return v;
}
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    // speed 0.957, warp 5.603, inverted (negative zoom → flip warp direction)
    float t=u_time*0.957;
    float sv=u_seed*u_unique;
    vec2 q=vec2(fbm(uv*33.0-vec2(t*0.233,0.0)+sv), fbm(uv*33.0-vec2(0.0,t*0.233)+sv*1.7));
    vec2 w=uv+5.603*(q-0.5)*0.18;
    float n=fbm(w*33.0+vec2(-t*0.089,t*0.089));
    vec3 col=pal(n*1.175+t*0.04+sv*0.4);
    col=mix(BG,col,smoothstep(0.1,0.65,n));
    col+=pal(n+0.5)*smoothstep(0.72,0.9,n)*0.44;
    // grain 0.024
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.024;
    col+=grain;
    col*=smoothstep(1.6,0.2,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const regretOceanFlow2: ShaderDef = {
  id: "regret-ocean-flow-2",
  name: "Fractured Depth",
  description: "Woven ocean lines, the texture of a decision you can't unmake.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.0; a*=0.5; }
    return v;
}
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
// Hex grid overlay
float hexDist(vec2 p){ p=abs(p); return max(dot(p,normalize(vec2(1.0,1.732))),p.x); }
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float t=u_time*0.957;
    float sv=u_seed*u_unique;
    vec2 q=vec2(fbm(uv*33.0+vec2(t*0.233,0.0)+sv), fbm(uv*33.0+vec2(0.0,-t*0.233)+sv*1.7));
    vec2 w=uv+5.603*(q-0.5)*0.18;
    float n=fbm(w*33.0+vec2(t*0.089,-t*0.079));
    // Hex surface (scale=44, matches preset)
    vec2 hexUV=uv*14.0;
    vec2 gv=fract(hexUV*vec2(1.0,0.5774))-0.5;
    float hexLine=1.0-smoothstep(0.44,0.46,hexDist(gv));
    vec3 col=pal(n*1.175+t*0.04);
    col=mix(BG,col,smoothstep(0.1,0.65,n));
    col+=pal(n+hexLine*0.3+0.5)*hexLine*0.5*(0.5+n*0.5);
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.024;
    col+=grain;
    col*=smoothstep(1.6,0.2,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const regretOceanFlow3: ShaderDef = {
  id: "regret-ocean-flow-3",
  name: "The Undertow",
  description: "Faster, wilder, pulled under before you could reach the surface.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.0; a*=0.5; }
    return v;
}
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    // warp=7, speed=0.957, zoom=6, faster, tighter
    float t=u_time*0.957;
    float sv=u_seed*u_unique;
    vec2 q=vec2(fbm(uv*6.0+vec2(t*0.02,0.0)+sv), fbm(uv*6.0+vec2(0.0,-t*0.02)+sv*1.7));
    vec2 w=uv+7.0*(q-0.5)*0.36;
    float n1=fbm(w*6.0+vec2(t*0.233,-t*0.02));
    float n2=fbm(w*12.0-vec2(t*0.233,t*0.02))*0.5;
    float n=n1*0.7+n2*0.3;
    vec3 col=pal(n*1.53+t*0.059+sv*0.4);
    col=mix(BG,col,smoothstep(0.08,0.62,n));
    // Fast ripple lines
    float ripple=sin(n*31.0-t*2.36)*0.5+0.5;
    col+=pal(n+0.33)*smoothstep(0.88,1.0,ripple)*0.6;
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.024;
    col+=grain;
    col*=smoothstep(1.6,0.2,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

const regretOceanInterfere: ShaderDef = {
  id: "regret-ocean-interfere",
  name: "Interference Memory",
  description: "Two moments colliding, the place where the past meets what never happened.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
#define C0 vec3(0.055,0.227,0.361)
#define C1 vec3(0.180,0.498,0.722)
#define C2 vec3(0.624,0.831,0.910)
#define C3 vec3(0.086,0.133,0.180)
#define BG vec3(0.012,0.024,0.031)
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 pal(float t){
    t=fract(t);
    if(t<0.33) return mix(C0,C1,t/0.33);
    if(t<0.66) return mix(C1,C2,(t-0.33)/0.33);
    return mix(C2,C3,(t-0.66)/0.34);
}
void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    // Interfere engine: zoom=23, warp=5.603, speed=0.957, seed=9015
    float t=u_time*0.957;
    float sv=u_seed*u_unique;
    // Two interference sources (seed 9015 → cos/sin offset)
    vec2 s1=vec2(cos(23.0+sv),sin(23.0+sv))*0.42;
    vec2 s2=vec2(-cos(23.0+sv),-sin(23.0+sv))*0.42;
    vec2 w=uv+vec2(sin(uv.y*5.603+t*0.803),cos(uv.x*5.603-t*0.803))*0.233;
    w*=1.175;
    float r1=length(w-s1*1.175);
    float r2=length(w-s2*1.175);
    float wave1=sin(r1*6.28-t*2.146);
    float wave2=sin(r2*6.28+t*2.146);
    float field=(wave1+wave2)*0.5;
    float bright=smoothstep(-0.5,1.0,field);
    float rings=1.0-smoothstep(0.0,0.08,abs(field));
    float grain=(hash(uv*u_resolution.xy+fract(t))-0.5)*0.012;
    vec3 col=mix(BG,pal(bright*0.72+t*0.04+sv*0.4),bright);
    col+=pal(length(uv)*0.471+t*0.055+0.5)*rings*0.55;
    col+=grain;
    col*=smoothstep(1.6,0.25,length(uv));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

// ─── GRIEF, Liquid Aurora (original: recursive domain warp + caustic filaments) ──
const griefLiquidAurora: ShaderDef = {
  id: "grief-liquid-aurora",
  name: "Liquid Aurora",
  description: "Silk-like currents of sorrow folding endlessly into themselves.",
  glsl: `
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
`,
};

// ─── LOVE, cultural set (Africa · Japan · China), flowing bg + lifecycle motion ──
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
  description: "A courtyard of peonies sprouting, opening and folding closed, Chinese 牡丹, love and abundance.",
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
  description: "Cherry blossoms drifting on dusk air, Japanese 桜, the tenderness of fleeting things.",
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
  description: "A heart resolving out of a field of dots, print-room halftone, love made of small marks.",
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
  description: "Glyph characters raining into the shape of a heart, a love letter typed by the machine.",
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
  description: "Folds of crimson silk turning through the dark, the warmth of closeness, always moving.",
  glsl: LOVE_HEAD + `
void main(){ vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y; float t=u_time*0.3; float sv=u_seed*u_unique;
  vec2 q=vec2(fbm(uv*1.2+t*0.1+sv),fbm(uv*1.2-t*0.08)); vec2 r=vec2(fbm(uv*1.2+2.0*q+t*0.4),fbm(uv*1.2+2.0*q+vec2(5.0)-t*0.4));
  float f=fbm(uv*1.2+2.5*r); float band=0.5+0.5*sin((f*6.0+length(r)*3.0-t*2.0)*3.14159);
  vec3 col=mix(WINE,CRIM,f); col=mix(col,ROSE,smoothstep(0.5,0.85,f)); col=mix(col,BLUSH,pow(band,3.0)*0.5); col+=CREAM*pow(band,10.0)*0.4;
  col*=smoothstep(1.7,0.2,length(uv)); gl_FragColor=vec4(clamp(col,0.,1.),1.); }
`,
};

// ─── EXPORT MAP ───────────────────────────────────────────────────────────────

export const EMOTION_SHADERS: Record<string, ShaderDef[]> = {
  grief: [griefVortex, griefGrid, griefAsh, griefVeil, griefTruchet, griefFireSlow, griefFireFast, griefGyroidDusk, griefAmber, griefInterfereDusk, griefInterfereChrome, griefMono, griefLiquidAurora, ...GENERATED.grief],
  closure: [
    closureGlyphs,
    closureOcean,
    closureRisingTide,
    closureFlowOcean,
    closureGyroidMint,
    closureGyroidMintPixel,
    closureNeonTruchet,
    closureOceanGyroid,
    closureOceanDeep,
    ...GENERATED.closure,
  ],
  love: [lovePeonyGarden, loveSakuraField, loveHalftoneHeart, loveAsciiHeart, loveSilkRibbon, loveButterfly, lovePeacockGrid, loveFlower, loveHolding, loveRippleButterfly, loveCosmicFlowers, loveFusionFlower, ...(GENERATED.love || [])],
  hope: [hopeGolden, hopeAscending, hopeLanterns, hopeCrane, hopeFluid1, hopeFluid2, hopePhoenixMandala, hopeGoldenSpiral, hopeMoonWire, hopeStainedGlass, ...GENERATED.hope],
  regret: [regretSpiral, regretTunnel, regretWave, regretInterfereOcean,
    regretOceanFlow1, regretOceanFlow2, regretOceanFlow3, regretOceanInterfere, ...GENERATED.regret],
};

export const ALL_SHADERS: ShaderDef[] = Object.values(EMOTION_SHADERS).flat();
