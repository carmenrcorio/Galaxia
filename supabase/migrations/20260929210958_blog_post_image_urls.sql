-- Point the nine SEO posts at their public PNGs.
-- Alt, caption, long description, and figure placement are copied from
-- image-manifest.json. Do not rewrite them. Apply this after the PNG
-- files in apps/web/public/blog/ are deployed, so hero URLs do not 404.
-- Idempotent UPDATE by slug.

update public.posts
set
  hero_image_url = '/blog/uranus-retrograde-gemini-2026-relationships/hero.png',
  hero_image_alt = $heroAlt_uranus_retrograde_gemini_2026_relationships$Decorative illustration: concentric rings on a dark night sky with five linked stars, and a gold curved arrow running backward along one ring to a glowing teal point, suggesting a planet in retrograde.$heroAlt_uranus_retrograde_gemini_2026_relationships$,
  figure_image_url = '/blog/uranus-retrograde-gemini-2026-relationships/figure.png',
  figure_image_alt = $figAlt_uranus_retrograde_gemini_2026_relationships$Diagram of two birth chart wheels, Chart A and Chart B, with the Gemini slice highlighted and a Uranus marker beside each.$figAlt_uranus_retrograde_gemini_2026_relationships$,
  figure_caption = $caption_uranus_retrograde_gemini_2026_relationships$The same Uranus transit touches Chart A but barely touches Chart B.$caption_uranus_retrograde_gemini_2026_relationships$,
  figure_long_description = $longDesc_uranus_retrograde_gemini_2026_relationships$Two circular chart wheels are shown side by side under the title 'A transit lands on a chart, not a sign.' In Chart A, a personal planet sits inside the highlighted Gemini slice and a gold line connects it to a Uranus marker: contact. In Chart B, no planet sits in Gemini, so no line connects to Uranus: little contact. A footnote reads: 'Highlighted slice = Gemini. Two people with the same sun sign can differ.'$longDesc_uranus_retrograde_gemini_2026_relationships$,
  figure_after_heading = $heading_uranus_retrograde_gemini_2026_relationships$Why "for your sign" is the wrong unit$heading_uranus_retrograde_gemini_2026_relationships$,
  updated_at = now()
where slug = 'uranus-retrograde-gemini-2026-relationships';

update public.posts
set
  hero_image_url = '/blog/neptune-in-synastry-meaning/hero.png',
  hero_image_alt = $heroAlt_neptune_in_synastry_meaning$Decorative illustration: two soft, overlapping glowing circles, one teal and one lavender, each with a thin ring and a small center point, set on a starry dark background.$heroAlt_neptune_in_synastry_meaning$,
  figure_image_url = '/blog/neptune-in-synastry-meaning/figure.png',
  figure_image_alt = $figAlt_neptune_in_synastry_meaning$Diagram of a solid gold circle labeled 'The person as they are' inside a larger dashed teal circle labeled 'The picture you hold', beside a box on how to read the gap.$figAlt_neptune_in_synastry_meaning$,
  figure_caption = $caption_neptune_in_synastry_meaning$Neptune contacts describe the gap between a person and the picture we hold of them.$caption_neptune_in_synastry_meaning$,
  figure_long_description = $longDesc_neptune_in_synastry_meaning$Title: 'Neptune contact: the gap between person and picture.' A solid gold circle labeled 'The person as they are' sits inside a larger, softer dashed teal circle labeled 'The picture you hold.' A box titled 'Two ways to read the gap' says: Softer: warmth, compassion, generosity toward them. Harder: idealization, unseen flaws, mixed signals. A final line gives a test: can you name their flaws specifically, without softening?$longDesc_neptune_in_synastry_meaning$,
  figure_after_heading = $heading_neptune_in_synastry_meaning$The mechanism: projection, not magic$heading_neptune_in_synastry_meaning$,
  updated_at = now()
where slug = 'neptune-in-synastry-meaning';

update public.posts
set
  hero_image_url = '/blog/venus-retrograde-2026-relationships/hero.png',
  hero_image_alt = $heroAlt_venus_retrograde_2026_relationships$Decorative illustration: a glowing gold planet above a looping gold path that curves back on itself around a coral point, over faint concentric rings and stars, suggesting Venus in retrograde.$heroAlt_venus_retrograde_2026_relationships$,
  figure_image_url = '/blog/venus-retrograde-2026-relationships/figure.png',
  figure_image_alt = $figAlt_venus_retrograde_2026_relationships$Timeline bar from October 3 to November 13, 2026, moving from Scorpio to Libra, with three phase boxes below.$figAlt_venus_retrograde_2026_relationships$,
  figure_caption = $caption_venus_retrograde_2026_relationships$Venus retrogrades for 41 days, from Scorpio back into Libra.$caption_venus_retrograde_2026_relationships$,
  figure_long_description = $longDesc_venus_retrograde_2026_relationships$Title: 'Venus retrograde 2026: 41 days, October 3 to November 13.' A horizontal bar runs from 'Oct 3: turns retrograde, begins in Scorpio' through 'moves back into Libra' to 'Nov 13: turns direct, ends in Libra.' Three boxes follow. Weeks 1-2: notice what is going unspoken. Weeks 3-5: look at fairness, who does what. Final week: bring one adjustment to your partner. Footer: Reviewing is good. Deciding in haste is not.$longDesc_venus_retrograde_2026_relationships$,
  figure_after_heading = $heading_venus_retrograde_2026_relationships$A gentle 41-day approach$heading_venus_retrograde_2026_relationships$,
  updated_at = now()
