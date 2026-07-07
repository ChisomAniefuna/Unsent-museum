import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { RoomDef } from "../data/rooms";
import { EmotionDoorImage } from "./EmotionDoorImage";

// A single museum door. The photographic carved-door webp is the ONLY thing
// ever drawn in the archway — no colour-block, no blurred thumbnail, and no
// JS "has it loaded yet?" gate. The <img> is always rendered: the browser
// paints nothing until the webp decodes, then paints the sharp door. Cached
// (the common case, since index.html preloads every door at high priority) =>
// instant. Cold => the real door simply appears the moment it arrives, with no
// artificial invisible-until-detected window. Opens on hover to reveal the room.

interface DoorProps {
  room: RoomDef;
  isHovered: boolean;
  isOpening: boolean;
  isReturning?: boolean;
  isReturnLocked?: boolean;
  onHover: (v: boolean) => void;
  onClick: () => void;
}

export function EmotionDoor({ room, isHovered, isOpening, isReturning = false, isReturnLocked = false, onHover, onClick }: DoorProps) {
  const [returnClosing, setReturnClosing] = useState(isReturning);

  useEffect(() => {
    if (!isReturning) {
      setReturnClosing(false);
      return;
    }

    setReturnClosing(true);
    const t = window.setTimeout(() => setReturnClosing(false), 680);
    return () => window.clearTimeout(t);
  }, [isReturning]);

  const interactive = !isReturnLocked;
  const active = isHovered || isOpening || returnClosing;
  const hideClosedDoor = isHovered || isOpening || returnClosing;
  const leftAngle = isOpening ? -76 : isHovered ? -10 : 0;
  const rightAngle = isOpening ? 76 : isHovered ? 10 : 0;
  const leftInitialAngle = returnClosing ? -76 : undefined;
  const rightInitialAngle = returnClosing ? 76 : undefined;

  const preloadRef = useRef<HTMLVideoElement | null>(null);
  function startPreload() {
    if (preloadRef.current) return;
    const v = document.createElement("video");
    v.src = room.videoUrl;
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
    document.body.appendChild(v);
    v.load();
    v.play().catch(() => {});
    preloadRef.current = v;
  }
  function stopPreload() {
    const v = preloadRef.current;
    if (!v) return;
    v.pause();
    v.removeAttribute("src");
    v.load();
    try { v.remove(); } catch (_) {}
    preloadRef.current = null;
  }

  useEffect(() => () => stopPreload(), []);

  return (
    <button
      type="button"
      onMouseEnter={() => { if (interactive) { onHover(true); startPreload(); } }}
      onMouseLeave={() => { if (interactive) { onHover(false); stopPreload(); } }}
      onTouchStart={() => { if (interactive) { onHover(true); startPreload(); } }}
      onTouchEnd={() => { if (interactive) onHover(false); }}
      onClick={() => { if (interactive) onClick(); }}
      aria-disabled={!interactive}
      className={`${interactive ? "group cursor-pointer" : "cursor-default"} block w-full select-none transition-transform duration-300`}
      style={{ transform: interactive && isHovered ? "translateY(-0.25rem)" : "translateY(0)" }}
      aria-label={`Enter ${room.name}`}
    >
      {/* aspect-ratio reserves the door's exact height on first paint (all door
          art is ~1340×2200), so the box never collapses while images load. */}
      <div className="relative w-full [perspective:1200px]" style={{ aspectRatio: "1340 / 2200" }}>
        {/* Portal revealed on hover/open, shows real room preview, masked to arch */}
        <div
          className="absolute inset-0 z-[1] overflow-hidden transition-opacity duration-300"
          style={{
            WebkitMaskImage: `url(${room.doorImage})`,
            WebkitMaskSize: "100% 100%",
            maskImage: `url(${room.doorImage})`,
            maskSize: "100% 100%",
            opacity: active ? 1 : 0,
            background: room.palette.bg,
          }}
        >
          {room.fallbackImage ? (
            <img
              src={room.fallbackImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              loading="lazy"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at 50% 60%, ${room.palette.accent}cc 0%, ${room.palette.bg} 70%)` }}
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 50%, ${room.palette.glow}30 0%, transparent 70%)` }}
          />
        </div>

        <div
          className="absolute inset-0 z-10 transition-opacity duration-150"
          style={{ opacity: hideClosedDoor ? 0 : 1 }}
        >
          <EmotionDoorImage
            door={room.door}
            alt=""
            loading="eager"
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {active && (
          <>
            <DoorLeaf room={room} side="left" angle={leftAngle} initialAngle={leftInitialAngle} />
            <DoorLeaf room={room} side="right" angle={rightAngle} initialAngle={rightInitialAngle} />
          </>
        )}

        <motion.div
          className="absolute bottom-[-32px] left-0 right-0 z-20 flex flex-col items-center gap-1 pb-3 pt-12 pointer-events-none"
          animate={{ opacity: isOpening ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <span
            className="font-['Cinzel'] text-[13px] font-black uppercase tracking-[0.38em] text-[#1a1a1a]/80 transition-colors duration-300 group-hover:text-black"
            style={{ textShadow: "0 1px 12px rgba(255,255,255,0.6)" }}
          >
            {room.name}
          </span>
          {/* quiet affordance, appears on hover so first-timers know doors open */}
          <span className="font-['Cinzel'] text-[9px] uppercase tracking-[0.3em] text-black/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Enter →
          </span>
        </motion.div>
      </div>
    </button>
  );
}

function DoorLeaf({ room, side, angle, initialAngle }: { room: RoomDef; side: "left" | "right"; angle: number; initialAngle?: number }) {
  const isLeft = side === "left";
  const gradientMask = isLeft
    ? "linear-gradient(to right, black 50%, transparent 50%)"
    : "linear-gradient(to right, transparent 50%, black 50%)";
  const doorMask = `url(${room.doorImage})`;
  return (
    <motion.div
      className="absolute inset-0 z-10 [transform-style:preserve-3d]"
      style={{
        transformOrigin: isLeft ? "left center" : "right center",
        WebkitMaskImage: `${gradientMask}, ${doorMask}`,
        WebkitMaskSize: "100% 100%, 100% 100%",
        WebkitMaskComposite: "source-in",
        maskImage: `${gradientMask}, ${doorMask}`,
        maskSize: "100% 100%, 100% 100%",
        maskComposite: "intersect",
      }}
      initial={initialAngle === undefined ? false : { rotateY: initialAngle }}
      animate={{ rotateY: angle }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <EmotionDoorImage
        door={room.door}
        alt=""
        loading="eager"
        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
        draggable={false}
      />
    </motion.div>
  );
}
