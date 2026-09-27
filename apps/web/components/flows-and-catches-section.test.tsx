// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlowsAndCatchesSection } from "./flows-and-catches-section";

describe("FlowsAndCatchesSection glossary wiring", () => {
  it("wraps the first adjusts badge and first quincunx detail label", () => {
    render(
      <FlowsAndCatchesSection
        aspects={[
          { from: "sun", to: "moon", type: "quincunx", orb: 1.2, harmony: 0 },
          { from: "venus", to: "mars", type: "quincunx", orb: 2.1, harmony: 0 },
        ]}
        relationType="platonic"
        nameA="Ada"
        nameB="Grace"
      />,
    );

    expect(screen.getAllByRole("button", { name: "~ adjusts" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Show aspect detail/ }));

    expect(screen.getAllByRole("button", { name: "quincunx" })).toHaveLength(1);
  });
});