where slug = 'venus-retrograde-2026-relationships';

update public.posts
set
  hero_image_url = '/blog/how-people-used-astrology-what-they-got-right-and-wrong/hero.png',
  hero_image_alt = $heroAlt_how_people_used_astrology_what_they_got_right_and_wrong$Decorative illustration: an astrolabe-style dial with a gold outer ring of tick marks, several inner rings, thin lines and glowing stars on a dark background.$heroAlt_how_people_used_astrology_what_they_got_right_and_wrong$,
  figure_image_url = '/blog/how-people-used-astrology-what-they-got-right-and-wrong/figure.png',
  figure_image_alt = $figAlt_how_people_used_astrology_what_they_got_right_and_wrong$Timeline of astrology milestones above two boxes, 'What held up' and 'What did not'.$figAlt_how_people_used_astrology_what_they_got_right_and_wrong$,
  figure_caption = $caption_how_people_used_astrology_what_they_got_right_and_wrong$Astrology's record: real observation and calendars, but causal claims that did not hold up.$caption_how_people_used_astrology_what_they_got_right_and_wrong$,
  figure_long_description = $longDesc_how_people_used_astrology_what_they_got_right_and_wrong$Timeline titled 'Astrology through time', with milestones: earliest, state omens; 5th century BCE, personal horoscopes; 2nd century CE, Ptolemy; 1524, a flood forecast that did not come true; 1781 to 1930, outer planets discovered; 1985, a blind test published in Nature. Below, 'What held up': careful sky records and real cycles, eclipse cycles and the calendar, geometry and instrument-making, the Moon linked to tides. 'What did not': planets causing events or character, an Earth-centered universe, medical timing by the stars, confident public predictions.$longDesc_how_people_used_astrology_what_they_got_right_and_wrong$,
  figure_after_heading = $heading_how_people_used_astrology_what_they_got_right_and_wrong$A short history of how it was used$heading_how_people_used_astrology_what_they_got_right_and_wrong$,
  updated_at = now()
where slug = 'how-people-used-astrology-what-they-got-right-and-wrong';

update public.posts
set
  hero_image_url = '/blog/synastry-vs-composite-chart/hero.png',
  hero_image_alt = $heroAlt_synastry_vs_composite_chart$Decorative illustration: two overlapping outlined circles, one teal and one lavender, with a smaller gold circle at the midpoint between them and a dotted line joining their centers.$heroAlt_synastry_vs_composite_chart$,
  figure_image_url = '/blog/synastry-vs-composite-chart/figure.png',
  figure_image_alt = $figAlt_synastry_vs_composite_chart$Diagram comparing synastry, two circles A and B linked by a line, with composite, A and B blending into one circle labeled A + B.$figAlt_synastry_vs_composite_chart$,
  figure_caption = $caption_synastry_vs_composite_chart$Synastry compares two whole charts; a composite blends them into one.$caption_synastry_vs_composite_chart$,
  figure_long_description = $longDesc_synastry_vs_composite_chart$Title: 'Synastry vs. composite.' Synastry: circles A and B joined by a line labeled compare; both charts stay whole and it shows who affects whom. Composite: circles A and B feed through midpoints into one circle labeled A + B; it is one blended chart that shows the pair as a unit.$longDesc_synastry_vs_composite_chart$,
  figure_after_heading = $heading_synastry_vs_composite_chart$Composite: the relationship as its own entity$heading_synastry_vs_composite_chart$,
  updated_at = now()
where slug = 'synastry-vs-composite-chart';

update public.posts
set
  hero_image_url = '/blog/moon-sign-in-relationships/hero.png',
  hero_image_alt = $heroAlt_moon_sign_in_relationships$Decorative illustration: a row of five gold moon phases from crescent to dark to crescent across a starry sky with faint large rings behind.$heroAlt_moon_sign_in_relationships$,
  figure_image_url = '/blog/moon-sign-in-relationships/figure.png',
  figure_image_alt = $figAlt_moon_sign_in_relationships$Four boxes for Fire, Earth, Air and Water Moons, each listing signs and what that element tends to need.$figAlt_moon_sign_in_relationships$,
  figure_caption = $caption_moon_sign_in_relationships$What each Moon element tends to need when things get hard.$caption_moon_sign_in_relationships$,
  figure_long_description = $longDesc_moon_sign_in_relationships$Title: 'Moon sign by element.' Fire (Aries, Leo, Sagittarius): express it and be acknowledged. Earth (Taurus, Virgo, Capricorn): stability and practical care. Air (Gemini, Libra, Aquarius): talk it through to settle. Water (Cancer, Scorpio, Pisces): closeness, reassurance, and time to recover. Note: these are tendencies, not rules; the rest of the chart shapes each Moon.$longDesc_moon_sign_in_relationships$,
  figure_after_heading = $heading_moon_sign_in_relationships$A quick tour by element$heading_moon_sign_in_relationships$,
  updated_at = now()
