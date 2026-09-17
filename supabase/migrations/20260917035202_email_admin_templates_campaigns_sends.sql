-- Admin email catalog: editable automation copy, campaigns, and a unified
-- send ledger with first-party open tracking.
--
-- email_templates is the source of truth for automation chrome (subject,
-- preview, paragraphs, CTA). Triggers, consent columns, and computed
-- bodies (nudge copy_resolved, letter portraits, chart placements) stay
-- in code. Crons fall back to the shipped copy in apps/web/lib/email-copy.ts
-- when this table is missing (migration not yet applied).
--
-- email_sends is the measurement ledger for every Galaxia-sent mail.
-- Opens are recorded by GET /api/email/open (pixel) and, when configured,
-- POST /api/webhooks/resend. Service-role only, same posture as
-- trial_emails / daily_nudge_emails / constellation_letters.
--
-- email_campaigns are one-shot broadcasts composed in /admin/emails.
-- Member audiences honor campaign_emails_opted_out (service-role only,
-- flipped by /api/campaign-email/unsubscribe). Blog audience honors
-- blog_email_captures.unsubscribed_at.
--
-- Purge: copy of 20260914250000 plus email_sends (owner rows) and
-- nulling template/campaign actor FKs. Templates and campaigns themselves
-- are editorial and survive.

alter table public.profiles
  add column if not exists campaign_emails_opted_out boolean not null default false;

comment on column public.profiles.campaign_emails_opted_out is
  'CAN-SPAM opt-out for admin-composed campaigns to members. Default false. Set true by the no-login /api/campaign-email/unsubscribe route via profiles.unsubscribe_token. Independent of trial / daily sky / weekly letter. Not owner-writable from Settings.';

alter table public.blog_email_captures
  add column if not exists unsubscribed_at timestamptz;

comment on column public.blog_email_captures.unsubscribed_at is
  'Set when the address unsubscribes from blog chart-reading / blog-audience campaign mail. Null means still subscribed. Service-role only.';

create table if not exists email_templates (
  kind text primary key,
  name text not null,
  description text not null,
  trigger_label text not null,
  category text not null check (category in ('automation', 'system')),
  enabled boolean not null default true,
  editable_fields text[] not null default '{}',
  subject text not null,
  preview text not null,
  paragraphs jsonb not null default '[]'::jsonb,
  cta_label text,
  cta_path_key text,
  first_email_line text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

comment on table public.email_templates is
  'One row per Galaxia email kind. Automations are editable from /admin/emails; system (GoTrue) rows are catalog-only. Service-role only.';

create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null check (status in ('draft', 'sending', 'sent', 'canceled', 'failed')),
  audience text not null check (audience in ('blog_chart_readings', 'members_trial', 'members_nudge', 'members_letter')),
  subject text not null,
  preview text not null,
  paragraphs jsonb not null default '[]'::jsonb,
  cta_label text,
  cta_path_key text,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.email_campaigns is
  'Admin-composed one-shot campaigns. Draft until an admin sends. Service-role only.';

create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  owner_id uuid references auth.users(id) on delete cascade,
  recipient_email text not null,
  resend_id text,
  subject text not null,
  is_test boolean not null default false,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  open_count integer not null default 0
);

comment on table public.email_sends is
  'Unified send + open ledger. id is the tracking pixel token. opened_at is first open; open_count is totals. Service-role only.';

create unique index if not exists email_sends_resend_id_idx
  on email_sends (resend_id)
  where resend_id is not null;

create index if not exists email_sends_kind_sent_at_idx
  on email_sends (kind, sent_at desc);

create index if not exists email_sends_campaign_id_idx
  on email_sends (campaign_id)
  where campaign_id is not null;

create index if not exists email_sends_owner_id_idx
  on email_sends (owner_id)
  where owner_id is not null;

alter table email_templates enable row level security;
alter table email_campaigns enable row level security;
alter table email_sends enable row level security;
-- No client policies: only the service role (admin API, crons, pixel, webhook) reads/writes these.

