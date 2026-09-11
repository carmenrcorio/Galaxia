/**
 * Privacy contract for error monitoring.
 *
 * What the SDK WILL send (when a DSN is set):
 *   - exception type, message (emails redacted), stack frames
 *   - request method and path (query string stripped on sensitive routes)
 *   - browser / runtime / OS, and SENTRY_ENVIRONMENT if set
 *
 * What it will NOT send:
 *   - birth data, birth time, latitude, longitude, notes, Vela
 *     conversation content, or email addresses — any field whose name
 *     matches the list below is replaced with "[redacted]"
 *   - request bodies and query strings on any route under
 *     /api/quick-chart, /s/, or /app/
 *   - cookies, Authorization headers, IP addresses (`sendDefaultPii: false`)
 *
 * This module is isomorphic and must not import `server-only` or
 * `@galaxia/astro` — it is loaded from the client instrumentation bundle.
 */

export const REDACTED = "[redacted]";

/**
 * Field names that must never leave the process. Includes the share-page
 * forbidden PII keys (birth date/time components, lat/lng) plus notes,
 * email, and Vela conversation fields. Matching is case-insensitive.
 */
export const SENSITIVE_FIELD_NAMES = [
  // Birth data / time (and the components `buildBirthInput` uses)
  "birth",
  "birthdata",
  "birth_data",
  "birthdate",
  "birth_date",
  "birthtime",
  "birth_time",
  "birthplace",
  "birth_place",
  "birthprecision",
  "birth_precision",
  "birthlat",
  "birth_lat",
  "birthlng",
  "birth_lng",
  "dateutc",
  "date_utc",
  "yearonly",
  "year_only",
  "hour",
  "minute",
  "month",
  "day",
  "year",
  "tz",
  "tzid",
  "tz_id",
  "tzoffsetmin",
  "tz_offset_min",
  // Coordinates
  "lat",
  "lng",
  "lon",
  "latitude",
  "longitude",
  // Notes
  "notes",
  "note",
  // Email
  "email",
  "email_address",
  "emailaddress",
  // Vela conversation
  "messages",
  "conversation",
  "vela",
  "thread",
  "prompt",
  "content",
  "body",
  "suggestions"
] as const;

const SENSITIVE_KEY_SET = new Set<string>(SENSITIVE_FIELD_NAMES);

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function isSensitiveFieldName(key: string): boolean {
  const normalized = key.replace(/[\s-]/g, "_").toLowerCase();
  if (SENSITIVE_KEY_SET.has(normalized)) return true;
  if (normalized.startsWith("birth")) return true;
  return false;
}

export function redactEmails(value: string): string {
  return value.replace(EMAIL_RE, REDACTED);
}

export function isSensitiveRequestPath(urlOrPath: string | undefined | null): boolean {
  if (!urlOrPath) return false;
  let pathname = urlOrPath;
  try {
    pathname = new URL(urlOrPath, "https://galaxiamea.com").pathname;
  } catch {
    const q = urlOrPath.indexOf("?");
    pathname = q === -1 ? urlOrPath : urlOrPath.slice(0, q);
  }
  return (
    pathname === "/api/quick-chart" ||
    pathname.startsWith("/api/quick-chart/") ||
    pathname === "/s" ||
    pathname.startsWith("/s/") ||
    pathname === "/app" ||
    pathname.startsWith("/app/")
  );
}

function stripQuery(url: string): string {
  try {
    const parsed = new URL(url, "https://galaxiamea.com");
    parsed.search = "";
    parsed.hash = "";
    // Preserve relative paths that we parsed against the fallback origin.
    if (!/^[a-z]+:\/\//i.test(url)) {
      return `${parsed.pathname}`;
    }
    return parsed.toString();
  } catch {
    const q = url.indexOf("?");
    return q === -1 ? url : url.slice(0, q);
  }
}

export function scrubValue(value: unknown, key?: string): unknown {
  if (key && isSensitiveFieldName(key)) return REDACTED;
  if (typeof value === "string") return redactEmails(value);
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = scrubValue(v, k);
  }
  return out;
}

/**
 * Sentry event-shaped object. Kept as a structural type so unit tests do
 * not have to import `@sentry/nextjs`.
 */
export type ScrubbableEvent = {
  message?: string;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  user?: Record<string, unknown> | null;
  request?: {
    url?: string;
    query_string?: unknown;
    data?: unknown;
    cookies?: unknown;
    headers?: unknown;
    env?: unknown;
    method?: string;
  };
  breadcrumbs?: Array<Record<string, unknown>>;
  exception?: { values?: Array<{ type?: string; value?: string; [k: string]: unknown }> };
  [key: string]: unknown;
};

function scrubHeaders(headers: unknown): unknown {
  if (!headers || typeof headers !== "object") return headers;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    if (/^(authorization|cookie|set-cookie|x-forwarded-for)$/i.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = scrubValue(v, k);
    }
  }
  return out;
}

export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  const next = scrubValue(event) as T;

  if (next.user && typeof next.user === "object") {
    const user = { ...next.user };
    delete user.email;
    delete user.ip_address;
    delete user.ipAddress;
    next.user = user;
  }

  if (next.request) {
    const sensitive = isSensitiveRequestPath(event.request?.url);
    const request = { ...next.request };
    if (sensitive) {
      request.data = REDACTED;
      request.query_string = undefined;
      if (typeof event.request?.url === "string") {
        request.url = stripQuery(event.request.url);
      }
    }
    if (request.cookies) request.cookies = REDACTED;
    if (request.headers) request.headers = scrubHeaders(event.request?.headers);
    if (request.env) request.env = REDACTED;
    next.request = request;
  }

  return next;
}
