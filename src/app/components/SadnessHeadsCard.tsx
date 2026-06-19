/**
 * SadnessHeadsCard
 * ASCII particle portrait, ported 1:1 from pixel-sadness.html
 * NEVER BLANK: aurora fallback draws every frame until image is ready.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import sadnessSrc from "../../imports/sadness-heads.webp";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

// ─── Constants (match pixel-sadness.html exactly) ─────────────────────────────
const ASCII_RAMP = " .,:;irsXA253hMHGS#9B&@";

const AURORA: [number, number, number][] = [
  [10, 18, 55],
  [24, 63, 139],
  [31, 174, 184],
  [102, 230, 157],
  [245, 221, 98],
  [255, 126, 136],
  [126, 74, 221],
];

interface HeadRegion { cx: number; cy: number; rx: number; ry: number; delay: number; weight: number; }

const HEAD_REGIONS: HeadRegion[] = [
  { cx: 0.27, cy: 0.25, rx: 0.20, ry: 0.23, delay: 0.00, weight: 1.00 },
  { cx: 0.50, cy: 0.36, rx: 0.20, ry: 0.26, delay: 0.18, weight: 1.00 },
  { cx: 0.71, cy: 0.23, rx: 0.19, ry: 0.24, delay: 0.36, weight: 0.98 },
  { cx: 0.25, cy: 0.48, rx: 0.17, ry: 0.17, delay: 0.54, weight: 0.82 },
  { cx: 0.77, cy: 0.45, rx: 0.18, ry: 0.18, delay: 0.72, weight: 0.82 },
];

const FLUID = { speed: 1.25, zoom: 1.55, warp: 5, grain: 0.03, pixelate: 47, seed: 30, colorMix: 0.88 };
const SADNESS_SPEED = 0.92;
const ACCENT = "#2e7fb8";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function ss(e0: number, e1: number, v: number) {
  const t = clamp01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t);
}
function h2(x: number, y: number, s: number) {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
function mixCh(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

function paletteAt(amt: number): [number, number, number] {
  const w = ((amt % 1) + 1) % 1;
  const sc = w * AURORA.length;
  const i = Math.floor(sc) % AURORA.length;
  const j = (i + 1) % AURORA.length;
  const t = ss(0, 1, sc - i);
  return [mixCh(AURORA[i][0], AURORA[j][0], t), mixCh(AURORA[i][1], AURORA[j][1], t), mixCh(AURORA[i][2], AURORA[j][2], t)];
}

// ─── Particle ─────────────────────────────────────────────────────────────────
interface P {
  x: number; y: number; homeX: number; homeY: number;
  nx: number; ny: number; size: number; alpha: number;
  red: number; green: number; blue: number; luma: number; glyph: string;
  headIndex: number; headInfluence: number; headDelay: number;
  headLocalX: number; headLocalY: number;
  phase: number; speed: number;
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
// Exported so the 3D carousel can render the heads as a true coverflow slide.
export function SadnessHeadsRender({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const particles = useRef<P[]>([]);
  const ready     = useRef(false);          // true once particles built
  const cssW      = useRef(300);
  const cssH      = useRef(300);
  const dpr       = useRef(1);
  const pointer   = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;

    // ── Size sync ─────────────────────────────────────────────────────────────
    function syncSize() {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas!.clientWidth  || canvas!.offsetWidth  || 300;
      const h = canvas!.clientHeight || canvas!.offsetHeight || 300;
      cssW.current = w; cssH.current = h; dpr.current = d;
      canvas!.width  = Math.round(w * d);
      canvas!.height = Math.round(h * d);
      const ctx = canvas!.getContext("2d");
      if (ctx) ctx.setTransform(d, 0, 0, d, 0, 0);
    }

    // ── Head influence ────────────────────────────────────────────────────────
    function headInfluence(nx: number, ny: number) {
      let best: { index: number; region: HeadRegion; influence: number; lx: number; ly: number } | null = null;
      let bestInf = 0;
      for (let i = 0; i < HEAD_REGIONS.length; i++) {
        const r = HEAD_REGIONS[i];
        const dx = (nx - r.cx) / r.rx, dy = (ny - r.cy) / r.ry;
        const inf = ss(1, 0.22, Math.sqrt(dx * dx + dy * dy)) * r.weight;
        if (inf > bestInf) { bestInf = inf; best = { index: i, region: r, influence: inf, lx: dx, ly: dy }; }
      }
      return best;
    }

    // ── Build particles from image ────────────────────────────────────────────
    function build(img: HTMLImageElement) {
      syncSize();
      const w = cssW.current, h = cssH.current;
      const mobile = w < 480;
      const pixSize = mobile ? 10 : 9;
      const scale = Math.min(
        (w * (mobile ? 0.94 : 0.84)) / img.naturalWidth,
        (h * (mobile ? 0.94 : 0.84)) / img.naturalHeight,
      );
      const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
      const left = w * 0.5 - rw / 2, top = h * (mobile ? 0.56 : 0.55) - rh / 2;
      const sw = Math.max(1, Math.floor(rw / pixSize));
      const sh = Math.max(1, Math.floor(rh / pixSize));
      const cw = rw / sw, ch = rh / sh;
      const ps = Math.max(1, Math.min(cw, ch) - 1);

      const tmp = document.createElement("canvas");
      tmp.width = sw; tmp.height = sh;
      const tc = tmp.getContext("2d", { willReadFrequently: true })!;
      tc.clearRect(0, 0, sw, sh);
      tc.drawImage(img, 0, 0, sw, sh);
      const px = tc.getImageData(0, 0, sw, sh).data;

      const list: P[] = [];
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const i = (y * sw + x) * 4;
          const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
          if (a < 45) continue;
          // Remove green screen background
          if (g > 80 && g > r * 1.8 && g > b * 1.8 && g > 100) continue;

          const nx = x / Math.max(1, sw - 1), ny = y / Math.max(1, sh - 1);
          const hX = left + x * cw, hY = top + y * ch;
          const hi = headInfluence(nx, ny);
          const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          list.push({
            x: hX, y: hY, homeX: hX, homeY: hY,
            nx, ny, size: ps, alpha: a / 255,
            red: r, green: g, blue: b, luma,
            glyph: ASCII_RAMP[Math.min(ASCII_RAMP.length - 1, Math.floor(luma * (ASCII_RAMP.length - 1)))],
            headIndex: hi ? hi.index : -1,
            headInfluence: hi ? hi.influence : 0,
            headDelay: hi ? hi.region.delay : 0,
            headLocalX: hi ? hi.lx : 0,
            headLocalY: hi ? hi.ly : 0,
            phase: Math.random() * Math.PI * 2,
            speed: 0.075 + Math.random() * 0.045,
          });
        }
      }
      particles.current = list;
      ready.current = true;
    }

    // ── Sad motion (exact port) ───────────────────────────────────────────────
    function sadMotion(p: P, time: number) {
      if (p.headIndex < 0) return { x: 0, y: 0 };
      const sec = time * 0.001 * SADNESS_SPEED;
      const cycle = ((sec * 0.36 - p.headDelay) % 1 + 1) % 1;
      const bow = Math.sin(cycle * Math.PI);
      const pause = ss(0.06, 0.24, cycle) * (1 - ss(0.7, 0.96, cycle));
      const breath = Math.sin(sec * 1.35 + p.headIndex * 1.7) * 0.35;
      const side = (p.headIndex === 0 || p.headIndex === 3) ? -1 : (p.headIndex === 2 || p.headIndex === 4) ? 1 : 0;
      const tiltDir = p.headIndex % 2 === 0 ? 1 : -1;
      const tilt = p.headLocalX * tiltDir * bow * pause;
      const browSink = Math.max(0, -p.headLocalY) * bow * pause;
      return {
        x: p.headInfluence * (side * bow * 9 + tilt * 9 + breath * 2.5),
        y: p.headInfluence * (bow * pause * 34 + browSink * 7 + 2.5 + breath * 2),
      };
    }

    // ── Fluid colour (exact port) ─────────────────────────────────────────────
    function mournfulColor(p: P, time: number): string {
      const sec = time * 0.001 * FLUID.speed;
      const fx = (p.nx - 0.5) * FLUID.zoom, fy = (p.ny - 0.5) * FLUID.zoom;
      const radius = Math.hypot(fx, fy), angle = Math.atan2(fy, fx);
      const wA = Math.sin(fx * FLUID.warp + sec * 1.7 + FLUID.seed);
      const wB = Math.cos(fy * FLUID.warp * 1.18 - sec * 1.35);
      const spiral = Math.sin(angle * 6 + radius * 10.5 - sec * 2.25);
      const intf = Math.sin((fx + wB * 0.18) * 8.5 + sec * 2.1)
                 + Math.cos((fy + wA * 0.16) * 9.25 - sec * 1.65)
                 + spiral;
      const grain = (h2(Math.floor(p.nx * FLUID.pixelate), Math.floor(p.ny * FLUID.pixelate), FLUID.seed + Math.floor(sec * 18)) - 0.5) * FLUID.grain;
      const pa = intf * 0.13 + radius * 0.68 + angle * 0.055 + sec * 0.1 + grain;
      const aurora = paletteAt(pa);
      const headPulse = p.headInfluence * (0.5 + 0.5 * Math.sin(sec * 1.45 - p.headDelay * 6.28 + p.phase));
      const lum = 0.48 + p.luma * 0.72, shade = 0.9 + headPulse * 0.18;
      return `rgb(${mixCh(p.red, aurora[0] * lum * shade, FLUID.colorMix)},${mixCh(p.green, aurora[1] * lum * shade, FLUID.colorMix)},${mixCh(p.blue, aurora[2] * lum * shade, FLUID.colorMix)})`;
    }

    // ── Aurora fallback, ALWAYS drawn before particles are ready ─────────────
    function drawFallback(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
      ctx.clearRect(0, 0, w, h);
      const sec = time * 0.001 * FLUID.speed;
      const gs = Math.max(8, Math.round(w / 34));
      ctx.font = `${gs}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let gy = 0; gy < h + gs; gy += gs) {
        for (let gx = 0; gx < w + gs; gx += gs) {
          const nx = gx / w, ny = gy / h;
          const fx = (nx - 0.5) * FLUID.zoom, fy = (ny - 0.5) * FLUID.zoom;
          const radius = Math.hypot(fx, fy), angle = Math.atan2(fy, fx);
          const wA = Math.sin(fx * FLUID.warp + sec * 1.7 + FLUID.seed);
          const wB = Math.cos(fy * FLUID.warp * 1.18 - sec * 1.35);
          const spiral = Math.sin(angle * 6 + radius * 10.5 - sec * 2.25);
          const intf = Math.sin((fx + wB * 0.18) * 8.5 + sec * 2.1)
                     + Math.cos((fy + wA * 0.16) * 9.25 - sec * 1.65) + spiral;
          const pa = intf * 0.13 + radius * 0.68 + angle * 0.055 + sec * 0.1;
          const [cr, cg, cb] = paletteAt(pa);
          const lum = 0.25 + radius * 0.35;
          const gi = Math.min(ASCII_RAMP.length - 1, Math.floor(lum * (ASCII_RAMP.length - 1)));
          ctx.globalAlpha = 0.35 + lum * 0.5;
          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
          ctx.fillText(ASCII_RAMP[gi], gx + gs * 0.5, gy + gs * 0.5);
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Main draw loop ────────────────────────────────────────────────────────
    function draw(time: number) {
      if (!alive || !canvas) return;
      if (!inView) { rafRef.current = 0; return; } // idle when off-screen (no CPU/battery drain)
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = cssW.current, h = cssH.current;

      // NEVER BLANK: draw aurora fallback until particles ready
      if (!ready.current) {
        drawFallback(ctx, w, h, time);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      const mobile = w < 480;
      const pixSize = mobile ? 10 : 9;
      ctx.font = `${Math.max(9, pixSize * 1.32)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const hoverR = mobile ? 100 : 150;
      const pushStr = mobile ? 48 : 70;

      for (const p of particles.current) {
        const sad = sadMotion(p, time);
        let tx = p.homeX + sad.x, ty = p.homeY + sad.y;

        if (pointer.current.active) {
          const dx = p.homeX - pointer.current.x, dy = p.homeY - pointer.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < hoverR) {
            const force = (1 - dist / hoverR) ** 2;
            tx += Math.cos(Math.atan2(dy, dx)) * pushStr * force;
            ty += Math.sin(Math.atan2(dy, dx)) * pushStr * force;
          }
        }

        p.x += (tx - p.x) * p.speed;
        p.y += (ty - p.y) * p.speed;

        const shimmer = 0.94 + Math.sin(time * 0.0016 + p.phase + p.headDelay * 4) * 0.06;
        ctx.globalAlpha = p.alpha * shimmer;
        ctx.fillStyle = mournfulColor(p, time);
        ctx.fillText(p.glyph, p.x + p.size * 0.5, p.y + p.size * 0.5);
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    }

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    syncSize();

    // Animate only while on-screen. An IntersectionObserver starts the loop when the
    // card scrolls in and stops it when it leaves (mirrors CryingMaskRender / ShaderThumb),
    // so off-screen / faded side cards cost ~0 CPU.
    let inView = false;
    function startRAF() {
      if (!rafRef.current && inView && alive) rafRef.current = requestAnimationFrame(draw);
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inView = e.isIntersecting;
          if (inView) startRAF();
          else if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        }
      },
      { threshold: 0.01, rootMargin: "200px" },
    );
    io.observe(canvas);

    // Load image, then build particles
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { if (alive) build(img); };
    img.onerror = () => { /* fallback aurora keeps running */ };
    img.src = sadnessSrc;

    // Pointer events
    const onEnter = (e: PointerEvent) => {
      pointer.current.active = true;
      const r = canvas!.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left; pointer.current.y = e.clientY - r.top;
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas!.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left; pointer.current.y = e.clientY - r.top;
    };
    const onLeave = () => { pointer.current.active = false; };
    canvas.addEventListener("pointerenter", onEnter as EventListener);
    canvas.addEventListener("pointermove", onMove  as EventListener);
    canvas.addEventListener("pointerleave", onLeave);

    // Resize
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!alive) return;
        syncSize();
        ready.current = false; // rebuild on next image load cycle
        const i2 = new Image();
        i2.onload = () => { if (alive) build(i2); };
        i2.src = sadnessSrc;
      }, 120);
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      io.disconnect();
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointerenter", onEnter as EventListener);
      canvas.removeEventListener("pointermove", onMove  as EventListener);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        display: "block", width: "100%", height: "100%",
        background: "#05070c",
        cursor: "pointer", touchAction: "manipulation",
      }}
    />
  );
}

