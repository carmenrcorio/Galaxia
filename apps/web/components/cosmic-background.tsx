"use client";

/**
 * CosmicBackground
 * Ported from design/reference/galaxia-landing-v2.html, then given DEPTH
 * (galaxy glow-up, Phase 2):
 *   - .aura: four-layer radial-gradient fixed background (deep indigo/violet —
 *            the "not pure black" background color depth)
 *   - .milkyway: rotated blurred radial gradient
 *   - #stars canvas: the flat single-layer starfield is now split into three
 *            PARALLAX DEPTH LAYERS (far / mid / near). Each layer has its own
 *            density, star size, brightness and parallax factor, so on pointer
 *            move (desktop) and device orientation (mobile, if the sensor
 *            fires) the nearer layers shift more than the farther ones — a
 *            gentle, real sense of volume. Twinkle via accumulating angle
 *            (s.a += s.tw). Scroll parallax preserved. prefers-reduced-motion
 *            disables twinkle AND all parallax and draws one static frame.
 *   - .grain: fixed SVG noise overlay, opacity .05, mix-blend-mode overlay
 *   - .vignette: inset box-shadow — darker edges drawing the eye inward
 *
 * PERFORMANCE: the whole field is plain filled arcs (no per-frame blur/filter);
 * star counts scale with viewport area and are capped so a 375px phone draws a
 * few hundred, not thousands. An EMA frame-budget watch drops the far layer if
 * a device can't sustain the full three, so mobile degrades rather than janks.
 */

import { useEffect, useRef } from "react";

interface Star {
  x: number; y: number;
  r: number;          // physical radius in DPR pixels
  a: number;          // accumulating twinkle angle
  tw: number;         // twinkle speed
  baseA: number;      // steady per-star brightness (the star's resting alpha)
  amp: number;        // twinkle amplitude — 0 for the majority (steady) stars
  depth: number;      // for scroll parallax (0.2–0.8)
}

/* Depth layers, far → near. `parallax` is how far (in CSS px) the layer slides
   at a full pointer/tilt deflection; nearer layers move more. `density` is the
   px² per star (smaller = denser). Kept SUBTLE on purpose — a few px of travel,
   not a swoop. */
interface Layer {
  stars: Star[];
  parallax: number;   // max CSS-px shift at full deflection
  density: number;    // one star per this many CSS px²
  rMin: number; rMax: number;   // radius range (× DPR)
  aMin: number; aRange: number; // resting-brightness range
  twMul: number;      // twinkle-speed multiplier
  ox: number; oy: number;       // current (lerped) parallax offset, CSS px
}

