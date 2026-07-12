# Founder-review strings

Collected agent-authored copy marked for founder voice rewrite. **Do not treat this file as a rewrite** — it is an inventory. Source `FOUNDER-REVIEW` markers are left in place.

## Markers searched

Searched the entire repo (case-insensitive where noted) for:

- `FOUNDER-REVIEW` (canonical — all app-source hits)
- `FOUNDER_REVIEW`
- `founder review` / `founder-review` / `founder_review`
- `TODO(founder)` / `TODO(FOUNDER)`
- `@founder`
- Near-variants: `refine voice`, `authored placeholder`

**App-source hits only in:** `apps/web/lib/compare-guidance.ts`, `apps/web/lib/transit-interpretations.ts`, `apps/web/app/welcome/page.tsx`.

**No hits in:** remembrance, mobile, packages, or other web surfaces. Changelog fragments mention the marker convention but are not user-facing strings.

## Totals

- **Total flagged strings:** 277
- **Compare guidance:** 176
- **Transit explanations:** 77
- **Onboarding:** 24
- **Remembrance:** 0 (no `FOUNDER-REVIEW` markers)
- **Other areas:** 0

Duplicate content under two relation keys (e.g. `partners` and `romantic` sharing the same flows/catches text) is listed **once per source entry** so each key can be cleared independently.

Onboarding JSX `{/* FOUNDER-REVIEW … */}` comments re-flag render sites that already read from the `COPY` object marked at line 36 — those strings are collected **once** from `COPY`.

---

## Compare guidance (176)

### Moon how-to-deliver (MOON_HOW) (12)

#### 1. Compare guidance, all relationship types — Moon how-to-deliver (Aries)

- **File:** `apps/web/lib/compare-guidance.ts:182`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Aries; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
match their pace when it spikes — move on it in the moment, then let them cool without a post-mortem
```

#### 2. Compare guidance, all relationship types — Moon how-to-deliver (Taurus)

- **File:** `apps/web/lib/compare-guidance.ts:183`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Taurus; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
keep the plan you already made; the follow-through itself is the reassurance, more than any words
```

#### 3. Compare guidance, all relationship types — Moon how-to-deliver (Gemini)

- **File:** `apps/web/lib/compare-guidance.ts:184`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Gemini; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
talk it through out loud with them, even the half-formed parts — for them the conversation IS the comfort
```

#### 4. Compare guidance, all relationship types — Moon how-to-deliver (Cancer)

- **File:** `apps/web/lib/compare-guidance.ts:185`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Cancer; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
say the bond is safe before you raise the hard thing, so a boundary doesn't read as a door closing
```

#### 5. Compare guidance, all relationship types — Moon how-to-deliver (Leo)

- **File:** `apps/web/lib/compare-guidance.ts:186`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Leo; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
name the specific thing you admire, out loud and where others can hear — not \"good job\" but the actual detail
```

#### 6. Compare guidance, all relationship types — Moon how-to-deliver (Virgo)

- **File:** `apps/web/lib/compare-guidance.ts:187`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Virgo; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
notice one small practical thing they did and thank them for it by name; the noticing lands harder than praise
```

#### 7. Compare guidance, all relationship types — Moon how-to-deliver (Libra)

- **File:** `apps/web/lib/compare-guidance.ts:188`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Libra; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
invite instead of instruct, and let them weigh in before you decide — being consulted is how they feel safe
```

#### 8. Compare guidance, all relationship types — Moon how-to-deliver (Scorpio)

- **File:** `apps/web/lib/compare-guidance.ts:189`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Scorpio; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
give them the unvarnished version even when a softer one is available; the honesty is the intimacy
```

#### 9. Compare guidance, all relationship types — Moon how-to-deliver (Sagittarius)

- **File:** `apps/web/lib/compare-guidance.ts:190`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Sagittarius; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
give them room and a clear exit, then trust them to come back — holding loosely is the reassurance
```

#### 10. Compare guidance, all relationship types — Moon how-to-deliver (Capricorn)

- **File:** `apps/web/lib/compare-guidance.ts:191`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Capricorn; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
let them run it their own way first, and praise the effort over the talent; respect is how they read love
```

#### 11. Compare guidance, all relationship types — Moon how-to-deliver (Aquarius)

