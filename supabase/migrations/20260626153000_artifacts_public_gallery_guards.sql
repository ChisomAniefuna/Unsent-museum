-- Keep public artifacts available through Supabase Data API and prevent exact
-- visual duplicates from entering the public collection.

create table if not exists public.artifacts (
  id          text         primary key,
  emotion     text         not null,
  visibility  text         not null default 'public',
  created_at  timestamptz  not null default now(),
  payload     jsonb        not null
);

create index if not exists artifacts_public_recent_idx
  on public.artifacts (visibility, created_at desc);

create index if not exists artifacts_emotion_idx
  on public.artifacts (emotion);

alter table public.artifacts enable row level security;

drop policy if exists "Public artifacts are readable" on public.artifacts;
create policy "Public artifacts are readable"
  on public.artifacts
  for select
  using (visibility = 'public');

drop policy if exists "Anyone can submit an artifact" on public.artifacts;
create policy "Anyone can submit an artifact"
  on public.artifacts
  for insert
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert on table public.artifacts to anon, authenticated;

create unique index if not exists artifacts_public_visual_dna_uidx
  on public.artifacts (
    emotion,
    ((payload -> 'dna' ->> 'shaderIndex')::integer),
    ((((payload -> 'dna' ->> 'seed')::integer % 10000) + 10000) % 10000)
  )
  where visibility = 'public'
    and payload ? 'dna'
    and (payload -> 'dna') ? 'shaderIndex'
    and (payload -> 'dna') ? 'seed'
    and (payload -> 'dna' ->> 'shaderIndex') ~ '^-?[0-9]+$'
    and (payload -> 'dna' ->> 'seed') ~ '^-?[0-9]+$';
