## Restore Sun/Moon/Rising tiles under the natal wheel (branch `cursor/restore-sign-tiles-932a`) — 2026-09-16

**Trigger**: The person-page IA restructure (#291) dropped the compact Sun/Moon/Rising tile row that sat with the natal wheel inside the share-image capture. The three-up snapshot row is back.

`[FIXED]` **Sun / Moon / Rising tiles render directly below the natal wheel** on the person page, public Quick Chart, and `/s` snapshots. Same `sign-chip` cards as before (equal-width row, uppercase labels, serif sign names from the chart object). Sun and Rising use the shared `glyph-sq` + `SIGN_GLYPH` badge; Moon uses the standalone crescent. The row lives inside `ChartImageExport` with the wheel so a shared PNG includes both. No chart math or interpretation copy changed.
