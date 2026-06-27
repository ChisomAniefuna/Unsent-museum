let roomRoutePreload: Promise<unknown> | null = null;
let galleryRoutePreload: Promise<unknown> | null = null;
let revealRoutePreload: Promise<unknown> | null = null;

export function preloadRoomRoute() {
  roomRoutePreload ??= import("./pages/EmotionRoom");
  return roomRoutePreload;
}

export function preloadGalleryRoute() {
  galleryRoutePreload ??= import("./pages/ArtifactGallery");
  return galleryRoutePreload;
}

export function preloadRevealRoute() {
  revealRoutePreload ??= import("./pages/ArtifactReveal");
  return revealRoutePreload;
}

export function preloadCoreRoutes() {
  const run = () => {
    preloadRoomRoute();
    preloadGalleryRoute();
    preloadRevealRoute();
  };

  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 1600 });
  } else {
    window.setTimeout(run, 600);
  }
}
