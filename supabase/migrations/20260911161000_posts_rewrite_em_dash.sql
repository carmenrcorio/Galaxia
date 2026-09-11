-- FOUNDER-REVIEW: rewritten (no U+2014).
-- Replace em dashes in the four published posts (dek + body). Applied
-- migrations are never edited (ENGINEERING.md §2); this UPDATE is a new
-- file. Do not apply by hand in the dashboard. Live verification, if any,
-- goes behind assertDisposableDbTarget against a disposable project, never
-- eigfvribtntbxyjutsma.

update public.posts
set
  dek = $POST_DEK$Every astrology app knows your Mercury sign. None know your grandmother's. Galaxia charts everyone in your life, even the ones you've lost.$POST_DEK$,
  body = $POST_BODY$Every astrology app on your phone knows your Mercury placement. Ask it about your grandmother's, and it has nothing.

Not because the technology can't do it: computing a chart for someone born in 1948 is no harder than computing one for someone born last year. It's because no one built the feature. The entire consumer astrology industry quietly narrowed itself down to a single genre: you, your traits, your day, your notifications. The people you actually live your life with (the ones you call when something goes wrong, the ones whose birthdays you've had memorized since childhood) show up nowhere. Not in the chart. Not in the horoscope. Not even as an afterthought.

That's a strange thing for astrology to have become, when you think about it. A birth chart has never meant much in isolation. It's a set of positions, and positions only matter in relation to something: a moment, a place, another chart. Astrology, as a practice, was never supposed to be a solo act. Somewhere along the way, the apps decided it should be.

## The apps built around you

Look at what's actually on the market and a pattern shows up fast: every category, without exception, stops at the individual.

The daily-horoscope apps (Co-Star is the obvious one, The Pattern close behind) are built to open every morning and tell you something about *you*. Your mood, your energy, your one thing to watch out for today. Beautifully designed, genuinely engaging, and structurally incapable of telling you anything about the actual humans in your day.

The chart-calculator apps, TimePassages being the long-running example, go deeper on the astrology itself: houses, aspects, transits, the real mechanics. But depth on one chart is still depth on one chart. You can learn everything there is to know about your own Venus placement and still have zero way to see how it sits next to your partner's, your father's, your best friend's.

The AI-reading apps are the newest wave: Sanctuary, Astra, and others that let you type a question and get a generated answer back. Some of them are decent. But look closely at how they're priced: charge-per-question is common, which means the app is incentivized for you to keep asking, not for you to actually understand something and stop needing to ask. And the reading is still about you. Ask an AI-reading app about a relationship and it will, at best, guess.

Three categories, one blind spot. They all stop at you.

## What "generational astrology" actually looks like

Galaxia doesn't stop there, because the interesting part was never just you: it's what happens when your chart sits next to someone else's. Add your mother. Add your kid. Add the friend who's basically family. Every person you add gets a full, real, computed chart, the same as your own, and the app treats every one of those charts as a first-class citizen, not a guest star in your personal horoscope.

This is what generational astrology means in practice: not a single reading, but a constellation of them, all connected. A transit that's currently sitting on your Saturn is also sitting somewhere specific in your sibling's chart, your parent's chart, your kid's chart, and it's landing differently in each one, because each of those charts is different. Seeing that side by side is a completely different experience than seeing your own transit alone. It turns "why am I feeling this way right now" into "oh, this is a family season," which is often the more honest and more useful question.

That's also where a real **family astrology chart** earns its name. Not a single chart with a label slapped on it, but an actual layered view: your family, computed as a set of related people rather than a single subject. You can hold your chart next to your father's and see exactly where you run alike and exactly where you don't, in the same language, side by side, instead of guessing from a lifetime of observation. If you've never built one out, [Generations](/generations) is the place to start: that's the feature this whole idea lives in.

And because it's a full relational engine and not a compatibility gimmick, it does real synastry: an actual biwheel comparison between any two people's charts, not a canned "these two signs get along" blurb. If you're new to what that comparison actually shows, [our synastry chart meaning guide](/synastry-chart-meaning) walks through how to read one: flows, catches, and what each is actually telling you.

## The part no other app will touch

Here's the section that's uncomfortable to write about and impossible to skip, because it's the clearest proof of the whole point.

Every astrology app treats a person as a live subscriber. If you stop opening the app, your chart just sits there unused; there's no concept of a chart that outlives its owner. Which means the moment someone you love dies, every one of those apps has nothing left to offer you. Not their chart, not a way to keep it, not a way to still ask what a transit means for the relationship you still carry.

Galaxia has memorial profiles. You can add someone who has passed, and their star stays visible in your constellation: not hidden, not archived, not converted into a generic "deceased" flag, but present, the way they still are to you. Their chart doesn't stop meaning something just because they're gone. You can still look at where your Moon sat against theirs. You can still ask what a transit meant for the two of you, in the past tense or otherwise. It's a small, specific piece of software behavior, and it is completely uncontested: no competitor has it, because no competitor was ever built to imagine a person outliving their own login.

This is not a feature you market loudly. It's a feature you build because the alternative (an app that quietly erases someone the day they die) is not one you'd want to be responsible for.

## Vela, and the difference between a guide and a meter running

Once you have a constellation of real people, you need a way to actually talk about what you're seeing, and that's what Vela is for: Galaxia's AI guide, included in the monthly subscription at no extra charge, ever. Ask it about a transit hitting two people differently, a synastry pattern between you and a sibling, or what a specific aspect in a family chart tends to mean, and it answers from the same curated, static interpretation library every reading in the app pulls from. It doesn't improvise, and it doesn't charge per question the way some of the AI-reading apps above do: there's no meter running that rewards you for staying confused. [Meet Vela](/meet-vela) if you want to see it in context before you ever open the app.

## The point of a relationship astrology app

Step back and the whole thing is a fairly simple bet: a **relationship astrology app** should be about relationships, not about a single user's daily forecast with everyone else edited out. The people already in your life (parents, grandparents, partners, kids, coworkers, the friend who became family, the person you lost and haven't stopped thinking about) are not a feature request. They're the point.

