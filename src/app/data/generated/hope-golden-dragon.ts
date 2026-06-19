import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-golden-dragon",
  name: "Golden Dragon",
  description: "A sinuous Chinese dragon of scales and light coils upward toward a flaming pearl, hope ascending out of a warm dark void.",
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

float vnoise(vec2 p){
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
    float s = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6,1.2,-1.2,1.6);
    for(float i=0.0;i<5.0;i++){
        s += a*vnoise(p);
        p = m*p;
        a *= 0.5;
    }
    return s;
}

mat2 rot(float a){
    float c = cos(a);
    float s = sin(a);
    return mat2(c,-s,s,c);
}

// Parametric dragon spine: returns position along the coil for parameter s in [0,1].
// travel slides the wave; sway adds a slow whole-body roll.
vec2 spine(float s, float travel, float phase){
    float ph = s*9.2 - travel + phase;
    float amp = 0.66*(0.32+0.72*s);          // wider sweep toward the rising head
    float x = sin(ph)*amp;
    x += 0.16*sin(ph*0.5 + 1.3);             // secondary undulation
    float y = (s*2.55 - 1.30) + 0.16*sin(ph*0.5);
    return vec2(x,y);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    // ---- seed variation, fully gated by u_unique ----
    float vary    = u_seed*u_unique;
    float phase   = vary*6.28318;
    float dir     = mix(1.0, sign(hash11(u_seed+3.7)-0.5), u_unique);
    float hueShift= (hash11(u_seed+11.3)-0.5)*0.16*u_unique;

    float t = u_time*0.168*dir;

    // ---- flowing warm-dark nebula background ----
    vec2 wp = uv*1.3;
    float warp = fbm(wp*1.1 + vec2(t*0.6, -t*0.4) + phase);
    wp += 0.55*vec2(fbm(wp+warp+phase), fbm(wp.yx-warp-phase));
    float neb = fbm(wp*1.4 + vec2(-t*0.3, t*0.5));
    neb = pow(neb, 1.6);

    vec3 deep = vec3(0.085,0.058,0.020);
    vec3 dark = vec3(0.012,0.008,0.004);
    vec3 col  = mix(dark, deep, neb);
    col += vec3(0.02,0.07,0.05) * pow(fbm(wp*0.8 - t*0.2),3.0) * 0.9;
    float vig = smoothstep(1.85,0.15,length(uv));
    col *= mix(0.35,1.0,vig);

    // ---- the flaming pearl the dragon coils toward (top of frame) ----
    float bob = 0.05*sin(u_time*0.5+phase);
    vec2 pearlPos = vec2(0.04*sin(u_time*0.3+phase), 1.02 + bob);
    float pd = length(uv-pearlPos);
    float pearlCore = smoothstep(0.10,0.0,pd);
    float flame = fbm(uv*5.0 + vec2(0.0,-u_time*1.2) + phase);
    float pearlHalo = smoothstep(0.42,0.0,pd) * (0.55+0.45*flame);
    float pearlPulse = 0.78+0.22*sin(u_time*1.4+phase);

    // ---- march the spine, find nearest segment to this pixel ----
    float travel = t*1.7;

    float bodyMask = 0.0;
    float bestS    = 0.0;
    float bestRel  = 1.0;   // normalised distance across the body (0 center -> 1 edge)
    float bestSide = 0.0;   // signed across-body coordinate
    vec2  bestTang = vec2(0.0,1.0);
    vec2  headPos  = vec2(0.0,0.0);

    const float N = 30.0;
    for(float i=0.0;i<30.0;i++){
        float s = i/(N-1.0);
        vec2 P  = spine(s, travel, phase);
        vec2 Pn = spine(s+0.012, travel, phase);
        vec2 tang = normalize(Pn - P + 1e-4);
        vec2 norm = vec2(-tang.y, tang.x);

        vec2 d   = uv - P;
        float across = dot(d, norm);
        float along  = dot(d, tang);
        float dist   = length(d);

        // tapered radius: thin neck, full belly, fine tail
        float taper = smoothstep(0.0,0.10,s) * (1.0 - 0.45*smoothstep(0.62,1.0,s));
        float rad   = 0.205*taper + 0.018;

        float seg = smoothstep(rad, rad*0.40, dist);
        if(seg > bodyMask){
            bodyMask = seg;
            bestS    = s;
            bestRel  = clamp(dist/max(rad,0.001), 0.0, 1.0);
            bestSide = across/max(rad,0.001);
            bestTang = tang;
        }
        // remember head (tip of the parameter range)
        if(i >= N-1.0){ headPos = P; }
    }

    // ---- scales: stable lattice in (arc-length, across-body) space ----
    float along  = bestS*34.0;
    float across = bestSide*3.2;
    vec2 g = vec2(along, across);
    g.x += 0.5*floor(g.y);                 // brick offset
    vec2 cell = fract(g)-0.5;
    float scaleD = length(cell*vec2(1.0,1.25));
    float scales = smoothstep(0.5,0.16,scaleD);
    float shimmer = 0.5+0.5*sin(bestS*30.0 - u_time*2.2*dir + across*1.4 + phase);
    shimmer = pow(shimmer,2.0);
    float scaleField = scales * (0.5+0.6*shimmer);

    // body shading
    float core = smoothstep(1.0,0.0,bestRel);   // 1 at center, 0 at rim
    float rim  = smoothstep(0.55,1.0,bestRel)*bodyMask;

    vec3 goldDeep = vec3(0.55,0.33,0.07);
    vec3 goldMid  = vec3(0.96,0.76,0.30);
    vec3 goldHi   = vec3(1.0,0.96,0.86);
    vec3 jade     = vec3(0.16,0.72,0.45);

    vec3 body = mix(goldDeep, goldMid, smoothstep(0.0,0.65,core));
    body = mix(body, goldHi, smoothstep(0.55,1.0,core)*0.95);
    body = mix(body*0.62, body+goldHi*0.30, scaleField);
    float jadeGlint = pow(shimmer,3.0)*scales*0.6;
    body = mix(body, jade, jadeGlint*0.5);
    // hue drift (seed gated through hueShift)
    body = mix(body, body.gbr, max(hueShift,0.0));
    body += jade*max(-hueShift,0.0)*0.4;

    // dorsal crest ridge running along the back (one side of the body)
    float crest = smoothstep(0.55,0.95,bestSide) * bodyMask
                * (0.4+0.6*shimmer) * smoothstep(0.04,0.25,bestS);

    // ---- head + eye + glow near the rising tip ----
    float hd = length(uv - headPos);
    float headLobe = smoothstep(0.20,0.0,hd);          // bright muzzle mass
    vec2  eyeOff = bestTang*0.045 + vec2(bestTang.y,-bestTang.x)*0.05;
    float ed = length(uv - (headPos + eyeOff));
    float eye = smoothstep(0.030,0.0,ed);              // dark eye socket
    float eyeSpark = smoothstep(0.012,0.0,length(uv-(headPos+eyeOff-vec2(0.01,-0.008))));
    float headGlow = smoothstep(0.32,0.0,hd) * (0.6+0.4*pearlPulse);

    // ---- composite the dragon ----
    col = mix(col, body, bodyMask*0.97);
    col += mix(goldHi, jade, 0.5) * crest * 0.55;
    col = mix(col, goldHi, headLobe*0.85);
    col = mix(col, vec3(0.05,0.03,0.01), eye*0.9);     // carve the eye dark
    col += goldHi * eyeSpark * 1.2;                     // catchlight
    col += goldMid * headGlow * 0.4;

    // halo around the whole body
    col += mix(goldMid, jade, 0.25) * rim * 0.7;
    float aura = bodyMask;
    col += goldMid * pow(aura,1.5) * 0.12;
    col += jade   * pow(aura,3.0) * 0.06;

    // ---- the pearl on top (drawn over body so it reads as a focal point) ----
    col += vec3(1.0,0.86,0.55) * pearlHalo * 0.55 * pearlPulse;
    col = mix(col, vec3(1.0,0.97,0.90), pearlCore*pearlPulse);

    // ---- drifting golden motes / sparks rising ----
    float motes = 0.0;
    for(float i=0.0;i<8.0;i++){
        float fi   = i;
        float seed = hash11(fi*1.7+1.0+vary*fi);
        float mx   = (seed-0.5)*2.6;
        float sp   = 0.10+0.07*hash11(fi*3.1+2.0);
        float my   = fract(seed + u_time*sp*0.25) * 2.6 - 1.3;
        vec2  mp   = vec2(mx + 0.18*sin(u_time*0.5+fi+phase), my);
        float md   = length(uv-mp);
        float tw   = 0.5+0.5*sin(u_time*3.0+fi*2.0);
        motes += smoothstep(0.04,0.0,md)*(0.4+0.6*tw);
    }
    col += mix(goldHi, jade, 0.2) * motes * 0.5;

    // ---- finishing: grain + tone ----
    float grain = (hash21(gl_FragCoord.xy + u_time)-0.5)*0.03;
    col += grain;
    col = pow(max(col,0.0), vec3(0.90));
    col *= 1.05;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
