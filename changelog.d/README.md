# `changelog.d/` — merge-proof changelog fragments

Every branch used to edit the **top** of `../CHANGELOG.md` in the exact same
place, so nearly every PR collided on the changelog and had to be
hand-resolved. This directory fixes that: **each change gets its own file**, so
parallel branches touch *different* files and never conflict.

## How to add a changelog entry

1. Create **one new file** in this directory named after your branch (or PR):

   ```
   changelog.d/<your-branch-slug>.md
   ```

   Use the branch name with slashes replaced by `-`, e.g. branch
   `cursor/fix-account-name-fc1d` → `changelog.d/cursor-fix-account-name-fc1d.md`.
   Because the filename is unique to your branch, two branches never write the
   same file and there is nothing to merge.

2. Put the entry inside, written exactly as it should appear in `CHANGELOG.md`
   (a `##` section, newest-first house style). Copy `_TEMPLATE.md` as a start:

   ```markdown
   ## <Short title> (branch `<your-branch>`) — <YYYY-MM-DD>

   **Trigger**: why this change exists.

   `[TYPE]` what changed and the reason. Types: `DECISION`, `FIXED`, `ADDED`,
   `CHANGED`, `REVERTED`, `BROKEN`, `OPEN` (see `../ENGINEERING.md` §11).
   ```

3. Commit the fragment on your branch alongside the code change. **Do not edit
   the top of `CHANGELOG.md` directly** — that is the collision this pattern
   removes.

## What happens at release

At release time, a maintainer runs:

```bash
pnpm changelog:collate --write
```

This prepends every fragment here (newest first) into `../CHANGELOG.md` under
the header, then deletes the consumed fragment files, leaving this directory
empty except for `README.md` and `_TEMPLATE.md`. Run without `--write` to
preview the collated output without changing anything.

## Rules

- One file **per change**, named for the branch/PR. Never share a file.
- `README.md` and files beginning with `_` (e.g. `_TEMPLATE.md`) are ignored by
  the collator — they are not entries.
- The released history in `CHANGELOG.md` is append-only; the collator only
  inserts, it never rewrites existing sections.
