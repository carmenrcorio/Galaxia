## Blog chart-reading email capture (branch `cursor/blog-chart-reading-capture-567b`) — 2026-09-15

**Trigger**: Capture emails on every blog post with a real, computed chart reading sent via Resend, not a generic horoscope.

`[ADDED]` Inline capture block at the bottom of every published post (`app/[slug]/page.tsx`), above "Read next". One email field, optional name / date / city, submit to `POST /api/blog/chart-reading-capture`.

`[ADDED]` Personalized readings use the same date-only `buildBirthInput` + `computeNatalChart` path as `/chart`. Copy is `interpretPlacement().long` verbatim for Moon (if confident), Sun, then the first confident outer planet. Unconfident placements are skipped. Birthplace is never silently geocoded.

`[ADDED]` Fallback when birth data is omitted: the Cafe Astrology Little Rock chart already used as external ground truth (`1987-12-29 22:30 CST`), labeled as a published chart's Sun and Moon, not as the reader's.

`[ADDED]` `blog_email_captures` table (service-role only, RLS on, no client policies) for the 3-per-email-per-24h cap. Resend send uses the existing `dispatchEmail` pattern. Contacts are added to a Resend segment named "Blog chart readings".

`[DECISION]` FOUNDER-REVIEW copy: framing, button ("Send my reading"), confirmation, subject (Moon sign when known), opening, closing relational line. No em dashes in authored strings.
