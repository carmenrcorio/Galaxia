import { describe, expect, it, vi } from "vitest";
import { submitNewsletterSignup, upsertChartLead } from "./chart-lead-upsert";

function mockSupabase(existing: Record<string, unknown> | null) {
  const selectMaybeSingle = vi.fn().mockResolvedValue({ data: existing, error: null });
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: selectMaybeSingle })),
    })),
    update,
    insert,
  }));
  return { supabase: { from } as never, update, insert, selectMaybeSingle };
}

describe("upsertChartLead", () => {
  it("submitNewsletterSignup writes blog source with null chart data", async () => {
    const { supabase, insert } = mockSupabase(null);
    const result = await submitNewsletterSignup(supabase, "reader@example.com");
    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith({
      email: "reader@example.com",
      source: "blog",
      chart_data: null,
      subscribed: false,
      consent_marketing: true,
    });
  });

  it("preserves chart_data when updating marketing consent only", async () => {
    const { supabase, update } = mockSupabase({
      email: "reader@example.com",
      chart_data: { precision: "date", month: 1, day: 2, year: 1990 },
      consent_marketing: false,
    });
    const result = await upsertChartLead(supabase, {
      email: "reader@example.com",
      source: "blog",
      consentMarketing: true,
    });
    expect(result.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({
      source: "blog",
      consent_marketing: true,
    });
  });
});
