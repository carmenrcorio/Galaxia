/**
 * Account purge coverage.
 *
 * Two layers, both in the default `pnpm test` suite:
 *
 * 1. Source-level: every `create table` in supabase/migrations must be
 *    classified below. Adding a table without updating this list fails the
 *    test, which is how we keep purge_own_account_data from silently
 *    missing new user data. How to update: add the table to
 *    PURGED_USER_TABLES, RETAINED_NON_USER_TABLES, or ANONYMIZED_TABLES,
 *    then seed and assert it in the replay test.
 *
 * 2. Behavioral: replay every committed migration onto ephemeral local
 *    Postgres, seed a user in every purged table, run the function, assert
 *    zero remaining rows (including auth.users).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GALAXY_RELATION_PICKER_OPTIONS } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import { withReplayedMigrations } from "./test-utils/replay-migrations-pg";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const MIGRATIONS = join(REPO_ROOT, "supabase/migrations");

/**
 * Public tables that hold the caller's data or a FK to them. After purge,
 * zero rows matching the caller may remain.
 *
 * Update this list when you add a user-data table, and add a seed + assert
 * in the replay test below.
 */
export const PURGED_USER_TABLES = [
  "profiles",
  "people",
  "charts",
  "relationships",
  "groups",
  "group_members",
  "synastry",
  "notes",
  "threads",
  "thread_participants",
  "messages",
  "transits",
  "invites",
  "trial_emails",
  "person_daily_nudges",
  "vela_rate_limits",
  "daily_nudge_emails",
  "memorial_milestones",
  "relational_transits",
  "push_tokens",
  "quick_share_snapshots",
  "support_requests",
  "connection_grants",
  "admin_users",
  "early_access",
  "comparison_history",
  "constellation_letters",
  "email_sends"
] as const;

/**
 * Public tables that are not a user's account graph. Purge must not wipe
 * them. Update this list when you add a lookup/editorial table.
 */
export const RETAINED_NON_USER_TABLES = ["posts", "galaxy_relations", "blog_email_captures"] as const;

/**
 * Rows stay, identifiers pointing at the caller are cleared.
 * Update this list when you add an audit/history table that must survive.
 */
export const ANONYMIZED_TABLES = ["admin_audit_log", "email_templates", "email_campaigns"] as const;

const CLASSIFIED = new Set<string>([
  ...PURGED_USER_TABLES,
  ...RETAINED_NON_USER_TABLES,
  ...ANONYMIZED_TABLES
]);

function publicTablesFromMigrations(): string[] {
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const names = new Set<string>();
  for (const file of files) {
    const src = readFileSync(join(MIGRATIONS, file), "utf8");
    const withoutLineComments = src.replace(/--[^\n]*/g, "");
    for (const match of withoutLineComments.matchAll(
      /create table if not exists (?:public\.)?([a-z_][a-z0-9_]*)/gi
    )) {
      names.add(match[1]!.toLowerCase());
    }
  }
  return [...names].sort();
}

