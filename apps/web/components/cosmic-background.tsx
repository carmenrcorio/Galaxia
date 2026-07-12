"use client";

/**
 * CosmicBackground
 * Ported precisely from design/reference/galaxia-landing-v2.html:
 *   - .aura: four-layer radial-gradient fixed background
 *   - .milkyway: rotated blurred radial gradient with parallax
 *   - #stars canvas: ~1 star per 9 000 px², twinkle via accumulating angle (s.a += s.tw),
 *                    depth-based scroll parallax, no motion when prefers-reduced-motion
 *   - .grain: fixed SVG noise overlay, opacity .05, mix-blend-mode overlay
 *   - .vignette: inset box-shadow 0 0 240px 60px rgba(5,3,12,.9)
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

export function CosmicBackground() {
  const starsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const sc = starsRef.current;
    if (!sc) return;
    const sx = sc.getContext("2d");
    if (!sx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let stars: Star[] = [];
    let W = 0, H = 0;
    let scrollY = 0;
    let raf = 0;

    function sizeStars() {
      W = sc!.width  = innerWidth  * DPR;
      H = sc!.height = innerHeight * DPR;
      sc!.style.width  = innerWidth  + "px";
      sc!.style.height = innerHeight + "px";
      const n = Math.round(innerWidth * innerHeight / 9000);
      stars = [];
      for (let i = 0; i < n; i++) {
        stars.push({
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     (Math.random() * 1.1 + 0.2) * DPR,
        a:     Math.random() * Math.PI * 2,
          // Twinkle speed. History: Math.random()*0.02 + 0.004 flickered fast;
          // a prior fix slowed it ~5x to *0.004 + 0.0008 (~10–65s/pulse) but
          // it still read as a busy field because (a) EVERY star twinkled and
          // (b) the swing was huge (0.25↔0.90) through a sharp abs(sin) trough,
          // i.e. near on/off. Slowed further here (~2.5x → a full ~55–260s
          // pulse) AND the swing/participation are cut below via `amp`.
          // prefers-reduced-motion is honored below (increment skipped; one
          // static frame draws, with no twinkle offset applied).
          tw:    Math.random() * 0.0015 + 0.0004,
          // A star's resting brightness. Most stars now simply sit here,
          // steady — a calm sky rather than a field of pulsing dots.
          baseA: Math.random() * 0.34 + 0.28,   // 0.28–0.62
          // Only ~30% of stars twinkle at all, and only by a gentle ±0.05–0.15
          // around their resting alpha (smooth sin, never through zero) so the
          // shimmer is subtle and occasional, never on/off.
          amp:   Math.random() < 0.30 ? Math.random() * 0.10 + 0.05 : 0,
          depth: Math.random() * 0.6 + 0.2,
        });
      }
    }

    function drawStars() {
      sx!.clearRect(0, 0, W, H);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (!reduce) s.a += s.tw;          // accumulating angle (matches landing)
        // Gentle shimmer around the star's resting brightness. Smooth sin (not
        // abs) keeps it a soft rise-and-fall instead of a sharp on/off blink,
        // and `amp` is 0 for most stars so only a few pulse at any moment.
        const al = s.baseA + (reduce ? 0 : s.amp * Math.sin(s.a));
        // scroll parallax identical to landing
        let yy = s.y - scrollY * DPR * s.depth * 0.15;
        yy = ((yy % H) + H) % H;
        sx!.beginPath();
        sx!.arc(s.x, yy, s.r, 0, Math.PI * 2);
        sx!.fillStyle = `rgba(244,236,219,${al.toFixed(3)})`;
        sx!.fill();
      }
      if (!reduce) raf = requestAnimationFrame(drawStars);
    }

    function onScroll() { scrollY = window.scrollY; }
    const onResize = () => {
      sizeStars();
      if (reduce) drawStars();
    };

    sizeStars();
    drawStars();
    if (reduce) drawStars();   // single static frame for reduced-motion

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
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