where slug = 'moon-sign-in-relationships';

update public.posts
set
  hero_image_url = '/blog/whole-sign-houses-explained/hero.png',
  hero_image_alt = $heroAlt_whole_sign_houses_explained$Decorative illustration: a twelve-spoke chart wheel with a gold outer ring and a bright gold line from the center to a glowing point at the left edge, marking the Ascendant.$heroAlt_whole_sign_houses_explained$,
  figure_image_url = '/blog/whole-sign-houses-explained/figure.png',
  figure_image_alt = $figAlt_whole_sign_houses_explained$Chart wheel showing twelve Whole Sign houses starting with Virgo as house 1, with an explanation box.$figAlt_whole_sign_houses_explained$,
  figure_caption = $caption_whole_sign_houses_explained$In Whole Sign houses, the Ascendant's sign is the first house, and each following sign is the next house.$caption_whole_sign_houses_explained$,
  figure_long_description = $longDesc_whole_sign_houses_explained$Title: 'Whole Sign houses. Ascendant at 17 degrees Virgo: all of Virgo is house 1.' A wheel lists houses counterclockwise from the Ascendant: Virgo 1, Libra 2, Scorpio 3, Sagittarius 4, Capricorn 5, Aquarius 6, Pisces 7, Aries 8, Taurus 9, Gemini 10, Cancer 11, Leo 12. A box explains: each house is one whole sign; the first house is the sign of the Ascendant, then signs follow in order. Other systems split houses by time, so a house can start mid-sign and a planet can land in a different house.$longDesc_whole_sign_houses_explained$,
  figure_after_heading = $heading_whole_sign_houses_explained$How Whole Sign houses work$heading_whole_sign_houses_explained$,
  updated_at = now()
where slug = 'whole-sign-houses-explained';

update public.posts
set
  hero_image_url = '/blog/mercury-retrograde-relationships-2026/hero.png',
  hero_image_alt = $heroAlt_mercury_retrograde_relationships_2026$Decorative illustration: a looping coral path curving back on itself around a glowing teal point, inside faint rings with small stars, suggesting Mercury in retrograde.$heroAlt_mercury_retrograde_relationships_2026$,
  figure_image_url = '/blog/mercury-retrograde-relationships-2026/figure.png',
  figure_image_alt = $figAlt_mercury_retrograde_relationships_2026$Timeline bar from October 24 to November 13 above five numbered communication habits.$figAlt_mercury_retrograde_relationships_2026$,
  figure_caption = $caption_mercury_retrograde_relationships_2026$Five habits for the Mercury retrograde window, October 24 to November 13.$caption_mercury_retrograde_relationships_2026$,
  figure_long_description = $longDesc_mercury_retrograde_relationships_2026$Title: 'Mercury retrograde: Oct 24 to Nov 13, in Scorpio the whole time.' Five habits: 1 Say the thing twice. 2 Ask before assuming intent. 3 Draft it, wait, then send. 4 Return to old talks calmly. 5 Save big decisions for after Nov 13.$longDesc_mercury_retrograde_relationships_2026$,
  figure_after_heading = $heading_mercury_retrograde_relationships_2026$Practical habits for the window$heading_mercury_retrograde_relationships_2026$,
  updated_at = now()
where slug = 'mercury-retrograde-relationships-2026';

update public.posts
set
  hero_image_url = '/blog/chart-without-birth-time/hero.png',
  hero_image_alt = $heroAlt_chart_without_birth_time$Decorative illustration: a chart wheel whose left half is drawn in solid lines with gold points and whose right half is faded and dashed with hollow markers, showing what is known and unknown.$heroAlt_chart_without_birth_time$,
  figure_image_url = '/blog/chart-without-birth-time/figure.png',
  figure_image_alt = $figAlt_chart_without_birth_time$Two boxes: 'Stays reliable' and 'Needs a birth time', listing chart elements in each group.$figAlt_chart_without_birth_time$,
  figure_caption = $caption_chart_without_birth_time$Without a birth time, slower planets stay reliable; the Ascendant and houses do not.$caption_chart_without_birth_time$,
  figure_long_description = $longDesc_chart_without_birth_time$Title: 'Chart without a birth time.' Stays reliable: sun sign (unless born near a change), Mercury, Venus and Mars (mostly), Jupiter, Saturn and the outer planets, most aspects between planets. Needs a birth time: Ascendant (rising sign), houses, Midheaven, and the Moon if it changes sign that day. Tip: check a birth certificate, hospital records, or a relative first.$longDesc_chart_without_birth_time$,
  figure_after_heading = $heading_chart_without_birth_time$What stays reliable$heading_chart_without_birth_time$,
  updated_at = now()
where slug = 'chart-without-birth-time';

