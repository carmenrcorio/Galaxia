## Replace Privacy §11 counsel note with reviewed children's and minors' copy (branch `cursor/privacy-section-11-coppa-10c6`) — 2026-09-16

**Trigger**: Privacy Policy section 11 still rendered a live counsel-review bracket about COPPA and the distinction between a minor account holder and a minor added as a subject. Founder-authored replacement copy was supplied to ship.

`[CHANGED]` **`content/legal/privacy-policy.md` section 11.** Replaced the under-13 / counsel-note paragraph with three subsections: 11.1 no direct account creation by minors (age of majority, and in any case at least 18; suspend/terminate/delete if a minor created an account; report via `{{GALAXIA_HELP_EMAIL}}`); 11.2 adult account holders may add a minor as a person in their galaxy subject to Section 5 safety limits, which does not create an account or a direct relationship with Galaxia; 11.3 parent/guardian (or legally sufficient consent) representation plus an indemnity for unauthorized minor data. Last updated date moved from 8/19/2026 to 9/16/2026. No FOUNDER-REVIEW tag and no em dash in the new section.

`[ADDED]` **`apps/web/lib/legal-content.test.ts`** now asserts the three subsection headings, the 18+ / Section 5 / indemnity language, and the substituted help email, and fails if the counsel bracket, "under 13", U+2014, or FOUNDER-REVIEW returns in section 11.