function latestPurgeBody(): string {
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let latest = "";
  for (const file of files) {
    const src = readFileSync(join(MIGRATIONS, file), "utf8");
    if (/create or replace function public\.purge_own_account_data\s*\(/i.test(src)) {
      latest = src;
    }
  }
  const decl = latest.search(/create or replace function public\.purge_own_account_data\s*\(/i);
  const start = latest.indexOf("as $$", decl);
  const end = latest.indexOf("$$;", start);
  return latest.slice(start + "as $$".length, end);
}

const DEPARTING = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const THIRD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const FOUNDER = "8112465c-f74b-4842-9ef4-9d30e98d4ccb";
const DEPARTING_EMAIL = "purge-replay-departing@galaxia-audit.test";

const SEED_AND_PURGE = `
insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('${DEPARTING}', '${DEPARTING_EMAIL}', 'authenticated', 'authenticated', now(), now()),
  ('${OTHER}', 'purge-replay-other@galaxia-audit.test', 'authenticated', 'authenticated', now(), now()),
  ('${THIRD}', 'purge-replay-third@galaxia-audit.test', 'authenticated', 'authenticated', now(), now());

insert into early_access (email, source) values ('${DEPARTING_EMAIL}', 'purge-replay');

insert into people (id, owner_id, display_name, relation, birth_precision, is_self)
values
  ('11111111-aaaa-4aaa-8aaa-000000000001', '${DEPARTING}', 'Self', 'self', 'date', true),
  ('11111111-aaaa-4aaa-8aaa-000000000002', '${DEPARTING}', 'Friend', 'friend', 'date', false),
  ('11111111-bbbb-4bbb-8bbb-000000000001', '${OTHER}', 'Other Self', 'self', 'date', true),
  ('11111111-bbbb-4bbb-8bbb-000000000002', '${OTHER}', 'Mirror of departing', 'friend', 'none', false),
  ('11111111-cccc-4ccc-8ccc-000000000001', '${THIRD}', 'Third Self', 'self', 'date', true),
  ('11111111-aaaa-4aaa-8aaa-000000000003', '${DEPARTING}', 'Mirror of third', 'friend', 'none', false);

update people set linked_user_id = '${DEPARTING}', chart_source = 'linked'
  where id = '11111111-bbbb-4bbb-8bbb-000000000002';
update people set linked_user_id = '${THIRD}', chart_source = 'linked'
  where id = '11111111-aaaa-4aaa-8aaa-000000000003';

insert into charts (person_id, house_system, data, engine_version)
values
  ('11111111-aaaa-4aaa-8aaa-000000000001', 'placidus', '{"placements":[]}'::jsonb, 1),
  ('11111111-bbbb-4bbb-8bbb-000000000002', 'placidus', '{"placements":[]}'::jsonb, 1),
  ('11111111-aaaa-4aaa-8aaa-000000000003', 'placidus', '{"placements":[]}'::jsonb, 1);

insert into relationships (owner_id, person_a, person_b, relation_type)
values ('${DEPARTING}', '11111111-aaaa-4aaa-8aaa-000000000001', '11111111-aaaa-4aaa-8aaa-000000000002', 'remembrance');

insert into synastry (owner_id, person_low, person_high, relation_type, data, engine_version)
values ('${DEPARTING}', '11111111-aaaa-4aaa-8aaa-000000000001', '11111111-aaaa-4aaa-8aaa-000000000002', 'friend', '{}'::jsonb, 1);

insert into comparison_history (owner_id, person_low, person_high, last_viewed_at)
values ('${DEPARTING}', '11111111-aaaa-4aaa-8aaa-000000000001', '11111111-aaaa-4aaa-8aaa-000000000002', now());

insert into groups (id, owner_id, name, kind)
values ('22222222-aaaa-4aaa-8aaa-000000000001', '${DEPARTING}', 'Friends', 'friends');

insert into group_members (group_id, person_id)
values
  ('22222222-aaaa-4aaa-8aaa-000000000001', '11111111-aaaa-4aaa-8aaa-000000000001'),
  ('22222222-aaaa-4aaa-8aaa-000000000001', '11111111-aaaa-4aaa-8aaa-000000000002');

insert into notes (owner_id, about_person, body, kind)
values ('${DEPARTING}', '11111111-aaaa-4aaa-8aaa-000000000002', 'a private note', 'note');

insert into threads (id, owner_id, mode, subject_person)
values
  ('33333333-aaaa-4aaa-8aaa-000000000001', '${DEPARTING}', 'ask', '11111111-aaaa-4aaa-8aaa-000000000002'),
  ('33333333-bbbb-4bbb-8bbb-000000000001', '${OTHER}', 'ask', '11111111-bbbb-4bbb-8bbb-000000000001');

insert into messages (thread_id, sender, body)
values ('33333333-aaaa-4aaa-8aaa-000000000001', 'user', 'hello vela');

insert into thread_participants (thread_id, user_id, consented_at)
values
  ('33333333-aaaa-4aaa-8aaa-000000000001', '${DEPARTING}', now()),
  ('33333333-bbbb-4bbb-8bbb-000000000001', '${DEPARTING}', now()),
  ('33333333-bbbb-4bbb-8bbb-000000000001', '${OTHER}', now());

insert into transits (person_id, day, data)
values ('11111111-aaaa-4aaa-8aaa-000000000001', '2026-09-14', '{}'::jsonb);

insert into invites (token, from_user, kind, status, relationship_type)
values ('purge-from-departing', '${DEPARTING}', 'shared_space', 'pending', 'friend');

insert into invites (id, token, from_user, kind, status, relationship_type, accepted_by, accepted_at)
values (
  '44444444-bbbb-4bbb-8bbb-000000000001',
  'purge-accepted-by-departing',
  '${OTHER}',
  'shared_space',
  'accepted',
  'friend',
  '${DEPARTING}',
  now()
);

insert into trial_emails (user_id, kind) values ('${DEPARTING}', 'day1');

insert into person_daily_nudges (
  owner_id, person_id, date, copy_key, copy_tier, copy_resolved,
  relationship_framing, precision_mode, minor_safe
) values (
  '${DEPARTING}', '11111111-aaaa-4aaa-8aaa-000000000001', '2026-09-14',
  'copy.full', 'full', 'frozen copy', 'friend', 'date_sign', false
);

insert into vela_rate_limits (user_id, count) values ('${DEPARTING}', 3);

insert into daily_nudge_emails (owner_id, date, person_id)
values ('${DEPARTING}', '2026-09-14', '11111111-aaaa-4aaa-8aaa-000000000001');

insert into constellation_letters (owner_id, week_of, person_ids, transit_fingerprint)
values ('${DEPARTING}', '2026-09-13', ARRAY['11111111-aaaa-4aaa-8aaa-000000000001'::uuid], 'purge-replay-letter');

insert into email_sends (id, kind, owner_id, recipient_email, subject)
values (
  '55555555-aaaa-4aaa-8aaa-000000000001',
  'trial.day1',
  '${DEPARTING}',
  '${DEPARTING_EMAIL}',
  'Riley is in your circle now'
);

update email_templates set updated_by = '${DEPARTING}' where kind = 'trial.day1';

insert into email_campaigns (id, name, status, audience, subject, preview, paragraphs, created_by)
values (
  '66666666-aaaa-4aaa-8aaa-000000000001',
  'purge-replay-campaign',
  'draft',
  'members_trial',
  'Hello',
  'A note.',
  '["Hi there."]'::jsonb,
  '${DEPARTING}'
);

insert into memorial_milestones (profile_id, user_id, date, title, note)
values ('11111111-aaaa-4aaa-8aaa-000000000002', '${DEPARTING}', '2020-01-01', 'A milestone', 'note');

insert into relational_transits (
  owner_id, transit_body, transit_sign, aspect_type, affected_profiles,
  active_from, active_to, dedup_key
) values (
  '${DEPARTING}', 'saturn', 'pisces', 'trine',
  '[{"profile_id":"11111111-aaaa-4aaa-8aaa-000000000001"}]'::jsonb,
  now(), now() + interval '7 days', 'purge-replay-dedup'
);

insert into push_tokens (owner_id, expo_push_token, platform)
values ('${DEPARTING}', 'ExponentPushToken[purge-replay]', 'ios');

insert into quick_share_snapshots (share_token, kind, payload, created_by)
values ('purge-replay-share', 'single', '{"ok":true}'::jsonb, '${DEPARTING}');

insert into support_requests (owner_id, email, subject, body)
values ('${DEPARTING}', '${DEPARTING_EMAIL}', 'help', 'please');

insert into connection_grants (subject_user, viewer_user, viewer_person_id, share_level, status)
values
  ('${DEPARTING}', '${OTHER}', '11111111-bbbb-4bbb-8bbb-000000000002', 'chart', 'active'),
  ('${THIRD}', '${DEPARTING}', '11111111-aaaa-4aaa-8aaa-000000000003', 'chart', 'active');

insert into admin_users (owner_id, role) values ('${DEPARTING}', 'admin');

insert into admin_audit_log (actor_id, action, target_user_id)
values
  ('${DEPARTING}', 'grant_comp', '${OTHER}'),
  ('${OTHER}', 'revoke_comp', '${DEPARTING}');

update profiles set pinned_sky_person_id = '11111111-aaaa-4aaa-8aaa-000000000001'
  where id = '${DEPARTING}';

insert into posts (slug, title, dek, category, body, status)
values ('purge-replay-post', 'Retained post', 'dek', 'guides', 'body', 'published');

insert into blog_email_captures (email, has_birth_data)
values ('purge-replay-capture@example.com', false);

-- set_config(..., true) is transaction-local. A DO block keeps jwt + purge
-- in one transaction so auth.uid() is visible to the function.
do $$
begin
  perform set_config('request.jwt.claim.sub', '${DEPARTING}', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '${DEPARTING}', 'role', 'authenticated')::text,
    true
  );
  perform public.purge_own_account_data();
end;
$$;
`;

describe("purge table inventory (update these lists when adding a table)", () => {
  it("classifies every public table created in supabase/migrations", () => {
    const fromSql = publicTablesFromMigrations();
    expect(fromSql.length).toBeGreaterThan(10);
    const missing = fromSql.filter((name) => !CLASSIFIED.has(name));
    const extra = [...CLASSIFIED].filter((name) => !fromSql.includes(name));
    expect(
      missing,
      `New public table(s) are not in PURGED_USER_TABLES / RETAINED_NON_USER_TABLES / ANONYMIZED_TABLES. Classify each one and extend the replay seed. Missing: ${missing.join(", ")}`
    ).toEqual([]);
    expect(
      extra,
      `Classified table(s) have no create table in migrations. Remove them from the lists. Extra: ${extra.join(", ")}`
    ).toEqual([]);
  });

  it("the latest purge function deletes dependents before auth.users, including thread_participants", () => {
    const body = latestPurgeBody();
    const tp = body.indexOf("delete from thread_participants where user_id = uid;");
    const threads = body.indexOf("delete from threads where owner_id = uid;");
    const authUsers = body.indexOf("delete from auth.users where id = uid;");
    expect(tp).toBeGreaterThan(-1);
    expect(threads).toBeGreaterThan(tp);
    expect(authUsers).toBeGreaterThan(tp);
    expect(body).toContain("delete from quick_share_snapshots where created_by = uid;");
    expect(body).toContain("delete from vela_rate_limits where user_id = uid;");
    expect(body).toContain("delete from admin_users where owner_id = uid;");
    expect(body).toContain("delete from messages");
    expect(body).toContain("delete from early_access");
    expect(body).toContain("delete from comparison_history where owner_id = uid;");
    expect(body).toContain("delete from constellation_letters where owner_id = uid;");
    expect(body).toContain("delete from email_sends where owner_id = uid;");
    expect(body).toContain("update email_templates set updated_by = null where updated_by = uid;");
    expect(body).toContain("update email_campaigns set created_by = null where created_by = uid;");
    expect(body).not.toMatch(/delete from admin_audit_log/i);
    expect(body).not.toMatch(/\bcommit\b/i);
    expect(body).not.toMatch(/\brollback\b/i);
  });
});

describe("purge_own_account_data replay (local Postgres)", () => {
  it(
    "clears every purged table for the caller, including auth.users, and rolls nothing halfway",
    async () => {
      await withReplayedMigrations(REPO_ROOT, (db) => {
        db.psql(SEED_AND_PURGE);

        const leftover = JSON.parse(
          db.psql(`
select jsonb_build_object(
  'profiles', (select count(*) from profiles where id = '${DEPARTING}'),
  'people', (select count(*) from people where owner_id = '${DEPARTING}'),
  'charts_owned', (
    select count(*) from charts
    where person_id in (select id from people where owner_id = '${DEPARTING}')
  ),
  'relationships', (select count(*) from relationships where owner_id = '${DEPARTING}'),
  'groups', (select count(*) from groups where owner_id = '${DEPARTING}'),
  'group_members', (
    select count(*) from group_members
    where group_id in (select id from groups where owner_id = '${DEPARTING}')
       or person_id in (select id from people where owner_id = '${DEPARTING}')
  ),
  'synastry', (select count(*) from synastry where owner_id = '${DEPARTING}'),
  'comparison_history', (select count(*) from comparison_history where owner_id = '${DEPARTING}'),
  'notes', (select count(*) from notes where owner_id = '${DEPARTING}'),
  'threads', (select count(*) from threads where owner_id = '${DEPARTING}'),
  'thread_participants', (select count(*) from thread_participants where user_id = '${DEPARTING}'),
  'messages', (
    select count(*) from messages
    where thread_id in (select id from threads where owner_id = '${DEPARTING}')
  ),
  'transits', (
    select count(*) from transits
    where person_id in (select id from people where owner_id = '${DEPARTING}')
  ),
  'invites_from', (select count(*) from invites where from_user = '${DEPARTING}'),
  'invites_accepted_by', (select count(*) from invites where accepted_by = '${DEPARTING}'),
  'trial_emails', (select count(*) from trial_emails where user_id = '${DEPARTING}'),
  'person_daily_nudges', (select count(*) from person_daily_nudges where owner_id = '${DEPARTING}'),
  'vela_rate_limits', (select count(*) from vela_rate_limits where user_id = '${DEPARTING}'),
  'daily_nudge_emails', (select count(*) from daily_nudge_emails where owner_id = '${DEPARTING}'),
  'constellation_letters', (select count(*) from constellation_letters where owner_id = '${DEPARTING}'),
  'email_sends', (select count(*) from email_sends where owner_id = '${DEPARTING}'),
  'memorial_milestones', (select count(*) from memorial_milestones where user_id = '${DEPARTING}'),
  'relational_transits', (select count(*) from relational_transits where owner_id = '${DEPARTING}'),
  'push_tokens', (select count(*) from push_tokens where owner_id = '${DEPARTING}'),
  'quick_share_snapshots', (select count(*) from quick_share_snapshots where created_by = '${DEPARTING}'),
  'support_requests', (select count(*) from support_requests where owner_id = '${DEPARTING}'),
  'connection_grants', (
    select count(*) from connection_grants
    where subject_user = '${DEPARTING}' or viewer_user = '${DEPARTING}'
  ),
  'admin_users', (select count(*) from admin_users where owner_id = '${DEPARTING}'),
  'early_access', (select count(*) from early_access where lower(email) = lower('${DEPARTING_EMAIL}')),
  'auth_users', (select count(*) from auth.users where id = '${DEPARTING}'),
  'people_still_linked', (select count(*) from people where linked_user_id = '${DEPARTING}')
);
`)
        ) as Record<string, number>;

        // Map every PURGED_USER_TABLES entry to the leftover jsonb key above.
        // Adding a table to PURGED_USER_TABLES without a key here fails this
        // test. Add the matching jsonb key in the query when you add a table.
        const leftoverKeyByTable: Record<(typeof PURGED_USER_TABLES)[number], string> = {
          profiles: "profiles",
          people: "people",
          charts: "charts_owned",
          relationships: "relationships",
          groups: "groups",
          group_members: "group_members",
          synastry: "synastry",
          comparison_history: "comparison_history",
          notes: "notes",
          threads: "threads",
          thread_participants: "thread_participants",
          messages: "messages",
          transits: "transits",
          invites: "invites_from",
          trial_emails: "trial_emails",
          person_daily_nudges: "person_daily_nudges",
          vela_rate_limits: "vela_rate_limits",
          daily_nudge_emails: "daily_nudge_emails",
          constellation_letters: "constellation_letters",
          email_sends: "email_sends",
          memorial_milestones: "memorial_milestones",
          relational_transits: "relational_transits",
          push_tokens: "push_tokens",
          quick_share_snapshots: "quick_share_snapshots",
          support_requests: "support_requests",
          connection_grants: "connection_grants",
          admin_users: "admin_users",
          early_access: "early_access"
        };

        const leftoverKeys = [
          ...Object.values(leftoverKeyByTable),
          "invites_accepted_by",
          "auth_users",
          "people_still_linked"
        ] as const;

        for (const key of leftoverKeys) {
          expect(leftover[key], `${key} must be 0 after purge`).toBe(0);
        }

        const audit = JSON.parse(
          db.psql(`
select jsonb_build_object(
  'audit_rows', (select count(*) from admin_audit_log where id is not null),
  'audit_still_points', (
    select count(*) from admin_audit_log
    where actor_id = '${DEPARTING}' or target_user_id = '${DEPARTING}'
  ),
  'other_user', (select count(*) from auth.users where id = '${OTHER}'),
  'third_user', (select count(*) from auth.users where id = '${THIRD}'),
  'founder_admin', (select count(*) from admin_users where owner_id = '${FOUNDER}'),
  'posts', (select count(*) from posts where slug = 'purge-replay-post'),
  'galaxy_relations', (select count(*) from galaxy_relations),
  'blog_email_captures', (select count(*) from blog_email_captures where email = 'purge-replay-capture@example.com'),
  'email_templates_still_point', (
    select count(*) from email_templates where updated_by = '${DEPARTING}'
  ),
  'email_campaigns_kept', (
    select count(*) from email_campaigns where id = '66666666-aaaa-4aaa-8aaa-000000000001'
  ),
  'email_campaigns_still_point', (
    select count(*) from email_campaigns where created_by = '${DEPARTING}'
  ),
  'other_thread', (select count(*) from threads where id = '33333333-bbbb-4bbb-8bbb-000000000001'),
  'bare_star', (
    select count(*) from people
    where id = '11111111-bbbb-4bbb-8bbb-000000000002'
      and linked_user_id is null
      and chart_source = 'local'
  ),
  'mirror_chart', (
    select count(*) from charts where person_id = '11111111-bbbb-4bbb-8bbb-000000000002'
  ),
  'accepted_invite_kept', (
    select count(*) from invites
    where id = '44444444-bbbb-4bbb-8bbb-000000000001'
      and accepted_by is null
      and accepted_at is not null
  )
);
`)
        ) as Record<string, number>;

        expect(audit.audit_rows).toBeGreaterThanOrEqual(2);
        expect(audit.audit_still_points).toBe(0);
        expect(audit.other_user).toBe(1);
        expect(audit.third_user).toBe(1);
        expect(audit.founder_admin).toBe(1);
        expect(audit.posts).toBe(1);
        expect(audit.blog_email_captures).toBe(1);
        expect(audit.email_templates_still_point).toBe(0);
        expect(audit.email_campaigns_kept).toBe(1);
        expect(audit.email_campaigns_still_point).toBe(0);
        // The point of this row is that a retained lookup table survives the
        // purge untouched, not that the canonical relation list is any
        // particular length. Deriving the count from the TypeScript source
        // keeps it from going stale every time a relation is added, and
        // galaxy-relations-parity.test.ts is what guards the list itself.
        expect(audit.galaxy_relations).toBe(GALAXY_RELATION_PICKER_OPTIONS.length);
        expect(audit.other_thread).toBe(1);
        expect(audit.bare_star).toBe(1);
        expect(audit.mirror_chart).toBe(0);
        expect(audit.accepted_invite_kept).toBe(1);
      });
    },
    120_000
  );
});
