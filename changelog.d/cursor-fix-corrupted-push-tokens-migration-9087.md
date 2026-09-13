## Repair the corrupted push_tokens migration file (branch `cursor/fix-corrupted-push-tokens-migration-9087`), 2026-09-13

**Trigger**: found while reading the live `purge_own_account_data()` definition
out of production for the constellation-connect schema work. Diffing the live
body against the committed history showed `20260909040000_push_tokens.sql`
disagreeing with production on 11 lines, and the disagreement turned out to be
editor markup, not SQL.

`[FIXED]` **`supabase/migrations/20260909040000_push_tokens.sql` was committed
with editor line-number gutter text pasted into the file body** (`    10|`,
`    20|`, and so on at every tenth line, 11 lines in all). That made the
committed file **invalid SQL**: applying it fails immediately with
`syntax error at or near "10"` on the first affected line, which sits inside
the `create table push_tokens` column list. Removing the 11 prefixes is the
entire change, and the result is byte-identical to the file with those prefixes
stripped. Nothing else in the file moved.

**This is a transcription repair, not an edit to applied SQL.** `ENGINEERING.md`
§2 forbids changing a migration once applied, and that rule is intact here: the
text production actually ran was the clean text, so this brings the file back
into agreement with the database rather than changing what was applied. Verified
object by object against project `eigfvribtntbxyjutsma`: the
`push_tokens_platform_check` constraint, the `push_tokens owner all` policy, the
`relational_transits.push_sent_at` column, the `push_tokens` table comment, the
`push_tokens_owner_idx` index, and the full `purge_own_account_data()` body all
match what the repaired file produces. The repaired history also replays end to
end into a local PostgreSQL 16 database with no preprocessing, which the
committed version could not do.

`[BROKEN]` **Why this sat unnoticed for four days.** Nothing in the repo applies
`supabase/migrations/**`, which is deliberate (§16: applying SQL to production
is a human decision). Migration Ledger Parity compares migration *names* to the
production ledger, not bodies, so a file whose contents are unusable still
passes it. The only automated reader of this particular file,
`apps/web/lib/rls-indexes-purge-migrations.test.ts`, worked around the markup
with a stripping helper rather than failing on it. So the file was broken in
three checks' blind spot at once.

`[ADDED]` **`apps/web/lib/migration-files-well-formed.test.ts`** closes that
blind spot: every `supabase/migrations/*.sql` file is asserted to be non-empty
and free of line-number gutter text, plus targeted assertions that the four
statements the prefixes had broken in this file read correctly. The strippers in
`rls-indexes-purge-migrations.test.ts` are left alone as harmless backstops.

`[OPEN]` Ledger parity is unaffected by this change (the name is unchanged and
already in the production ledger), so no re-apply is needed or wanted. The four
migrations from PR #205 that were committed but never applied are a separate
matter, tracked in `changelog.d/cursor-constellation-connect-schema-9087.md`.