- **File:** `apps/web/lib/compare-guidance.ts:192`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Aquarius; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
give them space to process alone before you ask them to close the distance — don't chase the pause
```

#### 12. Compare guidance, all relationship types — Moon how-to-deliver (Pisces)

- **File:** `apps/web/lib/compare-guidance.ts:193`
- **Appears:** Appears in Compare “what they need” when this person’s Moon is Pisces; appended after the Moon need line as “To actually give it: …”.
- **Exact string:**

```
mind your tone over your words, and let them feel heard before you move to fixing it
```

### Venus how-to-show (VENUS_HOW) (12)

#### 13. Compare guidance, romantic/partners — Venus how-to-show (Aries)

- **File:** `apps/web/lib/compare-guidance.ts:198`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Aries; “The way to show it: …”.
- **Exact string:**

```
pursue directly — choose them out loud instead of waiting to be chosen
```

#### 14. Compare guidance, romantic/partners — Venus how-to-show (Taurus)

- **File:** `apps/web/lib/compare-guidance.ts:199`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Taurus; “The way to show it: …”.
- **Exact string:**

```
make it tangible: unhurried time, a made meal, the seat kept for them
```

#### 15. Compare guidance, romantic/partners — Venus how-to-show (Gemini)

- **File:** `apps/web/lib/compare-guidance.ts:200`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Gemini; “The way to show it: …”.
- **Exact string:**

```
keep the conversation alive — a genuinely curious question reads as a love letter
```

#### 16. Compare guidance, romantic/partners — Venus how-to-show (Cancer)

- **File:** `apps/web/lib/compare-guidance.ts:201`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Cancer; “The way to show it: …”.
- **Exact string:**

```
fold them into ordinary life — the errand, the small plan — that domestic inclusion is the intimacy they feel
```

#### 17. Compare guidance, romantic/partners — Venus how-to-show (Leo)

- **File:** `apps/web/lib/compare-guidance.ts:202`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Leo; “The way to show it: …”.
- **Exact string:**

```
appreciate them in front of others, not only in private; witnessed warmth is the real thing
```

#### 18. Compare guidance, romantic/partners — Venus how-to-show (Virgo)

- **File:** `apps/web/lib/compare-guidance.ts:203`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Virgo; “The way to show it: …”.
- **Exact string:**

```
let them see you noticed the details of their effort, and name them one by one
```

#### 19. Compare guidance, romantic/partners — Venus how-to-show (Libra)

- **File:** `apps/web/lib/compare-guidance.ts:204`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Libra; “The way to show it: …”.
- **Exact string:**

```
return the gesture evenly — they give generously and need to feel it come back
```

#### 20. Compare guidance, romantic/partners — Venus how-to-show (Scorpio)

- **File:** `apps/web/lib/compare-guidance.ts:205`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Scorpio; “The way to show it: …”.
- **Exact string:**

```
give them your full, undistracted presence — depth over frequency
```

#### 21. Compare guidance, romantic/partners — Venus how-to-show (Sagittarius)

- **File:** `apps/web/lib/compare-guidance.ts:206`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Sagittarius; “The way to show it: …”.
- **Exact string:**

```
share an actual adventure instead of only offering stability — go somewhere with them
```

#### 22. Compare guidance, romantic/partners — Venus how-to-show (Capricorn)

- **File:** `apps/web/lib/compare-guidance.ts:207`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Capricorn; “The way to show it: …”.
- **Exact string:**

```
show up consistently over time; here the reliability IS the romance
```

#### 23. Compare guidance, romantic/partners — Venus how-to-show (Aquarius)

- **File:** `apps/web/lib/compare-guidance.ts:208`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Aquarius; “The way to show it: …”.
- **Exact string:**

```
protect their freedom inside the bond — don't make closeness cost their independence
```

#### 24. Compare guidance, romantic/partners — Venus how-to-show (Pisces)

- **File:** `apps/web/lib/compare-guidance.ts:209`
- **Appears:** Appears under partner/romantic lenses when warmth is low and Venus is Pisces; “The way to show it: …”.
- **Exact string:**

```
offer sincere tenderness over grand gestures — the small true thing lands deepest
```

### Mercury in-practice (MERCURY_HOW) (12)

#### 25. Compare guidance, siblings/friends — Mercury in-practice (Aries)

- **File:** `apps/web/lib/compare-guidance.ts:214`
- **Appears:** Appears for siblings/friends when Mercury is Aries; appended as “In practice: …”.
- **Exact string:**

```
get to the point fast and skip the wind-up — they hear directness as respect
```

#### 26. Compare guidance, siblings/friends — Mercury in-practice (Taurus)

- **File:** `apps/web/lib/compare-guidance.ts:215`
- **Appears:** Appears for siblings/friends when Mercury is Taurus; appended as “In practice: …”.
- **Exact string:**

```
give them time to chew on it, and don't read a slow reply as a no
```

#### 27. Compare guidance, siblings/friends — Mercury in-practice (Gemini)

- **File:** `apps/web/lib/compare-guidance.ts:216`
- **Appears:** Appears for siblings/friends when Mercury is Gemini; appended as “In practice: …”.
- **Exact string:**

```
let them think out loud without holding the drafts against them
```

#### 28. Compare guidance, siblings/friends — Mercury in-practice (Cancer)

- **File:** `apps/web/lib/compare-guidance.ts:217`
- **Appears:** Appears for siblings/friends when Mercury is Cancer; appended as “In practice: …”.
- **Exact string:**

```
watch your tone first; how you say it reaches them before what you say does
```

#### 29. Compare guidance, siblings/friends — Mercury in-practice (Leo)

- **File:** `apps/web/lib/compare-guidance.ts:218`
- **Appears:** Appears for siblings/friends when Mercury is Leo; appended as “In practice: …”.
- **Exact string:**

```
acknowledge the idea before you edit it, and never correct them in front of others
```

#### 30. Compare guidance, siblings/friends — Mercury in-practice (Virgo)

- **File:** `apps/web/lib/compare-guidance.ts:219`
- **Appears:** Appears for siblings/friends when Mercury is Virgo; appended as “In practice: …”.
- **Exact string:**

```
bring precise, specific claims — vagueness derails them faster than a hard truth
```

#### 31. Compare guidance, siblings/friends — Mercury in-practice (Libra)

- **File:** `apps/web/lib/compare-guidance.ts:220`
- **Appears:** Appears for siblings/friends when Mercury is Libra; appended as “In practice: …”.
- **Exact string:**

```
keep it fair and two-sided; drop the scorekeeping and they stay in the room
```

#### 32. Compare guidance, siblings/friends — Mercury in-practice (Scorpio)

- **File:** `apps/web/lib/compare-guidance.ts:221`
- **Appears:** Appears for siblings/friends when Mercury is Scorpio; appended as “In practice: …”.
- **Exact string:**

```
name the subtext directly — they already sense the thing you're not saying
```

#### 33. Compare guidance, siblings/friends — Mercury in-practice (Sagittarius)

- **File:** `apps/web/lib/compare-guidance.ts:222`
- **Appears:** Appears for siblings/friends when Mercury is Sagittarius; appended as “In practice: …”.
- **Exact string:**

```
give the big frame first, then the detail, and stay blunt-honest over polite
```

#### 34. Compare guidance, siblings/friends — Mercury in-practice (Capricorn)

- **File:** `apps/web/lib/compare-guidance.ts:223`
- **Appears:** Appears for siblings/friends when Mercury is Capricorn; appended as “In practice: …”.
- **Exact string:**

```
lead with the useful, load-bearing thing; they trust competence over pleasantry
```

#### 35. Compare guidance, siblings/friends — Mercury in-practice (Aquarius)

- **File:** `apps/web/lib/compare-guidance.ts:224`
- **Appears:** Appears for siblings/friends when Mercury is Aquarius; appended as “In practice: …”.
- **Exact string:**

```
let them disagree without making it personal — ideas are how they connect
```

#### 36. Compare guidance, siblings/friends — Mercury in-practice (Pisces)

- **File:** `apps/web/lib/compare-guidance.ts:225`
- **Appears:** Appears for siblings/friends when Mercury is Pisces; appended as “In practice: …”.
- **Exact string:**

```
leave room for the unspoken; not everything they mean arrives in words
```

### Saturn how-to-hold (SATURN_HOW) (12)

#### 37. Compare guidance, parent-child — Saturn how-to-hold (Aries)

- **File:** `apps/web/lib/compare-guidance.ts:230`
- **Appears:** Appears for parent-child when Saturn is Aries; appended as “How to hold it: …”.
- **Exact string:**

```
set the limit once, then let them push against it — the resistance is how they accept it
```

#### 38. Compare guidance, parent-child — Saturn how-to-hold (Taurus)

- **File:** `apps/web/lib/compare-guidance.ts:231`
- **Appears:** Appears for parent-child when Saturn is Taurus; appended as “How to hold it: …”.
- **Exact string:**

```
hold the rule consistently; the boundary that never moves is the one they trust
```

#### 39. Compare guidance, parent-child — Saturn how-to-hold (Gemini)

- **File:** `apps/web/lib/compare-guidance.ts:232`
- **Appears:** Appears for parent-child when Saturn is Gemini; appended as “How to hold it: …”.
- **Exact string:**

```
give the reason behind the rule — they follow what they understand and resent what they don't
```

#### 40. Compare guidance, parent-child — Saturn how-to-hold (Cancer)

- **File:** `apps/web/lib/compare-guidance.ts:233`
- **Appears:** Appears for parent-child when Saturn is Cancer; appended as “How to hold it: …”.
- **Exact string:**

```
make the authority feel protective, not policing — reassure while you hold the line
```

#### 41. Compare guidance, parent-child — Saturn how-to-hold (Leo)

- **File:** `apps/web/lib/compare-guidance.ts:234`
- **Appears:** Appears for parent-child when Saturn is Leo; appended as “How to hold it: …”.
- **Exact string:**

```
give them responsibility in front of others; dignity is how they take a limit
```

#### 42. Compare guidance, parent-child — Saturn how-to-hold (Virgo)

- **File:** `apps/web/lib/compare-guidance.ts:235`
- **Appears:** Appears for parent-child when Saturn is Virgo; appended as “How to hold it: …”.
- **Exact string:**

```
set clear, meetable standards — a vague expectation feels like being set up to fail
```

#### 43. Compare guidance, parent-child — Saturn how-to-hold (Libra)

- **File:** `apps/web/lib/compare-guidance.ts:236`
- **Appears:** Appears for parent-child when Saturn is Libra; appended as “How to hold it: …”.
- **Exact string:**

```
keep every rule visibly fair; an uneven rule reads to them as a broken promise
```

#### 44. Compare guidance, parent-child — Saturn how-to-hold (Scorpio)

- **File:** `apps/web/lib/compare-guidance.ts:237`
- **Appears:** Appears for parent-child when Saturn is Scorpio; appended as “How to hold it: …”.
- **Exact string:**

```
hold the boundary without a power struggle — steady, not a contest of wills
```

#### 45. Compare guidance, parent-child — Saturn how-to-hold (Sagittarius)

- **File:** `apps/web/lib/compare-guidance.ts:238`
- **Appears:** Appears for parent-child when Saturn is Sagittarius; appended as “How to hold it: …”.
- **Exact string:**

```
give the why and room to roam inside the limit; a cage just breeds escape
```

#### 46. Compare guidance, parent-child — Saturn how-to-hold (Capricorn)

- **File:** `apps/web/lib/compare-guidance.ts:239`
- **Appears:** Appears for parent-child when Saturn is Capricorn; appended as “How to hold it: …”.
- **Exact string:**

```
give them real stakes and take them seriously — they rise to high expectations, not low ones
```

#### 47. Compare guidance, parent-child — Saturn how-to-hold (Aquarius)

- **File:** `apps/web/lib/compare-guidance.ts:240`
- **Appears:** Appears for parent-child when Saturn is Aquarius; appended as “How to hold it: …”.
- **Exact string:**

```
appeal to the principle, not the hierarchy — \"because it's right\" keeps them, \"because I said so\" loses them
```

#### 48. Compare guidance, parent-child — Saturn how-to-hold (Pisces)

- **File:** `apps/web/lib/compare-guidance.ts:241`
- **Appears:** Appears for parent-child when Saturn is Pisces; appended as “How to hold it: …”.
- **Exact string:**

```
deliver firmness gently — keep the edge kind or they dissolve instead of pushing back
```

### Saturn need (SATURN_NEED) (12)

#### 49. Compare guidance, parent-child — Saturn need (Aries)

- **File:** `apps/web/lib/compare-guidance.ts:253`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Aries.
- **Exact string:**

```
structure they can push against, not a wall — set the limit, then let them test it
```

#### 50. Compare guidance, parent-child — Saturn need (Taurus)

- **File:** `apps/web/lib/compare-guidance.ts:254`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Taurus.
- **Exact string:**

```
consistency over intensity; the rule that never moves is the one they trust
```

#### 51. Compare guidance, parent-child — Saturn need (Gemini)

- **File:** `apps/web/lib/compare-guidance.ts:255`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Gemini.
- **Exact string:**

```
reasons, not decrees — they follow a boundary they understand and resent one they don't
```

#### 52. Compare guidance, parent-child — Saturn need (Cancer)

- **File:** `apps/web/lib/compare-guidance.ts:256`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Cancer.
- **Exact string:**

```
authority that feels protective, not policing; they harden when safety turns to control
```

#### 53. Compare guidance, parent-child — Saturn need (Leo)

- **File:** `apps/web/lib/compare-guidance.ts:257`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Leo.
- **Exact string:**

```
to be trusted with responsibility in front of others — dignity is how they accept limits
```

#### 54. Compare guidance, parent-child — Saturn need (Virgo)

- **File:** `apps/web/lib/compare-guidance.ts:258`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Virgo.
- **Exact string:**

```
clear standards they can actually meet; vague expectations read as being set up to fail
```

#### 55. Compare guidance, parent-child — Saturn need (Libra)

- **File:** `apps/web/lib/compare-guidance.ts:259`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Libra.
- **Exact string:**

```
fairness they can see — an inconsistent rule lands as a broken promise
```

#### 56. Compare guidance, parent-child — Saturn need (Scorpio)

- **File:** `apps/web/lib/compare-guidance.ts:260`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Scorpio.
- **Exact string:**

```
boundaries held without a power struggle; they respect strength that isn't cruelty
```

#### 57. Compare guidance, parent-child — Saturn need (Sagittarius)

- **File:** `apps/web/lib/compare-guidance.ts:261`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Sagittarius.
- **Exact string:**

```
the why behind the rule and room to roam inside it — cages breed escape
```

#### 58. Compare guidance, parent-child — Saturn need (Capricorn)

- **File:** `apps/web/lib/compare-guidance.ts:262`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Capricorn.
- **Exact string:**

```
to be taken seriously and given real stakes; they meet high expectations, not low ones
```

#### 59. Compare guidance, parent-child — Saturn need (Aquarius)

- **File:** `apps/web/lib/compare-guidance.ts:263`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Aquarius.
- **Exact string:**

```
principle over hierarchy — 'because I said so' loses them; 'because it's right' keeps them
```

#### 60. Compare guidance, parent-child — Saturn need (Pisces)

- **File:** `apps/web/lib/compare-guidance.ts:264`
- **Appears:** Appears in parent-child “what they need” when this person’s Saturn is Pisces.
- **Exact string:**

```
firmness delivered gently; they need the edge to be kind, or they dissolve rather than push back
```

### Mercury need (MERCURY_NEED) (12)

#### 61. Compare guidance, siblings/friends — Mercury need (Aries)

- **File:** `apps/web/lib/compare-guidance.ts:275`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Aries.
- **Exact string:**

```
the point first — they hear directness as respect and hedging as evasion
```

#### 62. Compare guidance, siblings/friends — Mercury need (Taurus)

- **File:** `apps/web/lib/compare-guidance.ts:276`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Taurus.
- **Exact string:**

```
time to chew on it; don't mistake a slow reply for disagreement
```

#### 63. Compare guidance, siblings/friends — Mercury need (Gemini)

- **File:** `apps/web/lib/compare-guidance.ts:277`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Gemini.
- **Exact string:**

```
to think out loud without it being held against them — half of it is drafting, not deciding
```

#### 64. Compare guidance, siblings/friends — Mercury need (Cancer)

- **File:** `apps/web/lib/compare-guidance.ts:278`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Cancer.
- **Exact string:**

```
tone read before content; how you say it lands harder than what you say
```

#### 65. Compare guidance, siblings/friends — Mercury need (Leo)

- **File:** `apps/web/lib/compare-guidance.ts:279`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Leo.
- **Exact string:**

```
to feel heard, not corrected in front of others — praise the idea before you edit it
```

#### 66. Compare guidance, siblings/friends — Mercury need (Virgo)

- **File:** `apps/web/lib/compare-guidance.ts:280`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Virgo.
- **Exact string:**

```
precision — sloppy claims derail them faster than hard truths do
```

#### 67. Compare guidance, siblings/friends — Mercury need (Libra)

- **File:** `apps/web/lib/compare-guidance.ts:281`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Libra.
- **Exact string:**

```
the conversation kept fair; they shut down when it tips into winning and losing
```

#### 68. Compare guidance, siblings/friends — Mercury need (Scorpio)

- **File:** `apps/web/lib/compare-guidance.ts:282`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Scorpio.
- **Exact string:**

```
the real subtext named — they already sense the thing you're not saying
```

#### 69. Compare guidance, siblings/friends — Mercury need (Sagittarius)

- **File:** `apps/web/lib/compare-guidance.ts:283`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Sagittarius.
- **Exact string:**

```
the big frame before the detail, and honesty even when it's blunt
```

#### 70. Compare guidance, siblings/friends — Mercury need (Capricorn)

- **File:** `apps/web/lib/compare-guidance.ts:284`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Capricorn.
- **Exact string:**

```
useful over pleasant; they trust the person who tells them the load-bearing thing
```

#### 71. Compare guidance, siblings/friends — Mercury need (Aquarius)

- **File:** `apps/web/lib/compare-guidance.ts:285`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Aquarius.
- **Exact string:**

```
room to disagree without it being personal — ideas are how they connect
```

#### 72. Compare guidance, siblings/friends — Mercury need (Pisces)

- **File:** `apps/web/lib/compare-guidance.ts:286`
- **Appears:** Appears in siblings/friends “what they need” when this person’s Mercury is Pisces.
- **Exact string:**

```
space for the unspoken; not everything they mean arrives in words
```

### Relationship aspect framing (RELATION_ASPECT_FRAME) (14)

#### 73. Compare guidance, partners, easy/flowing aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:300`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
reads as easy attraction — wanting and warmth point the same way, so closeness needs no translation.
```

#### 74. Compare guidance, partners, hard/catching aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:301`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is where desire and reassurance move at different speeds; say the tender thing out loud before it turns into scorekeeping.
```

#### 75. Compare guidance, romantic, easy/flowing aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:304`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
reads as easy attraction — wanting and warmth point the same way, so closeness needs no translation.
```

#### 76. Compare guidance, romantic, hard/catching aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:305`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is where desire and reassurance move at different speeds; say the tender thing out loud before it turns into scorekeeping.
```

#### 77. Compare guidance, parent-child, easy/flowing aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:308`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is a channel of felt safety — support and steadiness reach the child without a fight.
```

#### 78. Compare guidance, parent-child, hard/catching aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:309`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is where care can land as control; see the plan before you correct it, and offer autonomy with backup.
```

#### 79. Compare guidance, siblings, easy/flowing aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:312`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
keeps the line open — you can say the hard thing to each other and still be fine after.
```

#### 80. Compare guidance, siblings, hard/catching aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:313`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is the old loop you both fall into; name the pattern before you're inside it and it loosens its grip.
```

#### 81. Compare guidance, friends, easy/flowing aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:316`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is where the friendship grows — curiosity and shared momentum feed each other here.
```

#### 82. Compare guidance, friends, hard/catching aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:317`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is where wires cross; assume a misread, not a slight, and check the intent before the reaction.
```

#### 83. Compare guidance, platonic, easy/flowing aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:320`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
keeps the understanding easy — how you think together is the real bond here.
```

#### 84. Compare guidance, platonic, hard/catching aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:321`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is where you talk past each other; slow down and confirm you mean the same thing.
```

#### 85. Compare guidance, ancestor, easy/flowing aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:324`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
carries across the generations between you — an inherited current that still runs true.
```

#### 86. Compare guidance, ancestor, hard/catching aspect framing

- **File:** `apps/web/lib/compare-guidance.ts:325`
- **Appears:** Suffix after “{NameA}’s {Body} {aspect} {NameB}’s {Body} (orb°)” in the relationship-aware aspect framing list on Compare.
- **Exact string:**

```
is where two different eras pull apart; the friction is the era gap, not the person.
```

### whatTheyNeed compositional templates (5)

#### 87. Compare guidance, siblings/friends — relation frame words

- **File:** `apps/web/lib/compare-guidance.ts:419`
- **Appears:** Frame word chosen by relation type, then composed into the Mercury need sentence on Compare.
- **Exact string:**

```
Between siblings | As friends
```

#### 88. Compare guidance, siblings/friends — Mercury sentence template

- **File:** `apps/web/lib/compare-guidance.ts:422`
- **Appears:** Composes the Mercury need (+ optional “In practice” how-line) into the Compare guidance paragraph.
- **Exact string:**

```
${frame}, ${name}'s ${mercury} Mercury sets how they need to be talked to: ${mercuryLine}.
```

#### 89. Compare guidance, siblings/friends — Mercury how suffix

- **File:** `apps/web/lib/compare-guidance.ts:423`
- **Appears:** Optional suffix when MERCURY_HOW exists for that sign.
- **Exact string:**

```
 In practice: ${mercuryHow}.
