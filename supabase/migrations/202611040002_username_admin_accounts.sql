-- Username/password administrator accounts; no email or Telegram dependency.
-- Recreate sessions to migrate away from the previous Telegram-linked schema.
drop table if exists public.admin_sessions;
-- Existing public tournament tables are left intact.
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  password_hash text not null,
  role text not null default 'admin' check (role in ('main_admin', 'admin')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists admin_accounts_one_main_admin
on public.admin_accounts ((role)) where role = 'main_admin';

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admin_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_sessions_expiry_idx on public.admin_sessions (expires_at);
alter table public.admin_sessions enable row level security;
alter table public.admin_accounts enable row level security;
revoke all on public.admin_sessions from anon, authenticated;
revoke all on public.admin_accounts from anon, authenticated;

alter table public.matches add column if not exists match_number integer;
create unique index if not exists matches_round_match_number_idx
on public.matches (round_id, match_number) where match_number is not null;
