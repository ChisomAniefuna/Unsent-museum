import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import apparitionSrc from "../../imports/scratch-apparition.jpg";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

const W = 420;
const H = 420;
const MAX_PARTICLES = 17000;
const RAIN_ANGLE = -0.22;

const BREATH = 0.72;
const REACH = 0.80;
const TRAILS = 0.82;
const RAIN_INTENSITY = 0.85;

interface Particle {
  hx: number; hy: number;
  r: number; g: number; b: number;
  isRed: boolean;
  phase: number;
  dirX: number; dirY: number;
  wobbleSeed: number;
  amplitude: number;
  isWisp: boolean;
  upBias: number;
  speedMul: number;
}

interface RainDrop {
  x: number; y: number;
  speed: number;
  len: number;
  alpha: number;
}

function makeRain(count: number, speedMin: number, speedMax: number, lenMin: number, lenMax: number, alphaMin: number, alphaMax: number): RainDrop[] {
  const drops: RainDrop[] = [];
  for (let i = 0; i < count; i++) {
    drops.push({
      x: Math.random() * (W + 80) - 40,
      y: Math.random() * H,
      speed: speedMin + Math.random() * (speedMax - speedMin),
      len: lenMin + Math.random() * (lenMax - lenMin),
      alpha: alphaMin + Math.random() * (alphaMax - alphaMin),
    });
  }
  return drops;
}

function stepRain(drops: RainDrop[]) {
  const dx = Math.sin(RAIN_ANGLE);
  const dy = Math.cos(RAIN_ANGLE);
  for (const d of drops) {
    d.x += dx * d.speed;
    d.y += dy * d.speed;
    if (d.y > H + 20) {
      d.y = -d.len;
      d.x = Math.random() * (W + 80) - 40;
    }
    if (d.x < -50) d.x = W + 40;
  }
}

function drawRain(
  buf: Uint8Array,
  drops: RainDrop[],
  cr: number, cg: number, cb: number,
  globalAlpha: number,
  silhouetteMask: Uint8Array | null,
  brighterInside: boolean,
) {
  const dx = Math.sin(RAIN_ANGLE);
  const dy = Math.cos(RAIN_ANGLE);
  for (const d of drops) {
    const a = (d.alpha / 255) * globalAlpha;
    for (let s = 0; s < d.len; s++) {
      const px = Math.round(d.x + dx * s);
      const py = Math.round(d.y + dy * s);
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      let fa = a;
      if (brighterInside && silhouetteMask) {
        fa = silhouetteMask[py * W + px] ? a * 1.4 : a * 0.7;
      }
      const idx = (py * W + px) * 4;
      buf[idx]     = Math.min(255, buf[idx]     + cr * fa);
      buf[idx + 1] = Math.min(255, buf[idx + 1] + cg * fa);
      buf[idx + 2] = Math.min(255, buf[idx + 2] + cb * fa);
    }
  }
}

