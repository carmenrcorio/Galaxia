-- FOUNDER-REVIEW: drop "Predict" from the synastry-aspects post title.
-- Applied migrations are never edited (ENGINEERING.md §2); this UPDATE is a new
-- file. Do not apply by hand in the dashboard. Live verification, if any,
-- goes behind assertDisposableDbTarget against a disposable project, never
-- eigfvribtntbxyjutsma.
--
-- The WHERE title = ... clause is idempotent: a row already rewritten, or
-- a founder-edited title, is left alone.

update public.posts
set title = '7 Synastry Aspects That Reveal How Relationships Feel'
where slug = 'synastry-aspects-explained'
  and title = '7 Synastry Aspects That Predict How Relationships Feel';
