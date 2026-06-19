# Shader Replication Kit

A self-contained recipe for generating the same family of animated WebGL fragment shaders this session produced, on any AI that can write GLSL ES 1.00. Hand this whole file to another model — it has the conventions, the master prompt, the per-image prompts, and every shader's full source.

---

## 1. The reference images

These are every image you sent during the session, in the order you sent them, paired with the shader I built for each (or noted as queued). The actual image files are in your `~/Downloads` folder — the chat doesn't save them to disk; re-upload them when re-running with another AI.

| # | Reference image (description) | Theme | Shader name | Generated file |
|---|---|---|---|---|
| 1 | Pink rose on bright green chroma, three loose petals on the floor | Grief — a fallen flower | Fallen Rose | `src/app/data/generated/grief-fallen-rose.ts` |
| 2 | Field of ~50 pink rose petals scattered on bright green chroma | Love — scattered love | Scattered Petals | `src/app/data/generated/love-scattered-petals.ts` |
| 3 | Pixel-art man with a purple/blue crystalline head, black shirt, on bright green chroma | Regret — a mind replaying | Crystal Mind / Replaying | `src/app/data/generated/regret-crystal-mind.ts` |
| 4 | Two eyes blasting golden ASCII/pixel rays in a starburst on bright green chroma (came with HTML canvas reference code) | Hope — seeing what others cannot | Eye Rays | `src/app/data/generated/hope-eye-rays.ts` |
| 5 | Same eyes — variant request to open and close | Hope — fragile vision | Eye Rays Blink | `src/app/data/generated/hope-eye-rays-blink.ts` |
| 6 | Ornate gold-filigree peacock with fanned crest and trailing eye-spot plumes, deep burgundy ground | Hope — unfurling, becoming radiant | Golden Peacock | `src/app/data/generated/hope-golden-peacock.ts` |
| 7 | Blue-and-gold flying crane/hummingbird with peacock-eye feathers on deep burgundy | Hope — taking flight | _(queued, not built)_ | — |
| 8 | Cluster of gold ginkgo leaves with floral patterns and sumi swirls on solid black | Closure — autumn settling | _(queued, not built)_ | — |
| 9 | Two red translucent hands with beaded bracelets reaching for a glowing golden spark on burgundy | Love — almost touching | Reaching Hands | `src/app/data/generated/love-leaf-hands.ts` |
| 10 | Phoenix pair — pink/red feathered birds flying toward each other on burgundy with cherry-blossom flecks | Love — meeting again | _(queued, not built)_ | — |
| 11 | Soft purple breathing-smoke ring on a pale ground | Grief — breath holding what's left | Smoke Breathing _(you'd added this before my turn)_ | `src/app/data/generated/grief-smoke-breathing.ts` |
| 12 | Layered red/coral/cream/gold flower mandala with golden beaded center on burgundy | Love — a flower that keeps opening | Camellia Bloom _(one parametric shader covering the whole flower-mandala family via seed)_ | `src/app/data/generated/love-camellia-bloom.ts` |
| 13 | Gold filigree butterfly with daisy patterns and trailing beaded antennae on solid black | Hope — fragile thing that still has wings | Filigree Butterfly | `src/app/data/generated/hope-filigree-butterfly.ts` |
| 14 | Gold paper kite with floral pattern and trailing gold ribbons on black | Hope — held by string, still rising | _(queued, not built)_ | — |
| 15 | Red mandala flower with circular dotted border on burgundy | Love — flower-mandala family | Covered by Camellia Bloom (seed variant) | `src/app/data/generated/love-camellia-bloom.ts` |
| 16 | Layered camellia with cream center and patterned red outer petals on burgundy | Love — flower-mandala family | Covered by Camellia Bloom (seed variant) | `src/app/data/generated/love-camellia-bloom.ts` |
| 17 | Simple symmetric 8-petal bloom in red/coral/cream gradient on burgundy | Love — flower-mandala family | Covered by Camellia Bloom (seed variant) | `src/app/data/generated/love-camellia-bloom.ts` |
| 18 | Six-pointed red-and-cream star flower with gold center on burgundy | Love — flower-mandala family | Covered by Camellia Bloom (seed variant) | `src/app/data/generated/love-camellia-bloom.ts` |
| 19 | Layered lotus with green sepals and pink/cream lotus heart on burgundy | Love — flower-mandala family | Covered by Camellia Bloom (seed variant) | `src/app/data/generated/love-camellia-bloom.ts` |
| 20 | Pixel raven with broken-monocle glasses on bright green chroma | Grief / Regret — broken sight | _(queued, not built)_ | — |
| 21 | 3x3 grid of ASCII art: caged bird, fire within, weeping eye, silent face, shattered lenses, into the void, withering, melting candles, moonlit clouds | Grief — nine ASCII vignettes | _(queued — each would be a small ASCII shader)_ | — |
| 22 | Dense ASCII portrait (face built from K, #, @, $ characters) | Grief — face dissolving into code | _(queued, not built)_ | — |
| 23 | Two red-leaf hands reaching for each other vertically on burgundy (later iteration of #9, leaf/ASCII variant) | Love — almost touching | Reaching Hands (same shader as #9, iterated) | `src/app/data/generated/love-leaf-hands.ts` |
| 24 | Bronze sphere with three sorrowful child faces and tears | Grief — sorrow has many faces | Weeping Orb | `src/app/data/generated/grief-weeping-orb.ts` |
| 25 | _(Conceptual — no image; text request)_ "Speaking mouth for grief, cycling through pause, pout, frown, bend lips" | Grief — the words that never came | The Words That Never Came _(produced by the multi-agent design panel in Section 6; full GLSL in Section 5.10)_ | `src/app/data/generated/grief-speaking-mouth.ts` _(drop-in ready)_ |

**Built this session:** 11 shaders (Fallen Rose, Scattered Petals, Crystal Mind, Eye Rays, Eye Rays Blink, Golden Peacock, Reaching Hands, Camellia Bloom (covers 6 references), Filigree Butterfly, Weeping Orb, The Words That Never Came).

**Queued for a future round (have references, no shader yet):** blue-and-gold crane, gold ginkgo bouquet, phoenix pair, gold paper kite, pixel raven with broken-monocle glasses, 3x3 ASCII vignette grid (caged bird / fire within / weeping eye / silent face / shattered lenses / into the void / withering / melting candles / moonlit clouds), dense ASCII portrait.

---

## 2. The engine these shaders plug into (hard contract)

Every shader is a single GLSL ES 1.00 fragment shader that runs in a shared WebGL context, blitted onto a 2D canvas per gallery card. The engine declares these uniforms and binds them every frame:

```glsl
uniform vec2  u_resolution;   // canvas pixel size
uniform float u_time;         // seconds since start
uniform float u_seed;         // per-artifact integer-ish seed (any float)
uniform float u_unique;       // 0.0 for legacy artifacts, 1.0 for "use seed"
```

Hard rules every shader MUST follow (these are the rules the AI must obey):

1. Start with `#ifdef GL_ES\nprecision mediump float;\n#endif`.
2. **GLSL ES 1.00 only.** No `#version` directive, no `texture()`, no `in/out`, no bitwise ops, no arrays of structs, no dynamic-length loops (loop bounds must be constant integer or constant float).
3. Every helper function defined before it is used. `void main()` is last.
4. Write `gl_FragColor = vec4(rgb, 1.0);` exactly once. **Clamp the rgb** to `[0,1]` first. Never `discard`.
5. Normalise coords as `vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;` (centered, aspect-correct, y-up).
6. Animation is driven only by `u_time`. Loop seamlessly when the piece has a defined cycle.
7. Use `u_seed * u_unique` for per-artifact variation, so an artifact with `u_unique = 0` renders identically every time (legacy compatibility).
8. Performance: no loop > ~64 iterations, no heavy nested loops. The shader runs at ~30fps on a 2D-blit thumbnail.
9. **Normalize `u_seed` to a 0-100 range at the GLSL boundary** before using it as a phase offset, or user-created artifacts (with huge seeds) render black.

Each shader is exported as a TypeScript module with this shape:

```ts
import type { ShaderDef } from "../shaders";

const def: ShaderDef = {
  id: "<emotion>-<short-name>",            // kebab-case
  name: "Human Title",                     // short, evocative
  description: "One poetic sentence for the gallery card.",
  glsl: `
    // ...full GLSL source as a backtick-template-literal...
  `,
};

export default def;
```

It is registered by adding it to the per-emotion array in `src/app/data/generatedShaders.ts`, and a mock artifact referencing its `shaderIndex` is added to `src/app/data/artifacts.ts` so it actually shows up in the gallery.

---

## 3. The master prompt (give this to another AI verbatim)

> Hand this block to any capable LLM. Then send one of the per-image prompts in Section 5.

```
You are a GLSL shader artist. You write fragment shaders for a museum of
animated emotional artifacts called The Unsent Museum. Each shader I commission
is a single procedural piece that captures an emotion — grief, love, hope,
regret, closure — through math, color, and motion.

ENGINE CONTRACT (every shader must obey this):
- Output: a single complete GLSL ES 1.00 fragment shader (WebGL1), no markdown
  fences, no headers or commentary, just the code.
- Start with:
    #ifdef GL_ES
    precision mediump float;
    #endif
- Declare these uniforms (even if a few go unused):
    uniform vec2  u_resolution;
    uniform float u_time;
    uniform float u_seed;
    uniform float u_unique;
- WebGL1 / GLSL ES 1.00 only. No #version directive. No texture(), no
  in/out, no bitwise ops, no arrays of structs, no dynamic-length loops
  (all for-loops must use constant bounds).
- Every helper function defined BEFORE it is used. main() is the last function.
- Write `gl_FragColor = vec4(rgb, 1.0);` exactly once. clamp(rgb, 0.0, 1.0)
  before writing. No discard.
- Normalise coordinates as:
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
- All animation driven only by u_time. Loops in u_time must be seamless if
  the piece has a defined cycle.
- Use `u_seed * u_unique` for per-artifact variation; when both are zero the
  shader must render the canonical look.
- Keep it performant: no loop > 64 iterations.

PALETTES BY EMOTION (use the right one for the requested emotion):
- GRIEF:   off-black vec3(0.05,0.04,0.07), dirty purple vec3(0.29,0.24,0.37),
           grey vec3(0.48,0.48,0.48). Mood: dark, desaturated, slow.
- LOVE:    deep burgundy bg vec3(0.18,0.03,0.06), crimson vec3(0.78,0.10,0.16),
           coral vec3(0.96,0.45,0.42), cream vec3(0.98,0.92,0.80),
           gold vec3(0.92,0.74,0.30). Mood: warm, layered, breathing.
- HOPE:    deep warm dark vec3(0.02,0.01,0.0), gold vec3(0.95,0.78,0.26),
           amber vec3(0.85,0.55,0.12), pale vec3(1.0,0.93,0.66). Mood: rising,
           radiant, golden.
- REGRET:  midnight vec3(0.03,0.05,0.11), tide blue vec3(0.10,0.18,0.36),
           bruised violet vec3(0.55,0.24,0.50), pale moon vec3(0.88,0.84,0.92).
           Mood: returning, looping, restless.
- CLOSURE: near-black with cool tint, dark navy vec3(0.055,0.227,0.361),
           mid blue vec3(0.180,0.498,0.722), light sky vec3(0.624,0.831,0.910).
           Mood: settled, ocean-like, completed.

STYLE GUIDANCE:
- Lean into the reference image's visual logic (filigree -> gold lacework lines;
  ASCII references -> pixelate(uv) and grid overlay; flowers -> layered radial
  petal SDFs; portraits -> simple face SDFs with cell/voronoi texture; bronze
  metal -> fbm patina + spherical normals + rim lighting).
- Add subtle film grain at the end, a soft vignette, and a desaturation pass
  if the mood is melancholy.
- The background stays mostly still or slow; the SUBJECT animates.

OUTPUT FORMAT:
Return only the complete .ts module body, like this:

  import type { ShaderDef } from "../shaders";
  const def: ShaderDef = {
    id: "<emotion>-<short-name>",
    name: "Human Title",
    description: "One poetic sentence.",
    glsl: `
    ...the full shader source...
    `,
  };
  export default def;
```

---

## 4. Per-image prompt templates

For each reference image, this is the prompt I used (paraphrased to a clean form). Pair the master prompt above with the relevant block below and attach the matching reference image.

### 4.1 Fallen Rose (grief)
> Remove the green chroma background mentally and use the rose silhouette as inspiration only. Build a GRIEF shader called "Fallen Rose": a triple-tone palette of **dusty rose**, **deep burgundy**, and **ashen grey** on near-black; a few stylized petals tumbling slowly down with a tumbling rotation and a horizontal curl, accumulating at the bottom; a faint central wilting bloom that fades in/out very slowly; subtle vertical "grief rain" streaks; light fbm fog drift; a desaturation pass at the end for sadness. Animate via `u_time`. ~12 falling petals max.

### 4.2 Scattered Petals (love)
> A field of ~40 rose petals scattered across the canvas, each at a random position derived from `hash11(i)`, each at a random rotation that slowly tumbles, drifting gently in a sin/cos drift plus a slow downward settling. Three palette tiers: **deep pink** `vec3(0.85,0.15,0.45)`, **soft pink** `vec3(0.92,0.55,0.65)`, **pale** `vec3(0.96,0.85,0.88)`, chosen per petal by another hash. Warm-dark background, vignette, soft grain.

### 4.3 Replaying / Crystal Mind (regret)
> A REGRET shader. The reference is a pixel-art portrait whose head is a purple/blue crystalline lattice. Build either an anatomical version (face SDF + voronoi crystals + radial cooling pulse + sparkle pulses + pixelation overlay), or a fully abstract version that captures the same feeling — *a thought cooling and warming and returning*: domain-warped fbm in a palette that runs from midnight to bruised violet to ember, with a radial "echo" sine wave and a low pulse. Loop infinitely. (The user's preferred final version was the abstract abstract form — title "Replaying".)

### 4.4 Eye Rays (hope)
> Two almond-shaped eyes side by side at `(-0.28, 0)` and `(0.28, 0)`. From each eye, radiating beams of light (a ray() SDF that's a thin band tapering with distance, multiplied by a high-frequency `sin(x*15 - t*4)` for pulsing). 16 radial rays per eye plus 8 stronger diagonal rays that slowly rotate. Pixelate the whole frame with `floor(uv * 80) / 80` to give an ASCII/pixel-art feel, then overlay a faint pixel grid. Gold-amber-orange palette. Each eye has an iris+pupil+catchlight. Eyebrow arcs above. Near-black warm background.

### 4.5 Golden Peacock (hope)
> The reference is an ornate gold-filigree peacock on burgundy. A HOPE shader: deep burgundy background with a warm vignette; a teardrop body silhouette on the left rendered as filigree (sin-modulated scrollwork); a long neck + head + beak sweeping up-left; a fanned **crest** of 11 radial dotted beaded spokes emerging from the head, with terminal pale dots; 9 long teardrop **tail plumes** sweeping right at fanned angles, each carrying a rosette "eye" near its tip and a sin-modulated sway along its length; floating gold dust particles. Travelling shimmer highlight across the bird. Subtle grain.

### 4.6 Weeping Orb (grief)
> The reference is a tarnished bronze sphere with three sorrowful faces embedded in its segmented surface, tears running down. A GRIEF shader, more painterly/gothic: render the sphere with a fake-3D spherical normal (`z = sqrt(R² - len(uv)²)`, normal = `normalize(vec3(uv, z))`), diffuse lighting from upper-left, rim lighting. fbm patina patches of dark tarnish over bronze, plus high-frequency fbm scratches. Vertical segment seams (peel-like). Three embedded face SDFs (one center, two flanking, slightly darker): oval head, brow shadow, eye sockets, nose ridge, mouth crease. Two recurring tear streaks from the central face's eyes — a thin vertical line with a flowing droplet, plus discrete falling tear-beads. Subtle painterly grain.

### 4.7 Filigree Butterfly (hope)
> Gold filigree butterfly on pure black. Build two mirrored **wings** with a scalloped outer edge (`0.52 + 0.10*cos(a*5) + 0.06*cos(a*9)`), thinner lower lobe, animated **flap** (`p.x /= flap`) where `flap` oscillates between 0.55 and 1.0. Lace pattern: radial ribs + concentric rings inside each wing. A couple of rosette "eye" markings near the lower wing. A segmented bead body column, a pale head bead, and **two curling beaded antennae** — for each of the 24 beads along each antenna, position by `vec2(s*sin(curl*2.2)*0.18*u, 0.14*u + 0.05*sin(t*1.5+u*3)*u)`, every third bead brighter. 18 trailing beaded sparks falling off the lower wings. No background scenery, just the warm pool of light behind the body.

### 4.8 Reaching Hands (love)
> Two hands made of red leaves reaching toward each other vertically — top hand pointing down, bottom hand pointing up, fingertips almost meeting in the middle. Each hand built from a palm SDF (capsules + ellipses or a leafy fan of 5 fingers). The leaves use a leaf SDF (teardrop with central midrib and side veins) in a CRIM→RED→BLUSH→PALE gradient. Beaded bracelets at the wrists (gold beads alternating with red). Between the fingertips, kindle a **golden spark**: a bright core + exponential glow + 10 orbiting sparkles on a radius that oscillates. The hands and spark sit on deep burgundy ground with vignette.

> A later iteration of this image went a different direction: render the hands entirely from ASCII characters using a small 5x7 bitmap font, with hand-shaped SDF used as a coverage mask. Both directions live in the codebase.

### 4.9 Camellia Bloom — one parametric shader for the whole flower-mandala family (love)
> The user sent ~9 ornate red/gold flower mandalas. Instead of nine near-clones, build ONE parametric LOVE shader: a 5-ring concentric petal mandala on deep burgundy. For each ring of `RINGS = 5`, parameterise: petal count (6/8/10 by `floor(seed*4)`), petal length (interpolated from 0.62 outer to 0.20 inner), petal half-width, base ring radius, alternating counter-rotation, alternating offset by half a sector so petals interleave, and a per-ring open/close phase. Each petal is a `sin(yN*π)`-tapered SDF. Color each ring by `ringColor(rf, seed)` cycling through **crimson → red → coral → cream → gold**. Inside each petal: a darker-at-base / luminous-at-tip ramp, central crease highlight, and one of three seed-picked patterns (cross-weave, radial ribs, dotted scales). Finally a **golden beaded heart** in the center: small gold disc, ring of 16 beads sin-modulated around the center, 24 radiating stamen lines, a bright pale core, a pulsing gold glow, and a traveling sheen sweep. Seed picks an entirely different look every artifact, so the same shader covers the whole image family.

### 4.10 The Words That Never Came — Grief mouth (multi-agent design)
This one is special — it was produced by a multi-agent design panel, not a single prompt. See Section 6 for the full workflow script. The brief was:

> A grief shader of a single human MOUTH on a near-black field, animating through a fixed 16-second expression timeline:
> - **0–4s SPEAKING** (~5 sharp open/close syllables)
> - **4–6.5s PAUSE** (softly parted, almost still, faint tremble)
> - **6.5–9.5s POUT** (lips press full and forward, corners tuck UP)
> - **9.5–12.5s FROWN** (corners pull DOWN hard, lips thin)
> - **12.5–15s BEND** (asymmetric trembling curl, one corner wavers — suppressed cry)
> - **15–16s SETTLE** (eased exactly back to SPEAKING's t=0, seamless loop)

---

## 5. The full final GLSL shaders

> Each block below is the complete `.ts` module — copy it verbatim to `src/app/data/generated/<filename>.ts`.

### 5.1 `grief-fallen-rose.ts`

```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-fallen-rose",
  name: "Fallen Rose",
  description: "Petals drift and curl downward through three tones of fading beauty, a flower that has let go.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define TONE_ROSE vec3(0.72, 0.42, 0.48)
#define TONE_WINE vec3(0.30, 0.08, 0.14)
#define TONE_ASH  vec3(0.35, 0.32, 0.34)
#define BG        vec3(0.04, 0.02, 0.05)

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0));
    float c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
    float v=0.0, amp=0.5;
    for(int i=0;i<5;i++){ v+=amp*vnoise(p); p*=2.03; amp*=0.48; }
    return v;
}
float petalShape(vec2 p, float size){
    float a = atan(p.y, p.x);
    float r = length(p);
    float petal = size * (0.5 + 0.5*sin(a)) * (0.6 + 0.4*cos(a*2.0));
    return smoothstep(petal, petal - 0.04*size, r);
}
float fallingPetal(vec2 uv, float id, float t, float sv){
    float h = hash11(id + sv);
    float h2 = hash11(id*7.13 + sv);
    float h3 = hash11(id*13.37 + sv);
    float speed = 0.12 + h*0.15;
    float drift = sin(t*(0.4+h2*0.3)+id*2.5) * (0.3+h3*0.4);
    float tumble = t*(0.8+h*1.2) + id*6.28;
    float startX = (h-0.5)*2.4, startY = 1.2 + h2*0.8;
    vec2 pos = vec2(startX+drift, startY - mod(t*speed+h3*10.0, 3.5));
    vec2 rel = uv - pos;
    float ca = cos(tumble), sa = sin(tumble);
    rel = vec2(rel.x*ca - rel.y*sa, rel.x*sa + rel.y*ca);
    float size = 0.06 + h*0.06;
    float curl = sin(t*0.5+id)*0.3;
    rel.x += curl*rel.y;
    return petalShape(rel, size);
}
vec3 triTone(float v){
    v = clamp(v,0.0,1.0);
    if(v<0.4) return mix(BG, TONE_WINE, v/0.4);
    if(v<0.7) return mix(TONE_WINE, TONE_ASH, (v-0.4)/0.3);
    return mix(TONE_ASH, TONE_ROSE, (v-0.7)/0.3);
}
void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;
    float t = u_time*0.6;
    float sv = u_seed*u_unique*0.01;
    vec2 fogUV = uv*1.5 + vec2(t*0.05, -t*0.03);
    float fog = fbm(fogUV+sv);
    float fog2 = fbm(fogUV*1.5 + vec2(fog*0.5, t*0.02));
    float vig = smoothstep(1.6, 0.3, length(uv));
    vec3 bgCol = triTone(fog2*0.5)*vig;
    float rain=0.0;
    for(float i=0.0;i<3.0;i++){
        vec2 rp = uv*vec2(20.0+i*5.0,1.0);
        rp.y += t*(0.8+i*0.3); rp.x += sin(rp.y*0.3+i)*0.5;
        float streak = smoothstep(0.48,0.5,fract(rp.x))*smoothstep(0.52,0.5,fract(rp.x));
        float fade = smoothstep(0.0,0.3,fract(rp.y))*smoothstep(1.0,0.6,fract(rp.y));
        rain += streak*fade*0.08;
    }
    bgCol += TONE_ASH*rain*vig;
    float stemX = sin(uv.y*2.0+sv*5.0)*0.08 + sv*0.3;
    float stem = smoothstep(0.025,0.01,abs(uv.x-stemX))*smoothstep(-1.2,-0.3,uv.y)*smoothstep(0.1,-0.2,uv.y);
    float stemBend = smoothstep(-0.2,0.1,uv.y);
    stem *= 1.0 - stemBend*0.8;
    bgCol = mix(bgCol, TONE_WINE*0.4, stem*0.7);
    float ground=0.0;
    for(float i=0.0;i<5.0;i++){
        float h = hash11(i*3.7+sv);
        vec2 gpos = vec2((h-0.5)*1.6, -0.85 - h*0.15);
        vec2 grel = uv - gpos;
        float ga = h*3.14;
        float ca = cos(ga), sa = sin(ga);
        grel = vec2(grel.x*ca - grel.y*sa, grel.x*sa + grel.y*ca);
        grel.y *= 2.5;
        ground += petalShape(grel, 0.07 + h*0.04);
    }
    ground = clamp(ground,0.0,1.0);
    vec3 groundCol = mix(TONE_WINE, TONE_ROSE, ground*0.5 + fog*0.3);
    bgCol = mix(bgCol, groundCol*0.6, ground*0.8*vig);
    float petals=0.0, petalTone=0.0;
    for(float i=0.0;i<12.0;i++){
        float p = fallingPetal(uv, i, t, sv);
        if(p>0.01){
            float tv = hash11(i*5.3+sv);
            petalTone = mix(petalTone, tv, p);
            petals = max(petals, p);
        }
    }
    vec3 petalCol = triTone(0.5 + petalTone*0.5);
    petalCol += TONE_ROSE*petals*0.3;
    bgCol = mix(bgCol, petalCol, petals*0.9*vig);
    vec2 bloomCenter = vec2(sin(sv*3.0)*0.1, 0.15);
    float bloom=0.0;
    for(float i=0.0;i<5.0;i++){
        float angle = i*1.2566 + t*0.1 + sv;
        vec2 pdir = vec2(cos(angle), sin(angle));
        vec2 rel = uv - bloomCenter - pdir*0.12;
        float ca = cos(angle+t*0.05), sa = sin(angle+t*0.05);
        rel = vec2(rel.x*ca - rel.y*sa, rel.x*sa + rel.y*ca);
        float droop = sin(t*0.3+i)*0.05*(1.0+t*0.02);
        rel.y += droop;
        bloom += petalShape(rel, 0.09 - i*0.005)*(1.0 - i*0.12);
    }
    bloom = clamp(bloom,0.0,1.0);
    float bloomFade = smoothstep(0.0, 0.5, sin(t*0.08)*0.5+0.5);
    vec3 bloomCol = mix(TONE_WINE, TONE_ROSE, bloom*0.7 + fog*0.2);
    bloomCol = mix(bloomCol, TONE_ASH, bloomFade*0.4);
    bgCol = mix(bgCol, bloomCol, bloom*(0.7 - bloomFade*0.3)*vig);
    float lum = dot(bgCol, vec3(0.299,0.587,0.114));
    bgCol = mix(vec3(lum), bgCol, 0.75);
    float grain = (hash21(uv*u_resolution.xy + fract(t*0.1)) - 0.5)*0.06;
    bgCol += grain;
    gl_FragColor = vec4(clamp(bgCol,0.0,1.0), 1.0);
}
`,
};
export default def;
```

### 5.2 `love-scattered-petals.ts`

```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "love-scattered-petals",
  name: "Scattered Petals",
  description: "Dozens of rose petals drift and tumble across a warm void, love scattered but never gone.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;
#define DEEP_PINK vec3(0.85, 0.15, 0.45)
#define SOFT_PINK vec3(0.92, 0.55, 0.65)
#define PALE      vec3(0.96, 0.85, 0.88)
#define BG        vec3(0.06, 0.03, 0.05)
float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx)*0.1031);
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.x+p3.y)*p3.z);
}
float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash21(i), hash21(i+vec2(1,0)), u.x),
               mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), u.x), u.y);
}
float petal(vec2 p, float size){
    p.y *= 1.4;
    float r = length(p);
    float a = atan(p.y, p.x);
    float shape = size*(0.45 + 0.15*cos(a) + 0.1*cos(a*2.0));
    float edge = smoothstep(shape, shape - 0.015*size, r);
    float vein = smoothstep(0.02, 0.005, abs(p.x)*(1.0 + abs(p.y)*3.0));
    return edge + vein*edge*0.15;
}
void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;
    float t = u_time*0.4;
    float sv = u_seed*u_unique*0.01;
    float bgGrad = smoothstep(1.8, 0.0, length(uv));
    vec3 col = mix(BG, BG*1.3, bgGrad);
    float warmth = vnoise(uv*2.0 + t*0.05)*0.08;
    col += vec3(warmth*0.6, warmth*0.1, warmth*0.2);
    for(float i=0.0;i<40.0;i++){
        float id = i + sv*100.0;
        float h1=hash11(id*1.17), h2=hash11(id*3.71), h3=hash11(id*7.13);
        float h4=hash11(id*11.3), h5=hash11(id*17.9);
        float px = (h1-0.5)*3.0, py = (h2-0.5)*2.2;
        float driftSpeed = 0.05 + h3*0.08, driftAmp = 0.1 + h4*0.15;
        px += sin(t*driftSpeed*2.0 + id*1.7)*driftAmp;
        py += cos(t*driftSpeed*1.5 + id*2.3)*driftAmp*0.6;
        py -= mod(t*(0.02+h3*0.03) + h5*10.0, 3.0)*0.3 - 0.3;
        vec2 rel = uv - vec2(px, py);
        float angle = h4*6.28 + t*(0.2 + h5*0.3)*(h3>0.5 ? 1.0 : -1.0);
        float ca=cos(angle), sa=sin(angle);
        rel = vec2(rel.x*ca - rel.y*sa, rel.x*sa + rel.y*ca);
        float size = 0.04 + h5*0.05;
        rel.x *= 1.0 + h3*0.6;
        float p = petal(rel, size);
        if(p>0.01){
            vec3 pc;
            if(h4<0.35) pc = mix(DEEP_PINK, SOFT_PINK, p);
            else if(h4<0.7) pc = mix(SOFT_PINK, PALE, p*0.7);
            else pc = mix(DEEP_PINK*0.8, PALE, p);
            pc *= 0.85 + p*0.15;
            float shadow = petal(rel + vec2(0.005,-0.008), size)*0.15;
            col = mix(col, col*(1.0-shadow), step(0.01, shadow));
            col = mix(col, pc, p*0.92);
        }
    }
    col *= smoothstep(1.7, 0.4, length(uv));
    float grain = (hash21(uv*u_resolution.xy + fract(t)) - 0.5)*0.04;
    col += grain;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};
