import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import particleData from "../../imports/rewinding-hand-particles.json";
import type { Artifact } from "../data/artifacts";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";

// A loop of regret and self-punishment: the figure holds still, time rewinds, a
// hand strikes the face, the self collapses into shards, reforms, and the cycle
// repeats. Canvas particle renderer ported from the standalone tool with the
// control sliders pinned to their default values.

const HDR = particleData.HDR as {
  W: number; H: number; P: number;
  impactx: number; impacty: number; handcx: number; handcy: number;
};
const W = HDR.W, H = HDR.H, N = W * H, P = HDR.P;
const BASE_IMX = HDR.impactx, BASE_IMY = HDR.impacty, HCX = HDR.handcx, HCY = HDR.handcy;
const IMX = BASE_IMX, IMY = BASE_IMY; // land X/Y pinned to 0

const WHITE = [232, 238, 255], BLUE = [88, 140, 255], PURPLE = [176, 96, 255];

// control defaults (speed/swing/collapse/shake/palette/glow/trails/chroma all neutral)
const PAL = 0.5, SWING = 1, COL_SCALE = 1, SHAKE_U = 1, CHROMA_U = 1, GLOW = 1, T_USER = 1, SPEED = 1.3;

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

const PH: [string, number][] = [["HOLD", 1.7], ["REWIND", 1.5], ["STRIKE", 0.5], ["COLLAPSE", 1.9], ["REFORM", 2.1], ["REPEAT", 0.7]];
const TOTAL = PH.reduce((s, p) => s + p[1], 0);
function phaseAt(time: number) {
  let tt = time % TOTAL, acc = 0;
  for (let i = 0; i < PH.length; i++) {
    if (tt < acc + PH[i][1]) return { name: PH[i][0], p: (tt - acc) / PH[i][1] };
    acc += PH[i][1];
  }
  return { name: "REPEAT", p: 1 };
}
function smooth(u: number) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
function ease(u: number) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, u))); }

interface ShaderState {
  hx: Uint16Array; hy: Uint16Array; hnd: Uint8Array;
  pcR: Float32Array; pcG: Float32Array; pcB: Float32Array;
  evx: Float32Array; evy: Float32Array; ph: Float32Array; drf: Float32Array;
  accR: Float32Array; accG: Float32Array; accB: Float32Array;
}

