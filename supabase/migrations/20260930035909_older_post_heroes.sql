-- Older post heroes: local illustrated PNGs and their alt text.
-- Idempotent. A second run matches no rows.
-- Sets only hero_image_url and hero_image_alt.
-- Does not change slug, canonical path, published_at, or any other column.
-- Alt text is copied exactly from older-heroes-manifest.json.

update public.posts
set
  hero_image_url = '/blog/what-a-chart-cannot-tell-you/hero.png',
  hero_image_alt = $alt_what_a_chart_cannot_tell_you$Decorative illustration: a chart wheel drawn in thin lavender lines with four gold points and an empty dashed circle at its center, suggesting what a chart leaves unknown.$alt_what_a_chart_cannot_tell_you$
where slug = 'what-a-chart-cannot-tell-you'
  and (
    hero_image_url is distinct from '/blog/what-a-chart-cannot-tell-you/hero.png'
    or hero_image_alt is distinct from $alt_what_a_chart_cannot_tell_you$Decorative illustration: a chart wheel drawn in thin lavender lines with four gold points and an empty dashed circle at its center, suggesting what a chart leaves unknown.$alt_what_a_chart_cannot_tell_you$
  );

update public.posts
set
  hero_image_url = '/blog/colleague-you-cannot-read/hero.png',
  hero_image_alt = $alt_colleague_you_cannot_read$Decorative illustration: a teal point on the left and a lavender point on the right, each with faint lines reaching toward a soft glowing barrier between them that they do not cross.$alt_colleague_you_cannot_read$
where slug = 'colleague-you-cannot-read'
  and (
    hero_image_url is distinct from '/blog/colleague-you-cannot-read/hero.png'
    or hero_image_alt is distinct from $alt_colleague_you_cannot_read$Decorative illustration: a teal point on the left and a lavender point on the right, each with faint lines reaching toward a soft glowing barrier between them that they do not cross.$alt_colleague_you_cannot_read$
  );

update public.posts
set
  hero_image_url = '/blog/sun-sign-not-personality/hero.png',
  hero_image_alt = $alt_sun_sign_not_personality$Decorative illustration: a small gold sun at the center of several concentric rings with many colored points orbiting around it, showing the Sun as one part of a larger chart.$alt_sun_sign_not_personality$
where slug = 'sun-sign-not-personality'
  and (
    hero_image_url is distinct from '/blog/sun-sign-not-personality/hero.png'
    or hero_image_alt is distinct from $alt_sun_sign_not_personality$Decorative illustration: a small gold sun at the center of several concentric rings with many colored points orbiting around it, showing the Sun as one part of a larger chart.$alt_sun_sign_not_personality$
  );

update public.posts
set
  hero_image_url = '/blog/reading-chart-of-someone-who-died/hero.png',
  hero_image_alt = $alt_reading_chart_of_someone_who_died$Decorative illustration: a single soft gold star at the center of faint rings, with small white stars scattered around it and thin gold lines reaching out, a quiet memorial image.$alt_reading_chart_of_someone_who_died$
where slug = 'reading-chart-of-someone-who-died'
  and (
    hero_image_url is distinct from '/blog/reading-chart-of-someone-who-died/hero.png'
    or hero_image_alt is distinct from $alt_reading_chart_of_someone_who_died$Decorative illustration: a single soft gold star at the center of faint rings, with small white stars scattered around it and thin gold lines reaching out, a quiet memorial image.$alt_reading_chart_of_someone_who_died$
  );

update public.posts
set
  hero_image_url = '/blog/compatibility-scores-wrong-question/hero.png',
  hero_image_alt = $alt_compatibility_scores_wrong_question$Decorative illustration: a dial-shaped arc partly filled in coral, with a teal point and a gold point beside it joined by a dotted line, suggesting two people who cannot be reduced to one score.$alt_compatibility_scores_wrong_question$
