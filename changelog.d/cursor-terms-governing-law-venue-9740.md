## Fill Terms of Service governing law and venue (branch `cursor/terms-governing-law-venue-9740`) — 2026-09-14

**Trigger**: Terms of Service section 15 still rendered the unfilled `[GOVERNING STATE]` and `[COUNTY/STATE]` placeholders on the live `/terms` page. Galaxia Mea LLC is registered at 1 Shadowrock Ct, Simpsonville, SC 29680.

`[FIXED]` **`content/legal/terms-of-service.md` section 15.** Governing law is the State of South Carolina. Exclusive venue is the state and federal courts in Greenville County, South Carolina (Simpsonville's county). The editorial `[CONFIRM … arbitration …]` drafting note in the same paragraph is gone; no arbitration clause or class-action waiver was added. Contact in this file already uses the `{{GALAXIA_HELP_EMAIL}}` token that `readLegalMarkdown` substitutes from `@galaxia/core`, so no email-literal change was needed.

`[ADDED]` **`apps/web/lib/legal-content.test.ts`** now asserts the filled South Carolina / Greenville County strings and fails if those fill-in tokens return. The B5 contact-literal walk in `apps/web/lib/nav-hrefs-resolve.test.ts` already scans `content/`, including `content/legal/`, so a hardcoded Galaxia email in this file would already fail that suite.

`[OPEN]` **Privacy Policy section 11 still has a counsel-review note** about the distinction between a minor account holder and a minor added as a subject. That note is not a jurisdiction fill-in. Left untouched; this branch is governing law, venue, and the email-import check only.