Nobody's astrology app has your grandmother in it. Yours can.

14 days free at galaxiamea.com$POST_BODY$,
  updated_at = now()
where slug = 'nobody-has-your-grandmother';

update public.posts
set
  body = $POST_BODY$You read your horoscope. It says something about being bold in conversations this week. You are, at this exact moment, hiding in a bathroom at a party because someone asked you a direct question. You are, allegedly, a Leo.

This is the moment a lot of people quietly decide astrology is nonsense. It's understandable, and it's also based on a misunderstanding that isn't really your fault. The horoscope wasn't wrong because astrology doesn't work. It was wrong because it was never given enough information to be right. It knew one placement out of more than a dozen and was asked to describe your entire personality anyway. That's not astrology failing. That's a **sun sign only** reading being asked to do a job it was never built for.

Reddit is full of some version of "I'm a Scorpio and none of this fits me." Usually the person posting isn't anti-astrology. They're frustrated with a shallow version of it that promised more than a single data point could ever deliver, and they're right to be frustrated.

## Why a sun sign is roughly 1/40th of the picture

A full natal chart isn't one placement. It's at least ten: Sun, Moon, Rising, Mercury, Venus, Mars, Jupiter, Saturn, and beyond. Each of those sits in one of twelve signs and one of twelve houses, and each one forms angles (aspects) with every other placement in the chart. Stack that up and a **natal chart** isn't a label. It's closer to a hundred interacting variables, and a sun sign is exactly one of them, doing its best to stand in for the rest.

Put another way: two people can share a sun sign and have almost nothing else in common. Two Leos with different Moon signs will handle conflict in completely different ways: one leads with warmth and tries to talk it out in the room, the other goes quiet and needs distance before either of them says a word. Same sun sign, same generic horoscope, two people who would read that horoscope and get opposite amounts of use out of it. The sun sign didn't lie. It just wasn't asked the right question.

