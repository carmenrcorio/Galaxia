## Fix broken #315 copy, apply unsubscribe and synastry migrations, drop employment use case (branch `cursor/fix-copy-unsubscribe-synastry-e88b`) — 2026-09-16

**Trigger**: PR #315's global slogan replace left ungrammatical sentences on the live site; the trial unsubscribe route wrote a column that was not in production; the synastry-aspects title still said "Predict"; `/for-work` still offered an employment use case the Terms forbid.

`[FIXED]` **Broken slogan grammar** from #315, rewritten sentence by sentence (no second global replace). "Astrology forgot understand the people in your life" is now "Astrology was built to understand the people in your life." OG/Twitter alts are "astrology to understand the people in your life." For-work body, App Store What's New, paid-social headline, and blog guides description rewritten so they read naturally and still mean understanding the people in your life. Footer and email closer were already grammatical and were left alone. FOUNDER-REVIEW.

`[FIXED]` **`profiles.trial_emails_opted_out`** applied to production via `npx supabase db push` of the existing `20260916040503_trial_emails_opted_out` migration. Confirmed on `information_schema`: boolean, not null, default false. `/api/unsubscribe` already reads and writes that column name; the trial-emails cron selects and honors it before send.

`[CHANGED]` **`synastry-aspects-explained` title** applied via the same push of `20260916043000_synastry_aspects_title_drop_predict`: live row is now "7 Synastry Aspects That Reveal How Relationships Feel". Hardcoded copies in glossary, hero SVG, and generate script already matched. Applied seed SQL was not edited (§2).

`[DECISION]` **`db push` needed a history-only repair** of three already-applied files whose remote versions were MCP apply-time stamps (`20260915013149` / `20260915021943` / `20260915025554`) while the committed files use `20260915013000` / `20260915021648` / `20260915024600`. Marked the remote-only versions reverted and the committed versions applied. No SQL was re-run. `supabase db diff` cannot run here (no Docker shadow DB); column and title were confirmed with SQL instead.

`[CHANGED]` **`/for-work` "Onboarding a new hire"** moment deleted (Terms forbid employment use). The remaining two cards are unchanged. Eyebrow is now "Two moments".
