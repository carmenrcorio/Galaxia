## Inline natal sign reveal on landing (branch `cursor/inline-natal-sign-reveal-df25`) — 2026-07-24

**Trigger**: Landing "Try it free" mini-form hard-navigated to `/chart`, pulling visitors off the marketing page (pricing, FAQ, signup) onto app chrome — a conversion leak.

`[ADDED]` **`NatalSignReveal`** (`components/natal-sign-reveal.tsx`) — shared Sun/Moon/(Rising when present) reveal with short readings. Labels only placements the chart has. Absent Rising is an honest note + optional "See full chart" prefill link, never a fabricated third chip. Three consumers: landing mini-form, `/chart`, `/s` single snapshots. Wheel mounts beside the reveal, not inside it.

`[CHANGED]` **Landing mini-form** posts `POST /api/quick-chart` and renders the reveal inline (pending + error states; form values preserved on error). No `router.push`. Signup CTA under the chips; Rising line under that. Marketing nav and below-the-fold sections stay put. `/api/quick-chart` was already public — no new exposure.

`[DECISION]` **`isMinorForSafety` inside the shared component only when `birthDate` is provided.** Natal Sun/Moon copy is not adults-only — minor and adult render identically today. `/s` singles pass no birthDate (PII stripped by design); do not persist `subjectIsMinor` on single shares. Call is centralized so future adults-only reveal content has one gate.

`[CHANGED]` **`/chart?pr=date&m&d&y` deep links** keep the auto-run `useEffect` — back compat for links in the wild.
