import { createClient } from "@supabase/supabase-js";

// Live Supabase project for the Unsent Museum (owned by ChisomAniefuna).
// The publishable key replaces the older anon key in Supabase's newer projects;
// it is SAFE TO COMMIT because it identifies the project, not a user. What
// actually protects the data is Row Level Security on the artifacts table.
export const SUPABASE_URL = "https://jgdlnwvgtipiiolfzqaz.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_11HgTco8JKKj31AmSNADLw_LdECGYnj";

// Legacy export names kept so older imports that still reference projectId /
// publicAnonKey (e.g. the edge-function-style fetch path in ArtifactReveal)
// keep compiling while we migrate everything to the JS client below.
export const projectId = "jgdlnwvgtipiiolfzqaz";
export const publicAnonKey = SUPABASE_PUBLISHABLE_KEY;

// Single shared browser client. Used by useArtifacts() and ArtifactReveal.
// The 'public' schema is the default; we just store everything in one table
// (public.artifacts) with a JSONB payload column.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // The museum is anonymous-write / public-read. No session, no refresh, no
    // localStorage hooks - keeps the SPA snappy and avoids "user" semantics in
    // a context where every visitor is intentionally unidentified.
    persistSession: false,
    autoRefreshToken: false,
  },
});
