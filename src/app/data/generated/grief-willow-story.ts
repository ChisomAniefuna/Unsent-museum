import type { ShaderDef } from "../shaders";

const def: ShaderDef = {
  id: "grief-willow-story",
  name: "Willow of Grief",
  description: "A black willow bends into a grieving face: branches shed, tears fall into ripples, and a small green shoot returns.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_intensity;
uniform float u_unique;

#define TAU 6.28318530718

float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }

float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    float a=hash21(i), b=hash21(i+vec2(1.0,0.0));
    float c=hash21(i+vec2(0.0,1.0)), d=hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise(p); p=p*2.03+1.7; a*=0.5; }
    return v;
}

float sdSegment(vec2 p, vec2 a, vec2 b){
    vec2 pa=p-a, ba=b-a;
    float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    return length(pa-ba*h);
}

float stroke(vec2 p, vec2 a, vec2 b, float w){
    return smoothstep(w, w-0.012, sdSegment(p,a,b));
}

float ellipse(vec2 p, vec2 c, vec2 r){
    return smoothstep(1.0, 0.96, length((p-c)/r));
}

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

float leaf(vec2 p, vec2 c, float a, float s){
    vec2 q=rot(a)*(p-c);
    return smoothstep(1.0, 0.82, length(q/vec2(0.018*s,0.040*s)));
}

float tearDrop(vec2 p, vec2 c, float s){
    vec2 q=p-c;
    float bulb=smoothstep(1.0,0.70,length(q/vec2(0.014*s,0.026*s)));
    float tail=smoothstep(0.010*s,0.0,abs(q.x))*smoothstep(0.05*s,-0.01*s,q.y)*smoothstep(-0.10*s,-0.02*s,q.y);
    return max(bulb, tail);
}

float ripple(vec2 p, vec2 c, float r){
    vec2 q=p-c;
    float d=abs(length(q/vec2(1.0,0.23))-r);
    return smoothstep(0.010,0.0,d);
}

