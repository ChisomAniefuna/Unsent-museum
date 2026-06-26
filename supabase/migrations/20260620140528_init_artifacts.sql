-- ─────────────────────────────────────────────────────────────────────────────
-- The Unsent Museum - Supabase setup
-- ─────────────────────────────────────────────────────────────────────────────
-- Paste this entire file into your Supabase project's SQL editor and click Run.
--   https://supabase.com/dashboard/project/jgdlnwvgtipiiolfzqaz/sql
-- Safe to re-run; every statement is idempotent.

-- ─── 1. The artifacts table ──────────────────────────────────────────────────
-- One row per artifact. The full Artifact shape lives in `payload` (JSONB) so
-- the schema does not need to be migrated every time the frontend grows a new
-- field. The scalar columns are pulled out so they can be indexed and filtered.

create table if not exists public.artifacts (
  id          text         primary key,
  emotion     text         not null,
  visibility  text         not null default 'public',
  created_at  timestamptz  not null default now(),
  payload     jsonb        not null
);

-- Fast "newest public artifacts" query for the gallery.
create index if not exists artifacts_public_recent_idx
  on public.artifacts (visibility, created_at desc);

-- Filter by room (each emotion room shows only its own artifacts).
create index if not exists artifacts_emotion_idx
  on public.artifacts (emotion);

-- ─── 2. Row Level Security ───────────────────────────────────────────────────
-- The museum is anonymous-write / public-read. Anyone can post a message and
-- anyone can read public messages. No login, no user identity.

alter table public.artifacts enable row level security;

-- Anyone can read rows marked visibility = 'public'. Private artifacts (saved
-- with visibility = 'private' or 'unlisted') are hidden from list queries.
drop policy if exists "Public artifacts are readable" on public.artifacts;
create policy "Public artifacts are readable"
  on public.artifacts
  for select
  using (visibility = 'public');

-- Anyone can insert. (No auth, no profile - the museum is intentionally
-- anonymous.) The frontend generates the artifact ID; the DB does not.
drop policy if exists "Anyone can submit an artifact" on public.artifacts;
create policy "Anyone can submit an artifact"
  on public.artifacts
  for insert
  with check (true);

-- ─── 3. Likes / shares / downloads counters ──────────────────────────────────
-- These live inside the JSONB payload. To increment them atomically (without
-- a read-modify-write race) we use a SECURITY DEFINER function that only
-- touches those three keys.

create or replace function public.increment_artifact_likes(artifact_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.artifacts
     set payload = jsonb_set(
       payload,
       '{likes}',
       to_jsonb(coalesce((payload->>'likes')::integer, 0) + 1)
     )
   where id = artifact_id
  returning (payload->>'likes')::integer into new_count;

  return coalesce(new_count, 0);
end;
$$;

create or replace function public.increment_artifact_shares(artifact_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.artifacts
     set payload = jsonb_set(
       payload,
       '{shares}',
       to_jsonb(coalesce((payload->>'shares')::integer, 0) + 1)
     )
   where id = artifact_id
  returning (payload->>'shares')::integer into new_count;

  return coalesce(new_count, 0);
end;
$$;

create or replace function public.increment_artifact_downloads(artifact_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  update public.artifacts
     set payload = jsonb_set(
       payload,
       '{downloads}',
       to_jsonb(coalesce((payload->>'downloads')::integer, 0) + 1)
     )
   where id = artifact_id
  returning (payload->>'downloads')::integer into new_count;

  return coalesce(new_count, 0);
end;
$$;

-- Let the anonymous role call the counters.
grant execute on function public.increment_artifact_likes(text)     to anon, authenticated;
grant execute on function public.increment_artifact_shares(text)    to anon, authenticated;
grant execute on function public.increment_artifact_downloads(text) to anon, authenticated;
