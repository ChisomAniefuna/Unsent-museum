import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-origami-crane",
  name: "Origami Crane",
  description: "A folded paper crane rises through warm domain-warped light, wings easing open and closed like a slow held breath of hope.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float p){
    p = fract(p*0.1031);
    p *= p+33.33;
    p *= p+p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<5;i++){
        v += a*noise(p);
        p = m*p;
        a *= 0.5;
    }
    return v;
}

mat2 rot(float a){
    float c = cos(a);
    float s = sin(a);
    return mat2(c,-s,s,c);
}

float sdTri(vec2 p, vec2 a, vec2 b, vec2 c){
    vec2 e0=b-a, e1=c-b, e2=a-c;
    vec2 v0=p-a, v1=p-b, v2=p-c;
    vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.0,1.0);
    vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.0,1.0);
    vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.0,1.0);
    float s=sign(e0.x*e2.y-e0.y*e2.x);
    vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),
                   vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),
                   vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
    return -sqrt(d.x)*sign(d.y);
}

float sdSeg(vec2 p, vec2 a, vec2 b){
    vec2 pa=p-a, ba=b-a;
    float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    return length(pa-ba*h);
}

// smooth eased oscillation in [-1,1]
float ease(float x){
    float s = sin(x);
    return s*(1.0 - 0.18*s*s);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    float t = u_time;

    // ---- seed-gated variation (all multiplied by u_unique) ----
    float sd = u_seed*u_unique;
    float hueShift = (hash11(sd+1.7)-0.5)*u_unique;
    float travel = mix(1.0, sign(hash11(sd+4.2)-0.5), u_unique);
    float phase = hash11(sd+8.3)*6.2831*u_unique;
    float swirl = (hash11(sd+2.1)-0.5)*0.7*u_unique;

    // ---- flowing, domain-warped golden background ----
    vec2 bg = uv;
    float warpT = t*0.045;
    vec2 q = vec2(fbm(bg*1.3 + vec2(0.0, warpT)),
                  fbm(bg*1.3 + vec2(5.2,-warpT)));
    vec2 r = vec2(fbm(bg*1.5 + 2.0*q + vec2(1.7,9.2) + warpT),
                  fbm(bg*1.5 + 2.0*q + vec2(8.3,2.8) - warpT));
    float flow = fbm(bg*1.4 + 2.3*r + warpT*0.5);

    // deep value range for contrast
    vec3 deep  = vec3(0.018,0.012,0.006);
    vec3 amber = vec3(0.62,0.38,0.10);
    vec3 gold  = vec3(0.965,0.760,0.300);
    vec3 cream = vec3(1.0,0.965,0.890);

    // palette shift only when unique
    gold = mix(gold, gold.zxy, 0.12*max(hueShift,0.0));
    gold = mix(gold, gold.yzx, 0.12*max(-hueShift,0.0));

    vec3 col = deep;
    col = mix(col, amber, flow*flow*0.38);
    col += gold*0.07*flow;

    // central radiant glow (the "golden light"), tighter so the field stays dark
    float rad = length(uv*vec2(0.85,1.0));
    float glow = exp(-rad*1.95);
    col = mix(col, amber*1.3, glow*0.30);
    col += gold*glow*0.28;
    col += cream*glow*glow*0.13;

    // slow rotating god-rays
    vec2 rp = uv;
    rp *= rot(t*0.05 + swirl + phase*0.1);
    float ang = atan(rp.y, rp.x);
    float rays = 0.5 + 0.5*sin(ang*8.0 + t*0.20);
    rays = pow(rays, 3.0);
    float rayFall = exp(-rad*1.05);
    col += gold*rays*rayFall*0.28;
    vec2 rp2 = uv*rot(-t*0.035 - swirl*0.6);
    float ang2 = atan(rp2.y, rp2.x);
    float rays2 = pow(0.5+0.5*sin(ang2*15.0 - t*0.14), 4.0);
    col += cream*rays2*rayFall*0.10;

    // ---- crane lifecycle: rise + gentle sway + flap ----
    float rise  = sin(t*0.26 + phase)*0.17;
    float bob   = sin(t*0.55 + phase)*0.025;
    float drift = sin(t*0.15 + phase)*0.07*travel;
    vec2 cp = uv - vec2(drift, rise + bob);
    cp *= rot(ease(t*0.18 + phase)*0.06*travel);
    cp *= 1.0/0.92;

    // eased wing flap (slow, graceful)
    float wing = ease(t*0.7 + phase);
    float flap = wing*0.34;

    // ---- crane silhouette (folded triangular planes) ----
    float body  = sdTri(cp, vec2(0.0,0.34), vec2(-0.16,-0.02), vec2(0.18,-0.05));
    float bodyB = sdTri(cp, vec2(0.18,-0.05), vec2(-0.16,-0.02), vec2(-0.02,-0.40));
    float bodyD = min(body, bodyB);

    float tail  = sdTri(cp, vec2(-0.16,-0.02), vec2(-0.56,0.19), vec2(-0.20,0.06));

    float neck  = sdSeg(cp, vec2(0.04,0.18), vec2(0.30,0.52)) - 0.035;
    float beak  = sdTri(cp, vec2(0.30,0.52), vec2(0.45,0.50), vec2(0.31,0.44));
    float headD = min(neck, beak);

    vec2 lw = cp - vec2(-0.05,0.05);
    lw *= rot(0.55 + flap);
    float lwing  = sdTri(lw, vec2(0.0,0.0), vec2(0.64,0.32), vec2(0.10,-0.18));
    vec2 lw2 = cp - vec2(-0.05,0.05);
    lw2 *= rot(0.55 + flap*0.6);
    float lwing2 = sdTri(lw2, vec2(0.0,0.0), vec2(0.50,0.42), vec2(0.56,0.10));
    float leftWing = min(lwing, lwing2);

    vec2 rw = cp - vec2(0.02,0.04);
    rw.x = -rw.x;
    rw *= rot(0.55 + flap);
    float rwing  = sdTri(rw, vec2(0.0,0.0), vec2(0.64,0.32), vec2(0.10,-0.18));
    vec2 rw2 = cp - vec2(0.02,0.04);
    rw2.x = -rw2.x;
    rw2 *= rot(0.55 + flap*0.6);
    float rwing2 = sdTri(rw2, vec2(0.0,0.0), vec2(0.50,0.42), vec2(0.56,0.10));
    float rightWing = min(rwing, rwing2);

    float crane = min(min(bodyD, tail), min(headD, min(leftWing, rightWing)));

    float aa = 2.5/u_resolution.y;
    float mask = smoothstep(aa, -aa, crane);

    // faceted paper shading per fold plane
    float facet = 0.5 + 0.5*sin((cp.x*6.0 + cp.y*4.0) + flap*2.0);
    float planeL = smoothstep(-aa,aa, -leftWing)*facet;
    float planeR = smoothstep(-aa,aa, -rightWing)*(1.0-facet);

    vec3 paper = mix(cream, gold, 0.28 + 0.40*facet);
    float edge = smoothstep(0.0, aa*4.0, abs(crane));
    float rim  = 1.0 - edge;
    vec3 craneCol = paper;
    craneCol += cream*planeL*0.22;
    craneCol += gold*planeR*0.16;
    craneCol += cream*rim*0.55;

    // crisp fold creases for paper texture
    float creases = 0.5+0.5*sin(cp.x*38.0 + cp.y*22.0 + flap);
    craneCol -= amber*0.10*step(0.62,creases)*mask;

    // directional light catch (top-right), wide value range
    float lit = clamp(0.55 + 0.55*dot(normalize(cp+vec2(0.001)), vec2(0.25,0.80)), 0.0, 1.3);
    craneCol *= mix(0.62, 1.25, lit);

    // soft golden halo around the crane
    float halo = smoothstep(0.16, -0.02, crane) - mask;
    halo = max(halo, 0.0);
    // dark contrast ring hugging the crane so it reads against the glow
    float ring = smoothstep(0.13,-0.01,crane)*(1.0-mask);
    col *= 1.0 - ring*0.5;
    col += gold*halo*0.40;
    col += cream*halo*0.16;

    craneCol *= 1.14;
    col = mix(col, craneCol, mask);

    // ---- drifting luminous motes (gentle ascent) ----
    float motes = 0.0;
    for(int i=0;i<6;i++){
        float fi = float(i);
        float seedM = fi*13.13 + 4.0 + sd*0.7;
        float mx = (hash11(seedM)*2.0-1.0)*1.25;
        float speed = 0.05 + hash11(seedM+1.0)*0.05;
        float my = mod(hash11(seedM+2.0) + t*speed, 1.7)-0.85;
        my *= -1.0;
        vec2 mp = uv - vec2(mx + sin(t*0.25+fi)*0.05, my);
        float d = length(mp);
        float tw = 0.5+0.5*sin(t*1.6+fi*2.0);
        motes += smoothstep(0.020,0.0,d)*(0.4+0.6*tw);
    }
    col += cream*motes*0.55;
    col += gold*motes*0.28;

    // vignette + grain + tonemap for contrast
    float vig = smoothstep(1.65, 0.20, length(uv));
    col *= mix(0.45, 1.0, vig);

    float g = hash21(gl_FragCoord.xy + fract(t)*113.0);
    col += (g-0.5)*0.022;

    col = pow(max(col,0.0), vec3(0.90));
    col = col/(col+vec3(0.55))*1.42;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
