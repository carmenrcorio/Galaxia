-- F12 Phase 6: first-mention internal links in published post bodies.
-- Link text is existing copy (original casing preserved). Applied term map:
--   synastry aspects  -> /synastry-aspects-explained
--   synastry chart    -> /synastry-chart-meaning
--   moon square saturn -> /moon-square-saturn-parent-child
--   compatibility scores -> /compatibility-scores-wrong-question
--   sun sign          -> /sun-sign-not-personality
--   moon sign         -> /mothers-moon-sign-apology
--   synastry          -> /synastry-chart-meaning
--
-- Each replace() needle is a unique first unlinked mention (verified
-- occurrence count = 1 on published bodies). Headings, existing
-- markdown links, and self-links are not in this set.
-- ENGINEERING.md §2: new file, never an edit to an applied migration.
-- FOUNDER-REVIEW: link targets confirmed; link text is existing body copy.

update public.posts
set
  body = replace(
    replace(
      body,
      E'\n\nSynastry is the practice of comparing two full natal charts.',
      E'\n\n[Synastry](/synastry-chart-meaning) is the practice of comparing two full natal charts.'
    ),
    'and a synastry chart does not decide a relationship.',
    'and a [synastry chart](/synastry-chart-meaning) does not decide a relationship.'
  ),
  updated_at = now()
where slug = 'compatibility-scores-wrong-question'
  and status = 'published';

update public.posts
set
  body = replace(
    replace(
      body,
      'hard aspects in synastry. Almost all',
      'hard aspects in [synastry](/synastry-chart-meaning). Almost all'
    ),
    'a full synastry chart, which maps',
    'a full [synastry chart](/synastry-chart-meaning), which maps'
  ),
  updated_at = now()
where slug = 'moon-square-saturn-parent-child'
  and status = 'published';

update public.posts
set
  body = replace(
    body,
    'it does real synastry: an actual biwheel',
    'it does real [synastry](/synastry-chart-meaning): an actual biwheel'
  ),
  updated_at = now()
where slug = 'nobody-has-your-grandmother'
  and status = 'published';

update public.posts
set
  body = replace(
    replace(
      body,
      'If the contact between you was Moon square Saturn, that architecture',
      'If the contact between you was [Moon square Saturn](/moon-square-saturn-parent-child), that architecture'
    ),
    'look at the synastry between your chart and a deceased person''s',
    'look at the [synastry](/synastry-chart-meaning) between your chart and a deceased person''s'
  ),
  updated_at = now()
where slug = 'reading-chart-of-someone-who-died'
  and status = 'published';

update public.posts
set
  body = replace(
    body,
    'That''s what **synastry** actually looks at',
    'That''s what **[synastry](/synastry-chart-meaning)** actually looks at'
  ),
  updated_at = now()
where slug = 'sun-sign-not-personality'
  and status = 'published';

update public.posts
set
  body = replace(
    replace(
      replace(
        body,
        'You finally pulled a synastry chart with someone',
        'You finally pulled a [synastry chart](/synastry-chart-meaning) with someone'
      ),
      'most explanations of synastry stop',
      'most explanations of [synastry](/synastry-chart-meaning) stop'
    ),
    'A Moon square Saturn sitting next to a warm Sun trine Sun',
    'A [Moon square Saturn](/moon-square-saturn-parent-child) sitting next to a warm Sun trine Sun'
  ),
  updated_at = now()
where slug = 'synastry-aspects-explained'
  and status = 'published';

update public.posts
set
  body = replace(
    replace(
      body,
      'A sun sign alone cannot even get you this far.',
      'A [sun sign](/sun-sign-not-personality) alone cannot even get you this far.'
    ),
    'turning them into types. Synastry is geometry',
    'turning them into types. [Synastry](/synastry-chart-meaning) is geometry'
  ),
  updated_at = now()
where slug = 'what-a-chart-cannot-tell-you'
  and status = 'published';
