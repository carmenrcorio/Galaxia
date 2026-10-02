import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/chart-lead/route";
import { __resetRateLimitStoreForTests, RATE_LIMIT_MAX_REQUESTS } from "./rate-limit";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("./env", () => ({
  publicEnv: { supabaseUrl: "https://example.supabase.co" },
  missingEnvMessage: (name: string) => `${name} is not configured.`,
}));
vi.mock("./env.server", () => ({
  privateEnv: { serviceRole: "service-role-test-key" },
}));

const selectMaybeSingle = vi.fn();
const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const insert = vi.fn();
const from = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({ maybeSingle: selectMaybeSingle })),
  })),
  update,
  insert,
}));

function request(
  ip = "203.0.113.5",
  body: Record<string, unknown> = {
    email: " SKY@example.com ",
    chartData: { precision: "date", month: 6, day: 15, year: 1990 },
    source: "chart",
    consentMarketing: true,
  }
) {
  return new Request("https://galaxiamea.com/api/chart-lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chart-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStoreForTests();
    selectMaybeSingle.mockResolvedValue({ data: null, error: null });
    insert.mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({ from } as never);
  });

  it("inserts a new chart lead with marketing consent", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "Saved. We will email your chart and note when transits matter for it.",
    });
    expect(from).toHaveBeenCalledWith("chart_leads");
    expect(insert).toHaveBeenCalledWith({
      email: "sky@example.com",
      source: "chart",
      chart_data: { precision: "date", month: 6, day: 15, year: 1990 },
      subscribed: true,
      consent_marketing: true,
    });
  });

  it("merges chart data onto an existing lead without clearing consent", async () => {
    selectMaybeSingle.mockResolvedValue({
      data: { email: "sky@example.com", consent_marketing: false },
      error: null,
    });
    const response = await POST(request("203.0.113.5", {
      email: "sky@example.com",
      chartData: { precision: "date", month: 6, day: 15, year: 1990 },
      source: "homepage",
      consentMarketing: false,
    }));
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      source: "homepage",
      chart_data: { precision: "date", month: 6, day: 15, year: 1990 },
      subscribed: true,
    });
  });

  it("rejects invalid email and birth input before writing", async () => {
    const badEmail = await POST(request("203.0.113.6", { email: "not-an-email", chartData: { precision: "date", month: 6, day: 15, year: 1990 } }));
    expect(badEmail.status).toBe(400);

    const badBirth = new Request("https://galaxiamea.com/api/chart-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ email: "sky@example.com", chartData: { precision: "none" } }),
    });
    expect((await POST(badBirth)).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("enforces the existing 30 requests per minute IP limiter", async () => {
    for (let index = 0; index < RATE_LIMIT_MAX_REQUESTS; index += 1) {
      expect((await POST(request("203.0.113.8"))).status).toBe(200);
    }
    const limited = await POST(request("203.0.113.8"));
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "Too many requests. Try again in a minute." });
  });
});
