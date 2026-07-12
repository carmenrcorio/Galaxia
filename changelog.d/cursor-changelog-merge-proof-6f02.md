## Changelog is now merge-proof: entries live in `changelog.d/` (branch `cursor/changelog-merge-proof-6f02`) — 2026-07-12

**Trigger**: every branch appended its entry to the **same** spot at the top of
`CHANGELOG.md` (right after the intro `---`), so nearly every PR hit a merge
conflict on the changelog. The conflicts were pure noise — always the same
region, never a semantic clash.

`DECISION` **Adopt the `changelog.d/` fragment pattern (option b).** Each change
now writes its own file `changelog.d/<branch-slug>.md` instead of editing
`CHANGELOG.md` directly. Parallel branches add *different* files, so they can
never collide. Chosen over the "Unreleased bullet list" option (a) because that
still funnels every branch into one shared section (trivial but non-zero
conflicts), whereas per-file fragments eliminate the collision entirely — the
repo already has a `scripts/*.mjs` convention and a plain Node collator needs no
new dependencies.

`ADDED` **`changelog.d/` with `README.md` (the convention) and `_TEMPLATE.md`**,
plus `scripts/collate-changelog.mjs` (run via `pnpm changelog:collate --write`)
which folds all fragments into the top of `CHANGELOG.md` newest-first and
deletes them at release. `README.md` and `_`-prefixed files are ignored by the
collator.

`CHANGED` **`CHANGELOG.md` intro and `ENGINEERING.md` §11** now document the new
convention so every future change (and every AI-agent prompt) adds a fragment
instead of editing the top of the changelog. Untouched per §2: `next.config.mjs`,
`.npmrc`, Vercel settings.
