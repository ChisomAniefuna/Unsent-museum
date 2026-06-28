import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Artifact } from "../data/artifacts";
import { ROOM_MAP } from "../data/rooms";
import { ShaderThumb } from "./ShaderThumb";
import { CryingMaskRender } from "./CryingMaskCard";
import { SadnessHeadsRender } from "./SadnessHeadsCard";
import { ScratchApparitionRender } from "./ScratchApparitionCard";
import { HeadOnFireRender } from "./HeadOnFireCard";
import { RewindingHandRender } from "./RewindingHandCard";
import { ShoutBehindGlassRender } from "./ShoutBehindGlassCard";
import { SmokingSilhouetteRender } from "./SmokingSilhouetteCard";
import { WillowGriefRender } from "./WillowGriefCard";

// A 3D coverflow of artifact cards, the immersive "museum walk" view. The centred
// card faces the viewer; neighbours recede in depth and tilt away. Navigate by
// drag, arrow keys, the chevrons, or by clicking a side card. Clicking the centred
// card opens it. Special canvas artifacts (mask / heads) ride the ring as full
// members, drawing with their own renderer instead of a WebGL shader.

interface Props {
  artifacts: Artifact[];
  accentColor: string;
  onSelect: (a: Artifact) => void;
  showTags?: boolean;
}

