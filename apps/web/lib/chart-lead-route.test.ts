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

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));

function request(ip = "203.0.113.5", email = " SKY@example.com ") {
  return new Request("https://galaxiamea.com/api/chart-lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({
      email,
      chartData: { precision: "date", month: 6, day: 15, year: 1990 },
    }),
  });
}

describe("POST /api/chart-lead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStoreForTests();
    upsert.mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({ from } as never);
  });

  it("normalizes and upserts a service-role-only chart lead", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "You are in. We will reach out when something moves.",
    });
    expect(from).toHaveBeenCalledWith("chart_leads");
    expect(upsert).toHaveBeenCalledWith(
      {
        email: "sky@example.com",
        chart_data: { precision: "date", month: 6, day: 15, year: 1990 },
        source: "free_chart",
        subscribed: true,
      },
      { onConflict: "email" }
    );
  });

  it("rejects invalid email and birth input before writing", async () => {
    const badEmail = await POST(request("203.0.113.6", "not-an-email"));
    expect(badEmail.status).toBe(400);

    const badBirth = new Request("https://galaxiamea.com/api/chart-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7" },
      body: JSON.stringify({ email: "sky@example.com", chartData: { precision: "none" } }),
    });
    expect((await POST(badBirth)).status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
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
