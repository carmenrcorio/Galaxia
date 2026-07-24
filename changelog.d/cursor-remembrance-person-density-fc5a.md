## Remembrance person page density (branch `cursor/remembrance-person-density-fc5a`) — 2026-07-24

**Trigger**: The remembrance person page (e.g. Viejita) stacked duplicate Ask Vela CTAs and left "Who carries their light?" fully open, so a memorial surface felt busy instead of calm.

`[FIXED]` **One Ask Vela entry on remembrance pages.** Header "Ask Vela" and the "Vela on {name}" empty/more pills are suppressed when `RemembranceSpace` is mounted. The sole entry remains inside RemembranceSpace (`Ask Vela about {name}`, remembrance-framed, no prefill). Living person pages keep their existing header + Vela-on-them CTAs.

`[CHANGED]` **"Who carries their light?" is a closed-by-default disclosure.** `HonorDeclarationBox` is a native `<details>` with the existing eyebrow as summary — collapsed until opened. Top jump pill to `#honor-light` unchanged.

`[CHANGED]` **Calmer memorial rhythm.** Passed-person pages use `app-content--remembrance` (wider section gap) and RemembranceSpace internal spacing is loosened. No new user-facing copy.
