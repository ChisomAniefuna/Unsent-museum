import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { MotionConfig } from "motion/react";
import { LandingPage } from "./pages/LandingPage";

// Landing is eager so first paint isn't gated on a chunk fetch. Everything
// else is split off the main bundle and only loaded when its route is hit.
const EmotionRoom = lazy(() => import("./pages/EmotionRoom").then(m => ({ default: m.EmotionRoom })));
const ArtifactGallery = lazy(() => import("./pages/ArtifactGallery").then(m => ({ default: m.ArtifactGallery })));
const ArtifactReveal = lazy(() => import("./pages/ArtifactReveal").then(m => ({ default: m.ArtifactReveal })));
const CryingMaskExhibit = lazy(() => import("./components/CryingMaskExhibit").then(m => ({ default: m.CryingMaskExhibit })));
const UberPlayground = lazy(() => import("./pages/UberPlayground").then(m => ({ default: m.UberPlayground })));

export default function App() {
  return (
    // reducedMotion="user" makes every framer-motion animation in the tree
    // respect prefers-reduced-motion automatically, so page transitions,
    // modal springs, and carousel sweeps all freeze for vestibular safety
    // without us having to guard each <motion.div> by hand.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <a href="#main" className="skip-link">Skip to content</a>
        <main
          id="main"
          style={{ width: "100%", height: "100vh", overflowY: "auto", overflowX: "hidden", background: "#04030a", color: "white", fontFamily: "system-ui, sans-serif" }}
        >
          <Suspense fallback={null}>
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