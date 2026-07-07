import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import maskImageSrc from "../../imports/masked-face.webp";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

// ─── Palette & constants ───────────────────────────────────────────────────────
const AURORA: [number, number, number][] = [
  [16, 18, 31], [42, 61, 91], [63, 142, 181],
  [72, 195, 225], [238, 231, 212], [191, 34, 64], [72, 8, 22],
];
const FLUID = { speed: 1.25, zoom: 1.55, warp: 5, grain: 0.03, seed: 30,
  colorMix: 0.24, brightnessPulse: 0.34, waveContrast: 0.18, timeSmoothing: 0.72 };

interface Particle {
  x: number; y: number; homeX: number; homeY: number;
  nx: number; ny: number; size: number; alpha: number;
  red: number; green: number; blue: number;
  luma: number; tear: number; phase: number; speed: number;
}

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
  const w = ((amt % 1) + 1) % 1, sc = w * AURORA.length;
  const i = Math.floor(sc) % AURORA.length, j = (i + 1) % AURORA.length;
  const t = ss(0, 1, sc - i);
  return [mixCh(AURORA[i][0], AURORA[j][0], t), mixCh(AURORA[i][1], AURORA[j][1], t), mixCh(AURORA[i][2], AURORA[j][2], t)];
}

function fluidColor(p: Particle, time: number): string {
  const raw = time * 0.001 * FLUID.speed;
  const sec = raw * FLUID.timeSmoothing + Math.sin(raw * 0.42) * (1 - FLUID.timeSmoothing) * 2.5;
  const cx = (p.nx - 0.5) * FLUID.zoom, cy = (p.ny - 0.5) * FLUID.zoom;
  const r = Math.hypot(cx, cy), a = Math.atan2(cy, cx);
  const wA = Math.sin(cx * FLUID.warp + sec * 1.15 + FLUID.seed);
  const wB = Math.cos(cy * (FLUID.warp * 1.18) - sec * 0.95);
  const sp = Math.sin(a * 6 + r * 10.5 - sec * 1.35);
  const intf = Math.sin((cx + wB * 0.18) * 8.5 + sec * 1.35)
             + Math.cos((cy + wA * 0.16) * 9.25 - sec * 1.05) + sp;
  const grain = (h2(Math.floor(p.nx * 47), Math.floor(p.ny * 47), FLUID.seed + Math.floor(sec * 18)) - 0.5) * FLUID.grain;
  const aurora = paletteAt(intf * 0.11 + r * 0.58 + a * 0.045 + sec * 0.1 + grain);
  const wave = 0.5 + 0.5 * Math.sin(sec * 2.1 + r * 24 + a * 7 + wA * 1.5 + p.phase);
  const porc = ss(0.52, 0.95, p.luma), tearL = ss(22, 92, p.blue - p.red);
  const redD = ss(0.12, 0.5, 1 - p.luma);
  const tg   = 0.5 + 0.5 * Math.sin(sec * 1.6 + r * 16 - a * 3 + p.phase);
  const lf   = 1 + (wave - 0.5) * FLUID.brightnessPulse;
  const lit: [number, number, number] = [
    Math.max(0, Math.min(255, p.red   * lf + redD * 10 + porc * 6)),
    Math.max(0, Math.min(255, p.green * lf + porc * 9  + tearL * tg * 18)),
    Math.max(0, Math.min(255, p.blue  * (0.98 + (wave - 0.5) * 0.14) + tearL * 32)),
  ];
  const wp = 0.5 + 0.5 * Math.sin(sec * 2.2 + r * 18 + a * 4 + p.phase * 0.35);
  const bl = 0.74 + p.luma * 0.3 + porc * 0.1 + tearL * 0.18;
  const we = 0.92 + wave * FLUID.waveContrast;
  const ma = FLUID.colorMix * (0.35 + wp * 0.65) * (0.35 + p.luma * 0.65);
  return `rgb(${mixCh(lit[0],aurora[0]*bl*we,ma)},${mixCh(lit[1],aurora[1]*bl*we,ma)},${mixCh(lit[2],aurora[2]*bl*we,ma)})`;
}

