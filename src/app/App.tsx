import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router";
import { MotionConfig } from "motion/react";
import { LandingPage } from "./pages/LandingPage";
import { trackPage } from "./analytics";

// Landing is eager so first paint isn't gated on a chunk fetch. Everything
// else is split off the main bundle and only loaded when its route is hit.
// LandingPage preloads the room chunk on door hover/touch/click so the core
// door -> room path is warm before navigation.
const EmotionRoom = lazy(() => import("./pages/EmotionRoom").then(m => ({ default: m.EmotionRoom })));
const ArtifactGallery = lazy(() => import("./pages/ArtifactGallery").then(m => ({ default: m.ArtifactGallery })));
const ArtifactReveal = lazy(() => import("./pages/ArtifactReveal").then(m => ({ default: m.ArtifactReveal })));
const CryingMaskExhibit = lazy(() => import("./components/CryingMaskExhibit").then(m => ({ default: m.CryingMaskExhibit })));
const UberPlayground = lazy(() => import("./pages/UberPlayground").then(m => ({ default: m.UberPlayground })));

function RouteFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[#04030a] font-['Cinzel'] text-[11px] font-semibold uppercase tracking-[0.26em] text-white/55"
      role="status"
      aria-live="polite"
    >
      Opening
    </div>
  );
}

// Pendo's auto pageLoad only fires on hard navigations. This component watches
// react-router for client-side route changes and reports each one to Pendo so
// the dashboard sees the real funnel (/ -> /room/grief -> /reveal/xyz) instead
// of one "landing" page-load per session.
function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    trackPage(location.pathname, { search: location.search });
  }, [location.pathname, location.search]);
  return null;
}

export default function App() {
  return (
    // reducedMotion="user" makes every framer-motion animation in the tree
    // respect prefers-reduced-motion automatically, so page transitions,
    // modal springs, and carousel sweeps all freeze for vestibular safety
    // without us having to guard each <motion.div> by hand.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <RouteTracker />
        <a href="#main" className="skip-link">Skip to content</a>
        <main
          id="main"
          style={{ width: "100%", height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#04030a", color: "white", fontFamily: "system-ui, sans-serif" }}
        >
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
        </main>
      </BrowserRouter>
    </MotionConfig>
  );
}
