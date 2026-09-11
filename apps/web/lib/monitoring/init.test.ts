import { afterEach, describe, expect, it, vi } from "vitest";

const init = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init,
  captureRequestError: vi.fn()
}));

describe("initMonitoring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    init.mockClear();
  });

  it("is a no-op when no DSN env var is set", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const { initMonitoring } = await import("./init");
    expect(initMonitoring()).toBe(false);
    expect(init).not.toHaveBeenCalled();
  });

  it("calls Sentry.init with sendDefaultPii false when a DSN is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://publickey@o0.ingest.sentry.io/1");
    const { initMonitoring } = await import("./init");
    expect(initMonitoring()).toBe(true);
    expect(init).toHaveBeenCalledTimes(1);
    const options = init.mock.calls[0][0] as {
      dsn: string;
      sendDefaultPii: boolean;
      beforeSend: (event: unknown) => unknown;
    };
    expect(options.dsn).toBe("https://publickey@o0.ingest.sentry.io/1");
    expect(options.sendDefaultPii).toBe(false);
    expect(typeof options.beforeSend).toBe("function");
  });
});
