import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMPTY_STATE_WELCOME_HREF } from "./nav-links";
import { describe, expect, it } from "vitest";

const home = readFileSync(join(__dirname, "../app/app/page.tsx"), "utf8");
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const skeleton = readFileSync(join(__dirname, "../components/constellation-starfield-skeleton.tsx"), "utf8");

describe("source wiring — constellation home loading / empty / error", () => {
  it("fetches people and charts on the client, not via a suspense fallback", () => {
    expect(home.startsWith('"use client"')).toBe(true);
    expect(home).toContain("async function loadHome");
    expect(home).toContain("createSupabaseBrowserClient");
    expect(home).not.toContain("Suspense");
  });

  it("shows the star-field skeleton while loading, not a 400px shimmer block", () => {
    expect(home).toContain("ConstellationStarFieldSkeleton");
    expect(home).toContain("visible={loading}");
    expect(home).not.toMatch(/className="skeleton"[\s\S]*height:\s*400/);
  });

  it("cross-fades the live canvas in and treats people query errors as a load failure", () => {
    expect(home).toContain("constellation-live");
    expect(home).toContain("setLoadError(true)");
    expect(home).toContain("if (peopleRes.error) throw peopleRes.error");
    expect(home).toContain("ConstellationLoadError");
    expect(home).toContain("retryHome");
  });

  it("renders the empty constellation with one add-person action", () => {
    expect(home).toContain("ConstellationEmptyState");
    expect(skeleton).toContain("EMPTY_STATE_WELCOME_HREF");
    expect(EMPTY_STATE_WELCOME_HREF).toBe("/welcome");
    expect(skeleton).toContain("CONSTELLATION_EMPTY_ACTION");
  });

  it("overlays a rings toggle that does not live in the canvas effect deps", () => {
    expect(home).toContain("SETTING_SHOW_RINGS");
    expect(home).toContain("showRingsRef");
    expect(home).toContain("Hide orbital rings");
  });

  it("pulses skeleton points with CSS and holds them static under reduced motion", () => {
    expect(css).toContain("@keyframes constellation-skeleton-pulse");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*constellation-skeleton-point \{ animation: none/);
    expect(css).toContain("@keyframes ringDriftCW");
    expect(css).toContain("@keyframes ringDriftCCW");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*ring-drift-inner/);
    expect(skeleton).not.toMatch(/framer-motion|gsap|lottie|react-spring/i);
  });
});
