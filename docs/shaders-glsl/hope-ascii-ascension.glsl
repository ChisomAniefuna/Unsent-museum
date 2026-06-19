#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float p){
    p = fract(p*0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y)*p3.z);
}

float vnoise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i+vec2(0.0,0.0));
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float amp = 0.5;
    float f = 1.0;
    for(float i=0.0;i<5.0;i++){
        v += amp*vnoise(p*f);
        f *= 2.02;
        amp *= 0.5;
    }
    return v;
}

// A small procedural 5x5 ASCII-like glyph. Returns coverage in 0..1.
float glyph(vec2 g, float id){
    if(g.x<0.0||g.x>1.0||g.y<0.0||g.y>1.0) return 0.0;
    vec2 cell = floor(g*5.0);
    // Mirror left/right for legible, character-like symmetry.
    float mx = cell.x;
    if(mx > 2.0){ mx = 4.0 - mx; }
    float bits = hash21(vec2(id*7.13 + mx*2.0, id*3.71 + cell.y));
    float on = step(0.42, bits);
    // Keep a vertical spine often lit so glyphs read as characters, not noise.
    float spine = 0.0;
    if(abs(cell.x - 2.0) < 0.5){ spine = step(0.25, hash11(id*1.91 + cell.y)); }
    on = max(on, spine);
    vec2 fc = fract(g*5.0);
    float core = smoothstep(0.62, 0.12, length(fc-0.5));
    return on*core;
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;

    // --- gating: all seed variation rides on u_unique ---
    float seed = u_seed*u_unique;
    float pShift = hash11(seed*1.37 + 0.5);
    float dir = mix(1.0, sign(hash11(seed*2.3 + 0.7) - 0.5), u_unique);
    if(dir == 0.0){ dir = 1.0; }
    float hueShift = (hash11(seed*4.1 + 0.2) - 0.5) * u_unique;

    // --- palette: deep night -> ember gold -> warm white ---
    vec3 nearBlack = vec3(0.015,0.013,0.022);
    vec3 deepGold  = vec3(0.22,0.13,0.035);
    vec3 gold      = vec3(0.96,0.76,0.30);
    vec3 warmWhite = vec3(1.0,0.97,0.88);
    gold += vec3(hueShift*0.10, hueShift*0.02, -hueShift*0.10);

    float t = u_time*0.336;

    // --- flowing warped background (slow domain warp) ---
    vec2 wp = uv*1.3;
    vec2 warp;
    warp.x = fbm(wp + vec2(0.0, t*0.6) + seed*3.1);
    warp.y = fbm(wp + vec2(5.2, -t) + seed*1.7);
    float field  = fbm(wp*1.4 + warp*1.6 + vec2(seed*2.0, t*0.8));
    float field2 = fbm(wp*0.7 - warp*1.1 + vec2(-t*0.5, seed));

    vec3 col = nearBlack;
    col = mix(col, deepGold, smoothstep(0.30,0.95,field)*0.65);
    col += deepGold*0.45*smoothstep(0.40,1.0,field2);
    // upward updraft glow brightening toward the top of frame
    float updraft = smoothstep(-1.2, 1.4, uv.y);
    col += deepGold*0.30*updraft*smoothstep(0.35,1.0,field);

    float vign = smoothstep(1.8,0.15,length(uv));
    col *= mix(0.30,1.0,vign);

    // --- ASCII glyph columns ---
    float aspect = u_resolution.x/u_resolution.y;
    vec2 gp = uv;

    float colsAcross = 26.0;
    float gx = uv.x*0.5*colsAcross;
    float colId = floor(gx + colsAcross*0.5);
    float fx = fract(gx);

    float colRand  = hash11(colId*1.13 + 11.0 + seed*5.0);
    float colRand2 = hash11(colId*2.57 + 3.0  + seed*2.1);

    // each column rises at its own slow pace; dir flips with seed
    float speed = mix(0.40,1.05, colRand);
    float scrollY = uv.y*dir - u_time*0.85*speed - pShift*6.2831*u_unique;

    float rows = 13.0;
    float gy = scrollY*rows*0.5;
    float rowId = floor(gy);
    float fy = fract(gy);

    // gentle side-to-side sway so the stream feels alive
    float wob = sin(u_time*0.35 + colId*1.3)*0.05;
    fx = fract(gx + wob);

    // glyph identity recycles per row, so characters "become" anew
    float charSeed = hash21(vec2(colId*0.91, rowId*1.7));
    float gid = floor(charSeed*64.0);

    vec2 inCell = vec2(fx, fy);
    vec2 pad = vec2(0.16,0.10);
    vec2 gcoord = (inCell-pad)/(1.0-2.0*pad);
    float gShape = glyph(gcoord, gid);

    // --- spark head: a bright crest travels up each column, trailing fade ---
    float headPhase = fract(u_time*0.26*speed + colRand + colRand2);
    float headRow = floor(headPhase*rows*4.0 - rows*2.0);
    float distFromHead = (rowId - headRow)*dir;

    float trail = exp(-max(distFromHead,0.0)*0.50);
    float behind = step(-0.5, distFromHead);
    trail *= behind;

    // occasionally a column is dim (sparse field, more legible)
    float colMask = step(hash11(colId*3.7 + 7.0 + seed), 0.84);
    gShape *= colMask;

    float glyphLum = gShape*(0.16 + trail*1.05);

    vec3 glyphCol = mix(gold, warmWhite, smoothstep(0.45,1.0,trail));
    col += glyphCol * glyphLum * (1.05 + 0.55*vign);

    // bright bloom right at the spark head
    float headGlow = exp(-abs(distFromHead)*0.85)*gShape;
    col += warmWhite*headGlow*0.65;

    // --- a few free-floating sparks rising and drifting ---
    float sparkN = 0.0;
    for(float i=0.0;i<3.0;i++){
        float fi = i+1.0;
        float sx = (hash11(fi*12.7 + seed*3.0)*2.0-1.0)*aspect;
        float baseY = hash11(fi*5.3 + seed);
        float sy = fract(baseY + u_time*0.07*(0.5+fi*0.2)*dir)*2.4 - 1.2;
        float drift = sin(u_time*0.5 + fi*2.0)*0.15;
        vec2 sc = gp - vec2(sx+drift, sy*dir);
        float d = length(sc*vec2(1.0,0.7));
        sparkN += exp(-d*24.0);
    }
    col += gold*sparkN*0.65;
    col += warmWhite*sparkN*sparkN*0.45;

    // subtle vertical light shafts reinforcing the upward read
    float shaft = smoothstep(0.0,1.0, field*0.5+0.5);
    col += gold*0.05*shaft*updraft;

    // --- fine grain + contrast lift ---
    float grain = (hash21(gl_FragCoord.xy + fract(u_time))*2.0-1.0)*0.020;
    col += grain;

    col *= 1.06;
    col = pow(col, vec3(0.90));

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
