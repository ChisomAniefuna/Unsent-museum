import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import particleData from "../../imports/smoking-particles.json";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

// A woman by a window, her silhouette held together by sparkling sparks. She
// raises her hand to smoke; sparks drift off as she dissolves; smoke climbs from
// the ember. Canvas particle renderer ported from the standalone tool with the
// "regret" preset pinned in.

const W = 400, H = 500, N = W * H, P = 46000, SMX = 229, SMY = 200, PIVY = 366, HOR = 230;

// "regret" preset: sparks160 shimmer80 dissolve60 breath80 smoke110 scene100 wind70 glitch40 trails50
const SPARKS_U = 1.60, SHIM_U = 0.80, DISS_U = 0.60, BREATH_U = 0.80;
const SMOKE_U = 1.10, SCENE_U = 1.00, WIND_U = 0.70, GLITCH_U = 0.40, TRAILS_U = 0.50;
const SPEED = 1.3; // overall animation pace (arm raise, breath, shimmer)
const SMN = 200;

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function hash(x: number, y: number) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
function vnoise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash(xi, yi), bb = hash(xi + 1, yi), cc = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); const ux = xf * xf * (3 - 2 * xf), uy = yf * yf * (3 - 2 * yf);
  return a * (1 - ux) * (1 - uy) + bb * ux * (1 - uy) + cc * (1 - ux) * uy + d * ux * uy;
}

interface Smoke { x: number; y: number; life: number; max: number; seed: number; vx: number; w: number; }
function spawn(p: Smoke) { p.x = SMX + (Math.random() - 0.5) * 3; p.y = SMY + (Math.random() - 0.5) * 2; p.life = 0; p.max = 0.8 + Math.random() * 0.8; p.seed = Math.random() * 1000; p.vx = (Math.random() - 0.5) * 0.15; p.w = 0.4 + Math.random() * 0.5; }

interface ShaderState {
  hx: Uint16Array; hy: Uint16Array; cr: Uint8Array; cg: Uint8Array; cb: Uint8Array; tag: Uint8Array; br: Uint8Array;
  ph: Float32Array; amp: Float32Array; sp: Float32Array; isArm: Uint8Array; armW: Float32Array;
  accR: Float32Array; accG: Float32Array; accB: Float32Array;
  SM: Smoke[];
}

