## Transit nudge engine: durable daily record + framing-aware selection (branch `feat/transit-nudge-engine`) — 2026-07-25

**Trigger**: Today in Your Sky recomputed copy on every open, ranked by tightest orb only, repeated slow outer transits for months, and could assert degree-exact orbs on date-only charts. Needed a durable per-person daily record before notifications.

`[ADDED]` **`person_daily_nudges` table** — one row per `(person_id, date)` (owner-local day), owner-scoped RLS. Stores chosen transit, phase, `exact_at`, `pass_id`, frozen `copy_key` / `copy_resolved`, `precision_mode`, `minor_safe`. Home and Active today read this row; they never recompute sentences on open. Migration also adds `profiles.pinned_sky_person_id` for the home lead slot and clears the new table in `delete_own_person` / `purge_own_account_data`.

`[ADDED]` **Transit nudge engine in `@galaxia/astro` (`transit-nudge/`)** — phase (applying/exact/separating), nearest `exact_at`, and stable `pass_id` (distinct per retrograde re-pass). Slow/outer eligibility is a per-body **degree** window around each exact pass (silent between). Selection weights `relationshipDomainWeight × phaseBonus × tightness × novelty` using the shared Compare `BODY_PRIORITY_BY_BAND` map (no forked priority table). Pinned person takes the home lead when they have any eligible hit.

`[ADDED]` **Honest degradation at the hit filter** — `year_blocked` / `none` → empty + hedge; `exact` writes `orb_deg`; `date_sign` allows natal targets only when the aspect survives a whole-day degree smear, **never** targets natal Moon, **never** stores a precise `orb_deg`. Angles remain non-targets without exact time. `isMinorForSafety` runs at generation (`minor_safe` on the row); adult/romance keys unreachable when minor.

`[ADDED]` **Tiered copy matrix (FOUNDER-REVIEW)** — key `(theme, aspect_class, natal_domain, framing)` with fallthrough full → drop_domain → framing_gentle. Every tier is a complete authored sentence; resolver never concatenates FORCE/AREA/GUIDANCE. Authored now: **210** drop_domain + **7** framing_gentle + **570** full (weighted domains only) + **3** empty hedges = **790** strings.

`[CHANGED]` **Web + mobile home / person Active today** — plan/upsert missing daily rows, display `copy_resolved`. Notation proof only in `exact` mode.

**After merge**: `ship.sh` then **db push** (migration). MERGED IS NOT LIVE. Phone verify: slow transit near exact only; date-only theme-level with no degree; pinned person leads home.
