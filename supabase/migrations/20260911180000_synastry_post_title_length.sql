-- FOUNDER-REVIEW: shortened for the 60-character title limit. Drops
-- "Actually" from the original seeded title so the <title> (and the
-- post h1, which reads the same column) fits crawler limits. Applied
-- migrations are never edited (ENGINEERING.md §2); this UPDATE is a new
-- file. Do not apply by hand in the dashboard. Live verification, if any,
-- goes behind assertDisposableDbTarget against a disposable project, never
-- eigfvribtntbxyjutsma.
--
-- The WHERE title = ... clause is idempotent: a row already rewritten, or
-- a founder-edited title, is left alone.

update public.posts
set title = 'What a Synastry Chart Tells You About Your Relationship'
where slug = 'synastry-chart-meaning'
  and title = 'What a Synastry Chart Actually Tells You About Your Relationship';