This is what's actually going on every time a sun-sign horoscope feels off: it's not describing you badly, it's describing an entire twelfth of the population identically, on purpose, because that's the only input it has. A **birth chart** built from your full data (the date, the place, and ideally the time) is a different kind of object entirely, and it's why the accuracy gap between "sun sign only" and "full chart" isn't a rounding error. It's most of the picture.

## The house layer nobody mentions

It goes a step further than sign alone, too. Every placement doesn't just sit in a sign: it sits in a house, and the house is what tells you *where in your life* that placement tends to show up. A Mars in Aries is a certain kind of directness on its own. That same Mars in your seventh house shows up specifically in partnerships; in your tenth house, it shows up at work. Same sign, same planet, different arena entirely, and "what's your sign" was never going to capture that, because a sign has no concept of a house at all. This is the part a magazine horoscope structurally cannot include: there's no version of "Aries" that also encodes "in your relationships" or "in your career," because the format only ever asked for one word.

Stack sign and house together and a placement stops being a trait and starts being closer to a specific instruction: this energy, showing up here. That's a meaningfully different (and more useful) kind of information than a single adjective.

## Compatibility tables are the same problem, doubled

If a single sun sign is a thin slice of one person, a sun-sign compatibility chart is a thin slice of two people multiplied together, and it gets worse, not better, because now the reductiveness compounds.

"Scorpio and Gemini: disaster" makes for a clean headline. It also completely ignores that a real relationship isn't a comparison of two sun signs: it's a comparison of two full charts, which means dozens of possible meaningful pairings between them. Their Moon and your Mercury. Your Venus and their Mars. Their Saturn sitting right on your Sun. That's what **synastry** actually looks at: not one line of compatibility copy, but the real geometry between two complete charts, aspect by aspect. Two Scorpio-Gemini pairs, with different Moon and Venus placements, can have completely different relationships (one genuinely difficult, one genuinely easy) and a sun-sign compatibility table has no way to tell them apart, because it was never looking at enough of either chart to know.

This is also, not coincidentally, exactly why so many people ask **why horoscopes are wrong** for their relationships specifically, even when they mostly buy the single-person version. Compatibility is a relational question, and a relational question asked of one data point per person was always going to come back thin.

## What actually works

This is why Galaxia computes the full natal chart for every person you add (not just a sun sign, all ten-plus placements, houses and aspects included) and the full synastry between any two of them, not a lookup table keyed to two signs. Ask [Vela](/meet-vela), the AI guide included in every subscription and never charged per question, about a specific placement or a specific pairing between two people, and it answers from the real computed chart underneath, not a generic paragraph assigned to your sign at birth. It's the difference between an app that knows twelve types of people and an app that knows the actual person you added, house by house, aspect by aspect.

None of this makes astrology more mystical. If anything it makes it more like what it actually is: a large, specific, computable dataset that happens to be more interesting the more of it you look at. The version that fit on a magazine page was always the smallest possible piece of it. If you want the fuller case for why Galaxia is built this way (full charts, real relationships, no shortcuts), [see why Galaxia exists](/why-galaxia). And if you're specifically trying to understand what a relationship chart is actually telling you, [our synastry guide](/synastry-chart-meaning) is the place to start.

You were never a bad fit for astrology. You were being handed 1/40th of your own chart and asked to recognize yourself in it. Of course it didn't always land.

14 days free at galaxiamea.com$POST_BODY$,
  updated_at = now()
where slug = 'sun-sign-not-personality';

update public.posts
set
  body = $POST_BODY$You finally pulled a synastry chart with someone (a partner, a sibling, the friend you've been close with for a decade) and now you're staring at a wheel with lines running everywhere between two sets of planets, and no idea which ones actually matter.

That's normal. A full synastry chart between two real people can easily have thirty or forty meaningful aspects, and most explanations of synastry stop at "here's what synastry is" without ever getting to "here's what to actually look for in yours." If you haven't read that first piece, [our intro guide to what a synastry chart means](/synastry-chart-meaning) covers the basics: the idea of flows and catches, and why the easy parts of a relationship deserve at least as much attention as the hard ones. This post picks up from there and gets specific.

Below are seven aspects that show up constantly in real charts and that reliably describe something you can actually feel in a relationship: not just in romance, but between parents and kids, siblings, and friends who are basically family. For each one: what it is, what it feels like from the inside, and where it tends to show up. A quick note on vocabulary before diving in: a conjunction means two placements sit at (or very near) the same degree, a square is a tense 90-degree angle, a trine is a smooth 120-degree angle, and an opposition and sextile are two more common angles you'll run into elsewhere in a full chart. You don't need to memorize the geometry; you just need to know that "conjunct" reads as merged and amplified, while "square" reads as friction, and "trine" reads as ease.

## 1. Venus conjunct Mars

**What it is:** One person's Venus (how they love, what they're drawn to) sits at the same degree as the other person's Mars (how they pursue, how they act on desire).

