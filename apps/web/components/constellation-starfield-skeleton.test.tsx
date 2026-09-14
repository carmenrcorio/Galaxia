// @vitest-environment jsdom

import { constellationSkeletonSeats } from "@galaxia/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSTELLATION_CROSSFADE_MS,
  CONSTELLATION_EMPTY,
  CONSTELLATION_EMPTY_ACTION,
  CONSTELLATION_LOAD_ERROR,
  CONSTELLATION_RETRY,
  CONSTELLATION_STAGE_STYLE,
  ConstellationEmptyState,
  ConstellationLoadError,
  ConstellationStarFieldSkeleton,
} from "./constellation-starfield-skeleton";

afterEach(() => {
  cleanup();
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => (
    <a href={href}>{children as never}</a>
  ),
}));

describe("ConstellationStarFieldSkeleton", () => {
  it("renders a dim point per skeleton seat on the live ring geometry", () => {
    const { container } = render(<ConstellationStarFieldSkeleton visible />);
    const points = container.querySelectorAll(".constellation-skeleton-point");
    expect(points.length).toBe(constellationSkeletonSeats().length);
    expect(container.querySelector(".constellation-skeleton")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("cross-fades by opacity rather than unmounting the field", () => {
    const { container } = render(<ConstellationStarFieldSkeleton visible={false} />);
    const field = container.querySelector(".constellation-skeleton") as HTMLElement;
    expect(field.style.opacity).toBe("0");
    expect(field.style.transition).toContain(`${CONSTELLATION_CROSSFADE_MS}ms`);
    expect(container.querySelectorAll(".constellation-skeleton-point").length).toBeGreaterThan(0);
  });

  it("reserves the loaded constellation frame height", () => {
    expect(CONSTELLATION_STAGE_STYLE.minHeight).toBe(380);
    expect(CONSTELLATION_STAGE_STYLE.aspectRatio).toBe("1 / 1.12");
    expect(CONSTELLATION_STAGE_STYLE.maxHeight).toBe("min(72vh, 680px)");
  });
});

describe("constellation empty and error outcomes", () => {
  it("renders the empty state with one add-person action", () => {
    render(<ConstellationEmptyState />);
    expect(screen.getByText(CONSTELLATION_EMPTY)).toBeTruthy();
    const action = screen.getByRole("link", { name: CONSTELLATION_EMPTY_ACTION });
    expect(action.getAttribute("href")).toBe("/welcome");
  });

  it("renders the load-failure line and a retry control", () => {
    const onRetry = vi.fn();
    render(<ConstellationLoadError onRetry={onRetry} />);
    expect(screen.getByText(CONSTELLATION_LOAD_ERROR)).toBeTruthy();
    screen.getByRole("button", { name: CONSTELLATION_RETRY }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
