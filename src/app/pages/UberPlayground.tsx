import { useEffect, useMemo, useRef, useState } from "react";
import { renderShader, ensureSeedUniforms } from "../components/shaderEngine";
import griefUber from "../data/generated/grief-uber";
import hopeUber from "../data/generated/hope-uber";
import loveUber from "../data/generated/love-uber";
import regretUber from "../data/generated/regret-uber";
import closureUber from "../data/generated/closure-uber";
import flowerUber from "../data/generated/flower-mandala-uber";
import griefAsciiScenes from "../data/generated/grief-ascii-scenes";
import { decodeGenes, UberEmotion, GENE_LABELS } from "../data/uberGenes";

const SHADERS = {
  love: loveUber,
  grief: griefUber,
  hope: hopeUber,
  regret: regretUber,
  closure: closureUber,
  flower: flowerUber,
  ascii: griefAsciiScenes,
} as const;

type CategoryKey = keyof typeof SHADERS;

// "flower" is a non-emotion category so it keeps its gene labels here instead
// of in uberGenes.ts. Same 5-gene shape (just different vocabulary).
const FLOWER_LABELS = {
  field:   ["bloom", "stacked", "hibiscus", "lotus", "daisy", "chrysanthemum", "starburst", "dahlia"],
  domain:  ["marigold", "hibiscus", "honey", "velvet", "coral", "dahlia", "sunset", "rose"],
  palette: ["4-petal", "5-petal", "6-petal", "7-petal", "8-petal"],
  surface: ["bead", "crown", "none"],
  decay:   ["wine", "claret", "plum"],
} as const;

const ASCII_LABELS = {
  field: [
    "crying face", "weeping eye", "faceless", "alone",
    "rain of sorrow", "broken heart", "empty chair", "wilted bouquet",
    "melting candle", "hidden moon", "grief mask", "covering face",
    "window watcher", "tear river", "shattered glasses", "spiral void",
  ],
  domain:  ["mono", "matrix", "crimson", "indigo", "amber", "rose"],
  palette: ["sparse", "medium", "dense"],
  surface: ["calm", "quick", "racing"],
  decay:   ["clean", "faint", "strong"],
} as const;

function decode(seed: number, key: CategoryKey) {
  if (key === "ascii") {
    const hash11 = (p: number) => { p=p*0.1031; p=p-Math.floor(p); p=p*(p+33.33); p=p*(p+p); return p-Math.floor(p); };
    const pick = (uSeed: number, salt: number, n: number) => Math.floor(hash11(uSeed*7.13 + salt*17.93) * n);
    const uSeed = (((seed % 10000) + 10000) % 10000) / 100;
    return {
      uSeed,
      field:   ASCII_LABELS.field[pick(uSeed, 1, 16)],
      domain:  ASCII_LABELS.domain[pick(uSeed, 2, 6)],
      palette: ASCII_LABELS.palette[pick(uSeed, 3, 3)],
      surface: ASCII_LABELS.surface[pick(uSeed, 4, 3)],
      decay:   ASCII_LABELS.decay[pick(uSeed, 5, 3)],
    };
  }
  if (key === "flower") {
    // Flower mandala has different gene salts than the emotion ubers because
    // the salts here are field=1, palette=2, petals=3, center=4, bg=5 - matches
    // the shader. Same hash/multiplier as decodeGenes.
    const hash11 = (p: number) => { p=p*0.1031; p=p-Math.floor(p); p=p*(p+33.33); p=p*(p+p); return p-Math.floor(p); };
    const pick = (uSeed: number, salt: number, n: number) => Math.floor(hash11(uSeed*7.13 + salt*17.93) * n);
    const uSeed = (((seed % 10000) + 10000) % 10000) / 100;
    return {
      uSeed,
      field:   FLOWER_LABELS.field[pick(uSeed, 1, 8)],
      domain:  FLOWER_LABELS.domain[pick(uSeed, 2, 8)],   // palette (mislabeled as domain for UI consistency)
      palette: FLOWER_LABELS.palette[pick(uSeed, 3, 5)],   // petal count
      surface: FLOWER_LABELS.surface[pick(uSeed, 4, 3)],   // center
      decay:   FLOWER_LABELS.decay[pick(uSeed, 5, 3)],     // background
    };
  }
  return decodeGenes(seed, key as UberEmotion);
}

const HEADER_LABELS: Record<CategoryKey, { field: string; domain: string; palette: string; surface: string; decay: string }> = {
  love:    { field: "field", domain: "domain", palette: "palette", surface: "surface", decay: "decay" },
  grief:   { field: "field", domain: "domain", palette: "palette", surface: "surface", decay: "decay" },
  hope:    { field: "field", domain: "domain", palette: "palette", surface: "surface", decay: "decay" },
  regret:  { field: "field", domain: "domain", palette: "palette", surface: "surface", decay: "decay" },
  closure: { field: "field", domain: "domain", palette: "palette", surface: "surface", decay: "decay" },
  flower:  { field: "arrangement", domain: "palette", palette: "petals", surface: "center", decay: "background" },
  ascii:   { field: "scene", domain: "palette", palette: "density", surface: "tempo", decay: "grain" },
};