```

#### 90. Compare guidance, parent-child — Saturn sentence template

- **File:** `apps/web/lib/compare-guidance.ts:439`
- **Appears:** Composes the Saturn need (+ optional how-line) into the Compare guidance paragraph for parent-child.
- **Exact string:**

```
In a parent-child bond, ${name}'s ${saturn} Saturn shapes how they meet limits and authority: they need ${saturnLine}.
```

#### 91. Compare guidance, parent-child — Saturn how suffix

- **File:** `apps/web/lib/compare-guidance.ts:440`
- **Appears:** Optional suffix when SATURN_HOW exists for that sign.
- **Exact string:**

```
 How to hold it: ${saturnHow}.
```

### whatTheyNeed closing notes (3)

#### 92. Compare guidance, parent-child — Saturn-missing fallback

- **File:** `apps/web/lib/compare-guidance.ts:455`
- **Appears:** Closing note on Compare when parent-child is selected but Saturn sign is unavailable.
- **Exact string:**

```
See the plan before you correct it — autonomy with backup, not direction, is what keeps the trust intact.
```

#### 93. Compare guidance, ancestor — era closing

- **File:** `apps/web/lib/compare-guidance.ts:457`
- **Appears:** Closing note on Compare for ancestor relationship type.
- **Exact string:**

```
Across the years between you, meet ${name} in the era that shaped them before you translate it into yours.
```

#### 94. Compare guidance, partners/romantic — high-flow closing

- **File:** `apps/web/lib/compare-guidance.ts:459`
- **Appears:** Closing note on Compare for partner/romantic when overall score ≥ 70.
- **Exact string:**

```
The overall flow is strong — the real work is making sure you both say the tender thing out loud while it's easy.
```

### Actionable aspect register (RELATION_ACTION_REGISTER) (14)

#### 95. Compare guidance, partners, actionable register (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:505`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Don't let this ease go unspoken between you —
```

#### 96. Compare guidance, partners, actionable register (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:505`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Say the tender thing out loud before it hardens into scorekeeping —
```

#### 97. Compare guidance, romantic, actionable register (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:506`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Don't let this ease go unspoken between you —
```

#### 98. Compare guidance, romantic, actionable register (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:506`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Say the tender thing out loud before it hardens into scorekeeping —
```

#### 99. Compare guidance, parent-child, actionable register (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:507`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Use this open channel on purpose —
```

#### 100. Compare guidance, parent-child, actionable register (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:507`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
As the parent, lead with backup over correction —
```

#### 101. Compare guidance, siblings, actionable register (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:508`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Keep the line this open —
```

#### 102. Compare guidance, siblings, actionable register (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:508`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Head off the old loop before you're inside it —
```

#### 103. Compare guidance, friends, actionable register (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:509`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Feed the momentum —
```

#### 104. Compare guidance, friends, actionable register (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:509`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Assume a misread, not a slight —
```

#### 105. Compare guidance, platonic, actionable register (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:510`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Feed the friendship where it already flows —
```

#### 106. Compare guidance, platonic, actionable register (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:510`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Assume a misread, not a slight —
```

#### 107. Compare guidance, ancestor, actionable register (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:511`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Carry this inherited current forward —
```

#### 108. Compare guidance, ancestor, actionable register (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:511`
- **Appears:** Lead clause prepended to the body-pair tactic on each framed aspect in Compare (“what to do”).
- **Exact string:**

