## Shareable family pattern card (branch `cursor/family-pattern-card-a454`) — 2026-09-14

**Trigger**: A group or family comparison should be shareable as a 1080 square card of first names and shared signs, with an explicit privacy confirm, never a birth date, time, or place.

`[ADDED]` **1080x1080 pattern card from the Chart Grid.** Reuses the existing share stack: `detectFamilyPatterns` + `interpretSharedPlacement` for content, `next/og` `ImageResponse` (same path as `/s/[token]/opengraph-image`) for the PNG, and `deliverSharePng` (the ShareImageButton OS share / download helper, also used by the memorial timeline). The grid's old html-to-image capture of the comparison table is replaced so houses never leave the owner's screen.

`[ADDED]` **Card content is signs and first names only.** Headline is every detected shared placement (`Leo Sun · Cancer Moon`). One line is the first sentence of the existing shared-placement interpretation. Memorial people get a gold mark. `splitFullName` strips last names. Houses, charts, and birth fields are never on the payload.

`[ADDED]` **Privacy confirm before generate.** Share pattern opens a dialog that lists who is on the card and the exact headline and pattern line, lets the owner remove a person, and requires an explicit checkbox plus Create and share this card. The image is not requested until that confirm.

`[ADDED]` **Bundled Cormorant Garamond and DM Sans.** TTF files live next to `POST /api/family-pattern-card` and are read from disk at render time. No Google Fonts fetch. Deep navy, gold, violet, small galaxiamea.com mark. Every new user-facing string is tagged FOUNDER-REVIEW. No em dashes.

`[DECISION]` **Phase 0.** Share generation already existed (memorial timeline + family comparison via ShareImageButton, galaxy via offscreen canvas, `/s` OG via ImageResponse). The comparison grid holds six personal placements: sign, optional house, confident. A card can be built from signs alone; houses are birth-time-derived and stay off the card.
