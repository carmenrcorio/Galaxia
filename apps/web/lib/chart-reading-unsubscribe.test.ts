import { describe, expect, it } from "vitest";
import {
  chartReadingUnsubscribeToken,
  emailFromChartReadingUnsubscribeToken,
  chartReadingUnsubscribeUrl
} from "./chart-reading-unsubscribe";

describe("chart-reading unsubscribe token", () => {
  const secret = "test-secret";

  it("round-trips the email and rejects a forged mac", () => {
    const token = chartReadingUnsubscribeToken("maya@example.com", secret);
    expect(emailFromChartReadingUnsubscribeToken(token, secret)).toBe("maya@example.com");
    expect(emailFromChartReadingUnsubscribeToken(token, "other")).toBeNull();
    expect(emailFromChartReadingUnsubscribeToken("nope", secret)).toBeNull();
  });

  it("builds the capture unsubscribe URL", () => {
    const url = chartReadingUnsubscribeUrl("https://galaxiamea.com/", "maya@example.com", secret);
    expect(url.startsWith("https://galaxiamea.com/api/blog/chart-reading-unsubscribe?token=")).toBe(true);
  });
});