```
Bridge the era, not the person —
```

### Body-pair aspect tactics (ASPECT_ACTION) (38)

#### 109. Compare guidance, sun–moon body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:523`
- **Appears:** Concrete “what to do” tactic for a real sun–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when what they want and what they need split, ask what they need — not what they want — and don't make them justify the gap
```

#### 110. Compare guidance, sun–moon body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:524`
- **Appears:** Concrete “what to do” tactic for a real sun–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
back their pride and their comfort at once; you rarely have to choose between the two here, so say you see both
```

#### 111. Compare guidance, moon–venus body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:527`
- **Appears:** Concrete “what to do” tactic for a real moon–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when they reach and then pull back, hold steady instead of chasing — steadiness reads as safety, pursuit reads as pressure
```

#### 112. Compare guidance, moon–venus body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:528`
- **Appears:** Concrete “what to do” tactic for a real moon–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
let the easy affection show; warmth comes cheap here, so spend it before it gets taken for granted
```

#### 113. Compare guidance, mars–venus body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:531`
- **Appears:** Concrete “what to do” tactic for a real mars–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when wanting and comfort pull opposite ways, name the pull in words instead of acting it out — handle the friction out loud
```

#### 114. Compare guidance, mars–venus body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:532`
- **Appears:** Concrete “what to do” tactic for a real mars–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
keep making the deliberate warm gesture that keeps this lit; the pull is easy, so it's the tending that's the work
```

#### 115. Compare guidance, mars–moon body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:535`
- **Appears:** Concrete “what to do” tactic for a real mars–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when heat comes up fast, give it a beat — the anger is sitting on a hurt, so answer the feeling, not the volume
```

#### 116. Compare guidance, mars–moon body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:536`
- **Appears:** Concrete “what to do” tactic for a real mars–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
use the quick read you have on each other; act on the feeling early, before it has to be spelled out
```

#### 117. Compare guidance, mercury–moon body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:539`
- **Appears:** Concrete “what to do” tactic for a real mercury–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when the words won't match the feeling, ask in writing or give them quiet — pushing for it out loud makes them go clinical
```

#### 118. Compare guidance, mercury–moon body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:540`
- **Appears:** Concrete “what to do” tactic for a real mercury–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
trade the plain naming of feelings you're both good at, and keep asking how it actually landed
```

#### 119. Compare guidance, mercury–mars body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:543`
- **Appears:** Concrete “what to do” tactic for a real mercury–mars synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when a conversation turns into a debate, slow the pace and say \"I want to get this right with you\" before you argue the point — the drive to win is drowning the drive to be understood
```

#### 120. Compare guidance, mercury–mars body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:544`
- **Appears:** Concrete “what to do” tactic for a real mercury–mars synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
put your quick, decisive back-and-forth to work; this is a pair that can talk a thing through and move on it fast
```

#### 121. Compare guidance, mercury–venus body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:547`
- **Appears:** Concrete “what to do” tactic for a real mercury–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
say what you appreciate before you critique — the correction only lands after the warmth does
```

#### 122. Compare guidance, mercury–venus body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:548`
- **Appears:** Concrete “what to do” tactic for a real mercury–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
let the easy, affectionate way you talk carry the harder conversations too
```

#### 123. Compare guidance, saturn–moon body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:551`
- **Appears:** Concrete “what to do” tactic for a real saturn–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
they learned early that needing is unsafe, so offer before they ask — they won't ask; unprompted care softens the wall
```

#### 124. Compare guidance, saturn–moon body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:552`
- **Appears:** Concrete “what to do” tactic for a real saturn–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
lean on the steadiness here; reliable presence is exactly the reassurance this bond runs on
```

#### 125. Compare guidance, saturn–venus body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:555`
- **Appears:** Concrete “what to do” tactic for a real saturn–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
they think warmth has to be earned, so give it when they've done nothing to earn it — the unprompted kind is what lands
```

#### 126. Compare guidance, saturn–venus body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:556`
- **Appears:** Concrete “what to do” tactic for a real saturn–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
let commitment and warmth reinforce each other; consistency here reads as the deepest kind of care
```

#### 127. Compare guidance, saturn–mercury body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:559`
- **Appears:** Concrete “what to do” tactic for a real saturn–mercury synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when caution meets quick talk, put the ask in writing with a clear why and a timeline they can plan around
```

#### 128. Compare guidance, saturn–mercury body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:560`
- **Appears:** Concrete “what to do” tactic for a real saturn–mercury synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
use how you can be both careful and clear together; this pair makes agreements that hold
```

#### 129. Compare guidance, saturn–sun body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:563`
- **Appears:** Concrete “what to do” tactic for a real saturn–sun synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
make the expectation explicit and give it dignity — respect, not management, is what they'll meet
```

#### 130. Compare guidance, saturn–sun body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:564`
- **Appears:** Concrete “what to do” tactic for a real saturn–sun synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
name the way you steady each other's ambitions; quiet backing like this is easy to leave unsaid
```

#### 131. Compare guidance, sun–mercury body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:567`
- **Appears:** Concrete “what to do” tactic for a real sun–mercury synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when identity and opinion collide, praise the person before you edit the idea
```

#### 132. Compare guidance, sun–mercury body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:568`
- **Appears:** Concrete “what to do” tactic for a real sun–mercury synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
keep thinking out loud together; your minds meet easily, so use it for the real decisions
```

#### 133. Compare guidance, jupiter–sun body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:571`
- **Appears:** Concrete “what to do” tactic for a real jupiter–sun synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when one of you sizes it bigger, agree how far this actually goes before you both commit
```

#### 134. Compare guidance, jupiter–sun body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:572`
- **Appears:** Concrete “what to do” tactic for a real jupiter–sun synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
make a plan that stretches a little; shared optimism is a resource — point it at something you both want
```

#### 135. Compare guidance, jupiter–moon body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:575`
- **Appears:** Concrete “what to do” tactic for a real jupiter–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when big-picture hope meets a tender mood, don't cheer them out of the feeling — sit in it first, then widen the frame
```

#### 136. Compare guidance, jupiter–moon body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:576`
- **Appears:** Concrete “what to do” tactic for a real jupiter–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
let their warmth and the optimism feed each other; this bond grows by dreaming out loud together
```

#### 137. Compare guidance, moon–moon body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:579`
- **Appears:** Concrete “what to do” tactic for a real moon–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when both moods spike at once, one of you name it first — two raw feelings need a witness, not a match
```

#### 138. Compare guidance, moon–moon body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:580`
- **Appears:** Concrete “what to do” tactic for a real moon–moon synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
use the instinctive read you have on each other; check in early, because you feel the shift before it's said
```

#### 139. Compare guidance, mercury–mercury body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:583`
- **Appears:** Concrete “what to do” tactic for a real mercury–mercury synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when you talk past each other, slow down and confirm you mean the same thing before you react to it
```

#### 140. Compare guidance, mercury–mercury body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:584`
- **Appears:** Concrete “what to do” tactic for a real mercury–mercury synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
keep the everyday back-and-forth going; this easy channel is the maintenance the whole bond depends on
```

#### 141. Compare guidance, sun–sun body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:587`
- **Appears:** Concrete “what to do” tactic for a real sun–sun synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when two strong selves collide, make room for each to be seen without turning it into a contest
```

#### 142. Compare guidance, sun–sun body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:588`
- **Appears:** Concrete “what to do” tactic for a real sun–sun synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
celebrate what you each are, out loud; this natural recognition is easy to assume and leave unsaid
```

#### 143. Compare guidance, venus–venus body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:591`
- **Appears:** Concrete “what to do” tactic for a real venus–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when what you each treasure differs, name the value under the preference before you negotiate the thing
```

#### 144. Compare guidance, venus–venus body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:592`
- **Appears:** Concrete “what to do” tactic for a real venus–venus synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
keep giving warmth in the shared language you both read; it's easy here, so don't let it go quiet
```

#### 145. Compare guidance, mars–mars body-pair tactic (hard aspect)

- **File:** `apps/web/lib/compare-guidance.ts:595`
- **Appears:** Concrete “what to do” tactic for a real mars–mars synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
when two drives push at once, decide who leads this one before it becomes a fight over who's in charge
```

