-- Archive threads: a status on the threads table. Archived threads are hidden
-- from default "Resume" lists but never deleted; they're retrievable under
-- "Past conversations" on the person profile.
alter table threads
  add column if not exists status text not null default 'active'
  check (status in ('active', 'archived'));

-- Trial-email idempotency: one row per (user, email kind) so the daily cron
-- never sends the same email twice.
create table if not exists trial_emails (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,  -- day1 | day4_one | day4_multi | day11 | day14
  sent_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table trial_emails enable row level security;
-- No client policies: only the service role (cron route) reads/writes this.
