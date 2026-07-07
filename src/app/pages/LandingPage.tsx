import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { LayoutGrid } from "lucide-react";
import { ROOMS, RoomDef } from "../data/rooms";
import { EmotionDoor } from "../components/EmotionDoor";
import { warmDoorImages } from "../components/EmotionDoorImage";
import { LandingMuseumBackground } from "../components/LandingMuseumBackground";
import { trackEvent } from "../analytics";
import { preloadGalleryRoute, preloadRoomRoute } from "../routePreloads";

const MOBILE_LOOP_ROOMS = [ROOMS[ROOMS.length - 1], ...ROOMS, ROOMS[0]];

warmDoorImages();

// Render ONLY the layout that matches the viewport instead of mounting both the
// desktop grid AND the mobile carousel and hiding one with CSS. A hidden-but-
// mounted door still costs a full React mount + image decode + mask compositing.
// On desktop that meant building 12 EmotionDoors (5 grid + 7 carousel) to show
// 5 — which delayed the doors painting on every landing load and every room
// return. Gating on a media query renders just the 5 (or 7) that are visible.
function useIsDesktop() {
  const query = "(min-width: 1024px)"; // Tailwind's lg breakpoint
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsDesktop(mq.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [openingRoom, setOpeningRoom] = useState<string | null>(null);
  const routeClosingDoor = (location.state as { closingDoor?: string } | null)?.closingDoor ?? null;
  const [closingDoor, setClosingDoor] = useState<string | null>(routeClosingDoor);
  // Seed the carousel position from closingDoor on FIRST render. Otherwise
  // activeIndex starts at 0 (love), the carousel paints with love centered,
  // and only after the effect runs does it scroll to the returning room - so
  // the visitor briefly sees the wrong door swap in before "their" door
  // settles. This makes the carousel paint correctly on the very first frame.
  const initialIndex = (() => {
    if (!routeClosingDoor) return 0;
    const i = ROOMS.findIndex((r) => r.id === routeClosingDoor);
    return i >= 0 ? i : 0;
  })();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const isDesktop = useIsDesktop();
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollSettleRef = useRef<number | null>(null);
  const didPositionCarouselRef = useRef(false);
  const isLoopJumpingRef = useRef(false);
  const closingMobileRoomIndex = closingDoor
    ? ROOMS.findIndex((room) => room.id === closingDoor)
    : -1;
  const closingMobileLoopIndex = closingMobileRoomIndex >= 0 ? closingMobileRoomIndex + 1 : -1;

  useEffect(() => {
    if (routeClosingDoor) setClosingDoor(routeClosingDoor);
  }, [routeClosingDoor]);

  function handleDoorClick(room: RoomDef) {
    if (openingRoom) return;
    preloadRoomRoute();
    setOpeningRoom(room.id);
    trackEvent("emotion_room_entered", {
      emotion: room.id,
      room_name: room.name,
    });
    window.setTimeout(() => {
      navigate(`/room/${room.id}`);
    }, 680);
  }

  function getMobileCardWidth() {
    const el = carouselRef.current;
    const firstCard = el?.firstElementChild as HTMLElement | null;
    return firstCard?.offsetWidth || window.innerWidth * 0.72;
  }

  function jumpToLoopIndex(loopIndex: number) {
    const el = carouselRef.current;
    if (!el) return;
    isLoopJumpingRef.current = true;
    el.scrollTo({ left: getMobileCardWidth() * loopIndex, behavior: "auto" });
    requestAnimationFrame(() => {
      isLoopJumpingRef.current = false;
    });
  }

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el || isLoopJumpingRef.current || closingDoor) return;

    const cardW = getMobileCardWidth();
    const loopIndex = Math.round(el.scrollLeft / cardW);
    const realIndex = (loopIndex - 1 + ROOMS.length) % ROOMS.length;
    setActiveIndex(realIndex);

    if (scrollSettleRef.current) window.clearTimeout(scrollSettleRef.current);
    scrollSettleRef.current = window.setTimeout(() => {
      const settledLoopIndex = Math.round(el.scrollLeft / cardW);
      if (settledLoopIndex === 0) {
        jumpToLoopIndex(ROOMS.length);
        setActiveIndex(ROOMS.length - 1);
      } else if (settledLoopIndex === ROOMS.length + 1) {
        jumpToLoopIndex(1);
        setActiveIndex(0);
      }
    }, 90);
  }

  function scrollToIndex(i: number) {
    const el = carouselRef.current;
    if (!el || closingDoor) return;
    el.scrollTo({ left: getMobileCardWidth() * (i + 1), behavior: "smooth" });
    setActiveIndex(i);
  }

  function handleDoorHover(roomId: string, isHovered: boolean) {
    setHoveredRoom(isHovered ? roomId : null);
    if (isHovered) preloadRoomRoute();
  }

  // Position the carousel BEFORE the browser paints. useLayoutEffect runs
  // synchronously after DOM mutations but before paint, so the carousel is
  // already at the correct scroll position on frame zero. Doing this in a
  // plain useEffect (or worse, requestAnimationFrame) leaves the carousel
  // briefly stuck at scrollLeft=0 (showing the duplicated last room) and
  // then animating in - which is exactly the door-swap the visitor sees
  // when returning from a room. We also use behavior:"auto" (instant), not
  // "smooth", so there is no visible scroll animation.
  useLayoutEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    // On a normal first landing, seed the loop carousel at the first real door.
    // On a room return, seed it at the returning door. When closingDoor is
    // later cleared from history state, do not reposition again; otherwise the
    // carousel jumps back to Love while the visitor is watching the door close.
    if (!closingDoor && didPositionCarouselRef.current) return;

    const cardW = getMobileCardWidth();
    let loopIndex = 1; // default: first real room (love)
    if (closingDoor) {
      const realIndex = ROOMS.findIndex((room) => room.id === closingDoor);
      if (realIndex >= 0) loopIndex = realIndex + 1; // +1 because MOBILE_LOOP_ROOMS[0] is the duplicated last room
      setActiveIndex(realIndex);
    }
    didPositionCarouselRef.current = true;
    isLoopJumpingRef.current = true;
    el.scrollTo({ left: cardW * loopIndex, behavior: "auto" });
    requestAnimationFrame(() => {
      isLoopJumpingRef.current = false;
    });
  }, [closingDoor]);

  useEffect(() => {
    if (!closingDoor) return;

    const clearState = window.setTimeout(() => {
      setClosingDoor(null);
      // Scrub closingDoor from the history entry so it won't replay the
      // closing animation if the user later navigates back to this entry.
      try { window.history.replaceState({}, "", window.location.pathname); } catch (_) {}
    }, 1200);

    return () => window.clearTimeout(clearState);
  }, [closingDoor]);

  useEffect(() => {
    return () => {
      if (scrollSettleRef.current) window.clearTimeout(scrollSettleRef.current);
    };
  }, []);

  return (
    <LandingMuseumBackground className="text-foreground">
      <section className="relative z-10 flex h-[100dvh] flex-col justify-center overflow-hidden px-4 py-8 md:px-8 md:py-10">
        {/* Liquid-Glass entry to the artifact gallery, top-right */}
        <button
          type="button"
          onPointerEnter={preloadGalleryRoute}
          onPointerDown={preloadGalleryRoute}
          onFocus={preloadGalleryRoute}
          onClick={() => {
            preloadGalleryRoute();
            navigate("/gallery");
          }}
          aria-label="Explore the artifact gallery"
          className="group/col absolute right-4 top-4 md:right-8 md:top-6 z-30 inline-flex items-center gap-2 rounded-full p-3 sm:px-5 sm:py-2.5 font-['Cinzel'] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#3a2c20] transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-black/25 outline-none"
          style={{
            background: "rgba(255,255,255,0.16)",
            backdropFilter: "blur(18px) saturate(180%)",
            WebkitBackdropFilter: "blur(18px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.55)",
            boxShadow:
              "0 8px 30px -10px rgba(58,44,32,0.35), inset 0 1px 0 0 rgba(255,255,255,0.7), inset 0 -10px 20px -12px rgba(255,255,255,0.3)",
          }}
        >
          <LayoutGrid aria-hidden size={15} strokeWidth={2.1} className="sm:hidden transition-transform duration-300 group-hover/col:scale-110" />
          <span className="hidden sm:inline">Explore Gallery</span>
        </button>

        <motion.header
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto min-h-[9.5rem] text-center lg:min-h-0"
        >
          <h1 className="font-['Cinzel'] text-[clamp(2.3rem,6vw,5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#0a0a0a] drop-shadow-[0_4px_16px_rgba(255,255,255,0.4)]">
            The Unsent<br className="sm:hidden" /> Museum
          </h1>

          {/* Hero sub-line, what this place is for */}
          <p className="mt-4 mx-auto max-w-3xl text-balance font-['Cormorant_Garamond'] text-[clamp(1.05rem,1.8vw,1.5rem)] font-medium italic leading-snug tracking-[0.01em] text-[#3a2c20]/80">
            For every feeling that never found a voice, and every word we carried long after the moment passed.
          </p>
        </motion.header>

        {/* Desktop: 5-column grid. Rendered only at lg+ so the mobile carousel's
            doors aren't also mounted (and vice-versa) — half the doors to build,
            so they paint immediately. No entrance animation: the doors ARE the
            landing page and must be visible the instant it renders. */}
        {isDesktop && (
        <div className="grid mx-auto mt-[min(7vh,3.5rem)] w-full max-w-6xl grid-cols-5 gap-5">
          {ROOMS.map((room) => (
            <div
              key={room.id}
              className="isolate"
              style={{ zIndex: openingRoom === room.id || hoveredRoom === room.id || closingDoor === room.id ? 50 : 1 }}
            >
              <EmotionDoor
                room={room}
                isHovered={hoveredRoom === room.id}
                isOpening={openingRoom === room.id}
                isReturning={closingDoor === room.id}
                isReturnLocked={!!closingDoor && closingDoor !== room.id}
                onHover={(v) => handleDoorHover(room.id, v)}
                onClick={() => handleDoorClick(room)}
              />
            </div>
          ))}
        </div>
        )}

        {/* Mobile + tablet: horizontal snap carousel (rendered only below lg) */}
        {!isDesktop && (
        <div className="mt-[min(5vh,2.25rem)] flex flex-col items-center w-full">
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="w-full flex overflow-x-auto snap-x snap-mandatory px-[14vw]"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              paddingBottom: 16,
            }}
          >
            {MOBILE_LOOP_ROOMS.map((room, i) => (
              <div
                key={`${room.id}-${i}`}
                className="flex-none snap-center px-2 isolate"
                style={{
                  width: "72vw",
                  zIndex: openingRoom === room.id || i === closingMobileLoopIndex ? 50 : 1,
                }}
              >
                <EmotionDoor
                  room={room}
                  isHovered={hoveredRoom === room.id}
                  isOpening={openingRoom === room.id}
                  isReturning={i === closingMobileLoopIndex}
                  isReturnLocked={!!closingDoor && i !== closingMobileLoopIndex}
                  onHover={(v) => handleDoorHover(room.id, v)}
                  onClick={() => handleDoorClick(room)}
                />
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-[7px] mt-6">
            {ROOMS.map((room, i) => (
              <button
                key={room.id}
                onClick={() => scrollToIndex(i)}
                aria-label={`View ${room.name}`}
                disabled={!!closingDoor}
                className="transition-all duration-300"
                style={{
                  width: i === activeIndex ? 22 : 6,
                  height: 6,
                  borderRadius: 9999,
                  background: i === activeIndex ? "rgba(10,10,10,0.72)" : "rgba(10,10,10,0.28)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
        )}
      </section>
    </LandingMuseumBackground>
  );
}