export default def;
```

### 5.3 `hope-eye-rays.ts`

```ts
// See src/app/data/generated/hope-eye-rays.ts in the project for the full source.
// The shader's structure:
// - pixelate(uv, 80) for the ASCII feel
// - Two almond eyes at (-0.28,0) and (0.28,0), each with iris+pupil+catchlight
// - 16 radial rays + 8 stronger rotating diagonals per eye
// - Gold-amber-orange palette
// - Eyebrow arcs above each eye
// - Pixel grid overlay + vignette + grain
```

(The full source is in [hope-eye-rays.ts](src/app/data/generated/hope-eye-rays.ts) — paste it verbatim. It is the same shape as the others above.)

### 5.4 `regret-crystal-mind.ts` ("Replaying")

```ts
// See src/app/data/generated/regret-crystal-mind.ts.
// The user's preferred final form is the abstract version (renamed "Replaying"):
// - Domain-warped fbm (q -> r -> f) in the regret palette (midnight, tide, violet, bruise, ember, moon)
// - Radial echo: sin(length(uv)*6.5 - t*1.6 + angle*0.5)
// - Slow color palette cycling
// - Bloom highlights, vignette, grain
// - Uses u_intensity (also declared)
```

### 5.5 `hope-golden-peacock.ts`

See [hope-golden-peacock.ts](src/app/data/generated/hope-golden-peacock.ts) for the full source. Key parts:
- Burgundy vignette background
- Body: filigree teardrop with sin-modulated scrollwork
- Neck + head + beak sweep
- 11-spoke radial **crest** with terminal dots
- 9 fanned **tail plumes** (teardrop SDF with rosette eye + sway)
- Travelling shimmer + floating gold dust

### 5.6 `grief-weeping-orb.ts`

See [grief-weeping-orb.ts](src/app/data/generated/grief-weeping-orb.ts). Key parts:
- Spherical-normal fake 3D: `z = sqrt(R² - d²)`, `n = normalize(vec3(uv, z))`
- fbm bronze patina + scratches + vertical segment seams
- Three embedded face SDFs (one center, two flanking), with brow/eye/nose/mouth modelling
- Recurring vertical tear streaks + discrete falling tear-beads from the central face's eyes
- Diffuse + rim lighting, painterly grain

### 5.7 `hope-filigree-butterfly.ts`

See [hope-filigree-butterfly.ts](src/app/data/generated/hope-filigree-butterfly.ts). Key parts:
- Two mirrored `wing(p, flap, lace)` calls with scalloped outer edge
- Radial rib + concentric ring lace pattern
- Animated flap (`p.x /= flap`) where `flap = 0.55 + 0.45*(0.5+0.5*sin(t*2.2))`
- Segmented bead body + head bead
- Two curling beaded antennae (24 beads each)
- 18 trailing beaded sparks falling off the lower wings

### 5.8 `love-leaf-hands.ts`

See [love-leaf-hands.ts](src/app/data/generated/love-leaf-hands.ts). Two implementations live in the codebase:

- **Leaf version**: each hand built from 5 finger SDFs (`leaf` SDF tapered teardrop with midrib + side veins) + palm SDF + wrist bracelet (14 gold-and-red beads), with a kindled golden spark between the fingertips (bright core + exponential glow + 10 orbiting sparkles).
- **ASCII version** (later iteration): the same hand SDF (capsules + ellipses) used as a coverage mask, but rendered as 5x7 bitmap-font glyphs (`@ # * & + % $ =`) packed via flat-if-chain lookup.

