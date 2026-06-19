import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { MotionConfig } from "motion/react";
import { LandingPage } from "./pages/LandingPage";
import { EmotionRoom } from "./pages/EmotionRoom";
import { ArtifactGallery } from "./pages/ArtifactGallery";
import { ArtifactReveal } from "./pages/ArtifactReveal";
import { CryingMaskExhibit } from "./components/CryingMaskExhibit";
import { UberPlayground } from "./pages/UberPlayground";

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
        </main>
      </BrowserRouter>
    </MotionConfig>
  );
}