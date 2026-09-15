## Hero eyebrow is the tagline only (branch `cursor/hero-eyebrow-tagline-ece2`) — 2026-09-15

**Trigger**: the homepage hero eyebrow still read "Galaxia · your inner circle". The wordmark already names the product, so the prefix was redundant.

`[CHANGED]` **Hero eyebrow in `apps/web/components/marketing/hero.tsx`.** Replaced "Galaxia · your inner circle" with "Your life. Your people. Your galaxy." CSS `.eyebrow` still applies `text-transform: uppercase` and the gold hairline `::before`, so the line renders as YOUR LIFE. YOUR PEOPLE. YOUR GALAXY. with the existing gold decoration. No layout, style, or structural change. Tagged `FOUNDER-REVIEW`. No em dashes. Metadata, JSON-LD, and emails did not carry this string.
