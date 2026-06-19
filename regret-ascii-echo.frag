#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for(float i = 0.0; i < 4.0; i++){
        v += amp * vnoise(p * freq);
        freq *= 2.03;
        amp *= 0.52;
    }
    return v;
}

float glyph(vec2 q, float id){
    if(q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return 0.0;
    float gx = floor(q.x * 5.0);
    float gy = floor(q.y * 5.0);
    float bit = gy * 5.0 + gx;
    float h = hash21(vec2(id * 1.7 + 11.0, floor(bit) * 0.37 + 3.0));
    float density = 0.34 + 0.30 * hash11(id * 4.3 + 1.0);
    float on = step(h, density);
    vec2 cell = fract(q * 5.0) - 0.5;
    float pad = smoothstep(0.52, 0.30, abs(cell.x)) * smoothstep(0.52, 0.30, abs(cell.y));
    return on * pad;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    float t = u_time * 0.085;

    float sd = u_seed * u_unique;
    float ph = sd * 6.2831;
    float dir = mix(1.0, sign(hash11(sd + 2.17) - 0.5), u_unique);
    float pal = hash11(sd + 7.31) * u_unique;
    float baseAngle = (hash11(sd + 3.91) - 0.5) * 0.7 * u_unique;

    vec2 src = vec2(0.0, 0.0);
    src.x += (hash11(sd + 5.13) - 0.5) * 0.6 * u_unique;
    src.y += (hash11(sd + 9.47) - 0.5) * 0.4 * u_unique;

    vec2 rot = vec2(cos(baseAngle), sin(baseAngle));
    vec2 p = vec2(uv.x * rot.x - uv.y * rot.y, uv.x * rot.y + uv.y * rot.x);

    vec2 wp = p * 1.25;
    vec2 warp;
    warp.x = fbm(wp + vec2(0.0, t * 0.9) + ph);
    warp.y = fbm(wp + vec2(5.2, -t * 0.55) + 2.3);
    float haze = fbm(wp + 1.5 * (warp - 0.5) + vec2(t * 0.28 * dir, t * 0.75));
    haze = pow(clamp(haze, 0.0, 1.0), 1.45);
    float deep = fbm(p * 0.65 + vec2(-t * 0.22, t * 0.42) + 3.7 + ph);

    vec3 nearBlack = vec3(0.018, 0.028, 0.046);
    vec3 floorBlue = vec3(0.035, 0.066, 0.110);
    vec3 midBlue = vec3(0.180, 0.498, 0.722);
    vec3 paleBlue = vec3(0.812, 0.910, 1.0);

    midBlue = mix(midBlue, midBlue.zyx, 0.22 * pal);

    vec3 col = nearBlack;
    col = mix(col, floorBlue, haze * 0.7);
    col += floorBlue * deep * 0.20;

    float vgrad = smoothstep(-1.2, 1.2, p.y);
    col *= mix(0.82, 1.10, vgrad);

    vec2 rp = uv - src;
    float r = length(rp);

    float echo = 0.0;
    float core = 0.0;
    float bright = 0.0;

    float ringPeriod = 1.0;
    float speed = 0.42;

    for(float i = 0.0; i < 6.0; i++){
        float phase = fract((t * speed + i * (ringPeriod / 6.0)) );
        float radius = phase * 2.2;
        float ringWidth = 0.16 + 0.05 * phase;

        float band = smoothstep(ringWidth, 0.0, abs(r - radius));
        float ageFade = (1.0 - phase);
        ageFade = ageFade * ageFade;
        band *= ageFade;

        if(band <= 0.001) continue;

        float ang = atan(rp.y, rp.x);
        float circ = 6.2831853 * radius;
        float cells = max(6.0, floor(circ * 3.4));
        float aCell = (ang / 6.2831853 + 0.5) * cells;
        aCell += dir * t * 1.6 + i * 1.7 + ph;
        float ai = floor(aCell);
        float af = fract(aCell);

        float gid = hash11(ai * 0.123 + i * 7.1 + floor(t * speed + i) * 3.7 + sd * 13.0);
        gid = floor(gid * 90.0);

        float radialCell = (r - radius) / ringWidth * 0.5 + 0.5;
        vec2 q = vec2(af, radialCell);

        float g = glyph(q, gid);

        float flick = 0.7 + 0.3 * sin(t * 3.0 + ai * 1.3 + i * 2.0);

        echo += band * (0.10 + 0.06 * flick);
        core += g * band * flick;
        bright += g * band * band * flick;
    }

    float restGrid = 0.0;
    vec2 gq = p * 9.0;
    gq.x += dir * sin(p.y * 2.0 + t * 0.5 + ph) * 0.4;
    vec2 gcell = floor(gq);
    vec2 gf = fract(gq);
    float ggid = floor(hash21(gcell + floor(sd * 5.0)) * 90.0);
    float gg = glyph(gf, ggid);
    float gpresent = step(0.82, hash21(gcell * 1.31 + 4.0));
    float gtwinkle = 0.5 + 0.5 * sin(t * 1.2 + hash21(gcell) * 30.0);
    float gdist = smoothstep(1.4, 0.2, r);
    restGrid = gg * gpresent * gtwinkle * (0.10 + 0.10 * gdist);

    float src_glow = smoothstep(0.55, 0.0, r) * (0.20 + 0.10 * sin(t * 1.6 + ph));

    vec3 echoCol = mix(midBlue, paleBlue, 0.3);
    col += echoCol * echo * 0.6;
    col += floorBlue * restGrid * 1.4;

    col = mix(col, midBlue, clamp(core * 0.9, 0.0, 1.0));
    col += paleBlue * clamp(bright, 0.0, 1.0) * 0.85;
    col += paleBlue * pow(clamp(bright, 0.0, 1.0), 2.0) * 0.5;

    col += midBlue * src_glow * 0.5;

    float grain = hash21(gl_FragCoord.xy + fract(u_time) * 17.0) - 0.5;
    col += grain * 0.03;

    float vig = 1.0 - 0.5 * dot(uv * 0.66, uv * 0.66);
    col *= clamp(vig, 0.0, 1.0);

    col = pow(clamp(col, 0.0, 1.0), vec3(0.90));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
