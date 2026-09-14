## One Galaxia contact address (branch `cursor/fix-invented-contact-addresses-48bd`) — 2026-09-14

**Trigger**: User-facing copy still named `support@galaxia.app` and `help@galaxia.app`. That domain is not ours. The only Galaxia contact address is `help@galaxiamea.com`, already used in the CAN-SPAM footer.

`[FIXED]` **Account-delete auth-close error, Day-14 trial feedback, admin help mailto, and Settings subscription copy all use `GALAXIA_HELP_EMAIL`.** The invented `galaxia.app` mailboxes are gone from shippable source. The error state that told a user to contact `support@galaxia.app` now names `help@galaxiamea.com`.

`[ADDED]` **`GALAXIA_HELP_EMAIL` in `@galaxia/core` (`packages/core/src/contact.ts`).** One exported constant. Call sites import it. Legal markdown uses a `{{GALAXIA_HELP_EMAIL}}` token that `readLegalMarkdown` substitutes at render. The Resend default From address uses the same inbox unless `RESEND_FROM` is set.

`[ADDED]` **Guard in `apps/web/lib/nav-hrefs-resolve.test.ts`.** Fails if a Galaxia email literal appears outside `packages/core/src/contact.ts`, or if a `galaxia.*` host other than `galaxiamea.com` appears except reverse-DNS bundle ids (`com.galaxia.app`).

`[OPEN]` **Terms of Service §15 still has `[GOVERNING STATE]` / `[COUNTY/STATE]` placeholders.** No state was invented to fill them.

`[OPEN]` **`you@example.com` remains the waitlist input placeholder.** It is an RFC 2606 form hint, not a contact address, and does not reach a real user.
