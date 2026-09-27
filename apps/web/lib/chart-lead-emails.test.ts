import { GALAXIA_HELP_EMAIL } from "@galaxia/core";
import { describe, expect, it } from "vitest";
import { chartLeadDripEmail, chartLeadEmailHeaders } from "./emails";
import type { ChartLeadChartCopy, ChartLeadDripStep } from "./chart-lead-drip";

const FOOTER_ENTITY = "Galaxia Mea LLC · 1 Shadowrock Ct, Simpsonville, SC 29680";
const FOOTER_REASON = "You are receiving this email because you asked for transit alerts for a free chart.";
const UNSUBSCRIBE_URL =
  "https://galaxiamea.com/api/chart-lead/unsubscribe?token=11111111-1111-4111-8111-111111111111";

const chartCopy: ChartLeadChartCopy = {
  moon: {
    statement: "This chart has Moon in Pisces.",
    reading: "Feels the room before it speaks.",
  },
  mercury: {
    statement: "This chart has Mercury in Gemini.",
    reading: "Thinks through exchange and movement.",
  },
  mars: {
    statement: "This chart has Mars in Aries.",
    reading: "Meets pressure directly.",
  },
};

function render(step: ChartLeadDripStep) {
  return chartLeadDripEmail({
    step,
    chartCopy,
    siteUrl: "https://galaxiamea.com",
    unsubscribeUrl: UNSUBSCRIBE_URL,
  });
}

describe("chartLeadDripEmail", () => {
  it("renders the approved subject and Moon content for day 1", () => {
    const email = render(1);
    expect(email.subject).toBe("What your Moon sign says about how you love");
    expect(email.html).toContain(chartCopy.moon.statement);
    expect(email.html).toContain(chartCopy.moon.reading);
    expect(email.html).toContain('href="https://galaxiamea.com/signup"');
    expect(email.html).toContain("Start 14 days free");
  });

  it("renders Mercury, Mars, and the Compare CTA for day 3", () => {
    const email = render(2);
    expect(email.subject).toBe("The part of your chart that explains your arguments");
    expect(email.html).toContain(chartCopy.mercury.statement);
    expect(email.html).toContain(chartCopy.mars.statement);
    expect(email.html).toContain('href="https://galaxiamea.com/chart/compare"');
    expect(email.html).toContain("Compare two charts");
  });

  it("renders the relationship pitch and start-free CTA for day 7", () => {
    const email = render(3);
    expect(email.subject).toBe("One chart is interesting. Two is where it gets real.");
    expect(email.html).toContain("A relationship appears when two charts meet");
    expect(email.html).toContain('href="https://galaxiamea.com/signup"');
    expect(email.html).toContain("Start free");
  });

  for (const step of [1, 2, 3] as const) {
    it(`includes compliant HTML/text and no em dash for step ${step}`, () => {
      const email = render(step);
      for (const body of [email.html, email.text]) {
        expect(body).toContain(FOOTER_ENTITY);
        expect(body).toContain(GALAXIA_HELP_EMAIL);
        expect(body).toContain(FOOTER_REASON);
        expect(body).toContain(UNSUBSCRIBE_URL);
        expect(body).not.toContain("\u2014");
      }
      expect(email.subject).not.toContain("\u2014");
      expect(email.preview).not.toContain("\u2014");
    });
  }
});

describe("chartLeadEmailHeaders", () => {
  it("uses the visible unsubscribe URL for RFC 8058 one-click headers", () => {
    expect(chartLeadEmailHeaders(UNSUBSCRIBE_URL)).toEqual({
      "List-Unsubscribe": `<${UNSUBSCRIBE_URL}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});
