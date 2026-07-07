import { useEffect, useRef } from "react";
import { renderShader } from "./shaderEngine";

interface Props {
  fragmentShader: string;
  className?: string;
  timeOffset?: number;
  seed?: number;
  intensity?: number;
  unique?: boolean;
  paused?: boolean;
  maxDpr?: number;
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
  const activeRef = useRef(false);
  const ioDetectedRef = useRef(false);
  const renderOnceRef = useRef<((now: number) => void) | null>(null);
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
    renderOnceRef.current = renderOnce;

    function loop() {
      if (!alive || !activeRef.current || propsRef.current.paused) {
        rafRef.current = 0;
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
      if (!alive || !activeRef.current || propsRef.current.paused || rafRef.current) return;
      startRef.current = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    }
    startLoopRef.current = startLoop;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            ioDetectedRef.current = true;
            activeRef.current = true;
            renderOnce(performance.now());
            startLoop();
          } else {
            // In the 3D carousel, IO misreports visibility due to CSS transforms.
            // If IO has never detected this card, it's likely inside a 3D container
            // and we should trust the paused prop instead of IO.
            if (ioDetectedRef.current) {
              activeRef.current = false;
              if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = 0;
              }
            }
          }
        }
      },
      { threshold: 0.01, rootMargin: "300px" },
    );
    io.observe(canvas);

    // Fallback for 3D-transformed containers where IO never fires isIntersecting.
    const fallback = window.setTimeout(() => {
      if (alive && !activeRef.current && !propsRef.current.paused) {
        activeRef.current = true;
        renderOnce(performance.now());
        startLoop();
      }
    }, 80);

    return () => {
      window.clearTimeout(fallback);
      alive = false;
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragmentShader]);

  // When the carousel unpauses this card, paint immediately and start animating.
  useEffect(() => {
    if (!paused) {
      activeRef.current = true;
      renderOnceRef.current?.(performance.now());
      startLoopRef.current?.();
    }
  }, [paused]);

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
