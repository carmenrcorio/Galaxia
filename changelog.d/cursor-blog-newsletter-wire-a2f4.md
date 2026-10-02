## Wire Galaxia Notes box to chart_leads (branch `cursor/blog-cta-image-led-a2f4`)

`[CHANGED]` Blog mid-article newsletter box posts to `POST /api/chart-lead/newsletter-signup` (rate limited on that route). Removed the temporary `POST /api/blog/newsletter-signup` stub.

`[ADDED]` Vercel Analytics events `newsletter_box_viewed` and `newsletter_submitted` with `source: "blog"` only.

`[ADDED]` Fine print under the email field with frequency, unsubscribe note, and link to `/privacy`.
