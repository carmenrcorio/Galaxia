// @vitest-environment jsdom

import { FAMILY_BRIDGE, PLUTO_SIGN_EXTENDED } from "@galaxia/astro";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  FOR_WORK_ERA_EXAMPLES,
  FOR_WORK_FAMILY_BRIDGE,
  ForWorkGenerational,
  ForWorkHero,
  ForWorkHowItWorks,
  ForWorkWhatThisIsNot,
  WORK_RELATION_LABELS,
} from "./for-work-sections";

afterEach(() => {
  cleanup();
});

describe("ForWorkHero", () => {
  it("renders the unique outcome H1 and no astrology wording", () => {
    render(<ForWorkHero />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Know how this person is wired before the conversation that matters.",
      }),
    ).toBeTruthy();
    expect(screen.queryByText(/astrology/i)).toBeNull();
  });
});

describe("ForWorkGenerational", () => {
  it("renders era-event copy from generational-layer.ts, not invented text", () => {
    const watergate = PLUTO_SIGN_EXTENDED.Virgo!.eraEvents.find((e) => e.label === "Watergate")!;
    const aids = PLUTO_SIGN_EXTENDED.Virgo!.eraEvents.find((e) => e.label === "The AIDS Crisis")!;
    const crash = PLUTO_SIGN_EXTENDED.Scorpio!.eraEvents.find((e) => e.label === "The 2008 Crash")!;

    expect(FOR_WORK_ERA_EXAMPLES).toEqual([watergate, aids, crash]);

    render(<ForWorkGenerational />);
    expect(screen.getByText(watergate.label)).toBeTruthy();
    expect(screen.getByText(watergate.detail)).toBeTruthy();
    expect(screen.getByText(aids.label)).toBeTruthy();
    expect(screen.getByText(aids.detail)).toBeTruthy();
    expect(screen.getByText(crash.label)).toBeTruthy();
    expect(screen.getByText(crash.detail)).toBeTruthy();
  });
});

describe("ForWorkWhatThisIsNot", () => {
  it("states the three required limits", () => {
    render(<ForWorkWhatThisIsNot />);
    expect(screen.getByText("This does not predict performance.")).toBeTruthy();
    expect(screen.getByText("It is not a hiring tool.")).toBeTruthy();
    expect(screen.getByText("It is not a personality test.")).toBeTruthy();
  });
});

describe("ForWorkHowItWorks", () => {
  it("names astrology and quotes the Scorpio-Virgo family bridge verbatim", () => {
    expect(FOR_WORK_FAMILY_BRIDGE).toBe(FAMILY_BRIDGE.Scorpio!.Virgo);
    render(<ForWorkHowItWorks />);
    expect(screen.getByRole("heading", { name: "This is astrology, named plainly." })).toBeTruthy();
    expect(screen.getByText(FAMILY_BRIDGE.Scorpio!.Virgo!)).toBeTruthy();
    for (const label of WORK_RELATION_LABELS) {
      expect(screen.getByText(new RegExp(label))).toBeTruthy();
    }
  });
});