export function ShaderCarousel3D({ artifacts, accentColor, onSelect, showTags }: Props) {
  const [active, setActive] = useState(0);
  const [cardW, setCardW] = useState(320);
  const dragX = useRef<number | null>(null);
  const dragged = useRef(false);
  const wheelLock = useRef(0);
  const total = artifacts.length;

  // Keep the active index in range when the filtered list changes (room switch etc.).
  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, total - 1)));
  }, [total]);

  // Responsive card sizing.
  useEffect(() => {
    // Cards are square (shaderH = cardW), so bound by BOTH axes: width keeps the
    // ribbon from crowding edge-to-edge, height keeps a square card from
    // overflowing a short window. Desktop (>=1024px) gets a wider hero card and a
    // taller height budget so it can actually grow; mobile keeps the tighter fit.
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isDesktop = vw >= 1024;
      const widthFrac = isDesktop ? 0.7 : 0.62;
      const heightFrac = isDesktop ? 0.62 : 0.55;
      const cap = isDesktop ? 560 : 460;
      setCardW(Math.max(240, Math.min(vw * widthFrac, vh * heightFrac, cap)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const go = useCallback(
    (dir: number) => {
      setActive((a) => {
        if (total === 0) return a;
        return (((a + dir) % total) + total) % total;
      });
    },
    [total],
  );

  const jumpTo = useCallback(
    (i: number) => { setActive(i); },
    [],
  );

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "Enter" && artifacts[active]) onSelect(artifacts[active]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, active, artifacts, onSelect]);

  if (total === 0) return null;

  const spacing = cardW * 0.62;
  const shaderH = cardW; // square shader area

  // Pointer drag → swipe.
  function onPointerDown(e: React.PointerEvent) {
    dragX.current = e.clientX;
    dragged.current = false;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragX.current === null) return;
    if (Math.abs(e.clientX - dragX.current) > 8) dragged.current = true;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragX.current !== null) {
      const dx = e.clientX - dragX.current;
      if (dx > 44) go(-1);
      else if (dx < -44) go(1);
    }
    dragX.current = null;
  }

  // Trackpad / wheel, horizontal or vertical, throttled so one gesture = one step.
  function onWheel(e: React.WheelEvent) {
    const now = performance.now();
    if (now - wheelLock.current < 380) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 12) return;
    wheelLock.current = now;
    go(d > 0 ? 1 : -1);
  }

  return (
    <div
      className="relative w-full select-none"
      style={{ touchAction: "pan-y" }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Artifact gallery"
    >
      <div
        className="relative mx-auto"
        style={{ height: shaderH + 120, perspective: 1700, perspectiveOrigin: "50% 45%" }}
        tabIndex={0}
        aria-label={`Showing artifact ${active + 1} of ${total}. Use left and right arrow keys to navigate.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragX.current = null)}
        onWheel={onWheel}
      >
        {artifacts.map((artifact, i) => {
          // Circular (shortest-path) offset so the ribbon wraps: the card before
          // index 0 is the last card, and the card after the last is index 0.
          let offset = i - active;
          if (offset > total / 2) offset -= total;
          else if (offset < -total / 2) offset += total;
          const abs = Math.abs(offset);
          if (abs > 4) return null; // window the DOM/shaders for performance

          const x = offset * spacing;
          const rotateY = Math.max(-48, Math.min(48, -offset * 34));
          const z = -abs * 190;
          const scale = Math.max(0.62, 1 - abs * 0.12);
          const opacity = abs > 3.5 ? 0 : 1 - abs * 0.16;
          const isCenter = offset === 0;
          const room = ROOM_MAP[artifact.emotion];

          return (
            <div
              key={artifact.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${artifact.title}, ${artifact.emotion}, ${i + 1} of ${total}`}
              aria-current={isCenter ? "true" : undefined}
              aria-hidden={!isCenter}
              className="absolute left-1/2 top-1/2"
              style={{
                width: cardW,
                transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                transformStyle: "preserve-3d",
                transition: "transform 0.6s cubic-bezier(0.22,0.61,0.36,1), opacity 0.5s ease",
                opacity,
                zIndex: 100 - abs,
                cursor: isCenter ? "pointer" : "pointer",
                pointerEvents: opacity <= 0.05 ? "none" : "auto",
              }}
              onClick={() => {
                if (dragged.current) return;
                if (isCenter) onSelect(artifact);
                else jumpTo(i);
              }}
            >
              {/* Shader tile */}
              <div
                className="relative w-full overflow-hidden rounded-[20px]"
                style={{
                  height: shaderH,
                  border: `1px solid ${isCenter ? accentColor + "70" : "rgba(255,255,255,0.10)"}`,
                  boxShadow: isCenter
                    ? `0 18px 44px -26px rgba(0,0,0,0.5), 0 0 38px -18px ${accentColor}3a`
                    : "0 8px 22px -26px rgba(0,0,0,0.4)",
                  background: "#04030a",
                }}
              >
                {artifact.custom === "mask" ? (
                  <CryingMaskRender className="absolute inset-0" />
                ) : artifact.custom === "heads" ? (
                  <SadnessHeadsRender className="absolute inset-0" />
                ) : artifact.custom === "scratch" ? (
                  <ScratchApparitionRender className="absolute inset-0" />
                ) : artifact.custom === "headfire" ? (
                  <HeadOnFireRender className="absolute inset-0" />
                ) : artifact.custom === "rewind" ? (
                  <RewindingHandRender className="absolute inset-0" />
                ) : artifact.custom === "shout" ? (
                  <ShoutBehindGlassRender className="absolute inset-0" />
                ) : artifact.custom === "smoke" ? (
                  <SmokingSilhouetteRender className="absolute inset-0" />
                ) : artifact.custom === "willow" ? (
                  <WillowGriefRender className="absolute inset-0" />
                ) : (
                  <ShaderThumb
                    fragmentShader={artifact.shader.glsl}
                    seed={artifact.dna.seed}
                    intensity={artifact.dna.intensity}
                    timeOffset={artifact.dna.timeOffset}
                    unique={!!artifact.dna.unique}
                    paused={abs > 1}
                    maxDpr={isCenter ? 2 : 1}
                    fps={30}
                  />
                )}
                {/* darken side cards so the centre reads as focus */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                  style={{ background: "#04030a", opacity: isCenter ? 0 : abs * 0.1 }}
                />

              </div>

              {/* Caption */}
              <div className="mt-3 px-1 text-center" style={{ opacity: isCenter ? 1 : 0.5 }}>
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "1.05rem",
                    color: "rgba(255,255,255,0.92)",
                  }}
                >
                  {artifact.title}
                </p>
                {showTags && (
                  <div className="mt-1 flex items-center justify-center text-[11px]" style={{ color: "rgba(255,255,255,0.92)" }}>
                    <span className="uppercase tracking-[0.18em]" style={{ color: room?.palette.glow || accentColor }}>
                      {artifact.emotion}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-2 flex items-center justify-center gap-5">
        <CarouselButton onClick={() => go(-1)} label="Previous artifact">
          <ChevronLeft size={20} />
        </CarouselButton>

        <span aria-live="polite" className="text-xs tabular-nums tracking-widest" style={{ color: "rgba(255,255,255,0.78)", fontFamily: "'Cinzel', serif" }}>
          {active + 1} / {total}
        </span>

        <CarouselButton onClick={() => go(1)} label="Next artifact">
          <ChevronRight size={20} />
        </CarouselButton>
      </div>

      <p className="mt-4 text-center text-[11px] italic" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "'Cormorant Garamond', serif" }}>
        Drag, scroll, or use ← → · click an artifact to open it
      </p>
    </div>
  );
}

function CarouselButton({ children, onClick, disabled, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex items-center justify-center rounded-full transition-all hover:bg-white/10 disabled:opacity-25 disabled:cursor-default"
      style={{
        width: 44,
        height: 44,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.14)",
        color: "rgba(255,255,255,0.8)",
      }}
    >
      {children}
    </button>
  );
}

