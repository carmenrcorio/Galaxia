import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetRateLimitStoreForTests,
  checkSlidingWindow,
  getClientKeyFromHeaders,
  isRateLimited,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS
} from "./rate-limit";

describe("checkSlidingWindow", () => {
  it("allows requests under the limit and records the timestamp", () => {
    const result = checkSlidingWindow([], 1000, 60_000, 3);
    expect(result.allowed).toBe(true);
    expect(result.timestamps).toEqual([1000]);
  });

  it("allows up to maxRequests within the window, then denies the next one", () => {
    let timestamps: number[] = [];
    for (let i = 0; i < 3; i++) {
      const result = checkSlidingWindow(timestamps, 1000 + i, 60_000, 3);
      expect(result.allowed).toBe(true);
      timestamps = result.timestamps;
    }
    const fourth = checkSlidingWindow(timestamps, 1003, 60_000, 3);
    expect(fourth.allowed).toBe(false);
    // A denied check does not consume/record a slot.
    expect(fourth.timestamps).toHaveLength(3);
  });

  it("drops timestamps once they age out of the window, freeing up capacity", () => {
    const windowMs = 60_000;
    const maxRequests = 2;
    let timestamps: number[] = [];
    timestamps = checkSlidingWindow(timestamps, 0, windowMs, maxRequests).timestamps;
    timestamps = checkSlidingWindow(timestamps, 10, windowMs, maxRequests).timestamps;

    // Still within the window and at capacity: denied.
    const stillInWindow = checkSlidingWindow(timestamps, 20, windowMs, maxRequests);
    expect(stillInWindow.allowed).toBe(false);

    // Past the window for both earlier timestamps: both age out, so this is
    // allowed and the log only retains the new timestamp.
    const afterWindow = checkSlidingWindow(timestamps, windowMs + 11, windowMs, maxRequests);
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.timestamps).toEqual([windowMs + 11]);
  });

  it("treats a timestamp exactly at the window boundary as expired", () => {
    // windowStart = now - windowMs; a timestamp equal to windowStart is not
    // `> windowStart`, so it is dropped (sliding window is a half-open range).
    const result = checkSlidingWindow([1000], 1000 + 60_000, 60_000, 1);
    expect(result.allowed).toBe(true);
    expect(result.timestamps).toEqual([1000 + 60_000]);
  });

  it("uses the exported defaults (30 requests / 60s) when not overridden", () => {
    expect(RATE_LIMIT_MAX_REQUESTS).toBe(30);
    expect(RATE_LIMIT_WINDOW_MS).toBe(60_000);

    let timestamps: number[] = [];
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      const result = checkSlidingWindow(timestamps, i);
      expect(result.allowed).toBe(true);
      timestamps = result.timestamps;
    }
    expect(checkSlidingWindow(timestamps, RATE_LIMIT_MAX_REQUESTS).allowed).toBe(false);
  });
});

describe("isRateLimited", () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
  });

  it("does not rate limit a key on its first requests", () => {
    expect(isRateLimited("1.2.3.4", 0)).toBe(false);
  });

  it("rate limits a single key after it exceeds the max within the window", () => {
    const key = "1.2.3.4";
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(isRateLimited(key, i)).toBe(false);
    }
    expect(isRateLimited(key, RATE_LIMIT_MAX_REQUESTS)).toBe(true);
  });

  it("tracks keys independently — one IP hitting the limit does not affect another", () => {
    const rateLimitedKey = "1.2.3.4";
    const otherKey = "5.6.7.8";
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      isRateLimited(rateLimitedKey, i);
    }
    expect(isRateLimited(rateLimitedKey, RATE_LIMIT_MAX_REQUESTS)).toBe(true);
    expect(isRateLimited(otherKey, RATE_LIMIT_MAX_REQUESTS)).toBe(false);
  });

  it("allows requests again once the window has fully elapsed", () => {
    const key = "1.2.3.4";
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      isRateLimited(key, i);
    }
    expect(isRateLimited(key, RATE_LIMIT_MAX_REQUESTS)).toBe(true);
    expect(isRateLimited(key, RATE_LIMIT_WINDOW_MS + RATE_LIMIT_MAX_REQUESTS + 1)).toBe(false);
  });
});

describe("getClientKeyFromHeaders", () => {
  function headersWithForwardedFor(value: string | null) {
    return { get: (name: string) => (name === "x-forwarded-for" ? value : null) };
  }

  it("uses the first IP in a comma-separated x-forwarded-for header", () => {
    expect(getClientKeyFromHeaders(headersWithForwardedFor("203.0.113.5, 70.41.3.18, 150.172.238.178"))).toBe(
      "203.0.113.5"
    );
  });

  it("trims whitespace around the client IP", () => {
    expect(getClientKeyFromHeaders(headersWithForwardedFor("  203.0.113.5  , 70.41.3.18"))).toBe("203.0.113.5");
  });

  it("uses the header value directly when there is a single IP", () => {
    expect(getClientKeyFromHeaders(headersWithForwardedFor("203.0.113.5"))).toBe("203.0.113.5");
  });

  it("falls back to the static 'anonymous' key when the header is missing", () => {
    expect(getClientKeyFromHeaders(headersWithForwardedFor(null))).toBe("anonymous");
  });

  it("falls back to 'anonymous' when the header is present but empty", () => {
    expect(getClientKeyFromHeaders(headersWithForwardedFor(""))).toBe("anonymous");
  });
});
