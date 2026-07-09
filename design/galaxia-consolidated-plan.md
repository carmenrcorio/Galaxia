# Galaxia — Consolidated Plan (post-audit, 9 July 2026)

Two independent audits. Every claim below was cross-checked against the code. Findings marked **VERIFIED** were confirmed in the repo or by direct computation. Findings marked **REPORTED** come from an auditor's live session and are credible but not yet code-confirmed.

---

## What the audits agreed on

Both, independently:

1. **There is no paywall. The product cannot accept money.** `/pricing` 404s. No Stripe. No trial UI. Nothing to convert into.
2. **Freemium remnants are live and actively sell a cheaper product.** Settings reads *"You're on the Free plan — up to 5 people and 12 Vela messages per day"* plus a *"Galaxia+ — coming soon"* card. Account shows *"Current plan: Free."* `/welcome` shows *"Free plan · 0 people remaining."* One auditor named this the single biggest reason a trial user will not convert: **they believe they're already on a permanent free plan.**
3. **The marketing site contradicts the product.** Nav still says "Request early access." The FAQ still says *"We're building it now, for iOS and Android."* Meanwhile the live app gates real accounts at five people.
4. **The chart is incomplete versus CHANI at $11.99.** Missing Chiron, North/South Node, Lilith, Descendant, retrograde flags, chart shape, and any forward transit view. CHANI publishes all of those by name.
5. **The product is near-useless with one person, and nothing nudges the second add.** Estimates of trial users who never add a second person: 25–40% and 40–55%. This is the number that decides whether the business works.
6. **Pricing is right.** $9.99/mo, $89/yr, one tier, annual pre-selected. Both endorsed it. Both agreed never to gate on number of people. Both said $4.99 would signal "horoscope toy."
7. **Compare and Vela are the product.** Both auditors found the synthesis layer genuinely good and chart-grounded. One verified Vela cited real placements rather than filler. Both found the raw chart data screens inert by comparison.
8. **The minor-safety gate works.** Verified live: switching focus to a minor returns the block message. This was a real failure last week; it is fixed.

---

## The single most damaging finding (VERIFIED in code)

**House cusps are labeled Placidus and are actually Equal House.**

`packages/astro/src/index.ts`, `computeCusps()`:
```js
// Equal-house fallback keeps deterministic behavior until full Placidus implementation is added.
return Array.from({ length: 12 }, (_, idx) => normalizeZodiacLongitude(ascLon + idx * 30));
```
The UI renders `"Natal wheel · Placidus"`. The chart write sets `house_system: "placidus"`.

An auditor cross-checked a real chart against Cafe Astrology: Sun, Moon, Ascendant, MC and every aspect orb matched to within arc-minutes — the engine is genuinely accurate — but **every house cusp sat at exactly 16°01′**, the Equal House signature. True Placidus for that chart ranges 12°03′ to 18°12′. On this chart no planet flipped houses by luck; on other latitudes it will.

This is not a rounding error. It is a false claim about method, in a product whose entire promise is "real astrology, real data, never guessed."

**It is also the fourth instance of the same failure pattern:**
- Year-only births silently computed for **July 1**.
- Missing timezone silently treated as **UTC** (the code comment called it "the old (wrong) behavior").
- Ambiguous city silently geocoded to the **first result** (Jacksonville, Florida instead of Arkansas).
- Equal House silently labeled **Placidus**.

**The rule this product needs, written into ENGINEERING.md:** *Galaxia never fabricates. Where the data or the method is not what we claim, we say so, or we do not show it.*

---

## Also verified / reported

- **REPORTED, high confidence:** on the natal wheel, opposite zodiac glyphs render at identical coordinates (Virgo and Pisces both at 24.0, 152.3), so one sign silently sits under another and only 11 of 12 are legible. Auditor inspected the live SVG DOM across three charts. The glyph placement math in `person/[id]/page.tsx` should be checked.
- **REPORTED:** the wheel renders ~220px wide with no zoom; on a chart with a stellium (yours has five bodies in one 20° arc) the planet glyphs are illegible.
- **REPORTED:** no aspect-glyph legend anywhere on the chart page.
- **REPORTED:** Groups requires clicking "Generate cohort overlay" twice.
- **REPORTED:** the `/welcome` hour dropdown renders options as `22:xx`, which reads as a bug.
- **REPORTED:** `/download` says "iOS coming soon" and is linked from `/signup`, creating doubt the product exists.
- **VERIFIED by cross-check:** Sun, Moon, Ascendant, MC and aspect orbs match Cafe Astrology to within arc-minutes. **The engine is correct.** Only the house system and the missing points are wrong.

---

## The plan, in order

Sequencing rule: fix what makes us liars, then what stops us taking money, then what stops people activating. Craft last.

### Phase 0 — Stop fabricating (2–3 days)

Nothing else matters if the product lies.

1. **Implement real Placidus.** Standard iterative algorithm from RAMC, obliquity, and geographic latitude. Pure TypeScript, no new dependency. Also offer Whole Sign and Equal as explicit user choices in Settings. Display the actual system in use.
2. Until Placidus ships, **relabel the UI honestly** ("Equal House") rather than continue the false claim. Ship the relabel the same day you read this.
3. **Add a regression test** against Cafe Astrology's cusps for a known chart (1987-12-29, 22:30, Little Rock AR: 2nd cusp 12°03′49″ Libra, 3rd 12°03′38″ Scorpio, 5th 17°21′50″ Capricorn, 6th 18°12′01″ Aquarius). Test against **external ground truth**, never the engine's own output.
4. **Audit for other fabrications.** Search the codebase for silent fallbacks and TODO comments that ship as fact. Every one either becomes honest or gets removed.

