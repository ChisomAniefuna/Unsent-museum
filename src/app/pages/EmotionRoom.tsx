import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ROOM_MAP } from "../data/rooms";
import { PresenceAvatars } from "../components/PresenceAvatars";
import { ArtifactForm } from "../components/ArtifactForm";
import { Artifact } from "../data/artifacts";
import { saveArtifact, addCreatedArtifact } from "../hooks/useArtifacts";
import { trackEvent } from "../analytics";
import { preloadGalleryRoute } from "../routePreloads";

export function EmotionRoom() {
  const { emotion } = useParams<{ emotion: string }>();
  const navigate = useNavigate();
  // Entering a room takes the visitor straight to the writing form, that's the
  // whole point of the room. The cinematic video + room card sit behind it, so
  // closing the form reveals the room rather than gating the form behind a CTA.
  const [formOpen, setFormOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Track which room's video is playing, automatically false when room changes, no async reset needed.
  const [playingRoomId, setPlayingRoomId] = useState<string | null>(null);
  const [errorRoomId, setErrorRoomId] = useState<string | null>(null);

  const room = ROOM_MAP[emotion || "grief"];
  const videoPlaying = playingRoomId === room?.id;
  const videoError = errorRoomId === room?.id;

  useEffect(() => {
    if (!room) navigate("/");
  }, [room]);

  function openMemoryForm() {
    if (!room || formOpen || generating || leavingRoom) return;
    setFormOpen(true);
    trackEvent("open_memory_form", {
      emotion: room.id,
      room_name: room.name,
      source: "cta",
    });
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => { v.play().catch(() => {}); };
    v.addEventListener("canplay", tryPlay);
    v.addEventListener("canplaythrough", tryPlay);
    v.addEventListener("loadeddata", tryPlay);
    tryPlay();
    return () => {
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("canplaythrough", tryPlay);
      v.removeEventListener("loadeddata", tryPlay);
    };
  }, [room?.id]);

  function handleReturnToMuseum() {
    if (!room || leavingRoom) return;
    setLeavingRoom(true);
    window.setTimeout(() => {
      navigate("/", { state: { closingDoor: room.id, closingAt: Date.now() }, replace: true });
    }, 220);
  }

  function handleArtifactGenerated(artifact: Artifact) {
    setGenerating(true);
    // Cache locally first so the artifact enters the gallery immediately and
    // survives reloads, regardless of whether the backend save succeeds.
    addCreatedArtifact(artifact);

    // Do not make the reveal wait on Supabase. The visitor should see their
    // artifact as soon as it is generated; persistence continues in the
    // background so new visitors can pick it up from the public gallery.
    navigate(`/reveal/${artifact.id}`, { state: { artifact } });
    setGenerating(false);
    setFormOpen(false);

    saveArtifact(artifact)
      .then((saved) => {
        addCreatedArtifact(saved); // keep the cached copy in sync with the server row
        trackEvent("artifact_created", {
          emotion: saved.emotion,
          message_length: saved.messageExcerpt?.length || 0,
          has_title: !!saved.title,
          is_anonymous: saved.isAnonymous,
          visibility: saved.visibility,
          message_visibility: saved.messageVisibility,
          shader_index: saved.dna.shaderIndex,
          seed: saved.dna.seed,
          artifact_id: saved.id,
          save_success: true,
        });
      })
      .catch((err) => {
        console.error("Failed to save artifact:", err);
        trackEvent("artifact_save_failed", {
          artifact_id: artifact.id,
          emotion: artifact.emotion,
          error_message: String(err instanceof Error ? err.message : err).substring(0, 100),
        });
        trackEvent("artifact_created", {
          emotion: artifact.emotion,
          message_length: artifact.messageExcerpt?.length || 0,
          has_title: !!artifact.title,
          is_anonymous: artifact.isAnonymous,
          visibility: artifact.visibility,
          message_visibility: artifact.messageVisibility,
          shader_index: artifact.dna.shaderIndex,
          seed: artifact.dna.seed,
          artifact_id: artifact.id,
          save_success: false,
        });
      });
  }

  if (!room) return null;

  // Show PNG fallback when video hasn't started or errored
  const showFallback = !videoPlaying || videoError;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: room.palette.bg }}>
      {/* Fallback layer, always visible, fades out once video plays */}
      {room.fallbackImage ? (
        <img
          src={room.fallbackImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: showFallback ? 1 : 0, transition: "opacity 1.6s ease" }}
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 40% 60%, ${room.palette.accent}cc 0%, ${room.palette.bg} 55%), radial-gradient(ellipse at 75% 30%, ${room.palette.glow}33 0%, transparent 55%)`,
          }}
        />
      )}

      {/* Video */}
      <video
        key={room.videoUrl}
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src={room.videoUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={() => setPlayingRoomId(room.id)}
        onError={() => setErrorRoomId(room.id)}
        style={{ opacity: videoPlaying && !videoError ? 1 : 0, transition: "opacity 2s ease" }}
      />

      {/* Cinematic overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.65) 100%)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.48) 100%)" }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-8 md:p-12">
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: leavingRoom ? 0.55 : 1 }}
          transition={{ duration: 0.4 }}
          onClick={handleReturnToMuseum}
          className="relative flex-shrink-0"
          style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
          aria-label="Go back"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 15.8333L4.16667 10L10 4.16667" stroke="white" strokeOpacity="0.8" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15.8333 10H4.16667" stroke="white" strokeOpacity="0.8" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <PresenceAvatars
            count={room.visitorCount}
            accentColor={room.palette.glow}
          />
          <button
            onPointerEnter={preloadGalleryRoute}
            onPointerDown={preloadGalleryRoute}
            onFocus={preloadGalleryRoute}
            onClick={() => {
              preloadGalleryRoute();
              navigate(`/gallery/${room.id}`);
            }}
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            aria-label="View artifacts gallery"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="white" strokeOpacity="0.8" strokeWidth="1.1"/>
              <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" stroke="white" strokeOpacity="0.8" strokeWidth="1.1"/>
              <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" stroke="white" strokeOpacity="0.8" strokeWidth="1.1"/>
              <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" stroke="white" strokeOpacity="0.8" strokeWidth="1.1"/>
            </svg>
          </button>
        </motion.div>
      </div>

      {/* Bottom Card */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 0.9 }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full origin-bottom"
          style={{ maxWidth: 380 }}
        >
          <div
            className="relative rounded-[24px] w-full overflow-hidden"
            style={{ 
              background: "rgba(255,255,255,0.045)", 
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.13)"
            }}
          >
            <div
              className="absolute inset-0 rounded-[24px] pointer-events-none"
              style={{ boxShadow: "0px 22px 48px rgba(0,0,0,0.42)" }}
            />
            <div className="flex flex-col items-center px-8 py-8 md:px-10 md:py-10 text-center">
              <p
                className="text-white lowercase mb-1"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 500,
                  fontSize: "clamp(1.25rem, 2vw, 1.8rem)",
                  letterSpacing: "0.02em",
                  lineHeight: 1.1,
                }}
              >
                museum of {room.name.toLowerCase()}
              </p>
              <p
                className="text-white mb-6"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                  fontSize: "clamp(0.8rem, 1vw, 0.95rem)",
                  opacity: 0.75,
                  maxWidth: "85%",
                }}
              >
                {room.description}
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={openMemoryForm}
                className="relative flex-shrink-0"
                style={{
                  height: 48,
                  paddingLeft: 32,
                  paddingRight: 32,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.45)",
                  boxShadow: "0px 8px 24px rgba(0,0,0,0.3)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    color: "white",
                  }}
                >
                  {generating ? "Saving..." : "enter memory"}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {formOpen && (
          <ArtifactForm
            defaultEmotion={room.id}
            accentColor={room.palette.glow}
            roomImage={room.fallbackImage}
            onClose={() => setFormOpen(false)}
            onArtifactGenerated={handleArtifactGenerated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
