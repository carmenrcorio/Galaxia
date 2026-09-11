-- FOUNDER-REVIEW: rewritten (no U+2014). Keeps the three internal links
-- from 20260909120000_synastry_post_internal_links.sql.
--
-- Applying that file verbatim restored 14 em dashes that
-- 20260911161000_posts_rewrite_em_dash.sql had already removed from this
-- row. This UPDATE is a new file (ENGINEERING.md §2: never edit an applied
-- migration). Sentence rewrites match the original purge: comma, colon,
-- parentheses, or two sentences. No hyphen substitution.
--
-- Do not apply by hand in the dashboard. Live verification, if any, of a
-- *future* edit goes behind assertDisposableDbTarget against a disposable
-- project. This apply was requested against eigfvribtntbxyjutsma to close
-- the restored-dash gap.
--
-- read_time_minutes is 6, not 7. The links file stored 7 because
-- computeReadTimeMinutes splits on whitespace, so each U+2014 counted as a
-- word (1363 → ceil(1363/225)=7). Removing the 14 dashes drops 14 phantom
-- tokens (1349 → ceil(1349/225)=6). That is the real estimate, not a
-- shorter article.

update public.posts
set
  body = $POST_BODY$Most writing about synastry is aimed at someone standing at the beginning of something, trying to decide whether to walk in. Score out of ten. Green flags, red flags, verdict.

That is almost never who is reading.

The person searching this is usually eight months or eleven years into something. They are not leaving. They want to know why the same argument keeps arriving in different clothes, and whether there is anything to be done about it.

For that person, "are we compatible" is the wrong question. It has already been answered, by years of evidence. Here is the better one.

## What a synastry chart is, in two minutes

Two real birth charts, overlaid.

A birth chart is a map of where the planets actually were at the moment someone was born: computed from astronomical data, not generated or guessed. A synastry chart puts two of those maps on top of each other and looks at the angles between them. Your Moon sits at a certain degree. Their Mars sits at another. The angle between those two points is called an aspect, and some angles are smooth and some are abrasive.

That is the whole mechanism. Two maps, and the geometry between them.

It is worth being blunt about what this is not. It is not prediction: nothing here forecasts events, and any page that tells you a chart can is selling something. It is not a verdict on whether the relationship is good. And it is not a personality test that excuses anyone's behavior. It is a description of a pattern. What you do with the pattern is entirely yours.

## The only distinction that matters: flows and catches

Strip away the vocabulary and a synastry chart tells you two things.

Some things between you and this person are structurally easy. Effortless in a way neither of you had to build. You talk about a hard subject and it just goes fine. You have a rhythm for making decisions together that other couples apparently have to negotiate.

And some things are structurally effortful. Not broken, effortful. There is a place where you two reliably catch, and you have probably been catching there since the first year.

Both are permanent. Neither is a problem.

This is the reframe that changes how the whole chart reads. Most people arrive at synastry assuming the difficult aspects are the diagnosis and the easy ones are the filler. It is backwards, and it costs people years.

![Galaxia's flows and catches card showing a relational dynamic with Nurture it and Ease it guidance](/synastry-flows-catches.png)

## Why the easy parts are the dangerous ones

Here is the counterintuitive part, and if you take one thing from this page, take this.

Nobody notices ease.

Friction is legible. It announces itself, it interrupts your week, it makes you want to look up a synastry chart. Ease does nothing. It just quietly holds a great deal of weight for a very long time without ever asking for attention.

Which means that in almost every long relationship there is something genuinely rare happening between two people that neither of them has ever said out loud. Not because they do not feel it. Because it never came up. It never had to.

The language Galaxia uses for these is a nurture line, and it says the thing plainly:

> **Nurture it:** Don't let this ease go unspoken between you. Say the affection out loud even when it feels obvious: warmth this easy is exactly what gets taken for granted.

That is the risk. Not that the ease disappears. That it goes unnamed for so long it stops registering as a gift and starts registering as a baseline, and a baseline is something you only notice when it is gone.

So: read the easy aspects first. Before you look at a single hard one. Find out what has been carrying you, and then go say it to the person.

## Reading the catches without building a case

Now the hard aspects, and the reason the reading order matters so much.

If you pull a synastry chart while annoyed, and you read the difficult aspects first, you will find them. They will be accurate. And they will confirm exactly the hypothesis you walked in holding. A chart read in that order cannot tell you anything you did not already believe; it can only give your existing case a better vocabulary.

Read after the easy aspects, the same placement reads differently. Not as a sentence handed down, but as one specific place where effort is required, inside a structure that is otherwise holding fine.

There is also a distinction worth making between two kinds of friction, because they call for opposite responses.

**Friction you are managing forever** repeats identically. Same fight, same words, same ending, every time. That is not structural. That is a conversation neither of you has had yet, wearing a costume. It is fixable, and the fix is usually saying the tender thing before it hardens into scorekeeping: naming what you actually need, early, while it is still a request rather than a grievance.

**Structural friction** changes shape. You are arguing about the dishes, then about the calendar, then about a text message, and it is obviously the same nerve every time. That one you do not fix. You name it. Out loud, to each other, ideally before you are in it: *we are doing the thing again.*

The difference between a couple that manages a hard aspect well and one that does not is almost never the aspect. It is whether they have a shared name for it.

## What a chart cannot tell you

This section is here because no competing page has it, and because it is true.

A synastry chart cannot tell you whether to stay. It describes a pattern; it does not weigh a life. Two people with a difficult chart and the will to name things out loud will do better than two people with a smooth chart and nothing to say to each other.

It cannot tell you who is at fault. Aspects are mutual. There is no configuration in which the chart takes a side.

It cannot substitute for the conversation. This is the big one. A chart can hand you unusually precise language for something you have felt for years and never been able to phrase. That is genuinely valuable: most stuck arguments are stuck on vocabulary. But the language is only useful once it leaves the page and gets said to the person it is about.

And it cannot forecast. Nothing in a chart tells you what will happen next month. Anything that claims otherwise is not reading astronomy.

If you want a second opinion once you have read all this, [Vela can walk you through what your chart actually says](/meet-vela): the same refusal to guess past what the data supports, just applied to your two specific charts instead of a general essay.

![Galaxia's dynamic table showing six relational dimensions between two people](/synastry-dynamic-table.png)

## Reading yours

You need two birth dates. Birth times, as exact as you can get them, unlock the deepest layer (houses, rising signs, the precise Moon), but you do not need them to start. The signs, the aspect readings, and [the generational layer](/generations) all work from a date alone, sometimes from just a year.

That last part matters more than it sounds. It means the people you have the least information about (a grandparent, a parent who is gone, an old friend) still have a place in the reading.

Galaxia does this for the people already in your life rather than for strangers: your partner, your kids, your parents, your siblings, the friends who became family. Every chart is computed from real astronomical data, and every interpretation is written and curated rather than generated, which is why it will tell you what it does not know instead of guessing.

Compare any two people, see where you flow and where you catch, and get a specific thing to do about each. [Try a free synastry chart →](/chart/compare)$POST_BODY$,
  read_time_minutes = 6,
  updated_at = now()
where slug = 'synastry-chart-meaning';
