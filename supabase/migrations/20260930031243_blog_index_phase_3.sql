-- Blog index phase 3: card excerpts only.
-- Idempotent. A second run matches no rows, so updated_at stays put.
-- Does not change slug, canonical path, or published_at.
-- FOUNDER-REVIEW: the dek strings below are the new card excerpts.

update public.posts
set
  dek = $sun_dek$Sun-sign horoscopes leave out most of a birth chart. Here is what they miss, why compatibility tables lie, and what actually works.$sun_dek$,
  updated_at = now()
where slug = 'sun-sign-not-personality'
  and dek is distinct from $sun_dek$Sun-sign horoscopes leave out most of a birth chart. Here is what they miss, why compatibility tables lie, and what actually works.$sun_dek$;

update public.posts
set
  dek = $moon_dek$Your Moon sign describes how you process feelings and what helps you feel secure. Here is how to read it next to a partner's Moon in a birth chart.$moon_dek$,
  updated_at = now()
where slug = 'moon-sign-in-relationships'
  and dek is distinct from $moon_dek$Your Moon sign describes how you process feelings and what helps you feel secure. Here is how to read it next to a partner's Moon in a birth chart.$moon_dek$;

update public.posts
set
  dek = $syn_dek$Not a compatibility score. A synastry chart maps where two people flow easily and where they reliably catch, and what to do about each catch.$syn_dek$,
  updated_at = now()
where slug = 'synastry-chart-meaning'
  and dek is distinct from $syn_dek$Not a compatibility score. A synastry chart maps where two people flow easily and where they reliably catch, and what to do about each catch.$syn_dek$;

update public.posts
set
  dek = $merc_dek$Mercury retrogrades October 24 to November 13, 2026, in Scorpio. Instead of "don't sign contracts," see what it can mean for how you and your partner talk.$merc_dek$,
  updated_at = now()
where slug = 'mercury-retrograde-relationships-2026'
  and dek is distinct from $merc_dek$Mercury retrogrades October 24 to November 13, 2026, in Scorpio. Instead of "don't sign contracts," see what it can mean for how you and your partner talk.$merc_dek$;

update public.posts
set
  dek = $time_dek$Do not know your birth time? You can still learn a lot from a birth chart. Here is what stays reliable, what does not, and how to find your birth time.$time_dek$,
  updated_at = now()
where slug = 'chart-without-birth-time'
  and dek is distinct from $time_dek$Do not know your birth time? You can still learn a lot from a birth chart. Here is what stays reliable, what does not, and how to find your birth time.$time_dek$;
