import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { EmotionRoom } from "./pages/EmotionRoom";
import { ArtifactGallery } from "./pages/ArtifactGallery";
import { ArtifactReveal } from "./pages/ArtifactReveal";
import { CryingMaskExhibit } from "./components/CryingMaskExhibit";

export default function App() {
  return (
    <BrowserRouter>
      <div
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}