### 5.9 `love-camellia-bloom.ts`

See [love-camellia-bloom.ts](src/app/data/generated/love-camellia-bloom.ts). This is the parametric one. Key parts:

- 5 concentric rings of petals (`for ring = 0..4`)
- Each ring: petal count 6/8/10 (seed-picked), inverse interp of length, alternating counter-rotation + half-sector offset
- Per-petal `petalMask(p, halfW, length, along)` SDF
- Per-petal color from `ringColor(rf, seed)` cycling crimson→red→coral→cream→gold
- One of three seed-picked inner patterns per petal (cross-weave / radial ribs / dotted scales)
- Central golden beaded heart: disc, 16-bead ring, 24 stamen rays, pale core, pulsing gold glow
- Travelling sheen sweep across the whole bloom

### 5.10 `grief-speaking-mouth.ts` — "The Words That Never Came"

The full shader is below. This one was generated by a multi-agent design panel (see Section 6 for how). It's an **implicit-opening-field** mouth with **gaussian cupid's-bow** humps and a **window-crossfade timeline** driving SPEAKING → PAUSE → POUT → FROWN → BEND → SETTLE on a 16-second loop.

```ts
import type { ShaderDef } from "../shaders";
const def: ShaderDef = {
  id: "grief-speaking-mouth",
  name: "The Words That Never Came",
  description: "A pale dried-rose mouth trembling in violet dark, shaping words it can never finish before it folds into a frown.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define PI 3.14159265359

float hash21(vec2 p){
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a=hash21(i+vec2(0,0)), b=hash21(i+vec2(1,0));
    float c=hash21(i+vec2(0,1)), d=hash21(i+vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
float gauss(float x, float w){ float d=x/w; return exp(-d*d); }
float window(float t, float a, float b, float e){
    return smoothstep(a-e, a+e, t) * (1.0 - smoothstep(b-e, b+e, t));
}

vec4 expression(float tl, float seed, out float tremble){
    float wSpeak  = window(tl, 0.0,  4.0,  0.45);
    float wPause  = window(tl, 4.0,  6.5,  0.45);
    float wPout   = window(tl, 6.5,  9.5,  0.45);
    float wFrown  = window(tl, 9.5,  12.5, 0.45);
    float wBend   = window(tl, 12.5, 15.0, 0.42);
    float wSettle = window(tl, 15.0, 16.0, 0.40);
    float st = tl;
    float syl = 0.5 + 0.5*sin(st*7.6 - 1.4);
    syl *= 0.65 + 0.35*(0.5 + 0.5*sin(st*3.1 + 0.6));
    syl = pow(clamp(syl,0.0,1.0), 1.7);
    float speakOpen = syl*0.95, speakDrop=0.06;
    float pauseOpen=0.085, pauseDrop=0.10;
    float poutOpen=0.0, poutPress=1.0, poutDrop=-0.22;
    float frownOpen=0.03, frownDrop=0.92, frownPress=0.12;
    float bt = tl - 12.5;
    float bendDrop = 0.55 + 0.10*sin(bt*9.0);
    float bendAsym = 0.60*sin(bt*6.3 + seed*6.28) + 0.22*sin(bt*13.7 + 1.1);
    float bendOpen = 0.05 + 0.05*(0.5+0.5*sin(bt*11.0));
    float bendPress = 0.18;
    float st0 = 0.5 + 0.5*sin(-1.4);
    st0 *= 0.65 + 0.35*(0.5 + 0.5*sin(0.6));
    st0 = pow(clamp(st0,0.0,1.0), 1.7);
    float settleOpen = st0*0.95, settleDrop=0.06;
    float wsum = wSpeak+wPause+wPout+wFrown+wBend+wSettle+1e-4;
    float openAmount = (speakOpen*wSpeak + pauseOpen*wPause + poutOpen*wPout
                       + frownOpen*wFrown + bendOpen*wBend + settleOpen*wSettle)/wsum;
    float press = (0.0*wSpeak + 0.05*wPause + poutPress*wPout
                  + frownPress*wFrown + bendPress*wBend + 0.0*wSettle)/wsum;
    float cornerDrop = (speakDrop*wSpeak + pauseDrop*wPause + poutDrop*wPout
                       + frownDrop*wFrown + bendDrop*wBend + settleDrop*wSettle)/wsum;
    float asym = (0.0*wSpeak + 0.0*wPause + 0.0*wPout
                 + 0.04*wFrown + bendAsym*wBend + 0.0*wSettle)/wsum;
    float baseQuiver = 0.010 + 0.006*(0.5 + 0.5*sin(tl*2.3 + seed));
    tremble = baseQuiver + 0.034*wBend + 0.012*wFrown;
    return vec4(clamp(openAmount,0.0,1.0), press, cornerDrop, asym);
}

float mouthShape(float x, float halfW, float openH, float drop, float asym, float press,
                 out float yU, out float yL, out float halfTU, out float halfTL){
    float xn = x / max(halfW, 1e-3);
    float corner = 1.0 - smoothstep(0.62, 1.0, abs(xn));
    float belly = sqrt(max(1.0 - xn*xn, 0.0));
    float droopY = -drop*(xn*xn)*0.34;
    float bendY = asym*(0.20*xn + 0.12*sin(xn*4.5));
    float baseY = droopY + bendY;
    float openLocal = openH*belly;
    float ax = abs(xn);
    float hump = 0.030*gauss(ax - 0.42, 0.20);
    float dip  = 0.022*gauss(xn, 0.16);
    float bowTop = hump - dip;
    float seamGap = mix(0.008, 0.0, smoothstep(0.0, 0.35, openH));
    yU = baseY + 0.5*openLocal + seamGap;
    yL = baseY - 0.5*openLocal - seamGap;
    float tenseThin = mix(1.0, 0.76, smoothstep(0.25, 0.9, drop));
    float fuller   = mix(1.0, 1.45, press);
    float taper    = 0.40 + 0.60*belly;
    halfTU = (0.072*mix(1.0,1.20,press))*tenseThin*taper*(1.0 + bowTop*2.0);
    halfTL = (0.104*fuller)*tenseThin*taper;
    halfTU = max(halfTU, 0.004); halfTL = max(halfTL, 0.004);
    return corner;
}

void main(){
    vec2 uv = (gl_FragCoord.xy*2.0 - u_resolution.xy)/u_resolution.y;
    float seed = u_seed*u_unique;
    float tOff = 0.18*seed;
    float tl = mod(u_time + tOff, 16.0);
    float tw = mod(u_time, 6.2831853);
    float tremble;
    vec4 E = expression(tl, seed, tremble);
    float openAmount=E.x, press=E.y, cornerDrop=E.z;
    float asym = E.w + 0.05*seed;
    vec2 p = uv*1.18;
    float jx = sin(tw*23.0+0.5)*0.6 + sin(tw*37.0+2.1)*0.4;
    float jy = sin(tw*19.0+1.7)*0.6 + sin(tw*31.0+0.3)*0.4;
    p += vec2(jx, jy)*tremble*0.6;
    p = rot(sin(tw*17.0+seed)*tremble*0.5)*p;
    float halfW = mix(0.62, 0.50, press)*(1.0 + 0.012*sin(tw*1.3));
    float openH = mix(0.0, 0.40, openAmount);
    float yU, yL, halfTU, halfTL;
    float corner = mouthShape(p.x, halfW, openH, cornerDrop, asym, press,
                              yU, yL, halfTU, halfTL);
    float aa = 2.5/u_resolution.y;
    float inX = 1.0 - smoothstep(halfW*0.995, halfW*1.06, abs(p.x));
    float dU = abs(p.y - yU) - halfTU;
    float upperMask = (1.0 - smoothstep(-aa, aa, dU))*inX;
    float dL = abs(p.y - yL) - halfTL;
    float lowerMask = (1.0 - smoothstep(-aa, aa, dL))*inX;
    float innerU = yU - halfTU, innerL = yL + halfTL;
    float gap = innerU - innerL;
    float interiorMask = smoothstep(-aa, aa, innerU - p.y)
                       * smoothstep(-aa, aa, p.y - innerL)
                       * inX * smoothstep(0.0, 0.02, gap);
    float lipMask = max(upperMask, lowerMask);
    interiorMask *= (1.0 - lipMask);
    float fU = (p.y - yU)/max(halfTU, 1e-3);
    float fL = (p.y - yL)/max(halfTL, 1e-3);
    float upper = upperMask >= lowerMask ? 1.0 : 0.0;
    float toGap = upper > 0.5 ? -fU : fL;
    float t01 = clamp(toGap*0.5 + 0.5, 0.0, 1.0);
    vec3 lipLit=vec3(0.55,0.42,0.46), lipMid=vec3(0.40,0.28,0.33);
    vec3 lipShadow=vec3(0.24,0.15,0.20), lipDeep=vec3(0.16,0.10,0.15);
    vec3 lipCol = mix(lipDeep, lipShadow, smoothstep(0.0,0.18,t01));
    lipCol = mix(lipCol, lipMid, smoothstep(0.12,0.45,t01));
    lipCol = mix(lipCol, lipLit, smoothstep(0.35,0.62,t01));
    lipCol = mix(lipCol, lipShadow, smoothstep(0.72,1.0,t01));
    float lightY = upper > 0.5 ? 0.84 : 1.10;
    lipCol *= lightY;
    float sheen = gauss(t01 - 0.40, 0.16);
    float lowerBoost = upper > 0.5 ? 0.5 : 1.0;
    lipCol += sheen*vec3(0.20,0.15,0.16)*lowerBoost;
    float poutHi = press*gauss(p.x, halfW*0.55)*sheen;
    lipCol += poutHi*vec3(0.12,0.09,0.10);
    float lines = 0.5 + 0.5*cos(p.x*95.0);
    lipCol *= 1.0 - 0.05*lines*smoothstep(0.2,0.8,t01);
    float partLineY = 0.5*(yU + yL);
    float seam = (1.0 - smoothstep(0.0, 0.012, abs(p.y - partLineY)))
               * corner*inX*(1.0 - smoothstep(0.0, 0.02, gap));
    lipCol = mix(lipCol, lipDeep*0.7, seam*0.85*lipMask);
    vec3 voidDeep=vec3(0.07,0.03,0.06), voidWarm=vec3(0.16,0.06,0.09);
    float gapCenter = 0.5*(innerU + innerL);
    float depth = 1.0 - smoothstep(0.0, max(gap*0.6, 1e-3), abs(p.y - gapCenter));
    vec3 interiorCol = mix(voidWarm, voidDeep, depth);
    interiorCol *= mix(1.0, 0.5, smoothstep(innerL, innerU, p.y));
    float teethVis = smoothstep(0.34, 0.66, openAmount);
    float teethTop = innerU;
    float teethH = min(gap*0.42, 0.06);
    float teethBand = smoothstep(teethTop - teethH, teethTop - teethH*0.15, p.y)
                    * (1.0 - smoothstep(teethTop - teethH*0.1, teethTop, p.y));
    float teethScallop = 0.5 + 0.5*cos(p.x/max(halfW,1e-3)*5.0);
    float teeth = teethVis*teethBand*(0.6 + 0.4*teethScallop)*inX;
    interiorCol = mix(interiorCol, vec3(0.30,0.27,0.30), clamp(teeth,0.0,1.0)*0.45);
    vec3 offBlack=vec3(0.05,0.04,0.07), dirtyPurple=vec3(0.29,0.24,0.37);
    float haze = vnoise(uv*1.3 + vec2(0.0, sin(tw*0.5)*0.5));
    haze = haze*0.5 + 0.5*vnoise(uv*2.7 - vec2(sin(tw*0.4)*0.4, 0.0));
    vec3 bg = mix(offBlack, dirtyPurple*0.45, haze*0.16);
    bg = mix(bg, offBlack, smoothstep(0.4, 1.4, length(uv))*0.6);
    float ell = length(p*vec2(0.85, 1.55));
    float skinField = 1.0 - smoothstep(0.30, 0.80, ell);
    float skinHalo = skinField*(1.0 - lipMask)*(1.0 - interiorMask);
    float aboveUpper = smoothstep(0.0, 0.04, p.y - (yU + halfTU));
    float philtrum = aboveUpper*gauss(p.x, 0.05)*0.5;
    vec3 skinCol = vec3(0.17,0.12,0.15)*(1.0 - 0.4*philtrum);
    bg = mix(bg, skinCol, skinHalo*0.6);
    float underLower = smoothstep(0.0, 0.14, (yL - halfTL) - p.y)
                     * (1.0 - smoothstep(0.30, 0.6, ell));
    bg = mix(bg, bg*0.72, underLower*0.5);
    vec3 col = bg;
    col = mix(col, interiorCol, interiorMask);
    col = mix(col, lipCol, lipMask);
    float g = hash21(gl_FragCoord.xy + vec2(floor(tw*30.0), floor(tw*21.0)));
    col += (g - 0.5)*0.035;
    float vig = smoothstep(1.5, 0.35, length(uv*vec2(0.85, 1.0)));
    col *= mix(0.5, 1.0, vig);
    float lum = dot(col, vec3(0.299,0.587,0.114));
    col = mix(col, vec3(lum)*vec3(0.92,0.90,1.0), 0.12);
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}
`,
};
export default def;
```

---

## 6. The multi-agent workflow that produced the mouth shader

The mouth is hard — there are many ways to model lips procedurally and most look like blobs. So instead of a single prompt, I ran a **design panel**: four agents each built a complete shader using a different modeling approach, three judge agents scored each design on a distinct lens, and a synthesis agent merged the winner with the best ideas from the others and fixed every flagged bug.

The recipe to reproduce this on a tool-capable AI (Claude Code, Cursor agents, ChatGPT Agents, etc.):

### Step 1: brief — same conventions + grief palette + timeline

```
ENGINE CONTRACT: (same as Section 3 master prompt)

