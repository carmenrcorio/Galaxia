import type { NatalChart } from "@galaxia/astro";
import { describe, expect, it } from "vitest";
import {
  chartLeadChartCopy,
  chartLeadDueStep,
  emptyChartLeadDripSkipped,
} from "./chart-lead-drip";

const DAY = 86_400_000;
const CREATED = "2026-09-01T00:00:00.000Z";
const CREATED_MS = new Date(CREATED).getTime();

describe("chartLeadDueStep", () => {
  it("selects day 1, day 3, and day 7 from the persisted step", () => {
    expect(chartLeadDueStep(0, CREATED, CREATED_MS + DAY - 1)).toBeNull();
    expect(chartLeadDueStep(0, CREATED, CREATED_MS + DAY)).toBe(1);
    expect(chartLeadDueStep(1, CREATED, CREATED_MS + 3 * DAY)).toBe(2);
    expect(chartLeadDueStep(2, CREATED, CREATED_MS + 7 * DAY)).toBe(3);
  });

  it("does not resend completed, invalid, or not-yet-due steps", () => {
    expect(chartLeadDueStep(1, CREATED, CREATED_MS + 2 * DAY)).toBeNull();
    expect(chartLeadDueStep(2, CREATED, CREATED_MS + 6 * DAY)).toBeNull();
    expect(chartLeadDueStep(3, CREATED, CREATED_MS + 30 * DAY)).toBeNull();
    expect(chartLeadDueStep(-1, CREATED, CREATED_MS + 30 * DAY)).toBeNull();
    expect(chartLeadDueStep(0, "not-a-date", CREATED_MS + 30 * DAY)).toBeNull();
  });

  it("starts every skip counter at zero", () => {
    expect(emptyChartLeadDripSkipped()).toEqual({
      notDue: 0,
      noResendKey: 0,
      invalidChartData: 0,
      sendFailed: 0,
    });
  });
});

describe("chartLeadChartCopy", () => {
  it("uses current engine interpretations for settled Moon, Mercury, and Mars signs", () => {
    const chart = {
      placements: [
        { body: "moon", sign: "Pisces", confident: true },
        { body: "mercury", sign: "Gemini", confident: true },
        { body: "mars", sign: "Aries", confident: true },
      ],
    } as NatalChart;

    const copy = chartLeadChartCopy(chart);
    expect(copy.moon.statement).toBe("This chart has Moon in Pisces.");
    expect(copy.mercury.statement).toBe("This chart has Mercury in Gemini.");
    expect(copy.mars.statement).toBe("This chart has Mars in Aries.");
    expect(copy.moon.reading.length).toBeGreaterThan(0);
    expect(copy.mercury.reading.length).toBeGreaterThan(0);
    expect(copy.mars.reading.length).toBeGreaterThan(0);
  });

  it("never presents an uncertain sampled sign as settled", () => {
    const chart = {
      placements: [
        { body: "moon", sign: "Pisces", confident: false, possibleSigns: ["Aquarius", "Pisces"] },
        { body: "mercury", sign: "Gemini", confident: false, possibleSigns: ["Taurus", "Gemini"] },
        { body: "mars", sign: "Aries", confident: false },
      ],
    } as NatalChart;

    const copy = chartLeadChartCopy(chart);
    expect(copy.moon.statement).toBe("This chart does not settle the Moon sign. It could be Aquarius or Pisces.");
    expect(copy.moon.statement).not.toBe("This chart has Moon in Pisces.");
    expect(copy.mercury.statement).toContain("Taurus or Gemini");
    expect(copy.mars.statement).toContain("does not have enough birth detail");
  });
});