where slug = 'compatibility-scores-wrong-question'
  and (
    hero_image_url is distinct from '/blog/compatibility-scores-wrong-question/hero.png'
    or hero_image_alt is distinct from $alt_compatibility_scores_wrong_question$Decorative illustration: a dial-shaped arc partly filled in coral, with a teal point and a gold point beside it joined by a dotted line, suggesting two people who cannot be reduced to one score.$alt_compatibility_scores_wrong_question$
  );

update public.posts
set
  hero_image_url = '/blog/moon-square-saturn-parent-child/hero.png',
  hero_image_alt = $alt_moon_square_saturn_parent_child$Decorative illustration: a gold crescent moon and a coral ringed planet placed a right angle apart on a wheel, joined by lines through the center to show a square aspect.$alt_moon_square_saturn_parent_child$
where slug = 'moon-square-saturn-parent-child'
  and (
    hero_image_url is distinct from '/blog/moon-square-saturn-parent-child/hero.png'
    or hero_image_alt is distinct from $alt_moon_square_saturn_parent_child$Decorative illustration: a gold crescent moon and a coral ringed planet placed a right angle apart on a wheel, joined by lines through the center to show a square aspect.$alt_moon_square_saturn_parent_child$
  );

update public.posts
set
  hero_image_url = '/blog/nobody-has-your-grandmother/hero.png',
  hero_image_alt = $alt_nobody_has_your_grandmother$Decorative illustration: a bright gold star at the top with lines branching down to five colored stars and then to smaller white stars, like a family tree drawn as a constellation.$alt_nobody_has_your_grandmother$
where slug = 'nobody-has-your-grandmother'
  and (
    hero_image_url is distinct from '/blog/nobody-has-your-grandmother/hero.png'
    or hero_image_alt is distinct from $alt_nobody_has_your_grandmother$Decorative illustration: a bright gold star at the top with lines branching down to five colored stars and then to smaller white stars, like a family tree drawn as a constellation.$alt_nobody_has_your_grandmother$
  );

update public.posts
set
  hero_image_url = '/blog/synastry-chart-meaning/hero.png',
  hero_image_alt = $alt_synastry_chart_meaning$Decorative illustration: two overlapping sets of concentric rings, one teal and one lavender, with gold lines connecting points between them to show contacts between two charts.$alt_synastry_chart_meaning$
where slug = 'synastry-chart-meaning'
  and (
    hero_image_url is distinct from '/blog/synastry-chart-meaning/hero.png'
    or hero_image_alt is distinct from $alt_synastry_chart_meaning$Decorative illustration: two overlapping sets of concentric rings, one teal and one lavender, with gold lines connecting points between them to show contacts between two charts.$alt_synastry_chart_meaning$
  );

update public.posts
set
  hero_image_url = '/blog/synastry-aspects-explained/hero.png',
  hero_image_alt = $alt_synastry_aspects_explained$Decorative illustration: six white points around a ring joined by lines in lavender, teal and gold, forming the triangles and hexagon patterns that aspects make.$alt_synastry_aspects_explained$
where slug = 'synastry-aspects-explained'
  and (
    hero_image_url is distinct from '/blog/synastry-aspects-explained/hero.png'
    or hero_image_alt is distinct from $alt_synastry_aspects_explained$Decorative illustration: six white points around a ring joined by lines in lavender, teal and gold, forming the triangles and hexagon patterns that aspects make.$alt_synastry_aspects_explained$
  );

update public.posts
set
  hero_image_url = '/blog/mothers-moon-sign-apology/hero.png',
  hero_image_alt = $alt_mothers_moon_sign_apology$Decorative illustration: a large gold crescent moon with a soft glow, and a smaller coral star nearby joined by a dotted line, on a starry background with faint rings.$alt_mothers_moon_sign_apology$
where slug = 'mothers-moon-sign-apology'
  and (
    hero_image_url is distinct from '/blog/mothers-moon-sign-apology/hero.png'
    or hero_image_alt is distinct from $alt_mothers_moon_sign_apology$Decorative illustration: a large gold crescent moon with a soft glow, and a smaller coral star nearby joined by a dotted line, on a starry background with faint rings.$alt_mothers_moon_sign_apology$
  );