void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    float aspect=u_resolution.x/u_resolution.y;
    float seed=u_seed*(0.35+0.65*u_unique);
    float t=u_time*(0.72+0.18*u_intensity);
    float loopT=fract(t/15.0);
    float dissolve=loopT<0.20?0.0:loopT<0.55?(loopT-0.20)/0.35:loopT<0.78?1.0:1.0-(loopT-0.78)/0.22;
    dissolve=smoothstep(0.0,1.0,dissolve);
    float heavy=smoothstep(0.45,1.0,dissolve);
    float returning=smoothstep(0.78,1.0,loopT);
    float breath=sin(t*0.55+seed)*0.012;
    vec2 p=uv;
    p.x+=0.018*sin(p.y*3.0+t*0.35)*dissolve;

    vec3 paper=vec3(0.82,0.80,0.75);
    paper+=0.055*fbm(uv*3.0+seed);
    paper-=0.06*smoothstep(0.72,1.5,length(uv*vec2(0.78,1.0)));
    vec3 col=paper;

    float horizon=stroke(uv,vec2(-aspect,-0.70),vec2(aspect,-0.66),0.012);
    col=mix(col,vec3(0.30,0.29,0.27),horizon*0.38);

    float mass=0.0;
    mass=max(mass,ellipse(p,vec2(-0.74,-0.38+breath),vec2(0.34,0.53)));
    mass=max(mass,ellipse(p,vec2(-0.38,-0.02+breath),vec2(0.42,0.55)));
    mass=max(mass,ellipse(p,vec2(0.05,0.24+breath),vec2(0.55,0.30)));
    mass=max(mass,ellipse(p,vec2(0.35,0.17+breath),vec2(0.29,0.38)));
    mass=max(mass,ellipse(p,vec2(0.54,0.07+breath),vec2(0.17,0.16)));
    mass=max(mass,stroke(p,vec2(-1.12,-0.75),vec2(-0.58,-0.06),0.22));
    mass=max(mass,stroke(p,vec2(-0.70,-0.05),vec2(0.40,0.52),0.18));
    float cheekCut=ellipse(p,vec2(0.64,-0.10),vec2(0.30,0.22));
    mass*=1.0-cheekCut*0.75;
    float dissolveNoise=fbm((uv+vec2(-dissolve*0.35,dissolve*0.08))*9.0+seed);
    mass*=1.0-smoothstep(0.58,0.86,dissolveNoise)*dissolve*0.62*smoothstep(-0.10,0.52,uv.y)*smoothstep(-0.20,0.72,uv.x);
    col=mix(col,vec3(0.015,0.014,0.013),mass);

    float branch=0.0;
    for(int i=0;i<18;i++){
        float fi=float(i);
        float h=hash11(fi*13.7+seed);
        vec2 a=vec2(-0.58+fi*0.065,0.23+0.17*sin(fi*0.7));
        vec2 b=a+vec2(0.25+0.30*h,0.17+0.22*hash11(fi+4.0));
        b.x+=0.10*sin(t*0.45+fi)*dissolve;
        b.y+=0.03*sin(t*0.8+fi*1.7);
        branch=max(branch,stroke(p,a,b,0.010+0.010*(1.0-h)));
        branch=max(branch,stroke(p,a+vec2(0.05,0.03),b+vec2(0.12,0.09),0.006));
    }
    col=mix(col,vec3(0.02,0.02,0.018),branch*(1.0-0.45*dissolve));

    float vein=0.0;
    for(int i=0;i<12;i++){
        float fi=float(i);
        vec2 a=vec2(-0.86+fi*0.11,-0.52+0.055*sin(fi));
        vec2 b=vec2(-0.28+fi*0.055,0.28+0.07*sin(fi*1.3));
        vein=max(vein,stroke(p,a,b,0.004+0.002*hash11(fi+seed)));
    }
    col=mix(col,vec3(0.46,0.46,0.43),vein*mass*0.75);

    float leaves=0.0;
    vec3 leafCol=vec3(0.09,0.12,0.035);
    for(int i=0;i<34;i++){
        float fi=float(i);
        float h=hash11(fi*17.0+seed);
        vec2 c=vec2(-0.92+h*1.85,0.54+0.30*hash11(fi+9.0));
        c.y-=dissolve*(0.10+0.38*fract(h+t*0.05));
        c.x+=dissolve*(0.20+0.18*sin(t+h*TAU));
        float l=leaf(p,c,0.6*sin(fi)+dissolve*1.1,0.8+0.8*h);
        leaves=max(leaves,l);
        float warm=smoothstep(0.35,1.0,dissolve);
        leafCol=mix(vec3(0.10,0.17,0.035),vec3(0.52,0.38,0.16),warm);
    }
    col=mix(col,leafCol,leaves*(0.95-0.35*dissolve));

    float ash=0.0;
    for(int i=0;i<26;i++){
        float fi=float(i);
        float h=hash11(fi*31.3+seed);
        vec2 c=vec2(0.04+h*0.96,0.02+hash11(fi+8.0)*0.78);
        c.x+=dissolve*(0.26+0.22*sin(t+fi));
        c.y+=dissolve*(0.10*sin(t*0.9+fi*2.0));
        ash=max(ash,smoothstep(0.014,0.0,length(uv-c)));
    }
    col=mix(col,vec3(0.03,0.03,0.03),ash*dissolve*0.82);

    vec2 eye=vec2(0.36,0.12);
    float eyeLine=stroke(uv,eye+vec2(-0.08,0.01),eye+vec2(0.10,-0.018),0.007);
    float lid=stroke(uv,eye+vec2(-0.09,0.035),eye+vec2(0.12,0.006),0.004);
    col=mix(col,vec3(0.77,0.77,0.73),eyeLine*mass);
    col+=vec3(0.10,0.13,0.35)*lid*mass;

    vec3 tearColor=mix(vec3(0.12,0.18,0.95),vec3(0.82,0.05,0.03),heavy);
    tearColor=mix(tearColor,vec3(0.58,0.08,0.72),smoothstep(0.40,0.72,dissolve)*(1.0-heavy));
    for(int i=0;i<6;i++){
        float fi=float(i);
        float fall=fract(loopT*1.9+fi*0.18+hash11(fi+seed)*0.15);
        vec2 c=eye+vec2(0.01*sin(fi),-0.02-fall*(0.45+0.18*dissolve));
        float td=tearDrop(uv,c,0.75+0.35*hash11(fi));
        col=mix(col,tearColor,td*(0.55+0.45*dissolve));
    }

    vec2 small=vec2(0.42,-0.64);
    float person=ellipse(uv,small+vec2(0.0,0.08),vec2(0.055,0.078));
    person=max(person,stroke(uv,small+vec2(-0.03,0.02),small+vec2(0.04,-0.06),0.034));
    person=max(person,stroke(uv,small+vec2(-0.02,-0.02),small+vec2(0.09,-0.05),0.016));
    col=mix(col,vec3(0.018,0.017,0.016),person);

    float rip=0.0;
    for(int i=0;i<5;i++){
        float r=0.07+fract(loopT*1.35+float(i)*0.19)*0.40;
        rip=max(rip,ripple(uv,small+vec2(0.02,-0.05),r));
    }
    col=mix(col,vec3(0.25,0.24,0.23),rip*(0.18+0.58*dissolve));

    vec2 sproutBase=vec2(-0.54,-0.67);
    float plant=stroke(uv,sproutBase,sproutBase+vec2(0.0,0.18),0.008);
    plant=max(plant,leaf(uv,sproutBase+vec2(-0.035,0.10),-0.75,1.0));
    plant=max(plant,leaf(uv,sproutBase+vec2(0.045,0.15),0.70,1.08));
    plant=max(plant,leaf(uv,sproutBase+vec2(0.0,0.20),0.05,0.72));
    vec3 plantFresh=vec3(0.33,0.70,0.06);
    vec3 plantDry=vec3(0.50,0.35,0.15);
    col=mix(col,mix(plantFresh,plantDry,dissolve*(1.0-returning*0.85)),plant);
    col+=plant*plantFresh*(0.10+0.28*returning);

    float grain=(hash21(gl_FragCoord.xy+floor(t*12.0))-0.5)*0.035;
    col+=grain;
    col*=0.94+0.06*smoothstep(1.35,0.2,length(uv*vec2(0.78,1.0)));
    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`,
};

export default def;
