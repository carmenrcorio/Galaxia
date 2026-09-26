// @vitest-environment jsdom

import { RETROGRADE_BADGE_ARIA_LABEL, RETROGRADE_BADGE_LABEL } from "@galaxia/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RetrogradeBadge } from "./retrograde-badge";

afterEach(() => {
  cleanup();
});

describe("RetrogradeBadge", () => {
  it("renders Rx when the placement is retrograde", () => {
    render(<RetrogradeBadge retro />);
    const badge = screen.getByLabelText(RETROGRADE_BADGE_ARIA_LABEL);
    expect(badge.textContent).toBe(RETROGRADE_BADGE_LABEL);
    expect(badge.className).toBe("retrograde-badge");
  });

  it("anchors to the glyph corner when asked", () => {
    render(<RetrogradeBadge retro corner />);
    expect(screen.getByLabelText(RETROGRADE_BADGE_ARIA_LABEL).className).toContain(
      "retrograde-badge--corner"
    );
  });

  it("renders nothing when the planet is direct", () => {
    const { container } = render(<RetrogradeBadge retro={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByLabelText(RETROGRADE_BADGE_ARIA_LABEL)).toBeNull();
  });
});
