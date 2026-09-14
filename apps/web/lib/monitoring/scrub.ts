/**
 * Privacy contract for error monitoring.
 *
 * What the SDK WILL send (when a DSN is set):
 *   - exception type, message (emails redacted), stack frames
 *   - request method and path PATTERN (identifier values redacted)
 *   - browser / runtime / OS, and SENTRY_ENVIRONMENT if set
 *
 * What it will NOT send:
 *   - birth data, birth time, latitude, longitude, notes, Vela
 *     conversation content, or email addresses — any field whose name
 *     matches the list below is replaced with "[redacted]"
 *   - person / user / thread ids, share/invite tokens, or name-bearing
 *     slugs in the URL, breadcrumbs, tags, or contexts — the route
 *     pattern stays, the value becomes "[redacted]"
 *   - request bodies and query strings on any privacy-bearing surface
 *     (Quick Chart/Compare/Share, /s/, /invite/, /r/, /app/, /admin/,
 *     and matching /api/admin and /api/invite routes)
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
const EMAIL_SEGMENT_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX32_SEGMENT_RE = /^[0-9a-f]{32}$/i;
const OPAQUE_TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Collection nouns whose *next* path segment is an identifier (person id,
 * user id, thread id, invite token, post/support id). New routes that
 * nest under these nouns inherit the redaction without a path list.
 */
const IDENTIFIER_COLLECTION_RE =
  /\/(person|people|users?|threads?|invite|posts|support)\/$/i;

/**
 * Prefixes of privacy-bearing surfaces. A path matches when it equals
 * the prefix or is nested under it, so a new `/app/foo/[id]` or
 * `/admin/bar/[id]` is covered without updating this list.
 */
const SENSITIVE_PATH_PREFIXES = [
  "/api/quick-chart",
  "/api/quick-compare",
  "/api/quick-share",
  "/api/invite",
  "/api/nudge-email/unsubscribe",
  "/api/constellation-letter/unsubscribe",
  "/api/constellation-letter/open",
  "/api/constellation-letter/go",
  "/s",
  "/invite",
  "/r",
  "/app",
  "/admin",
  "/api/admin"
] as const;

export function isSensitiveFieldName(key: string): boolean {
  const normalized = key.replace(/[\s-]/g, "_").toLowerCase();
  if (SENSITIVE_KEY_SET.has(normalized)) return true;
  if (normalized.startsWith("birth")) return true;
  return false;
}

export function redactEmails(value: string): string {
  return value.replace(EMAIL_RE, REDACTED);
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function extractPathname(urlOrPath: string): string {
  try {
    return new URL(urlOrPath, "https://galaxiamea.com").pathname;
  } catch {
    const q = urlOrPath.indexOf("?");
    return q === -1 ? urlOrPath : urlOrPath.slice(0, q);
  }
}

export function isSensitiveRequestPath(urlOrPath: string | undefined | null): boolean {
  if (!urlOrPath) return false;
  const pathname = extractPathname(urlOrPath);
  return SENSITIVE_PATH_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

/**
 * True when this path segment is itself an identifier value: a UUID
 * (hyphenated or 32-hex, as invite tokens are minted), an email, or a
 * mixed-case opaque token (share tokens are 22-char base64url).
 */
export function isIdentifierSegment(segment: string): boolean {
  if (!segment) return false;
  if (EMAIL_SEGMENT_RE.test(segment)) return true;
  if (UUID_SEGMENT_RE.test(segment)) return true;
  if (HEX32_SEGMENT_RE.test(segment)) return true;
  if (OPAQUE_TOKEN_RE.test(segment) && /[A-Z]/.test(segment) && /[a-z]/.test(segment)) {
    return true;
  }
  return false;
}

/**
 * True when the path so far is a prefix whose next segment is always an
 * identifier — `/app/person/`, `/admin/users/`, `/s/`, `/r/`, `/invite/`.
 * Single-letter prefixes (`/s/`, `/r/`) exist only to carry a token or
 * name-bearing slug.
 */
export function nextSegmentIsIdentifier(pathBeforeSegment: string): boolean {
  const prefix = pathBeforeSegment.endsWith("/") ? pathBeforeSegment : `${pathBeforeSegment}/`;
  if (IDENTIFIER_COLLECTION_RE.test(prefix)) return true;
  if (/^\/[a-z]\/$/i.test(prefix)) return true;
  return false;
}

export function redactPathname(pathname: string): string {
  if (!pathname) return pathname;
  const segments = pathname.split("/");
  const out: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === "") {
      out.push(segment);
      continue;
    }
    const originalPrefix = `${segments.slice(0, i).join("/")}/`;
    if (isIdentifierSegment(segment) || nextSegmentIsIdentifier(originalPrefix)) {
      out.push(REDACTED);
    } else {
      out.push(segment);
    }
  }
  return out.join("/");
}

