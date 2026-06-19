import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-75cd8a5e/health", (c) => {
  return c.json({ status: "ok" });
});

// ─── Artifacts ────────────────────────────────────────────────────────────────

// GET /artifacts — list all public artifacts
app.get("/make-server-75cd8a5e/artifacts", async (c) => {
  try {
    const items = await kv.getByPrefix("artifact:");
    const artifacts = items
      .filter((a: any) => a && (a.visibility ?? "public") === "public")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ artifacts });
  } catch (err) {
    console.log("Error fetching artifacts:", err);
    return c.json({ error: `Failed to fetch artifacts: ${err}` }, 500);
  }
});

// POST /artifacts — store a new artifact
app.post("/make-server-75cd8a5e/artifacts", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.id || !body.emotion) {
      return c.json({ error: "Missing required fields: id, emotion" }, 400);
    }
    const artifact = {
      ...body,
      createdAt: body.createdAt || new Date().toISOString(),
      likes: body.likes || 0,
      shares: body.shares || 0,
      downloads: body.downloads || 0,
    };
    await kv.set(`artifact:${artifact.id}`, artifact);
    return c.json({ artifact });
  } catch (err) {
    console.log("Error saving artifact:", err);
    return c.json({ error: `Failed to save artifact: ${err}` }, 500);
  }
});

// GET /artifacts/:id — get a single artifact
app.get("/make-server-75cd8a5e/artifacts/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const artifact = await kv.get(`artifact:${id}`);
    if (!artifact) return c.json({ error: "Artifact not found" }, 404);
    return c.json({ artifact });
  } catch (err) {
    console.log("Error fetching artifact:", err);
    return c.json({ error: `Failed to fetch artifact: ${err}` }, 500);
  }
});

// POST /artifacts/:id/like — increment likes
app.post("/make-server-75cd8a5e/artifacts/:id/like", async (c) => {
  try {
    const id = c.req.param("id");
    const artifact = await kv.get(`artifact:${id}`);
    if (!artifact) return c.json({ error: "Artifact not found" }, 404);
    const updated = { ...artifact, likes: (artifact.likes || 0) + 1 };
    await kv.set(`artifact:${id}`, updated);
    return c.json({ likes: updated.likes });
  } catch (err) {
    console.log("Error liking artifact:", err);
    return c.json({ error: `Failed to like artifact: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
