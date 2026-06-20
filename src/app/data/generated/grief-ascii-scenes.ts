import type { ShaderDef } from "../shaders";

// 16-scene ASCII grief uber-shader. The screen is divided into a coarse
// character grid; each cell is filled with a glyph chosen from the scene's
// SDF intensity at that location. Scenes are selected by the field gene.
//
// Glyph levels (low to high intensity):
//   0: blank
//   1: small dot           .
//   2: colon / two dots    :
//   3: plus / cross        +
//   4: filled diamond / x  *
//   5: hash grid           #
//   6: solid block         @
//
//   field   : crying-face | weeping-eye | faceless | alone | rain | broken-heart
//             empty-chair | wilted-bouquet | melting-candle | hidden-moon
//             grief-mask | covering-face | window-watcher | tear-river
//             shattered-glasses | spiral-void
//   palette : mono | matrix | crimson | indigo | amber | rose
//   density : sparse | medium | dense    (cell size: 16 | 12 | 9 px)
//   tempo   : calm | quick | racing      (animation speed)
//   grain   : clean | faint | strong     (background dust)

const def: ShaderDef = {
  id: "grief-ascii-scenes",
  name: "ASCII Grief",
  description: "Sixteen ASCII tableaux of grief, each rendered as a coarse character grid with seed-driven palette, density, tempo, and grain.",
  glsl: `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_seed;
uniform float u_unique;

#define TAU 6.28318530718
#define PI  3.14159265359

float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash21(vec2 p){ vec3 q=fract(vec3(p.xyx)*0.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }

float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    float a=hash21(i), b=hash21(i+vec2(1.0,0.0));
    float c=hash21(i+vec2(0.0,1.0)), d=hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
    float v=0.0, a=0.5;
    for(int i=0;i<4;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; }
    return v;
}

float gene(float salt, float n){
    return floor(hash11(u_seed*7.13 + salt*17.93) * n);
}

mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }

// ─────────────────────────────────────────────────────────────────────────────
// Glyph SDFs — each takes the in-cell coords (-0.5..0.5) and returns 0..1 fill.
// Drawn slightly under-sized so adjacent cells visually separate.
// ─────────────────────────────────────────────────────────────────────────────

float glyphDot(vec2 p){
    return smoothstep(0.16, 0.10, length(p));
}
float glyphColon(vec2 p){
    float top = smoothstep(0.13, 0.07, length(p - vec2(0.0, 0.16)));
    float bot = smoothstep(0.13, 0.07, length(p - vec2(0.0,-0.16)));
    return max(top, bot);
}
float glyphPlus(vec2 p){
    float h = smoothstep(0.10, 0.06, abs(p.y)) * smoothstep(0.28, 0.22, abs(p.x));
    float v = smoothstep(0.10, 0.06, abs(p.x)) * smoothstep(0.28, 0.22, abs(p.y));
    return max(h, v);
}
float glyphStar(vec2 p){
    // an asterisk-like glyph: 3 rotated bars
    float v = 0.0;
    for(float k=0.0;k<3.0;k++){
        vec2 q = rot(k * PI / 3.0) * p;
        v = max(v, smoothstep(0.08, 0.04, abs(q.y)) * smoothstep(0.30, 0.22, abs(q.x)));
    }
    return v;
}
float glyphHash(vec2 p){
    // a # made of 4 lines
    float v1 = smoothstep(0.06, 0.03, abs(p.x - 0.10));
    float v2 = smoothstep(0.06, 0.03, abs(p.x + 0.10));
    float h1 = smoothstep(0.06, 0.03, abs(p.y - 0.10));
    float h2 = smoothstep(0.06, 0.03, abs(p.y + 0.10));
    float bounded = step(abs(p.x), 0.32) * step(abs(p.y), 0.32);
    return max(max(v1, v2), max(h1, h2)) * bounded;
}
float glyphBlock(vec2 p){
    return step(abs(p.x), 0.36) * step(abs(p.y), 0.36);
}

float drawGlyph(int level, vec2 p){
    if (level <= 0) return 0.0;
    if (level == 1) return glyphDot(p) * 0.65;
    if (level == 2) return glyphColon(p) * 0.75;
    if (level == 3) return glyphPlus(p) * 0.85;
    if (level == 4) return glyphStar(p) * 0.90;
    if (level == 5) return glyphHash(p) * 0.95;
    return glyphBlock(p);
}

// Quantize a 0..1 intensity to 0..6 glyph level. The thresholds are tuned so
// most cells land at 1-3 (sparse field) and only the brightest hit 5-6 (solid).
int intensityToLevel(float v){
    v = clamp(v, 0.0, 1.0);
    if (v < 0.06) return 0;
    if (v < 0.20) return 1;
    if (v < 0.35) return 2;
    if (v < 0.50) return 3;
    if (v < 0.68) return 4;
    if (v < 0.85) return 5;
    return 6;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenes — each returns a 0..1 intensity field at point p (uv in [-1,1] roughly).
// p.y is upward; the SDFs are sized for a normalized canvas with the resolution
// scaled by character grid before the call (so motifs read at the cell level).
// ─────────────────────────────────────────────────────────────────────────────

// 01 - crying face: round head, eye lines, downturned mouth, falling tear streaks
float scene_cryingFace(vec2 p, float t){
    p.y -= 0.05;
    float head = smoothstep(0.62, 0.55, length(p * vec2(1.05, 0.95)));
    // eyes
    float eyeL = smoothstep(0.05, 0.0, length(p - vec2(-0.16, 0.10)));
    float eyeR = smoothstep(0.05, 0.0, length(p - vec2( 0.16, 0.10)));
    float eyes = max(eyeL, eyeR);
    // mouth: downturned arc
    float my = p.y + 0.20 + 0.05 * (p.x * p.x);
    float mouth = smoothstep(0.04, 0.0, abs(my)) * step(abs(p.x), 0.22);
    // tears falling from each eye
    float tearL = smoothstep(0.03, 0.0, abs(p.x + 0.16)) * smoothstep(-0.30, 0.10, p.y) * smoothstep(0.15, 0.10, mod(p.y * 8.0 + t * 2.0, 0.30));
    float tearR = smoothstep(0.03, 0.0, abs(p.x - 0.16)) * smoothstep(-0.30, 0.10, p.y) * smoothstep(0.15, 0.10, mod(p.y * 8.0 + t * 2.0 + 0.5, 0.30));
    return clamp(head * 0.45 + eyes * 0.9 + mouth * 0.7 + tearL * 0.8 + tearR * 0.8, 0.0, 1.0);
}

// 02 - weeping eye: large almond eye + heavy iris + falling streaks of numbers
float scene_weepingEye(vec2 p, float t){
    p.y += 0.02;
    // almond outer envelope
    float d = abs(p.y) - sqrt(max(0.0, 0.20 - p.x * p.x * 0.30));
    float eye = smoothstep(0.04, 0.0, d) * step(abs(p.x), 0.55);
    // iris
    float iris = smoothstep(0.14, 0.08, length(p));
    float pupil = smoothstep(0.06, 0.0, length(p));
    // tear streaks below the eye
    float streak = 0.0;
    if (p.y < -0.05) {
        float c = floor(p.x * 8.0 + 0.5) / 8.0;
        float trail = smoothstep(0.020, 0.0, abs(p.x - c)) *
                      smoothstep(-0.8, -0.1, p.y) *
                      (0.5 + 0.5 * sin(p.y * 14.0 - t * 4.0 + c * 17.0));
        streak = trail;
    }
    return clamp(eye * 0.55 + iris * 0.75 + pupil * 1.0 + streak * 0.9, 0.0, 1.0);
}

// 03 - faceless: bust silhouette, head + shoulders, hollow center
float scene_faceless(vec2 p, float t){
    float head = smoothstep(0.30, 0.27, length((p - vec2(0.0, 0.25)) * vec2(1.0, 1.15)));
    // shoulders: lower curve
    float sy = p.y + 0.05;
    float shoulder = smoothstep(0.05, 0.0, abs(sy - 0.05 * cos(p.x * 3.0))) * step(abs(p.x), 0.60) * step(sy, 0.15);
    // outline only - hollow head
    float headOutline = smoothstep(0.030, 0.0, abs(length((p - vec2(0.0, 0.25)) * vec2(1.0, 1.15)) - 0.28));
    float pulse = 0.85 + 0.15 * sin(t * 0.8);
    return clamp((headOutline * 0.9 + shoulder * 0.7) * pulse, 0.0, 1.0);
}

// 04 - alone: a single small figure in the void
float scene_alone(vec2 p, float t){
    p.y -= 0.05;
    // tiny figure: head + body
    float head = smoothstep(0.04, 0.0, length(p - vec2(0.0, 0.07)));
    float body = smoothstep(0.02, 0.0, abs(p.x)) * smoothstep(0.0, 0.10, -p.y) * smoothstep(-0.18, -0.08, p.y);
    // sparse stars - slow drift so they don't twinkle every frame
    vec2 cellId = floor(p * 8.0);
    float starSeed = floor(t * 0.5);
    float star = step(0.96, hash21(cellId + starSeed)) * smoothstep(0.06, 0.0, length(fract(p * 8.0) - 0.5));
    return clamp(head * 0.9 + body * 0.8 + star * 0.5, 0.0, 1.0);
}

// 05 - rain of sorrow: matrix-style falling glyphs + small figure below
float scene_rainOfSorrow(vec2 p, float t){
    // vertical falling streaks
    float colWidth = 0.10;
    float col = floor(p.x / colWidth);
    float colSpeed = 0.6 + 0.4 * hash11(col * 7.1);
    float fall = mod(p.y + t * colSpeed + hash11(col) * 2.0, 2.0) - 1.0;
    float streak = smoothstep(0.02, 0.0, abs(p.x - col * colWidth - colWidth * 0.5)) *
                   smoothstep(0.7, -0.3, fall) *
                   (0.5 + 0.5 * sin(p.y * 30.0 + t * 5.0 + col));
    // tiny figure at the bottom
    float fig = smoothstep(0.04, 0.0, length(p - vec2(0.0, -0.55)));
    fig = max(fig, smoothstep(0.04, 0.0, length(p - vec2(0.04, -0.62))));
    fig = max(fig, smoothstep(0.04, 0.0, length(p - vec2(-0.04, -0.62))));
    return clamp(streak * 0.9 + fig * 0.95, 0.0, 1.0);
}

// 06 - broken heart: heart curve with jagged crack down the middle
float scene_brokenHeart(vec2 p, float t){
    p.y += 0.05;
    // parametric heart inequality
    float x = p.x * 1.1;
    float y = p.y * 1.1;
    float h = pow(x*x + y*y - 0.20, 3.0) - x*x * y*y*y;
    float fill = smoothstep(0.02, -0.02, h);
    // crack: zigzag down center
    float cx = 0.0;
    float zigzag = 0.012 * sin(p.y * 20.0 + sin(p.y * 5.0));
    float crack = smoothstep(0.025, 0.0, abs(p.x - zigzag)) * fill;
    // pulsate
    fill *= 0.7 + 0.15 * sin(t * 1.5);
    return clamp(fill * 0.85 - crack * 0.9, 0.0, 1.0);
}

// 07 - empty chair under a lamp
float scene_emptyChair(vec2 p, float t){
    // lamp cord top
    float cord = smoothstep(0.010, 0.0, abs(p.x)) * step(p.y, 0.85) * step(0.55, p.y);
    // lamp shade trapezoid
    float ly = p.y - 0.48;
    float lampW = mix(0.04, 0.12, smoothstep(0.07, 0.0, ly));
    float lamp = step(abs(p.x), lampW) * step(abs(ly), 0.07);
    // pool of light below the lamp
    float light = exp(-pow(p.x, 2.0) * 12.0) * smoothstep(-0.5, 0.4, p.y) * 0.4;
    // chair: seat horizontal bar + back vertical bars + 4 legs
    float seatY = -0.22;
    float seat = step(abs(p.y - seatY), 0.025) * step(abs(p.x), 0.18);
    float back = step(abs(p.x), 0.16) * step(abs(p.y - seatY + 0.08), 0.18) *
                 (step(0.03, abs(mod(p.x + 0.20, 0.07) - 0.035)));
    float legL = step(abs(p.x + 0.13), 0.012) * step(p.y, seatY) * step(-0.55, p.y);
    float legR = step(abs(p.x - 0.13), 0.012) * step(p.y, seatY) * step(-0.55, p.y);
    return clamp(cord * 0.9 + lamp * 0.85 + light + (seat + back + legL + legR) * 0.9, 0.0, 1.0);
}

// 08 - wilted bouquet: drooping stems with hanging blooms
float scene_wiltedBouquet(vec2 p, float t){
    p.y -= 0.05;
    float v = 0.0;
    for (float k = 0.0; k < 5.0; k++) {
        float kf = k - 2.0;
        // arched stem: drooping curve, peaks higher near center
        float stemTopX = kf * 0.10;
        float archHeight = 0.35 - abs(kf) * 0.05;
        // parametric arch from base to bloom: x along, y curves up then drops
        float along = clamp((p.y + 0.55) / 0.9, 0.0, 1.0);
        float archX = mix(0.0, stemTopX, along) + 0.10 * sin(along * PI) * sign(kf + 0.1);
        float archY = -0.55 + along * 0.9 - sin(along * PI) * archHeight;
        float stem = smoothstep(0.015, 0.0, abs(p.x - archX)) * smoothstep(0.05, 0.0, abs(p.y - archY));
        // bloom at the tip (top of arc)
        vec2 tipPos = vec2(mix(0.0, stemTopX, 1.0) + 0.10 * sin(PI) * sign(kf + 0.1),
                           -0.55 + 0.9 - sin(PI) * archHeight);
        // adjust tip Y to be where stem ends (around top of arc); approximate:
        tipPos = vec2(stemTopX + 0.10 * sign(kf + 0.1), -0.55 + 0.9 - archHeight);
        float bloom = smoothstep(0.07, 0.04, length(p - tipPos));
        v = max(v, max(stem * 0.75, bloom * 0.95));
    }
    // sway a bit
    v *= 0.85 + 0.15 * sin(t * 0.6);
    return clamp(v, 0.0, 1.0);
}

// 09 - melting candle: flame + cylindrical body + drips
float scene_meltingCandle(vec2 p, float t){
    // flame at top
    float flameY = p.y - 0.42;
    float flameW = 0.05 * exp(-flameY * 8.0);
    float flame = step(abs(p.x), flameW) * step(0.0, flameY) * step(flameY, 0.18);
    flame *= 0.7 + 0.3 * sin(t * 9.0 + p.y * 10.0);
    // wick
    float wick = step(abs(p.x), 0.008) * step(0.36, p.y) * step(p.y, 0.44);
    // candle body
    float body = step(abs(p.x), 0.10) * step(-0.50, p.y) * step(p.y, 0.36);
    // wax drips along the sides
    float dripL = step(abs(p.x + 0.095 - 0.015 * sin(p.y * 14.0 + t)), 0.012) * step(-0.50, p.y) * step(p.y, 0.30);
    float dripR = step(abs(p.x - 0.095 + 0.015 * sin(p.y * 14.0 - t)), 0.012) * step(-0.50, p.y) * step(p.y, 0.30);
    // pooled wax at the base
    float pool = smoothstep(0.04, 0.0, abs(p.y + 0.52)) * step(abs(p.x), 0.30) * smoothstep(0.30, 0.0, abs(p.x));
    return clamp(flame * 1.0 + wick * 0.8 + body * 0.7 + dripL * 0.9 + dripR * 0.9 + pool * 0.75, 0.0, 1.0);
}

// 10 - hidden moon: full moon partly veiled behind cloud ridges
float scene_hiddenMoon(vec2 p, float t){
    // moon disc
    float moon = smoothstep(0.32, 0.30, length(p - vec2(0.0, 0.10)));
    // moon surface detail (mottling)
    float crater = fbm(p * 6.0 + 17.0) * 0.4 * smoothstep(0.32, 0.20, length(p - vec2(0.0, 0.10)));
    // cloud ridges across the bottom
    float cy = p.y + 0.10;
    float ridge = 0.10 + 0.06 * sin(p.x * 4.0 + t * 0.4) + 0.04 * sin(p.x * 9.0 - t * 0.3);
    float cloud = smoothstep(0.10, -0.05, cy - ridge) * smoothstep(-0.40, -0.05, cy);
    // moon hidden where cloud is opaque
    moon *= 1.0 - cloud * 0.85;
    return clamp(moon * 0.85 + crater * 0.6 + cloud * 0.75, 0.0, 1.0);
}

// 11 - grief mask: face with closed downturned eyes
float scene_griefMask(vec2 p, float t){
    p.y -= 0.05;
    // mask outline (oval)
    float ov = length(p * vec2(1.05, 0.92));
    float outline = smoothstep(0.030, 0.0, abs(ov - 0.55)) * step(p.y, 0.50);
    // closed downturned eyes
    float eyeY = 0.10;
    float lyL = p.y - eyeY + 0.04 * (p.x + 0.20);
    float lyR = p.y - eyeY - 0.04 * (p.x - 0.20);
    float eyeL = smoothstep(0.020, 0.0, abs(lyL)) * step(abs(p.x + 0.20), 0.10);
    float eyeR = smoothstep(0.020, 0.0, abs(lyR)) * step(abs(p.x - 0.20), 0.10);
    // nose: short vertical line
    float nose = smoothstep(0.010, 0.0, abs(p.x)) * step(abs(p.y + 0.05), 0.08);
    // mouth: downturned wider arc
    float my = p.y + 0.25 + 0.08 * (p.x * p.x * 2.0);
    float mouth = smoothstep(0.025, 0.0, abs(my)) * step(abs(p.x), 0.18);
    // cheek shading (faint stippling around outside)
    float cheek = fbm(p * 4.0) * smoothstep(0.55, 0.30, ov) * 0.4;
    return clamp(outline * 0.75 + eyeL * 0.95 + eyeR * 0.95 + nose * 0.85 + mouth * 0.95 + cheek * 0.55, 0.0, 1.0);
}

// 12 - covering face: figure with raised hands hiding eyes
float scene_coveringFace(vec2 p, float t){
    p.y -= 0.10;
    // head
    float head = smoothstep(0.27, 0.24, length(p));
    // raised arms: two diagonals from shoulders up to face
    float armL = smoothstep(0.030, 0.0, abs((p.x + 0.30) * 1.0 + (p.y - 0.10) * 1.2)) * step(p.y, 0.10) * step(-0.20, p.y);
    float armR = smoothstep(0.030, 0.0, abs((p.x - 0.30) * 1.0 - (p.y - 0.10) * 1.2)) * step(p.y, 0.10) * step(-0.20, p.y);
    // hands covering face
    float handL = smoothstep(0.12, 0.08, length(p - vec2(-0.07, 0.10)));
    float handR = smoothstep(0.12, 0.08, length(p - vec2( 0.07, 0.10)));
    // shoulders
    float sh = smoothstep(0.030, 0.0, abs(p.y + 0.35 + 0.10 * abs(p.x))) * step(abs(p.x), 0.40);
    return clamp(head * 0.55 + (armL + armR) * 0.85 + (handL + handR) * 0.95 + sh * 0.75, 0.0, 1.0);
}

// 13 - window watcher: silhouette inside a window frame
float scene_windowWatcher(vec2 p, float t){
    // window frame
    float frameOuter = step(abs(p.x), 0.55) * step(abs(p.y), 0.55);
    float frameInner = step(abs(p.x), 0.50) * step(abs(p.y), 0.50);
    float frame = frameOuter - frameInner;
    // cross mullion
    float mullV = step(abs(p.x), 0.020) * frameInner;
    float mullH = step(abs(p.y - 0.05), 0.020) * frameInner;
    // panes - faint stippling (rain dots on glass)
    float panes = frameInner * (0.10 + 0.20 * fbm(p * 10.0 + vec2(0.0, t * 0.5)));
    // silhouette in lower half
    float head = smoothstep(0.10, 0.07, length(p - vec2(0.0, -0.05)));
    float body = step(abs(p.x), 0.18) * step(p.y, -0.10) * step(-0.45, p.y);
    return clamp(frame * 0.9 + (mullV + mullH) * 0.85 + panes * 0.55 + head * 0.85 + body * 0.80, 0.0, 1.0);
}

// 14 - tear river: many narrow falling streaks
float scene_tearRiver(vec2 p, float t){
    float v = 0.0;
    for (float k = 0.0; k < 9.0; k++) {
        float xpos = (k / 8.0 - 0.5) * 1.2;
        float speed = 1.0 + 0.5 * hash11(k * 5.7);
        float phase = hash11(k * 11.3) * 2.0;
        float ypos = mod(p.y + t * speed + phase, 1.4) - 0.7;
        float streak = smoothstep(0.020, 0.0, abs(p.x - xpos)) *
                       smoothstep(0.40, -0.20, ypos) *
                       smoothstep(-0.50, -0.10, ypos);
        v = max(v, streak);
    }
    return clamp(v, 0.0, 1.0);
}

// 15 - shattered glasses: two circles + cracks radiating outward
float scene_shatteredGlasses(vec2 p, float t){
    // left lens
    float dL = length(p - vec2(-0.20, 0.0));
    float lensL = smoothstep(0.030, 0.0, abs(dL - 0.18));
    // right lens
    float dR = length(p - vec2(0.20, 0.0));
    float lensR = smoothstep(0.030, 0.0, abs(dR - 0.18));
    // bridge
    float bridge = step(abs(p.y), 0.012) * step(abs(p.x), 0.08);
    // cracks radiating outward through both lenses
    float crackL = 0.0;
    for (float k = 0.0; k < 4.0; k++) {
        float ang = k * 1.4 + 0.4;
        vec2 q = rot(ang) * (p - vec2(-0.20, 0.0));
        crackL = max(crackL, smoothstep(0.015, 0.0, abs(q.y) + 0.05 * sin(q.x * 18.0)) * step(0.02, abs(q.x)) * step(abs(q.x), 0.36));
    }
    float crackR = 0.0;
    for (float k = 0.0; k < 4.0; k++) {
        float ang = k * 1.4 + 0.9;
        vec2 q = rot(ang) * (p - vec2(0.20, 0.0));
        crackR = max(crackR, smoothstep(0.015, 0.0, abs(q.y) + 0.05 * sin(q.x * 18.0)) * step(0.02, abs(q.x)) * step(abs(q.x), 0.36));
    }
    return clamp(lensL * 0.95 + lensR * 0.95 + bridge * 0.85 + (crackL + crackR) * 0.8, 0.0, 1.0);
}

// 16 - spiral void: descending concentric rings, dark center
float scene_spiralVoid(vec2 p, float t){
    float r = length(p) + 0.01;
    float a = atan(p.y, p.x);
    // spiraled rings
    float spiral = 0.5 + 0.5 * sin(r * 24.0 - t * 3.0 + a * 4.0);
    spiral = pow(spiral, 1.8);
    float falloff = exp(-r * 0.8);
    float hole = smoothstep(0.08, 0.20, r);
    return clamp(spiral * falloff * hole * 1.2, 0.0, 1.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Palettes
// ─────────────────────────────────────────────────────────────────────────────
vec3 palette(int p){
    if (p == 0) return vec3(0.92, 0.92, 0.95);   // mono white
    if (p == 1) return vec3(0.30, 0.92, 0.55);   // matrix green
    if (p == 2) return vec3(0.95, 0.30, 0.32);   // crimson
    if (p == 3) return vec3(0.42, 0.62, 0.96);   // indigo / sky
    if (p == 4) return vec3(0.95, 0.78, 0.32);   // amber
    return vec3(0.95, 0.55, 0.72);                // rose
}

void main(){
    vec2 fragCoord = gl_FragCoord.xy;
    float sd = u_seed * u_unique;

    // ---- decode genes ----
    int gScene   = int(mix(0.0, gene(1.0, 16.0), u_unique));
    int gPalette = int(mix(0.0, gene(2.0, 6.0), u_unique));
    int gDensity = int(mix(0.0, gene(3.0, 3.0), u_unique));
    int gTempo   = int(mix(0.0, gene(4.0, 3.0), u_unique));
    int gGrain   = int(mix(0.0, gene(5.0, 3.0), u_unique));

    // ---- character grid size (px per cell) ----
    float cellPx = 12.0;
    if (gDensity == 0) cellPx = 16.0;       // sparse
    else if (gDensity == 2) cellPx = 9.0;   // dense

    // ---- time tempo ----
    float tempoMul = 1.0;
    if (gTempo == 1) tempoMul = 1.6;
    else if (gTempo == 2) tempoMul = 2.4;
    // Bumped u_time multiplier so animation is clearly visible vs. the slower
    // multipliers in the emotion ubers.
    float t = u_time * tempoMul * 0.6;

    // ---- find the cell this pixel falls in ----
    vec2 cell = floor(fragCoord / cellPx);
    vec2 cellCenter = (cell + 0.5) * cellPx;
    vec2 cellCenterUV = (cellCenter * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 inCell = (fragCoord - cellCenter) / cellPx;  // -0.5..0.5

    // ---- run scene SDF at cell center ----
    float intensity = 0.0;
    if      (gScene == 0)  intensity = scene_cryingFace(cellCenterUV, t);
    else if (gScene == 1)  intensity = scene_weepingEye(cellCenterUV, t);
    else if (gScene == 2)  intensity = scene_faceless(cellCenterUV, t);
    else if (gScene == 3)  intensity = scene_alone(cellCenterUV, t);
    else if (gScene == 4)  intensity = scene_rainOfSorrow(cellCenterUV, t);
    else if (gScene == 5)  intensity = scene_brokenHeart(cellCenterUV, t);
    else if (gScene == 6)  intensity = scene_emptyChair(cellCenterUV, t);
    else if (gScene == 7)  intensity = scene_wiltedBouquet(cellCenterUV, t);
    else if (gScene == 8)  intensity = scene_meltingCandle(cellCenterUV, t);
    else if (gScene == 9)  intensity = scene_hiddenMoon(cellCenterUV, t);
    else if (gScene == 10) intensity = scene_griefMask(cellCenterUV, t);
    else if (gScene == 11) intensity = scene_coveringFace(cellCenterUV, t);
    else if (gScene == 12) intensity = scene_windowWatcher(cellCenterUV, t);
    else if (gScene == 13) intensity = scene_tearRiver(cellCenterUV, t);
    else if (gScene == 14) intensity = scene_shatteredGlasses(cellCenterUV, t);
    else                   intensity = scene_spiralVoid(cellCenterUV, t);

    // ---- pick glyph level from intensity ----
    int level = intensityToLevel(intensity);

    // ---- draw the glyph inside this cell ----
    float fill = drawGlyph(level, inCell);

    // ---- background grain (per-cell hash for stable static, plus optional drift) ----
    float grainAmt = 0.0;
    if (gGrain == 1) grainAmt = 0.10;
    else if (gGrain == 2) grainAmt = 0.22;
    float bgNoise = (hash21(cell + floor(t * 1.5)) - 0.5) * grainAmt;
    int bgLevel = (bgNoise > 0.08) ? 1 : 0;
    float bgFill = drawGlyph(bgLevel, inCell) * 0.35;

    // ---- compose ----
    vec3 fg = palette(gPalette);
    vec3 col = vec3(0.0);
    col = mix(col, fg * 0.40, bgFill);
    col = mix(col, fg, fill);

    // Soft vignette so the dark border isn't completely flat.
    col *= smoothstep(1.75, 0.50, length((fragCoord * 2.0 - u_resolution.xy) / u_resolution.y));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,
};

export default def;
