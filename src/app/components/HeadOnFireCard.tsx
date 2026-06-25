import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import particleData from "../../imports/head-on-fire-particles.json";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

const HDR = { W: 420, H: 420, P: 12809, cx: 209.21168781822328, cy: 202.36718595637967, miny: 2, maxy: 419, bodyH: 417.0 };
const W = HDR.W;
const H = HDR.H;
const N = W * H;
const P = HDR.P;

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function flameColor(life: number, heat: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (life < 0.30) {
    const u = life / 0.30;
    r = 255; g = 180 - 70 * u; b = 70 + 90 * u;
  } else if (life < 0.62) {
    const u = (life - 0.30) / 0.32;
    r = 255 - 20 * u; g = 110 - 70 * u; b = 160 + 50 * u;
  } else {
    const u = (life - 0.62) / 0.38;
    r = 235 - 150 * u; g = 40 + 10 * u; b = 210 - 40 * u;
  }
  return [r * heat, g * heat, b * heat];
}

const FLAME = 1.0;
const RISE = 1.0;
const FLICKER = 1.0;
const HEAT = 1.2;
const SORROW = 1.0;
const BREATH = 0.7;
const BODYGLOW = 1.15;
const TRAIL_KEEP = Math.min(0.95, 0.72 * 0.85);

