import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import particleData from "../../imports/shout-glass-particles.json";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

// Suppressed pain, rage, anguish: a face inside a cracked glass disc. The mouth
// presses open, screams, peaks, then releases as the glass fractures and trembles.
// Canvas particle renderer ported from the standalone tool with control sliders
// pinned to their default values.

const HDR = particleData.HDR as {
  W: number; H: number; P: number;
  fcx: number; fcy: number; rx: number; ry: number; mouthx: number; mouthy: number;
};
const W = HDR.W, H = HDR.H, N = W * H, P = HDR.P;
const MX = HDR.mouthx, FCX = HDR.fcx, FCY = HDR.fcy, RX = HDR.rx, RY = HDR.ry;
const MOY = FCY + RY * 0.142;
const CRX = FCX, CRY = FCY + RY * 0.04, CRAD = Math.max(RX, RY) * 1.16;

const WHITE = [236, 240, 255], BLUE = [120, 165, 255], PURPLE = [180, 110, 255];

// control defaults: speed92 mouth115 anger60 cracks95 tremble65 red75 palette30 glow122 trails82 chroma14
const PAL = 0.30, MOUTH_U = 1.15, ANGER_U = 0.60, CRACK_U = 0.95, TREM_U = 0.65, RED_U = 0.75;
const GLOW = 1.22, T_USER = 0.82, CHROMA_U = 0.14, SPEED = 1.2;

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Crack { x0: number; y0: number; x1: number; y1: number; d: number; br: number; }

function genCracks(): Crack[] {
  const cracks: Crack[] = [];
  const rnd = mulberry32(20240611);
  function grow(x: number, y: number, ang: number, dist: number, budget: number, depth: number) {
    let steps = budget;
    while (steps-- > 0) {
      const len = 7 + rnd() * 8; const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
      const dd = Math.hypot(nx - CRX, ny - CRY); const d = Math.min(1, dd / CRAD);
      cracks.push({ x0: x, y0: y, x1: nx, y1: ny, d, br: 0.55 + rnd() * 0.55 }); x = nx; y = ny; dist += len; ang += (rnd() - 0.5) * 0.5;
      if (Math.hypot(x - CRX, y - CRY) > CRAD * 1.02) break;
      if (depth < 2 && rnd() < 0.10) { grow(x, y, ang + (rnd() - 0.5) * 1.6, dist, Math.floor(budget * 0.55), depth + 1); }
    }
  }
  const main = 10;
  for (let i = 0; i < main; i++) { const ang = (i / main) * Math.PI * 2 + (rnd() - 0.5) * 0.3; grow(MX + (rnd() - 0.5) * 5, MOY + (rnd() - 0.5) * 5, ang, 0, 30, 0); }
  for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, r = 50 + rnd() * CRAD * 0.6; grow(CRX + Math.cos(a) * r, CRY + Math.sin(a) * r, a + 1.4, r, 12, 1); }
  return cracks;
}

const PH: [string, number][] = [["STILL", 1.5], ["PRESSURE", 1.6], ["SCREAM", 1.5], ["PEAK", 1.6], ["RELEASE", 1.7], ["RESET", 1.1]];
const TOTAL = PH.reduce((s, p) => s + p[1], 0);
function phaseAt(time: number) {
  let tt = time % TOTAL, acc = 0;
  for (let i = 0; i < PH.length; i++) { if (tt < acc + PH[i][1]) return { name: PH[i][0], p: (tt - acc) / PH[i][1] }; acc += PH[i][1]; }
  return { name: "RESET", p: 1 };
}
function smooth(u: number) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }

interface ShaderState {
  hx: Uint16Array; hy: Uint16Array;
  pcR: Float32Array; pcG: Float32Array; pcB: Float32Array;
  jawf: Float32Array; ph: Float32Array; shard: Uint8Array; upper: Float32Array;
  evx: Float32Array; evy: Float32Array; drnk: Float32Array;
  accR: Float32Array; accG: Float32Array; accB: Float32Array;
  cracks: Crack[];
}

