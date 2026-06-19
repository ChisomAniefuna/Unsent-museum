import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import maskImageSrc from "../../imports/masked-face.webp";

// ─── Aurora palette ────────────────────────────────────────────────────────────
const AURORA: [number, number, number][] = [
  [16, 18, 31],  // deep void
  [42, 61, 91],  // dark ocean
  [63, 142, 181], // mid blue
  [72, 195, 225], // cyan
  [238, 231, 212], // ivory
  [191, 34, 64],  // burgundy
  [72, 8,  22],  // deep crimson
];

const FLUID = {
  speed: 1.25, zoom: 1.55, warp: 5, grain: 0.03, seed: 30,
  colorMix: 0.24, brightnessPulse: 0.34, waveContrast: 0.18, timeSmoothing: 0.72,
};

const DESKTOP = { pixelSize: 7, pixelGap: 2, imageScale: 0.72, cx: 0.5, cy: 0.55, hoverR: 165, push: 145 };
const MOBILE  = { pixelSize: 8, pixelGap: 2, imageScale: 0.82, cx: 0.5, cy: 0.58, hoverR: 110, push: 95  };

interface Particle {
  x: number; y: number;
  homeX: number; homeY: number;
  nx: number; ny: number;
  size: number; alpha: number;
  red: number; green: number; blue: number;
  luma: number; tear: number;
  phase: number; speed: number;
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function smoothstep(e0: number, e1: number, v: number) {
  const t = clamp01((v - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
function hash2(x: number, y: number, seed: number) {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
function mix(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

function paletteAt(amount: number): [number, number, number] {
  const w = ((amount % 1) + 1) % 1;
  const s = w * AURORA.length;
  const i = Math.floor(s) % AURORA.length;
  const j = (i + 1) % AURORA.length;
  const t = smoothstep(0, 1, s - i);
  return [mix(AURORA[i][0], AURORA[j][0], t), mix(AURORA[i][1], AURORA[j][1], t), mix(AURORA[i][2], AURORA[j][2], t)];
}

function fluidColor(p: Particle, time: number): string {
  const raw = time * 0.001 * FLUID.speed;
  const sec = raw * FLUID.timeSmoothing + Math.sin(raw * 0.42) * (1 - FLUID.timeSmoothing) * 2.5;
  const cx = (p.nx - 0.5) * FLUID.zoom;
  const cy = (p.ny - 0.5) * FLUID.zoom;
  const r  = Math.hypot(cx, cy);
  const a  = Math.atan2(cy, cx);
  const wA = Math.sin(cx * FLUID.warp + sec * 1.15 + FLUID.seed);
  const wB = Math.cos(cy * (FLUID.warp * 1.18) - sec * 0.95);
  const sp = Math.sin(a * 6 + r * 10.5 - sec * 1.35);
  const interference = Math.sin((cx + wB * 0.18) * 8.5 + sec * 1.35)
                     + Math.cos((cy + wA * 0.16) * 9.25 - sec * 1.05)
                     + sp;
  const grain = (hash2(Math.floor(p.nx * 47), Math.floor(p.ny * 47), FLUID.seed + Math.floor(sec * 18)) - 0.5) * FLUID.grain;
  const pa = interference * 0.11 + r * 0.58 + a * 0.045 + sec * 0.1 + grain;
  const aurora = paletteAt(pa);
  const wave = 0.5 + 0.5 * Math.sin(sec * 2.1 + r * 24 + a * 7 + wA * 1.5 + p.phase);
  const porcelain = smoothstep(0.52, 0.95, p.luma);
  const tearL     = smoothstep(22, 92, p.blue - p.red);
  const redDepth  = smoothstep(0.12, 0.5, 1 - p.luma);
  const tearGlow  = 0.5 + 0.5 * Math.sin(sec * 1.6 + r * 16 - a * 3 + p.phase);
  const lf = 1 + (wave - 0.5) * FLUID.brightnessPulse;
  const lit: [number, number, number] = [
    Math.max(0, Math.min(255, p.red   * lf + redDepth * 10 + porcelain * 6)),
    Math.max(0, Math.min(255, p.green * lf + porcelain * 9 + tearL * tearGlow * 18)),
    Math.max(0, Math.min(255, p.blue  * (0.98 + (wave - 0.5) * 0.14) + tearL * 32)),
  ];
  const warmPulse = 0.5 + 0.5 * Math.sin(sec * 2.2 + r * 18 + a * 4 + p.phase * 0.35);
  const bl = 0.74 + p.luma * 0.3 + porcelain * 0.1 + tearL * 0.18;
  const we = 0.92 + wave * FLUID.waveContrast;
  const ma = FLUID.colorMix * (0.35 + warmPulse * 0.65) * (0.35 + p.luma * 0.65);
  return `rgb(${mix(lit[0], aurora[0] * bl * we, ma)},${mix(lit[1], aurora[1] * bl * we, ma)},${mix(lit[2], aurora[2] * bl * we, ma)})`;
}

export function CryingMaskExhibit() {
  const navigate = useNavigate();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const particles  = useRef<Particle[]>([]);
  const pointer    = useRef({ x: 0, y: 0, active: false });
  const rafRef     = useRef<number>(0);
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const cfg = useCallback(() => window.innerWidth < 760 ? MOBILE : DESKTOP, []);

  const buildParticles = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

    const s = cfg();
    const scale = Math.min(w * s.imageScale / img.naturalWidth, h * s.imageScale / img.naturalHeight);
    const rw = img.naturalWidth  * scale;
    const rh = img.naturalHeight * scale;
    const left = w * s.cx - rw / 2;
    const top  = h * s.cy - rh / 2;

    const sw = Math.max(1, Math.floor(rw / s.pixelSize));
    const sh = Math.max(1, Math.floor(rh / s.pixelSize));
    const cw = rw / sw;
    const ch = rh / sh;
    const ps = Math.max(1, Math.min(cw, ch) - s.pixelGap);

    // Sample image at reduced resolution
    const tmp = document.createElement("canvas");
    tmp.width = sw; tmp.height = sh;
    const tc = tmp.getContext("2d", { willReadFrequently: true })!;
    tc.clearRect(0, 0, sw, sh);
    tc.drawImage(img, 0, 0, sw, sh);
    const px = tc.getImageData(0, 0, sw, sh).data;

    const list: Particle[] = [];
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const r = px[i], g = px[i+1], b = px[i+2], a = px[i+3];
        if (a < 45) continue;
        // Chroma-key: remove the solid green background
        if (g > 80 && g > r * 1.85 && g > b * 1.85 && g > 110) continue;

        const hX = left + x * cw;
        const hY = top  + y * ch;
        list.push({
          x: hX, y: hY, homeX: hX, homeY: hY,
          nx: x / Math.max(1, sw - 1),
          ny: y / Math.max(1, sh - 1),
          size: ps, alpha: a / 255,
          red: r, green: g, blue: b,
          luma: (r * 0.299 + g * 0.587 + b * 0.114) / 255,
          tear: smoothstep(14, 86, b - Math.max(r * 0.72, g * 0.62)),
          phase: Math.random() * Math.PI * 2,
          speed: 0.07 + Math.random() * 0.055,
        });
      }
    }
    particles.current = list;
  }, [cfg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.src = maskImageSrc;

    let mounted = true;

    function draw(time: number) {
      if (!mounted || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const s = cfg();
      const rm = reducedMotion.current;

      for (const p of particles.current) {
        let tx = p.homeX;
        let ty = p.homeY;

        // Mouse repulsion
        if (pointer.current.active && !rm) {
          const dx = p.homeX - pointer.current.x;
          const dy = p.homeY - pointer.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < s.hoverR) {
            const force = (1 - dist / s.hoverR) ** 2;
            const angle = Math.atan2(dy, dx);
            tx += Math.cos(angle) * s.push * force;
            ty += Math.sin(angle) * s.push * force;
          }
        }

        // Tear drip, horizontal wobble + downward pull
        if (p.tear > 0.04 && !rm) {
          const stream = Math.sin(time * 0.0024 + p.phase + p.nx * 18);
          tx += stream * p.tear * 2.2;
          ty += p.tear * 6;
        }

        // Spring toward target
        p.x += (tx - p.x) * p.speed;
        p.y += (ty - p.y) * p.speed;

        // Shimmer for non-tear pixels
        const shimmer = 0.9 + Math.sin(time * 0.004 * FLUID.speed + p.phase + p.nx * 9 + p.ny * 11) * 0.1;
        const tearGlint = p.tear * (0.25 + 0.75 * Math.max(0, Math.sin(time * 0.006 * FLUID.speed + p.phase)));
        const drawH = p.size * (1 + p.tear * (1.15 + tearGlint * 1.4));

        ctx.globalAlpha = p.alpha * Math.min(1, shimmer + tearGlint * 0.28);
        ctx.fillStyle = p.tear > 0.04
          ? `rgb(${Math.round(95  + tearGlint * 80)},${Math.round(190 + tearGlint * 52)},${Math.round(235 + tearGlint * 20)})`
          : fluidColor(p, time);
        ctx.fillRect(p.x, p.y, p.size, drawH);

        // Falling tear trail below tear pixels
        if (p.tear > 0.22 && !rm) {
          const tearTime = time * 0.0007 * FLUID.speed;
          const cycle = (tearTime + p.phase * 0.19 + p.ny * 1.15) % 1;
          const ease  = cycle * cycle * (3 - 2 * cycle);
          const tY = p.homeY + p.tear * (18 + ease * 150);
          const tX = p.homeX + Math.sin(time * 0.0022 + p.phase + p.nx * 18) * p.tear * 4;
          ctx.globalAlpha = p.alpha * p.tear * 0.34;
          ctx.fillStyle = "rgb(88,190,235)";
          ctx.fillRect(tX + p.size * 0.22, tY, Math.max(1, p.size * 0.56), p.size * (2.8 + p.tear * 4.2));
        }
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    }

    img.onload = () => {
      if (!mounted) return;
      buildParticles(img);
      rafRef.current = requestAnimationFrame(draw);
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (mounted) buildParticles(img); }, 120);
    }
    window.addEventListener("resize", onResize);

    function onPointerEnter(e: PointerEvent) {
      pointer.current.active = true;
      const r = canvas!.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left;
      pointer.current.y = e.clientY - r.top;
    }
    function onPointerMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left;
      pointer.current.y = e.clientY - r.top;
    }
    function onPointerLeave() { pointer.current.active = false; }

    canvas.addEventListener("pointerenter", onPointerEnter as EventListener);
    canvas.addEventListener("pointermove", onPointerMove  as EventListener);
    canvas.addEventListener("pointerleave", onPointerLeave);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerenter", onPointerEnter as EventListener);
      canvas.removeEventListener("pointermove", onPointerMove  as EventListener);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [buildParticles, cfg]);

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden flex flex-col"
      style={{
        background: `
          radial-gradient(circle at 50% 50%, rgba(33,67,108,0.22), transparent 31rem),
          radial-gradient(circle at 48% 58%, rgba(97,12,34,0.22), transparent 24rem),
          #030408
        `,
        color: "#fff7ec",
      }}
    >
      {/* Back nav */}
      <div className="relative z-10 px-6 pt-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity"
          style={{ fontFamily: "Georgia, serif", color: "#fff7ec" }}
        >
          ← Museum
        </button>
        <div className="w-px h-3 bg-white/10" />
        <span className="text-xs tracking-widest uppercase opacity-25" style={{ fontFamily: "Georgia, serif", color: "#fff7ec" }}>
          Exhibit · Sadness
        </span>
      </div>

      {/* Title */}
      <div className="relative z-10 text-center px-6 pt-4 pb-2 pointer-events-none">
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Garamond, Georgia, serif",
            fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
            fontWeight: 300,
            letterSpacing: "0.06em",
            color: "rgba(255,247,236,0.88)",
            lineHeight: 1.2,
          }}
        >
          Museum of Sadness
        </h1>
        <p
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(0.75rem, 1.5vw, 0.95rem)",
            fontStyle: "italic",
            color: "rgba(72,195,225,0.5)",
            marginTop: "0.4rem",
            letterSpacing: "0.04em",
          }}
        >
          The things we carried. The tears we never showed.
        </p>
      </div>

      {/* Canvas, fills remaining space */}
      <div className="relative flex-1 w-full" style={{ minHeight: "70vh" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
          aria-label="Interactive porcelain mask with animated tears"
        />
      </div>

      {/* Bottom label */}
      <div
        className="relative z-10 text-center pb-6 pointer-events-none"
        style={{ color: "rgba(255,247,236,0.18)", fontSize: "0.7rem", letterSpacing: "0.2em" }}
      >
        MOVE CURSOR ACROSS THE MASK
      </div>
    </div>
  );
}
