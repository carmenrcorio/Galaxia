-- FOUNDER-REVIEW: six F10 blog posts (titles, deks, bodies) plus reciprocal
-- links from existing published posts. Seeded the same way as
-- 20260909180000_blog_posts_generational_debunked_synastry_aspects.sql:
-- INSERT into public.posts, then UPDATE existing bodies. Applied
-- migrations are never edited (ENGINEERING.md §2). Do not apply by hand
-- in the dashboard. Live verification, if any, goes behind
-- assertDisposableDbTarget against a disposable project, never
-- eigfvribtntbxyjutsma.
--
-- Posts render at /{slug} via apps/web/app/[slug]/page.tsx. Category
-- listing pages stay at /blog/guides and /blog/debunked. Article JSON-LD
-- is built from the row (lib/blog-article-json-ld.ts); canonical is the
-- top-level path, never /blog/{slug}.
--
-- Category CHECK allows only 'guides' | 'debunked'. read_time_minutes is
-- words/225 ceil, matching lib/read-time.ts computeReadTimeMinutes.

insert into public.posts (slug, title, dek, category, body, status, read_time_minutes, byline, published_at)
values
(
  -- FOUNDER-REVIEW: authored post 1 title, dek, body.
  'mothers-moon-sign-apology',
  $title1$What Your Mother's Moon Sign Says About How She Says Sorry$title1$,
  $dek1$The moon sign is emotional reflex: the feeling that arrives before you choose. Family conflict tests that more than almost anything else.$dek1$,
  'guides',
  $body1$Your mother probably knows when something went wrong between you. She might not know how to say it, or she might say something meant as an apology that does not land as one. That gap, more often than not, is not a gap in caring. It is a gap in emotional language, and the moon sign is where you find the translation.

The moon in a natal chart describes emotional reflex: what someone reaches for when they are hurt, what they offer when they want to repair something, what caring looks and feels like from the inside. Two people with very different moon signs can love each other completely and still spend decades speaking slightly past each other.

You do not need a mysterious reading to find this placement. The moon moves about twelve degrees a day and changes signs roughly every two and a half days, so a birth date is usually enough. Birth time matters when she was born near a sign change; Galaxia will say so rather than guess. If you want the placement itself, the [free natal chart](/chart) computes it from real sky data. If you want the two moons next to each other, that is [a synastry comparison](/chart/compare).

Here is what each moon placement looks like in the specific context of repair after conflict.

## Moon in Aries

An Aries moon apologizes with action. She is at the door, or she has handled the thing you mentioned, or she is just present and available in a way she was not before, because doing something feels real to her in a way that words do not. Saying "I'm sorry" sounds like a script; fixing the shelf sounds like meaning it.

If you need to hear the words, ask directly. She will not resent the request. She just assumed the gesture covered it. She processes conflict fast and is already oriented toward what comes next. If she seems like she has moved on before you have finished processing, she has. She is waiting for you.

## Moon in Taurus

Days might pass with a Taurus moon, and the silence will feel like avoidance. It is not. She cannot say sorry until she means it completely, and meaning it takes sitting with what happened until it settles. When the apology arrives, it will be whole. No sorry-but, no acknowledgment with a reclaim buried in the second sentence. After, she will make coffee and she will not bring it up again. The wait was the caring.

## Moon in Gemini

A Gemini moon processes through talking, and sometimes that means she is talking around the hurt before she is talking through it. She might crack a joke when the repair still feels unfinished to you. She might pivot to something new, an article she read, a thing that happened, as though you are already past it. In her experience, you are. The lightness is not dismissal; it is her version of saying the coast is clear.

If you need something more explicit, ask. She can give it. She just will not know to unless you say so.

## Moon in Cancer

A Cancer moon apologizes through attention. She starts checking in more, asks if you ate, sends you something. The words might not come because this placement leads with care before language. If your mother hurt you and is now suddenly very focused on your comfort, that is the apology.

The complication is that Cancer moons feel hurt quickly and hold it longer than they show. If something between you went unaddressed and things have felt muted since, she is probably still carrying it. Name it. She will not make you.

## Moon in Leo

A Leo moon apology costs something. Not because Leo is proud in a simple way, but because dignity is part of how she holds herself together, and setting it down even briefly is genuinely hard. A Leo moon mother who says sorry is doing something real. The words do not come cheaply.

She might reach it through a gesture, or she might offer something that is seventy percent accountability and thirty percent explanation of why she had a point. Take the seventy. She is working at the edge of what she can do.

## Moon in Virgo

A Virgo moon translates care into helpfulness when the emotional conversation feels too direct. She will fix things, send things, handle things. The repair arrives sideways, through action rather than language.

If you want the conversation itself, ask for it specifically. She can have it; she just will not arrive there on her own.

## Moon in Libra

Libra moons genuinely believe in fairness and cannot suspend that belief even in repair. Her apology will acknowledge her part and name yours. If you are still raw, this lands like blame in the same breath as the sorry. It is not. She cannot see a conflict without accounting for both sides; saying only her part feels dishonest to her.

If you need her to sit with only hers for a while, say so. She can do that.

## Moon in Scorpio

A Scorpio moon takes time and arrives completely. The silence before repair can be long, and during it she might seem fine or cold or simply distant. None of those are the full picture. When she comes back to the thing that happened, there is nothing surface about it.

A quick make-up that resolves things before they were actually addressed rarely holds with this placement. If things feel smoothed over before they were worked through, they probably were not.

## Moon in Sagittarius

A Sagittarius moon is genuinely quick to move on and she genuinely means it. Her apology is usually brief, maybe lighter than the situation called for, and followed fast by a forward pivot. She considers the matter closed once she has said her piece. If you need more time than she does, the gap can read like she is brushing past it. She is not. She just does not understand remaining in the difficult part after the words are said.

## Moon in Capricorn

Capricorn moons were often taught, usually through experience, that control is safety and that showing too much is weakness. Saying sorry can feel like losing grip of something important. Your mother with this placement might show you she is sorry through reliability: she is on time, she handles what she said she would handle, she does not repeat the same mistake twice. The demonstration is the apology.

If you have never heard her say the words and things between you are actually fine, this is probably the reason.

## Moon in Aquarius

An Aquarius moon processes emotion at a slight remove. Her apology sounds more analytical than heartfelt: here is what happened, here is what I was thinking, here is the effect. It can feel clinical. It is the most honest version of her repair, delivered in the register she actually operates in. She is not being cold. She is being precise, which for her are the same thing.

## Moon in Pisces

A Pisces moon absorbs more blame than usually belongs to her. If she hurt you, she has been sitting with it. When she comes back to the repair, it is usually soft, full, and slightly more than is required. She will take on her part and probably some of yours too.

## What to do with any of this

None of it explains away specific harm, and none of it means a pattern that needs a direct conversation does not need one. What it does is offer a translation layer between how she repairs and what you have been waiting for.

If her silence felt like absence, or her gesture felt like avoidance, or her lightness felt like not caring, the moon sign is sometimes where you find out that none of those things were what you thought they were. Understanding your mother's moon placement alongside your own tells you something about the gap between what she is offering and what you are expecting. Those two things can be miles apart even between two people who love each other.

The moon is not the whole relationship. If the pattern between you has a harder architecture (one of you bringing feeling, the other compressing it), that often lives in the aspects, not just the signs. [Moon square Saturn in a parent and child](/moon-square-saturn-parent-child) is the most common version of that architecture. For the wider map of how two charts sit together, [what a synastry chart actually tells you](/synastry-chart-meaning) is the place to start. [Generations](/generations) is where Galaxia puts family charts next to each other on purpose, rather than treating a parent as a guest in your personal horoscope.

If you want to see her moon next to yours, and to see how those two emotional defaults interact in practice, [compare both charts free](/chart/compare). You can see where you are speaking the same language without knowing it, and where the translation is harder than either of you realized.
$body1$,
  'published',
  7,
  'The Galaxia Team',
  '2026-09-14T10:00:00Z'
),
(
  -- FOUNDER-REVIEW: authored post 2 title, dek, body.
  'colleague-you-cannot-read',
  $title2$The Colleague You Cannot Read$title2$,
  $dek2$Some people at work are hard to decode even when they mean well. That is often a generational astrology problem, not a personality one.$dek2$,
  'guides',
  $body2$There is a specific kind of professional frustration that does not have a name. You have worked with someone for two years. They seem competent and reasonable. You still cannot predict how they are going to respond to feedback, to a decision made above them, to a request that seems straightforward to you. Not because they are difficult. Because they are operating from a set of premises you cannot quite locate.

Most of the time, this is a generational problem rather than a personality one. Astrology tracks those patterns through the outer planets in a way that is genuinely useful for understanding why.

Pluto, Neptune, and Uranus move slowly through the zodiac. Pluto takes between twelve and thirty years in a single sign; Neptune around fourteen; Uranus about seven. Because of this, everyone born within a given window shares the same outer planet placements. These are not personal planets in the way your sun or moon is personal. They describe the generation, not the individual. But they shape how an entire cohort understands authority, loyalty, feedback, and the purpose of work itself, and those things create a set of premises that can be invisible to people operating from a different set.

You do not need a full birth time to see this layer. Year of birth is enough for Pluto, Neptune, and Uranus. That is why [Generations](/generations) can still be useful when the only fact you have about a colleague is roughly when they came up. Galaxia will not invent a rising sign or a house cusp from a year. It will show you the outer planets it can actually compute.

## Pluto in Virgo: born roughly 1957 to 1972

This generation absorbed the idea that work is identity and that competence is a form of integrity. They were formed during a period when institutions were failing in visible ways, which made them build their authority on skill rather than on hierarchy. They do not trust structure for its own sake. They trust demonstrated ability.

If a colleague in this age range seems skeptical of process, jargon, or the way something has always been done, it is usually not obstructionism. It is a need to understand the reason underneath the procedure. Show your work, not just your conclusion. Do not assume they will defer to your title or your organization's approval of an idea if the idea does not make sense to them directly.

They give feedback directly and they expect it in return. If you are waiting for warmth before the note, you may wait a long time. The directness is the respect, not the preamble.

## Pluto in Libra: born roughly 1972 to 1984

Pluto in Libra produced a generation with a deep instinct toward collaboration and consensus. Their default process in most professional situations is to involve everyone who might have a stake, which can read as slow or as indecisive to someone who just wants a decision made and executed.

They are not undecided. They are running a longer process because broad input feels necessary to them. If you need them to move faster, explain the constraint directly and they will usually adapt. What they will not adapt to easily is a decision made without consultation when they clearly had standing to be part of it. That registers as disrespect, regardless of what the decision was.

Feedback works best delivered in private, framed with care, and not in front of anyone else. This generation manages through relationship rather than through structure, and public criticism breaks something that takes a while to rebuild.

## Pluto in Scorpio: born roughly 1984 to 1995

Pluto in Scorpio is the intensity generation, formed under conditions of collapse and exposure: AIDS, financial recklessness, the early internet stripping away every kind of institutional pretense. They have a very low tolerance for surface-level professionalism and a strong instinct for what is actually happening underneath what is being said.

If you have a colleague in this range who asks sharper questions than feel comfortable, they are not being hostile. They are trying to understand the real situation rather than the polished version. They reward candor with genuine loyalty. They do not reward spin.

They tend to be all-in or checked out, with little middle ground. If a colleague in this generation seems disconnected from something they used to care about, trust broke somewhere and it probably needs to be named rather than managed around.

## Pluto in Sagittarius: born roughly 1995 to 2008

This generation entered the workforce during a pandemic and, before that, grew up watching institutions fail to match their stated values in very visible ways. They came in looking for purpose and for alignment between what an organization says and what it actually does. The gap between stated values and actual behavior costs more with this generation than with any other cohort in the building.

They are not asking for a mission statement. They are watching whether the behavior matches the language. If the company says it values its people and then does something that clearly does not, they clock it, and some of them leave without discussing it first.

Authority derived from position alone moves them very little. Authority derived from demonstrated competence and genuine openness moves them significantly. The fastest way to lose their buy-in is to be dismissive of a question they asked in good faith.

## What Neptune adds to the picture

While Pluto describes the generation's fundamental drive, Neptune describes where it directs its idealism. Working generations right now have Neptune in Sagittarius, Capricorn, or Aquarius, depending on when they were born.

Neptune in Sagittarius (roughly 1970 to 1984) tends to look for meaning in work, for something that connects to a larger purpose. Neptune in Capricorn (roughly 1984 to 1998) tends to look for structure that actually functions, for institutions that earn their authority through reliability rather than through claiming it. Neptune in Aquarius (roughly 1998 to 2012) tends to look for systems that are fair in practice, not only in language, and for work that does not require them to pretend the old hierarchy still makes sense.

All three orientations can be hard to read if you do not know what they are orienting toward. Knowing that a colleague is looking for meaning versus looking for a system that works versus looking for a fair process changes how you talk to them about almost everything.

## Uranus and the disruption instinct

Uranus moves faster than Pluto or Neptune, shifting signs roughly every seven years. Cohorts with prominent Uranus placements in their generational signature tend to be the first to name what is not working, to push back on unjustified authority, and to find workarounds when systems fail. This is not opposition for its own sake. It is a wiring toward honesty about broken things.

The colleague who keeps raising the same problem that nobody wants to address is often operating from a Uranian instinct. Whether they are right about the problem is a separate question from understanding where the behavior comes from.

## A working note on all of this

Generational astrology tells you what the ground is, not who stands on it. Two people born in the same year with the same Pluto sign will still be completely different individuals, shaped by their own charts, their own histories, their own choices. The outer planets give you the shared premises; everything else is specific to the person.

A natal chart for a colleague you actually have birth data for will always be more precise than the generational layer alone. The sun, moon, Mercury, Venus, and Mars are personal. They do not belong to a decade. If you only have a year, use the year honestly. If you have a date and a place, [run the full chart](/chart). Galaxia will not fill in the rest.

This is also the case for using astrology at work at all. It is a map of wiring, not a hiring tool, not a personality test you administer without consent, and not a way to decide who deserves what. [Galaxia for work](/for-work) is explicit about that boundary. If you are using this to understand someone you already work with, so you can talk to them more clearly, that is the honest use. If you are using it to sort people, you have left the map.

But if you have been working with someone and something keeps not translating, the generational layer is often where the pattern is. It is not that they are difficult. It is that they are operating from a different set of assumptions about what work is for, what respect looks like, and what authority has to earn. Knowing that is usually more useful than working harder at the surface level.

[Nobody's astrology app has your grandmother in it](/nobody-has-your-grandmother) is the family version of this same idea: charts for the people around you, not only for you. The workplace version is the same engine pointed at a different room.

If you want to see a person's full natal chart, including their outer planet placements alongside the personal ones, the [free chart](/chart) gives you the complete picture in plain language. Vela, Galaxia's guide, is included in the subscription and is never charged per message. It reads the computed chart. It does not invent one.
$body2$,
  'published',
  7,
  'The Galaxia Team',
  '2026-09-14T11:00:00Z'
),
(
  -- FOUNDER-REVIEW: authored post 3 title, dek, body.
  'moon-square-saturn-parent-child',
  $title3$Moon Square Saturn Between a Parent and a Child$title3$,
  $dek3$Moon square Saturn is the most searched hard synastry aspect, almost always written for couples. The parent-child version is more common.$dek3$,
  'guides',
  $body3$Moon square Saturn is one of the most common hard aspects in synastry. Almost all of the existing writing about it focuses on romantic partnerships: the Saturn person feels the moon person's emotional needs as a pressure, the moon person feels the Saturn person's structure as withholding, and both feel the gap without being able to explain it. That description is accurate. It also applies almost exactly to a specific and very common parent-child configuration, which almost nobody writes about.

Here is what it actually looks like in a family.

## What the aspect means

The moon represents emotional need and emotional expression: what someone requires to feel safe, received, connected. Saturn represents structure, limits, and the instinct toward containment. When one person's moon makes a square to another person's Saturn, those two things are in friction. Not opposition, not alignment, friction. The moon person brings emotional content and the Saturn person's natural response is to compress or redirect it. Neither person is trying to hurt the other. This is just what each one does.

A square is a 90-degree angle. In a natal chart it describes two parts of one person that do not easily cooperate. In synastry it describes two people whose wiring meets at that same awkward angle. [The seven synastry aspects that shape how a relationship feels](/synastry-aspects-explained) covers this contact in the romantic and general case. This post is the family version, because the parent-child chart is where the pattern often starts, and where it can run for decades before anyone has language for it.

In a parent-child configuration, this most often plays out with the Saturn parent and the moon child, though it can run the other way. The child brings their emotional life to the parent, and the parent's response is to reframe it, redirect it toward something productive, minimize it, or move quickly past it. "You'll be fine." "What are you going to do about it?" "I don't know why you're making this such a big deal." These are not attacks. They are a Saturn mind encountering an emotion and doing what it does: looking for the structure underneath it.

## What the moon child experiences

From the child's side, this registers as: what I am feeling is not welcome here. The lesson the child draws, often without articulating it, is that their emotional life is inconvenient or too much or something to be managed rather than felt. Over time, they get very good at managing it themselves. They become self-sufficient and hard to reach. They stop bringing things they expect to be turned away, which happens faster than most people think and earlier than most parents realize.

Adults who grew up with this dynamic often have a particular shape to their relationship with their own needs. They may be skilled at crisis, reliable under pressure, and surprisingly unavailable when something is just hard. They may have internalized the Saturn voice so thoroughly that they apply it to themselves before anyone else gets the chance. They do well in environments that reward self-sufficiency. They sometimes find close relationships difficult in ways they cannot quite name, because the template they have for emotional expression is compression rather than contact.

This is not a diagnosis. Plenty of people with this synastry in their family chart are warm, available, and fluent in their own feelings. The aspect describes a pressure. What someone does with the pressure is theirs.

## What the Saturn parent experiences

From the parent's side, the dynamic looks different. The reframe toward action, the movement past the feeling, feels like help. Saturn placements often belong to people who experienced their own emotional struggles as things to push through, and pushing through worked. They are offering their children the same tool. The fact that the child does not receive it as help is genuinely confusing to the parent, because from inside the Saturn frame, the tool is the caring.

What the Saturn parent usually does not see is that the child is not asking for a tool. They are asking to be seen in the feeling before they do anything with it. That is a very different request, and Saturn does not have a native response to it.

A Saturn parent who is reading this and recognizing themselves is already doing more than the aspect requires. Recognition is not the same as blame. The wiring was there before the child was. The parent did not install it to cause harm.

## Why neither person is to blame

The difficulty of this aspect in a parent-child relationship is that neither person is usually trying to hurt the other and both people usually know something is off without being able to locate it. The parent often knows they were not as emotionally available as they could have been and feels some version of guilt or regret about it. The child often knows the parent cared and is confused by why it did not feel that way.

The aspect does not mean the parent did not love the child. It means the parent's wiring for expressing love did not connect with the child's wiring for receiving it. Those are two different problems and they are worth keeping separate, because conflating them is how both people end up holding blame that does not belong to them.

A natal chart cannot tell you who was right. Synastry cannot either. [What a synastry chart actually tells you](/synastry-chart-meaning) is a map of flows and catches, not a verdict. This aspect is a catch. It is a specific one, and it is workable once it has a name.

## What a Saturn parent can actually do

Very little of this is conscious on either side. But if a Saturn parent becomes aware of the dynamic, even partially, there is one thing that tends to work: staying in the feeling with the child a moment longer before moving to what to do about it. Not indefinitely. Just longer than the instinct says to.

The instinct says: we need to solve this. The child, most of the time, is not asking for the problem to be solved. They are asking for the feeling to be acknowledged before the solving starts. Those two things can be separated by as little as two sentences and as much as a silence that says I hear you before it says here is what to do. It does not come naturally to Saturn placements. That is the whole point. It can be practiced, and the child usually knows the difference.

If the child is now an adult, the same move still works, just in adult language. You do not have to become a different parent. You have to pause one beat longer than feels efficient.

## What a moon child can do with this information

Knowing that the parent's structure was not rejection changes something. It does not undo the gap or the things that came from it. But it can stop the child spending decades asking what was wrong with them that the parent could not meet them. The parent was not calibrated for what they brought. That is different from the parent not caring, and the difference is worth locating.

If you are also looking at how each of you repairs after conflict, the moon signs themselves are a second translation layer. [What your mother's moon sign says about how she says sorry](/mothers-moon-sign-apology) is that reading. The square is the architecture. The moon signs are the dialect.

You can see this aspect in a full synastry chart, which maps the contacts between two natal charts and shows you where the wiring connects and where it is in friction. If this dynamic feels familiar, looking at both charts can be clarifying. Galaxia computes the aspect from astronomical positions. It does not decide what the two of you should do with it. Vela, included in the subscription and never charged per message, can walk the same computed contact in plain language. It will not invent a softer story than the chart contains.

The [free comparison](/chart/compare) lets you run a synastry between any two people, including family members. You can see where your wiring aligns and where it was always going to be harder.
$body3$,
  'published',
  7,
  'The Galaxia Team',
  '2026-09-14T12:00:00Z'
),
(
  -- FOUNDER-REVIEW: authored post 4 title, dek, body.
  'what-a-chart-cannot-tell-you',
  $title4$What a Chart Cannot Tell You$title4$,
  $dek4$The most common objection to astrology is a reasonable one. Here is what a natal chart can describe, and what it will never tell you.$dek4$,
  'debunked',
  $body4$The most common objection to astrology from people who do not use it is a reasonable one: if the chart predicted the future with any reliability, we would know by now. Financial markets would price natal charts. Insurance actuaries would use birth times. The fact that none of this happens is taken as evidence that the whole framework fails.

That objection misunderstands what astrology is for. A natal chart is not a prediction engine. It is a map of how someone is built. And that is a genuinely different thing.

Galaxia is built on that distinction. The engine computes planetary positions from astronomical data. The interpretation library describes those positions in plain language. Neither layer forecasts events. If a reading ever claimed to, it would be making something up, and Galaxia does not fabricate.

## What the chart actually describes

The chart describes wiring: what someone reaches toward, what they pull back from, how they think, what kind of environments suit them, where they experience ease and where they hold tension. These are things about how someone works, not what they will do. The distinction matters because behavior is what wiring does when it meets circumstance, and circumstance is not in the chart.

Here is the clearest example: Venus in Scorpio.

A person with Venus in Scorpio experiences attachment intensely. They want deep knowledge of the people they are close to. They do not do casual without some cost to themselves. When they love someone, they want the real thing, not the surface version. That is what Venus in Scorpio describes, and it is accurate for the people who have it.

What it does not describe is whether they will be faithful. You can have Venus in Scorpio and be completely faithful, because faithfulness is a choice, and choices belong to the person, not to the chart. You can have Venus in Scorpio and not be, for exactly the same reason. The chart gives you the wiring. What someone does with that wiring is theirs entirely. This is not a weakness of astrology. It is what makes the chart genuinely useful rather than deterministic.

A sun sign alone cannot even get you this far. One placement standing in for a whole natal chart is how astrology gets a reputation it did not earn. [Your sun sign is not your personality](/sun-sign-not-personality) is the shorter version of that argument. This post is the limit case: even the full chart has a ceiling, and the ceiling is the point.

## Mars in Libra and the conflict question

Mars governs how someone moves toward what they want and how they handle friction. Mars in Libra has a strong preference for avoiding direct conflict. They would rather find common ground, soften the disagreement, or sidestep it altogether. That tendency is in the chart and it is real.

What is not in the chart is whether they will hold their ground in any specific situation. A Mars in Libra person who has been pushed too far, who has lost too much through accommodation, or who simply cares enough about something to fight for it will fight. Another Mars in Libra person with more options and a different history will not. The chart tells you the tendency. The person's history and their own decisions shape the behavior, and the chart cannot see either of those things.

This is also why two people with the same Mars sign can look nothing like each other in a fight. Sign is one variable. House, aspects, the rest of the chart, and the life that chart has been living are the rest.

## The question the chart cannot answer

"Will this relationship work" is not a question astrology can answer, and any reading that claims otherwise is making something up. What the chart can do is tell you where two people's wiring creates friction and where it creates ease. It can describe the areas that will require the most work and the areas that will feel effortless. It cannot tell you whether the people involved will do the work. That depends on them, on what is at stake for them, on what they have built together, on choices they have not made yet. None of that is in the chart.

[What a synastry chart actually tells you](/synastry-chart-meaning) is the relational version of this same limit. Flows and catches are real. A verdict is not. If you have been looking for a percentage that will decide the relationship for you, [compatibility scores are the wrong question](/compatibility-scores-wrong-question).

## What the chart is genuinely bad at

Specific timing. If you are looking for when something will happen, the chart is not the right tool. Transits and progressions can describe periods of likely activity in certain areas of life, but the specificity most people want (the month, the person, the event) is not there. Anyone who claims to read that level of detail from a chart is reading more than the chart contains.

Behavior under extreme stress. The chart describes the baseline. What someone does when they are frightened, grieving, or cornered is shaped as much by their history as by their wiring. The chart tells you where the pressure points are. It cannot tell you how someone will perform under pressure they have not faced before.

Moral character. This one is important. The chart carries no moral information. A strong Scorpio signature does not indicate someone who will harm you. A prominent Pisces does not indicate someone who will deceive you. The stereotyping that attaches ethical content to astrological placements is reading the mechanism and confusing it for the person. The mechanism is neutral. What the person does with it is not something the chart decides.

Missing data. A chart computed from a year of birth is not a full natal chart. Outer planets will be right. The moon, the rising sign, and the houses may not be. Galaxia will tell you when a placement is uncertain rather than pick a sign and hope. A silent fallback that produces a confident wrong answer is worse than no answer.

## The right questions to bring to a chart

The chart is very good at describing what someone values, how they process difficulty, what kind of environments suit them, where their patterns run deep, and what they tend to need from the people close to them. Those are questions about how someone works, and the answers are often more accurate and more specific than what you would get from asking the person directly, because the chart describes the pattern rather than the self-report, and self-reports are often idealized.

It is also good at comparing two people without turning them into types. Synastry is geometry between two complete charts, not a table of sun signs. That is a real difference, and it is the difference Galaxia is built around.

The most honest use of astrology is descriptive, not predictive. This is also the position of every serious practitioner who has been at it long enough to see where the framework holds and where it overstates itself. The chart describes. You decide. That division of labor is why it is actually useful.

Vela, Galaxia's guide, is included in the subscription and never charged per message. It answers from the same curated interpretation library as the rest of the app. It does not improvise a future. If you want to see what the chart can actually hold, [run a free natal chart](/chart). It will give you the full picture in plain language, without hedging the things it can see or claiming the things it cannot.
$body4$,
  'published',
  6,
  'The Galaxia Team',
  '2026-09-14T13:00:00Z'
),
(
  -- FOUNDER-REVIEW: authored post 5 title, dek, body.
  'reading-chart-of-someone-who-died',
  $title5$Reading the Chart of Someone Who Has Died$title5$,
  $dek5$The natal chart does not expire. It is a record of how someone was built. After a loss, some people find that record worth having.$dek5$,
  'guides',
  $body5$When someone dies, people reach for the things that do not blur. Photos and recordings. Objects they touched. The specific things they said that you did not write down and are already starting to lose the texture of. You want something that stays true.

A natal chart is one of the things that stays true. The chart drawn for the moment of someone's birth remains exactly what it was. If your father had Venus in Pisces and Mercury in Gemini and a Scorpio moon, those things are still true. The placements do not change when the person does. The chart is a record of how someone was put together, and grief often wants exactly that: something specific and accurate rather than soft and impressionistic.

This is not a memorial in the software sense yet. You can generate a natal chart for anyone from a birth date and a location, including someone who has died, without creating an account. That is the [free chart](/chart). Inside Galaxia, a memorial profile is a different object: their star stays in your constellation, not hidden, not archived, not converted into a generic flag. [Nobody's astrology app has your grandmother in it](/nobody-has-your-grandmother) is the piece about why that exists. This post is about reading the chart itself.

## What you can do with it

Reading a deceased person's chart is not fortune-telling. There is no future to predict. What you are looking at is a description of how that person was wired, what they reached toward, what they pulled back from, where they held tension and where they found ease. This is the same thing the chart tells you about a living person, except now the purpose is understanding rather than navigation.

And that kind of understanding is often exactly what grief is looking for. Grief does not only miss a person. It also often has unfinished questions about them. Why they were the way they were. What they were carrying. Where the distance between you came from and whether it meant what it seemed to mean at the time.

A chart cannot close those questions. It can make some of them more precise. Precision is sometimes easier to sit with than a blur.

## On reading the difficult things

If your mother was emotionally withholding in ways that hurt you, and you look at her chart and find Saturn conjunct her moon, you are seeing the architecture of that. Saturn on the moon often marks a person who learned very early that their own emotional needs were inconvenient, or unsafe, or too much. They contained themselves, and containing was the only tool they had when you brought your needs to them. The chart does not excuse the harm. But it explains the mechanism, and the mechanism is not the same as a choice made against you.

If the contact between you was Moon square Saturn, that architecture had a second half: your moon meeting their Saturn, or theirs meeting yours. The family version of that aspect is its own reading. The chart still does not assign fault.

If your grandfather was the person in the family who knew how to sit in silence without filling it, and you never quite knew why that felt safe when almost nothing else did, and his chart shows a Taurus sun with moon in Capricorn, there is the structure of what you felt from him. He was built for patience and for solidity. It was not a decision he made. It was how he was assembled.

You can also read the good things this way, and there is something specific about seeing in a chart the placement that explains why someone always knew what to say, or why they were so good at staying calm, or why they made a room feel safe. The chart does not make you miss them less. But it gives you a way to think about them that is precise rather than vague, and precision can sometimes hold better than memory alone.

## Reading the synastry

You can also look at the synastry between your chart and a deceased person's, which maps the contacts between both natal charts and shows you where your wiring aligned and where it was in friction. This can be clarifying in ways that go beyond understanding the other person.

Grief has a specific shape, and that shape is often not only about who the person was but about who they were to you specifically. The synastry shows you the architecture of that particular relationship: where you understood each other without trying, and where you were always translating, and what the dynamics were that neither of you named while you had the chance. Some people find that information useful. It can locate things that have been vague and give them a shape that is easier to work with.

[What a synastry chart actually tells you](/synastry-chart-meaning) is the method. The same flows and catches apply. The difference is only that one of the two people is no longer here to have the conversation the chart might have made easier. That is not a reason to avoid the chart. It is sometimes the reason to finally look at it.

If you want that comparison, [run both charts together](/chart/compare). You need two birth dates. Times help. They are not required to start.

## On what the chart cannot do

None of this is about reaching the person. The chart connects you to how they were made, not to where they are. Readings that claim to make contact with the dead through astrology are making claims the chart cannot support, and it is worth being clear about that distinction. The chart is a record. It describes the person who existed. It does not speak for them or represent them after the fact.

It cannot tell you what they would have said. It cannot settle an argument you did not get to finish. It cannot turn a hard parent into a soft one in retrospect. If you find yourself asking the chart to do those jobs, you are past what the data contains. Galaxia will not fill that gap with a generated goodbye.

What it can do is give you a rigorous and specific way to think about someone who mattered to you, using real information rather than idealized memory or the noise that grief sometimes adds to recollection. For some people, in some seasons of loss, that is worth having.

## A practical note

You can run a natal chart for any person, including someone who has died. The chart requires a birth date and a birth location. A birth time gives you more precision on some placements, particularly the rising sign and the house positions, but the chart is readable and useful without it. If you do not have the time, you still have the sun, the moon if the date is enough to place it, the outer planets, and most of what matters for understanding the person. If the moon is near a sign boundary and the time is unknown, the honest output is that the moon could be either sign. Galaxia will say that rather than pick one.

[Generations](/generations) is the family layer this kind of reading belongs to: parents, grandparents, the people you did not choose and still carry. Vela is included in the subscription and never charged per message. Ask it about a specific placement in a chart you have already computed. It will not invent a conversation with the dead.

You can generate a full natal chart for anyone from a birth date and location at the [free chart](/chart). If you are looking for a way to understand someone you have lost, or to see how your charts connected, that is a place to start.
$body5$,
  'published',
  6,
  'The Galaxia Team',
  '2026-09-14T14:00:00Z'
),
(
  -- FOUNDER-REVIEW: authored post 6 title, dek, body.
  'compatibility-scores-wrong-question',
  $title6$Why Compatibility Scores Are the Wrong Question$title6$,
  $dek6$A compatibility percentage grades two types of people. It tells you almost nothing about the two specific people you are thinking about.$dek6$,
  'debunked',
  $body6$A compatibility score works like this: you enter two signs, the algorithm compares how those types tend to get along, and you get a number. Some versions are more sophisticated, adding moon signs or rising signs to the calculation. The premise remains the same. You get a grade.

The problem is that the grade is answering a question about categories rather than about you. There are twelve sun signs. A calculator that tells you Aries and Scorpio have 60% compatibility is making a statistical claim about twelve categories of people, which is to say it is saying something about roughly 700 million individuals based on one fact about each of them. The claim is almost empty by the time it reaches you.

This is also why you have almost certainly known couples who should not work by any compatibility metric and do, and couples who check every box and do not. The score is about the types. The people are not the types.

## What synastry actually does

Synastry is the practice of comparing two full natal charts. Not two sun signs. Two complete charts, with every placement and every contact between them. What you are reading is not a grade but a map: here is where your wiring runs parallel to theirs, here is where it runs perpendicular, here is where your Saturn lands on their moon and what that generates, here is where their Venus touches your Jupiter and why some things between you have always felt easy without either of you knowing why.

This is not a compatibility score. It is a description of the terrain. And knowing the terrain is more useful than a grade because the terrain tells you what to expect and where the work is, rather than whether to proceed at all.

[What a synastry chart actually tells you](/synastry-chart-meaning) is the method: flows and catches, and why the easy parts deserve to be named first. [Seven synastry aspects that shape how a relationship feels](/synastry-aspects-explained) is the close reading of specific contacts. This post is about why the number was the wrong object in the first place.

## The things that actually predict whether a relationship works

How two people handle conflict is more predictive of long-term outcomes than any compatibility percentage. The chart shows this through Mars: both people's Mars placements describe how each one handles friction, and the contacts between those Mars positions describe what happens when the two friction styles meet in the same room.

Two people with Mars in Libra both tend to avoid direct conflict. In one scenario, this means small things never get addressed until they are large. In another, it means two people who are both diplomatic and both willing to find common ground. Context and choice shape which version you get. The chart tells you the wiring. It does not decide the outcome.

Mars in Aries and Mars in Capricorn in the same relationship often means quick, hot conflict that resolves fast on one side and controlled, strategic friction that resolves slowly on the other. Neither is better. They are different engines that need different approaches to keep from frustrating each other.

None of this is a score. It is two descriptions that you can actually use.

## The moon contacts

How two people process emotional need is the other major factor, and it lives in the moon contacts. The aspects between two moons tell you whether emotional life in the relationship feels like a shared language or a translation problem. Moon conjunct moon or moon trine moon tends to mean people who understand each other's emotional responses without much effort. Moon square moon tends to mean they are in friction there, and the friction is often the kind where both people are responding to something real but not quite to the same thing.

This does not make moon square moon relationships unworkable. It means they require more translation than moon trine moon relationships, and knowing that is more useful than being surprised by it.

If one moon is also square the other person's Saturn, the translation problem has a harder edge. That contact has its own family reading, and it shows up in partnerships too. The point here is the same: name the contact. Do not average it into a percentage.

## Sun contacts and recognition

The aspects between two suns describe recognition: whether each person sees the other clearly, whether they feel seen in return, whether they are in some sense oriented toward the same things. Strong sun contacts tend to produce relationships where each person feels the other is fundamentally comprehensible. Weak or challenging sun contacts tend to produce relationships where people feel slightly opaque to each other, where they like each other but cannot quite explain why or what the other person is doing in a given moment.

Neither configuration is automatically good or bad. Relationships between people who are too similar can lack the kind of difference that produces growth. Relationships between people who cannot quite read each other can be interesting and friction-generating in ways that lead somewhere. The map tells you what you are working with. It does not tell you what to do with it.

A sun-sign compatibility table cannot see any of this. Two Leos can have a trine between their moons and a square between their Mars placements, or the reverse, and those two relationships will not feel like each other. [Your sun sign is not your personality](/sun-sign-not-personality) for one person. It is even less of a relationship.

## What "compatible" usually means and what you probably want

In most compatibility frameworks, compatible means similar. Similar enough that less translation is required, that fewer things need to be worked out, that the baseline is easier. And low-friction is genuinely valuable. But friction is not the same as incompatibility, and that distinction matters.

Most people do not actually want the absence of friction. They want friction they can navigate. They want to know where the hard parts are and why, so that when those parts surface it feels like information rather than evidence that something is fundamentally wrong. That is the question synastry can actually answer.

Not: are we compatible? But: what does this look like between us, and where do we have to work harder than average? The second question is more honest and more useful. It is also the question the chart is actually built to answer.

Galaxia will not answer the first question for you. A natal chart does not decide a life, and a synastry chart does not decide a relationship. [What a chart cannot tell you](/what-a-chart-cannot-tell-you) is the longer list. "Will this work" belongs on it.

## On the six dynamics that define a relationship

The most revealing contacts in a synastry are the ones between Mars and Mars, moon and moon, sun and sun, Venus and Venus, and the significant cross-aspects: one person's Saturn to the other's personal planets, one person's moon to the other's Venus, the contacts that describe how care gets expressed and whether it lands.

None of these produce a score you should trust as a verdict. Together, they produce a picture of two specific people and how their wiring interacts in practice. That picture is worth more than any percentage, because percentages average out exactly the details that matter.

The [free comparison](/chart/compare) shows you the contacts between two full natal charts with plain descriptions of each one. Flows, catches, and the terrain between two people. Vela is included in the subscription and never charged per message; it can walk a specific contact without inventing a grade. Not a substitute for the two of you. A map of where the terrain is going to ask something of you.
$body6$,
  'published',
  6,
  'The Galaxia Team',
  '2026-09-14T15:00:00Z'
)
on conflict (slug) do nothing;

-- FOUNDER-REVIEW: reciprocal sentences added to nobody-has-your-grandmother.
update public.posts
set
  body = replace(
    body,
    $needle1$Every person you add gets a full, real, computed chart, the same as your own, and the app treats every one of those charts as a first-class citizen, not a guest star in your personal horoscope.$needle1$,
    $repl1$Every person you add gets a full, real, computed chart, the same as your own, and the app treats every one of those charts as a first-class citizen, not a guest star in your personal horoscope.

The moon is often the first placement worth reading between a parent and a child. [What your mother's moon sign says about how she says sorry](/mothers-moon-sign-apology) is that translation.$repl1$
  ),
  updated_at = now()
where slug = 'nobody-has-your-grandmother'
  and body like $like1$%guest star in your personal horoscope.%$like1$
  and body not like $not1$%/mothers-moon-sign-apology%$not1$;

update public.posts
set
  body = replace(
    body,
    $needle2$It turns "why am I feeling this way right now" into "oh, this is a family season," which is often the more honest and more useful question.$needle2$,
    $repl2$It turns "why am I feeling this way right now" into "oh, this is a family season," which is often the more honest and more useful question. The same outer-planet layer shows up at work: [the colleague you cannot read](/colleague-you-cannot-read).$repl2$
  ),
  updated_at = now()
where slug = 'nobody-has-your-grandmother'
  and body like $like2$%this is a family season,%$like2$
  and body not like $not2$%/colleague-you-cannot-read%$not2$;

update public.posts
set
  body = replace(
    body,
    $needle3$You can still look at where your Moon sat against theirs.$needle3$,
    $repl3$You can still look at where your Moon sat against theirs. If you want a slower walk through that, [reading the chart of someone who has died](/reading-chart-of-someone-who-died) is the companion piece.$repl3$
  ),
  updated_at = now()
where slug = 'nobody-has-your-grandmother'
  and body like $like3$%where your Moon sat against theirs.%$like3$
  and body not like $not3$%/reading-chart-of-someone-who-died%$not3$;

-- FOUNDER-REVIEW: reciprocal sentence added to synastry-aspects-explained.
update public.posts
set
  body = replace(
    body,
    $needle4$a parent's Saturn meeting a child's Moon is a familiar version of this exact dynamic, often carried for decades before anyone has language for it.$needle4$,
    $repl4$a parent's Saturn meeting a child's Moon is a familiar version of this exact dynamic, often carried for decades before anyone has language for it. The family version of this aspect is its own essay: [Moon square Saturn between a parent and a child](/moon-square-saturn-parent-child).$repl4$
  ),
  updated_at = now()
where slug = 'synastry-aspects-explained'
  and body like $like4$%a parent's Saturn meeting a child's Moon%$like4$
  and body not like $not4$%/moon-square-saturn-parent-child%$not4$;

-- FOUNDER-REVIEW: reciprocal sentence added to sun-sign-not-personality.
update public.posts
set
  body = replace(
    body,
    $needle5$You were never a bad fit for astrology. You were being handed 1/40th of your own chart and asked to recognize yourself in it. Of course it didn't always land.$needle5$,
    $repl5$You were never a bad fit for astrology. You were being handed 1/40th of your own chart and asked to recognize yourself in it. Of course it didn't always land.

For a fuller list of what a natal chart will never answer, see [what a chart cannot tell you](/what-a-chart-cannot-tell-you).$repl5$
  ),
  updated_at = now()
where slug = 'sun-sign-not-personality'
  and body like $like5$%You were never a bad fit for astrology.%$like5$
  and body not like $not5$%/what-a-chart-cannot-tell-you%$not5$;

-- FOUNDER-REVIEW: reciprocal sentence added to synastry-chart-meaning.
update public.posts
set
  body = replace(
    body,
    $needle6$For that person, "are we compatible" is the wrong question. It has already been answered, by years of evidence. Here is the better one.$needle6$,
    $repl6$For that person, "are we compatible" is the wrong question. It has already been answered, by years of evidence. Here is the better one. [Why compatibility scores are the wrong question](/compatibility-scores-wrong-question) takes that argument further.$repl6$
  ),
  updated_at = now()
where slug = 'synastry-chart-meaning'
  and body like $like6$%are we compatible" is the wrong question.%$like6$
  and body not like $not6$%/compatibility-scores-wrong-question%$not6$;