#### 146. Compare guidance, mars–mars body-pair tactic (flowing aspect)

- **File:** `apps/web/lib/compare-guidance.ts:596`
- **Appears:** Concrete “what to do” tactic for a real mars–mars synastry aspect on Compare; combined with the relationship register.
- **Exact string:**

```
aim the shared drive at a real project together; this is momentum you can build with, not just spend
```

### Fallback body friction tactics (BODY_FRICTION_ACTION) (10)

#### 147. Compare guidance, sun fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:607`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
acknowledge the person before you take issue with the choice — their need to be recognized is what's really bristling
```

#### 148. Compare guidance, moon fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:608`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
treat the flare as a feeling that arrived early, not a verdict; name what's underneath before you answer the words
```

#### 149. Compare guidance, mercury fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:609`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
slow the exchange down and play it back in their words before you respond — most of this is a misread, not a disagreement
```

#### 150. Compare guidance, venus fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:610`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
protect what each of you treasures out loud; it eases when neither feels their values got overruled
```

#### 151. Compare guidance, mars fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:611`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
give the drive somewhere to go — decide who leads this one before it turns into a contest over who's in charge
```

#### 152. Compare guidance, jupiter fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:612`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
check the scale before you commit — one of you is sizing this bigger, so agree how far it actually goes
```

#### 153. Compare guidance, saturn fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:613`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
make the limit explicit and the reason visible; the wall only becomes a fight when it feels arbitrary
```

#### 154. Compare guidance, uranus fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:614`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
leave room for the unexpected move instead of pinning it down — the tension is a need for freedom, not rejection
```

#### 155. Compare guidance, neptune fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:615`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
get specific where things blur — confirm what was actually meant before you fill the gap with a story
```

#### 156. Compare guidance, pluto fallback friction tactic

- **File:** `apps/web/lib/compare-guidance.ts:616`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
don't try to manage the intensity for them; name it plainly and let it move through without a power struggle
```

### Fallback body flow tactics (BODY_FLOW_ACTION) (10)

