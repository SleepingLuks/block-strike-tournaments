-- Admin sessions for the Block Strike Tournaments Edge Function.
-- Run this after the initial schema in Supabase SQL Editor.

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.admins(telegram_id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_expiry_idx
on public.admin_sessions (expires_at);

alter table public.admin_sessions enable row level security;
revoke all on public.admin_sessions from anon, authenticated;

-- Remove expired sessions periodically from the Edge Function during login.

-- Stable match order within each round (used for bracket progression).
alter table public.matches
  add column if not exists match_number integer;

create unique index if not exists matches_round_match_number_idx
on public.matches (round_id, match_number)
where match_number is not null;
