// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  ASPECTS_UNAVAILABLE_YEAR_BODY,
  ASPECTS_UNAVAILABLE_YEAR_FOLLOW_UP,
} from "@galaxia/core";
import { ASPECTS_UNAVAILABLE_EYEBROW, AspectsUnavailableCard } from "./aspects-unavailable-card";

afterEach(() => {
  cleanup();
});

describe("AspectsUnavailableCard", () => {
  it("renders year-precision copy that names a birth date", () => {
    render(<AspectsUnavailableCard precision="year" />);
    expect(screen.getByText(ASPECTS_UNAVAILABLE_EYEBROW)).toBeTruthy();
    expect(screen.getByText(ASPECTS_UNAVAILABLE_YEAR_BODY)).toBeTruthy();
    expect(screen.getByText(ASPECTS_UNAVAILABLE_YEAR_FOLLOW_UP)).toBeTruthy();
  });

  it("renders nothing for date or exact precision (those charts can place aspects)", () => {
    const { container: date } = render(<AspectsUnavailableCard precision="date" />);
    expect(date.firstChild).toBeNull();
    const { container: exact } = render(<AspectsUnavailableCard precision="exact" />);
    expect(exact.firstChild).toBeNull();
  });

  it("mounts a single upgrade action when given", () => {
    render(
      <AspectsUnavailableCard precision="year" action={<button type="button">Add a birth date</button>} />
    );
    expect(screen.getByRole("button", { name: "Add a birth date" })).toBeTruthy();
  });
});
