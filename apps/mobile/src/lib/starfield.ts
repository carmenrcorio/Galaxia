/**
 * Starfield math twin of `apps/web/components/cosmic-background.tsx`.
 * Layer table, density, cap, lerp, and EMA shed are copied by number so a
 * phone next to `/app` draws the same night sky. Paint lives in the Skia
 * CosmicBackground; this module stays free of React Native so Vitest can
 * lock the constants against the web source.
 */

export interface StarfieldLayerSpec {
  parallax: number;
  density: number;
  rMin: number;
  rMax: number;
  aMin: number;
  aRange: number;
  twMul: number;
}

export interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  tw: number;
  baseA: number;
  amp: number;
  depth: number;
}

export interface RuntimeLayer {
  spec: StarfieldLayerSpec;
  stars: Star[];
  ox: number;
  oy: number;
}

/** Depth layers, far → near. Identical to the web CosmicBackground table. */
export const STARFIELD_LAYERS: readonly StarfieldLayerSpec[] = [
  { parallax: 9, density: 4200, rMin: 0.15, rMax: 0.65, aMin: 0.14, aRange: 0.20, twMul: 0.7 },
  { parallax: 24, density: 6500, rMin: 0.35, rMax: 1.05, aMin: 0.26, aRange: 0.30, twMul: 1.0 },
  { parallax: 42, density: 9500, rMin: 0.55, rMax: 1.55, aMin: 0.40, aRange: 0.36, twMul: 1.3 }
];

export const STARFIELD_SMALL_VIEWPORT_PX = 480;
export const STARFIELD_SMALL_VIEWPORT_FACTOR = 1.7;
export const STARFIELD_LAYER_CAP = 900;
export const STARFIELD_PARALLAX_LERP = 0.06;
export const STARFIELD_EMA_SHED_MS = 29;
export const STARFIELD_WARMUP_FRAMES = 10;
export const STARFIELD_EMA_PREV = 0.9;
export const STARFIELD_EMA_SAMPLE = 0.1;
/** Cream stars, same as web `rgba(244,236,219,*)`. */
export const STAR_CREAM_HEX = "#F4ECDB";

export function starCount(cssWidth: number, cssHeight: number, density: number): number {
  const area = cssWidth * cssHeight;
  const small = cssWidth < STARFIELD_SMALL_VIEWPORT_PX;
  const divisor = density * (small ? STARFIELD_SMALL_VIEWPORT_FACTOR : 1);
  return Math.min(Math.round(area / divisor), STARFIELD_LAYER_CAP);
}

export function wrapCoord(v: number, max: number): number {
  if (max <= 0) return 0;
  return ((v % max) + max) % max;
}

export function lerpToward(current: number, target: number, t = STARFIELD_PARALLAX_LERP): number {
  return current + (target - current) * t;
}

export function nextEmaFrameMs(prev: number, dt: number): number {
  return prev * STARFIELD_EMA_PREV + dt * STARFIELD_EMA_SAMPLE;
}

export function shedFarLayer(activeLayers: number, totalLayers: number, emaMs: number, warmup: number): number {
  if (warmup <= STARFIELD_WARMUP_FRAMES) return activeLayers;
  if (activeLayers === totalLayers && emaMs > STARFIELD_EMA_SHED_MS) return totalLayers - 1;
  return activeLayers;
}

export function buildRuntimeLayers(
  cssWidth: number,
  cssHeight: number,
  random: () => number = Math.random
): RuntimeLayer[] {
  return STARFIELD_LAYERS.map((spec) => {
    const n = starCount(cssWidth, cssHeight, spec.density);
    const stars: Star[] = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: random() * cssWidth,
        y: random() * cssHeight,
        r: random() * (spec.rMax - spec.rMin) + spec.rMin,
        a: random() * Math.PI * 2,
        tw: (random() * 0.0005 + 0.00015) * spec.twMul,
        baseA: random() * spec.aRange + spec.aMin,
        amp: random() < 0.3 ? random() * 0.1 + 0.04 : 0,
        depth: random() * 0.6 + 0.2
      });
    }
    return { spec, stars, ox: 0, oy: 0 };
  });
}

export function starAlpha(star: Star, reduceMotion: boolean): number {
  return star.baseA + (reduceMotion ? 0 : star.amp * Math.sin(star.a));
}

export function starDrawXY(
  star: Star,
  layer: RuntimeLayer,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: wrapCoord(star.x + layer.ox, width),
    y: wrapCoord(star.y + layer.oy, height)
  };
}
