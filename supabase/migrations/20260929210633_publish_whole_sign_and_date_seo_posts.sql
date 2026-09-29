-- Publish whole-sign-houses-explained as written, and date the nine SEO
-- posts to 2026-09-29. The earlier migration stored later published_at
-- values. Those dates are what the byline and Article datePublished show.
-- status was already published, so the future dates were already public.
--
-- Category stays guides. posts.category only allows guides and debunked.
-- There is no meta_title column. title is the H1 and the document title.
-- dek is the meta description.
--
-- Does not set hero or figure fields. Image URLs land in the following
-- migration so this file can ship before the PNG files are on the site.
-- Idempotent. Re-running does not clear hero_image_url.

update public.posts
set
  published_at = timestamptz '2026-09-29 12:00:00+00',
  updated_at = now()
where slug in (
  'uranus-retrograde-gemini-2026-relationships',
  'neptune-in-synastry-meaning',
  'venus-retrograde-2026-relationships',
  'how-people-used-astrology-what-they-got-right-and-wrong',
  'synastry-vs-composite-chart',
  'moon-sign-in-relationships',
  'mercury-retrograde-relationships-2026',
  'chart-without-birth-time'
);

-- FOUNDER-REVIEW: authored whole-sign title, dek, body.
insert into public.posts (
  slug,
  title,
  dek,
  category,
  body,
  status,
  read_time_minutes,
  byline,
  published_at
)
values (
  'whole-sign-houses-explained',
  $title_ws$Whole Sign Houses Explained (and Why Your Chart Might Look Different Elsewhere)$title_ws$,
  $dek_ws$Why does your chart look different on different sites? Often it is the house system. Here is how Whole Sign houses work and why we use them.$dek_ws$,
  'guides',
  $body_ws$If you have ever put your birth details into two different astrology sites and gotten charts that did not quite match, you are not imagining it. One common reason is the **house system**, the method used to divide the chart into twelve sections. Galaxia uses Whole Sign houses. This post explains what that means and why it may explain the difference you noticed.

## What houses are

A birth chart has three main layers. **Planets** are what is happening. **Signs** describe how it is happening. **Houses** describe *where in life* it happens: relationships, work, home, money, and so on.

There are twelve houses, each tied to an area of life. The house system determines where one house ends and the next begins.

## The Ascendant matters most

The starting point for the houses is the Ascendant, the sign rising on the eastern horizon at the moment of birth. This is why an accurate birth time matters for houses: the Ascendant changes sign roughly every two hours.

## How Whole Sign houses work

Whole Sign is the simplest system. The **entire sign** containing the Ascendant becomes the first house. The next sign becomes the second house, and so on around the chart.

For example, if your Ascendant is at 17° Virgo, all of Virgo is your first house. All of Libra is your second house. All of Scorpio is your third.

Every house has exactly one sign, and every sign has exactly one house. That tidy structure makes the chart easy to read.

## How other systems differ

Systems such as **Placidus**, popular in modern Western astrology, divide the houses by calculating time-based divisions of the sky. Houses come out in unequal sizes, and a house can start in the middle of a sign. In Placidus, that same 17° Virgo Ascendant would have the first house begin at 17° Virgo, not at the start of the sign.

Because the boundaries move, a planet can land in a different house depending on the system. Two people looking at the same birth data can therefore talk about different houses.

## Why the differences matter

Say you have a planet at 5° Libra with a 17° Virgo Ascendant. In Whole Sign, it is in the second house (Libra as a whole). In Placidus, the second house starts partway through Libra, so the same planet could still sit in the first house.

The planet and its sign do not change. The area of life it is assigned to can.

## Which system is "right"?

Astrologers disagree, and no system has been shown to be more accurate in any measurable way. Whole Sign is the oldest known system, used in Hellenistic astrology, and it has seen a revival among modern practitioners. Placidus remains widely used. Neither is objectively correct.

## Why Galaxia uses Whole Sign

Galaxia calculates charts with Whole Sign houses. It has a few practical strengths:

- **It is consistent.** Every house is one sign, so a small error in birth time is less likely to push a planet into a different house, except when the Ascendant itself changes signs.
- **It is transparent.** The rule fits in one sentence, so you can check the result yourself.
- **It holds up at high latitudes,** where some time-based systems break down or distort.

Those are reasons the system is appealing, not proof that it is more accurate. If you prefer another system, the planets and signs in your chart will still match.

## What to do if your chart looks different

If a chart from another source does not match ours, check the house system first. The planets and signs should be identical. If those differ, check the birth time and location.

If you do not know your exact birth time, houses will be less reliable. You can still learn a lot from signs and aspects. We cover that in our guide to [what you can learn from a chart without a birth time](/chart-without-birth-time).

Ready to see your own chart? [Add your birth details](/chart) and look at how your houses fall.
$body_ws$,
  'published',
  3,
  'The Galaxia Team',
  timestamptz '2026-09-29 12:00:00+00'
)
on conflict (slug) do update set
  title = excluded.title,
  dek = excluded.dek,
  category = excluded.category,
  body = excluded.body,
  status = excluded.status,
  read_time_minutes = excluded.read_time_minutes,
  byline = excluded.byline,
  published_at = excluded.published_at,
  updated_at = now();
