import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { isDueForConstellationLetter, isLetterTrackingId, ownerLocalWeekday } from "./constellation-letter-send";
import { resendEmailIdFromEvent, verifyResendWebhookSignature } from "./resend-webhook";

describe("ownerLocalWeekday / isDueForConstellationLetter", () => {
  it("returns Sunday (0) for a known instant in UTC", () => {
    const sunday = new Date("2026-09-13T12:00:00.000Z");
    expect(ownerLocalWeekday(sunday, "UTC")).toBe(0);
    expect(isDueForConstellationLetter(sunday, "UTC")).toBe(true);
  });

  it("is false on a Monday", () => {
    const monday = new Date("2026-09-14T12:00:00.000Z");
    expect(ownerLocalWeekday(monday, "UTC")).toBe(1);
    expect(isDueForConstellationLetter(monday, "UTC")).toBe(false);
  });

  it("returns null for an unparseable timezone rather than fabricating UTC", () => {
    expect(ownerLocalWeekday(new Date(), "Not/A_Zone")).toBeNull();
    expect(isDueForConstellationLetter(new Date(), "Not/A_Zone")).toBe(false);
  });

  it("treats Sunday evening in America as still Sunday after UTC has rolled to Monday", () => {
    const mondayUtcMorning = new Date("2026-09-14T04:17:00.000Z");
    expect(ownerLocalWeekday(mondayUtcMorning, "America/Los_Angeles")).toBe(0);
    expect(isDueForConstellationLetter(mondayUtcMorning, "America/Los_Angeles")).toBe(true);
  });
});

describe("isLetterTrackingId", () => {
  it("accepts a uuid and rejects anything else", () => {
    expect(isLetterTrackingId("11111111-aaaa-4aaa-8aaa-000000000001")).toBe(true);
    expect(isLetterTrackingId("not-a-uuid")).toBe(false);
    expect(isLetterTrackingId(null)).toBe(false);
  });
});

describe("verifyResendWebhookSignature", () => {
  const secret = `whsec_${Buffer.from("test-secret").toString("base64")}`;
  const payload = JSON.stringify({ type: "email.opened", data: { email_id: "re_1" } });
  const id = "msg_1";
  const timestamp = "1700000000";
  const key = Buffer.from("test-secret");
  const sig = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64");

  it("accepts a matching v1 signature inside the tolerance window", () => {
    expect(
      verifyResendWebhookSignature(
        payload,
        { id, timestamp, signature: `v1,${sig}` },
        secret,
        1_700_000_000
      )
    ).toBe(true);
  });

  it("rejects a forged signature and a stale timestamp", () => {
    expect(
      verifyResendWebhookSignature(
        payload,
        { id, timestamp, signature: "v1,AAAA" },
        secret,
        1_700_000_000
      )
    ).toBe(false);
    expect(
      verifyResendWebhookSignature(
        payload,
        { id, timestamp, signature: `v1,${sig}` },
        secret,
        1_700_000_000 + 301
      )
    ).toBe(false);
  });
});

describe("resendEmailIdFromEvent", () => {
  it("reads email_id and ignores missing payloads", () => {
    expect(resendEmailIdFromEvent({ type: "email.opened", data: { email_id: "re_1" } })).toBe("re_1");
    expect(resendEmailIdFromEvent({ type: "email.clicked" })).toBeNull();
    expect(resendEmailIdFromEvent(null)).toBeNull();
  });
});
