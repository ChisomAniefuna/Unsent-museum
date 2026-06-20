import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { LayoutGrid } from "lucide-react";
import { ROOMS, RoomDef } from "../data/rooms";
import { EmotionDoor } from "../components/EmotionDoor";
import { LandingMuseumBackground } from "../components/LandingMuseumBackground";

const MOBILE_LOOP_ROOMS = [ROOMS[ROOMS.length - 1], ...ROOMS, ROOMS[0]];

export function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [openingRoom, setOpeningRoom] = useState<string | null>(null);
  const closingDoor = (location.state as { closingDoor?: string } | null)?.closingDoor ?? null;
  // Seed the carousel position from closingDoor on FIRST render. Otherwise
  // activeIndex starts at 0 (love), the carousel paints with love centered,
  // and only after the effect runs does it scroll to the returning room - so
  // the visitor briefly sees the wrong door swap in before "their" door
  // settles. This makes the carousel paint correctly on the very first frame.
  const initialIndex = (() => {
    if (!closingDoor) return 0;
    const i = ROOMS.findIndex((r) => r.id === closingDoor);
    return i >= 0 ? i : 0;
  })();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollSettleRef = useRef<number | null>(null);
  const isLoopJumpingRef = useRef(false);

  function handleDoorClick(room: RoomDef) {
    if (openingRoom) return;
    setOpeningRoom(room.id);
    pendo.track("emotion_room_entered", {
      emotion: room.id,
      room_name: room.name,
    });
    window.setTimeout(() => navigate(`/room/${room.id}`), 680);
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
    if (!el || isLoopJumpingRef.current) return;

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
    if (!el) return;
    el.scrollTo({ left: getMobileCardWidth() * (i + 1), behavior: "smooth" });
    setActiveIndex(i);
  }

  useEffect(() => {
    if (closingDoor) return;
    requestAnimationFrame(() => jumpToLoopIndex(1));

    return () => {
      if (scrollSettleRef.current) window.clearTimeout(scrollSettleRef.current);
    };
  }, [closingDoor]);

  // Returning from a room should feel like the same doorway closing behind the visitor,
  // not like a fresh museum load. The route still remounts, but only the visited door
  // receives the closing animation and the history state is immediately cleared.
  useEffect(() => {
    if (!closingDoor) return;

    const index = ROOMS.findIndex((room) => room.id === closingDoor);
    if (index >= 0) {
      setActiveIndex(index);
      requestAnimationFrame(() => scrollToIndex(index));
    }

    const clearState = window.setTimeout(() => {
      navigate(".", { replace: true, state: null });
    }, 900);

    return () => window.clearTimeout(clearState);
  }, [closingDoor, navigate]);

  return (
    <LandingMuseumBackground className="text-foreground">
      <section className="relative z-10 flex h-[100dvh] flex-col justify-center overflow-hidden px-4 py-8 md:px-8 md:py-10">
        {/* Liquid-Glass entry to the artifact gallery, top-right */}
        <button
          type="button"
          onClick={() => navigate("/gallery")}
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
          className="mx-auto text-center"
        >
          <h1 className="font-['Cinzel'] text-[clamp(2.3rem,6vw,5rem)] font-black uppercase leading-[0.9] tracking-[-0.05em] text-[#0a0a0a] drop-shadow-[0_4px_16px_rgba(255,255,255,0.4)]">
            The Unsent<br className="sm:hidden" /> Museum
          </h1>

          {/* Hero sub-line, what this place is for */}
          <p className="mt-4 mx-auto max-w-3xl text-balance font-['Cormorant_Garamond'] text-[clamp(1.05rem,1.8vw,1.5rem)] font-medium italic leading-snug tracking-[0.01em] text-[#3a2c20]/80">
            For every feeling that never found a voice, and every word we carried long after the moment passed.
          </p>
        </motion.header>

        {/* Desktop: 5-column grid */}
        <div className="hidden lg:grid mx-auto mt-[min(7vh,3.5rem)] w-full max-w-6xl grid-cols-5 gap-5">
          {ROOMS.map((room, i) => (
            <motion.div
              key={room.id}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
              className="isolate"
              style={{ zIndex: openingRoom === room.id || hoveredRoom === room.id ? 50 : 1 }}
            >
              <EmotionDoor
                room={room}
                isHovered={hoveredRoom === room.id}
                isOpening={openingRoom === room.id}
                isClosingReturn={closingDoor === room.id}
                onHover={(v) => setHoveredRoom(v ? room.id : null)}
                onClick={() => handleDoorClick(room)}
              />
            </motion.div>
          ))}
        </div>

        {/* Mobile + tablet: horizontal snap carousel */}
        <div className="lg:hidden mt-[min(5vh,2.25rem)] flex flex-col items-center w-full">
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
            {MOBILE_LOOP_ROOMS.map((room, i) => {
              const realIndex = (i - 1 + ROOMS.length) % ROOMS.length;
              return (
              <motion.div
                key={`${room.id}-${i}`}
                className="flex-none snap-center px-2 isolate"
                style={{
                  width: "72vw",
                  zIndex: openingRoom === room.id ? 50 : 1,
                }}
                initial={closingDoor ? false : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 * realIndex, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <EmotionDoor
                  room={room}
                  isHovered={hoveredRoom === room.id}
                  isOpening={openingRoom === room.id}
                  isClosingReturn={closingDoor === room.id}
                  onHover={(v) => setHoveredRoom(v ? room.id : null)}
                  onClick={() => handleDoorClick(room)}
                />
              </motion.div>
              );
            })}
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-[7px] mt-6">
            {ROOMS.map((room, i) => (
              <button
                key={room.id}
                onClick={() => scrollToIndex(i)}
                aria-label={`View ${room.name}`}
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
      </section>
    </LandingMuseumBackground>
  );
}
