## Withdrawn Past conversations preview — product voice, not audit log (branch `cursor/withdrawn-preview-copy-fa40`) — 2026-07-24

**Trigger**: On Hubs' person page, Past conversations showed a raw fabrication-audit `withdrawn_reason` ("Asserted Jamie Chen… Detected by fabrication audit…") as the list preview — correct to surface, wrong voice for a user-facing surface.

`[CHANGED]` **`formatWithdrawnReasonForDisplay` in `apps/web/lib/record.ts`** restates stored audit-voice `withdrawn_reason` at read time for Record / Past conversations / Vela-pin previews. Substance kept (what was asserted, chart disagreement, withdrawn, when). Database `withdrawn_reason` is never overwritten. FOUNDER-REVIEW on every authored string.

`[CHANGED]` **Past conversations row** on the person page wraps withdrawn previews so the full plain-language note stays readable (ordinary previews keep single-line ellipsis).