export function UberPlayground() {
  const [emotion, setEmotion] = useState<CategoryKey>("grief");
  const [seed, setSeed] = useState(31);
  const [unique, setUnique] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const shader = SHADERS[emotion];
  const genes = useMemo(() => decode(seed, emotion), [seed, emotion]);
  const labels = HEADER_LABELS[emotion];

  useEffect(() => {
    const blitCanvas = canvasRef.current;
    if (!blitCanvas) return;
    const ctx = blitCanvas.getContext("2d");
    if (!ctx) return;

    const src = ensureSeedUniforms(shader.glsl);
    let raf = 0;
    const start = performance.now();

    function loop(now: number) {
      const t = (now - start) / 1000;
      const w = blitCanvas.width;
      const h = blitCanvas.height;
      const gl = renderShader(src, w, h, t, seed, 0.7, unique);
      if (gl) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(gl, 0, 0, w, h);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [shader, seed, unique, reloadKey]);

  const containerStyle: React.CSSProperties = {
    width: "100vw",
    minHeight: "100vh",
    background: "#06060c",
    color: "#e9e9f2",
    display: "flex",
    flexDirection: "column",
    padding: 24,
    gap: 18,
    fontFamily: "system-ui, sans-serif",
  };

  const header: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 16,
    flexWrap: "wrap",
  };

  const canvasWrap: React.CSSProperties = {
    flex: 1,
    minHeight: 480,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const controlsRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  };

  const card: React.CSSProperties = {
    background: "#0f0f17",
    border: "1px solid #1e1e2a",
    borderRadius: 10,
    padding: 16,
  };

  const monoMuted: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, monospace", color: "#8b8b9a", fontSize: 12 };
  const monoBright: React.CSSProperties = { fontFamily: "ui-monospace, Menlo, monospace", color: "#c9c8ff", fontSize: 13 };

  return (
    <div style={containerStyle}>
      <div style={header}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Uber Shader Playground</div>
          <div style={monoMuted}>
            {shader.id} &middot; {shader.name} &middot; src/app/data/generated/{shader.id}.ts
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, background: "#0f0f17", border: "1px solid #1e1e2a", borderRadius: 8, padding: 4 }}>
            {(Object.keys(SHADERS) as CategoryKey[]).map((e) => (
              <button
                key={e}
                onClick={() => setEmotion(e)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: emotion === e ? "#2a223a" : "transparent",
                  color: emotion === e ? "#e9e9f2" : "#8b8b9a",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <a href="/" style={{ color: "#8b8b9a", textDecoration: "none", fontSize: 13 }}>
            &larr; back to museum
          </a>
        </div>
      </div>

      <div style={canvasWrap}>
        <canvas
          ref={canvasRef}
          width={680}
          height={680}
          style={{ width: "min(680px, 70vh)", height: "min(680px, 70vh)", borderRadius: 10, background: "#000", boxShadow: "0 0 60px rgba(120,100,200,0.18)" }}
        />
      </div>

      <div style={controlsRow}>
        <div style={card}>
          <div style={{ fontSize: 12, color: "#8b8b9a", marginBottom: 10, letterSpacing: 0.2 }}>SEED</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <input
              type="range"
              min={0}
              max={9999}
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={0}
              max={9999}
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value || "0", 10))}
              style={{ width: 80, background: "#06060c", color: "#e9e9f2", border: "1px solid #2a2a3a", borderRadius: 6, padding: "6px 10px", fontFamily: "ui-monospace, Menlo, monospace" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setSeed(Math.floor(Math.random() * 10000))}
              style={{ padding: "8px 14px", background: "#221e3a", color: "#e9e9f2", border: "1px solid #3a3550", borderRadius: 6, cursor: "pointer" }}
            >
              Randomize
            </button>
            <button
              onClick={() => setSeed((s) => (s + 1) % 10000)}
              style={{ padding: "8px 14px", background: "#221e3a", color: "#e9e9f2", border: "1px solid #3a3550", borderRadius: 6, cursor: "pointer" }}
            >
              Next
            </button>
            <button
              onClick={() => setSeed((s) => (s + 9999) % 10000)}
              style={{ padding: "8px 14px", background: "#221e3a", color: "#e9e9f2", border: "1px solid #3a3550", borderRadius: 6, cursor: "pointer" }}
            >
              Prev
            </button>
            <button
              onClick={() => setUnique((u) => (u === 0 ? 1 : 0))}
              style={{ padding: "8px 14px", background: unique ? "#2a3a22" : "#3a2a22", color: "#e9e9f2", border: "1px solid #3a5535", borderRadius: 6, cursor: "pointer" }}
              title="When off, shows the canonical look (u_unique = 0)"
            >
              {unique ? "seed on" : "canonical"}
            </button>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              style={{ padding: "8px 14px", background: "#221e3a", color: "#e9e9f2", border: "1px solid #3a3550", borderRadius: 6, cursor: "pointer" }}
              title="Re-mount the canvas to pick up your latest GLSL edits (vite HMR usually does this for free)"
            >
              Reload
            </button>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: "#8b8b9a", marginBottom: 10, letterSpacing: 0.2 }}>DECODED GENES (from u_seed {genes.uSeed.toFixed(2)})</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 6, columnGap: 16 }}>
            <span style={monoMuted}>{labels.field}</span>      <span style={monoBright}>{genes.field}</span>
            <span style={monoMuted}>{labels.domain}</span>     <span style={monoBright}>{genes.domain}</span>
            <span style={monoMuted}>{labels.palette}</span>    <span style={monoBright}>{genes.palette}</span>
            <span style={monoMuted}>{labels.surface}</span>    <span style={monoBright}>{genes.surface}</span>
            <span style={monoMuted}>{labels.decay}</span>      <span style={monoBright}>{genes.decay}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b6b7a" }}>
            Edit the GLSL in <code>{`src/app/data/generated/${shader.id}.ts`}</code> &mdash; Vite HMR will hot-reload this canvas.
          </div>
        </div>
      </div>
    </div>
  );
}