// ─── Card shell (matches ShaderArtifactCard exactly) ──────────────────────────
export function SadnessHeadsCard({ onClick, showTag, artifact }: { onClick?: () => void; showTag?: boolean; artifact?: Artifact }) {
  const id = artifact?.id ?? "mock-heads";
  const liked = useLiked(id);
  const likes = likeCount(artifact?.likes ?? 287, liked);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="w-full h-[430px] rounded-2xl overflow-hidden cursor-pointer flex flex-col"
      style={{
        background: "rgba(8,5,14,0.9)",
        border: `1px solid ${hovered ? ACCENT + "40" : "rgba(255,255,255,0.06)"}`,
        boxShadow: hovered ? `0 0 40px ${ACCENT}20, 0 8px 32px rgba(0,0,0,0.4)` : "0 4px 20px rgba(0,0,0,0.3)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-[230px] shrink-0 overflow-hidden">
        <SadnessHeadsRender className="absolute inset-0" />
        {showTag && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full text-xs capitalize tracking-wider"
              style={{ background: `${ACCENT}25`, border: `1px solid ${ACCENT}40`, color: ACCENT, backdropFilter: "blur(8px)" }}>
              regret
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "0.95rem", fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
          Five Ways of Grieving
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "Each face carries the same weight. Just wearing it differently."
        </p>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "#1a3a5c", color: "white", fontSize: "8px", fontWeight: 600 }}>?</div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Anonymous Visitor</span>
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Jun 15, 2025</span>
        </div>

        <div className="flex items-center gap-3 pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={(e) => { e.stopPropagation(); toggleLike(id); }}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: liked ? "#ff6b7a" : "rgba(255,255,255,0.3)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "#ff6b7a" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {likes}
          </button>
          <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(window.location.origin + "/gallery/regret"); }}
            className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            94
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
