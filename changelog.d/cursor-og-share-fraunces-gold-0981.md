## OG share images — Fraunces + #E6AE6C (branch `cursor/og-share-fraunces-gold-0981`) — 2026-09-16

**Trigger**: The live site uses Fraunces and `#E6AE6C`. Site-wide `/opengraph-image` still rendered Cormorant Garamond at `#d4a855`, so shared links unfurled in the retired type and gold.

`[CHANGED]` **Share image generation only.** `app/opengraph-image.tsx` and the family-pattern-card `ImageResponse` route now load the bundled Fraunces Regular/SemiBold TTFs (same static instances as `/s/[token]/opengraph-image`) and paint gold as `#E6AE6C`. Rendered website components, favicons, emails, and the memorial timeline are unchanged.