function isUrlOrPath(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

function splitMethodAndPath(value: string): { method: string; path: string } | null {
  const match = value.match(/^([A-Z]+)\s+(\/.*)$/);
  if (!match) return null;
  return { method: match[1], path: match[2] };
}

/** Redact identifier values in a URL, path, or `GET /path` transaction name. */
export function redactIdentifiersInRouteString(value: string): string {
  const methodAndPath = splitMethodAndPath(value);
  if (methodAndPath) {
    return `${methodAndPath.method} ${redactRequestUrl(methodAndPath.path)}`;
  }
  if (isUrlOrPath(value)) return redactRequestUrl(value);
  return value;
}

function encodeQueryValue(value: string): string {
  // Path patterns and the redaction token stay readable in Sentry
  // (`next=/app/person/[redacted]`, `email=[redacted]`). Encode only
  // characters that would break the query string.
  if (value === REDACTED || isUrlOrPath(value)) {
    return value.replace(/ /g, "%20").replace(/&/g, "%26").replace(/#/g, "%23");
  }
  return encodeURIComponent(value);
}

function redactSearchParams(params: URLSearchParams): string {
  const parts: string[] = [];
  for (const [key, value] of params.entries()) {
    let nextValue: string;
    if (isSensitiveFieldName(key)) {
      nextValue = REDACTED;
    } else if (isUrlOrPath(value)) {
      nextValue = redactRequestUrl(value);
    } else if (isIdentifierSegment(value)) {
      nextValue = REDACTED;
    } else {
      nextValue = redactEmails(value);
    }
    parts.push(`${encodeURIComponent(key)}=${encodeQueryValue(nextValue)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
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

/**
 * Redact identifier values in a URL or path while keeping the route
 * pattern. Privacy-bearing surfaces also lose their query string.
 */
export function redactRequestUrl(urlOrPath: string): string {
  const sensitive = isSensitiveRequestPath(urlOrPath);
  try {
    const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(urlOrPath);
    const parsed = new URL(urlOrPath, "https://galaxiamea.com");
    parsed.pathname = redactPathname(parsed.pathname);
    if (sensitive) {
      parsed.search = "";
      parsed.hash = "";
    } else {
      parsed.search = redactSearchParams(parsed.searchParams);
    }
    if (!isAbsolute) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    const stripped = sensitive ? stripQuery(urlOrPath) : urlOrPath;
    const q = stripped.indexOf("?");
    const path = q === -1 ? stripped : stripped.slice(0, q);
    const search = q === -1 ? "" : stripped.slice(q);
    const redactedPath = redactPathname(path);
    if (sensitive || !search) return redactedPath;
    try {
      return `${redactedPath}${redactSearchParams(new URLSearchParams(search.slice(1)))}`;
    } catch {
      return redactedPath;
    }
  }
}

/**
 * Walk a breadcrumb / tag / context tree and redact identifier values in
 * any URL or path string. Non-URL strings are left to `scrubValue`
 * (emails + named fields) so Sentry event ids and trace ids stay intact.
 */
export function redactUrlLikeStrings<T>(value: T): T {
  if (typeof value === "string") {
    return redactIdentifiersInRouteString(value) as T;
  }
  if (typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactUrlLikeStrings(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    out[key] = redactUrlLikeStrings(child);
  }
  return out as T;
}

export function scrubBreadcrumb(breadcrumb: Record<string, unknown>): Record<string, unknown> {
  return redactUrlLikeStrings(scrubValue(breadcrumb) as Record<string, unknown>);
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
  transaction?: string;
  culprit?: string;
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
    } else if (typeof v === "string" && isUrlOrPath(v)) {
      out[k] = redactRequestUrl(v);
    } else {
      out[k] = scrubValue(v, k);
    }
  }
  return out;
}

function applyUrlRedaction(event: ScrubbableEvent): void {
  if (typeof event.transaction === "string") {
    event.transaction = redactIdentifiersInRouteString(event.transaction);
  }
  if (typeof event.culprit === "string") {
    event.culprit = redactIdentifiersInRouteString(event.culprit);
  }
  if (event.tags) event.tags = redactUrlLikeStrings(event.tags);
  if (event.contexts) event.contexts = redactUrlLikeStrings(event.contexts);
  if (event.extra) event.extra = redactUrlLikeStrings(event.extra);
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => redactUrlLikeStrings(crumb));
  }
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
    const originalUrl = event.request?.url;
    const sensitive = isSensitiveRequestPath(originalUrl);
    const request = { ...next.request };
    if (sensitive) {
      request.data = REDACTED;
      request.query_string = undefined;
    } else if (typeof request.query_string === "string") {
      const redacted = redactSearchParams(
        new URLSearchParams(
          request.query_string.startsWith("?") ? request.query_string.slice(1) : request.query_string
        )
      );
      request.query_string = redacted.startsWith("?") ? redacted.slice(1) : redacted;
    } else if (request.query_string && typeof request.query_string === "object") {
      request.query_string = redactUrlLikeStrings(scrubValue(request.query_string));
    }
    if (typeof originalUrl === "string") {
      request.url = redactRequestUrl(originalUrl);
    }
    if (request.cookies) request.cookies = REDACTED;
    if (request.headers) request.headers = scrubHeaders(event.request?.headers);
    if (request.env) request.env = REDACTED;
    next.request = request;
  }

  applyUrlRedaction(next);
  scrubStackFrames(next);

  return next;
}

function scrubStackFrames(event: ScrubbableEvent): void {
  const values = event.exception?.values;
  if (!values) return;
  for (const item of values) {
    const frames = (item as { stacktrace?: { frames?: Array<Record<string, unknown>> } }).stacktrace
      ?.frames;
    if (!frames) continue;
    for (const frame of frames) {
      // ContextLines / LocalVariables would otherwise ship nearby source
      // (and any birth values sitting in that source) plus in-scope locals.
      delete frame.pre_context;
      delete frame.post_context;
      delete frame.vars;
    }
  }
}
