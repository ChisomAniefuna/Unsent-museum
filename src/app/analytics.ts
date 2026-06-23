// Infrastructure for the Pendo (Novus) install. The track() calls themselves
// live next to the features that fire them (LandingPage, EmotionRoom,
// ArtifactGallery, etc.) — this file just owns the boot-time pieces those
// callers depend on:
//   - a stable anonymous visitor id (so the Pendo dashboard sees one row per
//     browser instead of collapsing every visitor into id=""),
//   - the call to pendo.initialize with that id,
//   - a trackPage() helper used by RouteTracker in App.tsx to report SPA
//     navigations as page-loads (Pendo's agent only auto-fires on hard loads).
//
// The Pendo loader stubs pendo.initialize/identify/pageLoad/track before
// pendo.js finishes loading, queuing calls until the real agent attaches, so
// calling any of these is safe from any render or effect.

type PendoVisitor = {
  id: string;
  anonymous?: boolean;
  first_seen?: string;
};

type PendoApi = {
  initialize: (opts: { visitor: PendoVisitor; account?: { id: string } }) => void;
  pageLoad: (props?: { name?: string } & Record<string, unknown>) => void;
  track: (event: string, properties?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    pendo?: PendoApi;
  }
}

const VISITOR_ID_KEY = "unsent-museum.visitor-id";
const FIRST_SEEN_KEY = "unsent-museum.first-seen";

function readOrCreateVisitorId(): { id: string; firstSeen: string } {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    const firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
    if (existing && firstSeen) return { id: existing, firstSeen };

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `anon-${crypto.randomUUID()}`
        : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const seen = new Date().toISOString();
    localStorage.setItem(VISITOR_ID_KEY, id);
    localStorage.setItem(FIRST_SEEN_KEY, seen);
    return { id, firstSeen: seen };
  } catch {
    // Private mode / storage disabled. Use an ephemeral id so the session still
    // reports as anonymous instead of crashing the whole boot.
    return {
      id: `anon-ephemeral-${Math.random().toString(36).slice(2, 10)}`,
      firstSeen: new Date().toISOString(),
    };
  }
}

let inited = false;

export function initAnalytics() {
  if (inited) return;
  inited = true;
  const { id, firstSeen } = readOrCreateVisitorId();
  window.pendo?.initialize({
    visitor: { id, first_seen: firstSeen },
    account: { id: "unsent-museum" },
  });
}

export function trackPage(name: string, props: Record<string, unknown> = {}) {
  try {
    window.pendo?.pageLoad({ name, ...props });
  } catch {
    /* analytics must never throw out of a render */
  }
}
