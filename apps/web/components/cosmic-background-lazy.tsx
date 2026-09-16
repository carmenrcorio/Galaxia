"use client";

/**
 * Code-split CosmicBackground so the canvas starfield is not on the public
 * first-load JS graph. SSR still emits the static aura / milkyway / grain /
 * vignette (next/dynamic defaults to ssr: true). prefers-reduced-motion is
 * unchanged: it lives inside CosmicBackground's effect (one static frame,
 * no twinkle/parallax). /app keeps a static import of cosmic-background.tsx.
 */

import dynamic from "next/dynamic";

export const CosmicBackground = dynamic(() =>
  import("./cosmic-background").then((mod) => mod.CosmicBackground)
);
