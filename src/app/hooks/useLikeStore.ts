import { useSyncExternalStore } from "react";
import { likeArtifact } from "./useArtifacts";

// A tiny shared like store. There is no auth, so "did I like this" is a per-browser
// set kept in localStorage. Every surface (grid card, 3D carousel, detail modal,
// reveal page) reads the same set, so a like toggles consistently and survives
// navigation and reloads. The displayed count is always:
//   artifact.likes (base) + (this visitor liked it ? 1 : 0)
// which means a like always moves the number by exactly one, and un-liking undoes it.

const KEY = "unsent_liked_v1";
const listeners = new Set<() => void>();

function load(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

// Held by identity: useSyncExternalStore bails out of re-render when the snapshot is
// Object.is-equal, so every mutation must swap in a NEW Set instance.
let likedSet: Set<string> = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...likedSet]));
  } catch {
    /* storage unavailable, in-memory set still works for the session */
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isLiked(id: string): boolean {
  return likedSet.has(id);
}

export function toggleLike(id: string): boolean {
  const wasLiked = likedSet.has(id);
  likedSet = new Set(likedSet);
  if (wasLiked) {
    likedSet.delete(id);
  } else {
    likedSet.add(id);
    // Best-effort server increment; the UI never blocks on it and ignores failures
    // (mock artifacts have no server row, so this simply no-ops there).
    likeArtifact(id).catch(() => {});
  }
  persist();
  listeners.forEach((l) => l());
  return !wasLiked;
}

// Per-id subscription, for components that like a single known artifact.
export function useLiked(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => likedSet.has(id),
    () => false,
  );
}

// Whole-set subscription, for components that render many artifacts in one pass
// (e.g. the carousel maps over the list and cannot call a hook per item).
export function useLikedSet(): Set<string> {
  return useSyncExternalStore(
    subscribe,
    () => likedSet,
    () => likedSet,
  );
}

// Convenience: the count to display for an artifact, given its base like count.
export function likeCount(baseLikes: number, liked: boolean): number {
  return baseLikes + (liked ? 1 : 0);
}