// ─── Canvas pixel renderer ─────────────────────────────────────────────────────
// Exported so the 3D carousel can render the mask as a true coverflow slide.
export function CryingMaskRender({ className }: { className?: string }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const particles  = useRef<Particle[]>([]);
  const pointer    = useRef({ x: 0, y: 0, active: false });
  const rafRef     = useRef<number>(0);
  const builtRef   = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mounted = true;

    const img = new Image();
    img.src = maskImageSrc;

    function build() {
      if (!canvas || !mounted) return;
      builtRef.current = true;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || canvas.offsetWidth || 300;
      const h = canvas.clientHeight || canvas.offsetHeight || 300;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Pixel size scales with card size
      const ps = Math.max(4, Math.round(w / 70));
      const gap = 1;
      const scale = Math.min((w * 0.9) / img.naturalWidth, (h * 0.9) / img.naturalHeight);
      const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
      const left = w * 0.5 - rw / 2, top = h * 0.5 - rh / 2;
      const sw = Math.max(1, Math.floor(rw / ps));
      const sh = Math.max(1, Math.floor(rh / ps));
      const cw = rw / sw, ch = rh / sh;
      const pSize = Math.max(1, Math.min(cw, ch) - gap);

      const tmp = document.createElement("canvas");
      tmp.width = sw; tmp.height = sh;
      const tc = tmp.getContext("2d", { willReadFrequently: true })!;
      tc.drawImage(img, 0, 0, sw, sh);
      const px = tc.getImageData(0, 0, sw, sh).data;

      const list: Particle[] = [];
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const i = (y * sw + x) * 4;
          const r = px[i], g = px[i+1], b = px[i+2], a = px[i+3];
          if (a < 45) continue;
          // Chroma-key: remove green screen background
          if (g > 80 && g > r * 1.85 && g > b * 1.85 && g > 110) continue;
          const hX = left + x * cw, hY = top + y * ch;
          list.push({
            x: hX, y: hY, homeX: hX, homeY: hY,
            nx: x / Math.max(1, sw - 1), ny: y / Math.max(1, sh - 1),
            size: pSize, alpha: a / 255,
            red: r, green: g, blue: b,
            luma: (r * 0.299 + g * 0.587 + b * 0.114) / 255,
            tear: ss(14, 86, b - Math.max(r * 0.72, g * 0.62)),
            phase: Math.random() * Math.PI * 2,
            speed: 0.07 + Math.random() * 0.055,
          });
        }
      }
      particles.current = list;
    }

    function draw(time: number) {
      if (!mounted || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || canvas.offsetWidth || 300;
      const h = canvas.clientHeight || canvas.offsetHeight || 300;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (const p of particles.current) {
        let tx = p.homeX, ty = p.homeY;

        // Mouse repulsion
        if (pointer.current.active) {
          const dx = p.homeX - pointer.current.x, dy = p.homeY - pointer.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            const force = (1 - dist / 120) ** 2;
            tx += Math.cos(Math.atan2(dy, dx)) * 100 * force;
            ty += Math.sin(Math.atan2(dy, dx)) * 100 * force;
          }
        }

        // Tear drip
        if (p.tear > 0.04) {
          tx += Math.sin(time * 0.0024 + p.phase + p.nx * 18) * p.tear * 2.2;
          ty += p.tear * 6;
        }

        p.x += (tx - p.x) * p.speed;
        p.y += (ty - p.y) * p.speed;

        const shimmer = 0.9 + Math.sin(time * 0.004 * FLUID.speed + p.phase + p.nx * 9 + p.ny * 11) * 0.1;
        const tg = p.tear * (0.25 + 0.75 * Math.max(0, Math.sin(time * 0.006 * FLUID.speed + p.phase)));
        const drawH = p.size * (1 + p.tear * (1.15 + tg * 1.4));

        ctx.globalAlpha = p.alpha * Math.min(1, shimmer + tg * 0.28);
        ctx.fillStyle = p.tear > 0.04
          ? `rgb(${Math.round(95 + tg * 80)},${Math.round(190 + tg * 52)},${Math.round(235 + tg * 20)})`
          : fluidColor(p, time);
        ctx.fillRect(p.x, p.y, p.size, drawH);

        // Falling tear trail
        if (p.tear > 0.22) {
          const cycle = ((time * 0.0007 * FLUID.speed + p.phase * 0.19 + p.ny * 1.15) % 1 + 1) % 1;
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

    // IntersectionObserver: only run when visible (same pattern as WebGLCanvas)
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!builtRef.current && img.complete) build();
          else if (!builtRef.current) img.onload = build;
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(draw);
        } else {
          cancelAnimationFrame(rafRef.current);
        }
      }
    }, { threshold: 0.01 });

    img.onload = () => { if (mounted) { build(); rafRef.current = requestAnimationFrame(draw); } };
    if (img.complete) { build(); observer.observe(canvas); }
    else observer.observe(canvas);

    // Pointer events
    const onEnter = (e: PointerEvent) => {
      pointer.current.active = true;
      const r = canvas.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left; pointer.current.y = e.clientY - r.top;
    };
    const onMove  = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.current.x = e.clientX - r.left; pointer.current.y = e.clientY - r.top;
    };
    const onLeave = () => { pointer.current.active = false; };
    canvas.addEventListener("pointerenter", onEnter as EventListener);
    canvas.addEventListener("pointermove", onMove  as EventListener);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      canvas.removeEventListener("pointerenter", onEnter as EventListener);
      canvas.removeEventListener("pointermove", onMove  as EventListener);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className={className} style={{ background: "#030408", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ display: "block", background: "transparent", cursor: "pointer", touchAction: "manipulation" }}
      />
    </div>
  );
}

// ─── Card shell, matches ShaderArtifactCard exactly ──────────────────────────
const ACCENT = "#2e7fb8"; // regret ocean blue

interface Props { onClick?: () => void; showTag?: boolean; artifact?: Artifact; }

export function CryingMaskCard({ onClick, showTag, artifact }: Props) {
  const id = artifact?.id ?? "mock-mask";
  const liked = useLiked(id);
  const likes = likeCount(artifact?.likes ?? 0, liked);
  const [hovered, setHovered] = useState(false);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    toggleLike(id);
  }
  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.origin + "/exhibit/sadness");
  }

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
      {/* Canvas preview, fixed height to match shader cards */}
      <div className="relative h-[230px] shrink-0 overflow-hidden">
        <CryingMaskRender className="absolute inset-0" />
        {showTag && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <span
              className="px-2.5 py-1 rounded-full text-xs capitalize tracking-wider"
              style={{ background: `${ACCENT}25`, border: `1px solid ${ACCENT}40`, color: ACCENT, backdropFilter: "blur(8px)" }}
            >
              regret
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "0.95rem", fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
          The Face We Wore
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "I kept smiling. For years. No one knew I was falling apart behind the mask."
        </p>

        {/* Creator row */}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#0e3a5c", color: "white", fontSize: "8px", fontWeight: 600 }}>
            ?
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Anonymous Visitor</span>
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Jun 14, 2025</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={handleLike} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: liked ? "#ff6b7a" : "rgba(255,255,255,0.3)" }}>
            <Heart size={13} fill={liked ? "#ff6b7a" : "none"} />
            {likes}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Share2 size={13} />
            88
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
