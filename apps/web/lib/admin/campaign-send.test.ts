import { describe, expect, it, vi } from "vitest";
import { campaignRecipientVars, listCampaignRecipients } from "./campaign-send";
import { CAMPAIGN_SEND_CAP } from "../email-kinds";

describe("campaignRecipientVars", () => {
  it("greets by first name when one exists, otherwise Hi there,", () => {
    expect(campaignRecipientVars({
      email: "sam@example.com",
      firstName: "Sam",
      ownerId: "u1",
      unsubscribeUrl: "https://galaxiamea.com/u"
    })).toEqual({ greeting: "Hi Sam,", firstName: "Sam" });
    expect(campaignRecipientVars({
      email: "x@example.com",
      firstName: null,
      ownerId: null,
      unsubscribeUrl: "https://galaxiamea.com/u"
    }).greeting).toBe("Hi there,");
  });
});

describe("CAMPAIGN_SEND_CAP", () => {
  it("is 500 so a mistaken audience cannot fan out unbounded", () => {
    expect(CAMPAIGN_SEND_CAP).toBe(500);
  });
});

describe("listCampaignRecipients", () => {
  it("dedupes blog captures and skips unsubscribed addresses", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { email: "Maya@Example.com" },
        { email: "maya@example.com" },
        { email: "other@example.com" }
      ],
      error: null
    });
    const is = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ is });
    const from = vi.fn().mockReturnValue({ select });
    const rows = await listCampaignRecipients({ from } as never, "blog_chart_readings", "https://galaxiamea.com", "secret");
    expect(from).toHaveBeenCalledWith("blog_email_captures");
    expect(is).toHaveBeenCalledWith("unsubscribed_at", null);
    expect(rows.map((row) => row.email)).toEqual(["maya@example.com", "other@example.com"]);
    expect(rows[0]?.unsubscribeUrl).toContain("/api/blog/chart-reading-unsubscribe?token=");
  });
});
