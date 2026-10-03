/**
 * Sep 12 platform audit (S8, D1, purge FK gap): after replaying every
 * committed migration on ephemeral Postgres, owner/thread indexes exist and
 * no public RLS policy still calls bare auth.uid() in qual or with_check.
 *
 * Behavioral purge proof (thread_participants + auth.users) lives in
 * purge-own-account-data.test.ts. Source-level guards for the Sep 13
 * migration files live in rls-indexes-purge-migrations.test.ts.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withReplayedMigrations } from "./test-utils/replay-migrations-pg";

const REPO_ROOT = join(__dirname, "..", "..", "..");

describe("Sep 12 platform audit state (local migration replay)", () => {
  it(
    "has owner/thread indexes and wrapped auth.uid() in every public RLS policy",
    async () => {
      await withReplayedMigrations(REPO_ROOT, (db) => {
        const indexNames = JSON.parse(
          db.psql(`
select coalesce(jsonb_agg(indexname order by indexname), '[]'::jsonb)
from pg_indexes
where schemaname = 'public'
  and (
    (tablename = 'people' and indexname = 'people_owner_id_idx')
    or (tablename = 'notes' and indexname = 'notes_owner_id_idx')
    or (tablename = 'messages' and indexname = 'messages_thread_id_idx')
  );
`)
        ) as string[];

        expect(indexNames).toEqual([
          "messages_thread_id_idx",
          "notes_owner_id_idx",
          "people_owner_id_idx"
        ]);

        const barePolicies = JSON.parse(
          db.psql(`
select coalesce(
  jsonb_agg(
    jsonb_build_object('table', tablename, 'policy', policyname)
    order by tablename, policyname
  ),
  '[]'::jsonb
)
from pg_policies
where schemaname = 'public'
  and (
    (qual is not null and qual ilike '%auth.uid()%' and qual not ilike '%select auth.uid()%')
    or (
      with_check is not null
      and with_check ilike '%auth.uid()%'
      and with_check not ilike '%select auth.uid()%'
    )
  );
`)
        ) as { table: string; policy: string }[];

        expect(barePolicies, "bare auth.uid() in RLS").toEqual([]);
      });
    },
    120_000
  );
});
