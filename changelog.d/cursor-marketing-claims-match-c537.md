## Marketing claims match what ships (branch `cursor/marketing-claims-match-c537`) — 2026-09-10

**Trigger**: a live audit found the marketing surface promising a yearly plan the paywall cannot sell, native apps that do not exist, a free product that is a 14-day trial, a notify-me flow that was not where copy said it was, and unshipped shared-space Vela behaviour.

`[FIXED]` **Public claims now match the shipped product.** Homepage JSON-LD is web-only and describes a 14-day trial then $9.99/month, not a free iOS/Android app. `/pricing` sells monthly only (Fork A: yearly removed until a real RevenueCat SKU exists). `/download` hosts the waitlist form. `/r/[slug]` no longer shows dead store buttons. Signup meta describes name/email/password, not birth data. Vela marketing copy describes private behaviour only. The unused `POST /api/checkout` 501 stub is gone. Quick Chart is in the marketing nav and footer; Download is in the footer.
