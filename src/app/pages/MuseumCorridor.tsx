import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ROOMS, RoomDef } from "../data/rooms";
import { PresenceAvatars } from "../components/PresenceAvatars";
import { EmotionDoorImage } from "../components/EmotionDoorImage";

export function MuseumCorridor() {
  const navigate = useNavigate();
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [openingRoom, setOpeningRoom] = useState<string | null>(null);

  function handleDoorClick(room: RoomDef) {
    if (openingRoom) return;
    setOpeningRoom(room.id);
    setTimeout(() => navigate(`/room/${room.id}`), 1100);
  }

  return (
    <div
      className="relative w-full min-h-full overflow-x-hidden"
      style={{ background: "linear-gradient(to bottom, #0a0608 0%, #050305 40%, #030205 100%)" }}
    >
      <CorridorLines />

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <button
            onClick={() => navigate("/")}
            className="text-xs tracking-[0.25em] text-white/25 uppercase hover:text-white/50 transition-colors mb-4"
          >
            ← The Unsent Museum
          </button>
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(1.4rem, 4vw, 2.2rem)",
              fontWeight: 300,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.1em",
            }}
          >
            Choose a room
          </h2>
          <p className="mt-2 text-sm text-white/25">Each door holds a different feeling. Walk through one.</p>
        </motion.div>
      </div>

      {/* Doors */}
      <div className="relative z-10 px-4 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
          {ROOMS.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 * i, duration: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <EmotionDoor
                room={room}
                isHovered={hoveredRoom === room.id}
                isOpening={openingRoom === room.id}
                onHover={(v) => setHoveredRoom(v ? room.id : null)}
                onClick={() => handleDoorClick(room)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Description tooltip */}
      <AnimatePresence>
        {hoveredRoom && !openingRoom && (
          <motion.div
            key={hoveredRoom}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none"
          >
            {(() => {
              const room = ROOMS.find((r) => r.id === hoveredRoom)!;
              return (
                <div
                  className="px-6 py-3 rounded-full text-sm"
                  style={{
                    background: "rgba(8,5,14,0.9)",
                    border: `1px solid ${room.palette.glow}35`,
                    color: room.palette.text,
                    backdropFilter: "blur(16px)",
                    boxShadow: `0 0 30px ${room.palette.glow}20`,
                  }}
                >
                  {room.description}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen opening flash */}
      <AnimatePresence>
        {openingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="fixed inset-0 z-40 pointer-events-none"
            style={{
              background: (() => {
                const room = ROOMS.find((r) => r.id === openingRoom);
                return room
                  ? `radial-gradient(ellipse at center, ${room.palette.glow}50 0%, transparent 70%)`
                  : "transparent";
              })(),
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── EmotionDoor ─────────────────────────────────────────────────────────────

interface DoorProps {
  room: RoomDef;
  isHovered: boolean;
  isOpening: boolean;
  onHover: (v: boolean) => void;
  onClick: () => void;
}

function EmotionDoor({ room, isHovered, isOpening, onHover, onClick }: DoorProps) {
  // How far each gate swings on hover vs full open
  const hoverAngle = 22;
  const openAngle = 82;

  const leftAngle = isOpening ? -openAngle : isHovered ? -hoverAngle : 0;
  const rightAngle = isOpening ? openAngle : isHovered ? hoverAngle : 0;

  const springConfig = isOpening
    ? { type: "spring" as const, stiffness: 80, damping: 18 }
    : { type: "spring" as const, stiffness: 160, damping: 22 };

  return (
    <div
      className="flex flex-col items-center gap-3 cursor-pointer select-none group"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
    >
      {/* Door frame */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: "2/3",
          perspective: "700px",
        }}
      >
        {/* Ambient glow behind the door */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          animate={{
            opacity: isHovered || isOpening ? 1 : 0,
            scale: isHovered ? 1.04 : 1,
          }}
          transition={{ duration: 0.4 }}
          style={{
            background: `radial-gradient(ellipse at center, ${room.palette.glow}70 0%, ${room.palette.accent}40 40%, transparent 70%)`,
            filter: "blur(8px)",
          }}
        />

        {/* Arch / stone surround, always visible */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            background: `linear-gradient(160deg, ${room.palette.bg} 0%, rgba(5,3,8,0.95) 100%)`,
          }}
        >
          <EmotionDoorImage
            door={room.door}
            alt={room.name}
            className="w-full h-full object-cover"
            style={{ opacity: 0.2, mixBlendMode: "luminosity" }}
            draggable={false}
          />
        </div>

        {/* ── LEFT GATE ── */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: "inset(0 50% 0 0)" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
            animate={{ rotateY: leftAngle }}
            transition={springConfig}
          >
            {/* Gate face */}
            <div className="absolute inset-0 overflow-hidden">
              <EmotionDoorImage
                door={room.door}
                alt=""
                className="absolute top-0 left-0 w-full h-full object-cover"
                style={{ opacity: isHovered || isOpening ? 0.95 : 0.82 }}
                draggable={false}
              />
              {/* Colour tint */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(140deg, ${room.palette.accent}30 0%, transparent 60%)`,
                  mixBlendMode: "screen",
                }}
              />
              {/* Center seam shadow on left gate */}
              <div
                className="absolute top-0 right-0 bottom-0 w-4"
                style={{
                  background: "linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)",
                }}
              />
            </div>
            {/* Gate depth edge */}
            <div
              className="absolute top-0 right-0 bottom-0"
              style={{
                width: "10px",
                background: `linear-gradient(to right, ${room.palette.accent}80, rgba(0,0,0,0.6))`,
                transform: "translateX(10px) rotateY(90deg)",
                transformOrigin: "left center",
              }}
            />
          </motion.div>
        </div>

        {/* ── RIGHT GATE ── */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: "inset(0 0 0 50%)" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ transformOrigin: "right center", transformStyle: "preserve-3d" }}
            animate={{ rotateY: rightAngle }}
            transition={springConfig}
          >
            {/* Gate face */}
            <div className="absolute inset-0 overflow-hidden">
              <EmotionDoorImage
                door={room.door}
                alt=""
                className="absolute top-0 left-0 w-full h-full object-cover"
                style={{ opacity: isHovered || isOpening ? 0.95 : 0.82 }}
                draggable={false}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(140deg, transparent 40%, ${room.palette.accent}25 100%)`,
                  mixBlendMode: "screen",
                }}
              />
              {/* Center seam shadow on right gate */}
              <div
                className="absolute top-0 left-0 bottom-0 w-4"
                style={{
                  background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)",
                }}
              />
            </div>
            {/* Gate depth edge */}
            <div
              className="absolute top-0 left-0 bottom-0"
              style={{
                width: "10px",
                background: `linear-gradient(to left, ${room.palette.accent}80, rgba(0,0,0,0.6))`,
                transform: "translateX(-10px) rotateY(-90deg)",
                transformOrigin: "right center",
              }}
            />
          </motion.div>
        </div>

        {/* ── LIGHT SPILL through the gap ── */}
        <AnimatePresence>
          {(isHovered || isOpening) && (
            <motion.div
              key="gap-light"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute top-0 bottom-0 left-1/2 pointer-events-none"
              style={{
                width: isOpening ? "60%" : "6px",
                transform: "translateX(-50%)",
                background: `radial-gradient(ellipse at center, ${room.palette.glow}ff 0%, ${room.palette.glow}99 30%, transparent 70%)`,
                filter: "blur(4px)",
                transition: "width 0.9s ease",
              }}
            />
          )}
        </AnimatePresence>

        {/* Room name label at base */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-3 pt-8 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
        >
          <motion.span
            animate={{ color: isHovered ? room.palette.glow : "rgba(255,255,255,0.5)" }}
            transition={{ duration: 0.3 }}
            className="text-xs tracking-[0.22em] uppercase"
          >
            {room.name}
          </motion.span>
        </div>
      </div>

      {/* Info below door */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <p
          className="text-xs text-center"
          style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic", lineHeight: 1.5 }}
        >
          {room.tagline}
        </p>
        <PresenceAvatars
          count={room.visitorCount}
          accentColor={room.palette.glow}
        />
      </div>
    </div>
  );
}

// ─── Corridor perspective lines ───────────────────────────────────────────────

function CorridorLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.07 }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const spread = (i - 4.5) * 110;
          return (
            <line
              key={i}
              x1={720 + spread}
              y1={900}
              x2={720 + spread * 0.04}
              y2={0}
              stroke="white"
              strokeWidth="0.6"
            />
          );
        })}
        {[0.15, 0.35, 0.55, 0.75, 0.9].map((y, i) => (
          <line key={i} x1={0} y1={y * 900} x2={1440} y2={y * 900} stroke="white" strokeWidth="0.3" />
        ))}
      </svg>
    </div>
  );
}
