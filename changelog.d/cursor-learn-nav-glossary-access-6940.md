## Learn hub and in-app glossary access (branch `cursor/learn-nav-glossary-access-6940`) - 2026-10-03

**Trigger**: Signed-in users could reach the blog from the app nav but not the glossary or a single learn entry point. "Why this reading" always linked to `/methodology` even when a glossary term existed.

`[ADDED]` **`/learn` hub.** Public landing page linking to `/glossary`, `/blog`, and `/methodology` without merging content. Sitemap entry included.

`[CHANGED]` **Navigation.** App nav replaces Blog with Learn. Marketing nav adds Learn after Blog. Settings adds a Learn section with links to the hub and glossary.

`[CHANGED]` **Why this reading links.** Derivation panels link to `/glossary#{slug}` when `GLOSSARY_TERMS` has a match; otherwise they still link to `/methodology`.
