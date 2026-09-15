-- Founder adoption dashboard: one-row product metrics view.
--
-- Phase 0 (live eigfvribtntbxyjutsma, 2026-09-15):
--   No existing view or function already aggregates usage. public has
--   zero views. The only public function matching metric/usage/admin
--   search is purge_own_account_data.
--   threads has mode ('ask'|'shared'), not kind. Both modes are Vela
--   conversations; Compare sessions live in comparison_history
--   (last_viewed_at, no created_at). blog_email_captures exists.
--
-- Access: service_role SELECT only. Views cannot carry RLS; the lock is
-- the same revoke-from-anon/authenticated belt as admin_users. The view
-- stays security_definer (Postgres default) so it can read auth.users.
-- security_invoker would fail: service_role has no SELECT on auth.users.
--
-- Safe to apply via `supabase db push` / MCP apply_migration (transactional).
-- Does not need autocommit. CREATE INDEX CONCURRENTLY is forbidden here.

create or replace view public.admin_adoption_metrics as
select
  (select count(*)::bigint
     from auth.users
    where deleted_at is null) as total_accounts,
  (select count(*)::bigint
     from auth.users
    where deleted_at is null
      and created_at > now() - interval '7 days') as new_accounts_this_week,
  (select count(*)::bigint
     from auth.users
    where deleted_at is null
      and last_sign_in_at > now() - interval '7 days') as active_accounts_this_week,
  (select count(distinct owner_id)::bigint
     from public.people) as accounts_with_person,
  (select count(*)::bigint
     from public.people) as total_people,
  (select count(*)::bigint
     from public.people
    where created_at > now() - interval '7 days') as people_added_this_week,
  coalesce(
    (select round(avg(n), 2)
       from (
         select count(*)::numeric as n
           from public.people
          group by owner_id
       ) s),
    0
  ) as avg_people_per_account,
  (select count(*)::bigint
     from public.people
    where passed_at is not null
       or relation = 'ancestor') as memorial_or_ancient_profiles,
  (select count(*)::bigint
     from public.threads) as total_vela_conversations,
  (select count(*)::bigint
     from public.messages
    where sender = 'user'
      and created_at > now() - interval '7 days') as vela_messages_this_week,
  (select count(*)::bigint
     from public.comparison_history) as compare_sessions,
  (select count(*)::bigint
     from public.comparison_history
    where last_viewed_at > now() - interval '7 days') as compare_sessions_this_week,
  (select count(*)::bigint
     from public.groups) as total_groups,
  (select count(*)::bigint
     from (
       select group_id
         from public.group_members
        group by group_id
       having count(*) >= 3
     ) g) as groups_with_3_plus_members,
  (select count(*)::bigint
     from public.notes
    where kind = 'moment') as moments_logged,
  (select count(*)::bigint
     from public.invites
    where kind = 'constellation_connect') as connect_invites_sent,
  (select count(*)::bigint
     from public.connection_grants) as connect_invites_accepted,
  (select count(*)::bigint
     from public.blog_email_captures) as blog_email_captures;

comment on view public.admin_adoption_metrics is
  'One-row founder adoption metrics. Cumulative counts plus last-7-day windows. Service-role SELECT only: revoked from anon/authenticated. Read from /admin/analytics via the service-role client behind requireAdmin(). Not a per-user content view.';

revoke all on table public.admin_adoption_metrics from public, anon, authenticated;
grant select on table public.admin_adoption_metrics to service_role;
