import { Artifact } from "../data/artifacts";
import { renderShader } from "./shaderEngine";
import { trackEvent } from "../analytics";

// Save a PNG of an artifact. For ordinary shader artifacts we render a fresh 1024²
// frame through the shared engine. For custom canvas pieces (mask / heads) there is
// no GLSL to render, so we export the live on-screen canvas the visitor is looking
// at (passed in via `liveCanvas`) — this fixes the old bug where mask/heads
// downloads exported an unrelated fallback shader frame.
export function downloadArtifact(
  artifact: Artifact,
  bgColor: string,
  liveCanvas?: HTMLCanvasElement | null,
) {
  const SIZE = 1024;
  const out = document.createElement("canvas");
  out.width = SIZE;
  out.height = SIZE;
  const ctx = out.getContext("2d");
  if (!ctx) return;

  if (artifact.custom && liveCanvas) {
    // Center-crop the live canvas into the square export.
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(liveCanvas, 0, 0, SIZE, SIZE);
  } else {
    const src = renderShader(
      artifact.shader.glsl, SIZE, SIZE,
      artifact.dna.timeOffset || 0, artifact.dna.seed, artifact.dna.intensity,
      artifact.dna.unique ? 1 : 0,
    );
    if (src) ctx.drawImage(src, 0, 0, SIZE, SIZE);
    else { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, SIZE, SIZE); }
  }

  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = (artifact.title || "artifact").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    a.href = url;
    a.download = `unsent-${slug || "artifact"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Defer revocation a tick so WebKit/Safari has started reading the blob
    // before the URL is invalidated (same-tick revoke can yield an empty file).
    setTimeout(() => URL.revokeObjectURL(url), 0);
    trackEvent("artifact_downloaded", {
      artifact_id: artifact.id,
      emotion: artifact.emotion,
      artifact_type: artifact.custom || "shader",
      source_page: window.location.pathname,
      artifact_title: artifact.title,
    });
  }, "image/png");
}
