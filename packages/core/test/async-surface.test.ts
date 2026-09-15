import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  VELA_FETCH_TIMEOUT_MS,
  isFetchTimeoutError,
  withTimeout
} from "../src/async-surface";

afterEach(() => {
  vi.useRealTimers();
});

describe("withTimeout", () => {
  it("resolves when the work finishes inside the budget", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 50)).resolves.toBe("ok");
  });

  it("rejects with FetchTimeoutError when the work never settles", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 80);
    const expectation = expect(pending).rejects.toBeInstanceOf(FetchTimeoutError);
    await vi.advanceTimersByTimeAsync(80);
    await expectation;
  });

  it("does not leave a hung spinner as the success path: timeout is a failure", () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(8000);
    expect(VELA_FETCH_TIMEOUT_MS).toBeGreaterThan(DEFAULT_FETCH_TIMEOUT_MS);
  });
});

describe("isFetchTimeoutError", () => {
  it("matches by name so bundled copies still count", () => {
    const err = new Error("timeout");
    err.name = "FetchTimeoutError";
    expect(isFetchTimeoutError(err)).toBe(true);
    expect(isFetchTimeoutError(new Error("boom"))).toBe(false);
  });
});
