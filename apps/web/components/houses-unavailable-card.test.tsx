// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  HOUSES_UNAVAILABLE_DATE_BODY,
  HOUSES_UNAVAILABLE_DATE_FOLLOW_UP,
  HOUSES_UNAVAILABLE_EYEBROW,
  HOUSES_UNAVAILABLE_YEAR_BODY,
  HOUSES_UNAVAILABLE_YEAR_FOLLOW_UP,
  HousesUnavailableCard,
} from "./houses-unavailable-card";

afterEach(() => {
  cleanup();
});

describe("HousesUnavailableCard", () => {
  it("renders year-precision copy that names a birth date and a time", () => {
    render(<HousesUnavailableCard hasHouses={false} precision="year" />);
    expect(screen.getByText(HOUSES_UNAVAILABLE_EYEBROW)).toBeTruthy();
    expect(screen.getByText(HOUSES_UNAVAILABLE_YEAR_BODY)).toBeTruthy();
    expect(screen.getByText(HOUSES_UNAVAILABLE_YEAR_FOLLOW_UP)).toBeTruthy();
    expect(screen.getAllByText(/birth date and a time/).length).toBe(2);
    expect(screen.queryByText(HOUSES_UNAVAILABLE_DATE_BODY)).toBeNull();
  });

  it("renders date-precision copy that names a birth time", () => {
    render(<HousesUnavailableCard hasHouses={false} precision="date" />);
    expect(screen.getByText(HOUSES_UNAVAILABLE_EYEBROW)).toBeTruthy();
    expect(screen.getByText(HOUSES_UNAVAILABLE_DATE_BODY)).toBeTruthy();
    expect(screen.getByText(HOUSES_UNAVAILABLE_DATE_FOLLOW_UP)).toBeTruthy();
    expect(screen.queryByText(/birth date and a time/)).toBeNull();
    expect(screen.queryByText(HOUSES_UNAVAILABLE_YEAR_BODY)).toBeNull();
  });

  it("does not render when houses are present", () => {
    const { container } = render(
      <HousesUnavailableCard hasHouses={true} precision="year" />
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(HOUSES_UNAVAILABLE_EYEBROW)).toBeNull();
    expect(screen.queryByText(HOUSES_UNAVAILABLE_YEAR_BODY)).toBeNull();
    expect(screen.queryByText(HOUSES_UNAVAILABLE_DATE_BODY)).toBeNull();
  });
});