**What it feels like:** Immediate, physical, hard-to-explain pull. This is the aspect behind "I don't know what it is about them" attraction: not a slow build, but something that registers almost before either person has said much of anything. It tends to run hot rather than calm, and it doesn't fade quickly once it's there.

**Where it shows up:** Almost exclusively romantic. This is one of the clearest **synastry aspects** for attraction specifically, and it's rare to see it carry the same charge in a platonic or family chart.

## 2. Moon conjunct Moon

**What it is:** Both people's Moons (the placement that governs emotional needs and instinctive reactions) land at or near the same degree.

**What it feels like:** "You just get each other," minus the effort that usually takes. Moods land the same way for both people. Comfort looks similar for both of you. There's a kind of emotional shorthand that other people in the relationship's life notice before either of you can quite explain it: you don't have to translate your feelings for this person, because their internal weather runs close to yours.

**Where it shows up:** All three: romantic, family, and friendship. This is one of the most relationship-agnostic aspects there is; a parent-child chart with Moon conjunct Moon can feel just as close and just as automatic as a romantic one.

## 3. Moon square Saturn

**What it is:** One person's Moon meets the other's Saturn at a 90-degree angle: emotional need running straight into structure, restraint, or judgment.

**What it feels like:** The "walking on eggshells" aspect. Not because either person is cruel (usually neither one is), but because one person's need for warmth and reassurance keeps meeting the other person's instinct to pull back, evaluate, or stay composed exactly when warmth was needed most. It can look like one person feeling chronically not-quite-enough and the other feeling chronically responsible for a mood they didn't cause. Named out loud, it stops being a character flaw and starts being a pattern two people can actually work with.

**Where it shows up:** All three, and it's a common one in family charts specifically: a parent's Saturn meeting a child's Moon is a familiar version of this exact dynamic, often carried for decades before anyone has language for it.

## 4. Sun trine Sun

**What it is:** Both people's core identities (their Suns) sit at a naturally harmonious 120-degree angle to each other.

**What it feels like:** Ease, without the two of you having built it. Mutual respect that didn't require a negotiation to get there. Neither person feels like they have to shrink or perform to be around the other: there's an unforced sense of "we just work," and it tends to be the kind of aspect people undersell precisely because it never demanded their attention.

**Where it shows up:** All three, and it's one of the aspects most likely to describe a long, easy friendship as accurately as a romantic pairing.

## 5. Mercury conjunct Mercury

**What it is:** Both people's Mercury (how each one thinks and communicates) lands at the same degree.

**What it feels like:** Conversations that don't require translation. Jokes that land on the first try. The specific relief of talking to someone who processes information roughly the way you do, so you're rarely stuck explaining what you meant twice. This is the aspect behind relationships where people say they can "talk for hours" without noticing the time.

**Where it shows up:** All three, and it's especially noticeable in friendships and sibling pairs, where a huge share of the relationship's daily texture is just talking.

## 6. Venus square Pluto

**What it is:** One person's Venus meets the other's Pluto (the planet of intensity, obsession, and transformation) at a tense 90-degree angle.

**What it feels like:** Magnetic and a little destabilizing at the same time. This is rarely a mild aspect: it tends to produce relationships that feel consuming, sometimes possessive, and genuinely transformative for at least one person involved. It can be intoxicating early and, without conscious effort from both people, can tip into control or jealousy later. Not automatically a bad aspect, but rarely a quiet one.

