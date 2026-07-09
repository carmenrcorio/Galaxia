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
          tw:    Math.random() * 0.02 + 0.004,
          depth: Math.random() * 0.6 + 0.2,
        });
      }
    }

    function drawStars() {
      sx!.clearRect(0, 0, W, H);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (!reduce) s.a += s.tw;          // accumulating angle (matches landing)
        const al = 0.25 + Math.abs(Math.sin(s.a)) * 0.65;
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
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>

      {/* .aura — exact from landing */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: [
          "radial-gradient(120% 80% at 78% -5%, rgba(110,177,184,.10), transparent 55%)",
          "radial-gradient(90% 70% at 12% 8%, rgba(183,154,216,.12), transparent 50%)",
          "radial-gradient(120% 100% at 50% 120%, rgba(230,174,108,.08), transparent 60%)",
          "linear-gradient(180deg,#0a0717 0%, #0c0820 40%, #0a0717 100%)"
        ].join(",")
      }} />

      {/* .milkyway — exact from landing (parallax handled by JS in landing; here CSS) */}
      <div style={{
        position: "fixed", zIndex: 0, pointerEvents: "none",
        inset: "-20% -20% auto -20%", height: "140%",
        background: "radial-gradient(60% 40% at 50% 50%, rgba(183,154,216,.07), transparent 70%)",
        transform: "rotate(-18deg)",
        filter: "blur(20px)",
      }} />

      {/* #stars canvas */}
      <canvas ref={starsRef} style={{ position: "fixed", inset: 0, zIndex: 0, width: "100%", height: "100%" }} />

      {/* .grain — exact from landing */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        opacity: .05,
        mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }} />

      {/* .vignette — exact from landing */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        boxShadow: "inset 0 0 240px 60px rgba(5,3,12,.9)",
      }} />

    </div>
  );
}
