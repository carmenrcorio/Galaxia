## Homepage hero copy and sky-block removal (branch `cursor/f16-hero-copy-4c6c`) — 2026-09-14

**Trigger**: Founder-specified homepage above-the-fold copy pass. Visible hero strings only. Metadata, Open Graph, and JSON-LD stay as they are.

`[CHANGED]` **Hero headline** is now "Better understand the people in your life." FOUNDER-REVIEW.

`[ADDED]` **Hero subheading** directly under the H1: "Yes, it uses astrology. No, it will not tell you to avoid Geminis." Uses the existing `.lede` type already used as the hero subhead. FOUNDER-REVIEW.

`[CHANGED]` **Hero body** is the specified chart-for-each-person paragraph, including the parenthetical. FOUNDER-REVIEW.

`[CHANGED]` **Sky thesis block removed** from `Hero`. The two-line paragraph after Quick Chart ("The sky has been used to explain ourselves for three thousand years. We pointed it at the people we love instead.") is gone and nothing replaces it. That element carried `margin-top: clamp(28px, 4vw, 44px)` plus two lines of `.lede`, so Quick Chart now sits closer to How it works. Hero `padding-bottom` is unchanged. No compensating gap was added.

Metadata title, description, Open Graph, Twitter, and SoftwareApplication JSON-LD are untouched.
