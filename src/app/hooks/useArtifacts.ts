import { useState, useEffect, useCallback } from "react";
import { supabase } from "/utils/supabase/info";
import { SEED_ARTIFACTS, Artifact, dnaKey, registerKnownArtifactDNA, withSafeShader } from "../data/artifacts";

// Locally-created artifacts are cached in localStorage so EVERY artifact a visitor
// makes shows up in the gallery immediately and survives reloads, even when the
// Supabase backend is down. The (large) shader source is stripped on write and
// rebuilt on read via withSafeShader, exactly like the server round-trip.
const CREATED_KEY = "unsent_created_v1";

function loadCreated(): Artifact[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CREATED_KEY) || "[]") as Artifact[];
    return raw.map(withSafeShader);
  } catch {
    return [];
  }
}

// Persist a newly-created artifact to the front of the local cache (newest first).
export function addCreatedArtifact(artifact: Artifact) {
  try {
    const { shader, ...lean } = artifact; // drop the bulky GLSL; rebuilt on read
    const existing = JSON.parse(localStorage.getItem(CREATED_KEY) || "[]") as Artifact[];
    const deduped = existing.filter((a) => a.id !== artifact.id);
    localStorage.setItem(CREATED_KEY, JSON.stringify([lean, ...deduped]));
  } catch {
    /* storage unavailable; the in-session artifact still reaches the reveal page */
  }
}

// Strip the bulky `shader` field before persisting to the DB. The shader source
// is reconstructed from emotion + shaderIndex via withSafeShader on read, so
// shipping ~5KB of GLSL per row would be pure waste.
function toRow(artifact: Artifact) {
  const { shader, ...lean } = artifact;
  return {
    id: artifact.id,
    emotion: artifact.emotion,
    visibility: artifact.visibility ?? "public",
    created_at: artifact.createdAt,
    payload: lean,
  };
}

// Reverse of toRow. The shader is rebuilt by withSafeShader.
function fromRow(row: any): Artifact {
  const payload = row.payload ?? {};
  return withSafeShader({
    ...payload,
    id: row.id,
    emotion: row.emotion,
    visibility: row.visibility,
    createdAt: row.created_at,
  });
}

function galleryVisualKey(artifact: Artifact): string {
  return artifact.custom ? `custom:${artifact.custom}:${artifact.id}` : dnaKey(artifact.dna);
}

export function useArtifacts() {
  const [serverArtifacts, setServerArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtifacts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: dbError } = await supabase
        .from("artifacts")
        .select("id, emotion, visibility, created_at, payload")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(300);
      if (dbError) throw dbError;
      const publicArtifacts = (data ?? []).map(fromRow);
      publicArtifacts.forEach((artifact) => registerKnownArtifactDNA(artifact.dna));
      setServerArtifacts(publicArtifacts);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch artifacts from Supabase:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  useEffect(() => {
    const channel = supabase
      .channel("public-artifacts-gallery")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "artifacts", filter: "visibility=eq.public" },
        () => { fetchArtifacts(); },
      )
      .subscribe();

    function onFocus() {
      fetchArtifacts();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, [fetchArtifacts]);

  // Gallery shows seed artifacts, this visitor's local creations, and the latest
  // public server artifacts so a fresh visitor can see work created by others.
  // Deduping happens by id first and visual DNA second, so exact clones never
  // appear side-by-side even if older server rows collided before this fix.
  const created = loadCreated();
  created.forEach((artifact) => registerKnownArtifactDNA(artifact.dna));
  const seenIds = new Set<string>();
  const seenVisuals = new Set<string>();
  const allArtifacts = [...created, ...serverArtifacts, ...SEED_ARTIFACTS]
    .filter((artifact) => {
      if (seenIds.has(artifact.id)) return false;
      seenIds.add(artifact.id);
      const visualKey = galleryVisualKey(artifact);
      if (seenVisuals.has(visualKey)) return false;
      seenVisuals.add(visualKey);
      return true;
    })
    .map(withSafeShader);

  return { artifacts: allArtifacts, loading, error, refetch: fetchArtifacts };
}

// Atomic +1 to the artifact's likes via a Postgres function. Falls back to a
// no-op on the server side if the function is missing; the optimistic UI in
// useLikeStore already reflects the like locally.
export async function likeArtifact(id: string): Promise<number> {
  const { data, error } = await supabase.rpc("increment_artifact_likes", {
    artifact_id: id,
  });
  if (error) throw new Error(`Like failed: ${error.message}`);
  return (data as number) ?? 0;
}

export async function saveArtifact(artifact: Artifact): Promise<Artifact> {
  const { data, error } = await supabase
    .from("artifacts")
    .insert(toRow(artifact))
    .select("id, emotion, visibility, created_at, payload")
    .single();
  if (error) throw new Error(`Save failed: ${error.message}`);
  return fromRow(data);
}