export function CosmicBackground() {
  const starsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const sc = starsRef.current;
    if (!sc) return;
    const sx = sc.getContext("2d");
    if (!sx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0;
    let scrollY = 0;
    let raf = 0;

    /* three depth planes. far = many tiny dim slow-parallax; near = fewer,
       larger, brighter, more parallax. */
    const layers: Layer[] = [
      { stars: [], parallax: 9,  density: 4200, rMin: 0.15, rMax: 0.65, aMin: 0.14, aRange: 0.20, twMul: 0.7, ox: 0, oy: 0 },
      { stars: [], parallax: 24, density: 6500, rMin: 0.35, rMax: 1.05, aMin: 0.26, aRange: 0.30, twMul: 1.0, ox: 0, oy: 0 },
      { stars: [], parallax: 42, density: 9500, rMin: 0.55, rMax: 1.55, aMin: 0.40, aRange: 0.36, twMul: 1.3, ox: 0, oy: 0 },
    ];
    /* adaptive: on a struggling device the farthest (densest) layer is dropped */
    let activeLayers = layers.length;

    /* pointer / gyro deflection, normalized to roughly −1..1 on each axis,
       lerped toward its target each frame for smoothness. */
    let targetX = 0, targetY = 0;

    function sizeStars() {
      W = sc!.width  = innerWidth  * DPR;
      H = sc!.height = innerHeight * DPR;
      sc!.style.width  = innerWidth  + "px";
      sc!.style.height = innerHeight + "px";
      const area = innerWidth * innerHeight;
      const small = innerWidth < 480;
      for (const layer of layers) {
        // fewer stars on small screens; hard cap keeps the densest layer sane
        const divisor = layer.density * (small ? 1.7 : 1);
        const n = Math.min(Math.round(area / divisor), 900);
        layer.stars = [];
        for (let i = 0; i < n; i++) {
          layer.stars.push({
            x:     Math.random() * W,
            y:     Math.random() * H,
            r:     (Math.random() * (layer.rMax - layer.rMin) + layer.rMin) * DPR,
            a:     Math.random() * Math.PI * 2,
            // Twinkle speed (see history in git): a slow ~55–260s pulse,
            // scaled per layer so nearer stars breathe a touch faster.
            tw:    (Math.random() * 0.0015 + 0.0004) * layer.twMul,
            baseA: Math.random() * layer.aRange + layer.aMin,
            // Only ~30% of stars twinkle at all, gently, never through zero.
            amp:   Math.random() < 0.30 ? Math.random() * 0.10 + 0.04 : 0,
            depth: Math.random() * 0.6 + 0.2,
          });
        }
      }
    }

    let emaFrameMs = 16.7, lastFrame = performance.now(), warmup = 0;

    function drawStars() {
      const now = performance.now();
      const dt = now - lastFrame; lastFrame = now;
      if (!reduce) {
        if (warmup > 10) {
          emaFrameMs = emaFrameMs * 0.9 + dt * 0.1;
          // sustained <~34fps → shed the densest (far) layer once
          if (activeLayers === layers.length && emaFrameMs > 29) activeLayers = layers.length - 1;
        } else { warmup++; }
      }

      sx!.clearRect(0, 0, W, H);
      // ease the parallax offset toward the pointer/tilt target
      for (let li = 0; li < layers.length; li++) {
        const layer = layers[li];
        const tox = reduce ? 0 : targetX * layer.parallax;
        const toy = reduce ? 0 : targetY * layer.parallax;
        layer.ox += (tox - layer.ox) * 0.06;
        layer.oy += (toy - layer.oy) * 0.06;
      }

      // farthest layer first so nearer, brighter stars paint on top
      for (let li = layers.length - activeLayers; li < layers.length; li++) {
        const layer = layers[li];
        const px = layer.ox * DPR, py = layer.oy * DPR;
        for (let i = 0; i < layer.stars.length; i++) {
          const s = layer.stars[i];
          if (!reduce) s.a += s.tw;
          const al = s.baseA + (reduce ? 0 : s.amp * Math.sin(s.a));
          // scroll parallax (preserved from landing) + pointer/tilt parallax
          let yy = s.y - scrollY * DPR * s.depth * 0.15 + py;
          yy = ((yy % H) + H) % H;
          let xx = s.x + px;
          xx = ((xx % W) + W) % W;
          sx!.beginPath();
          sx!.arc(xx, yy, s.r, 0, Math.PI * 2);
          sx!.fillStyle = `rgba(244,236,219,${al.toFixed(3)})`;
          sx!.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(drawStars);
    }

    function onScroll() { scrollY = window.scrollY; }
    const onResize = () => {
      sizeStars();
      if (reduce) drawStars();
    };

    /* desktop parallax — pointer position relative to viewport centre */
    const onPointer = (e: PointerEvent) => {
      if (reduce) return;
      targetX = (e.clientX / innerWidth  - 0.5) * 2;
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    };
    /* mobile parallax — device tilt, if the sensor fires (no permission prompt;
       absent sensor simply leaves the field still). gamma = left/right tilt,
       beta = front/back. Clamped so a small tilt is enough. */
    const onOrient = (e: DeviceOrientationEvent) => {
      if (reduce || e.gamma == null || e.beta == null) return;
      const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      targetX = clamp(e.gamma / 25, 1);
      targetY = clamp((e.beta - 45) / 25, 1);
    };

    sizeStars();
    drawStars();
    if (reduce) drawStars();   // single static frame for reduced-motion

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    if (!reduce) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("deviceorientation", onOrient);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, []);

  return (
    // overflow:hidden here only clips position:absolute descendants — it would
    // do nothing for position:fixed ones, since fixed elements are positioned
    // against the viewport (initial containing block), not this wrapper,
    // *unless* an ancestor establishes a containing block for them (a
    // transform/filter/etc., which this wrapper doesn't have). That's exactly
    // the bug: every child below used to be independently position:fixed, so
    // none of them were ever actually contained by anything. .milkyway's
    // inset:-20% -20% auto -20% intentionally renders ~1.4x viewport width
    // (verified empirically: 448px at a 320px viewport, 525px at 375px, 546px
    // at 390px — exactly 1.4x every time) to get an oversized rotated blur
    // without doing that math by hand. On desktop that bled past the edges
    // harmlessly. This wrapper is already position:fixed + inset:0, i.e.
    // already pinned to and sized to the viewport at all times — so switching
    // every child to position:absolute keeps them pixel-identical to before,
    // while making overflow:hidden below actually take effect and guarantee
    // nothing here can ever be measured wider than the viewport, on any
    // browser, regardless of any specific engine's fixed+transform quirks.
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>

      {/* .aura — exact from landing */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: [
          "radial-gradient(120% 80% at 78% -5%, rgba(110,177,184,.10), transparent 55%)",
          "radial-gradient(90% 70% at 12% 8%, rgba(183,154,216,.12), transparent 50%)",
          "radial-gradient(120% 100% at 50% 120%, rgba(230,174,108,.08), transparent 60%)",
          "linear-gradient(180deg,#0a0717 0%, #0c0820 40%, #0a0717 100%)"
        ].join(",")
      }} />

      {/* .milkyway — exact from landing (parallax handled by JS in landing; here CSS) */}
      <div style={{
        position: "absolute", zIndex: 0, pointerEvents: "none",
        inset: "-20% -20% auto -20%", height: "140%",
        background: "radial-gradient(60% 40% at 50% 50%, rgba(183,154,216,.07), transparent 70%)",
        transform: "rotate(-18deg)",
        filter: "blur(20px)",
      }} />

      {/* #stars canvas */}
      <canvas ref={starsRef} style={{ position: "absolute", inset: 0, zIndex: 0, width: "100%", height: "100%" }} />

      {/* .grain — exact from landing */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        opacity: .05,
        mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />

      {/* .vignette — exact from landing */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        boxShadow: "inset 0 0 240px 60px rgba(5,3,12,.9)",
      }} />

    </div>
  );
}
