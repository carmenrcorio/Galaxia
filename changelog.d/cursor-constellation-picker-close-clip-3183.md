## Constellation picker Close stays reachable (branch `cursor/constellation-picker-close-clip-3183`) — 2026-07-24

**Trigger**: Follow-up to the collapsed Remembrance constellation picker. A tall library modal centered vertically clipped its header off the top of the viewport, so Close was hard to hit.

`[FIXED]` **Library modal aligns to the top and keeps Close in a sticky header.** Overlay scrolls if needed; Close is a labeled control (not a tiny ×). Escape / backdrop dismiss unchanged.
