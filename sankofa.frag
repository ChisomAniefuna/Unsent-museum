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

vec2 hash22(vec2 p){
    vec3 q = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
    q += dot(q, q.yzx+33.33);
    return fract((q.xx+q.yz)*q.zy);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = dot(hash22(i+vec2(0.0,0.0)), f-vec2(0.0,0.0));
    float b = dot(hash22(i+vec2(1.0,0.0)), f-vec2(1.0,0.0));
    float c = dot(hash22(i+vec2(0.0,1.0)), f-vec2(0.0,1.0));
    float d = dot(hash22(i+vec2(1.0,1.0)), f-vec2(1.0,1.0));
    float r = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    return r*0.5+0.5;
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    float n = 5.0;
    for(float i=0.0;i<6.0;i++){
        if(i>=n) break;
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

    float seed = u_seed*u_unique;
    float sh = hash11(seed+3.17);
    float palShift = (sh-0.5)*0.6*u_unique;
    float travel = mix(1.0, sign(hash11(seed+9.4)-0.5), u_unique);
    float t = u_time*0.08;

    vec2 p = uv;

    float warpAng = 0.25*sin(t*0.7) + seed*0.3;
    p *= rot(warpAng*u_unique*0.15);

    vec2 q = vec2(
        fbm(p*1.3 + vec2(0.0, t*0.5*travel) + seed),
        fbm(p*1.3 + vec2(5.2, -t*0.4) + seed*1.7)
    );
    vec2 r2 = vec2(
        fbm(p*1.7 + 2.4*q + vec2(1.7, 9.2) - t*0.3*travel),
        fbm(p*1.7 + 2.4*q + vec2(8.3, 2.8) + t*0.25)
    );
    float current = fbm(p*1.1 + 3.2*r2 + vec2(t*0.6*travel, -t*0.2));

    vec2 wp = p + (r2-0.5)*0.55;

    vec3 indigo  = vec3(0.086,0.133,0.243);
    vec3 deep    = vec3(0.035,0.058,0.121);
    vec3 ocean   = vec3(0.094,0.247,0.380);
    vec3 gold    = vec3(0.878,0.698,0.290);
    vec3 goldHi  = vec3(0.984,0.886,0.580);

    indigo.b += palShift*0.10;
    ocean.g  += palShift*0.06;

    vec3 col = mix(deep, indigo, smoothstep(0.15,0.95,current));
    col = mix(col, ocean, smoothstep(0.45,0.92,current)*0.55);

    float band = sin((wp.x*1.4 - wp.y*0.8)*3.0 + current*6.0 + t*1.2*travel);
    col += ocean*0.10*smoothstep(0.3,1.0,band)*current;

    float depth = smoothstep(1.35,0.1,length(uv));
    col *= 0.55 + 0.55*depth;

    vec2 cp = wp;
    cp *= rot(0.18 + 0.45*sin(t*0.5)*u_unique + seed*0.4);

    float beat = 0.5+0.5*sin(t*1.1);
    float lookBack = 0.35*sin(t*0.55);

    float gscale = 1.55;
    vec2 g = cp*gscale + vec2(0.0, 0.12);

    float bodyA = sdCircle(g, vec2(0.0,-0.05), 0.46);
    float bodyB = sdCircle(g, vec2(-0.02,-0.34), 0.30);
    float body = min(bodyA, bodyB);
    body = max(body, -sdCircle(g, vec2(0.30,0.18), 0.26));

    vec2 hp = g - vec2(-0.18 - 0.10*beat, 0.42);
    hp *= rot(-0.7 - lookBack);
    float head = sdCircle(hp, vec2(0.0,0.0), 0.165);
    float neck = sdSegment(g, vec2(-0.05,0.18), vec2(-0.18-0.10*beat,0.40)) - 0.085;
    head = min(head, neck);

    vec2 bk = hp - vec2(0.0,0.02);
    bk *= rot(2.55);
    float beak = sdSegment(bk, vec2(0.0,0.0), vec2(0.0,0.30)) - (0.055 - 0.13*clamp(bk.y/0.30,0.0,1.0));
    head = min(head, beak);

    vec2 ep = g - vec2(0.18,0.06);
    ep *= rot(-0.5);
    float wing = sdSegment(ep, vec2(0.0,0.0), vec2(0.0,0.55)) - (0.16 - 0.22*clamp(ep.y/0.55,0.0,1.0));

    vec2 tp = g - vec2(0.10,-0.30);
    tp *= rot(0.5 + 0.15*sin(t*0.9));
    float tail = sdSegment(tp, vec2(0.0,0.0), vec2(0.0,0.6)) - (0.14 - 0.16*clamp(tp.y/0.6,0.0,1.0));

    vec2 lp = g - vec2(-0.18-0.10*beat, 0.46);
    float seedDot = sdCircle(lp, vec2(0.10,0.04), 0.055);

    float bird = min(min(body, head), min(wing, tail));

    float aa = 2.5/u_resolution.y;

    float edge = smoothstep(aa, -aa, bird);
    float rim  = smoothstep(0.045, 0.0, abs(bird)) * 0.9;
    float dotM = smoothstep(aa, -aa, seedDot);

    float inner = smoothstep(0.0,-0.22,bird);
    float patternA = sin(g.x*22.0 + g.y*10.0 + t*1.5*travel)*0.5+0.5;
    float patternB = sin(length(g)*30.0 - t*2.0)*0.5+0.5;
    float adinkra = mix(patternA, patternB, 0.5);

    vec3 goldMix = mix(gold, goldHi, 0.4+0.6*adinkra*inner);
    goldMix = mix(goldMix, goldHi, rim);

    col = mix(col, goldMix, edge);
    col += goldHi*rim*0.6*(0.6+0.4*beat);
    col = mix(col, goldHi, dotM);
    col += goldHi*0.25*dotM;

    float pathW = 0.018;
    vec2 xroad = wp;
    float roadGlow = 0.0;
    for(float i=0.0;i<3.0;i++){
        float ang = (i/3.0)*3.14159 + 0.5*sin(t*0.4 + i*2.1) + seed*0.7*u_unique;
        vec2 dir = vec2(cos(ang), sin(ang));
        float off = 0.55 + 0.25*i;
        vec2 a = -dir*1.8 + vec2(0.0,-0.55);
        vec2 b =  dir*0.2 + vec2(0.0,-0.55);
        float d = sdSegment(xroad, a, b);
        float flow = fract(dot(xroad-a, normalize(b-a))*1.3 - t*1.6*travel - i*0.33);
        float spark = smoothstep(0.85,1.0,flow)*smoothstep(0.05,0.0,d);
        roadGlow += smoothstep(pathW, 0.0, d)*0.5 + spark*0.8;
    }
    roadGlow *= smoothstep(-0.05,-0.4,bird);
    col += gold*roadGlow*0.5;
    col += goldHi*roadGlow*roadGlow*0.25;

    float dust = noise(uv*60.0 + t*5.0);
    col += (dust-0.5)*0.025;

    float spark2 = pow(max(noise(uv*8.0 - t*0.3*travel),0.0), 6.0);
    col += gold*spark2*0.5*depth;

    float vig = smoothstep(1.55,0.35,length(uv*vec2(0.92,1.0)));
    col *= 0.35 + 0.75*vig;

    col = pow(col, vec3(0.92));
    col *= 1.06;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