revoke all on table public.email_templates from anon, authenticated;
revoke all on table public.email_campaigns from anon, authenticated;
revoke all on table public.email_sends from anon, authenticated;

insert into email_templates (
  kind, name, description, trigger_label, category, enabled, editable_fields,
  subject, preview, paragraphs, cta_label, cta_path_key, first_email_line
) values
(
  'trial.day1',
  'Trial day 1',
  'After they add their first person.',
  'Daily cron, once, when the account is under 3 days old and has at least one person.',
  'automation',
  true,
  array['subject', 'preview', 'paragraphs', 'cta_label', 'cta_path_key'],
  '{{circleSubject}}',
  'Add one more person. A year is enough.',
  $json$["You've added {{addedName}}.","Add one more person. A date is enough. A year is enough.","Your trial runs through {{trialEndDate}}. Nothing will be charged before then."]$json$::jsonb,
  'Add someone else →',
  'welcome',
  null
),
(
  'trial.day4_multi',
  'Trial day 4, two or more people',
  'Points them at Compare once the circle has more than one person.',
  'Daily cron, once, when the account is 3–8 days old and has two or more people.',
  'automation',
  true,
  array['subject', 'preview', 'paragraphs', 'cta_label', 'cta_path_key'],
  '{{needSubject}}',
  'Open Compare. It''s built from their charts.',
  $json$["You've mapped {{peopleCount}} people.","Open **Compare**, choose two of them, and read what they need from you. It's built from their actual placements."]$json$::jsonb,
  'Compare two people →',
  'compare',
  null
),
(
  'trial.day4_one',
  'Trial day 4, one person',
  'The at-risk path: almost nothing works with one person.',
  'Daily cron, once, when the account is 3–8 days old and still has exactly one person.',
  'automation',
  true,
  array['subject', 'preview', 'paragraphs', 'cta_label', 'cta_path_key'],
  'Add one more person',
  'A date works. A year works.',
  $json$["{{onePersonLine}}","Add someone you actually live beside. A date works. A year works."]$json$::jsonb,
  'Add someone →',
  'welcome',
  null
),
(
  'trial.day11',
  'Trial day 11',
  'Honest reminder about three days out, with their real counts.',
  'Daily cron, once, when 2–4 days remain in the trial.',
  'automation',
  true,
  array['subject', 'preview', 'paragraphs', 'cta_label', 'cta_path_key'],
  'Your trial ends {{trialEndDate}}',
  'Nothing will be charged. Everything stays saved.',
  $json$["Your trial ends on {{trialEndDate}}. We never asked for a card, so nothing will be charged. When it ends, access pauses until you choose to continue.","Here's what you've built:","{{builtList}}","All of it stays saved. If you continue, it's exactly where you left it."]$json$::jsonb,
  'Continue with Galaxia →',
  'subscribe',
  null
),
(
  'trial.day14',
  'Trial day 14',
  'Trial ended, not converted. Nothing was deleted.',
  'Daily cron, once, on the day the trial ends.',
  'automation',
  true,
  array['subject', 'preview', 'paragraphs', 'cta_label', 'cta_path_key'],
  'Your people are still here',
  'Nothing was deleted. Come back whenever.',
  $json$["Your trial has ended. We haven't charged you.","Everything you built is saved. {{peopleCount}} people, your notes, your charts. Nothing has been deleted.","If it wasn't right, one line to {{helpEmail}} is enough. It goes to the person who built this."]$json$::jsonb,
  'Pick up where you left off →',
  'app',
  null
),
(
  'nudge.sky_today',
  'Daily sky',
  'One note about one person, local 9am. The sentence itself is written by the sky engine and cannot be edited here.',
  'Hourly cron, once per owner per local day, at 9am in their timezone.',
  'automation',
  true,
  array['preview', 'first_email_line', 'cta_label'],
  '{{subjectPersonName}}, today',
  'One note on how to show up for them.',
  $json$["For **{{subjectPersonName}}** today:","{{copyResolved}}"]$json$::jsonb,
  'Open Galaxia →',
  'app',
  'You''re getting this because you''re a Galaxia member. Turn it off any time from the link below.'
),
(
  'letter.weekly',
  'Weekly constellation letter',
  'Sunday letter about who in the circle has something real moving. Portraits are computed and cannot be edited here.',
  'Daily cron, once per owner per local Sunday, only when there is a real in-orb hit.',
  'automation',
  true,
  array['preview', 'cta_label'],
  '{{letterSubject}}',
  'Who in your circle has something real moving.',
  '[]'::jsonb,
  'open this week in Galaxia',
  'app',
  null
),
(
  'chart.reading',
  'Blog chart reading',
  'Public capture form. Placement paragraphs come from the reading and cannot be edited here.',
  'On submit of the blog chart-reading form.',
  'automation',
  true,
  array['preview'],
  '{{chartSubject}}',
  'Three placements, in the words we already have.',
  '[]'::jsonb,
  null,
  null,
  null
),
(
  'auth.signup',
  'Sign-up confirmation',
  'Sent by Supabase Auth when an account is created and the address is not yet confirmed.',
  'GoTrue, on sign-up. Resend from /admin/users.',
  'system',
  true,
  '{}',
  'Confirm your Galaxia account',
  'Confirm the address so you can sign in.',
  '[]'::jsonb,
  null,
  null,
  null
),
(
  'auth.magic_link',
  'Magic link',
  'Sent by Supabase Auth when someone signs in with a link.',
  'GoTrue, on magic-link sign-in.',
  'system',
  true,
  '{}',
  'Your Galaxia sign-in link',
  'Use this link to sign in.',
  '[]'::jsonb,
  null,
  null,
  null
),
(
  'auth.recovery',
  'Password reset',
  'Sent by Supabase Auth when someone asks to reset a password. Resend from /admin/users.',
  'GoTrue, on password reset.',
  'system',
  true,
  '{}',
  'Reset your Galaxia password',
  'Use this link to choose a new password.',
  '[]'::jsonb,
  null,
  null,
  null
)
on conflict (kind) do nothing;

