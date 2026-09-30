-- Blog polish round 3.
-- Idempotent. Does not change slugs, published_at, or updated_at.
-- A second run matches no rows, so stored dates stay put.
--
-- Byline: the template shows "By Galaxia". Store the same value.
-- Grandmother: about_galaxia was the "About Galaxia" card tag. Category is
-- already guides, which the index chip labels "Learn". Clearing the flag
-- shows that chip. No new category.

update public.posts
set byline = 'By Galaxia'
where status = 'published'
  and byline is distinct from 'By Galaxia';

update public.posts
set about_galaxia = false
where slug = 'nobody-has-your-grandmother'
  and about_galaxia is distinct from false;

-- The family-chart closer replaces these two paragraphs.
update public.posts
set body = replace(
  body,
  $moon_square_closers$You can see this aspect in a full [synastry chart](/synastry-chart-meaning), which maps the contacts between two birth charts and shows you where you connect and where you catch. If this dynamic feels familiar, looking at both charts can be clarifying. Galaxia computes the aspect from astronomical positions. It does not decide what the two of you should do with it. Vela can walk the same computed contact in plain language. It will not invent a softer story than the chart contains.

The [free comparison](/chart/compare) lets you run a synastry between any two people, including family members. You can see where you align and where it was always going to be harder.$moon_square_closers$,
  ''
)
where slug = 'moon-square-saturn-parent-child'
  and body like '%Vela can walk the same computed contact%';

-- Standalone end-of-post CTAs. The template now supplies one inline link
-- and one closing button, so these extra pitches come out.
update public.posts
set body = replace(
  body,
  $venus_closer$

## Look at your actual charts

Add yourself and your partner to Galaxia and see where Scorpio and Libra fall in each chart, and which planets Venus will be touching as it moves backward. Then you will know whether this retrograde is a footnote or a real conversation.

[See how Venus retrograde touches your chart and theirs](/chart)$venus_closer$,
  ''
)
where slug = 'venus-retrograde-2026-relationships'
  and body like '%See how Venus retrograde touches your chart and theirs%';

update public.posts
set body = replace(body, E'\n\n[See how this transit touches your chart and theirs](/chart)', '')
where slug = 'uranus-retrograde-gemini-2026-relationships'
  and body like '%See how this transit touches your chart and theirs%';

update public.posts
set body = replace(
  body,
  $synastry_closer$
Compare any two people, see where you flow and where you catch, and get a specific thing to do about each. [Try a free synastry chart →](/chart/compare)$synastry_closer$,
  ''
)
where slug = 'synastry-chart-meaning'
  and body like '%Try a free synastry chart%';

update public.posts
set body = replace(
  body,
  E'\n\nReady to see your own chart? [Add your birth details](/chart) and look at how your houses fall.',
  ''
)
where slug = 'whole-sign-houses-explained'
  and body like '%Ready to see your own chart?%';

update public.posts
set body = replace(body, E'\n\n14 days free at galaxiamea.com', '')
where status = 'published'
  and body like '%14 days free at galaxiamea.com%';
