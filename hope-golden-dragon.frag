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

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    float vary = u_seed*u_unique;
    float phase = vary*6.28318;
    float dir = mix(1.0, sign(hash11(u_seed+3.7)-0.5), u_unique);
    float hueShift = (hash11(u_seed+11.3)-0.5)*0.18*u_unique;

    float t = u_time*0.13*dir;

    // ---- Flowing, warped dark background ----
    vec2 wp = uv*1.3;
    float warp = fbm(wp*1.1 + vec2(t*0.6, -t*0.4) + phase);
    wp += 0.55*vec2(fbm(wp+warp+phase), fbm(wp.yx-warp-phase));
    float neb = fbm(wp*1.4 + vec2(-t*0.3, t*0.5));
    neb = pow(neb, 1.6);

    vec3 deep = vec3(0.070,0.050,0.016);
    vec3 dark = vec3(0.018,0.012,0.004);
    vec3 col = mix(dark, deep, neb);
    // faint jade glow in the depths
    col += vec3(0.02,0.06,0.045) * pow(fbm(wp*0.8 - t*0.2),3.0) * 0.9;
    // gentle radial vignette to focus the center
    float vig = smoothstep(1.7,0.2,length(uv));
    col *= mix(0.45,1.0,vig);

    // ---- The sinuous dragon: a coiling parametric spine ----
    // We march along an arc-length parameter s, place body segments,
    // and accumulate the closest signed distance to the body tube.
    float bodyMask = 0.0;
    float scaleField = 0.0;
    float crest = 0.0;
    float headGlow = 0.0;
    float bestS = 0.0;
    float bestD = 1e3;
    vec2 bestDirN = vec2(0.0);

    const float N = 26.0;
    for(float i=0.0;i<26.0;i++){
        float s = i/(N-1.0);                 // 0..1 along the body
        // serpentine, upward-coiling path travelling over time
        float travel = t*1.6;
        float ph = s*9.0 - travel + phase;   // body flows along its length
        float x = sin(ph)*0.62*(0.55+0.55*s);          // lateral S-weave
        x += 0.18*sin(ph*0.5 + 1.3);
        float y = (s*2.4 - 1.25)                        // rises upward
                  + 0.18*sin(ph*0.5);
        // slow overall coil sway of whole creature
        vec2 P = vec2(x,y);
        P = rot(0.10*sin(t*0.6+phase))*P;

        vec2 d = uv - P;
        float dist = length(d);

        // tapering radius: thick near head/mid, thin tail
        float taper = smoothstep(0.0,0.12,s) * (1.0 - 0.55*smoothstep(0.55,1.0,s));
        float rad = 0.20*taper + 0.02;

        float seg = smoothstep(rad, rad*0.45, dist);
        if(seg > bodyMask){
            bodyMask = seg;
            bestS = s;
            bestD = dist/max(rad,0.001);
            // approximate tangent for scale orientation
            float ph2 = (s+0.02)*9.0 - travel + phase;
            float x2 = sin(ph2)*0.62*(0.55+0.55*(s+0.02));
            float y2 = ((s+0.02)*2.4-1.25)+0.18*sin(ph2*0.5);
            bestDirN = normalize(vec2(x2,y2)-P + 1e-4);
        }
        // dorsal crest ridge along the back
        crest = max(crest, smoothstep(rad*0.6, 0.0, dist) * smoothstep(0.0,0.3,s));
        // head: brighter mass at the leading end
        float hr = 0.26;
        headGlow = max(headGlow, smoothstep(hr,0.0,dist) * (1.0-smoothstep(0.02,0.10,s)));
    }

    // ---- Shimmering scales texture on the body ----
    // local frame along the body tangent
    vec2 tang = bestDirN;
    vec2 norm = vec2(-tang.y, tang.x);
    // project uv into along/across coords (rough, body-local)
    float along = bestS*22.0;
    float across = dot(uv, norm)*10.0;
    vec2 sc = vec2(along, across);
    // overlapping fish-scale pattern (offset rows)
    vec2 g = sc;
    g.x += 0.5*floor(g.y);
    vec2 cell = fract(g)-0.5;
    float scaleD = length(cell*vec2(1.0,1.3));
    float scales = smoothstep(0.5,0.18,scaleD);
    // animated shimmer sweeping along body
    float shimmer = 0.5+0.5*sin(bestS*30.0 - u_time*2.4*dir + across*0.6 + phase);
    shimmer = pow(shimmer,2.0);
    scaleField = scales * (0.55+0.6*shimmer);

    // edge rim + central core of body
    float core = smoothstep(1.0,0.0,bestD);
    float rim = smoothstep(0.9,1.0,bestD)*bodyMask;

    // ---- Gold palette with jade accents ----
    vec3 goldDeep = vec3(0.62,0.40,0.10);
    vec3 goldMid  = vec3(0.949,0.757,0.306);   // #f2c14e
    vec3 goldHi   = vec3(1.0,0.953,0.878);      // #fff3e0
    vec3 jade     = vec3(0.169,0.714,0.451);    // #2bb673

    // base body shading from core depth
    vec3 body = mix(goldDeep, goldMid, smoothstep(0.0,0.7,core));
    body = mix(body, goldHi, smoothstep(0.55,1.0,core)*0.9);
    // scales modulate brightness
    body = mix(body*0.7, body+goldHi*0.35, scaleField);
    // jade glints riding the shimmer (gold+jade contrast)
    float jadeGlint = pow(shimmer,3.0)*scales*0.6;
    body = mix(body, jade, jadeGlint*0.55);
    // hue shift variation when unique
    body = mix(body, body.gbr, max(hueShift,0.0)) ;
    body += jade*max(-hueShift,0.0)*0.4;

    // dorsal crest = jade-tipped golden fins
    vec3 crestCol = mix(goldHi, jade, 0.5);
    // bright golden head with a jade eye-spark
    vec3 headCol = goldHi;

    // compose dragon over background
    col = mix(col, body, bodyMask*0.96);
    col += crestCol * crest * 0.5;
    col += headCol * headGlow * 0.6;
    // glowing rim halo around the whole serpent
    float halo = bodyMask*rim;
    col += mix(goldMid, jade, 0.25) * halo * 0.8;

    // soft outer aura (hope, light emanating)
    float aura = bodyMask;
    col += goldMid * pow(aura,1.5) * 0.12;
    col += jade * pow(aura,3.0) * 0.06;

    // ---- floating embers / motes of light drifting up ----
    float motes = 0.0;
    for(float i=0.0;i<8.0;i++){
        float fi = i;
        float seed = hash11(fi*1.7+1.0+vary*fi);
        float mx = (seed-0.5)*2.6;
        float sp = 0.10+0.07*hash11(fi*3.1+2.0);
        float my = fract(seed + u_time*sp*0.25) * 2.6 - 1.3;
        vec2 mp = vec2(mx + 0.18*sin(u_time*0.5+fi+phase), my);
        float md = length(uv-mp);
        float tw = 0.5+0.5*sin(u_time*3.0+fi*2.0);
        motes += smoothstep(0.045,0.0,md)*(0.4+0.6*tw);
    }
    col += mix(goldHi, jade, 0.2) * motes * 0.5;

    // gentle film grain
    float grain = (hash21(gl_FragCoord.xy + u_time)-0.5)*0.035;
    col += grain;

    // final contrast lift / tone
    col = pow(max(col,0.0), vec3(0.92));
    col *= 1.04;

    gl_FragColor = vec4(clamp(col,0.0,1.0),1.0);
}
