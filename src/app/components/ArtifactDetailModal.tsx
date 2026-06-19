import { useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Heart, Share2, Download, Flag, ArrowRight } from "lucide-react";
import { Artifact } from "../data/artifacts";
import { WebGLCanvas } from "./WebGLCanvas";
import { ROOM_MAP, ROOMS } from "../data/rooms";
import { useNavigate } from "react-router";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";
import { CryingMaskRender } from "./CryingMaskCard";
import { SadnessHeadsRender } from "./SadnessHeadsCard";
import { downloadArtifact } from "./downloadArtifact";

interface Props {
  artifact: Artifact;
  onClose: () => void;
}

export function ArtifactDetailModal({ artifact, onClose }: Props) {
  const navigate = useNavigate();
  const room = ROOM_MAP[artifact.emotion];
  const accentColor = room?.palette.glow || "#9b7ed9";
  const liked = useLiked(artifact.id);
  const likes = likeCount(artifact.likes, liked);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Share: native share sheet where available (mobile), otherwise copy a real,
  // openable link (/reveal/:id) and show "Copied!" so the click has visible effect.
  async function handleShare() {
    const url = `${window.location.origin}/reveal/${artifact.id}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `${artifact.title} · The Unsent Museum`, text: artifact.interpretation, url });
        return;
      }
    } catch { /* user dismissed the sheet, fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked (insecure context), nothing else to do */ }
  }

  // Download a PNG. For shader artifacts the shared engine renders a fresh 1024²
  // frame; for custom mask/heads pieces we export the live preview canvas so the
  // saved image matches what's on screen (not an unrelated fallback shader).
  function handleDownload() {
    const liveCanvas = artifact.custom ? previewRef.current?.querySelector("canvas") : null;
    downloadArtifact(artifact, room?.palette.bg || "#0a0a0a", liveCanvas);
  }

  const dateStr = new Date(artifact.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 250 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{
          background: "rgba(6,4,12,0.98)",
          border: `1px solid ${accentColor}25`,
          boxShadow: `0 0 100px ${accentColor}20, 0 40px 80px rgba(0,0,0,0.6)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-30 flex items-center justify-center rounded-full transition-all hover:bg-white/10"
          style={{
            width: 44,
            height: 44,
            background: "rgba(6,4,12,0.72)",
            border: "1px solid rgba(255,255,255,0.16)",
            color: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          aria-label="Close artifact details"
        >
          <X size={19} />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Shader / canvas preview */}
          <div ref={previewRef} className="md:w-[45%] relative overflow-hidden rounded-tl-2xl rounded-tr-2xl md:rounded-tr-none md:rounded-bl-2xl" style={{ aspectRatio: "1/1", minHeight: "280px" }}>
            {artifact.custom === "mask" ? (
              <CryingMaskRender className="absolute inset-0" />
            ) : artifact.custom === "heads" ? (
              <SadnessHeadsRender className="absolute inset-0" />
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
          </div>

          {/* Content */}
          <div className="flex-1 p-6 pt-16 md:pt-6 md:pr-16 flex flex-col gap-4">
            {/* Emotion tag */}
            <div>
              <span
                className="text-xs px-3 py-1 rounded-full capitalize tracking-wider"
                style={{
                  background: `${accentColor}20`,
                  border: `1px solid ${accentColor}40`,
                  color: accentColor,
                }}
              >
                {room?.label || artifact.emotion}
              </span>
            </div>

            {/* Title */}
            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "1.5rem",
                fontWeight: 300,
                color: "rgba(255,255,255,0.9)",
                lineHeight: 1.3,
              }}
            >
              {artifact.title}
            </h2>

            {/* Interpretation */}
            <p
              style={{
                fontStyle: "italic",
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.875rem",
                lineHeight: 1.7,
              }}
            >
              {artifact.interpretation}
            </p>

            {/* Message */}
            {artifact.messageVisibility !== "hidden" && (
              <div
                className="p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p
                  style={{
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: "0.875rem",
                    lineHeight: 1.8,
                  }}
                >
                  "{artifact.messageVisibility === "public" && artifact.fullMessage
                    ? artifact.fullMessage
                    : artifact.messageExcerpt}"
                </p>
                {artifact.messageVisibility === "excerpt" && (
                  <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                    The full message is private.
                  </p>
                )}
              </div>
            )}

            {/* Creator */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{ background: artifact.avatarColor, color: "white", fontSize: "10px", fontWeight: 600 }}
              >
                {artifact.avatarInitials}
              </div>
              <div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {artifact.creatorDisplayName}
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {dateStr}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-auto">
              <button
                onClick={() => toggleLike(artifact.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all"
                style={{
                  background: liked ? "#ff6b7a20" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${liked ? "#ff6b7a50" : "rgba(255,255,255,0.1)"}`,
                  color: liked ? "#ff6b7a" : "rgba(255,255,255,0.5)",
                }}
              >
                <Heart size={12} fill={liked ? "#ff6b7a" : "none"} />
                {likes}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all hover:opacity-70"
                style={{
                  background: copied ? `${accentColor}20` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${copied ? accentColor + "50" : "rgba(255,255,255,0.1)"}`,
                  color: copied ? accentColor : "rgba(255,255,255,0.5)",
                }}
              >
                <Share2 size={12} />
                {copied ? "Copied!" : "Share"}
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs transition-all hover:opacity-70"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                <Download size={12} />
                Download
              </button>

              <button
                className="ml-auto flex items-center gap-1 px-3 py-2 rounded-full text-xs transition-all hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                <Flag size={11} />
              </button>
            </div>

            {/* CTA */}
            <button
              onClick={() => { onClose(); navigate(`/room/${artifact.emotion}`); }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm"
              style={{
                background: `${accentColor}20`,
                border: `1px solid ${accentColor}40`,
                color: accentColor,
              }}
            >
              Create your own artifact
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