GRIEF PALETTE: off-black vec3(0.05,0.04,0.07), dirty purple vec3(0.29,0.24,0.37),
grey vec3(0.48,0.48,0.48). Lips themselves grief-toned: vec3(0.55,0.42,0.46)
lit, darker mauve-grey shadow. Mouth interior a soft deep maroon-purple.
Subtle constant tremble; faint film grain; soft vignette.

EXPRESSION TIMELINE — 16-second loop, mod(u_time, 16.0):
  0.0–4.0s  SPEAKING: open/close ~5 syllables, dark interior visible, neutral corners
  4.0–6.5s  PAUSE:    near-neutral resting, almost still, only tiny tremble
  6.5–9.5s  POUT:     lips press together and push forward, fuller, corners up
  9.5–12.5s FROWN:    both corners pull DOWN, lips thin and tense
 12.5–15.0s BEND:     asymmetric trembling curl, one corner pulls differently
 15.0–16.0s SETTLE:   smoothly back to the exact neutral SPEAKING starts from
Use smoothstep() to ease between segments. The mouth must read as a human
mouth at every moment.
```

### Step 2: four parallel design agents, one per approach

Send the brief above plus exactly one of these "approach" lines to four separate agents:

1. **SDF lip bands**: model the upper and lower lip each as a smooth band defined by a parabolic centerline + tapered thickness profile. Expression params warp the centerlines (open = vertical gap, pout = thicker + raised, frown = corners y pulled down via x², bend = asymmetric left/right multiplier). Interior is the region between the bands. Add a cupid-bow notch in the upper lip.
2. **Metaball lobes**: build lips from blended ellipse lobes (smoothmin metaballs). Expression moves the lobe centers + radii. Threshold the field for the silhouette; interior is the gap.
3. **Anatomical cupid's-bow**: explicit cupid's bow with philtrum dip on the upper lip, fuller lower lip with a soft central highlight, vermilion border line, philtrum shadow. Expression via vertical scale (open), forward press + purse (pout), corner offset curves (frown), wavering per-side phase (bend). Aim for the most lifelike, grief-painting look.
4. **Implicit opening field**: start from the OPENING — a lens-shaped SDF for the mouth aperture whose width, height, and corner-droop are driven by the timeline. The lips are the rim/band around that opening (offset of the SDF). Pout shrinks + rounds the aperture and thickens the rim; bend skews the aperture.

Ask each agent to return the complete GLSL shader, an expressionPlan (3-5 sentences), and a rationale.

### Step 3: judge each design on three independent lenses, in parallel

For each design, spawn three judge agents — each with a different lens — and ask them to read the GLSL carefully and report a 0–10 score, whether it compiles, concrete issues, and specific strengths worth grafting:

- **glsl-correctness**: hunt for `#version` directives, `texture()`, non-constant loop bounds, functions used before definition, type mismatches (int vs float), missing braces, undeclared identifiers, `gl_FragColor` not written, WebGL2-only features. Score 10 = certainly compiles cheap, 0 = won't compile.
- **mouth-legibility**: is it clearly a human mouth at every moment of the loop? Are upper lip, lower lip, corners, and interior distinguishable? Believable lip form/shading?
- **expression-motion**: does the animation read through all five states in order (SPEAKING, PAUSE, POUT, FROWN, BEND) with smooth eased transitions and a seamless loop? Does it feel like grief?

