## Homepage hero copy, gold italic accent, and CTA trim (branch `cursor/hero-copy-styling-07e0`) — 2026-09-16

**Trigger**: founder pass on the homepage ATF. Headline keeps the same words; "in your life" gets the gold-italic treatment already used on "Your Galaxy." in the closing heading. Both lede paragraphs are rewritten, the second line is no longer dimmed, and the redundant CTA row (free-chart button, friction line, Log in pill) is gone so the only in-hero action is "See how it works".

`[CHANGED]` **Hero H1 in `apps/web/components/marketing/hero.tsx`.** "in your life" is wrapped in `<em className="hero-h1__accent">`. `.marketing .hero-h1 em` still forces cream, so `globals.css` adds `.marketing .hero-h1 em.hero-h1__accent { color: var(--gold); }` to match `.close-h em`. FOUNDER-REVIEW.

`[CHANGED]` **First lede** is now "Build a real chart for everyone who matters: your loved ones, your colleagues, even the ones you've lost, and learn who they are at their core." FOUNDER-REVIEW.

`[CHANGED]` **Second lede** is now "Yes, it's real astrology. We won't tell you to avoid Geminis, we'll help you actually understand one." Dropped unused `.hero-copy-defense` so the line matches the brightness of the paragraph above. Deleted the CSS rule (it had no other call sites). FOUNDER-REVIEW.

`[CHANGED]` **Hero CTA row.** Removed the gold "See someone's chart free" button, the "No card required · Works with just a birth date" line, and the in-hero Log in pill (already in `MarketingNav`). "See how it works" stays, centered under the ledes, gold, 1.2rem, larger arrow. Reuses the existing `bob` keyframe for a slow pulse on load and a faster bounce on hover. `prefers-reduced-motion` still kills both. Deleted unused `.hero-cta-primary`, `.hero-cta-note`, `.hero-secondary`, and the `HERO_PRIMARY_CTA` export. Quick Chart card and top nav are unchanged.
