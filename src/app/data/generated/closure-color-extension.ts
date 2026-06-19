import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "closure-color-extension",
  name: "Color Extension",
  description: "Translucent purple petals and orbs breathe outward in soft floral clusters, an extension of color through stillness.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define VIOLET   vec3(0.65, 0.45, 0.95)
#define PURPLE   vec3(0.55, 0.35, 0.85)
#define LILAC    vec3(0.80, 0.65, 0.98)
#define MAGENTA  vec3(0.85, 0.55, 0.95)
#define WHITE    vec3(1.0, 1.0, 1.0)
#define BG       vec3(0.0, 0.0, 0.0)

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

// Petal shape: elongated teardrop
float petal(vec2 p, float size, float rotation){
    float ca = cos(rotation), sa = sin(rotation);
    p = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca);
    p.x /= 1.0;
    p.y /= 2.5;
    float r = length(p);
    float edge = smoothstep(size, size * 0.85, r);
    // Highlight on one side
    float highlight = smoothstep(size * 0.7, size * 0.4, length(p - vec2(size * 0.25, -size * 0.4))) * 0.6;
    return edge + highlight * edge * 0.4;
}

// Orb shape: soft glowing circle
float orb(vec2 p, float radius){
    float d = length(p);
    float core = smoothstep(radius, radius * 0.92, d);
    float glow = exp(-d / radius * 1.5) * 0.5;
    return core + glow * (1.0 - core);
}

void main(){
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.5;
    float sv = u_seed * u_unique * 0.01;

    vec3 col = BG;

    // Cluster centers (3 main flower clusters)
    vec2 clusters[3];
    clusters[0] = vec2(-0.3, 0.15);
    clusters[1] = vec2(0.3, 0.05);
    clusters[2] = vec2(0.0, -0.3);

    // Draw petals radiating from each cluster
    for(float c = 0.0; c < 3.0; c++){
        vec2 center = clusters[int(c)];
        center.x += sin(t * 0.4 + c * 1.7) * 0.02;
        center.y += cos(t * 0.3 + c * 2.1) * 0.02;

        for(float p = 0.0; p < 6.0; p++){
            float angle = (p / 6.0) * 6.2832 + t * 0.2 + c * 1.0;
            float petalDist = 0.12 + sin(t * 0.6 + p * 0.5 + c) * 0.02;
            vec2 petalCenter = center + vec2(cos(angle), sin(angle)) * petalDist;

            vec2 rel = uv - petalCenter;
            float petalRot = angle + 1.5708;
            float petalSize = 0.13 + sin(t * 0.5 + p * 0.7 + c * 1.3) * 0.015;

            float petalShape = petal(rel, petalSize, petalRot);

            // Color: violet/purple/lilac/magenta gradient
            float colorMix = hash11(p + c * 7.0 + sv);
            vec3 petalCol;
            if(colorMix < 0.4) petalCol = mix(VIOLET, PURPLE, colorMix / 0.4);
            else if(colorMix < 0.75) petalCol = mix(PURPLE, LILAC, (colorMix - 0.4) / 0.35);
            else petalCol = mix(LILAC, MAGENTA, (colorMix - 0.75) / 0.25);

            // White highlight at petal core
            petalCol += WHITE * petalShape * 0.3;

            col = mix(col, petalCol, petalShape * 0.75);
        }

        // Center orb of each cluster
        vec2 relCenter = uv - center;
        float centerOrb = orb(relCenter, 0.06);
        col = mix(col, mix(LILAC, WHITE, 0.5), centerOrb * 0.8);
    }

    // Scattered orbs around the clusters
    for(float i = 0.0; i < 12.0; i++){
        float h1 = hash11(i * 1.7 + sv);
        float h2 = hash11(i * 3.3 + sv);
        float h3 = hash11(i * 7.1 + sv);

        vec2 orbCenter = vec2((h1 - 0.5) * 1.6, (h2 - 0.5) * 1.4);
        // Gentle floating motion
        orbCenter.x += sin(t * (0.4 + h3 * 0.3) + i * 1.7) * 0.03;
        orbCenter.y += cos(t * (0.5 + h3 * 0.3) + i * 2.3) * 0.03;

        float orbRadius = 0.025 + h3 * 0.04;
        float pulse = 0.7 + 0.3 * sin(t * 1.5 + i * 0.7);

        vec2 rel = uv - orbCenter;
        float orbShape = orb(rel, orbRadius);

        float colorMix = h1;
        vec3 orbCol;
        if(colorMix < 0.5) orbCol = mix(PURPLE, LILAC, colorMix / 0.5);
        else orbCol = mix(LILAC, MAGENTA, (colorMix - 0.5) / 0.5);

        col = mix(col, orbCol, orbShape * pulse * 0.6);
    }

    // Soft falloff (no rectangle visible)
    col *= smoothstep(1.5, 0.4, length(uv));

    // Subtle grain
    float grain = (hash21(gl_FragCoord.xy + fract(t)) - 0.5) * 0.02;
    col += grain;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