### Phase 1 — Make it possible to pay (1 week)

This is the only thing standing between the product and revenue.

5. Execute `design/galaxia-pricing-implementation-spec.md`: remove every freemium remnant, add the trial state model, build the paywall from `design/galaxia-pricing-copy.md`, wire Stripe, one-click cancel.
6. Fix the marketing site: "Request early access" → **"Start 14 days free."** Rewrite the FAQ answer "When can I use it?" to *"Available now on the web. iOS and Android are in development."* Add the pricing section. Remove or reframe the `/download` link from `/signup`.
7. Communicate the model on `/signup`: *"14 days, everything included. Cancel in one click."*

**Amendment to the pricing spec, on card-required.** One auditor argued persuasively: card-required trials convert at 60–80% vs 15–25% card-optional, but a brand new product with a privacy-first promise and zero social proof cannot overcome the trust barrier of asking for a card before showing value. **Decision: card-optional for the first 90 days**, then switch once there are 200+ testimonials. Ask for the card at trial end, not at signup. Update the spec accordingly.

**Amendment:** cap founding members at **300, not 500**, so the scarcity is real. 300 × $149 = $44,700. Use it to fund Phase 2 and 3.

### Phase 2 — Activation: get the second person in (1 week)

Both audits: the product is inert with one person, and 25–55% never add a second. Nothing currently prompts them. This is the number that decides the business.

8. **Immediately after the self-profile saves**, show a full-screen moment: *"Who do you want to understand better?"* with one prominent add-person action. Not a link buried on a dashboard.
9. **Ship the day-4 one-person email branch first** (`design/galaxia-pricing-copy.md` §3). A trial user with one person will not convert. This email is the highest-leverage asset in the funnel.
10. **Reduce second-person friction.** Allow name + relationship first, birth data later. Let the person save an incomplete profile and finish it. Add an "ask them for their birth time" shareable link.
11. **Teach Compare before first use.** It currently renders nothing until you click "Run comparison," so a first-timer doesn't know what they're about to get. Show an empty state that explains the relationship-type selector and what each type changes.
12. **Set expectations on data entry.** Say plainly that exact time unlocks houses and rising, and that a date or even a year still works. The graceful-degradation design is the best anti-friction decision in the product; it just isn't surfaced early enough.

### Phase 3 — Earn the $9.99 (1–2 weeks)

CHANI ships nodes, Chiron, Lilith, MC/IC/DC at $11.99. We're priced under them and missing all of it.

13. **Chiron, North & South Node (True Node), Lilith, Descendant, IC.** Nodes and Lilith are formula-based; Chiron via an embedded ephemeris data table (keeps the MIT/no-AGPL stance). See `design/galaxia-natal-chart-standard.md`.
14. **Retrograde flags.** The engine already computes `retro: boolean` and the UI never shows it. Add `℞`. This is nearly free.
15. **Element and modality balance readings**, stelliums (already shipped and good), chart shape.
16. **A forward transit view.** One line of "Today in your sky" is not a reason to open the app on day 9.

### Phase 4 — The habit loop (1 week)

There is no return reason after onboarding. The correct loop for this product is *a real-world trigger*, never a daily horoscope.

17. **Birthday alerts.** *"It's Rosa's birthday this week"* → her chart, her solar return, and one Vela prompt about tending that bond. Intentional, relational, not engagement farming. This is the single best-fitting habit mechanic for the thesis.
18. **Transit-triggered nudges tied to a named person.** *"Mercury retrograde is touching your bond with Daniel this week — here's one thing to try."* Opt-in, weekly at most.
19. Never: streaks, leaderboards, daily horoscope feed, or a per-person score as a headline.

### Phase 5 — Craft (ongoing)

20. **Fix the wheel glyph collision** (opposite signs at identical coordinates), add zoom-to-fullscreen, de-cluster stacked planets with radial offset or leader lines, and add an aspect-glyph legend.
21. Fix the Groups double-click bug. Fix the `22:xx` hour labels. Fix the `/welcome` counter copy.
22. Constellation layout at scale: five nodes look elegant; twenty must too, and "unlimited people" is now a pricing promise.

---

## What to protect

Both auditors, unprompted, named the same three things.

- **The voice.** The hand-written interpretation library is the moat. "Built, not given" instead of "Core identity · disciplined." No competitor made this choice. Never let it be replaced by LLM output under cost pressure.
- **The privacy architecture.** Private notes, the minor gate, one-click cancel. In a category whose 1-star reviews are dominated by hostile offboarding and surprise charges, decency is a marketing asset. Say it on the paywall.
- **The generational layer.** No competitor includes ancestors from a birth year alone. Put it in every marketing sentence.

## What kills this

Not competition. **Activation.** A beautiful, accurate, private product that a trial user never engages deeply enough to feel is worse than a shallow one they do, because you spent the engineering and lost the customer anyway. If the median trial user does not get a Vela answer that names something true about a real relationship by day 7, they will not convert.

Phase 2 is therefore not a polish phase. It is the business.

## Immediate next three actions

1. Relabel "Placidus" → "Equal House" today. One string. Stop lying while you build the real thing.
2. Send Cursor the Phase 0 prompt (real Placidus + the external regression test).
3. Send Cursor `design/galaxia-pricing-implementation-spec.md` with the card-optional and 300-founder amendments.