export function SmokingSilhouetteRender({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ShaderState | null>(null);
  const rafRef = useRef<number>(0);
  const builtRef = useRef(false);
  const tRef = useRef(0);
  const lastRef = useRef(0);
  const puffRef = useRef(0);

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
      const cr = b64ToBytes(particleData.cr), cg = b64ToBytes(particleData.cg), cb = b64ToBytes(particleData.cb);
      const tag = b64ToBytes(particleData.tag), rb = b64ToBytes(particleData.rb), br = b64ToBytes(particleData.br);

      const ph = new Float32Array(P), amp = new Float32Array(P), sp = new Float32Array(P), isArm = new Uint8Array(P), armW = new Float32Array(P);
      for (let i = 0; i < P; i++) {
        ph[i] = (rb[i] / 255) * 6.2832;
        amp[i] = 0.4 + (rb[i] / 255) * 1.4;
        sp[i] = 0.6 + (((rb[i] * 7) % 100) / 100) * 0.8;
        const x = hx[i], y = hy[i];
        if ((tag[i] === 0 || tag[i] === 1) && x >= 185 && x <= 255 && y >= 180 && y <= 345) {
          isArm[i] = 1;
          armW[i] = Math.max(0, Math.min(1, 1 - (y - 180) / 165));
        }
      }

      const SM: Smoke[] = [];
      for (let i = 0; i < SMN; i++) { const p = {} as Smoke; spawn(p); p.life = Math.random() * p.max; SM.push(p); }

      stateRef.current = {
        hx, hy, cr, cg, cb, tag, br, ph, amp, sp, isArm, armW,
        accR: new Float32Array(N), accG: new Float32Array(N), accB: new Float32Array(N),
        SM,
      };
    }

    function step(ctx: CanvasRenderingContext2D, buf: ImageData, t: number, dt: number) {
      const state = stateRef.current;
      if (!state) return;
      const { hx, hy, cr, cg, cb, tag, br, ph, amp, sp, isArm, armW, accR, accG, accB, SM } = state;
      const data = buf.data;

      const sparksU = SPARKS_U, shimU = SHIM_U, dissU = DISS_U;
      const breathU = BREATH_U, smokeU = SMOKE_U, sceneU = SCENE_U;
      const windU = WIND_U, glitchU = GLITCH_U, trailsU = TRAILS_U;

      const keep = Math.min(0.88, trailsU * 0.88);
      for (let k = 0; k < N; k++) { accR[k] *= keep; accG[k] *= keep; accB[k] *= keep; }

      const breath = Math.sin(t * 0.7) * 0.5 + Math.sin(t * 0.32) * 0.5;
      const scaleB = 1 + 0.008 * breathU * breath;
      const wnd = Math.sin(t * 0.9) * 0.5 + Math.sin(t * 0.34 + 1.4) * 0.5;

      const cyc = t * 0.16;
      const rawLift = Math.pow(Math.max(0, Math.sin(cyc)), 3.0);
      const lift = rawLift * 14;
      const isPuff = rawLift > 0.85;
      if (isPuff && puffRef.current <= 0) { puffRef.current = 0.4; for (let k = 0; k < 18; k++) { const p = {} as Smoke; spawn(p); p.w = 0.8 + Math.random() * 0.5; SM.push(p); } }
      puffRef.current -= dt;

      const glitchLines: { y: number; dx: number }[] = [];
      const glitchFlick = Math.random() < 0.015 * glitchU;
      if (Math.random() < 0.025 * glitchU) {
        const ny = 2 + Math.floor(Math.random() * 6); const sy = (Math.random() * H) | 0;
        const dx = ((Math.random() - 0.5) * 14 * glitchU) | 0;
        for (let k = 0; k < ny; k++) glitchLines.push({ y: sy + k, dx });
      }

      function dep(x: number, y: number, r: number, g: number, bl: number) {
        const ix = x | 0, iy = y | 0; if (ix < 1 || ix >= W - 1 || iy < 1 || iy >= H - 1) return; const j = iy * W + ix;
        accR[j] += r; accG[j] += g; accB[j] += bl;
        const k = 0.28; accR[j + 1] += r * k; accG[j + 1] += g * k; accB[j + 1] += bl * k; accR[j - 1] += r * k; accG[j - 1] += g * k; accB[j - 1] += bl * k;
        accR[j + W] += r * k; accG[j + W] += g * k; accB[j + W] += bl * k; accR[j - W] += r * k; accG[j - W] += g * k; accB[j - W] += bl * k;
      }

      for (let i = 0; i < P; i++) {
        const tg = tag[i]; let x = hx[i], y = hy[i];
        const a = t * sp[i] + ph[i];
        const r = cr[i], g = cg[i], bl = cb[i];

        if (tg === 0) {
          const sh = shimU * amp[i] * 0.7;
          x += Math.sin(a) * sh; y += Math.cos(a * 0.9) * sh;
          y = PIVY + (y - PIVY) / scaleB;
          if (isArm[i]) { y -= lift * armW[i]; }
          const diss = dissU * amp[i] * 0.5;
          if (diss > 0.01) {
            const dx = Math.sin(t * 0.6 + ph[i] * 5) * diss * 1.5;
            const dy = -Math.abs(Math.cos(t * 0.5 + ph[i] * 3)) * diss * 1.0;
            x += dx; y += dy;
          }
          if (glitchFlick) { x += (Math.random() - 0.5) * 2.5 * glitchU; y += (Math.random() - 0.5) * 1.8 * glitchU; }
          const brv = br[i] / 255;
          const twk = 0.7 + 0.4 * Math.sin(t * 3 + ph[i] * 8);
          const gg = sparksU * twk * (0.45 + 0.35 * brv);
          dep(x, y, r * gg, g * gg, bl * gg);
        } else if (tg === 1) {
          const sh = shimU * amp[i] * 0.4;
          x += Math.sin(a) * sh; y += Math.cos(a) * sh;
          y = PIVY + (y - PIVY) / scaleB;
          if (isArm[i]) { y -= lift * armW[i]; }
          const brv = br[i] / 255;
          const twk = 0.55 + 0.35 * Math.sin(t * 2 + ph[i] * 6);
          const gg = sparksU * twk * (0.18 + 0.55 * brv * brv);
          dep(x, y, r * gg, g * gg, bl * gg);
        } else if (tg === 2) {
          if (hy[i] > 370) continue;
          const hf = Math.max(0, (HOR + 14 - hy[i])) / 80;
          x += (wnd + Math.sin(t * 1.4 + ph[i])) * windU * hf * 8;
          y += Math.sin(a) * 0.3;
          const g2 = sceneU * 0.40;
          dep(x, y, r * g2, g * g2, bl * g2);
        } else {
          if (hy[i] > 365) continue;
          x += Math.sin(a * 0.35) * 0.4 * windU; y += Math.cos(a * 0.25) * 0.3 * windU;
          const g2 = sceneU * 0.30;
          dep(x, y, r * g2, g * g2, bl * g2);
        }
      }

      // ---- procedural hand + forearm (volumetric sparks) ----
      function depHand(px: number, py: number, bright: number) {
        const armH = Math.max(0, Math.min(1, (280 - py) / 85));
        py -= lift * armH * 0.7;
        py = PIVY + (py - PIVY) / scaleB;
        px += Math.sin(t * 1.1 + px * 0.3) * shimU * 0.25;
        py += Math.cos(t * 0.9 + py * 0.2) * shimU * 0.25;
        const twk = 0.6 + 0.4 * Math.sin(t * 3 + (px + py) * 0.2);
        const gg = sparksU * twk * bright;
        const warm = py < 240 ? 1.05 : 0.95;
        dep(px, py, 225 * gg * warm, 218 * gg, 200 * gg * (2 - warm));
      }
      // forearm
      for (let yy = 275; yy <= 340; yy += 1.3) {
        const tt = (yy - 275) / 65; const cx = 218 + tt * 16; const w = 3.5 + tt * 1.5; const bright = 0.28 + 0.12 * (1 - tt);
        for (let dx = -w; dx <= w; dx += 1.3) { const edge = Math.abs(dx) / w; depHand(cx + dx, yy, bright * (1 - 0.3 * edge)); }
      }
      // wrist
      for (let yy = 260; yy <= 275; yy += 1.2) { const cx = 217; const w = 3.2; for (let dx = -w; dx <= w; dx += 1.2) depHand(cx + dx, yy, 0.32); }
      // palm (closed fist)
      for (let yy = 232; yy <= 260; yy += 1.1) {
        const tt = (yy - 232) / 28; const cx = 221; const w = 6 + Math.sin(tt * Math.PI) * 3; const bright = 0.38 + 0.15 * Math.sin(tt * Math.PI);
        for (let dx = -w; dx <= w; dx += 1.1) { const edge = Math.abs(dx) / w; depHand(cx + dx, yy, bright * (1 - 0.25 * edge)); }
      }
      // knuckles
      for (let k = 0; k < 4; k++) { const kx = 215 + k * 4.5, ky = 231; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (dx * dx + dy * dy <= 4) depHand(kx + dx, ky + dy, 0.52); } }
      // index finger
      for (let yy = 207; yy <= 232; yy += 1.0) { const tt = (232 - yy) / 25; const cx = 230 - tt * 0.5; const w = 2.2 - tt * 0.4; const bright = 0.42 + 0.1 * tt; for (let dx = -w; dx <= w; dx += 1.0) depHand(cx + dx, yy, bright); }
      // middle finger
      for (let yy = 218; yy <= 234; yy += 1.0) { const tt = (234 - yy) / 16; const cx = 225; const w = 2.0 - tt * 0.3; for (let dx = -w; dx <= w; dx += 1.0) depHand(cx + dx, yy, 0.36); }
      // ring + pinky
      for (let yy = 225; yy <= 237; yy += 1.0) { const cx = 218; const w = 2.5; for (let dx = -w; dx <= w; dx += 1.0) depHand(cx + dx, yy, 0.30); }
      // thumb
      for (let yy = 222; yy <= 240; yy += 1.0) { const tt = (yy - 222) / 18; const cx = 212 + tt * 1.5; const w = 2.2 - tt * 0.3; const bright = 0.40 - tt * 0.08; for (let dx = -w; dx <= w; dx += 1.0) depHand(cx + dx, yy, bright); }
      // thumb tip
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { if (dx * dx + dy * dy <= 4) depHand(213 + dx, 222 + dy, 0.45); }

      // ember
      const ember = 0.8 + 0.22 * Math.sin(t * 4);
      // smoke
      while (SM.length > SMN + 40) SM.pop();
      for (let si = SM.length - 1; si >= 0; si--) {
        const p = SM[si]; p.life += dt * 0.9;
        if (p.life >= p.max || p.y < 8) { if (si >= SMN) { SM.splice(si, 1); continue; } spawn(p); continue; }
        const lf = p.life / p.max;
        const nx = vnoise(p.x * 0.05, p.y * 0.06 - t * 0.3 + p.seed) - 0.5;
        p.x += (nx * 1.3 + Math.sin(p.y * 0.04 + p.seed) * 0.5) * windU * Math.min(1, lf * 3) * 0.6 + p.vx * 0.3;
        p.y -= 1.2 * (0.7 + 0.6 * (1 - lf));
        const al = (0.35 + 0.65 * Math.min(1, lf * 5)) * Math.pow(1 - lf, 0.6) * p.w * smokeU;
        if (al <= 0) continue;
        const rad = 1.2 + lf * 4.5, r0 = Math.max(1, rad | 0), ix0 = p.x | 0, iy0 = p.y | 0;
        for (let dy = -r0; dy <= r0; dy++) for (let dx = -r0; dx <= r0; dx++) {
          const xx = ix0 + dx, yy = iy0 + dy; if (xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
          const d2 = dx * dx + dy * dy, fall = Math.exp(-d2 / (rad * rad * 0.8)); const j = yy * W + xx;
          accR[j] += al * fall * 135; accG[j] += al * fall * 145; accB[j] += al * fall * 160;
        }
      }

      // composite
      const cxw = W * 0.5, cyw = H * 0.5;
      for (let y = 0; y < H; y++) {
        let gxOff = 0; for (const gl of glitchLines) { if (gl.y === y) gxOff = gl.dx; }
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const sx = Math.max(0, Math.min(W - 1, x + gxOff));
          let R = accR[y * W + sx], G = accG[y * W + sx], B = accB[y * W + sx];
          { const ex = x - SMX, ey = y - SMY, ed2 = ex * ex + ey * ey; if (ed2 < 60) { const eg = Math.exp(-ed2 / 10) * ember; R += eg * 210; G += eg * 80; B += eg * 30; } }
          const gn = (Math.random() - 0.5) * 5;
          const rx = (x - cxw) / cxw, ry = (y - cyw) / cyw;
          const vig = 1 - (rx * rx + ry * ry) * 0.35;
          R = (R + gn) * vig; G = (G + gn) * vig; B = (B + gn) * vig;
          if (y > 365) { const fade = Math.max(0, 1 - (y - 365) / 18); R *= fade; G *= fade; B *= fade; }
          if (R < 0) R = 0; else if (R > 255) R = 255; if (G < 0) G = 0; else if (G > 255) G = 255; if (B < 0) B = 0; else if (B > 255) B = 255;
          const o = i * 4; data[o] = R; data[o + 1] = G; data[o + 2] = B; data[o + 3] = 255;
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
      step(ctx, buf, tRef.current, dt);
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
      style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 22%", background: "#000" }}
    />
  );
}

const ACCENT = "#c0894e";

interface Props { onClick?: () => void; showTag?: boolean; artifact?: Artifact; }

export function SmokingSilhouetteCard({ onClick, showTag, artifact }: Props) {
  const id = artifact?.id ?? "mock-smoke";
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
        <SmokingSilhouetteRender className="absolute inset-0" />
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
          I Burned Slow, Thinking of You
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "I sat in the dark and let it all burn down to nothing, like us."
        </p>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#5c2e1d", color: "white", fontSize: "8px", fontWeight: 600 }}>
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
            77
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
