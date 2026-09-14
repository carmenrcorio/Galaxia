/**
 * Replay proof that comparison_history is owner-only: a second
 * authenticated user cannot read another owner's pair history.
 *
 * Runs on ephemeral local Postgres (same helper as the purge suite).
 * Never opens eigfvribtntbxyjutsma.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withReplayedMigrations } from "./test-utils/replay-migrations-pg";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const OWNER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PERSON_LOW = "11111111-aaaa-4aaa-8aaa-000000000001";
const PERSON_HIGH = "11111111-aaaa-4aaa-8aaa-000000000002";

const SEED = `
insert into auth.users (id, email, aud, role, created_at, updated_at)
values
  ('${OWNER_A}', 'history-a@galaxia-audit.test', 'authenticated', 'authenticated', now(), now()),
  ('${OWNER_B}', 'history-b@galaxia-audit.test', 'authenticated', 'authenticated', now(), now());

insert into people (id, owner_id, display_name, relation, birth_precision, is_self)
values
  ('${PERSON_LOW}', '${OWNER_A}', 'Ada', 'self', 'date', true),
  ('${PERSON_HIGH}', '${OWNER_A}', 'Bea', 'friend', 'date', false);

insert into comparison_history (owner_id, person_low, person_high, last_viewed_at)
values ('${OWNER_A}', '${PERSON_LOW}', '${PERSON_HIGH}', now());

create temporary table comparison_history_rls_probe (owner text primary key, n bigint);
`;

function countAs(ownerId: string): string {
  return `
do $$
declare
  n bigint;
begin
  perform set_config('request.jwt.claim.sub', '${ownerId}', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '${ownerId}', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
  select count(*) into n from public.comparison_history;
  reset role;
  insert into comparison_history_rls_probe (owner, n) values ('${ownerId}', n)
  on conflict (owner) do update set n = excluded.n;
end;
$$;
`;
}

describe("comparison_history RLS (local replay)", () => {
  it(
    "denies a cross-user SELECT and allows the owner",
    async () => {
      await withReplayedMigrations(REPO_ROOT, (db) => {
        const probe = JSON.parse(
          db.psql(`
${SEED}
${countAs(OWNER_B)}
${countAs(OWNER_A)}
do $$
declare
  denied boolean := false;
begin
  perform set_config('request.jwt.claim.sub', '${OWNER_B}', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', '${OWNER_B}', 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
  begin
    insert into public.comparison_history (owner_id, person_low, person_high)
    values ('${OWNER_A}', '${PERSON_LOW}', '${PERSON_HIGH}');
  exception when others then
    denied := true;
  end;
  reset role;
  insert into comparison_history_rls_probe (owner, n)
  values ('insert_denied', case when denied then 1 else 0 end);
end;
$$;
select jsonb_object_agg(owner, n) from comparison_history_rls_probe;
`)
        ) as Record<string, number>;
        expect(probe[OWNER_B], "user B must see zero of A's comparison_history rows").toBe(0);
        expect(probe[OWNER_A], "user A must see their own comparison_history row").toBe(1);
        expect(probe.insert_denied, "user B must not insert a row owned by A").toBe(1);
      });
    },
    120_000
  );
});
