-- F12 Phase 7: stagger published_at across the past eight weeks so the
-- ten live posts do not look batch-published to search engines.
-- UTC noon avoids timezone display edge cases.
-- ENGINEERING.md §2: new file, never an edit to an applied migration.
-- Does not touch title, dek, category, status, or body.

update public.posts
set published_at = timestamptz '2026-07-21 12:00:00+00'
where slug = 'mothers-moon-sign-apology'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-07-28 12:00:00+00'
where slug = 'colleague-you-cannot-read'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-08-04 12:00:00+00'
where slug = 'synastry-chart-meaning'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-08-11 12:00:00+00'
where slug = 'moon-square-saturn-parent-child'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-08-18 12:00:00+00'
where slug = 'nobody-has-your-grandmother'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-08-25 12:00:00+00'
where slug = 'what-a-chart-cannot-tell-you'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-09-01 12:00:00+00'
where slug = 'sun-sign-not-personality'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-09-07 12:00:00+00'
where slug = 'synastry-aspects-explained'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-09-10 12:00:00+00'
where slug = 'reading-chart-of-someone-who-died'
  and status = 'published';

update public.posts
set published_at = timestamptz '2026-09-14 12:00:00+00'
where slug = 'compatibility-scores-wrong-question'
  and status = 'published';
