# Interpretation review batches

Founder review happens in this folder. **Draft copy never lands in `packages/astro` until approved.**

## Batch files

- One file per batch: `batch-NN.md` (zero-padded, e.g. `batch-01.md`).
- Each entry is a level-3 heading: `### CH-001 · chiron-sun:conjunction`
- Required fields (bullets under the heading):
  - **Short:** (collapsed phrase)
  - **Long:** (1–2 sentences, actionable where possible)
  - **Traditional basis:** one line of classical/modern rationale
  - **Approve:** leave blank until approved (`yes` to ship)
  - **Edit:** founder notes (optional)
  - **Flags:** optional `[CONTESTED]` when traditions disagree (use the more cautious reading in Short/Long)

## Apply approved rows

From repo root:

```bash
pnpm readings:apply docs/readings-review/batch-01.md --dry-run
pnpm readings:apply docs/readings-review/batch-01.md
```

Only rows with **Approve:** `yes` (case-insensitive) are written into:

- `packages/astro/src/synastry-interpretations.ts` for `chiron-*` synastry cells
- `packages/astro/src/interpretations.ts` for natal `ASPECT_PAIR` and Chiron placement cells (later batches)

Then runs `@galaxia/astro` tests. No `FOUNDER-REVIEW` tags are added to shipped strings.

## Batch plan (founder-approved)

| Batch | Scope |
|-------|--------|
| 01 | 55 Chiron synastry cells (11 bodies × 5 majors) |
| 02 | Chiron in 12 signs + 12 houses |
| 03+ | 232 missing natal cells, 60 per batch, quincunx last (top14 frequency order) |

Do not start batch N+1 until batch N is applied.