export function RewindingHandRender({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ShaderState | null>(null);
  const rafRef = useRef<number>(0);
  const builtRef = useRef(false);
  const tRef = useRef(0);
  const lastRef = useRef(0);
  const ringRef = useRef(-1);

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
      const dr = b64ToBytes(particleData.dr);
      const rb1 = b64ToBytes(particleData.rb1);
      const rb2 = b64ToBytes(particleData.rb2);
      const hnd = b64ToBytes(particleData.hnd);

      const pcR = new Float32Array(P), pcG = new Float32Array(P), pcB = new Float32Array(P);
      const evx = new Float32Array(P), evy = new Float32Array(P), ph = new Float32Array(P), drf = new Float32Array(P);

      // palette (bias = PAL): white -> blue -> purple
      for (let i = 0; i < P; i++) {
        let r = rb1[i] / 255;
        r = Math.max(0, Math.min(1, r + (PAL - 0.5) * 0.9));
        let c0, c1, u;
        if (r < 0.45) { c0 = WHITE; c1 = BLUE; u = r / 0.45; }
        else { c0 = BLUE; c1 = PURPLE; u = (r - 0.45) / 0.55; }
        const br = 0.78 + (rb2[i] / 255) * 0.5;
        pcR[i] = (c0[0] + (c1[0] - c0[0]) * u) * br;
        pcG[i] = (c0[1] + (c1[1] - c0[1]) * u) * br;
        pcB[i] = (c0[2] + (c1[2] - c0[2]) * u) * br;
      }
      for (let i = 0; i < P; i++) {
        const x = hx[i], y = hy[i], dx = x - BASE_IMX, dy = y - BASE_IMY, d = Math.hypot(dx, dy) + 0.001;
        const j1 = rb1[i] / 255 - 0.5, j2 = rb2[i] / 255 - 0.5, spd = 0.6 + (rb1[i] / 255) * 1.4;
        evx[i] = (dx / d) * spd + j1; evy[i] = (dy / d) * spd + j2 - 0.5;
        ph[i] = (rb2[i] / 255) * Math.PI * 2; drf[i] = dr[i] / 255;
      }

      stateRef.current = {
        hx, hy, hnd, pcR, pcG, pcB, evx, evy, ph, drf,
        accR: new Float32Array(N), accG: new Float32Array(N), accB: new Float32Array(N),
      };
    }

    function step(ctx: CanvasRenderingContext2D, buf: ImageData, time: number, dt: number) {
      const state = stateRef.current;
      if (!state) return;
      const { hx, hy, hnd, pcR, pcG, pcB, evx, evy, ph, drf, accR, accG, accB } = state;
      const data = buf.data;

      const pz = phaseAt(time), name = pz.name, p = pz.p;
      const swing = SWING, colScale = COL_SCALE, shakeU = SHAKE_U;
      const cu = CHROMA_U, glow = GLOW, tUser = T_USER;

      let keep;
      if (name === "REWIND") keep = 0.90; else if (name === "HOLD") keep = 0.55; else if (name === "STRIKE") keep = 0.72;
      else if (name === "COLLAPSE") keep = 0.86; else if (name === "REFORM") keep = 0.74; else keep = 0.55;
      keep = Math.min(0.96, keep * tUser);
      for (let k = 0; k < N; k++) { accR[k] *= keep; accG[k] *= keep; accB[k] *= keep; }

      let shakeX = 0, shakeY = 0, chromAmt = 0.4 * cu, ringStr = 0, flash = 0;
      let reach = 0;
      let ringR = ringRef.current;
      if (name === "HOLD") reach = 0;
      else if (name === "REWIND") { reach = -0.18 * smooth(p); chromAmt = (1.5 + 3.0 * p) * cu; }
      else if (name === "STRIKE") {
        if (p < 0.55) reach = -0.18 + 1.18 * smooth(p / 0.55); else reach = 1.0;
        if (p > 0.5) {
          const e = 1 - (p - 0.5) / 0.5; shakeX = (Math.random() - 0.5) * 15 * e * shakeU; shakeY = (Math.random() - 0.5) * 15 * e * shakeU;
          if (ringR < 0) ringR = 0; ringR += dt * 820; ringStr = e; flash = e; chromAmt = (3 + 9 * e) * cu;
        } else { ringR = -1; chromAmt = (2 + 5 * p) * cu; }
      }
      else if (name === "COLLAPSE") {
        reach = 1.0 - 0.6 * smooth(p); chromAmt = (2 + 3 * (1 - p)) * cu;
        if (p < 0.25) { const e = 1 - p / 0.25; shakeX = (Math.random() - 0.5) * 6 * e * shakeU; shakeY = (Math.random() - 0.5) * 6 * e * shakeU; }
        if (ringR >= 0) { ringR += dt * 620; ringStr = 0.5 * (1 - p); if (ringR > W * 1.4) ringR = -1; }
      }
      else if (name === "REFORM") { reach = 0.4 * (1 - ease(p)); chromAmt = (0.4 + 1.0 * (1 - p)) * cu; ringR = -1; }
      reach *= swing;

      const tgtDX = IMX - HCX, tgtDY = IMY - HCY, hxOff = tgtDX * reach, hyOff = tgtDY * reach;
      let explode = 0, dissolve = 0;
      if (name === "STRIKE" && p > 0.5) explode = smooth((p - 0.5) / 0.5) * 0.10;
      if (name === "COLLAPSE") { explode = 0.10 + smooth(p) * 0.90; dissolve = smooth(p); }
      if (name === "REFORM") { explode = 1 - ease(p); dissolve = 1 - smooth(p); }
      explode *= colScale;

      function addDot(x: number, y: number, r: number, g: number, b: number) {
        const ix = x | 0, iy = y | 0; if (ix < 0 || ix >= W || iy < 0 || iy >= H) return;
        const j = iy * W + ix; accR[j] += r; accG[j] += g; accB[j] += b;
      }

      for (let i = 0; i < P; i++) {
        const isHand = hnd[i] === 1;
        if (!isHand && dissolve > 0 && drf[i] < dissolve * 1.02) continue;
        let x = hx[i], y = hy[i];
        if (name === "HOLD" || name === "REPEAT" || name === "REWIND") { const a = time * 1.3 + ph[i]; x += Math.sin(a) * 0.5; y += Math.cos(a * 0.9) * 0.5; }
        if (name === "REWIND" && !isHand) { const r = Math.sin(time * 5 + ph[i]); x += -evx[i] * 0.5 * p + r * 0.5; y += -evy[i] * 0.5 * p; }
        if (isHand) { x += hxOff; y += hyOff; if (reach > 0.3) { x += Math.sin(time * 9 + ph[i]) * 0.8 * reach; y += Math.cos(time * 8 + ph[i]) * 0.8 * reach; } }
        else if (explode > 0) { x += evx[i] * explode * 60; y += evy[i] * explode * 60 + explode * explode * 40; }
        addDot(x, y, pcR[i] * 0.5 * glow, pcG[i] * 0.5 * glow, pcB[i] * 0.5 * glow);
      }

      ringRef.current = ringR;

      const caInt = Math.round(chromAmt), sX = shakeX | 0, sY = shakeY | 0, cxw = W * 0.5, cyw = H * 0.5;
      for (let y = 0; y < H; y++) {
        let yy = y + sY; if (yy < 0) yy = 0; else if (yy >= H) yy = H - 1; const row = yy * W;
        for (let x = 0; x < W; x++) {
          let xr = x + sX + caInt, xg = x + sX, xb = x + sX - caInt;
          if (xr < 0) xr = 0; else if (xr >= W) xr = W - 1; if (xg < 0) xg = 0; else if (xg >= W) xg = W - 1; if (xb < 0) xb = 0; else if (xb >= W) xb = W - 1;
          let R = accR[row + xr], G = accG[row + xg], B = accB[row + xb];
          if (ringR >= 0 && ringStr > 0) {
            const dx = x - IMX, dy = y - IMY, dist = Math.sqrt(dx * dx + dy * dy), drr = Math.abs(dist - ringR);
            if (drr < 11) { const k = (1 - drr / 11) * ringStr * 120; R += k * 0.9; G += k * 0.7; B += k * 1.2; }
          }
          if (flash > 0) { const dx = x - IMX, dy = y - IMY, d2 = dx * dx + dy * dy, gg = Math.exp(-d2 / (2 * 20 * 20)) * flash * 150; R += gg * 0.95; G += gg * 0.75; B += gg * 1.25; }
          const gn = Math.random() * 7; R += gn * 0.5; G += gn * 0.5; B += gn * 0.6;
          const vx = (x - cxw) / cxw, vy = (y - cyw) / cyw, vig = 1 - (vx * vx + vy * vy) * 0.28; R *= vig; G *= vig; B *= vig;
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
      const s = SPEED;
      tRef.current += dt * s;
      step(ctx, buf, tRef.current, dt * s);
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

const ACCENT = "#9a6cff";

interface Props { onClick?: () => void; showTag?: boolean; artifact?: Artifact; }

export function RewindingHandCard({ onClick, showTag, artifact }: Props) {
  const id = artifact?.id ?? "mock-rewind";
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
        <RewindingHandRender className="absolute inset-0" />
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
          I Keep Rewinding to the Mistake
        </h3>
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          "Every night I press rewind, just to watch myself ruin it again."
        </p>

        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#3a2d6e", color: "white", fontSize: "8px", fontWeight: 600 }}>
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
            58
          </button>
          <button className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity" style={{ color: "rgba(255,255,255,0.3)" }}>
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
