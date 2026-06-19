import { useEffect, useRef } from "react";
import { renderShader } from "./shaderEngine";

// Card-sized shader preview. Draws through the shared WebGL engine onto a plain 2D
// canvas, so there's no per-card WebGL context (and thus no context-limit blanks).
//
// Behaviour (mirrors premium shader galleries like shaders.com):
//   • The REAL shader's first frame is painted the instant the card scrolls in , 
//     you immediately see what the shader is, not a placeholder.
//   • Animation runs only while `paused` is false (the card passes `paused={!hovered}`),
//     so at most the hovered card animates. Idle cards cost ~0 GPU and the 2D canvas
//     keeps its last frame, so nothing ever goes blank.
// To make every visible card animate ambiently instead, pass `paused={false}`.

interface Props {
  fragmentShader: string;
  className?: string;
  timeOffset?: number;
  seed?: number;
  intensity?: number;
  // When true, the shader applies its seed-driven unique arrangement. Older
  // artifacts pass false so they render exactly as they always have.
  unique?: boolean;
  paused?: boolean;
  // Drawing-buffer DPR cap. Fragment cost scales with the square of this; 1 is
  // plenty for a small thumbnail.
  maxDpr?: number;
  // Frame-rate cap for the animation. Ambient motion looks fine at 30.
  fps?: number;
}

export function ShaderThumb({
  fragmentShader,
  className,
  timeOffset = 0,
  seed = 0,
  intensity = 0.5,
  unique = false,
  paused = true,
  maxDpr = 1,
  fps = 30,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const lastDrawRef = useRef(0);
  const inViewRef = useRef(false);
  const startLoopRef = useRef<(() => void) | null>(null);

  const propsRef = useRef({ fragmentShader, timeOffset, seed, intensity, unique, paused, maxDpr, fps });
  propsRef.current = { fragmentShader, timeOffset, seed, intensity, unique, paused, maxDpr, fps };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let alive = true;

    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, propsRef.current.maxDpr);
      const cw = canvas!.clientWidth || canvas!.offsetWidth || 300;
      const ch = canvas!.clientHeight || canvas!.offsetHeight || 230;
      const w = Math.max(1, Math.round(cw * dpr));
      const h = Math.max(1, Math.round(ch * dpr));
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
      }
      return { w, h };
    }

    function renderOnce(now: number) {
      if (!alive || !ctx) return;
      const { w, h } = sizeCanvas();
      const p = propsRef.current;
      if (!startRef.current) startRef.current = now;
      const t = (now - startRef.current) / 1000 + p.timeOffset;
      const src = renderShader(p.fragmentShader, w, h, t, p.seed, p.intensity, p.unique ? 1 : 0);
      if (src) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
        ctx.drawImage(src, 0, 0, canvas!.width, canvas!.height);
      }
    }

    function loop() {
      if (!alive || !inViewRef.current || propsRef.current.paused) {
        rafRef.current = 0; // fully stop, no idle rAF spinning
        return;
      }
      const now = performance.now();
      const interval = propsRef.current.fps > 0 ? 1000 / propsRef.current.fps : 0;
      if (interval > 0 && now - lastDrawRef.current < interval) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastDrawRef.current = now;
      renderOnce(now);
      rafRef.current = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (!alive || !inViewRef.current || propsRef.current.paused || rafRef.current) return;
      // When (re)starting after an idle pause, resync the clock so motion picks up
      // smoothly instead of jumping by however long the card sat still.
      startRef.current = performance.now() - (startRef.current ? 0 : 0);
      rafRef.current = requestAnimationFrame(loop);
    }
    startLoopRef.current = startLoop;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          inViewRef.current = e.isIntersecting;
          if (e.isIntersecting) {
            renderOnce(performance.now()); // paint the REAL shader immediately
            startLoop();
          } else if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0; // 2D canvas keeps its last frame
          }
        }
      },
      { threshold: 0.01, rootMargin: "300px" },
    );
    io.observe(canvas);

    return () => {
      alive = false;
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentShader]);

  // Resume animation when unpaused (e.g. on hover); the loop self-stops on pause.
  useEffect(() => {
    if (!paused) startLoopRef.current?.();
  }, [paused]);

  // Palette expansion: deterministic per-seed hue rotation + saturation lift,
  // applied only to unique (new) artifacts so existing ones keep their exact
  // colors. Bounded (±~36°) so it shifts within the room's emotional family.
  const filter = unique
    ? `hue-rotate(${((seed % 37) - 18)}deg) saturate(${1 + (seed % 22) / 100})`
    : "none";

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", background: "#04030a", filter }}
    />
  );
}
