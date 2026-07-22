## Make Quick Compare flows/catches readable without inventing meaning (branch `cursor/flows-catches-readable-453a`) — 2026-07-22

**Trigger**: The "Where it flows and catches" section on `/chart/compare` and `/s/[token]` (compare) led with an algorithm caption ("Leading with attraction…"), repeated the same register opener on every row, and showed bare orb degrees as the primary signal — hard to read for someone new to astrology.

`[FIXED]` **Extracted shared `FlowsAndCatchesSection`** used by both `/chart/compare` and compare share snapshots. One markup path; `/app/compare` and the quick-check modal are untouched.

`[FIXED]` **Replaced the sort-order caption leak** (romantic and platonic branches) with human intro lines (FOUNDER-REVIEW). Sort order itself unchanged.

`[ADDED]` **Flows vs catches legend** once at the top of the section (FOUNDER-REVIEW).

`[FIXED]` **De-duplicated register openers** from `aspectActionLine`: each opener shows once before its flows/catches group; rows render only the tactic tail. Existing opener/tactic wording (including em dashes) unchanged via new `aspectActionParts`.

`[ADDED]` **`orbStrength` in `@galaxia/astro`** (one shared threshold source): under 1.0° = strong, 1.0–2.5° = clear, over 2.5° = subtle (FOUNDER-REVIEW words). Strength word is primary; exact degree is small subtext. Uses the live/stored orb — never recomputes.