export function HeadOnFireRender({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    hx: Uint16Array;
    hy: Uint16Array;
    hw: Uint8Array;
    br: Uint8Array;
    rb1: Uint8Array;
    rb2: Uint8Array;
    hwf: Float32Array;
    brf: Float32Array;
    ph: Float32Array;
    spd: Float32Array;
    amp: Float32Array;
    ox: Float32Array;
    oy: Float32Array;
    accR: Float32Array;
    accG: Float32Array;
    accB: Float32Array;
  } | null>(null);
  const rafRef = useRef<number>(0);
  const builtRef = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mounted = true;

    function build() {
      if (builtRef.current) return;
      builtRef.current = true;

      const hxBytes = b64ToBytes(particleData.hx);
      const hyBytes = b64ToBytes(particleData.hy);
      const hx = new Uint16Array(hxBytes.buffer, hxBytes.byteOffset, hxBytes.byteLength / 2);
      const hy = new Uint16Array(hyBytes.buffer, hyBytes.byteOffset, hyBytes.byteLength / 2);
      const br = b64ToBytes(particleData.br);
      const hw = b64ToBytes(particleData.hw);
      const rb1 = b64ToBytes(particleData.rb1);
      const rb2 = b64ToBytes(particleData.rb2);

      const hwf = new Float32Array(P);
      const brf = new Float32Array(P);
      const ph = new Float32Array(P);
      const spd = new Float32Array(P);
      const amp = new Float32Array(P);
      const ox = new Float32Array(P);
      const oy = new Float32Array(P);

      for (let i = 0; i < P; i++) {
        hwf[i] = hw[i] / 255;
        brf[i] = br[i] / 255;
        ph[i] = rb1[i] / 255;
        spd[i] = 0.6 + (rb2[i] / 255) * 0.9;
        amp[i] = 0.4 + (rb1[i] / 255) * 1.4;
        const dx = hx[i] - HDR.cx;
        const dy = hy[i] - HDR.cy;
        const d = Math.hypot(dx, dy) + 0.001;
        ox[i] = dx / d;
        oy[i] = dy / d;
      }

      stateRef.current = {
        hx, hy, hw, br, rb1, rb2,
        hwf, brf, ph, spd, amp, ox, oy,
        accR: new Float32Array(N),
        accG: new Float32Array(N),
        accB: new Float32Array(N),
      };
    }

    function draw() {
      if (!mounted || !canvas) return;
      const state = stateRef.current;
      if (!state) { rafRef.current = requestAnimationFrame(draw); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const t = frameRef.current++ * 0.016;
      const { hx, hy, hwf, brf, ph, spd, amp, ox, oy, accR, accG, accB } = state;

      for (let k = 0; k < N; k++) {
        accR[k] *= TRAIL_KEEP;
        accG[k] *= TRAIL_KEEP;
        accB[k] *= TRAIL_KEEP;
      }

      const bSpd = 0.5 * BREATH;
      for (let i = 0; i < P; i++) {
        const hwVal = hwf[i];
        const u = t * bSpd * spd[i] + ph[i] * 6.28;
        const a = Math.pow(Math.max(Math.sin(u), 0), 0.9);
        const wob = (Math.sin(t * 1.3 + ph[i] * 40) + Math.cos(t * 1.9 + ph[i] * 23)) * 0.5;

        const sag = SORROW * 0.7 * a;
        const bx = hx[i] + wob * 0.7 * a;
        const by = hy[i] + sag;
        const hc = Math.min(1, Math.max(0, (hy[i] - HDR.miny) / HDR.bodyH));
        const emb = 0.82 + 0.18 * Math.sin(t * 2.2 + ph[i] * 30);
        const bcol = flameColor(0.16 + hc * 0.74, HEAT * 0.9);
        const fbr = brf[i] * BODYGLOW * emb * 0.5;

        const bxi = bx | 0, byi = by | 0;
        if (bxi >= 0 && bxi < W && byi >= 0 && byi < H) {
          const j = byi * W + bxi;
          accR[j] += bcol[0] * fbr;
          accG[j] += bcol[1] * fbr;
          accB[j] += bcol[2] * fbr;
        }

        if (hwVal > 0.12) {
          const life = ((t * spd[i] * RISE * 0.6 + ph[i]) % 1);
          const riseH = (34 + amp[i] * 60) * RISE * hwVal;
          const fl = Math.sin(t * 7 * FLICKER + ph[i] * 30) * 0.5 + Math.sin(t * 11 * FLICKER + ph[i] * 17) * 0.5;
          const sway = fl * (3 + amp[i] * 5) * FLICKER * life;
          const conv = (HDR.cx - hx[i]) * life * 0.22;
          const fx = (hx[i] + sway + conv) | 0;
          const fy = (hy[i] - life * riseH) | 0;
          if (fx >= 0 && fx < W && fy >= 0 && fy < H) {
            const fade = Math.pow(1 - life, 0.8);
            const col = flameColor(life, HEAT);
            const k = fade * FLAME * hwVal * 0.5;
            const j = fy * W + fx;
            accR[j] += col[0] * k;
            accG[j] += col[1] * k;
            accB[j] += col[2] * k;
          }
        }
      }

      const imageData = ctx.createImageData(W, H);
      const data = imageData.data;
      const u32 = new Uint32Array(data.buffer);
      u32.fill(0xFF000000);

      const cxw = W * 0.5, cyw = H * 0.5;
      for (let i = 0; i < N; i++) {
        const j = i * 4;
        const x = i % W, y = (i / W) | 0;
        let rr = accR[i], gg = accG[i], bb = accB[i];
        const gn = Math.random() * 3;
        rr += gn * 0.4; gg += gn * 0.4; bb += gn * 0.5;
        const vx = (x - cxw) / cxw, vy = (y - cyw) / cyw;
        const vig = 1 - (vx * vx + vy * vy) * 0.25;
        rr *= vig; gg *= vig; bb *= vig;
        data[j] = Math.min(255, Math.max(0, rr));
        data[j + 1] = Math.min(255, Math.max(0, gg));
        data[j + 2] = Math.min(255, Math.max(0, bb));
      }

      ctx.putImageData(imageData, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!builtRef.current) build();
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(draw);
        } else {
          cancelAnimationFrame(rafRef.current);
        }
      }
    }, { threshold: 0.01 });

    build();
    observer.observe(canvas);

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

const ACCENT = "#2e7fb8";

interface Props { onClick?: () => void; showTag?: boolean; artifact?: Artifact; }

export function HeadOnFireCard({ onClick, showTag, artifact }: Props) {
  const id = artifact?.id ?? "mock-headfire";
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
        <HeadOnFireRender className="absolute inset-0" />
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
          My Head Was Always on Fire
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "The thoughts never stopped burning. I just learned to stand inside the flame."
        </p>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#3d1d6e", color: "white", fontSize: "8px", fontWeight: 600 }}>
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
            73
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
