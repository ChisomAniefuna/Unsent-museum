import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import particleData from "../../imports/willow-grief-particles.json";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

// "The Willow Learned My Shape" — a black willow bends into a grieving face.
// Over a 15-second loop it shifts: calm → branches dissolve on the wind → tears
// fall from the eye into ripples → the particles drift back → a small green shoot
// returns. Canvas2D particle renderer ported from the standalone prototype tool,
// with the "grief cycle" preset pinned in. Imagery is baked into the 7 base64
// arrays in willow-grief-particles.json (see scripts/extract-willow-particles.mjs).

const W = 420, H = 475, N = W * H, P = 52000;
const EYX = 285, EYY = 218, FGX = 320, FGY = 413; // eye + seated-figure anchors

export interface WillowParams {
  dissolve: number; // 0..220, default 100
  wind: number;
  tears: number;
  ripples: number;
  regrowth: number;
  speed: number; // 30..200, default 100
}
export const WILLOW_DEFAULTS: WillowParams = {
  dissolve: 100, wind: 100, tears: 100, ripples: 100, regrowth: 100, speed: 100,
};

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function hash(x: number, y: number) {
  let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash(xi, yi), bb = hash(xi + 1, yi), cc = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  const ux = xf * xf * (3 - 2 * xf), uy = yf * yf * (3 - 2 * yf);
  return a * (1 - ux) * (1 - uy) + bb * ux * (1 - uy) + cc * (1 - ux) * uy + d * ux * uy;
}
function curlX(x: number, y: number, t: number) { return (vnoise(x, y + 0.5 + t) - vnoise(x, y - 0.5 + t)) * 2; }
function curlY(x: number, y: number, t: number) { return -(vnoise(x + 0.5, y + t) - vnoise(x - 0.5, y + t)) * 2; }

interface Tear { x: number; y: number; life: number; max: number; delay: number; phase: number; active: boolean; }

interface WillowData {
  count: number;
  hx: Uint16Array; hy: Uint16Array;
  cr: Uint8Array; cg: Uint8Array; cb: Uint8Array; tag: Uint8Array;
  ph: Float32Array; amp: Float32Array; sp: Float32Array;
}

// Static, image-baked data — decode once and share across every instance.
let DATA: WillowData | null = null;
function getData(): WillowData {
  if (DATA) return DATA;
  const d = particleData as Record<string, string>;
  let hx = new Uint16Array(0), hy = new Uint16Array(0);
  let cr = new Uint8Array(0), cg = new Uint8Array(0), cb = new Uint8Array(0), tag = new Uint8Array(0), rb = new Uint8Array(0);
  try {
    if (d.hx) { const b = b64ToBytes(d.hx); hx = new Uint16Array(b.buffer, b.byteOffset, (b.byteLength / 2) | 0); }
    if (d.hy) { const b = b64ToBytes(d.hy); hy = new Uint16Array(b.buffer, b.byteOffset, (b.byteLength / 2) | 0); }
    if (d.cr) cr = b64ToBytes(d.cr);
    if (d.cg) cg = b64ToBytes(d.cg);
    if (d.cb) cb = b64ToBytes(d.cb);
    if (d.tag) tag = b64ToBytes(d.tag);
    if (d.rb) rb = b64ToBytes(d.rb);
  } catch { /* placeholder / malformed data → count 0, renders black */ }
  const count = Math.min(P, hx.length, hy.length, cr.length, cg.length, cb.length, tag.length, rb.length);
  if (count < P) {
    // eslint-disable-next-line no-console
    console.warn(`[willow] particle data not loaded (${count}/${P}). Run: node scripts/extract-willow-particles.mjs <your-willow-grief.html>`);
  }
  const ph = new Float32Array(count), amp = new Float32Array(count), sp = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    ph[i] = (rb[i] / 255) * 6.2832;
    amp[i] = 0.3 + (rb[i] / 255) * 1.2;
    sp[i] = 0.5 + ((rb[i] % 100) / 100) * 0.8;
  }
  DATA = { count, hx, hy, cr, cg, cb, tag, ph, amp, sp };
  return DATA;
}

