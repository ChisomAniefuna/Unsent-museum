#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

float hash11(float n){
    return fract(sin(n*127.1+311.7)*43758.5453123);
}

float hash21(vec2 p){
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
}

float vnoise(vec2 p){
    vec2 i=floor(p);
    vec2 f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    float a=hash21(i+vec2(0.0,0.0));
    float b=hash21(i+vec2(1.0,0.0));
    float c=hash21(i+vec2(0.0,1.0));
    float d=hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}

float fbm(vec2 p){
    float v=0.0;
    float amp=0.5;
    for(float i=0.0;i<4.0;i++){
        v+=amp*vnoise(p);
        p=p*1.94+vec2(13.1,7.3);
        amp*=0.55;
    }
    return v;
}

void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;

    float t=u_time*0.10;

    float seed=u_seed*u_unique;
    float ph=seed*6.2831853;
    float dir=mix(1.0,sign(hash11(seed*3.17+1.0)-0.5),u_unique);
    float palShift=(hash11(seed*5.31+2.0)-0.5)*0.12*u_unique;
    float baseAngle=(hash11(seed*7.91+3.0)-0.5)*0.55*u_unique;

    vec2 rot=vec2(cos(baseAngle),sin(baseAngle));
    vec2 p=vec2(uv.x*rot.x-uv.y*rot.y, uv.x*rot.y+uv.y*rot.x);

    vec2 warp;
    warp.x=fbm(p*1.3+vec2(t*0.6,ph));
    warp.y=fbm(p*1.3+vec2(-t*0.5+5.2,ph+2.0));
    vec2 wp=p+(warp-0.5)*0.55;

    float field=fbm(wp*1.6+vec2(t*0.3,t*0.2+ph));
    field+=0.5*fbm(wp*3.4-vec2(t*0.25,ph));

    vec3 indigo=vec3(0.071,0.102,0.180);
    vec3 indigoDeep=vec3(0.027,0.043,0.094);
    vec3 col=mix(indigoDeep,indigo,field*0.85+0.15);

    float vig=1.0-0.55*dot(uv,uv);
    col*=clamp(vig,0.0,1.0);

    col+=indigo*0.18*pow(max(0.0,1.0-length(uv*vec2(0.7,1.0))),2.0);

    vec3 crimson=vec3(0.890,0.204,0.298);
    crimson.r+=palShift;
    crimson.b-=palShift*0.4;

    float life=0.5+0.5*sin(t*0.9+ph*0.5);
    float fray=smoothstep(0.0,1.0,life)*0.9+0.1;

    float thread=0.0;
    float glow=0.0;

    for(float i=0.0;i<7.0;i++){
        float fi=i/6.0;
        float strand=(fi-0.5)*2.0;

        float drift=fray*strand*0.28*dir;
        float sep=fray*fray*strand*0.22*dir;

        float wob=fbm(vec2(p.x*1.5+t*0.5+strand*3.0, i*2.3+ph))-0.5;
        float wob2=sin(p.x*2.4+t*1.3+strand*4.0+i)*0.05;

        float baseY=drift+sep*p.x;
        baseY+=wob*(0.10+0.32*fray*abs(strand))+wob2;
        baseY+=0.06*sin(p.x*3.7-t*1.1+i*1.7);

        float dy=p.y-baseY;

        float thick=0.012+0.010*(1.0-abs(strand))*(1.0-fray*0.5);

        float fade=smoothstep(1.35,0.55,abs(p.x));
        float endFade=1.0-fray*0.55*smoothstep(0.15,1.0,abs(p.x));

        float core=thick/(abs(dy)+thick);
        core=pow(core,2.4)*fade*endFade;

        core*=1.0-abs(strand)*0.65*fray;

        thread+=core;
        glow+=(thick*2.6)/(abs(dy)+thick*2.6)*0.18*fade*endFade;
    }

    float fibers=0.0;
    for(float j=0.0;j<5.0;j++){
        float fj=hash11(j*4.7+1.0);
        float sgn=sign(fj-0.5);
        float fx=hash11(j*9.1+ph)*2.0-1.0;
        float life2=fract(t*0.4+fj*1.0+ph*0.3);
        float travel=life2;

        float px=fx*0.3+sgn*travel*1.4*dir;
        float py=(fj-0.5)*0.5+sgn*travel*0.6;
        py+=fbm(vec2(j*3.0+t*0.6,ph))*0.3-0.15;

        vec2 fp=p-vec2(px,py);
        float ang=fj*6.28+t*0.5*sgn;
        vec2 fr=vec2(cos(ang),sin(ang));
        vec2 lp=vec2(fp.x*fr.x-fp.y*fr.y, fp.x*fr.y+fp.y*fr.x);

        float len=0.10+fj*0.08;
        float seg=smoothstep(len,0.0,abs(lp.x));
        float fth=0.006;
        float fcore=fth/(abs(lp.y)+fth);
        fcore=pow(fcore,2.0)*seg;

        float appear=sin(life2*3.14159);
        fibers+=fcore*appear*0.9;
    }

    float spark=0.0;
    for(float k=0.0;k<4.0;k++){
        float fk=hash11(k*6.3+ph+1.0);
        float lifeK=fract(t*0.5+fk);
        vec2 sp=vec2((fk*2.0-1.0)*0.9+ (lifeK-0.5)*0.4*dir, (hash11(k*2.1+ph)*2.0-1.0)*0.7);
        float d=length(p-sp);
        spark+=(0.0016/(d*d+0.0016))*sin(lifeK*3.14159)*0.5;
    }

    float redMask=clamp(thread+fibers*0.85+spark*0.5,0.0,1.4);
    float glowMask=clamp(glow+fibers*0.3,0.0,1.0);

    col+=crimson*glowMask*0.45;
    col=mix(col,crimson,clamp(redMask,0.0,1.0));
    col+=crimson*pow(clamp(redMask,0.0,1.0),3.0)*0.6;

    float hi=pow(clamp(thread,0.0,1.0),5.0);
    col+=vec3(1.0,0.82,0.80)*hi*0.5;

    float grain=hash21(gl_FragCoord.xy+vec2(t*60.0))-0.5;
    col+=grain*0.025;

    col=pow(max(col,0.0),vec3(0.92));

    gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}