#### 157. Compare guidance, sun fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:619`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
reflect back what you admire in who they are; this natural recognition is easy to leave unsaid
```

#### 158. Compare guidance, moon fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:620`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
lean on the instinctive read you have on each other's moods, and check in early — before either of you has to ask
```

#### 159. Compare guidance, mercury fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:621`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
keep talking about the small stuff; this easy back-and-forth is the maintenance the bond runs on
```

#### 160. Compare guidance, venus fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:622`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
say the affection out loud even when it feels obvious — warmth this easy is exactly what gets taken for granted
```

#### 161. Compare guidance, mars fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:623`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
point the shared drive at something real together; this is momentum to build on, not just enjoy
```

#### 162. Compare guidance, jupiter fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:624`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
make plans that stretch a little; shared optimism is a resource, so spend it on something you both want
```

#### 163. Compare guidance, saturn fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:625`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
name the reliability you count on in each other; steady support this quiet rarely gets thanked for
```

#### 164. Compare guidance, uranus fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:626`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
protect the freedom you give each other; this easy room to be different is worth guarding
```

#### 165. Compare guidance, neptune fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:627`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
make space for the shared imaginative thread; it deepens when you honor it out loud
```

#### 166. Compare guidance, pluto fallback flow tactic

- **File:** `apps/web/lib/compare-guidance.ts:628`
- **Appears:** Used when no authored body-pair tactic exists; picked from the more relationship-relevant body of the aspect.
- **Exact string:**

```
trust each other with the deep stuff; the capacity to go all the way in is rare, so use it deliberately
```

### House overlay lenses (narrateHouseOverlay) (7)

#### 167. Compare guidance — house overlay base template

- **File:** `apps/web/lib/compare-guidance.ts:751`
- **Appears:** Base clause for house-overlay lines on Compare; type-specific lens appended after.
- **Exact string:**

```
${owner}'s ${cap(line.body)} lands in ${host}'s ${ordinal} house (${line.area})
```

#### 168. Compare guidance, partners — house overlay lens

- **File:** `apps/web/lib/compare-guidance.ts:753`
- **Appears:** Closing clause after “{Owner}’s {Body} lands in {Host}’s Nth house (area)” on Compare house-overlay narration.
- **Exact string:**

```
— a natural pull toward each other's partnership territory.
```

#### 169. Compare guidance, romantic — house overlay lens

- **File:** `apps/web/lib/compare-guidance.ts:753`
- **Appears:** Closing clause after “{Owner}’s {Body} lands in {Host}’s Nth house (area)” on Compare house-overlay narration.
- **Exact string:**

```
— a natural pull toward each other's partnership territory.
```

#### 170. Compare guidance, parent-child — house overlay lens

- **File:** `apps/web/lib/compare-guidance.ts:755`
- **Appears:** Closing clause after “{Owner}’s {Body} lands in {Host}’s Nth house (area)” on Compare house-overlay narration.
- **Exact string:**

```
— it activates the home-and-authority axis the bond is built on.
```

#### 171. Compare guidance, siblings — house overlay lens

- **File:** `apps/web/lib/compare-guidance.ts:756`
- **Appears:** Closing clause after “{Owner}’s {Body} lands in {Host}’s Nth house (area)” on Compare house-overlay narration.
- **Exact string:**

```
— it lights up the everyday-communication sector siblings share.
```

#### 172. Compare guidance, friends — house overlay lens

- **File:** `apps/web/lib/compare-guidance.ts:757`
- **Appears:** Closing clause after “{Owner}’s {Body} lands in {Host}’s Nth house (area)” on Compare house-overlay narration.
- **Exact string:**

```
— it grounds the friendship in shared community and growth.
```

#### 173. Compare guidance, platonic — house overlay lens

- **File:** `apps/web/lib/compare-guidance.ts:757`
- **Appears:** Closing clause after “{Owner}’s {Body} lands in {Host}’s Nth house (area)” on Compare house-overlay narration.
- **Exact string:**

```
— it grounds the friendship in shared community and growth.
```

### Element-balance signal (relationElementSignal) (3)

#### 174. Compare guidance — shared dominant element

- **File:** `apps/web/lib/compare-guidance.ts:795`
- **Appears:** Element-balance comparison line on Compare when both charts share the same dominant element.
- **Exact string:**

```
You both run mostly ${domA} — a shared temperature that makes the baseline feel familiar, for better and worse.
```

#### 175. Compare guidance — complementary gap elements

- **File:** `apps/web/lib/compare-guidance.ts:800`
- **Appears:** Element-balance line when one chart has zero of the other’s dominant element.
- **Exact string:**

```
${nameA} leads with ${domA} and ${nameB} with ${domB} — where one is thin the other is strong, so you can cover each other's blind spots if you let it.
```

#### 176. Compare guidance — different default elements

- **File:** `apps/web/lib/compare-guidance.ts:802`
- **Appears:** Element-balance line when dominant elements differ without a zero gap.
- **Exact string:**

```
${nameA} leans ${domA}, ${nameB} leans ${domB} — different default weather, so translate before you assume the other felt what you felt.
```

---

## Transit explanations (77)

### Transit force phrases (TRANSIT_FORCE) (10)

#### 177. Transit explanation — transiting sun force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:62`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
a push to be seen
```

#### 178. Transit explanation — transiting moon force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:63`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
a passing shift in mood
```

#### 179. Transit explanation — transiting mercury force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:64`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
a busy rush of thoughts and talk
```

#### 180. Transit explanation — transiting venus force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:65`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
warmth and a pull toward closeness
```

#### 181. Transit explanation — transiting mars force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:66`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
restless drive and a shorter fuse
```

#### 182. Transit explanation — transiting jupiter force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:67`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
room to grow and a bit of luck
```

#### 183. Transit explanation — transiting saturn force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:68`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
real limits
```

#### 184. Transit explanation — transiting uranus force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:69`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
sudden change
```

#### 185. Transit explanation — transiting neptune force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:70`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
a dreamy, softening haze
```

#### 186. Transit explanation — transiting pluto force phrase

- **File:** `apps/web/lib/transit-interpretations.ts:71`
- **Appears:** Building block for composed transit headlines (“Today in your sky” / Active today) when no curated pair exists; also feeds long-form composed lines.
- **Exact string:**

```
deep pressure to change
```

### Natal area phrases (NATAL_AREA) (10)

#### 187. Transit explanation — natal sun area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:83`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
sense of self
```

#### 188. Transit explanation — natal moon area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:84`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
emotional footing
```

#### 189. Transit explanation — natal mercury area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:85`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
way of thinking and talking
```

#### 190. Transit explanation — natal venus area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:86`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
way of caring and what they value
```

#### 191. Transit explanation — natal mars area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:87`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
drive and temper
```

#### 192. Transit explanation — natal jupiter area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:88`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
sense of what's possible
```

#### 193. Transit explanation — natal saturn area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:89`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
need for structure and limits
```

#### 194. Transit explanation — natal uranus area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:90`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
need for freedom
```

#### 195. Transit explanation — natal neptune area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:91`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
dreams and ideals
```

#### 196. Transit explanation — natal pluto area phrase

- **File:** `apps/web/lib/transit-interpretations.ts:92`
- **Appears:** Building block naming which part of the person is being touched; used as “{your/their} {area}” in composed transit lines.
- **Exact string:**

```
deeper self
```

### Transit guidance tails (TRANSIT_GUIDANCE) (10)

#### 197. Transit explanation — transiting sun guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:102`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
let it be acknowledged
```

#### 198. Transit explanation — transiting moon guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:103`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
let the feeling move through and pass
```

#### 199. Transit explanation — transiting mercury guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:104`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
say the thing plainly
```

#### 200. Transit explanation — transiting venus guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:105`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
reach out — small warmth counts
```

#### 201. Transit explanation — transiting mars guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:106`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
aim the energy before it spikes
```

#### 202. Transit explanation — transiting jupiter guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:107`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
say yes to a little more than usual
```

#### 203. Transit explanation — transiting saturn guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:108`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
patience and steady effort go far
```

#### 204. Transit explanation — transiting uranus guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:109`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
stay flexible; don't grip too hard
```

#### 205. Transit explanation — transiting neptune guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:110`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
rest, and don't force clarity today
```

#### 206. Transit explanation — transiting pluto guidance tail

- **File:** `apps/web/lib/transit-interpretations.ts:111`
- **Appears:** Small “what helps” tail on composed transit lines, keyed to the transiting body.
- **Exact string:**

```
let what's ending actually end
```

### Curated transit pairs (TRANSIT_PAIR) — saturn (14)

#### 207. Transit explanation, saturn friction moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:169`
- **Appears:** Headline plain-language meaning when transiting saturn forms a friction aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A heavier stretch where {poss} emotional footing feels tested — steady routines and rest help more than pushing.
```

#### 208. Transit explanation, saturn friction moon — long

- **File:** `apps/web/lib/transit-interpretations.ts:169`
- **Appears:** Richer 1–2 sentence version under the short headline for the same saturn→moon friction transit.
- **Exact string:**

```
Transiting Saturn is putting weight on how safe {poss} feels. Things can read as lonelier or heavier than they are; small, reliable routines steady it faster than forcing a mood.
```

#### 209. Transit explanation, saturn fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:170`
- **Appears:** Headline plain-language meaning when transiting saturn forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Feelings turn serious and a little heavy today — {poss} need for security is front and centre. Go gently, keep it simple.
```

#### 210. Transit explanation, saturn flow moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:171`
- **Appears:** Headline plain-language meaning when transiting saturn forms a flow aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A steadying day for {poss} emotional life — good for building one habit that makes {poss} days feel safer.
```

#### 211. Transit explanation, saturn friction sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:174`
- **Appears:** Headline plain-language meaning when transiting saturn forms a friction aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day that asks a lot of {poss} sense of self — progress feels slow, but the effort counts. Pace it.
```

#### 212. Transit explanation, saturn fusion sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:175`
- **Appears:** Headline plain-language meaning when transiting saturn forms a fusion aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A serious, consolidating day for who {poss} is — less flash, more foundation.
```

#### 213. Transit explanation, saturn flow sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:176`
- **Appears:** Headline plain-language meaning when transiting saturn forms a flow aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Quiet, solid progress on what {poss} is building — reliable work pays off now.
```

#### 214. Transit explanation, saturn friction venus — short

- **File:** `apps/web/lib/transit-interpretations.ts:179`
- **Appears:** Headline plain-language meaning when transiting saturn forms a friction aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Warmth feels a little rationed today — {poss} bonds meet real limits. Reassurance lands better than pressure.
```

#### 215. Transit explanation, saturn flow venus — short

- **File:** `apps/web/lib/transit-interpretations.ts:180`
- **Appears:** Headline plain-language meaning when transiting saturn forms a flow aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A grounded, steady day for {poss} closest bonds — consistency and showing up feel good.
```

#### 216. Transit explanation, saturn friction uranus — short

- **File:** `apps/web/lib/transit-interpretations.ts:183`
- **Appears:** Headline plain-language meaning when transiting saturn forms a friction aspect to natal uranus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day that tests {poss} need for freedom against real limits — patience goes far.
```

#### 217. Transit explanation, saturn friction uranus — long

- **File:** `apps/web/lib/transit-interpretations.ts:183`
- **Appears:** Richer 1–2 sentence version under the short headline for the same saturn→uranus friction transit.
- **Exact string:**

```
Transiting Saturn is pressing on {poss} urge to break out and do it differently. The pull between changing everything and staying put is real today; neither has to win right now — patience buys the better answer.
```

#### 218. Transit explanation, saturn fusion uranus — short

- **File:** `apps/web/lib/transit-interpretations.ts:184`
- **Appears:** Headline plain-language meaning when transiting saturn forms a fusion aspect to natal uranus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Freedom and structure collide head-on today — {poss} feels the tug between breaking out and settling down. No rush to resolve it.
```

#### 219. Transit explanation, saturn friction mars — short

- **File:** `apps/web/lib/transit-interpretations.ts:187`
- **Appears:** Headline plain-language meaning when transiting saturn forms a friction aspect to natal mars; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
{poss} drive meets a wall today — frustration is likely, so put it into one steady task instead of forcing all of it.
```

#### 220. Transit explanation, saturn flow mars — short

- **File:** `apps/web/lib/transit-interpretations.ts:188`
- **Appears:** Headline plain-language meaning when transiting saturn forms a flow aspect to natal mars; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Disciplined energy today — a good day for {poss} to grind out real, patient work.
```

### Curated transit pairs (TRANSIT_PAIR) — jupiter (6)

#### 221. Transit explanation, jupiter flow sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:192`
- **Appears:** Headline plain-language meaning when transiting jupiter forms a flow aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day that widens {poss} horizons — confidence and timing are on {poss} side. Reach a little further.
```

#### 222. Transit explanation, jupiter fusion sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:193`
- **Appears:** Headline plain-language meaning when transiting jupiter forms a fusion aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A genuinely expansive day for {poss} — say yes to the bigger version.
```

#### 223. Transit explanation, jupiter flow moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:196`
- **Appears:** Headline plain-language meaning when transiting jupiter forms a flow aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
An emotionally generous day — {poss} heart has more room than usual. Good for reaching out and being reached.
```

#### 224. Transit explanation, jupiter fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:197`
- **Appears:** Headline plain-language meaning when transiting jupiter forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Warm, hopeful feelings run high today — {poss} outlook lifts on its own.
```

#### 225. Transit explanation, jupiter flow venus — short

- **File:** `apps/web/lib/transit-interpretations.ts:200`
- **Appears:** Headline plain-language meaning when transiting jupiter forms a flow aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A warm, sociable day for {poss} — generosity and good company flow easily. A good time to connect.
```

