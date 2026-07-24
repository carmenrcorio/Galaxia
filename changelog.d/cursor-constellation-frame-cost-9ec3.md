## Constellation frame-cost diagnose (branch `cursor/constellation-frame-cost-9ec3`) — 2026-07-24

**Trigger**: P4 shooting stars never appear because `lowPerf` is true for nearly
all users (frame 0 at 375px; within seconds on desktop). That also sheds inner
glow and nebula quality on the home surface. Profile the base canvas before
touching meteor timing.

### Method

Playwright · 14 people · 14 synastry edges · 2 honor edges · DPR-2 · CDP CPU
throttle. Per-layer `performance.now()` marks inside the constellation `draw()`
loop. A/B: skip nebula blit (`profile=nonebula`). Grain is CSS — $0 on canvas.

### 1. Cost breakdown (avg ms / frame inside constellation draw)

**375px · DPR-2 · 4× throttle · shipping (`lowPerf=true` from heuristic)**

| Layer | ms | % of totalDraw |
|---|---:|---:|
| **nebulaBlit** (`drawImage` + `lighter`) | **8.97** | **87%** |
| nodes body (forms, not glow) | 0.35 | 3% |
| nebulaRender (amortised; runs ~11×/s) | 0.29 | 3% |
| synastry beziers (14) | 0.27 | 3% |
| layout (seats + label offsets) | 0.23 | 2% |
| honor edges (2) | 0.14 | 1% |
| wash blit | 0.07 | <1% |
| ring guides | 0.04 | <1% |
| nodesGlow (createRadialGradient fills) | ~0.20/frame† | ~2% |
| nodes labels / transit shimmer / meteors / clear | ≤0.02 each | ~0 |
| **totalDraw** | **10.3** | 100% |
| wallDt (rAF gap; includes throttle/compositor) | 25.3 | — |

† `nodesGlow` mark is per-fill; 16 glow fills/frame under `lowPerf` → ~0.2ms/frame aggregate.

**375px · DPR-2 · 4× · undegraded (`profile=full`, inner glow on, 3 puffs)**

| Layer | ms | % |
|---|---:|---:|
| **nebulaBlit** | **15.7** | **94%** |
| everything else combined | ~1.1 | 6% |
| totalDraw | 16.8 | |
| glow fills/frame | ~33 (halo+core × ~14) | still ≪ blit |

**1450px · DPR-2 · 4× · shipping** (buf 1716×1296)

| Layer | ms | % |
|---|---:|---:|
| **nebulaBlit** | **66.3** | **99%** |
| totalDraw | 66.9 | |
| wallDt | 107 | |

**A/B proof (375 · 4×):** skip nebula blit → totalDraw **10.1 → 1.6ms**. Glow and
synastry unchanged. Nebula blit is the canvas budget.

### 2. What redraws every frame that need not

| Layer | Every frame today? | Needs to? |
|---|---|---|
| Wash | blit cached | yes (cheap) |
| **Nebula** | **full-buffer `lighter` blit every frame** | **No — content updates ≤11×/s; bake into atmosphere cache on refresh, opaque blit (or fold into wash)** |
| Ring guides | stroke ellipses (+ optional 1.2% breath) | breath only; static rings cacheable |
| Synastry beziers | recompute gradients + curve | yes while nodes drift; cheap (~0.3ms) |
| Honor edges | dual stroke + pulse gradient | yes while live; cheap at n=2 |
| Node glows | new radial gradient per node per frame | could sprite-cache per (color,sharpness,R); **low payoff vs blit** |
| Labels | `fillText` each | yes; trivial |
| Grain | CSS overlay | n/a |

### 3. DPR-2 necessity

- Whole constellation canvas is DPR-capped at 2 → phone buf ~682×763; desktop ~1716×1296.
- **Static atmosphere (wash + nebula) does not need DPR-2.** Motion/nodes/links benefit from sharpness; the 4× pixel count on the `lighter` blit is paying for soft gas.
- Split: atmosphere buffers at DPR-1 (or 1.5), motion layers at DPR-2, is viable and stacks with bake-into-wash.

### 4. Node-count / glow math

- Production: people N (demo 14), synastry **top-14**, honor sparse.
- Glow stack: 1 halo fill + (if !lowPerf) 1 core fill → **~14–28 gradient fills/frame**.
- Measured cost: **~0.2–0.4ms/frame** — not the budget. Pre-rendering per colour would save little until blit is fixed.
- Phone heuristic `DPR>=2 && W<430` / `min(W,H)<380` sets `lowPerf=true` at frame 0 and sheds glow/nebula quality **without** fixing the blit.

### Starfield note

Page `CosmicBackground` is a second DPR-2 canvas. At 375 its JS draw is ~0.3ms
(47 stars after layer shed). It is not the constellation’s JS hotspot; the
constellation `lighter` blit is.

### Top cuts (ranked by payoff) — awaiting pick

1. **Bake nebula into the cached atmosphere; stop per-frame `lighter` full-buffer blit.**  
   Payoff: removes ~87–99% of measured constellation draw. Visual: same gas, composited on the ~11Hz refresh. Cost if wrong: slight drift quantisation (already throttled).

2. **Atmosphere at DPR-1, nodes/links at DPR-2** (or bake at DPR-1 into wash).  
   Payoff: 4× fewer pixels on the heavy path; keeps sharp stars. Cost: soft layer slightly softer on retina (usually invisible for wash/nebula).

3. **Remove or narrow the frame-0 phone `lowPerf` heuristic** once #1 lands.  
   Payoff: inner glow + full nebula puffs + meteors can stay on; today the heuristic forces degraded home for every phone regardless of real FPS. **Do not** do this alone while blit still costs 9–15ms.

Not recommended as the first cut: glow sprite atlas, dropping synastry, removing nebulae entirely — wrong layer or low payoff.

`[OPEN]` Steady-state `lowPerf=false` on a normal phone is the gate before P4
meteors return on existing timing. Do not force meteors over a struggling frame.
