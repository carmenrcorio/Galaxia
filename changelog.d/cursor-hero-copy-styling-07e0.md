## Homepage hero copy and gold italic accent (branch `cursor/hero-copy-styling-07e0`) — 2026-09-15

**Trigger**: founder pass on the homepage ATF. Headline keeps the same words; "in your life" gets the gold-italic treatment already used on "Your Galaxy." in the closing heading. Both lede paragraphs are rewritten, and the second line is no longer dimmed.

`[CHANGED]` **Hero H1 in `apps/web/components/marketing/hero.tsx`.** "in your life" is wrapped in `<em className="hero-h1__accent">`. `.marketing .hero-h1 em` still forces cream, so `globals.css` adds `.marketing .hero-h1 em.hero-h1__accent { color: var(--gold); }` to match `.close-h em`. FOUNDER-REVIEW.

`[CHANGED]` **First lede** is now "Build a real chart for everyone who matters: your loved ones, your colleagues, even the ones you've lost, and learn who they are at their core." FOUNDER-REVIEW.

`[CHANGED]` **Second lede** is now "Yes, it's real astrology. We won't tell you to avoid Geminis, we'll help you actually understand one." Dropped unused `.hero-copy-defense` so the line matches the brightness of the paragraph above. Deleted the CSS rule (it had no other call sites). FOUNDER-REVIEW.