function makeTears(): Tear[] {
  const tears: Tear[] = [];
  for (let i = 0; i < 8; i++) {
    tears.push({ x: EYX + i * 1.5 - 5, y: EYY, life: 0, max: 2.5 + Math.random() * 2, delay: i * 0.45 + Math.random() * 0.3, phase: Math.random() * 6.28, active: false });
  }
  return tears;
}

export function WillowGriefRender({ className, params }: { className?: string; params?: Partial<WillowParams> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const lastRef = useRef(0);
  const tearsRef = useRef<Tear[]>(makeTears());
  const paramsRef = useRef<WillowParams>({ ...WILLOW_DEFAULTS, ...params });
  paramsRef.current = { ...WILLOW_DEFAULTS, ...params };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let mounted = true;

    function step(ctx: CanvasRenderingContext2D, buf: ImageData, t: number, dt: number) {
      const D = getData();
      const data = buf.data;
      const p = paramsRef.current;
      const spd = p.speed / 100;
      const loopT = (t % 15) / 15;
      const dissU = p.dissolve / 100, windU = p.wind / 100;
      const tearsU = p.tears / 100, ripU = p.ripples / 100, growU = p.regrowth / 100;
      const griefPeak = Math.min(1, Math.max(0, loopT < 0.2 ? 0 : loopT < 0.55 ? (loopT - 0.2) / 0.35 : loopT < 0.78 ? 1 : 1 - (loopT - 0.78) / 0.22));
      const griefHeavy = Math.max(0, griefPeak - 0.5) * 2;
      const returning = Math.max(0, (loopT - 0.78) / 0.22);

      // black background
      for (let i = 0; i < N; i++) { const o = i * 4; data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 255; }

      const { count, hx, hy, cr, cg, cb, tag, ph, amp, sp } = D;

      for (let i = 0; i < count; i++) {
        const tg = tag[i];
        let x = hx[i], y = hy[i] + 18;
        let r = cr[i], g = cg[i], bl = cb[i];
        const a = t * sp[i] + ph[i];

        if (tg === 1) {
          const edgeFactor = amp[i];
          const dissolveAmt = griefPeak * dissU * edgeFactor;
          const cx = curlX(hx[i] * 0.012, hy[i] * 0.012, t * 0.15) * dissolveAmt * 28 * windU;
          const cy = curlY(hx[i] * 0.012, hy[i] * 0.012, t * 0.15) * dissolveAmt * 22 * windU;
          const windPush = dissolveAmt * 45 * windU;
          x += cx + windPush - returning * windPush;
          y += cy - dissolveAmt * 8;
          x += Math.sin(a) * 0.5; y += Math.cos(a * 0.8) * 0.5;
          const alpha = 1 - dissolveAmt * 0.6 + returning * 0.5;
          if (alpha < 0.05) continue;
          r *= alpha; g *= alpha; bl *= alpha;
        } else if (tg === 0) {
          const edgeFactor = amp[i] * 0.3;
          const erode = griefPeak * dissU * edgeFactor * 0.4;
          x += Math.sin(a) * erode * 6; y += Math.cos(a * 0.9) * erode * 4;
          x += Math.sin(t * 0.4 + ph[i]) * 0.3; y += Math.cos(t * 0.35) * 0.3;
        } else if (tg === 3) {
          continue; // plant handled separately below
        } else if (tg === 4) {
          const tremble = griefPeak * 2.0;
          x += Math.sin(t * 8 + ph[i] * 3) * tremble; y += Math.cos(t * 6 + ph[i] * 2) * tremble * 0.6;
          r = Math.min(r, 40); g = Math.min(g, 40); bl = Math.min(bl, 40);
        } else if (tg === 5) {
          x += Math.sin(t * 0.3 + x * 0.05) * 0.5; y += Math.sin(t * 0.25 + x * 0.03) * 0.3;
        } else {
          continue; // background paper particles
        }

        const ix = x | 0, iy = y | 0;
        if (ix < 6 || ix >= W - 6 || iy < 6 || iy >= H - 6) continue;
        const o = (iy * W + ix) * 4;
        const ir = (255 - r) * 0.85, ig = (255 - g) * 0.85, ib = (255 - bl) * 0.85;
        data[o] = Math.min(255, data[o] + ir); data[o + 1] = Math.min(255, data[o + 1] + ig); data[o + 2] = Math.min(255, data[o + 2] + ib);
        for (let dd = 0; dd < 4; dd++) {
          const nx = ix + (dd < 2 ? -1 + dd * 2 : 0), ny = iy + (dd < 2 ? 0 : -3 + dd * 2);
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const o2 = (ny * W + nx) * 4; const k = 0.3;
          data[o2] = Math.min(255, data[o2] + ir * k); data[o2 + 1] = Math.min(255, data[o2 + 1] + ig * k); data[o2 + 2] = Math.min(255, data[o2 + 2] + ib * k);
        }
      }

      // plant: direct bright green→brown→green
      for (let i = 0; i < count; i++) {
        if (tag[i] !== 3) continue;
        const x = hx[i] + Math.sin(t * 0.6) * 0.5, y = hy[i] + 18 + Math.sin(t * 0.4) * 0.3;
        const ix = x | 0, iy = y | 0;
        if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
        const greenPhase = 1 - griefPeak * 0.8 * growU;
        const pr = 60 + griefPeak * 120 * growU, pg = 200 * greenPhase + 50, pb = 40 + griefPeak * 25;
        const o = (iy * W + ix) * 4;
        data[o] = Math.min(255, data[o] + pr * 1.1); data[o + 1] = Math.min(255, data[o + 1] + pg * 1.1); data[o + 2] = Math.min(255, data[o + 2] + pb * 1.1);
        for (let dd = 0; dd < 4; dd++) {
          const nx = ix + (dd < 2 ? -1 + dd * 2 : 0), ny = iy + (dd < 2 ? 0 : -3 + dd * 2);
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const o2 = (ny * W + nx) * 4;
          data[o2] = Math.min(255, data[o2] + pr * 0.45); data[o2 + 1] = Math.min(255, data[o2 + 1] + pg * 0.45); data[o2 + 2] = Math.min(255, data[o2 + 2] + pb * 0.45);
        }
      }

      // tears
      const tearRate = 0.3 + griefPeak * 1.5 * tearsU;
      const tearR = 40 + griefHeavy * 160, tearG = 30 + griefHeavy * 20, tearB = 255 - griefHeavy * 100;
      for (const td of tearsRef.current) {
        if (!td.active) { td.delay -= dt * spd * tearRate; if (td.delay <= 0) { td.active = true; td.life = 0; td.y = EYY; td.x = EYX + (Math.random() - 0.5) * 6; } }
        if (!td.active) continue;
        td.life += dt * spd;
        td.y += 1.8 + td.life * 1.2;
        td.x += Math.sin(td.phase + td.life * 2) * 0.3;
        if (td.life > td.max || td.y > H + 10) { td.active = false; td.delay = 0.3 + Math.random() * 0.4 / Math.max(0.3, tearRate); td.y = EYY; continue; }
        const ix = td.x | 0, iy = td.y | 0;
        const size = 2 + td.life * 0.5;
        for (let dy = -size; dy <= size; dy++) for (let dx = -size * 0.6; dx <= size * 0.6; dx++) {
          const nx = ix + dx | 0, ny = iy + dy | 0; if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const d2 = (dx * dx / (size * 0.6 * size * 0.6) + dy * dy / (size * size));
          if (d2 > 1) continue;
          const bright = (1 - d2) * 0.8;
          const o = (ny * W + nx) * 4;
          data[o] = Math.min(255, data[o] + tearR * bright); data[o + 1] = Math.min(255, data[o + 1] + tearG * bright); data[o + 2] = Math.min(255, data[o + 2] + tearB * bright);
        }
      }

      // ripples around the seated figure
      if (ripU > 0) {
        const baseAlpha = 0.15 + griefPeak * 0.45;
        const nRings = 5;
        for (let ri = 0; ri < nRings; ri++) {
          const ringT = ((t * 0.22 + ri / nRings) % 1);
          const radius = 8 + ringT * 90 * ripU;
          const fade = (1 - ringT) * (0.3 + ringT * 0.7);
          const alpha = fade * baseAlpha * ripU;
          if (alpha < 0.01) continue;
          const steps = Math.ceil(radius * 8);
          for (let s2 = 0; s2 < steps; s2++) {
            const ang = s2 / steps * 6.2832;
            const rx = FGX + Math.cos(ang) * radius, ry = FGY + Math.sin(ang) * radius * 0.25;
            for (let thick = -1; thick <= 1; thick++) {
              const ix = rx | 0, iy = (ry + thick) | 0;
              if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
              const tw = (thick === 0) ? 1.0 : 0.35;
              const o = (iy * W + ix) * 4;
              data[o] = Math.min(255, data[o] + alpha * tw * 180);
              data[o + 1] = Math.min(255, data[o + 1] + alpha * tw * 180);
              data[o + 2] = Math.min(255, data[o + 2] + alpha * tw * 170);
            }
          }
        }
      }

      // vignette
      const cxw = W * 0.5, cyw = H * 0.5;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const rx = (x - cxw) / cxw, ry = (y - cyw) / cyw;
        const vig = 1 - (rx * rx + ry * ry) * 0.18;
        const o = (y * W + x) * 4;
        data[o] *= vig; data[o + 1] *= vig; data[o + 2] *= vig;
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
      tRef.current += dt * (paramsRef.current.speed / 100);
      step(ctx, buf, tRef.current, dt);
      rafRef.current = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          cancelAnimationFrame(rafRef.current);
          lastRef.current = performance.now();
          rafRef.current = requestAnimationFrame(draw);
        } else {
          cancelAnimationFrame(rafRef.current);
        }
      }
    }, { threshold: 0.01 });

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
      style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", background: "#000" }}
    />
  );
}

