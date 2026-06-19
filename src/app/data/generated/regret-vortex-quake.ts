import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "regret-vortex-quake",
  name: "Vortex Quake",
  description: "A purple vortex rotates fast and shudders with the high-frequency jitter of an internal earthquake.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define PURPLE   vec3(0.55, 0.30, 0.95)
#define VIOLET   vec3(0.65, 0.45, 1.00)
#define MAGENTA  vec3(0.85, 0.40, 0.95)
#define DEEP     vec3(0.20, 0.05, 0.40)
#define BG       vec3(0.0, 0.0, 0.0)
#define WHITE    vec3(1.0, 1.0, 1.0)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float hash11(float p){
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time;
    float sv = u_seed * u_unique * 0.01;

    // Earthquake jitter: high-frequency positional shake
    float quakeX = (hash11(floor(t * 30.0)) - 0.5) * 0.025;
    float quakeY = (hash11(floor(t * 30.0) + 7.13) - 0.5) * 0.025;
    // Periodic intense quake bursts
    float quakeBurst = smoothstep(0.7, 1.0, sin(t * 0.5) * 0.5 + 0.5);
    quakeX += (hash11(floor(t * 80.0)) - 0.5) * 0.04 * quakeBurst;
    quakeY += (hash11(floor(t * 80.0) + 1.7) - 0.5) * 0.04 * quakeBurst;

    uv += vec2(quakeX, quakeY);

    // Rapid rotation around center
    float rotAngle = t * 1.8 + sv;
    float ca = cos(rotAngle), sa = sin(rotAngle);
    vec2 ruv = vec2(uv.x * ca - uv.y * sa, uv.x * sa + uv.y * ca);

    vec3 col = BG;

    float r = length(ruv);
    float a = atan(ruv.y, ruv.x);

    // Multi-petal star vortex (8 petals matching the reference)
    float petals = 8.0;
    for(float layer = 0.0; layer < 5.0; layer++){
        float layerOffset = layer * 0.15;
        float radius = 0.3 + layer * 0.13;

        // Star/petal shape
        float petalShape = abs(sin(a * petals * 0.5 + t * 0.3 + layer * 0.4));
        float starR = radius + petalShape * 0.15;

        // Spiral lines
        float spiral = sin(a * petals + log(r + 0.01) * 8.0 - t * 3.0 + layer * 0.7);
        float spiralLine = smoothstep(0.7, 0.95, spiral) * smoothstep(0.05, 0.0, abs(r - starR));

        // Filament lines crisscrossing
        float filament = sin(a * 30.0 + r * 20.0 - t * 4.0 + layer);
        float filamentLine = smoothstep(0.85, 0.95, abs(filament)) *
                             smoothstep(0.7, 0.2, r) * smoothstep(0.05, 0.3, r);

        vec3 layerCol = mix(PURPLE, VIOLET, layer / 4.0);
        if(layer == 2.0) layerCol = mix(layerCol, MAGENTA, 0.5);

        col += layerCol * spiralLine * 0.6;
        col += layerCol * filamentLine * 0.25;
    }

    // Bright center burst
    float centerGlow = exp(-r * 12.0) * 1.5;
    col += WHITE * centerGlow * (0.7 + 0.3 * sin(t * 8.0));

    // Outer glow
    float outerHaze = exp(-r * 2.0) * 0.15;
    col += PURPLE * outerHaze;

    // Radial light streaks
    for(float i = 0.0; i < 12.0; i++){
        float streakAngle = (i / 12.0) * 6.2832 + t * 0.4;
        float ang = atan(ruv.y, ruv.x);
        float angDiff = abs(mod(ang - streakAngle + 3.14159, 6.2832) - 3.14159);
        float streak = smoothstep(0.05, 0.0, angDiff) * smoothstep(0.8, 0.1, r);
        col += VIOLET * streak * 0.4;
    }

    // Strong vignette to keep background pure black
    col *= smoothstep(1.4, 0.2, length(uv));

    // Faint grain
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.03;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
