## Static nebula guide rings (branch `cursor/d10-static-rings-ca71`) - 2026-09-14

**Trigger**: D10 shipped two counter-rotating CSS drift canvases. The orbit fought the stars. The nebula treatment stays; the rotation does not.

`[CHANGED]` **Guide rings are a static offscreen cache blit into the motion canvas.** `RING_BAND_COLORS`, two-pass `paintNebulaBand`, and `drawRingStardust` are unchanged. `innerDriftCanvasRef` / `outerDriftCanvasRef`, `ringDriftCW` / `ringDriftCCW`, and the `.ring-drift-*` classes are gone. Rings paint once into `ringCache` (size, DPR, Rings toggle, `lowPerf`) and `drawImage` onto the motion canvas each frame. Stars still drift (D12). Share-image uses the same blit, so export matches the live sky.
