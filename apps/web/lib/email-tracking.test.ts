import { describe, expect, it, vi } from "vitest";
import {
  EMAIL_TRACKING_ID_RE,
  emailOpenPixelUrl,
  isEmailTrackingId,
  recordEmailOpenByResendId,
  recordEmailOpenByTrackingId,
  recordEmailSend,
  trackingPixelHtml
} from "./email-tracking";

describe("tracking ids and pixel HTML", () => {
  it("accepts a UUID v4-shaped id and rejects anything else", () => {
    const id = "11111111-aaaa-4aaa-8aaa-000000000001";
    expect(EMAIL_TRACKING_ID_RE.test(id)).toBe(true);
    expect(isEmailTrackingId(id)).toBe(true);
    expect(isEmailTrackingId("not-a-uuid")).toBe(false);
    expect(isEmailTrackingId("")).toBe(false);
  });

  it("builds a no-cache pixel URL and escapes the src", () => {
    const url = emailOpenPixelUrl("https://galaxiamea.com/", "11111111-aaaa-4aaa-8aaa-000000000001");
    expect(url).toBe("https://galaxiamea.com/api/email/open?t=11111111-aaaa-4aaa-8aaa-000000000001");
    expect(trackingPixelHtml('https://x.test/open?t=1&x="')).toContain("&amp;");
    expect(trackingPixelHtml('https://x.test/open?t=1&x="')).toContain("&quot;");
    expect(trackingPixelHtml(url)).toContain(`src="${url}"`);
  });
});

describe("recordEmailOpenByTrackingId", () => {
  it("increments open_count and keeps the first opened_at", async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "11111111-aaaa-4aaa-8aaa-000000000001", opened_at: "2026-09-01T00:00:00.000Z", open_count: 2 },
      error: null
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle, update });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select, update });
    const client = { from } as never;

    const ok = await recordEmailOpenByTrackingId(client, "11111111-aaaa-4aaa-8aaa-000000000001", new Date("2026-09-17T00:00:00.000Z"));
    expect(ok).toBe(true);
    expect(update).toHaveBeenCalledWith({
      opened_at: "2026-09-01T00:00:00.000Z",
      open_count: 3
    });
  });

  it("returns false when the send is missing, so the pixel cannot probe", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const ok = await recordEmailOpenByTrackingId({ from } as never, "11111111-aaaa-4aaa-8aaa-000000000001");
    expect(ok).toBe(false);
  });
});

describe("recordEmailOpenByResendId / recordEmailSend / countEmailSends", () => {
  it("looks up by resend_id", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "send-1", opened_at: null, open_count: 0 },
      error: null
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select, update });
    const ok = await recordEmailOpenByResendId({ from } as never, "re_abc", new Date("2026-09-17T00:00:00.000Z"));
    expect(ok).toBe(true);
    expect(eq).toHaveBeenCalledWith("resend_id", "re_abc");
    expect(update).toHaveBeenCalledWith({
      opened_at: "2026-09-17T00:00:00.000Z",
      open_count: 1
    });
  });

  it("inserts the send row with the tracking id as primary key", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ insert });
    await recordEmailSend({ from } as never, {
      id: "11111111-aaaa-4aaa-8aaa-000000000001",
      kind: "trial.day1",
      recipientEmail: "sam@example.com",
      subject: "Riley is in your circle now"
    });
    expect(from).toHaveBeenCalledWith("email_sends");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      id: "11111111-aaaa-4aaa-8aaa-000000000001",
      kind: "trial.day1",
      is_test: false
    }));
  });
});