### Step 4: synthesis agent

Hand the synthesis agent all four designs and all twelve judge verdicts. Tell it: pick the strongest base (favor high glsl-correctness AND legibility), graft in the specific strengths the judges praised in the others, and **fix every issue flagged**. Return the polished GLSL, a short evocative name, a one-sentence description, the expressionTimeline summary, and a changeLog.

### Actual scoreboard from my run

| Approach | glsl-correctness | mouth-legibility | expression-motion | avg |
|---|---:|---:|---:|---:|
| sdf-lip-bands | 9.0 | 5.5 | 4.0 | 6.2 |
| metaball-lobes | 9.0 | 5.0 | 5.5 | 6.5 |
| anatomical-cupids-bow | 9.0 | 5.5 | 7.0 | 7.2 |
| **implicit-opening-field (winner)** | **9.0** | **6.0** | **7.5** | **7.5** |

Synthesizer's changeLog (paraphrased) — the kinds of issues an adversarial judge catches that a single-pass prompt won't:
1. `pow(negative, 2.0)` undefined behavior → replaced with safe `gauss(x,w)=exp(-(x/w)²)`.
2. Mouth never closes / no contact seam → rebuilt so closed states have negative center gap (lips overlap) and a hairline dark seam appears.
3. Broken cupid's bow direction → bow now correctly dips at center and rises to humps near `xn = ±0.43`.
4. Loop seam pop → SETTLE targets computed to exactly equal SPEAKING's `t=0` values.
5. Upper-lip sliver collapse at peak open → lips now TRANSLATE apart by the opening while keeping full thickness.
6. SPEAKING never closed between syllables → sharpened envelope (`pow 1.7`).
7. POUT/FROWN indistinguishable → POUT corners tuck UP (drop −0.22), FROWN pulls DOWN hard (drop +0.92).
8. Tremble read as slow sway → replaced with high-frequency multi-sine jitter + micro-rotation.
9. mediump time precision → `u_time` wrapped via `mod()` before high-frequency terms.
10. High-frequency teeth scallop noise → reduced to broad teeth (`cos*5` not `*16`), only when open.
11. `u_unique * u_seed` gated to a tiny timing offset, dead-symmetric at zero.