#### 226. Transit explanation, jupiter fusion venus — short

- **File:** `apps/web/lib/transit-interpretations.ts:201`
- **Appears:** Headline plain-language meaning when transiting jupiter forms a fusion aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A big-hearted day for {poss} bonds — affection and generosity come easily.
```

### Curated transit pairs (TRANSIT_PAIR) — mars (8)

#### 227. Transit explanation, mars friction sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:205`
- **Appears:** Headline plain-language meaning when transiting mars forms a friction aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
{poss} energy runs hot and patience runs short today — pick the one thing worth the push and skip the rest.
```

#### 228. Transit explanation, mars fusion sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:206`
- **Appears:** Headline plain-language meaning when transiting mars forms a fusion aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
High drive and a bit of a temper today — great for action, risky for arguments. Aim it well.
```

#### 229. Transit explanation, mars friction moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:209`
- **Appears:** Headline plain-language meaning when transiting mars forms a friction aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Feelings and irritation sit close together today — a small thing can spark {poss} temper. Name the hurt under the heat.
```

#### 230. Transit explanation, mars fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:210`
- **Appears:** Headline plain-language meaning when transiting mars forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Emotions run hot and fast today — the reaction comes before the thought, so give it a beat.
```

#### 231. Transit explanation, mars friction venus — short (adultOnly — skipped for minors; falls back to composed)

- **File:** `apps/web/lib/transit-interpretations.ts:213`
- **Appears:** Headline plain-language meaning when transiting mars forms a friction aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Wanting and warmth pull in different directions today — {poss} may feel restless in {poss} bonds. Say plainly what {poss} actually needs.
```

#### 232. Transit explanation, mars fusion venus — short (adultOnly — skipped for minors; falls back to composed)

- **File:** `apps/web/lib/transit-interpretations.ts:214`
- **Appears:** Headline plain-language meaning when transiting mars forms a fusion aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Attraction and heat run strong today for {poss} — good chemistry, quick to spark. Keep it honest.
```

#### 233. Transit explanation, mars flow venus — short

- **File:** `apps/web/lib/transit-interpretations.ts:215`
- **Appears:** Headline plain-language meaning when transiting mars forms a flow aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
An easy, affectionate energy for {poss} today — warmth and get-up-and-go point the same way.
```

#### 234. Transit explanation, mars fusion mars — short

- **File:** `apps/web/lib/transit-interpretations.ts:218`
- **Appears:** Headline plain-language meaning when transiting mars forms a fusion aspect to natal mars; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A high-energy day — {poss} drive is turbocharged. Point it at something physical or productive.
```

### Curated transit pairs (TRANSIT_PAIR) — pluto (4)

#### 235. Transit explanation, pluto friction moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:222`
- **Appears:** Headline plain-language meaning when transiting pluto forms a friction aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Deep feelings surface today, stronger than the moment seems to call for — let them move through without trying to control them.
```

#### 236. Transit explanation, pluto fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:223`
- **Appears:** Headline plain-language meaning when transiting pluto forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
An emotionally intense day — something under the surface wants to shift. Don't force it; let it.
```

#### 237. Transit explanation, pluto friction sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:226`
- **Appears:** Headline plain-language meaning when transiting pluto forms a friction aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day of quiet power struggles — {poss} sense of self is being reshaped. Hold steady without needing to win.
```

#### 238. Transit explanation, pluto fusion sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:227`
- **Appears:** Headline plain-language meaning when transiting pluto forms a fusion aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day of real inner change for {poss} — an old version is loosening its grip. Let it.
```

### Curated transit pairs (TRANSIT_PAIR) — uranus (3)

#### 239. Transit explanation, uranus friction moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:231`
- **Appears:** Headline plain-language meaning when transiting uranus forms a friction aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Restlessness and a need to shake things up today — {poss} emotional routine feels too tight. Change one small thing.
```

#### 240. Transit explanation, uranus fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:232`
- **Appears:** Headline plain-language meaning when transiting uranus forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A jolt to {poss} emotional world today — something wants to change. Stay loose.
```

#### 241. Transit explanation, uranus fusion sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:235`
- **Appears:** Headline plain-language meaning when transiting uranus forms a fusion aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day that breaks {poss} routine open — expect the unexpected and let it land.
```

### Curated transit pairs (TRANSIT_PAIR) — neptune (3)

#### 242. Transit explanation, neptune fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:239`
- **Appears:** Headline plain-language meaning when transiting neptune forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A tender, dreamy, slightly foggy day — {poss} feelings blur at the edges. Rest and quiet help; big decisions can wait.
```

#### 243. Transit explanation, neptune friction moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:240`
- **Appears:** Headline plain-language meaning when transiting neptune forms a friction aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Emotional signals are hard to read today — don't trust the fog to tell {poss} the whole story.
```

#### 244. Transit explanation, neptune friction sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:243`
- **Appears:** Headline plain-language meaning when transiting neptune forms a friction aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
{poss} sense of direction feels hazy today — a day to drift a little, not to decide.
```

### Curated transit pairs (TRANSIT_PAIR) — venus (3)

#### 245. Transit explanation, venus flow moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:247`
- **Appears:** Headline plain-language meaning when transiting venus forms a flow aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A soft, affectionate day — {poss} closest bonds feel easy and warm. Enjoy the closeness.
```

#### 246. Transit explanation, venus fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:248`
- **Appears:** Headline plain-language meaning when transiting venus forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Warmth is front and centre today — a lovely day for {poss} to feel connected.
```

#### 247. Transit explanation, venus flow venus — short

- **File:** `apps/web/lib/transit-interpretations.ts:251`
- **Appears:** Headline plain-language meaning when transiting venus forms a flow aspect to natal venus; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
An easy, pleasant day for {poss} — good company and small comforts land well.
```

### Curated transit pairs (TRANSIT_PAIR) — mercury (3)

#### 248. Transit explanation, mercury friction moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:255`
- **Appears:** Headline plain-language meaning when transiting mercury forms a friction aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
Thoughts and feelings tangle today — {poss} may say it sideways. Ask what {poss} actually feels.
```

#### 249. Transit explanation, mercury flow moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:256`
- **Appears:** Headline plain-language meaning when transiting mercury forms a flow aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A good day for {poss} to say how {poss} feels — words and emotions line up.
```

#### 250. Transit explanation, mercury flow mercury — short

- **File:** `apps/web/lib/transit-interpretations.ts:259`
- **Appears:** Headline plain-language meaning when transiting mercury forms a flow aspect to natal mercury; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A quick, clear-thinking day for {poss} — good for conversations and decisions.
```

### Curated transit pairs (TRANSIT_PAIR) — sun (2)

#### 251. Transit explanation, sun fusion sun — short

