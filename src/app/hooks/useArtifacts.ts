import { useState, useEffect, useCallback } from "react";
import { supabase } from "/utils/supabase/info";
import { SEED_ARTIFACTS, Artifact, withSafeShader } from "../data/artifacts";

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

export function useArtifacts() {
  const [serverArtifacts, setServerArtifacts] = useState<Artifact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchArtifacts = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from("artifacts")
        .select("id, emotion, visibility, created_at, payload")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });
      if (dbError) throw dbError;
      setServerArtifacts((data ?? []).map(fromRow));
      setError(null);
    } catch (err) {
      console.error("Failed to fetch artifacts from Supabase:", err);
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  // Gallery shows only the 5+ seed artifacts per room + anything the visitor
  // created via the form (cached in localStorage). Server-saved artifacts are
  // kept for persistence and for the /reveal/:id permalink path, but not merged
  // into the display list.
  const created = loadCreated();
  const seen = new Set<string>();
  const allArtifacts = [...created, ...SEED_ARTIFACTS]
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .map(withSafeShader);

  return { artifacts: allArtifacts, loading: false, error, refetch: fetchArtifacts };
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
  // Upsert so a re-saved artifact (e.g. retry after an offline edit) doesn't
  // produce a duplicate-key error.
  const { data, error } = await supabase
    .from("artifacts")
    .upsert(toRow(artifact))
    .select("id, emotion, visibility, created_at, payload")
    .single();
  if (error) throw new Error(`Save failed: ${error.message}`);
  return fromRow(data);
}
