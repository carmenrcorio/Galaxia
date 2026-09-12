/**
 * Sliding-window rate limiter for the public, unauthenticated chart-compute
 * routes (/api/quick-chart, /api/quick-compare — see middleware.ts). These
 * routes need no session and run a real astrology computation per request,
 * so with no cap anyone can drive Vercel compute cost at any volume.
 *
 * State is a module-level `Map<string, number[]>` of request timestamps per
 * key, kept in memory — deliberately, not in Redis/Upstash/etc. This is
 * per-instance (each serverless/edge instance enforces its own window, so the
 * effective ceiling scales with instance count), which is an accepted
 * tradeoff here in exchange for adding zero new service dependencies for a
 * best-effort abuse cap on free, anonymous endpoints.
 */

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 30;

const requestLog = new Map<string, number[]>();

export interface SlidingWindowResult {
  allowed: boolean;
  /** Timestamps remaining in the window after this check (for the caller to persist). */
  timestamps: number[];
}

/**
 * Pure sliding-window check, extracted from the module-level store so it can
 * be unit tested directly. Given the timestamps recorded so far for a key and
 * the current time, drops anything outside the window, then — if under the
 * limit — appends `now` and allows the request; otherwise leaves the log
 * untouched and denies it.
 */
export function checkSlidingWindow(
  timestamps: number[],
  now: number,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS
): SlidingWindowResult {
  const windowStart = now - windowMs;
  const recent = timestamps.filter((ts) => ts > windowStart);
  if (recent.length >= maxRequests) {
    return { allowed: false, timestamps: recent };
  }
  recent.push(now);
  return { allowed: true, timestamps: recent };
}

/**
 * Checks `key` against the shared in-memory window and records the request
 * if allowed. Returns true when the caller should be rejected (429).
 */
export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const existing = requestLog.get(key) ?? [];
  const { allowed, timestamps } = checkSlidingWindow(existing, now);
  requestLog.set(key, timestamps);
  return !allowed;
}

/** Test-only: clears the shared store so specs don't bleed into each other. */
export function __resetRateLimitStoreForTests(): void {
  requestLog.clear();
}

/**
 * Client key for the limiter: the first `x-forwarded-for` address (the
 * client's own IP, per Vercel's convention of appending proxy hops), or the
 * static "anonymous" bucket when the header is missing.
 */
export function getClientKeyFromHeaders(headers: { get(name: string): string | null }): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim();
  return ip || "anonymous";
}
