/**
 * Add a capture email to the Resend segment named "Blog chart readings".
 * Lookup/create is best-effort: a failed audience write must not block the
 * transactional send that already went out.
 *
 * Uses the same raw fetch + RESEND_API_KEY pattern as lib/emails.ts
 * (the SDK is not a dependency of this send path).
 */

export const BLOG_CHART_READINGS_SEGMENT_NAME = "Blog chart readings";

let cachedSegmentId: string | null = null;

interface ResendListResponse<T> {
  data?: T[] | { data?: T[] };
}

function unwrapList<T>(json: ResendListResponse<T> | T[] | null | undefined): T[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (json.data && typeof json.data === "object" && Array.isArray(json.data.data)) return json.data.data;
  return [];
}

async function resendJson(
  key: string,
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

async function resolveSegmentId(key: string): Promise<string | null> {
  if (cachedSegmentId) return cachedSegmentId;

  const listed = await resendJson(key, "GET", "/segments?limit=100");
  const segments = unwrapList<{ id?: string; name?: string }>(listed.json as ResendListResponse<{ id?: string; name?: string }>);
  const existing = segments.find((s) => s.name === BLOG_CHART_READINGS_SEGMENT_NAME);
  if (existing?.id) {
    cachedSegmentId = existing.id;
    return cachedSegmentId;
  }

  const created = await resendJson(key, "POST", "/segments", { name: BLOG_CHART_READINGS_SEGMENT_NAME });
  const createdId =
    created.json && typeof created.json === "object" && "id" in created.json && typeof created.json.id === "string"
      ? created.json.id
      : created.json &&
          typeof created.json === "object" &&
          "data" in created.json &&
          created.json.data &&
          typeof created.json.data === "object" &&
          "id" in created.json.data &&
          typeof (created.json.data as { id?: unknown }).id === "string"
        ? (created.json.data as { id: string }).id
        : null;
  if (createdId) {
    cachedSegmentId = createdId;
    return cachedSegmentId;
  }
  return null;
}

export async function addToBlogChartReadingsAudience(email: string, firstName?: string | null): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const segmentId = await resolveSegmentId(key);
  if (!segmentId) return;

  const payload: Record<string, unknown> = {
    email,
    unsubscribed: false,
    segments: [{ id: segmentId }]
  };
  const name = firstName?.trim();
  if (name) payload.first_name = name.split(/\s+/)[0];

  const created = await resendJson(key, "POST", "/contacts", payload);
  if (created.ok) return;

  await resendJson(key, "PATCH", `/contacts/${encodeURIComponent(email)}`, {
    unsubscribed: false,
    segments: [{ id: segmentId }]
  });
}

export async function unsubscribeBlogChartReading(email: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await resendJson(key, "PATCH", `/contacts/${encodeURIComponent(email)}`, { unsubscribed: true });
}

export function __resetBlogChartReadingsSegmentCacheForTests(): void {
  cachedSegmentId = null;
}