**Where it shows up:** Mostly romantic, though it can appear in intense, formative family relationships too: a parent-child bond with this aspect often runs deep and complicated in equal measure.

## 7. North Node conjunct personal planet

**What it is:** One person's North Node (the astrological marker for growth and direction this lifetime) lands on the other person's Sun, Moon, or another personal planet.

**What it feels like:** The "we were supposed to meet" feeling. People with this aspect between them often describe an early sense of fated significance, whether or not the relationship stays in their life long-term: the North Node person frequently feels pulled toward growth specifically *because* of the other person, in a way that's hard to explain to anyone outside the relationship.

**Where it shows up:** All three, though it's most often talked about in romantic contexts because that's where the "fated" language gets used most. It shows up just as often, and just as meaningfully, in a friendship or a family bond that ends up shaping someone's life.

## These seven are the beginning, not the whole chart

A real synastry reading between two people usually surfaces dozens of aspects beyond these seven (minor aspects, house overlays, the composite midpoint between two charts), and the meaning of any single one of them shifts depending on everything else present. A Moon square Saturn sitting next to a warm Sun trine Sun reads very differently than the same Moon square Saturn on its own. **Synastry chart reading** at its best is never a single-line lookup; it's pattern recognition across the whole picture, which is exactly why Galaxia computes every aspect between any two charts you compare (not a curated highlight reel, all of it), and why [Vela](/meet-vela) exists to walk you through what a specific combination actually means together, in plain language, without ever inventing a reading the data doesn't support.

And none of this is limited to romantic pairings. Every aspect above can and does show up between a parent and a child, between siblings, between friends who've been close for twenty years. If you haven't tried comparing charts across your family yet, [Generations](/generations) is where that comparison happens: the same real synastry, applied to the people you didn't choose but love anyway.

You don't need to memorize all seven of these to get value from a synastry chart. You need to know that the lines mean something specific, that context changes what they mean, and that the two of you get to decide what to do with the pattern once you can actually see it.

14 days free at galaxiamea.com$POST_BODY$,
  updated_at = now()
where slug = 'synastry-aspects-explained';

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

Want to go deeper on the specific lines in your own chart? [The 7 synastry aspects that actually predict how a relationship feels](/synastry-aspects-explained) picks up right here and gets concrete: Venus conjunct Mars, Moon square Saturn, and five more, with what each one tends to feel like from the inside.

## What a chart cannot tell you

This section is here because no competing page has it, and because it is true.

A synastry chart cannot tell you whether to stay. It describes a pattern; it does not weigh a life. Two people with a difficult chart and the will to name things out loud will do better than two people with a smooth chart and nothing to say to each other.

It cannot tell you who is at fault. Aspects are mutual. There is no configuration in which the chart takes a side.

It cannot substitute for the conversation. This is the big one. A chart can hand you unusually precise language for something you have felt for years and never been able to phrase. That is genuinely valuable: most stuck arguments are stuck on vocabulary. But the language is only useful once it leaves the page and gets said to the person it is about.

And it cannot forecast. Nothing in a chart tells you what will happen next month. Anything that claims otherwise is not reading astronomy.

![Galaxia's dynamic table showing six relational dimensions between two people](/synastry-dynamic-table.png)

## Reading yours

You need two birth dates. Birth times, as exact as you can get them, unlock the deepest layer (houses, rising signs, the precise Moon), but you do not need them to start. The signs, the aspect readings, and the generational layer all work from a date alone, sometimes from just a year.

That last part matters more than it sounds. It means the people you have the least information about (a grandparent, a parent who is gone, an old friend) still have a place in the reading.

Galaxia does this for the people already in your life rather than for strangers: your partner, your kids, your parents, your siblings, the friends who became family. Every chart is computed from real astronomical data, and every interpretation is written and curated rather than generated, which is why it will tell you what it does not know instead of guessing.

Compare any two people, see where you flow and where you catch, and get a specific thing to do about each.$POST_BODY$,
  updated_at = now()
where slug = 'synastry-chart-meaning';
