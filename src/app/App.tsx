import { Component, Suspense, lazy, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import { MotionConfig } from "motion/react";
import { LandingPage } from "./pages/LandingPage";
import { trackEvent, trackPage } from "./analytics";
import { preloadCoreRoutes, preloadGalleryRoute, preloadRevealRoute, preloadRoomRoute } from "./routePreloads";

// Landing is eager so first paint isn't gated on a chunk fetch. Everything
// else is split off the main bundle and only loaded when its route is hit.
// Navigations into lazy routes are wrapped in transitions so React keeps the
// current screen visible instead of swapping to this boundary's null fallback.
function lazyRoute<T extends { default: React.ComponentType<any> }>(load: () => Promise<T>) {
  return lazy(async () => {
    try {
      return await load();
    } catch (err) {
      const message = String(err instanceof Error ? err.message : err);
      trackEvent("route_chunk_failed", { message: message.substring(0, 180) });
      if (typeof window !== "undefined" && !sessionStorage.getItem("unsent-route-reloaded")) {
        sessionStorage.setItem("unsent-route-reloaded", "1");
        window.location.reload();
      }
      throw err;
    }
  });
}

const EmotionRoom = lazyRoute(() => preloadRoomRoute().then(m => ({ default: (m as typeof import("./pages/EmotionRoom")).EmotionRoom })));
const ArtifactGallery = lazyRoute(() => preloadGalleryRoute().then(m => ({ default: (m as typeof import("./pages/ArtifactGallery")).ArtifactGallery })));
const ArtifactReveal = lazyRoute(() => preloadRevealRoute().then(m => ({ default: (m as typeof import("./pages/ArtifactReveal")).ArtifactReveal })));
const CryingMaskExhibit = lazyRoute(() => import("./components/CryingMaskExhibit").then(m => ({ default: m.CryingMaskExhibit })));
const UberPlayground = lazyRoute(() => import("./pages/UberPlayground").then(m => ({ default: m.UberPlayground })));

class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackEvent("route_render_failed", {
      message: error.message.substring(0, 180),
      stack: info.componentStack.substring(0, 500),
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-5 bg-[#04030a] px-6 text-center text-white"
        role="alert"
      >
        <div>
          <p className="font-['Cormorant_Garamond'] text-3xl font-medium">The room went dark.</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/68">
            Something failed while opening this view. The museum can recover from here.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-white/25 px-5 py-2 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.22em] text-white/90"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="rounded-full bg-white px-5 py-2 font-['Cinzel'] text-[10px] font-bold uppercase tracking-[0.22em] text-[#111827]"
          >
            Return
          </button>
        </div>
      </div>
    );
  }
}

function RouteFallback() {
  return null;
}

// Pendo's auto pageLoad only fires on hard navigations. This component watches
// react-router for client-side route changes and reports each one to Pendo so
// the dashboard sees the real funnel (/ -> /room/grief -> /reveal/xyz) instead
// of one "landing" page-load per session.
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    sessionStorage.removeItem("unsent-route-reloaded");
    trackPage(location.pathname, { search: location.search });
  }, [location.pathname, location.search]);
  return null;
}

function RoutedApp() {
  const location = useLocation();
  useEffect(() => {
    preloadCoreRoutes();
  }, []);
  return (
    <>
      <RouteTracker />
      <a href="#main" className="skip-link">Skip to content</a>
      <main
        id="main"
        style={{ width: "100%", height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#04030a", color: "white", fontFamily: "system-ui, sans-serif" }}
      >
        <RouteErrorBoundary key={location.key || location.pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/corridor" element={<Navigate to="/" replace />} />
              <Route path="/room/:emotion" element={<EmotionRoom />} />
              <Route path="/gallery/:emotion" element={<ArtifactGallery />} />
              <Route path="/gallery" element={<ArtifactGallery />} />
              <Route path="/reveal/:id" element={<ArtifactReveal />} />
              <Route path="/exhibit/sadness" element={<CryingMaskExhibit />} />
              <Route path="/uber" element={<UberPlayground />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </>
  );
}

export default function App() {
  return (
    // reducedMotion="user" makes every framer-motion animation in the tree
    // respect prefers-reduced-motion automatically, so page transitions,
    // modal springs, and carousel sweeps all freeze for vestibular safety
    // without us having to guard each <motion.div> by hand.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <RoutedApp />
      </BrowserRouter>
    </MotionConfig>
  );
}