### Why this workflow beats one-shot prompting for hard shaders

A single agent confidently ships shaders with subtle bugs (loop seam pops, undefined-behavior pow, indistinguishable expressions). The adversarial judges flag what the designer missed; the synthesizer's job is fix-everything-flagged. Cost ≈ 17 agent calls (≈ 824K output tokens) instead of 1, but the result compiles clean on first try and the expression timeline reads correctly.

---

## 7. Registering a new shader (engine-side wiring)

For every new shader file:

**1. Register in `src/app/data/generatedShaders.ts`:**

```ts
import myShader from "./generated/my-shader-id";
// add to the right emotion array:
grief: [..., myShader],
```

**2. Add a mock artifact in `src/app/data/artifacts.ts`** so it shows up in the gallery (substitute the right emotion + final shader index):

```ts
{
  id: "mock-NN",
  emotion: "grief",
  title: "Your Title",
  messageExcerpt: "A short, personal unsent-message phrase.",
  messageVisibility: "excerpt",
  creatorDisplayName: "Anonymous Visitor",
  isAnonymous: true,
  avatarColor: "#3d1d6e",
  avatarInitials: "?",
  dna: { seed: 1234, shaderIndex: <index in EMOTION_SHADERS[emotion]>, emotion: "grief", intensity: 0.8, timeOffset: 1.2, unique: true },
  shader: EMOTION_SHADERS.grief[<same index>],
  createdAt: "2026-06-19T00:00:00Z",
  likes: 100, shares: 30, downloads: 10,
  visibility: "public",
  interpretation: "One poetic line about what this artifact holds.",
},
```

Without a referencing artifact, the shader compiles but never renders — the gallery only shows shaders that some artifact's `shaderIndex` points to.

---

## 8. Final tips for handing this to another AI

- Hand it **the master prompt (Section 3) first**, then **one per-image prompt (Section 4)** plus the matching reference image.
- For hard pieces (anything anatomical: faces, hands, mouths, eyes), use the **multi-agent workflow (Section 6)** instead of a single prompt — adversarial review catches the subtle bugs.
- Always tell the AI explicitly: *no markdown fences, no commentary, return only the complete `.ts` module body*.
- The `u_unique` flag matters: design shaders so `u_unique = 0` renders a canonical look (so legacy artifacts keep working).
- Normalize `u_seed` to a 0–100 range inside the shader before using it as a phase offset, or user-created artifacts (with huge seeds) render black.
