import { useEffect, useId, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { ROOMS } from "../data/rooms";
import { generateArtifact, Artifact } from "../data/artifacts";

interface Props {
  defaultEmotion: string;
  accentColor: string;
  roomImage: string | null;
  onClose: () => void;
  onArtifactGenerated: (artifact: Artifact) => void;
}

// The message is shown on a small museum card, so it is intentionally short.
const MESSAGE_MAX = 180;

const getGenStages = (emotionName: string) => [
  `Listening to what you couldn't say…`,
  `Turning ${emotionName} into light…`,
  `Letting it breathe…`,
];

export function ArtifactForm({ defaultEmotion, accentColor, roomImage, onClose, onArtifactGenerated }: Props) {
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState(0);
  const titleId = useId();
  const messageId = useId();
  const counterId = useId();

  // Esc closes (when not mid-generation, to avoid orphaning a request).
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !generating) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose, generating]);

  async function handleGenerate() {
    if (!message.trim()) return;
    setGenerating(true);

    const stages = getGenStages(room?.name?.toLowerCase() || defaultEmotion);

    for (let i = 0; i < stages.length; i++) {
      setGenStage(i);
      await new Promise((r) => setTimeout(r, 130));
    }

    const artifact = generateArtifact(
      defaultEmotion,
      message.trim(),
      title.trim(),
      displayName.trim(),
      isAnonymous,
      "public",
      "excerpt"
    );

    await new Promise((r) => setTimeout(r, 150));
    onArtifactGenerated(artifact);
  }

  const room = ROOMS.find((r) => r.id === defaultEmotion);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => e.target === e.currentTarget && !generating && onClose()}
    >
      {/* Background Image Context - Static */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        {room?.fallbackImage ? (
          <img src={room.fallbackImage} alt="" className="w-full h-full object-cover" loading="eager" />
        ) : (
          <div className="w-full h-full" style={{ background: room?.palette.bg || "#000" }} />
        )}
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-xl max-h-[95vh] overflow-y-auto rounded-t-[2.4rem] sm:rounded-[2.25rem] relative"
        style={{
          background: `linear-gradient(135deg, rgba(220,225,218,0.24) 0%, rgba(152,160,142,0.16) 40%, rgba(82,91,82,0.24) 100%)`,
          backdropFilter: "blur(34px) saturate(180%) brightness(1.08)",
          WebkitBackdropFilter: "blur(34px) saturate(180%) brightness(1.08)",
          border: `1.5px solid rgba(255,255,255,0.34)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.62), inset 0 -42px 80px rgba(255,255,255,0.06), 0px 30px 90px rgba(0,0,0,0.46)`,
        }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-t-[2.4rem] sm:rounded-[2.25rem] overflow-hidden" aria-hidden="true">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <div className="absolute left-0 top-14 h-2/3 w-px bg-gradient-to-b from-transparent via-white/45 to-transparent" />
          <div className="absolute -left-24 -top-20 h-72 w-96 rotate-[-16deg] rounded-full bg-white/22 blur-3xl" />
          <div className="absolute right-[-95px] top-10 h-72 w-44 rotate-[18deg] rounded-full bg-white/16 blur-2xl" />
          <div className="absolute right-[-120px] bottom-[-80px] h-80 w-80 rounded-full blur-3xl" style={{ background: `${accentColor}2f` }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.20),transparent_52%)]" />
        </div>

        {/* Generation overlay */}
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl z-20"
              style={{ background: "rgba(5,3,10,0.9)", backdropFilter: "blur(12px)" }}
            >
              <GenLoader stage={genStage} stages={getGenStages(room?.name?.toLowerCase() || defaultEmotion)} accentColor={accentColor} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between p-6 pb-2">
          <div>
            <h2
              id={titleId}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.35rem",
                fontWeight: 400,
                color: "rgba(255,255,255,0.95)",
              }}
            >
              Leave something unsent.
            </h2>
            <p className="text-[10px] uppercase tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.92)" }}>
              Transform your message into a living artifact.
            </p>
          </div>
          {!generating && (
            <button
              onClick={onClose}
              aria-label="Close form"
              className="flex items-center justify-center rounded-full transition-all hover:bg-white/10"
              style={{
                width: 40,
                height: 40,
                background: "rgba(255,255,255,0.16)",
                border: "1.5px solid rgba(255,255,255,0.36)",
                color: "rgba(255,255,255,0.85)"
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="relative z-10 px-6 pb-6 mt-4">
          <div className="grid grid-cols-1 gap-5">
            <FormInput
              label="Title (Optional)"
              value={title}
              onChange={setTitle}
              placeholder="e.g. The Last Train Home"
              accentColor={accentColor}
            />

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor={messageId} className="block text-[10px] tracking-[0.2em] uppercase font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
                  Unsent Message
                </label>
                {/* The message lives on a small museum card, so it is capped at 180 characters.
                    aria-live so screen readers announce the count as the user types. */}
                <span
                  id={counterId}
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-[10px] tabular-nums tracking-widest"
                  style={{ color: message.length >= MESSAGE_MAX ? accentColor : "rgba(255,255,255,0.88)" }}
                >
                  {message.length}/{MESSAGE_MAX}
                </span>
              </div>
              <textarea
                id={messageId}
                aria-describedby={counterId}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                maxLength={MESSAGE_MAX}
                placeholder="I never told you that…"
                rows={5}
                className="w-full resize-none rounded-xl p-4 text-sm transition-all"
                style={{
                  background: "rgba(255,255,255,0.11)",
                  backdropFilter: "blur(16px) saturate(160%)",
                  WebkitBackdropFilter: "blur(16px) saturate(160%)",
                  border: `1.5px solid ${message ? accentColor + "88" : "rgba(255,255,255,0.32)"}`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24)",
                  color: "rgba(255,255,255,0.9)",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1rem",
                  lineHeight: 1.5,
                }}
              />
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="flex-1">
                {!isAnonymous && (
                  <FormInput
                    label="Display Name"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Your name"
                    accentColor={accentColor}
                  />
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0 pb-3">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.92)" }}>Anonymous</span>
                <button
                  type="button"
                  aria-pressed={isAnonymous}
                  aria-label="Toggle anonymous artifact"
                  className="relative w-8 h-4 rounded-full transition-colors"
                  style={{ background: isAnonymous ? accentColor : "rgba(255,255,255,0.15)" }}
                  onClick={() => setIsAnonymous(!isAnonymous)}
                >
                  <span
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform"
                    style={{ left: 0, transform: isAnonymous ? "translateX(17px)" : "translateX(2px)" }}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* Footer Area */}
          <div className="mt-6 pt-5 border-t border-white/5 flex justify-end">
            <motion.button
              whileHover={message ? { scale: 1.02 } : {}}
              whileTap={message ? { scale: 0.98 } : {}}
              onClick={handleGenerate}
              disabled={!message.trim() || generating}
              className="px-6 py-2.5 rounded-full text-[10px] tracking-[0.2em] uppercase transition-all whitespace-nowrap"
              style={{
                background: message ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.11)",
                color: message ? "#111827" : "rgba(255,255,255,0.62)",
                border: `1.5px solid ${message ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}`,
                boxShadow: message ? "0px 12px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.75)" : "none",
                cursor: message ? "pointer" : "not-allowed",
                fontFamily: "'Cinzel', serif",
                fontWeight: 700
              }}
            >
              Generate Artifact
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FormInput({
  label, value, onChange, placeholder, accentColor,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; accentColor: string;
}) {
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className="block text-[10px] tracking-[0.2em] uppercase mb-2 font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-4 py-2.5 text-sm transition-all"
        style={{
          background: "rgba(255,255,255,0.11)",
          backdropFilter: "blur(16px) saturate(160%)",
          WebkitBackdropFilter: "blur(16px) saturate(160%)",
          border: `1.5px solid ${value ? accentColor + "88" : "rgba(255,255,255,0.32)"}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24)",
          color: "rgba(255,255,255,0.9)",
        }}
      />
    </div>
  );
}

function GenLoader({ stage, stages, accentColor }: { stage: number; stages: string[]; accentColor: string }) {
  return (
    <div className="flex flex-col items-center gap-6 px-8 text-center">
      {/* Animated ring */}
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: `${accentColor}40` }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: accentColor }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div
          className="absolute inset-3 rounded-full"
          style={{ background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)` }}
        />
      </div>

      {/* Stage text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "1rem",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.88)",
          }}
        >
          {stages[stage]}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex gap-2">
        {stages.map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            animate={{ scale: i <= stage ? 1.3 : 1, opacity: i <= stage ? 1 : 0.25 }}
            style={{ background: accentColor }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
