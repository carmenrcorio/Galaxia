"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number; y: number; r: number; alpha: number;
  twinkleSpeed: number; twinklePhase: number; driftX: number; driftY: number;
}

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let scrollY = 0;

    const handleScroll = () => { scrollY = window.scrollY; };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ~1 star per 9000px²
    const makeStars = (): Star[] => {
      const count = Math.round((canvas.width * canvas.height) / 9000);
      return Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.1 + 0.2,
        alpha: Math.random() * 0.5 + 0.15,
        twinkleSpeed: Math.random() * 0.018 + 0.006,
        twinklePhase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.04,
        driftY: (Math.random() - 0.5) * 0.03,
      }));
    };

    let stars = makeStars();
    window.addEventListener("resize", () => { resize(); stars = makeStars(); });

    let t = 0;
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const driftFactor = reduced ? 0 : scrollY * 0.04;

      for (const s of stars) {
        const twinkle = reduced ? s.alpha : s.alpha * (0.6 + 0.4 * Math.sin(t * s.twinkleSpeed + s.twinklePhase));
        const dx = reduced ? 0 : s.driftX * t;
        const dy = reduced ? 0 : (s.driftY * t) - driftFactor;
        const x  = ((s.x + dx) % canvas.width  + canvas.width)  % canvas.width;
        const y  = ((s.y + dy) % canvas.height + canvas.height) % canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244,236,219,${twinkle.toFixed(3)})`;
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    draw();
    if (!reduced) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      {/* Aura layers */}
      <div style={{
        position: "absolute", inset: 0,
        background: [
          "radial-gradient(120% 80% at 78% -5%, rgba(110,177,184,.10), transparent 55%)",
          "radial-gradient(90% 70% at 12% 8%, rgba(183,154,216,.12), transparent 50%)",
          "radial-gradient(120% 100% at 50% 120%, rgba(230,174,108,.08), transparent 60%)",
          "linear-gradient(180deg,#0a0717 0%,#0c0820 40%,#0a0717 100%)"
        ].join(",")
      }} />

      {/* Starfield canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />

      {/* Grain */}
      <div style={{
        position: "absolute", inset: 0, opacity: .028,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        backgroundSize: "200px 200px"
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", inset: 0,
        boxShadow: "inset 0 0 240px 60px rgba(5,3,12,.9)"
      }} />
    </div>
  );
}