export function ShoutBehindGlassRender({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ShaderState | null>(null);
  const rafRef = useRef<number>(0);
  const builtRef = useRef(false);
  const tRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mounted = true;

    function build() {
      if (builtRef.current) return;
      builtRef.current = true;

      const hxBytes = b64ToBytes(particleData.hx);
      const hyBytes = b64ToBytes(particleData.hy);
      const hx = new Uint16Array(hxBytes.buffer, hxBytes.byteOffset, (hxBytes.byteLength / 2) | 0);
      const hy = new Uint16Array(hyBytes.buffer, hyBytes.byteOffset, (hyBytes.byteLength / 2) | 0);
      const br = b64ToBytes(particleData.br);
      const jaw = b64ToBytes(particleData.jaw);
      const rb1 = b64ToBytes(particleData.rb1);
      const rb2 = b64ToBytes(particleData.rb2);

      const pcR = new Float32Array(P), pcG = new Float32Array(P), pcB = new Float32Array(P);
      const brI = new Float32Array(P), jawf = new Float32Array(P), ph = new Float32Array(P), shard = new Uint8Array(P), upper = new Float32Array(P);
      for (let i = 0; i < P; i++) { brI[i] = br[i] / 255; jawf[i] = jaw[i] / 255; ph[i] = (rb2[i] / 255) * Math.PI * 2; shard[i] = rb1[i] < 46 ? 1 : 0; upper[i] = Math.max(0, (FCY - hy[i]) / RY); }
      const evx = new Float32Array(P), evy = new Float32Array(P), drnk = new Float32Array(P);
      for (let i = 0; i < P; i++) {
        const dx = hx[i] - FCX, dy = hy[i] - CRY, d = Math.hypot(dx, dy) + 0.001; const spd = 0.7 + (rb1[i] / 255) * 1.3;
        evx[i] = (dx / d) * spd + (rb2[i] / 255 - 0.5) * 0.9; evy[i] = (dy / d) * spd + (rb1[i] / 255 - 0.5) * 0.9 - 0.2; drnk[i] = (rb2[i] * 0.6 + rb1[i] * 0.4) / 255;
      }
      // palette (bias = PAL)
      for (let i = 0; i < P; i++) {
        let r = rb1[i] / 255; r = Math.max(0, Math.min(1, r + (PAL - 0.5) * 0.9));
        let c0, c1, u; if (r < 0.5) { c0 = WHITE; c1 = BLUE; u = r / 0.5; } else { c0 = BLUE; c1 = PURPLE; u = (r - 0.5) / 0.5; }
        const bb = 0.08 + 1.5 * brI[i] * brI[i];
        pcR[i] = (c0[0] + (c1[0] - c0[0]) * u) * bb; pcG[i] = (c0[1] + (c1[1] - c0[1]) * u) * bb; pcB[i] = (c0[2] + (c1[2] - c0[2]) * u) * bb;
      }

      stateRef.current = {
        hx, hy, pcR, pcG, pcB, jawf, ph, shard, upper, evx, evy, drnk,
        accR: new Float32Array(N), accG: new Float32Array(N), accB: new Float32Array(N),
        cracks: genCracks(),
      };
    }

    function step(ctx: CanvasRenderingContext2D, buf: ImageData, time: number) {
      const state = stateRef.current;
      if (!state) return;
      const { hx, hy, pcR, pcG, pcB, jawf, ph, shard, upper, evx, evy, drnk, accR, accG, accB, cracks } = state;
      const data = buf.data;

      const pz = phaseAt(time), name = pz.name, p = pz.p;
      const mouthU = MOUTH_U, angerU = ANGER_U, crackU = CRACK_U, tremU = TREM_U;
      const redU = RED_U, glow = GLOW, tUser = T_USER, cu = CHROMA_U;
      let openAmt = 0, reveal = 0, crackAlpha = 0, tremble = 0, redGlow = 0, shake = 0, chrom = 0.3 * cu, furrow = 0;
      if (name === "STILL") { redGlow = 0.0; }
      else if (name === "PRESSURE") { openAmt = 0.28 * smooth(p); reveal = 0.18 * smooth(p); crackAlpha = 0.5 * smooth(p); tremble = 0.25 * p; redGlow = 0.08 + 0.18 * p; shake = 1.0 * p; chrom = (0.6 + 1.2 * p) * cu; furrow = 0.4 * p; }
      else if (name === "SCREAM") { openAmt = 0.28 + 0.5 * smooth(p); reveal = 0.18 + 0.45 * smooth(p); crackAlpha = 0.85; tremble = 0.45 + 0.35 * p; redGlow = 0.35 + 0.22 * p; shake = 2.4 * p; chrom = (1 + 2.2 * p) * cu; furrow = 0.7 + 0.3 * p; }
      else if (name === "PEAK") { openAmt = Math.min(1.0, 0.9 + 0.1 * Math.abs(Math.sin(time * 16))); reveal = 0.63 + 0.37 * smooth(p); crackAlpha = 1.0; tremble = 0.95; redGlow = 0.62; shake = 5; chrom = (2.4 + 2.4 * Math.abs(Math.sin(time * 18))) * cu; furrow = 1.0; }
      else if (name === "RELEASE") { openAmt = 0.9 * (1 - smooth(p)); reveal = 1.0; crackAlpha = 1.0 - 0.55 * smooth(p); tremble = 0.55 * (1 - p); redGlow = 0.42 * (1 - p); shake = 2.5 * (1 - p); chrom = (1.6 * (1 - p) + 0.3) * cu; furrow = 0.7 * (1 - p); }
      else { openAmt = 0.24 * (1 - smooth(p)); reveal = 1.0; crackAlpha = 0.4 * (1 - smooth(p)); tremble = 0.1 * (1 - p); redGlow = 0.04 * (1 - p); furrow = 0.1 * (1 - p); }
      tremble *= tremU; shake *= tremU; furrow *= angerU; reveal = Math.min(1, reveal);
      let explode = 0, dissolve = 0;
      if (name === "PEAK") { explode = 0.45 * smooth(p); dissolve = 0.45 * smooth(p); }
      else if (name === "RELEASE") { explode = 0.45 + 1.6 * smooth(p); dissolve = 0.45 + 0.55 * smooth(p); }
      else if (name === "RESET") { explode = 2.0 * (1 - smooth(p)); dissolve = 1.0 * (1 - smooth(p)); }
      let keep = name === "PEAK" ? 0.84 : (name === "SCREAM" ? 0.78 : (name === "RELEASE" ? 0.88 : (name === "RESET" ? 0.80 : 0.55))); keep = Math.min(0.93, keep * tUser);
      for (let k = 0; k < N; k++) { accR[k] *= keep; accG[k] *= keep; accB[k] *= keep; }

      const mouthW = RX * 0.34;
      const openH = openAmt * RY * 0.34;
      const topEdge = MOY - openH * 0.30, botEdge = MOY + openH * 0.70;
      const mcY = (topEdge + botEdge) / 2, halfH = Math.max(1, (botEdge - topEdge) / 2);
      const chinDrop = openAmt * RY * 0.20 * mouthU;

      function addDot(x: number, y: number, r: number, g: number, b: number) {
        const ix = x | 0, iy = y | 0; if (ix < 0 || ix >= W || iy < 0 || iy >= H) return;
        const j = iy * W + ix; accR[j] += r; accG[j] += g; accB[j] += b;
      }
      function drawSeg(x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number) {
        const dx = x1 - x0, dy = y1 - y0; const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
        for (let s = 0; s <= steps; s++) { const t = s / steps; const px = x0 + dx * t, py = y0 + dy * t; if (Math.hypot(px - CRX, py - CRY) <= CRAD * 1.01) addDot(px, py, r, g, b); }
      }

      for (let i = 0; i < P; i++) {
        if (dissolve > 0 && drnk[i] < dissolve * 1.02) continue;
        let x = hx[i], y = hy[i]; const ox0 = x, oy0 = y;
        const a = time * 1.6 + ph[i]; x += Math.sin(a) * 1.7 + Math.sin(time * 0.85 + ph[i] * 1.7) * 1.1; y += Math.cos(a * 0.9) * 1.7 + Math.cos(time * 0.7 + ph[i] * 1.3) * 1.1;
        const dxm = ox0 - MX; let horiz = 0; const aw = Math.abs(dxm) / mouthW; if (aw < 1.2) horiz = 1 - Math.min(1, aw * aw);
        if (horiz > 0 && openH > 1) {
          if (oy0 <= MOY) { y -= horiz * openH * 0.30; }
          else { y += horiz * openH * 0.85 + chinDrop * jawf[i]; }
        } else { y += jawf[i] * chinDrop; }
        if (furrow > 0) { y += upper[i] * furrow * 4.0; x += (FCX - x) * upper[i] * furrow * 0.04; }
        if (tremble > 0) {
          const tr = tremble * 1.3 * (shard[i] ? 2.0 : 1.0);
          x += Math.sin(time * 44 + ph[i] * 7) * tr; y += Math.cos(time * 41 + ph[i] * 5) * tr;
          if (shard[i] && name === "PEAK") { const dx = x - FCX, dy = y - FCY, d = Math.hypot(dx, dy) + 0.001; x += dx / d * tremble * 1.6; y += dy / d * tremble * 1.6; }
        }
        if (explode > 0) { x += evx[i] * explode * 72; y += evy[i] * explode * 72 + explode * explode * 30; }
        addDot(x, y, pcR[i] * 0.5 * glow, pcG[i] * 0.5 * glow, pcB[i] * 0.5 * glow);
      }
      // cracks
      if (crackAlpha > 0.01 && crackU > 0) {
        const sh = name === "PEAK" || name === "SCREAM" ? Math.sin(time * 30) * tremble * 1.0 : 0;
        for (let i = 0; i < cracks.length; i++) {
          const cseg = cracks[i]; if (cseg.d > reveal) continue;
          const edge = 1 - Math.min(1, (reveal - cseg.d) / 0.12); const base = (0.5 + edge * 0.9) * cseg.br * crackAlpha * crackU;
          const near = Math.max(0, 1 - cseg.d * 1.6);
          const r = (150 + 70 * near * redU) * base, g = (190 - 40 * near) * base, bb = (255 - 60 * near) * base;
          drawSeg(cseg.x0 + sh, cseg.y0, cseg.x1 + sh, cseg.y1, r * 0.5, g * 0.5, bb * 0.5);
        }
      }

      const caInt = Math.round(chrom), sX = shake ? ((Math.random() - 0.5) * shake) | 0 : 0, sY = shake ? ((Math.random() - 0.5) * shake) | 0 : 0;
      for (let y = 0; y < H; y++) {
        let yy = y + sY; if (yy < 0) yy = 0; else if (yy >= H) yy = H - 1; const row = yy * W;
        for (let x = 0; x < W; x++) {
          let xr = x + sX + caInt, xg = x + sX, xb = x + sX - caInt;
          if (xr < 0) xr = 0; else if (xr >= W) xr = W - 1; if (xg < 0) xg = 0; else if (xg >= W) xg = W - 1; if (xb < 0) xb = 0; else if (xb >= W) xb = W - 1;
          let R = accR[row + xr], G = accG[row + xg], B = accB[row + xb];
          if (openAmt > 0.05) {
            const ex = (x - MX) / mouthW, ey = (y - mcY) / halfH, rr = ex * ex + ey * ey;
            if (rr < 1.2) {
              const inn = Math.max(0, 1 - rr); const carve = Math.min(1, inn * 1.5);
              R *= 1 - 0.85 * carve; G *= 1 - 0.9 * carve; B *= 1 - 0.9 * carve;
              const throat = inn * (0.6 + 0.4 * Math.abs(Math.sin(time * 15))); const t2 = throat * redGlow * 95 * redU;
              R += t2; G += t2 * 0.08; B += t2 * 0.06;
            }
          }
          if (redGlow > 0.02) { const dx = x - MX, dy = y - (MOY + 14 * openAmt), d2 = dx * dx + dy * dy; const sig = 20 + 30 * openAmt; const gg = Math.exp(-d2 / (2 * sig * sig)) * redGlow * 26 * redU; R += gg; G += gg * 0.12; B += gg * 0.10; }
          const gn = Math.random() * 3.2; R += gn * 0.5; G += gn * 0.5; B += gn * 0.6;
          const dxc = x - CRX, dyc = y - CRY, dist = Math.sqrt(dxc * dxc + dyc * dyc); let cf = 1.0; if (dist > CRAD + 5) { cf = 1 - (dist - (CRAD + 5)) / 9; if (cf < 0) cf = 0; }
          R *= cf; G *= cf; B *= cf;
          if (R < 0) R = 0; else if (R > 255) R = 255; if (G < 0) G = 0; else if (G > 255) G = 255; if (B < 0) B = 0; else if (B > 255) B = 255;
          const o = (y * W + x) * 4; data[o] = R; data[o + 1] = G; data[o + 2] = B; data[o + 3] = 255;
        }
      }
      ctx.putImageData(buf, 0, 0);
    }

    function draw(now: number) {
      if (!mounted || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const buf = ctx.createImageData(W, H);
      let dt = Math.min(0.05, (now - lastRef.current) / 1000); lastRef.current = now;
      if (!isFinite(dt) || dt < 0) dt = 0.016;
      tRef.current += dt * SPEED;
      step(ctx, buf, tRef.current);
      rafRef.current = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!builtRef.current) build();
          cancelAnimationFrame(rafRef.current);
          lastRef.current = performance.now();
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

const ACCENT = "#5e8fc4";

interface Props { onClick?: () => void; showTag?: boolean; artifact?: Artifact; }

export function ShoutBehindGlassCard({ onClick, showTag, artifact }: Props) {
  const id = artifact?.id ?? "mock-shout";
  const liked = useLiked(id);
  const likes = likeCount(artifact?.likes ?? 0, liked);
  const [hovered, setHovered] = useState(false);

  function handleLike(e: React.MouseEvent) { e.stopPropagation(); toggleLike(id); }
  function handleShare(e: React.MouseEvent) { e.stopPropagation(); navigator.clipboard?.writeText(window.location.origin + "/exhibit/regret"); }

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
        <ShoutBehindGlassRender className="absolute inset-0" />
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
          Everything I Never Got to Scream
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "I held it in so long the silence started to crack the glass."
        </p>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#1d3a5c", color: "white", fontSize: "8px", fontWeight: 600 }}>
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
            91
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
