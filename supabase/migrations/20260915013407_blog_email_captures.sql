-- Blog chart-reading email capture ledger.
--
-- Public, unauthenticated POST /api/blog/chart-reading-capture writes one
-- row per submission. Rate limit (3 per email per 24 hours) is counted from
-- submitted_at. Service-role only: no client policies, same posture as
-- constellation_letters / daily_nudge_emails.

create table if not exists blog_email_captures (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  submitted_at timestamptz not null default now(),
  has_birth_data boolean not null
);

comment on table public.blog_email_captures is
  'Capture and rate-limit ledger for the public blog chart-reading email. One row per submission. Service-role only; no client policies.';

create index if not exists blog_email_captures_email_submitted_at_idx
  on blog_email_captures (email, submitted_at desc);

alter table blog_email_captures enable row level security;
-- No client policies: only the service role (the capture route) reads/writes this.

revoke all on table public.blog_email_captures from anon, authenticated;
