import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-sankofa",
  name: "Sankofa",
  description: "The Sankofa bird turns its head back to fetch the fallen egg while light travels the crossroads, go back and reclaim what was left.",
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
    vec3 q = fract(vec3(p.xyx)*0.1031);
    q += dot(q, q.yzx+33.33);
    return fract((q.x+q.y)*q.z);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    for(float i=0.0;i<5.0;i++){
        v += amp*noise(p);
        p = p*1.92 + vec2(11.3,7.7);
        amp *= 0.52;
    }
    return v;
}

float sdSegment(vec2 p, vec2 a, vec2 b){
    vec2 pa = p-a;
    vec2 ba = b-a;
    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
    return length(pa - ba*h);
}

float sdCircle(vec2 p, vec2 c, float r){
    return length(p-c)-r;
}

mat2 rot(float a){
    float s = sin(a);
    float c = cos(a);
    return mat2(c,-s,s,c);
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    // ---- seed gating: u_unique==0 -> canonical, ==1 -> varied ----
    float seed   = u_seed*u_unique;
    float sh     = hash11(seed+3.17);
    float palShift = (sh-0.5)*0.55*u_unique;
    float travel = mix(1.0, sign(hash11(seed+9.4)-0.5), u_unique);
    float t = u_time*0.119;

    // ---- flowing, warping background (domain warp) ----
    vec2 p = uv;
    p *= rot((0.10*sin(t*0.6) + seed*0.25)*u_unique);

    vec2 q = vec2(
        fbm(p*1.25 + vec2(0.0, t*0.45*travel) + seed),
        fbm(p*1.25 + vec2(5.2,-t*0.38) + seed*1.7)
    );
    vec2 r2 = vec2(
        fbm(p*1.6 + 2.3*q + vec2(1.7,9.2) - t*0.28*travel),
        fbm(p*1.6 + 2.3*q + vec2(8.3,2.8) + t*0.24)
    );
    float current = fbm(p*1.05 + 3.0*r2 + vec2(t*0.55*travel,-t*0.2));
    vec2 wp = p + (r2-0.5)*0.5;

    // ---- duotone palette: deep indigo shadow -> bright gold highlight ----
    vec3 abyss  = vec3(0.018,0.030,0.072);
    vec3 indigo = vec3(0.055,0.105,0.230);
    vec3 ocean  = vec3(0.075,0.235,0.395);
    vec3 gold   = vec3(0.905,0.690,0.255);
    vec3 goldHi = vec3(1.000,0.930,0.640);

    indigo.b += palShift*0.10;
    ocean.g  += palShift*0.06;

    vec3 col = mix(abyss, indigo, smoothstep(0.10,0.95,current));
    col = mix(col, ocean, smoothstep(0.55,0.98,current)*0.50);

    // moving caustic bands in the cloth
    float band = sin((wp.x*1.5 - wp.y*0.8)*3.0 + current*6.0 + t*1.1*travel);
    col += ocean*0.10*smoothstep(0.35,1.0,band)*current;

    float centerLift = smoothstep(1.35,0.05,length(uv));
    col *= 0.42 + 0.62*centerLift;

    // ---- crossroads paths (drawn beneath the bird, light travels along them) ----
    float pathW = 0.020;
    float roadGlow = 0.0;
    float roadFill = 0.0;
    for(float i=0.0;i<4.0;i++){
        float ang = (i/4.0)*3.14159 - 1.5708
                  + 0.18*sin(t*0.45 + i*2.1)
                  + seed*0.6*u_unique;
        vec2 dir = vec2(cos(ang), sin(ang));
        vec2 a = vec2(0.0,-0.10);
        vec2 b = dir*1.7 + vec2(0.0,-0.10);
        float d = sdSegment(wp, a, b);
        float along = clamp(dot(wp-a, dir)/1.7, 0.0, 1.0);
        // a single bright pulse running outward, then back (return & fetch)
        float phase = fract(t*0.9*travel - i*0.21);
        float head = exp(-pow((along - phase)*7.5, 2.0));
        roadFill += smoothstep(pathW, 0.0, d);
        roadGlow += smoothstep(pathW*1.6, 0.0, d)*head;
    }

    // ---- the Sankofa bird (looking back to fetch the egg) ----
    vec2 cp = wp;
    // gentle sway; canonical orientation when u_unique==0
    cp *= rot(0.10*sin(t*0.5) + seed*0.35*u_unique);

    float beat     = 0.5+0.5*sin(t*0.9);          // breathing
    float lookBack = 0.18*sin(t*0.5)+0.18;        // head turning back

    float gscale = 1.45;
    vec2 g = cp*gscale + vec2(0.0, 0.18);

    // body: curved S-form (the iconic arched back)
    float bodyA = sdCircle(g, vec2(0.02,-0.02), 0.44);
    float bodyB = sdCircle(g, vec2(-0.04,-0.34), 0.27);
    float body  = min(bodyA, bodyB);
    body = max(body, -sdCircle(g, vec2(0.34,0.20), 0.30)); // scoop the chest open

    // neck + head reaching backward over the body
    vec2 neckTop = vec2(-0.22 - 0.06*beat, 0.44);
    float neck = sdSegment(g, vec2(-0.02,0.16), neckTop) - 0.075;

    vec2 hp = g - neckTop;
    hp *= rot(-0.55 - lookBack);
    float head = sdCircle(hp, vec2(0.0,0.0), 0.150);
    head = min(head, neck);

    // beak pointing back+down toward the egg
    vec2 bk = hp - vec2(0.0,0.01);
    bk *= rot(2.45);
    float beak = sdSegment(bk, vec2(0.0,0.0), vec2(0.0,0.30))
               - (0.050 - 0.12*clamp(bk.y/0.30,0.0,1.0));
    head = min(head, beak);

    // folded wing
    vec2 ep = g - vec2(0.16,0.04);
    ep *= rot(-0.45);
    float wing = sdSegment(ep, vec2(0.0,0.0), vec2(0.0,0.55))
               - (0.17 - 0.22*clamp(ep.y/0.55,0.0,1.0));

    // long tail sweeping down/forward
    vec2 tp = g - vec2(0.16,-0.30);
    tp *= rot(0.45 + 0.12*sin(t*0.8));
    float tail = sdSegment(tp, vec2(0.0,0.0), vec2(0.0,0.62))
               - (0.15 - 0.16*clamp(tp.y/0.62,0.0,1.0));

    float bird = min(min(body, head), min(wing, tail));

    // the egg it returns to fetch, pulses with life, sits below the beak
    vec2 beakTip = neckTop + rot(-0.55 - lookBack)*vec2(0.0,-0.34);
    vec2 eggC = beakTip + vec2(0.04, -0.16);
    float eggPulse = 0.5+0.5*sin(t*1.4);
    float egg = sdCircle(g, eggC, 0.058 + 0.012*eggPulse);

    float aa = 2.5/u_resolution.y;

    // gate crossroads to outside the bird and below it
    roadFill *= smoothstep(-0.02,-0.18, bird);
    roadGlow *= smoothstep(-0.02,-0.18, bird);
    col += gold*roadFill*0.18;
    col += goldHi*roadGlow*0.9;
    col += gold*roadGlow*roadGlow*0.5;

    // bird shading: bright duotone gold against deep indigo cloth
    float edge  = smoothstep(aa, -aa, bird);
    float rim   = smoothstep(0.05, 0.0, abs(bird));
    float inner = smoothstep(0.0,-0.24, bird);

    // adinkra-like surface pattern inside the body
    float patternA = sin(g.x*22.0 + g.y*9.0 + t*1.2*travel)*0.5+0.5;
    float patternB = sin(length(g)*28.0 - t*1.8)*0.5+0.5;
    float adinkra  = mix(patternA, patternB, 0.5);

    vec3 birdCol = mix(gold, goldHi, 0.35+0.55*adinkra*inner);
    birdCol = mix(birdCol, indigo*0.6, 0.18*inner); // interior depth for contrast

    col = mix(col, birdCol, edge);
    col += goldHi*rim*0.7*(0.55+0.45*beat);

    // the egg: brightest point in the frame, a beacon to return to
    float eggM   = smoothstep(aa, -aa, egg);
    float eggHalo= exp(-length(g-eggC)*7.0);
    col = mix(col, goldHi, eggM);
    col += goldHi*eggHalo*(0.30+0.30*eggPulse);

    // ---- atmosphere ----
    float dust = noise(uv*55.0 + t*4.0);
    col += (dust-0.5)*0.022;

    float spark = pow(max(noise(uv*7.0 - t*0.3*travel),0.0), 6.0);
    col += gold*spark*0.45*centerLift;

    float vig = smoothstep(1.55,0.32,length(uv*vec2(0.94,1.0)));
    col *= 0.30 + 0.80*vig;

    col = pow(col, vec3(0.90));
    col *= 1.06;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
`,
};
export default def;
