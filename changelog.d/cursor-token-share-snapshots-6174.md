## Token-based Quick Chart share links (branch `cursor/token-share-snapshots-6174`) — 2026-07-22

**Trigger**: "Copy share link" on `/chart` and `/chart/compare` put exact birth date, time, and coordinates in the query string, which then traveled through the WOM loop. Shares must carry only an unguessable token.

`[ADDED]` **`quick_share_snapshots` table** — `share_token` (unique), `kind` (`single` | `compare`), `payload` (jsonb of the already-computed reading), `created_at`. RLS enabled with **no** anon/authenticated policies; reads and writes go through the service-role Next.js API only. No FK to people/charts/notes.

`[ADDED]` **`POST /api/quick-share`** — persists the current computed reading, returns `{ token }`. Payload stores only what the reading displays (`displayDate`, `birthPlace` name, optional display names) plus engine output (placements, orbs, scores, generational). Exact birth time, lat/lng, and `tzOffsetMin` are stripped and never stored. **Structural guarantee:** compare + `pairHasMinor` + romantic framing → **400, no insert**.

`[ADDED]` **`/s/[token]`** — public read-only snapshot view (outside the middleware matcher). Unknown or forged tokens 404 and never fall through to another snapshot. Renders the stored reading only (no recompute). Compare framing uses stored `pairHasMinor`; a romantic+minor row (which persist refuses) snaps to held/platonic as a backstop. Signup CTA kept; PDF stays subscriber-gated.

`[CHANGED]` **Copy share link** on `/chart` and `/chart/compare` now POSTs the reading and copies `https://<host>/s/<token>` — no birth PII in the URL. Old `/chart?…` birth-param links still open (backward compatible).
