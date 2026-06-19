import { useState, useEffect, useCallback } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { SEED_ARTIFACTS, Artifact, withSafeShader } from "../data/artifacts";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-75cd8a5e`;
const HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` };

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

export function useArtifacts() {
  const [serverArtifacts, setServerArtifacts] = useState<Artifact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchArtifacts = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/artifacts`, { headers: HEADERS });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setServerArtifacts(data.artifacts || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch artifacts from server:", err);
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  // Gallery shows only the 5 seed artifacts + anything the visitor created via the
  // form (cached in localStorage). Server-saved artifacts are kept for persistence
  // but not merged into the display list.
  const created = loadCreated();
  const seen = new Set<string>();
  const allArtifacts = [...created, ...SEED_ARTIFACTS]
    .filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .map(withSafeShader);

  return { artifacts: allArtifacts, loading: false, error, refetch: fetchArtifacts };
}

export async function likeArtifact(id: string): Promise<number> {
  const res = await fetch(`${SERVER}/artifacts/${id}/like`, {
    method: "POST",
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`Like failed: ${res.status}`);
  const data = await res.json();
  return data.likes;
}

export async function saveArtifact(artifact: Artifact): Promise<Artifact> {
  // Don't ship the (large) shader source to the server, it's reconstructed from
  // emotion + shaderIndex on read via withSafeShader. Keeps the payload small and
  // avoids a bulky/duplicated GLSL blob round-tripping through storage.
  const { shader, ...lean } = artifact;
  const res = await fetch(`${SERVER}/artifacts`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(lean),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Save failed: ${err}`);
  }
  const data = await res.json();
  // Always hand back a render-safe artifact so the reveal screen never crashes.
  return withSafeShader(data.artifact);
}
