import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Search, LayoutGrid, GalleryHorizontalEnd, ChevronDown, Plus } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { ROOMS } from "../data/rooms";
import { Artifact } from "../data/artifacts";
import { ShaderArtifactCard } from "../components/ShaderArtifactCard";
import { ShaderCarousel3D } from "../components/ShaderCarousel3D";
import { ArtifactDetailModal } from "../components/ArtifactDetailModal";
import { addCreatedArtifact, saveArtifact, useArtifacts } from "../hooks/useArtifacts";
import { CryingMaskCard } from "../components/CryingMaskCard";
import { SadnessHeadsCard } from "../components/SadnessHeadsCard";
import { ScratchApparitionCard } from "../components/ScratchApparitionCard";
import { HeadOnFireCard } from "../components/HeadOnFireCard";
import { RewindingHandCard } from "../components/RewindingHandCard";
import { ShoutBehindGlassCard } from "../components/ShoutBehindGlassCard";
import { SmokingSilhouetteCard } from "../components/SmokingSilhouetteCard";
import { ArtifactForm } from "../components/ArtifactForm";
import { trackEvent } from "../analytics";

type SortMode = "newest" | "liked" | "shared";
type ViewMode = "carousel" | "grid";

// Spread the list so no two cards within a row share the same shader (which would
// read as look-alikes). Keeps sort order otherwise: at each step it takes the
// earliest item whose shader differs from the last few already placed.
function deClumpByShader(items: Artifact[]): Artifact[] {
  const pending = [...items];
  const out: Artifact[] = [];
  while (pending.length) {
    const recent = out.slice(-3).map((a) => a.dna.shaderIndex);
    let idx = pending.findIndex((a) => !recent.includes(a.dna.shaderIndex));
    if (idx === -1) idx = 0; // all remaining clash, take the next anyway
    out.push(pending.splice(idx, 1)[0]);
  }
  return out;
}

