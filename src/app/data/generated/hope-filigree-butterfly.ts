import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "hope-filigree-butterfly",
  name: "Filigree Butterfly",
  description: "A butterfly of gold lacework breathes its wings open and shut, trailing beaded antennae that drift like sparks on black.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define GOLD  vec3(0.95, 0.78, 0.26)
#define DGOLD vec3(0.66, 0.46, 0.12)
#define PALE  vec3(1.00, 0.93, 0.66)
#define BG    vec3(0.015, 0.012, 0.008)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}

// one wing in local space (origin at body, opening to +x). Returns fill + lace.
float wing(vec2 p, float flap, out float lace){
    // flap squashes the wing horizontally (perspective of flapping)
    p.x /= max(flap, 0.05);
    float r = length(p);
    float a = atan(p.y, p.x);
    // scalloped outer edge
    float edge = 0.52 + 0.10*cos(a*5.0) + 0.06*cos(a*9.0);
    float upper = step(0.0, p.y) * smoothstep(edge, edge-0.02, r) * smoothstep(0.0,0.05,r);
    float lowerEdge = 0.40 + 0.10*cos(a*4.0);
    float lower = step(p.y,0.0) * smoothstep(lowerEdge, lowerEdge-0.02, r);
    float fill = max(upper, lower);
    // lace pattern: radial ribs + rosette dots
    float ribs = smoothstep(0.85, 0.98, abs(sin(a*18.0)));
    float rings = smoothstep(0.85, 0.98, abs(sin(r*40.0)));
    // a couple of "eye" rosettes
    float ros1 = smoothstep(0.06,0.0,length(p-vec2(0.30,-0.12)));
    float ros2 = smoothstep(0.09,0.0,length(p-vec2(0.18,-0.22)));
    lace = (max(ribs, rings) * fill) + (ros1+ros2)*0.0;
    lace += smoothstep(0.05,0.0,abs(length(p-vec2(0.30,-0.12))-0.045)) * fill;
    return fill;
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 1.3;
    float sv = u_seed * u_unique * 0.01;

    vec3 col = BG;
    // subtle warm pool of light behind
    col += DGOLD * 0.10 * smoothstep(1.0, 0.0, length(uv));

    // gentle bob
    vec2 p = uv - vec2(0.0, sin(t*1.2)*0.02);
    // wing flap (open/close)
    float flap = 0.55 + 0.45 * (0.5 + 0.5*sin(t*2.2));

    float lace, lL, lR;
    // left wing (mirror x)
    float wl = wing(vec2(-p.x, p.y) - vec2(0.04,0.0), flap, lL);
    // right wing
    float wr = wing(vec2( p.x, p.y) - vec2(0.04,0.0), flap, lR);

    float wings = max(wl, wr);
    float lacePat = max(lL, lR);

    // wing shading: gradient gold, brighter toward tips, shimmer sweep
    float shimmer = 0.5 + 0.5*sin(p.x*4.0 - t*2.0);
    vec3 wingCol = mix(DGOLD, GOLD, 0.4 + 0.6*shimmer);
    wingCol = mix(wingCol, PALE, smoothstep(0.3,0.6,length(p))*0.4);
    col = mix(col, wingCol, wings*0.9);
    col += PALE * lacePat * 0.5;
    // crisp gold outline
    float outline = smoothstep(0.02, 0.0, abs(wings-0.5));
    col += GOLD * outline * 0.6;

    // body: segmented bead column
    float body = smoothstep(0.035, 0.02, abs(p.x)) * smoothstep(0.34,-0.30, p.y) * smoothstep(-0.34,0.30,p.y);
    col = mix(col, GOLD, body);
    float seg = smoothstep(0.7,1.0,abs(sin(p.y*40.0)));
    col += DGOLD * body * seg * 0.4;
    // head bead
    col = mix(col, PALE, smoothstep(0.05,0.0,length(p-vec2(0.0,0.30))));

    // antennae: two curling beaded filaments from the head
    for(float s=-1.0;s<=1.0;s+=2.0){
        for(float i=0.0;i<24.0;i++){
            float u = i/23.0;
            float curl = u*1.1;
            vec2 a = vec2(0.0,0.31) + vec2(s*sin(curl*2.2)*0.18*u + s*0.02, 0.14*u + 0.05*sin(t*1.5+u*3.0)*u);
            float dot = smoothstep(0.012, 0.0, length(p - a));
            float bead = (mod(i,3.0)<1.0) ? 1.6 : 0.7;
            col += GOLD * dot * bead;
        }
    }

    // trailing beaded sparks drifting off the lower wings
    for(float i=0.0;i<18.0;i++){
        float h = hash21(vec2(i, floor(sv*50.0)));
        float ph = fract(h + t*0.06);
        vec2 sp = vec2(mix(0.1,0.9,h)* (h<0.5?-1.0:1.0), -0.2 - ph*0.7);
        sp.x += sin(t*1.0 + i)*0.05;
        float dot = smoothstep(0.010,0.0,length(p - sp));
        col += GOLD * dot * (0.4+0.6*sin(t*3.0+i)) * (1.0-ph);
    }

    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.02;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
