-- vela-chat cost-abuse rate limit (Phase 1: table + RPC only; edge function
-- is wired separately, see supabase/functions/vela-chat/index.ts).
--
-- Per-user atomic fixed-window counter. `check_and_increment_vela_rate` is
-- the ONLY writer of this table's count/window_start; it is SECURITY
-- DEFINER, bound to auth.uid() internally (mirrors delete_own_person /
-- purge_own_account_data), and the check-and-record happens as a single
-- locking UPDATE, not a read-then-write, so it holds under concurrent
-- callers (see the UPDATE's WHERE clause below).
--
-- Cap numbers and window length are NOT decided here — they are
-- FOUNDER-REVIEW constants in the edge function (Phase 2), passed in as
-- p_limit / p_window_seconds. This migration only provides the primitive.

create table if not exists public.vela_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  count int not null default 0
);

comment on table public.vela_rate_limits is
  'One row per user: the current vela-chat rate-limit window. Written ONLY by check_and_increment_vela_rate (SECURITY DEFINER); clients may only read their own row. Not a general-purpose counter — specific to the vela-chat admission check.';

alter table public.vela_rate_limits enable row level security;

-- Read-only for clients. No insert/update/delete policy exists on purpose:
-- with RLS enabled and no write policy, PostgREST's table-level grants
-- (default for every table in this project, see e.g. trial_emails /
-- quick_share_snapshots) are overridden by RLS's default-deny, so anon and
-- authenticated cannot write this table directly under any circumstance.
-- All writes go through check_and_increment_vela_rate below.
create policy "vela_rate_limits owner read"
on public.vela_rate_limits for select
using (user_id = auth.uid());

-- ─── Atomic admission check ────────────────────────────────────────────────
--
-- Returns true (admitted, count recorded) or false (denied, no state
-- change) for the CURRENT caller (auth.uid()), never for a client-supplied
-- id — mirrors delete_own_person / purge_own_account_data exactly.
--
-- The insert is a separate statement (needed once, to create the caller's
-- row on their very first-ever call) but the check-and-record itself is a
-- SINGLE UPDATE: one WHERE clause and one SET (both CASE branches) read the
-- SAME pre-update row values, and Postgres serializes concurrent UPDATEs
-- against the same primary-key row via a row-level lock plus EvalPlanQual
-- re-evaluation (a second concurrent UPDATE blocks until the first commits,
-- then re-reads the just-committed row and re-runs its own WHERE/SET against
-- it) — so there is no read-then-write gap for two concurrent callers to
-- both observe "under limit" and both proceed. See the changelog entry on
-- the implementation branch for the concurrency proof.
create or replace function public.check_and_increment_vela_rate(
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  allowed boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure a row exists before the atomic UPDATE below; a first-ever caller
  -- has no row yet, and the UPDATE's WHERE user_id = uid would otherwise
  -- match nothing (which must not be misread as "denied"). Idempotent under
  -- concurrent first calls: the loser of the race hits the unique primary
  -- key and no-ops, then both proceed to the same atomic UPDATE below.
  insert into public.vela_rate_limits (user_id, window_start, count)
  values (uid, now(), 0)
  on conflict (user_id) do nothing;

  -- Single locking statement: WHERE and both SET CASEs all evaluate against
  -- the row's pre-update values for this execution (standard UPDATE
  -- semantics — SET expressions never see values written earlier in the
  -- same statement), so the window-reset decision and the count decision
  -- are always consistent with each other.
  update public.vela_rate_limits
  set window_start = case
                        when now() - window_start >= make_interval(secs => p_window_seconds)
                        then now()
                        else window_start
                      end,
      count = case
                 when now() - window_start >= make_interval(secs => p_window_seconds)
                 then 1
                 else count + 1
               end
  where user_id = uid
    and (
      now() - window_start >= make_interval(secs => p_window_seconds)
      or count < p_limit
    )
  returning true into allowed;

  return coalesce(allowed, false);
end;
$$;

comment on function public.check_and_increment_vela_rate(int, int) is
  'Atomic per-user fixed-window admission check for vela-chat. Returns true (and records the hit) or false (no state change), for auth.uid() only. SECURITY DEFINER so it can write vela_rate_limits despite the table having no client write policy. Cap/window are caller-supplied (FOUNDER-REVIEW constants live in the edge function, not here).';

-- authenticated may call it for themselves (auth.uid() inside); anon may not
-- (there is no unauthenticated vela-chat call to rate-limit) — mirrors the
-- handle_new_user() revoke-from-all pattern for the "who can invoke this"
-- half, and the delete_own_group()-style "grant to authenticated only" for
-- the other half.
revoke all on function public.check_and_increment_vela_rate(int, int) from public, anon;
grant execute on function public.check_and_increment_vela_rate(int, int) to authenticated;