export function ScratchApparitionRender({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    particles: Particle[];
    trailR: Float32Array;
    trailG: Float32Array;
    trailB: Float32Array;
    silhouetteMask: Uint8Array;
    rainBack: RainDrop[];
    rainThrough: RainDrop[];
    rainFront: RainDrop[];
    centroidX: number;
    centroidY: number;
    headY: number;
  } | null>(null);
  const rafRef = useRef<number>(0);
  const builtRef = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mounted = true;

    const img = new Image();
    img.src = apparitionSrc;

    function build() {
      if (!canvas || !mounted) return;
      builtRef.current = true;

      const tmp = document.createElement("canvas");
      tmp.width = W; tmp.height = H;
      const tc = tmp.getContext("2d", { willReadFrequently: true })!;
      tc.drawImage(img, 0, 0, W, H);
      const px = tc.getImageData(0, 0, W, H).data;

      const lum = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) {
        lum[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
      }

      // Separable box filter for density (radius 3)
      const rad = 3;
      const hPass = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let sum = 0;
          for (let dx = -rad; dx <= rad; dx++) {
            const nx = Math.max(0, Math.min(W - 1, x + dx));
            sum += lum[y * W + nx] > 0 ? 1 : 0;
          }
          hPass[y * W + x] = sum;
        }
      }
      const density = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let sum = 0;
          for (let dy = -rad; dy <= rad; dy++) {
            const ny = Math.max(0, Math.min(H - 1, y + dy));
            sum += hPass[ny * W + x];
          }
          density[y * W + x] = sum;
        }
      }

      // Find centroid and bbox of silhouette
      let cx = 0, cy = 0, count = 0;
      let minY = H, maxY = 0;
      const silhouetteMask = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (density[y * W + x] >= 9) {
            cx += x; cy += y; count++;
            silhouetteMask[y * W + x] = 1;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      cx = count > 0 ? cx / count : W / 2;
      cy = count > 0 ? cy / count : H / 2;
      const headY = minY + (maxY - minY) * 0.25;

      const particles: Particle[] = [];
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const l = lum[i];
          if (l < 24 || density[i] < 9) continue;
          if (Math.random() > (l / 255) * 0.52) continue;

          const pi = i * 4;
          const pr = px[pi], pg = px[pi + 1], pb = px[pi + 2];
          const isRed = pr > 80 && pr > pg * 1.55 && pr > pb * 1.55;

          let cr: number, cg: number, cb: number;
          if (isRed) {
            cr = Math.min(255, pr * 1.15);
            cg = pg * 0.32;
            cb = pb * 0.32;
          } else {
            cr = Math.min(255, pr * 1.08);
            cg = Math.min(255, pg * 1.08);
            cb = Math.min(255, pb * 1.08);
          }

          const dx = x - cx, dy = y - cy;
          const dist = Math.hypot(dx, dy) || 1;
          const isWisp = Math.random() < 0.12;
          const distToHead = Math.abs(y - headY);
          const headFactor = Math.max(0, 1 - distToHead / (maxY - minY + 1));

          particles.push({
            hx: x, hy: y,
            r: cr, g: cg, b: cb,
            isRed,
            phase: Math.random() * Math.PI * 2,
            dirX: dx / dist,
            dirY: dy / dist,
            wobbleSeed: Math.random() * 100,
            amplitude: isWisp ? 2.2 + Math.random() * 1.8 : 0.5 + Math.random() * 1.1,
            isWisp,
            upBias: headFactor * 0.6,
            speedMul: 0.75 + Math.random() * 0.6,
          });

          if (particles.length >= MAX_PARTICLES) break;
        }
        if (particles.length >= MAX_PARTICLES) break;
      }

      stateRef.current = {
        particles,
        trailR: new Float32Array(W * H),
        trailG: new Float32Array(W * H),
        trailB: new Float32Array(W * H),
        silhouetteMask,
        rainBack: makeRain(260, 2.0, 3.8, 7, 14, 35, 70),
        rainThrough: makeRain(190, 3.0, 5.0, 10, 19, 70, 120),
        rainFront: makeRain(140, 4.2, 7.4, 14, 32, 140, 220),
        centroidX: cx,
        centroidY: cy,
        headY,
      };
    }

    function draw() {
      if (!mounted || !canvas) return;
      const state = stateRef.current;
      if (!state) { rafRef.current = requestAnimationFrame(draw); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const t = frameRef.current++;
      const breathSpeed = 0.025 * BREATH;

      const { particles, trailR, trailG, trailB, silhouetteMask, rainBack, rainThrough, rainFront, centroidX, centroidY } = state;

      // Fade trail accumulators
      for (let i = 0; i < W * H; i++) {
        trailR[i] *= TRAILS;
        trailG[i] *= TRAILS;
        trailB[i] *= TRAILS;
      }

      // Animate particles into trail buffer
      for (const p of particles) {
        const breathRaw = Math.sin(t * breathSpeed * p.speedMul + p.phase);
        const breath = Math.pow(Math.max(0, breathRaw), 0.85);
        const reach = REACH * 40 * p.amplitude * breath;

        const wobble = Math.sin(t * 0.013 + p.wobbleSeed * 6.28) * 0.4
                     + Math.cos(t * 0.009 + p.wobbleSeed * 3.14) * 0.3;

        const gravity = 0.15;
        const mx = p.dirX + wobble * 0.3;
        const my = p.dirY + gravity - p.upBias;
        const mag = Math.hypot(mx, my) || 1;

        const px = p.hx + (mx / mag) * reach;
        const py = p.hy + (my / mag) * reach;

        const ix = Math.round(px);
        const iy = Math.round(py);
        if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;

        const deposit = p.isWisp ? 60 / 255 : 110 / 255;
        const idx = iy * W + ix;
        trailR[idx] += (p.r / 255) * deposit;
        trailG[idx] += (p.g / 255) * deposit;
        trailB[idx] += (p.b / 255) * deposit;
      }

      // Step rain
      stepRain(rainBack);
      stepRain(rainThrough);
      stepRain(rainFront);

      // Build final frame
      const imageData = ctx.createImageData(W, H);
      const u32 = new Uint32Array(imageData.data.buffer);
      u32.fill(0xFF000000);

      const out = imageData.data;

      // Back rain
      drawRain(out, rainBack, 170, 175, 200, 0.55 * RAIN_INTENSITY, null, false);

      // Composite body trails additively
      for (let i = 0; i < W * H; i++) {
        const idx = i * 4;
        out[idx]     = Math.min(255, out[idx]     + Math.round(trailR[i] * 255));
        out[idx + 1] = Math.min(255, out[idx + 1] + Math.round(trailG[i] * 255));
        out[idx + 2] = Math.min(255, out[idx + 2] + Math.round(trailB[i] * 255));
      }

      // Through rain (brighter inside silhouette)
      drawRain(out, rainThrough, 190, 195, 215, RAIN_INTENSITY, silhouetteMask, true);

      // Front rain
      drawRain(out, rainFront, 230, 232, 245, RAIN_INTENSITY, null, false);

      ctx.putImageData(imageData, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    }

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

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", background: "#000" }}
    />
  );
}

// Card shell, matches CryingMaskCard / ShaderArtifactCard exactly
const ACCENT = "#2e7fb8";

interface Props { onClick?: () => void; showTag?: boolean; artifact?: Artifact; }

export function ScratchApparitionCard({ onClick, showTag, artifact }: Props) {
  const id = artifact?.id ?? "mock-scratch-apparition";
  const liked = useLiked(id);
  const likes = likeCount(artifact?.likes ?? 0, liked);
  const [hovered, setHovered] = useState(false);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    toggleLike(id);
  }
  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(window.location.origin + "/exhibit/regret");
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
      <div className="relative h-[230px] shrink-0 overflow-hidden">
        <ScratchApparitionRender className="absolute inset-0" />
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

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "0.95rem", fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
          I Scratched Myself Out of Every Photo
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "You erased me so slowly I started doing it for you."
        </p>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#0e3a5c", color: "white", fontSize: "8px", fontWeight: 600 }}>
            ?
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Anonymous Visitor</span>
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Jun 22, 2025</span>
        </div>

        <div className="flex items-center gap-3 pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={handleLike} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: liked ? "#ff6b7a" : "rgba(255,255,255,0.3)" }}>
            <Heart size={13} fill={liked ? "#ff6b7a" : "none"} />
            {likes}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Share2 size={13} />
            64
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
