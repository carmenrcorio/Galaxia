-- Phase 1: timely flags, and take the pricing line out of post bodies.
-- Does not change slug or published_at. datePublished in JSON-LD stays
-- the stored published_at. Null is_timely means evergreen: the site hides
-- the visible date.
-- Idempotent. replace() no-ops once the needle is gone. Re-running the
-- timely updates writes the same values.

alter table public.posts
  add column if not exists is_timely boolean,
  add column if not exists expires_at date;

comment on column public.posts.is_timely is
  'True shows a visible publish date. Null or false is evergreen.';

comment on column public.posts.expires_at is
  'After this date the Timely badge is omitted. The post stays published.';

update public.posts
set
  is_timely = true,
  expires_at = date '2026-11-14'
where slug in (
  'venus-retrograde-2026-relationships',
  'mercury-retrograde-relationships-2026'
);

update public.posts
set
  is_timely = true,
  expires_at = date '2027-02-09'
where slug = 'uranus-retrograde-gemini-2026-relationships';

-- FOUNDER-REVIEW: pricing clause removed. The following sentence keeps Vela
-- as its subject. "never charged per question" on the sun-sign post is the
-- same claim and comes out with these.

update public.posts
set
  body = replace(
    body,
    $old_colleague$Vela, Galaxia's guide, is included in the subscription and is never charged per message. It reads$old_colleague$,
    $new_colleague$Vela, Galaxia's guide, reads$new_colleague$
  ),
  updated_at = now()
where slug = 'colleague-you-cannot-read'
  and body like '%never charged per message%';

update public.posts
set
  body = replace(
    body,
    $old_moon$Vela, included in the subscription and never charged per message, can walk$old_moon$,
    $new_moon$Vela can walk$new_moon$
  ),
  updated_at = now()
where slug = 'moon-square-saturn-parent-child'
  and body like '%never charged per message%';

update public.posts
set
  body = replace(
    body,
    $old_limits$Vela, Galaxia's guide, is included in the subscription and never charged per message. It answers$old_limits$,
    $new_limits$Vela, Galaxia's guide, answers$new_limits$
  ),
  updated_at = now()
where slug = 'what-a-chart-cannot-tell-you'
  and body like '%never charged per message%';

update public.posts
set
  body = replace(
    body,
    $old_memorial$Vela is included in the subscription and never charged per message. Ask it about$old_memorial$,
    $new_memorial$Ask Vela about$new_memorial$
  ),
  updated_at = now()
where slug = 'reading-chart-of-someone-who-died'
  and body like '%never charged per message%';

update public.posts
set
  body = replace(
    body,
    $old_scores$Vela is included in the subscription and never charged per message; it can walk$old_scores$,
    $new_scores$Vela can walk$new_scores$
  ),
  updated_at = now()
where slug = 'compatibility-scores-wrong-question'
  and body like '%never charged per message%';

update public.posts
set
  body = replace(
    body,
    $old_sun$Ask [Vela](/meet-vela), the AI guide included in every subscription and never charged per question, about$old_sun$,
    $new_sun$Ask [Vela](/meet-vela) about$new_sun$
  ),
  updated_at = now()
where slug = 'sun-sign-not-personality'
  and body like '%never charged per question%';
