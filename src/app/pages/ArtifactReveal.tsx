import { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { motion } from "motion/react";
import { Heart, Share2, Download, ArrowRight } from "lucide-react";
import { Artifact, withSafeShader, MOCK_ARTIFACTS } from "../data/artifacts";
import { WebGLCanvas } from "../components/WebGLCanvas";
import { ROOM_MAP } from "../data/rooms";
import { supabase } from "/utils/supabase/info";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";
import { CryingMaskRender } from "../components/CryingMaskCard";
import { SadnessHeadsRender } from "../components/SadnessHeadsCard";
import { ScratchApparitionRender } from "../components/ScratchApparitionCard";
import { HeadOnFireRender } from "../components/HeadOnFireCard";
import { RewindingHandRender } from "../components/RewindingHandCard";
import { ShoutBehindGlassRender } from "../components/ShoutBehindGlassCard";
import { SmokingSilhouetteRender } from "../components/SmokingSilhouetteCard";
import { downloadArtifact } from "../components/downloadArtifact";
import { trackEvent } from "../analytics";

// Module-level dedup set so artifact_revealed fires once per artifact per session,
// even if the component remounts due to navigation.
const revealedIds = new Set<string>();

export function ArtifactReveal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  // All hooks must run on every render, declared up-front, before any early
  // return, or React throws "rendered more hooks than during the previous render"
  // (which is exactly what crashed a cold /reveal/:id load before).
  const [artifact, setArtifact] = useState<Artifact | undefined>(
    location.state?.artifact ? withSafeShader(location.state.artifact) : undefined,
  );
  const [loading, setLoading] = useState(!artifact);
  const liked = useLiked(id ?? "");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchArtifact() {
      if (artifact) return;
      // A shared link to a mock/seeded artifact has no server row. Resolve it from
      // the local mock set before hitting the network, so those permalinks work
      // (and still work with the backend down) instead of dead-ending at "/".
      const mock = MOCK_ARTIFACTS.find((a) => a.id === id);
      if (mock) { setArtifact(withSafeShader(mock)); setLoading(false); return; }
      try {
        const { data: row, error } = await supabase
          .from("artifacts")
          .select("id, emotion, visibility, created_at, payload")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (row) {
          const merged = {
            ...(row.payload ?? {}),
            id: row.id,
            emotion: row.emotion,
            visibility: row.visibility,
            createdAt: row.created_at,
          };
          const safe = withSafeShader(merged);
          setArtifact(safe);
          // Visitor arrived via a shared link — the artifact was fetched from the server.
          if (id && !revealedIds.has(id)) {
            trackEvent("shared_artifact_opened", {
              artifact_id: safe.id,
              emotion: safe.emotion,
              referrer: document.referrer || "direct",
              artifact_title: safe.title,
            });
          }
        } else {
          navigate("/");
        }
      } catch (err) {
        console.error("Failed to fetch artifact for reveal:", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    fetchArtifact();
  }, [id, artifact]);

  // Track artifact_revealed once per artifact per session, regardless of load source.
  useEffect(() => {
    if (!artifact || !id || revealedIds.has(id)) return;
    revealedIds.add(id);
    const loadSource = location.state?.artifact ? "navigation" : "fetch";
    trackEvent("artifact_revealed", {
      artifact_id: artifact.id,
      emotion: artifact.emotion,
      load_source: loadSource,
      artifact_title: artifact.title,
      is_custom_artifact: !!artifact.custom,
    });
  }, [artifact, id]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#04030a]">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (!artifact) return null;

  const room = ROOM_MAP[artifact.emotion];
  const accentColor = room?.palette.glow || "#9b7ed9";
  const likes = likeCount(artifact.likes ?? 0, liked);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `${artifact!.title} · The Unsent Museum`, text: artifact!.interpretation, url });
        return;
      }
    } catch { /* dismissed, fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  }

  function handleDownload() {
    const liveCanvas = artifact!.custom ? previewRef.current?.querySelector("canvas") : null;
    downloadArtifact(artifact!, room?.palette.bg || "#0a0a0a", liveCanvas);
  }

  const dateStr = new Date(artifact.createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="relative w-full min-h-full flex flex-col items-center justify-center px-4 py-16"
      style={{ background: `radial-gradient(ellipse at 50% 40%, ${room?.palette.accent}30 0%, #04030a 55%)` }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${accentColor}10 0%, transparent 60%)`,
        }}
      />

      {/* Back to Museum, always pinned to the top-left of the viewport */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/")}
        className="fixed left-4 top-4 md:left-8 md:top-6 z-50 flex items-center justify-center rounded-full transition-all"
        style={{
          width: 48,
          height: 48,
          background: "rgba(20,14,28,0.55)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
        aria-label="Back to Museum"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 15.8333L4.16667 10L10 4.16667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M15.8333 10H4.16667" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-1"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 300,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: "-0.01em",
          }}
        >
          {artifact.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="text-center mb-8"
          style={{ 
            color: accentColor, 
            fontSize: "9px", 
            letterSpacing: "0.4em", 
            textTransform: "uppercase",
            fontFamily: "'Cinzel', serif",
            opacity: 0.8
          }}
        >
          {room?.label}
        </motion.p>

        {/* Shader canvas, the artifact */}
        <motion.div
          ref={previewRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative mx-auto rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: "min(100%, 400px)",
            aspectRatio: "1/1",
            boxShadow: `0 0 80px ${accentColor}30, 0 30px 60px rgba(0,0,0,0.5)`,
            border: `1px solid ${accentColor}30`,
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
          ) : (
            <WebGLCanvas
              fragmentShader={artifact.shader.glsl}
              className="absolute inset-0"
              timeOffset={artifact.dna.timeOffset}
              seed={artifact.dna.seed}
              intensity={artifact.dna.intensity}
              unique={!!artifact.dna.unique}
            />
          )}
        </motion.div>

        {/* Interpretation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="mt-8 text-center px-4"
        >
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "1.05rem",
              fontStyle: "italic",
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.8,
            }}
          >
            "{artifact.interpretation}"
          </p>
        </motion.div>

        {/* Creator + date */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="flex items-center justify-center gap-3 mt-6"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: artifact.avatarColor, color: "white", fontSize: "10px" }}
          >
            {artifact.avatarInitials}
          </div>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
            {artifact.creatorDisplayName}
          </span>
          <span style={{ color: "rgba(255,255,255,0.55)" }} aria-hidden="true">·</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
            {dateStr}
          </span>
        </motion.div>

        {/* Visibility badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex justify-center mt-3"
        >
          <span
            className="text-xs px-3 py-1 rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            {artifact.visibility === "public"
              ? `Now showing in the Museum of ${room?.name || "Artifacts"}.`
              : artifact.visibility === "private"
              ? "Only you can see this artifact."
              : "Shareable via direct link."}
          </span>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="flex flex-row flex-wrap gap-2.5 justify-center mt-8"
        >
          <ActionButton
            icon={<Heart size={14} fill={liked ? "#ff6b7a" : "none"} />}
            label={`${likes}`}
            active={liked}
            activeColor="#ff6b7a"
            accentColor={accentColor}
            onClick={() => toggleLike(id ?? artifact!.id)}
          />
          <ActionButton
            icon={<Share2 size={14} />}
            label={copied ? "Copied!" : "Share"}
            accentColor={accentColor}
            onClick={handleShare}
          />
          <ActionButton
            icon={<Download size={14} />}
            label="Download"
            accentColor={accentColor}
            onClick={handleDownload}
          />
        </motion.div>

        {/* Navigation CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.4 }}
          className="flex justify-center mt-12 items-center"
        >
          <button
            onClick={() => navigate(`/gallery/${artifact.emotion}`)}
            className="flex items-center gap-3 px-8 py-4 rounded-full text-[11px] tracking-[0.3em] uppercase transition-all hover:opacity-80"
            style={{
              background: `${accentColor}20`,
              border: `1px solid ${accentColor}50`,
              color: accentColor,
              fontFamily: "'Cinzel', serif",
              fontWeight: 700
            }}
          >
            View Gallery
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function ActionButton({
  icon, label, active, activeColor, accentColor, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  activeColor?: string;
  accentColor: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-semibold"
      style={{
        background: active ? `${activeColor}20` : "rgba(255,255,255,0.05)",
        border: `1px solid ${active ? activeColor + "50" : "rgba(255,255,255,0.1)"}`,
        color: active ? activeColor : "rgba(255,255,255,0.5)",
        fontFamily: "'Cinzel', serif"
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}
