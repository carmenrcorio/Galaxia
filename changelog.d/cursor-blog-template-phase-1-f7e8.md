## Blog template phase 1 (branch `cursor/blog-template-phase-1-f7e8`) — 2026-09-29

**Trigger**: The 19 published posts were reading as two batches. Phase 1 makes them share one layout. Phases 2 and 3 wait until this merges.

`[CHANGED]` **One post template.** Title, byline, hero slot, "In this piece" (only at 3 or more H2s), body, closing chart form, then "Read next." The extra "Start 14 days free" button is gone. The mid-post link sits after the section's first paragraph.

`[CHANGED]` **Visible dates.** Evergreen posts hide the publish date. `datePublished` in JSON-LD still uses `published_at`. Timely posts show the date when `is_timely` is true.

`[ADDED]` **`posts.is_timely` and `posts.expires_at`.** Migration `20260929230323_blog_post_timely_and_drop_pricing_lines.sql`. Three retrograde posts are timely. The same migration removes the "never charged per message" (and the sun-sign "per question") line from six older bodies.

`[CHANGED]` **Blog header.** Free chart, Blog, and Pricing, same labels as the marketing nav.

`[CHANGED]` **Closing form copy.** Founder-supplied helper and short birth-time note. Witty variant is stored and not shown. Birth place is marked optional.

`[CHANGED]` **Curly quotes at read time** for titles, deks, bodies, and figure text. Stored rows and `published_at` are unchanged. Code fences and URLs are skipped.
