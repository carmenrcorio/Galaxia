// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DynamicTableSection } from "./dynamic-table-section";

afterEach(() => {
  cleanup();
});

const SCORES = {
  overall: 70,
  emotional: 60,
  communication: 55,
  warmth: 50,
  values: 48,
  stability: 45,
};

function precedes(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("DynamicTableSection render order", () => {
  it("renders needs children above the table and the watch line under the rows", () => {
    render(
      <DynamicTableSection scores={SCORES} watchLine="Watch this pair-level line.">
        <p>What Alex needs from you</p>
        <p>What Sam needs from you</p>
      </DynamicTableSection>
    );

    const needA = screen.getByText("What Alex needs from you");
    const needB = screen.getByText("What Sam needs from you");
    const tableHeading = screen.getByText("Your dynamic");
    const overall = screen.getByText("Overall");
    const watch = screen.getByText("Watch this pair-level line.");

    expect(precedes(needA, needB)).toBe(true);
    expect(precedes(needB, tableHeading)).toBe(true);
    expect(precedes(tableHeading, overall)).toBe(true);
    expect(precedes(overall, watch)).toBe(true);
  });
});