export function ArtifactGallery() {
  const { emotion } = useParams<{ emotion: string }>();
  const navigate = useNavigate();
  const [activeEmotion, setActiveEmotion] = useState<string>(
    emotion && emotion !== "all" ? emotion : "all"
  );
  // Newest first by default so a visitor's just-created artifact leads the gallery.
  const [sort, setSort] = useState<SortMode>("newest");
  const [view, setView] = useState<ViewMode>("carousel");
  const [search, setSearch] = useState("");
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { artifacts } = useArtifacts();

  // Keep the active room in sync with the URL (/gallery/:emotion), including when
  // navigating between rooms without a full remount.
  useEffect(() => {
    setActiveEmotion(emotion && emotion !== "all" ? emotion : "all");
  }, [emotion]);

  // Debounced search tracking — fires 600ms after the visitor stops typing.
  const searchTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!search.trim()) return;
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      trackEvent("gallery_searched", {
        query: search.trim().substring(0, 100),
        results_count: filtered.length,
        active_emotion_filter: activeEmotion,
        sort_mode: sort,
        view_mode: view,
      });
    }, 600);
    return () => { if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current); };
  }, [search]);

  const handleEmotionChange = useCallback((value: string) => {
    setActiveEmotion(value);
    trackEvent("gallery_filtered", {
      emotion_filter: value,
      sort_mode: sort,
      view_mode: view,
    });
  }, [sort, view]);

  const handleSortChange = useCallback((value: string) => {
    setSort(value as SortMode);
    trackEvent("gallery_filtered", {
      emotion_filter: activeEmotion,
      sort_mode: value,
      view_mode: view,
    });
  }, [activeEmotion, view]);

  const filtered = useMemo(() => {
    let items = artifacts.filter((a) => a.visibility === "public");
    if (activeEmotion !== "all") items = items.filter((a) => a.emotion === activeEmotion);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.emotion.includes(q) ||
          a.messageExcerpt?.toLowerCase().includes(q)
      );
    }
    if (sort === "liked") items = [...items].sort((a, b) => b.likes - a.likes);
    else if (sort === "shared") items = [...items].sort((a, b) => b.shares - a.shares);
    else items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const ordered = deClumpByShader(items);
    // Editorial pin: in the Regret room, surface the mask + heads canvas pieces first
    // so they always land in the opening five (they draw the most attention).
    if (activeEmotion === "regret") {
      const special = ordered.filter((a) => a.custom);
      if (special.length) return [...special, ...ordered.filter((a) => !a.custom)];
    }
    return ordered;
  }, [artifacts, activeEmotion, sort, search]);

  const currentRoom = activeEmotion !== "all" ? ROOMS.find((r) => r.id === activeEmotion) : null;
  const accentColor = currentRoom?.palette.glow || "#9b7ed9";
  const showTags = activeEmotion === "all";
  const museumTitle = currentRoom ? `Museum of ${currentRoom.name}` : "Museum of Artifacts";
  const museumSubtitle = currentRoom
    ? `Living relics of ${currentRoom.name.toLowerCase()}, emotions given form.`
    : "Living relics of unsent messages, emotions given form.";

  function openMemoryForm(source: "gallery_cta" | "gallery_fab") {
    if (!currentRoom || formOpen) return;
    setFormOpen(true);
    trackEvent("open_memory_form", {
      emotion: currentRoom.id,
      room_name: currentRoom.name,
      source,
    });
  }

  function handleArtifactGenerated(artifact: Artifact) {
    addCreatedArtifact(artifact);
    setFormOpen(false);
    navigate(`/reveal/${artifact.id}`, { state: { artifact } });

    saveArtifact(artifact)
      .then((saved) => {
        addCreatedArtifact(saved);
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
          source: "gallery",
        });
      })
      .catch((err) => {
        console.error("Failed to save artifact:", err);
        trackEvent("artifact_save_failed", {
          artifact_id: artifact.id,
          emotion: artifact.emotion,
          error_message: String(err instanceof Error ? err.message : err).substring(0, 100),
          source: "gallery",
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
          source: "gallery",
        });
      });
  }

  return (
    <div
      className="relative w-full min-h-full"
      style={{ background: "linear-gradient(180deg, #06040a 0%, #040308 100%)" }}
    >
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

      {/* Header */}
      <div className="relative z-10 px-4 md:px-8 pt-20 md:pt-24 pb-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.95)",
                  letterSpacing: "-0.01em",
                }}
              >
                {museumTitle}
              </h1>
              <p className="mt-1 text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(255,255,255,0.85)" }}>
                {museumSubtitle}
              </p>
            </div>

            {/* Compact control cluster, top-right. Order: 3D Flow · Room · Sort · Search. */}
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {currentRoom && (
                <button
                  onClick={() => openMemoryForm("gallery_cta")}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] transition-all"
                  style={{
                    background: accentColor + "30",
                    border: `1px solid ${accentColor}66`,
                    color: "rgba(255,255,255,0.95)",
                    boxShadow: `0 10px 28px ${accentColor}20`,
                  }}
                  aria-label={`Enter memory in the Museum of ${currentRoom.name}`}
                >
                  <Plus size={13} strokeWidth={2.4} />
                  Enter Memory
                </button>
              )}

              {/* 1 · 3D Flow ⇄ Grid, single click-to-toggle; 3D is the lit (accent) state. */}
              {(() => {
                const is3D = view === "carousel";
                const Icon = is3D ? GalleryHorizontalEnd : LayoutGrid;
                return (
                  <button
                    onClick={() => {
                      const newView = is3D ? "grid" : "carousel";
                      trackEvent("gallery_view_changed", {
                        new_view_mode: newView,
                        previous_view_mode: view,
                        artifact_count: filtered.length,
                      });
                      setView(newView);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] transition-all"
                    style={{
                      background: is3D ? accentColor + "26" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${is3D ? accentColor + "55" : "rgba(255,255,255,0.1)"}`,
                      color: is3D ? accentColor : "rgba(255,255,255,0.85)",
                    }}
                    aria-label={is3D ? "Switch to grid view" : "Switch to 3D flow view"}
                  >
                    <Icon size={13} />
                    {is3D ? "3D Flow" : "Grid"}
                  </button>
                );
              })()}

              {/* 2 · Room */}
              <Dropdown
                  value={activeEmotion}
                  onChange={handleEmotionChange}
                  accent={accentColor}
                  options={[
                    { value: "all", label: "All Rooms" },
                    ...ROOMS.map((r) => ({ value: r.id, label: r.name, color: r.palette.glow })),
                  ]}
                />

              {/* 3 · Sort */}
              <Dropdown
                value={sort}
                onChange={handleSortChange}
                accent={accentColor}
                options={[
                  { value: "newest", label: "Newest" },
                  { value: "liked", label: "Most Liked" },
                  { value: "shared", label: "Most Shared" },
                ]}
              />

              {/* 4 · Search */}
              <SearchField value={search} onChange={setSearch} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Masonry grid */}
      <div className="px-4 md:px-8 pb-16 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <p style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "rgba(255,255,255,0.78)", fontStyle: "italic" }}>
                No artifacts found.
              </p>
              <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                Be the first to leave something here.
              </p>
            </motion.div>
          ) : view === "carousel" ? (
            <motion.div
              key={"carousel-" + activeEmotion + sort}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="pt-8"
            >
              <ShaderCarousel3D
                artifacts={filtered}
                accentColor={accentColor}
                onSelect={(a) => setSelectedArtifact(a)}
                showTags={showTags}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeEmotion + sort}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <ResponsiveMasonry columnsCountBreakPoints={{ 320: 1, 640: 2, 900: 3, 1200: 4 }}>
                <Masonry gutter="16px">
                  {filtered.map((artifact) => (
                    <motion.div
                      className="w-full"
                      key={artifact.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {artifact.custom === "mask" ? (
                        <CryingMaskCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
                      ) : artifact.custom === "heads" ? (
                        <SadnessHeadsCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
                      ) : artifact.custom === "scratch" ? (
                        <ScratchApparitionCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
                      ) : artifact.custom === "headfire" ? (
                        <HeadOnFireCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
                      ) : artifact.custom === "rewind" ? (
                        <RewindingHandCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
                      ) : artifact.custom === "shout" ? (
                        <ShoutBehindGlassCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
                      ) : artifact.custom === "smoke" ? (
                        <SmokingSilhouetteCard artifact={artifact} showTag={showTags} onClick={() => setSelectedArtifact(artifact)} />
                      ) : (
                        <ShaderArtifactCard
                          artifact={artifact}
                          onClick={() => setSelectedArtifact(artifact)}
                          showTag={showTags}
                        />
                      )}
                    </motion.div>
                  ))}
                </Masonry>
              </ResponsiveMasonry>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedArtifact && (
          <ArtifactDetailModal
            artifact={selectedArtifact}
            onClose={() => setSelectedArtifact(null)}
          />
        )}
      </AnimatePresence>

      {currentRoom && !selectedArtifact && (
        <motion.button
          initial={{ opacity: 0, scale: 0.86, y: 8 }}
          animate={{ opacity: formOpen ? 0 : 1, scale: formOpen ? 0.86 : 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={() => openMemoryForm("gallery_fab")}
          disabled={formOpen}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl md:hidden"
          style={{
            background: `${accentColor}dd`,
            border: "1px solid rgba(255,255,255,0.48)",
            boxShadow: `0 16px 36px ${accentColor}3d, inset 0 1px 0 rgba(255,255,255,0.48)`,
            pointerEvents: formOpen ? "none" : "auto",
          }}
          aria-label={`Enter memory in the Museum of ${currentRoom.name}`}
        >
          <Plus size={24} strokeWidth={2.5} />
        </motion.button>
      )}

      <AnimatePresence>
        {formOpen && currentRoom && (
          <ArtifactForm
            defaultEmotion={currentRoom.id}
            accentColor={currentRoom.palette.glow}
            roomImage={currentRoom.fallbackImage}
            onClose={() => setFormOpen(false)}
            onArtifactGenerated={handleArtifactGenerated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact glass dropdown, used for the room filter and the sort order so the bar
// stays a single tidy row in the top-right instead of two long rows of chips.
interface DropdownOption { value: string; label: string; color?: string }
function Dropdown({ value, onChange, options, accent }: {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition-all"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.72)" }}
      >
        {current?.color && <span className="w-2 h-2 rounded-full" style={{ background: current.color }} />}
        {current?.label}
        <ChevronDown size={13} style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 z-50 min-w-[168px] rounded-2xl p-1"
            style={{
              background: "rgba(14,10,20,0.96)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl text-xs transition-colors hover:bg-white/5"
                style={{
                  background: o.value === value ? accent + "22" : "transparent",
                  color: o.value === value ? accent : "rgba(255,255,255,0.6)",
                }}
              >
                {o.color && <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />}
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", width: 148 }}
    >
      <Search size={13} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        className="flex-1 min-w-0 bg-transparent text-xs outline-none"
        style={{ color: "rgba(255,255,255,0.65)" }}
      />
    </div>
  );
}
