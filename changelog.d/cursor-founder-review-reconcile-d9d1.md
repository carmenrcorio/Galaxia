## Founder review backlog reconcile (branch `cursor/founder-review-reconcile-d9d1`) — 2026-10-02

**Trigger**: Hundreds of `FOUNDER-REVIEW` tags remain on `main` while ENGINEERING.md §11 says tags should not reach merge. Carmen needs one inventory, historical context, and a single command to clear approved copy without editing strings by hand.

`[ADDED]` **`docs/founder-review-queue.md`** replaces stale `docs/founder-review-strings.md` with one checkbox row per user-visible string on `main`, grouped by file and sorted by surface prominence.

`[ADDED]` **`pnpm founder-review:apply`** (`scripts/founder-review-apply.mjs`) reads checked rows from the queue and strips only `FOUNDER-REVIEW` markers; **`--dry-run`** prints planned edits. Supporting scripts: `founder-review:queue`, `founder-review:history`, shared `founder-review-lib.mjs`, and `docs/founder-review-tag-inventory.jsonl` (machine-readable classification of every tag).

`[CHANGED]` **`pnpm founder-review:list`** now uses the shared scanner. Root **`pnpm test`** also runs `scripts/founder-review-tooling.test.mjs`.
