import { useState } from "react";
import { motion } from "motion/react";
import { Heart, Share2, Download } from "lucide-react";
import { Artifact } from "../data/artifacts";
import { ShaderThumb } from "./ShaderThumb";
import { ROOM_MAP } from "../data/rooms";
import { useLiked, toggleLike, likeCount } from "../hooks/useLikeStore";
import { downloadArtifact } from "./downloadArtifact";

interface Props {
  artifact: Artifact;
  onClick: () => void;
  onLike?: () => void;
  showTag?: boolean;
}

export function ShaderArtifactCard({ artifact, onClick, onLike, showTag }: Props) {
  const [hovered, setHovered] = useState(false);
  const liked = useLiked(artifact.id);
  const likes = likeCount(artifact.likes, liked);
  const room = ROOM_MAP[artifact.emotion];
  const accentColor = room?.palette.glow || "#9b7ed9";

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    toggleLike(artifact.id);
    onLike?.();
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/reveal/${artifact.id}`;
    if (navigator.share) {
      navigator.share({ title: `${artifact.title} · The Unsent Museum`, text: artifact.messageExcerpt, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).catch(() => {});
    }
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    downloadArtifact(artifact, room?.palette.bg || "#0a0a0a");
  }

  const dateStr = new Date(artifact.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      className="w-full h-[430px] rounded-2xl overflow-hidden cursor-pointer flex flex-col"
      style={{
        background: "rgba(8,5,14,0.9)",
        border: `1px solid ${hovered ? accentColor + "40" : "rgba(255,255,255,0.06)"}`,
        boxShadow: hovered ? `0 0 40px ${accentColor}20, 0 8px 32px rgba(0,0,0,0.4)` : "0 4px 20px rgba(0,0,0,0.3)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Shader preview, always live */}
      <div className="relative h-[230px] shrink-0 overflow-hidden">
        <ShaderThumb
          fragmentShader={artifact.shader.glsl}
          className="absolute inset-0"
          timeOffset={artifact.dna.timeOffset}
          seed={artifact.dna.seed}
          intensity={artifact.dna.intensity}
          unique={!!artifact.dna.unique}
          paused={false}
          maxDpr={1}
          fps={30}
        />
        {showTag && (
          <div className="absolute top-3 left-3">
            <span
              className="px-2.5 py-1 rounded-full text-xs capitalize tracking-wider"
              style={{
                background: `${accentColor}25`,
                border: `1px solid ${accentColor}40`,
                color: accentColor,
                backdropFilter: "blur(8px)",
              }}
            >
              {artifact.emotion}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3
          className="line-clamp-2"
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "0.95rem",
            fontWeight: 400,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.4,
          }}
        >
          {artifact.title}
        </h3>

        {artifact.messageExcerpt && (
          <p
            className="text-xs line-clamp-2 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.9)", fontStyle: "italic" }}
          >
            "{artifact.messageExcerpt}"
          </p>
        )}

        {/* Creator row */}
        <div className="mt-auto flex items-center gap-2 pt-1">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: artifact.avatarColor, color: "white", fontSize: "8px" }}
          >
            {artifact.avatarInitials}
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
            {artifact.creatorDisplayName}
          </span>
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            {dateStr}
          </span>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-3 pt-2 mt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: liked ? "#ff6b7a" : "rgba(255,255,255,0.9)" }}
          >
            <Heart size={13} fill={liked ? "#ff6b7a" : "none"} />
            {likes}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            <Share2 size={13} />
            {artifact.shares}
          </button>
          <button
            onClick={handleDownload}
            className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            <Download size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
