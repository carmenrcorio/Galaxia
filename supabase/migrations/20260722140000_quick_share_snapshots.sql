-- Token-based read-only Quick Chart / Quick Compare share snapshots.
-- Public share URLs are /s/<share_token> — never birth params in the query string.
-- Access is service-role only (API routes). No blanket anon/authenticated SELECT.
-- Never FK to people/charts/notes — these rows are anonymous funnel snapshots.

create table if not exists quick_share_snapshots (
  id uuid primary key default gen_random_uuid(),
  share_token text not null unique,
  kind text not null check (kind in ('single', 'compare')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists quick_share_snapshots_share_token_idx
  on quick_share_snapshots (share_token);

alter table quick_share_snapshots enable row level security;

-- Intentionally no policies for anon or authenticated.
-- Reads and writes go through Next.js API / server loaders using the service role.
-- A forged token therefore cannot SELECT another row via the anon key.
