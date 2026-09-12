## Fix iOS blank galaxy share, 6s button delay, and wrong sky (branch `cursor/fix-galaxy-share-ios-readback-823c`) — 2026-09-12

**Trigger**: after the WebKit html-to-image fix, a real iPhone Save was still a blank PNG, the image was not the account's sky (a stripped / fixture raster), and Share sky image took about 6 seconds to appear.

`[FIXED]` **Galaxy export redraws this account's settled sky onto offscreen canvases.** A blit of the *on-screen* GPU-promoted layers (`position: absolute`) is empty on iOS even though they paint; watermarking that empty raster first let a gold `galaxiamea.com` pass the blank check. `/app` now cancels the live rAF, paints the signed-in account's `people` / `links` / honor edges (full glow stack, `lowPerf = false`, ignition settled, no hover, no meteors) onto CPU-backed offscreen canvases (`willReadFrequently`), then `composeGalaxySharePng` composites those. Asserts content *before* the watermark. Returns a PNG `Blob` (object URL for download) — iOS Web Share of a large `data:` URL is a known empty-file failure. Never a fixture constellation and never the live lowPerf shed.

`[FIXED]` **Share sky image is visible as soon as the sky has people.** The control was gated on `entranceSettled` (ignition duration + 400ms), which is about 6s on a large constellation. It now shows when `!loading && people.length > 0`. A tap mid-entrance still exports the *settled* frame (`exportSettled`), not a half-lit sky.

`[ADDED]` Wiring tests that the home share button is not gated on entrance and that capture goes through the offscreen redraw of loaded people. Blob share does not `fetch` a data URL. Empty blobs fail closed. Blank detection still fails a background-only raster (watermark cannot mask it).