create or replace function public.purge_own_account_data()
returns void
language plpgsql
security definer
set search_path TO 'public'
as $$
declare
  uid uuid := auth.uid();
  caller_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Email is needed for early_access (waitlist is keyed by email, not user id).
  -- Read it before the auth.users row goes.
  select email into caller_email from auth.users where id = uid;

  -- Replaces the former bare `update people set linked_user_id = null where
  -- linked_user_id = uid`. Strips every mirror of me out of other people's
  -- galaxies before the link is dropped. The predicate is linked_user_id
  -- rather than a connection_grants join so it also catches a mirror whose
  -- grant row has already gone, and because people_linked_user_id_fkey is NO
  -- ACTION, every one of these rows has to be cleared before the auth.users
  -- row can be deleted at all.
  delete from charts
    where person_id in (select id from people where linked_user_id = uid);

  -- chart_source and linked_user_id clear in one statement. A CHECK is
  -- evaluated per statement, so splitting them would fail the moment the
  -- planned people_linked_chart_requires_link constraint lands.
  update people set
      chart_source = 'local',
      birth_precision = 'none',
      birth_date = null,
      birth_time = null,
      birth_place = null,
      birth_lat = null,
      birth_lng = null,
      tz_offset_min = null,
      linked_user_id = null
    where linked_user_id = uid;

  -- Both directions: rows where I am the subject, and rows where I am the
  -- viewer. The viewer-side rows would also cascade from the people delete
  -- further down, but they go explicitly so this function's guarantee does
  -- not depend on a foreign key firing.
  delete from connection_grants where subject_user = uid or viewer_user = uid;

  delete from notes where owner_id = uid;

  update notes
    set about_person = null
    where about_person in (select id from people where owner_id = uid);

  delete from synastry where owner_id = uid;
  delete from comparison_history where owner_id = uid;
  delete from relationships where owner_id = uid;

  delete from person_daily_nudges
    where person_id in (select id from people where owner_id = uid)
       or owner_id = uid;

  delete from daily_nudge_emails where owner_id = uid;

  delete from constellation_letters where owner_id = uid;

  delete from email_sends where owner_id = uid;

  update email_templates set updated_by = null where updated_by = uid;
  update email_campaigns set created_by = null where created_by = uid;

  delete from memorial_milestones
    where profile_id in (select id from people where owner_id = uid)
       or user_id = uid;

  delete from relational_transits where owner_id = uid;

  -- New: push_tokens.owner_id only (no people FK).
  delete from push_tokens where owner_id = uid;

  delete from transits
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where person_id in (select id from people where owner_id = uid);

  delete from group_members
    where group_id in (select id from groups where owner_id = uid);

  -- Owned-thread messages CASCADE off threads; delete them first so this
  -- function's guarantee does not depend on that FK firing.
  delete from messages
    where thread_id in (select id from threads where owner_id = uid);

  -- Participant rows on any thread (own or others'). Must precede the
  -- auth.users delete: thread_participants.user_id is NO ACTION.
  delete from thread_participants where user_id = uid;

  delete from threads where owner_id = uid;

  update threads
    set subject_person = null
    where subject_person in (select id from people where owner_id = uid);

  update threads
    set group_id = null
    where group_id in (select id from groups where owner_id = uid);

  delete from groups where owner_id = uid;

  -- Clear pin before people delete (FK ondelete set null also covers this).
  update profiles set pinned_sky_person_id = null where id = uid;

  -- Mirrors I was holding of other people go with my own rows; charts
  -- CASCADE off people, so this leaves no orphaned mirrored chart behind.
  delete from charts
    where person_id in (select id from people where owner_id = uid);

  delete from people where owner_id = uid;

  delete from trial_emails where user_id = uid;
  delete from invites where from_user = uid;

  -- Invites I accepted from other senders stay, anonymized. accepted_by is
  -- ON DELETE SET NULL precisely so an account deletion does not cascade
  -- away the sender's invite history, and doing it here means the purge
  -- alone produces the same end state as dropping the auth.users row.
  update invites set accepted_by = null where accepted_by = uid;

  delete from support_requests where owner_id = uid;
  update support_requests set handled_by = null where handled_by = uid;

  -- Restored: present in 20260723200000, dropped by a later CREATE OR REPLACE.
  -- created_by is ON DELETE CASCADE, but we do not wait for auth.users to fire it.
  delete from quick_share_snapshots where created_by = uid;

  -- ON DELETE CASCADE, same reason as push_tokens: this function used not to
  -- delete auth.users, so an explicit delete is required for completeness.
  delete from vela_rate_limits where user_id = uid;

  delete from admin_users where owner_id = uid;

  -- Waitlist is not FK'd to auth.users. Matching email is the only handle.
  if caller_email is not null and length(trim(caller_email)) > 0 then
    delete from early_access where lower(email) = lower(caller_email);
  end if;

  delete from profiles where id = uid;

  update public.admin_audit_log set actor_id = null where actor_id = uid;
  update public.admin_audit_log set target_user_id = null where target_user_id = uid;

  -- Login row last, after every NO ACTION FK is gone. Lives in this
  -- function so a mid-purge error cannot leave the graph gone and the
  -- login intact. auth.identities / sessions CASCADE from auth.users.
  delete from auth.users where id = uid;
end;
$$;

comment on function public.purge_own_account_data() is
  'Atomic self-serve purge of the caller''s owned Galaxia graph AND the auth.users login row, in one transaction. Deletes thread_participants (any thread), owned messages, quick_share_snapshots, vela_rate_limits, admin_users, comparison_history, constellation_letters, email_sends for the caller, and matching early_access email, then nulls admin_audit_log / email_templates / email_campaigns FKs and deletes auth.users. Also ends every constellation-connect relationship in both directions. SECURITY DEFINER; auth.uid() only. Any error rolls the entire body back.';
