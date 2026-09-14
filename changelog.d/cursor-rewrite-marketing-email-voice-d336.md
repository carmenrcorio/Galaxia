## Marketing email voice rewrite (branch `cursor/rewrite-marketing-email-voice-d336`) — 2026-09-14

**Trigger**: After the CAN-SPAM footer landed, every marketing email still led with sky/galaxy vocabulary, repeated the recipient's name (or an email local-part), had no inbox preview text, and the daily nudge still sent a thin sentence most days. Voice law (`design/galaxia-voice-layers.md`, ENGINEERING.md §17) says email subjects are layer one: outcome or a real person, never astrology first.

`[CHANGED]` **All six marketing emails in `apps/web/lib/emails.ts`** (five trial emails + the daily nudge). Subjects now lead with a real constellation person when one is on the row, or with a concrete outcome (`Add one more person`, `Your trial ends 24 July`, `{Name}, today`). Preview text is a hidden preheader that continues the subject and does not repeat it. Nudge preview is a name-only-signature function (`nudgeEmailPreview()`), so `copy_resolved` still cannot leak onto a lock screen. Bodies cut to one idea, one action, one primary link. Day 14 keeps the feedback ask as a sentence with `help@galaxiamea.com`, not a second button. Every rewritten string is tagged `FOUNDER-REVIEW`. No em dashes.

`[CHANGED]` **Greeting.** First name once, and only when `resolveAccountName` actually has one. No name: `Hi there,`. The trial-email cron no longer greets by `email.split("@")[0]`; it uses the same resolver as the nudge send job. Send triggers are unchanged.

`[DECISION]` **Daily nudge frequency is not earned.** The send job already skips `empty_hedge`, but still emails `framing_gentle` ("nothing urgent") and generic `drop_domain` lines every local 9am. A daily mail nobody opens trains the inbox to bury the trial emails that matter. Recommendation, not this branch: send only when `copy_tier === "full"`, or drop to a few times a week. No new email types. No trigger change without approval.

`[UNCHANGED]` **CAN-SPAM footer, unsubscribe URLs, RFC 8058 headers, and GoTrue system emails** (magic link, password reset, signup confirmation). Out of scope, never touched.

`[ADDED]` **`changelog.d/cursor-rewrite-marketing-email-voice-d336.md`** (this file).
