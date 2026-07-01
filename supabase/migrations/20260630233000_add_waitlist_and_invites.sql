create table if not exists early_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);

alter table early_access enable row level security;

drop policy if exists "anon can insert waitlist" on early_access;
create policy "anon can insert waitlist" on early_access
  for insert to anon with check (true);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  from_user uuid not null references auth.users(id) on delete cascade,
  relationship_type text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table invites enable row level security;