const ACCENT = "#7c74a6";

interface Props { onClick?: () => void; showTag?: boolean; artifact?: Artifact; }

export function WillowGriefCard({ onClick, showTag, artifact }: Props) {
  const id = artifact?.id ?? "mock-grief-willow";
  const liked = useLiked(id);
  const likes = likeCount(artifact?.likes ?? 0, liked);
  const [hovered, setHovered] = useState(false);

  function handleLike(e: React.MouseEvent) { e.stopPropagation(); toggleLike(id); }
  function handleShare(e: React.MouseEvent) { e.stopPropagation(); navigator.clipboard?.writeText(window.location.origin + "/exhibit/grief"); }

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
        <WillowGriefRender className="absolute inset-0" />
        {showTag && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <span
              className="px-2.5 py-1 rounded-full text-xs capitalize tracking-wider"
              style={{ background: `${ACCENT}25`, border: `1px solid ${ACCENT}40`, color: ACCENT, backdropFilter: "blur(8px)" }}
            >
              grief
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "0.95rem", fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>
          The Willow Learned My Shape
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "The grief got taller than me. It bent over anyway, and let one green thing keep breathing."
        </p>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#1e2215", color: "white", fontSize: "8px", fontWeight: 600 }}>
            ?
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Anonymous Visitor</span>
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Jun 27, 2026</span>
        </div>

        <div className="flex items-center gap-3 pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={handleLike} className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: liked ? "#ff6b7a" : "rgba(255,255,255,0.3)" }}>
            <Heart size={13} fill={liked ? "#ff6b7a" : "none"} />
            {likes}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Share2 size={13} />
            {artifact?.shares ?? 0}
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
