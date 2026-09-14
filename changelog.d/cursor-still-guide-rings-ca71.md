## Still the constellation guide rings (branch `cursor/still-guide-rings-ca71`) — 2026-09-14

**Trigger**: The home constellation's nebula guide rings were orbiting on two CSS-rotating canvases (inner 90s clockwise, outer 70s counter-clockwise). The motion fought the stars.

`[CHANGED]` **Guide rings no longer rotate.** One static cached canvas paints `GALAXY_GUIDE_RINGS`. The Rings toggle, nebula-band look, and share-image paint path are unchanged. `prefers-reduced-motion` no longer has a special ring-drift exception because there is no ring animation to kill.
