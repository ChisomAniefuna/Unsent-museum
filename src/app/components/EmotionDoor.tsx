import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { RoomDef } from "../data/rooms";
import { EmotionDoorImage } from "./EmotionDoorImage";
import { DOOR_LQIP } from "../data/doorLqip";

// A single museum door. Renders an INSTANT colour-filled arch (the room's palette,
// pure CSS, no image needed) so the whole hall looks complete on the first paint;
// the photographic door then fades in over it. Opens on hover to reveal the room.

interface DoorProps {
  room: RoomDef;
  isHovered: boolean;
  isOpening: boolean;
  isClosingReturn?: boolean;
  onHover: (v: boolean) => void;
  onClick: () => void;
}

// Arch silhouette: semicircular top on a near-square base. Used for the instant
// placeholder so there's a door-shaped colour block before the photo decodes.
const ARCH_RADIUS = "50% 50% 5% 5% / 31% 31% 3% 3%";

// Synchronously check the browser cache for a door image so we can skip the
// placeholder entirely when the image is already there (which it almost always
// is — index.html preloads every door at fetchpriority="high"). Setting
// `src` on a fresh Image() returns `complete=true` synchronously when the
// asset is in cache, with naturalWidth>0 once it's also decoded.
function isDoorImageReady(src: string): boolean {
  if (typeof Image === "undefined") return false;
  const probe = new Image();
  probe.src = src;
  return probe.complete && probe.naturalWidth > 0;
}

export function EmotionDoor({ room, isHovered, isOpening, isClosingReturn = false, onHover, onClick }: DoorProps) {
  const active = isHovered || isOpening || isClosingReturn;
  // The colour-arch below is only ever a stand-in until the real door decodes.
  // Once it loads we drop the placeholder entirely so the door is what shows.
  // CRITICAL: start `true` when the door is already cached, so the placeholder
  // paints at opacity 0 from frame zero — no 500ms fade-out of a colour arch
  // every time the visitor lands. The useEffect below only matters on cold
  // loads (slow first visit, cache evicted, etc.).
  const [doorLoaded, setDoorLoaded] = useState(() => isDoorImageReady(room.doorImage));

  // Reliable load detection for the cold-load path (React's onLoad can miss
  // already-cached images). Skip the listener entirely when we already know
  // the image is ready — saves an in-memory Image() + an event listener pair
  // per door per mount.
  useEffect(() => {
    if (doorLoaded) return;
    const probe = new Image();
    probe.src = room.doorImage;
    if (probe.complete) { setDoorLoaded(true); return; }
    const done = () => setDoorLoaded(true);
    probe.addEventListener("load", done);
    probe.addEventListener("error", done); // never trap the placeholder on a failed load
    return () => {
      probe.removeEventListener("load", done);
      probe.removeEventListener("error", done);
    };
  }, [room.doorImage, doorLoaded]);
  const leftAngle = isOpening ? -76 : isHovered ? -10 : 0;
  const rightAngle = isOpening ? 76 : isHovered ? 10 : 0;

  // Prime the room video on hover, a head-start before navigation.
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
    setTimeout(() => { try { v.remove(); } catch (_) {} }, 3000);
    preloadRef.current = null;
  }

  return (
    <button
      type="button"
      onMouseEnter={() => { onHover(true); startPreload(); }}
      onMouseLeave={() => { onHover(false); stopPreload(); }}
      onTouchStart={() => { onHover(true); startPreload(); }}
      onTouchEnd={() => onHover(false)}
      onClick={onClick}
      className="group block w-full cursor-pointer select-none transition-transform duration-300 hover:-translate-y-1"
      aria-label={`Enter ${room.name}`}
    >
      {/* aspect-ratio reserves the door's exact height on first paint (all door
          art is ~1340×2200), so the box never collapses while images load. */}
      <div className="relative w-full [perspective:1200px]" style={{ aspectRatio: "1340 / 2200" }}>
        {/* INSTANT placeholder: a tiny blurred thumbnail of the REAL carved door,
            inlined as base64 so it paints on frame 0 with zero network wait. It
            reads as "the door, sharpening into focus" rather than a flat colour
            block. A faint colour wash sits behind it (covers the door's
            transparent areas while the thumbnail is still the only thing drawn).
            Both fade out once the full-res door decodes on top (z-10). */}
        <div
          aria-hidden
          className="absolute inset-[5%_12%] z-0"
          style={{
            background: `linear-gradient(165deg, ${room.palette.accent}55 0%, ${room.palette.bg}55 125%)`,
            borderRadius: ARCH_RADIUS,
            opacity: doorLoaded ? 0 : 0.5,
            transition: "opacity 0.6s ease",
          }}
        />
        <img
          aria-hidden
          src={DOOR_LQIP[room.door]}
          alt=""
          draggable={false}
          className="absolute inset-0 z-0 h-full w-full object-contain pointer-events-none"
          style={{
            filter: "blur(9px)",
            transform: "scale(1.05)",
            opacity: doorLoaded ? 0 : 1,
            transition: "opacity 0.6s ease",
          }}
        />

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

        <DoorLeaf room={room} side="left" angle={leftAngle} active={active} isClosingReturn={isClosingReturn} onLoad={() => setDoorLoaded(true)} />
        <DoorLeaf room={room} side="right" angle={rightAngle} active={active} isClosingReturn={isClosingReturn} />

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

function DoorLeaf({ room, side, angle, active, isClosingReturn = false, onLoad }: { room: RoomDef; side: "left" | "right"; angle: number; active: boolean; isClosingReturn?: boolean; onLoad?: () => void }) {
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
      initial={isClosingReturn ? { rotateY: isLeft ? -72 : 72 } : false}
      animate={{ rotateY: angle }}
      transition={{ duration: isClosingReturn ? 0.78 : active ? 0.6 : 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <EmotionDoorImage
        door={room.door}
        alt=""
        loading="eager"
        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
        draggable={false}
        onLoad={onLoad}
      />
    </motion.div>
  );
}