- **File:** `apps/web/lib/transit-interpretations.ts:263`
- **Appears:** Headline plain-language meaning when transiting sun forms a fusion aspect to natal sun; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day that puts {poss} in the spotlight — energy and focus return. Use it.
```

#### 252. Transit explanation, sun flow moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:266`
- **Appears:** Headline plain-language meaning when transiting sun forms a flow aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
A day when {poss} outer life and inner needs line up — things feel a little more whole.
```

### Curated transit pairs (TRANSIT_PAIR) — moon (1)

#### 253. Transit explanation, moon fusion moon — short

- **File:** `apps/web/lib/transit-interpretations.ts:270`
- **Appears:** Headline plain-language meaning when transiting moon forms a fusion aspect to natal moon; shown on Home “Today in your sky” / person Active today (with your/their substituted for {poss}).
- **Exact string:**

```
The monthly reset of {poss} emotional weather — a day to notice how {poss} actually feel and recalibrate.
```

---

## Onboarding (24)

### COPY object (24)

#### 254. Onboarding progress step label (1/3)

- **File:** `apps/web/app/welcome/page.tsx:38`
- **Appears:** Step label in the /welcome progress bar.
- **Exact string:**

```
You
```

#### 255. Onboarding progress step label (2/3)

- **File:** `apps/web/app/welcome/page.tsx:38`
- **Appears:** Step label in the /welcome progress bar.
- **Exact string:**

```
Your first person
```

#### 256. Onboarding progress step label (3/3)

- **File:** `apps/web/app/welcome/page.tsx:38`
- **Appears:** Step label in the /welcome progress bar.
- **Exact string:**

```
What you got
```

#### 257. Onboarding step 1 eyebrow

- **File:** `apps/web/app/welcome/page.tsx:41`
- **Appears:** Step 1 eyebrow on /welcome.
- **Exact string:**

```
Step 1 · Start with you
```

#### 258. Onboarding step 1 title

- **File:** `apps/web/app/welcome/page.tsx:42`
- **Appears:** Step 1 card title on /welcome.
- **Exact string:**

```
Let's place you in the sky first
```

#### 259. Onboarding step 1 lede

- **File:** `apps/web/app/welcome/page.tsx:43`
- **Appears:** Supporting paragraph under the step 1 title on /welcome.
- **Exact string:**

```
Everything in Galaxia is drawn in relation to you — so you're the first star we plot. This stays completely private; it's your map, for you.
```

#### 260. Onboarding step 1 — why birth time

- **File:** `apps/web/app/welcome/page.tsx:45`
- **Appears:** Inside the teal callout “Why we ask for a birth time” on /welcome step 1.
- **Exact string:**

```
Your birth time unlocks your Rising sign and your houses — the specific, personal way your chart is yours, not just your Sun sign. Don't know it? That's completely fine. You'll still get your Sun, your Moon, and real, accurate readings — we just leave out the parts a time would decide, rather than guessing them.
```

#### 261. Onboarding — self saved confirmation (COPY.selfSaved)

- **File:** `apps/web/app/welcome/page.tsx:47`
- **Appears:** Defined in COPY; currently unused in the render path (status messages use different hardcoded strings).
- **Exact string:**

```
You're in your sky
```

#### 262. Onboarding step 2 eyebrow

- **File:** `apps/web/app/welcome/page.tsx:50`
- **Appears:** Step 2 eyebrow on /welcome.
- **Exact string:**

```
Step 2 · Add someone you love
```

#### 263. Onboarding step 2 title

- **File:** `apps/web/app/welcome/page.tsx:51`
- **Appears:** Step 2 card title on /welcome.
- **Exact string:**

```
Now add someone who matters to you
```

#### 264. Onboarding step 2 lede

- **File:** `apps/web/app/welcome/page.tsx:52`
- **Appears:** Supporting paragraph under the step 2 title on /welcome.
- **Exact string:**

```
A partner, a parent, a best friend, a child, someone you've lost. Galaxia comes alive when it's not just you — this is where you start seeing how two skies meet.
```

#### 265. Onboarding precision spectrum title

- **File:** `apps/web/app/welcome/page.tsx:54`
- **Appears:** Heading of the precision callout on /welcome step 2.
- **Exact string:**

```
Add whatever you actually know — every level gives you something real
```

#### 266. Onboarding precision — exact time

- **File:** `apps/web/app/welcome/page.tsx:55`
- **Appears:** Bullet in the precision callout on /welcome step 2.
- **Exact string:**

```
Exact birth time: the full picture — their Rising, their houses, and how your two charts line up in fine detail.
```

#### 267. Onboarding precision — date only

- **File:** `apps/web/app/welcome/page.tsx:57`
- **Appears:** Bullet in the precision callout on /welcome step 2.
- **Exact string:**

```
Just the date: still their Sun, Moon, and every planet — real, accurate readings and a real comparison with you. Only the time-specific parts (Rising, houses) wait until you know more.
```

#### 268. Onboarding precision — year only

- **File:** `apps/web/app/welcome/page.tsx:59`
- **Appears:** Bullet in the precision callout on /welcome step 2.
- **Exact string:**

```
Only the year: that's the generational layer — the slow outer planets that shaped their whole era. Even just a birth year places your grandmother in your sky.
```

#### 269. Onboarding precision — unknown

- **File:** `apps/web/app/welcome/page.tsx:61`
- **Appears:** Bullet in the precision callout on /welcome step 2.
- **Exact string:**

```
Don't know their birthday yet? Add their name now and fill in the rest whenever you have it — or ask them. Nothing is lost by starting light.
```

#### 270. Onboarding minor checkbox label

- **File:** `apps/web/app/welcome/page.tsx:65`
- **Appears:** Checkbox label when adding a person on /welcome step 2.
- **Exact string:**

```
This person is a minor (under 18)
```

#### 271. Onboarding minor-safety explanation

- **File:** `apps/web/app/welcome/page.tsx:66`
- **Appears:** Muted explanation under the minor checkbox on /welcome step 2.
- **Exact string:**

```
If you're adding a child, check this. Galaxia keeps guidance about a minor private to you — there's never any two-way AI chat with a child. As a backstop, we also protect anyone whose birth date shows they're under 18 even if this is left unchecked, but checking it makes your intent clear from the start.
```

#### 272. Onboarding step 3 eyebrow

- **File:** `apps/web/app/welcome/page.tsx:70`
- **Appears:** Step 3 eyebrow on /welcome.
- **Exact string:**

```
Step 3 · Your constellation is live
```

#### 273. Onboarding step 3 title

- **File:** `apps/web/app/welcome/page.tsx:71`
- **Appears:** Step 3 card title on /welcome.
- **Exact string:**

```
That's your sky — here's what you can do with it
```

#### 274. Onboarding step 3 lede

- **File:** `apps/web/app/welcome/page.tsx:72`
- **Appears:** Supporting paragraph under the step 3 title on /welcome.
- **Exact string:**

```
You've plotted your first stars. From here it only gets richer — every person you add deepens the picture. Here's where to go next:
```

#### 275. Onboarding next-step — View a chart

- **File:** `apps/web/app/welcome/page.tsx:74`
- **Appears:** Description under “View a chart →” on /welcome step 3.
- **Exact string:**

```
Open a chart to read someone's Sun, Moon, Rising, and placements in plain language.
```

#### 276. Onboarding next-step — Run a Compare

- **File:** `apps/web/app/welcome/page.tsx:75`
- **Appears:** Description under “Run a Compare →” on /welcome step 3.
- **Exact string:**

```
Run a Compare to see how two people's charts actually meet — where it flows and where it catches.
```

#### 277. Onboarding next-step — Ask Vela

- **File:** `apps/web/app/welcome/page.tsx:76`
- **Appears:** Description under “Ask Vela →” on /welcome step 3.
- **Exact string:**

```
Ask Vela, your private guide, anything about the people in your sky. She reads real chart facts, never invents them.
```

---

## Ambiguous — decide whether founder-review or already-final

These are **not** counted in the totals above. They sit next to, under the same convention as, or in the same files as flagged copy, but lack a direct `FOUNDER-REVIEW` marker (or are structural/UI chrome).

### MOON_NEED / VENUS_NEED (12 signs each)

- **File:** `apps/web/lib/compare-guidance.ts:141`
- **Why ambiguous:** Pre-existing Compare need tables. New HOW/SATURN/MERCURY tables were flagged FOUNDER-REVIEW and written to match these; the originals themselves have no marker.
- **Sample / pointer:**

```
(12 Moon + 12 Venus strings — see MOON_NEED and VENUS_NEED in compare-guidance.ts)
```

### relationLensCaption()

- **File:** `apps/web/lib/compare-guidance.ts:330`
- **Why ambiguous:** Captions like “Leading with attraction and partnership aspects…” — same file, not marked.
- **Sample / pointer:**

```
Leading with attraction and partnership aspects (Venus, Mars, Sun, Moon) first. (+ 5 sibling variants)
```

### whatTheyNeed fallbacks outside marked blocks

- **File:** `apps/web/lib/compare-guidance.ts:377`
- **Why ambiguous:** Several fallback sentences in whatTheyNeed (emotional < 52, platonic mercury, friction aspect, empty parts) are not under a FOUNDER-REVIEW comment.
- **Sample / pointer:**

```
e.g. "{name} needs reassurance that the bond holds…"; platonic Mercury aspect sentences; friction aspect sentence; SIGN_VIBE fallback.
```

### composeShort / composeLong sentence frames

- **File:** `apps/web/lib/transit-interpretations.ts:125`
- **Why ambiguous:** The TRANSIT_FORCE / NATAL_AREA / TRANSIT_GUIDANCE tables are marked; the surrounding sentence templates (“A day that tests…”, “Right now…”) are not separately marked.
- **Sample / pointer:**

```
A day that tests ${poss} ${area} against ${force} — ${guidance}. (+ flow/fusion variants and long forms)
```

### interpretTransit ultimate fallbacks

- **File:** `apps/web/lib/transit-interpretations.ts:304`
- **Why ambiguous:** Fallback fragments when a body key is missing from the tables — not marked.
- **Sample / pointer:**

```
a passing influence / inner life / notice it, and let it pass
```

### Welcome page chrome outside COPY

- **File:** `apps/web/app/welcome/page.tsx:385`
- **Why ambiguous:** Page title, buttons, status toasts, and relation pill labels are user-facing but outside the FOUNDER-REVIEW COPY object.
- **Sample / pointer:**

```
Build your constellation; This is me — continue; Add to constellation; I'll add someone later; etc.
```

### Hardcoded callout label next to FOUNDER-REVIEW

- **File:** `apps/web/app/welcome/page.tsx:420`
- **Why ambiguous:** Bold “Why we ask for a birth time.” is hardcoded in JSX under a FOUNDER-REVIEW comment that primarily flags COPY.selfWhyTime.
- **Sample / pointer:**

```
Why we ask for a birth time.
```

