import { describe, expect, it } from "vitest";
import {
  REDACTED,
  isIdentifierSegment,
  isSensitiveFieldName,
  isSensitiveRequestPath,
  nextSegmentIsIdentifier,
  redactPathname,
  redactRequestUrl,
  scrubSentryEvent,
  type ScrubbableEvent
} from "./scrub";

const PERSON_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const POST_ID = "11111111-2222-4333-8444-555555555555";
const SUPPORT_ID = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const SHARE_TOKEN = "vvgfUWf_oEKLJu68AEF9rw";
const INVITE_TOKEN = "c0ffee00c0ffee00c0ffee00c0ffee00";

/**
 * A payload that looks like what a crash on /api/quick-chart, /s/, or
 * /app/ would attach: birth data, coordinates, notes, Vela conversation,
 * and an email. Every one of these must be gone after scrubbing.
 */
function representativePayload(): ScrubbableEvent {
  return {
    message: "Chart failed for jane@galaxia.test",
    extra: {
      birthDate: "1990-01-15",
      birth_time: "14:32",
      birthTime: "14:32",
      birth_place: "Brooklyn, NY",
      latitude: 40.7128,
      longitude: -74.006,
      lat: 40.7128,
      lng: -74.006,
      notes: "private note about this person",
      note: "another private note",
      email: "jane@galaxia.test",
      messages: [{ role: "user", content: "What does her Moon mean?" }],
      conversation: [{ body: "Vela's reply about the Moon" }],
      vela: { thread: "thread_abc", prompt: "Read this chart" }
    },
    user: { email: "jane@galaxia.test", ip_address: "203.0.113.10", id: "user_1" },
    request: {
      url: "https://galaxiamea.com/api/quick-chart?lat=40.7&lng=-74.0&email=jane@galaxia.test",
      method: "POST",
      query_string: "lat=40.7&lng=-74.0",
      data: {
        input: {
          birthDate: "1990-01-15",
          hour: 14,
          minute: 32,
          lat: 40.7128,
          lng: -74.006
        }
      },
      cookies: { sb: "session" },
      headers: { Authorization: "Bearer secret", "content-type": "application/json" }
    },
    breadcrumbs: [{ message: "posted to /api/quick-chart", data: { email: "jane@galaxia.test" } }]
  };
}

describe("isSensitiveFieldName", () => {
  it("matches every named privacy field", () => {
    for (const key of [
      "birthDate",
      "birth_time",
      "latitude",
      "longitude",
      "lat",
      "lng",
      "notes",
      "email",
      "messages",
      "conversation"
    ]) {
      expect(isSensitiveFieldName(key)).toBe(true);
    }
  });

  it("does not treat the error message key as sensitive", () => {
    expect(isSensitiveFieldName("message")).toBe(false);
    expect(isSensitiveFieldName("type")).toBe(false);
  });
});

describe("isSensitiveRequestPath", () => {
  it("matches Quick Chart/Compare/Share, /s/, /invite/, /r/, /app/, and /admin/", () => {
    expect(isSensitiveRequestPath("https://galaxiamea.com/api/quick-chart")).toBe(true);
    expect(isSensitiveRequestPath("/api/quick-chart?lat=1")).toBe(true);
    expect(isSensitiveRequestPath("/api/quick-compare")).toBe(true);
    expect(isSensitiveRequestPath("/api/quick-share")).toBe(true);
    expect(isSensitiveRequestPath("/s/abc123")).toBe(true);
    expect(isSensitiveRequestPath("/invite/c0ffee")).toBe(true);
    expect(isSensitiveRequestPath("/api/invite/birth-data")).toBe(true);
    expect(isSensitiveRequestPath("/r/jane-doe")).toBe(true);
    expect(isSensitiveRequestPath("/app/person/1")).toBe(true);
    expect(isSensitiveRequestPath("/app")).toBe(true);
    expect(isSensitiveRequestPath(`/admin/users/${USER_ID}`)).toBe(true);
    expect(isSensitiveRequestPath(`/api/admin/users/${USER_ID}/comp/grant`)).toBe(true);
    expect(isSensitiveRequestPath("/api/nudge-email/unsubscribe")).toBe(true);
    expect(isSensitiveRequestPath("/api/unsubscribe")).toBe(true);
    expect(isSensitiveRequestPath("/api/unsubscribe?token=abc")).toBe(true);
    expect(isSensitiveRequestPath("/api/constellation-letter/unsubscribe")).toBe(true);
    expect(isSensitiveRequestPath("/api/constellation-letter/open")).toBe(true);
    expect(isSensitiveRequestPath("/api/constellation-letter/go")).toBe(true);
    expect(isSensitiveRequestPath("/api/blog/chart-reading-capture")).toBe(true);
    expect(isSensitiveRequestPath("/api/blog/chart-reading-unsubscribe")).toBe(true);
  });

  it("does not match public marketing routes", () => {
    expect(isSensitiveRequestPath("/synastry-chart-meaning")).toBe(false);
    expect(isSensitiveRequestPath("/chart")).toBe(false);
    expect(isSensitiveRequestPath("/blog")).toBe(false);
    expect(isSensitiveRequestPath("/blog/guides")).toBe(false);
    expect(isSensitiveRequestPath("/login")).toBe(false);
  });
});

describe("identifier path segments", () => {
  it("recognises UUIDs, hyphenless invite tokens, emails, and share tokens", () => {
    expect(isIdentifierSegment(PERSON_ID)).toBe(true);
    expect(isIdentifierSegment(INVITE_TOKEN)).toBe(true);
    expect(isIdentifierSegment("jane@galaxia.test")).toBe(true);
    expect(isIdentifierSegment(SHARE_TOKEN)).toBe(true);
    expect(isIdentifierSegment("guides")).toBe(false);
    expect(isIdentifierSegment("synastry-chart-meaning")).toBe(false);
    expect(isIdentifierSegment("person")).toBe(false);
  });

  it("treats collection nouns and single-letter prefixes as identifier carriers", () => {
    expect(nextSegmentIsIdentifier("/app/person/")).toBe(true);
    expect(nextSegmentIsIdentifier("/admin/users/")).toBe(true);
    expect(nextSegmentIsIdentifier("/api/admin/users/")).toBe(true);
    expect(nextSegmentIsIdentifier("/api/admin/support/")).toBe(true);
    expect(nextSegmentIsIdentifier("/api/admin/posts/")).toBe(true);
    expect(nextSegmentIsIdentifier("/invite/")).toBe(true);
    expect(nextSegmentIsIdentifier("/s/")).toBe(true);
    expect(nextSegmentIsIdentifier("/r/")).toBe(true);
    expect(nextSegmentIsIdentifier("/blog/")).toBe(false);
    expect(nextSegmentIsIdentifier("/")).toBe(false);
  });
});

describe("redactPathname / redactRequestUrl", () => {
  it("keeps the route pattern and redacts only identifier values", () => {
    expect(redactPathname(`/app/person/${PERSON_ID}`)).toBe(`/app/person/${REDACTED}`);
    expect(redactPathname(`/s/${SHARE_TOKEN}/opengraph-image`)).toBe(`/s/${REDACTED}/opengraph-image`);
    expect(redactPathname(`/invite/${INVITE_TOKEN}`)).toBe(`/invite/${REDACTED}`);
    expect(redactPathname("/r/jane-doe")).toBe(`/r/${REDACTED}`);
    expect(redactPathname(`/admin/users/${USER_ID}`)).toBe(`/admin/users/${REDACTED}`);
    expect(redactPathname(`/api/admin/users/${USER_ID}/comp/grant`)).toBe(
      `/api/admin/users/${REDACTED}/comp/grant`
    );
    expect(redactPathname(`/api/admin/users/${USER_ID}/resend-email`)).toBe(
      `/api/admin/users/${REDACTED}/resend-email`
    );
    expect(redactPathname(`/api/admin/support/${SUPPORT_ID}/close`)).toBe(
      `/api/admin/support/${REDACTED}/close`
    );
    expect(redactPathname(`/admin/posts/${POST_ID}`)).toBe(`/admin/posts/${REDACTED}`);
  });

  it("does not redact public blog slugs or categories", () => {
    expect(redactPathname("/synastry-chart-meaning")).toBe("/synastry-chart-meaning");
    expect(redactPathname("/blog/guides")).toBe("/blog/guides");
    expect(redactPathname("/blog/debunked")).toBe("/blog/debunked");
    expect(redactPathname("/chart/compare")).toBe("/chart/compare");
  });

  it("drops query strings on privacy-bearing routes and redacts ids in login next=", () => {
    expect(redactRequestUrl(`https://galaxiamea.com/app/person/${PERSON_ID}?threadId=${PERSON_ID}`)).toBe(
      `https://galaxiamea.com/app/person/${REDACTED}`
    );
    expect(redactRequestUrl(`/login?next=/app/person/${PERSON_ID}`)).toBe(
      `/login?next=/app/person/${REDACTED}`
    );
    expect(redactRequestUrl("/signup?email=jane@galaxia.test")).toBe(`/signup?email=${REDACTED}`);
    expect(redactRequestUrl("/synastry-chart-meaning?utm=1")).toBe("/synastry-chart-meaning?utm=1");
  });
});

describe("scrubSentryEvent", () => {
  it("strips every sensitive field from a representative payload", () => {
    const scrubbed = scrubSentryEvent(representativePayload());
    const json = JSON.stringify(scrubbed);

    expect(json).not.toContain("1990-01-15");
    expect(json).not.toContain("14:32");
    expect(json).not.toContain("Brooklyn");
    expect(json).not.toContain("40.7128");
    expect(json).not.toContain("-74.006");
    expect(json).not.toContain("private note");
    expect(json).not.toContain("jane@galaxia.test");
    expect(json).not.toContain("What does her Moon mean?");
    expect(json).not.toContain("Vela's reply");
    expect(json).not.toContain("thread_abc");
    expect(json).not.toContain("203.0.113.10");
    expect(json).not.toContain("Bearer secret");
    expect(json).not.toContain("session");

    expect(scrubbed.extra?.birthDate).toBe(REDACTED);
    expect(scrubbed.extra?.birth_time).toBe(REDACTED);
    expect(scrubbed.extra?.latitude).toBe(REDACTED);
    expect(scrubbed.extra?.longitude).toBe(REDACTED);
    expect(scrubbed.extra?.notes).toBe(REDACTED);
    expect(scrubbed.extra?.email).toBe(REDACTED);
    expect(scrubbed.extra?.messages).toBe(REDACTED);
    expect(scrubbed.extra?.conversation).toBe(REDACTED);
    expect(scrubbed.message).toContain(REDACTED);
    expect(scrubbed.message).not.toContain("@");
    expect(scrubbed.request?.data).toBe(REDACTED);
    expect(scrubbed.request?.query_string).toBeUndefined();
    expect(scrubbed.request?.url).toBe("https://galaxiamea.com/api/quick-chart");
    expect(scrubbed.user?.email).toBeUndefined();
  });

  it("scrubs query strings on /s/ and /app/ as well as /api/quick-chart", () => {
    for (const url of [
      `https://galaxiamea.com/s/${SHARE_TOKEN}?lat=1&lng=2`,
      "https://galaxiamea.com/app/compare?birthDate=1990-01-15"
    ]) {
      const scrubbed = scrubSentryEvent({
        request: { url, query_string: "lat=1", data: { birth_time: "12:00" } }
      });
      expect(scrubbed.request?.query_string).toBeUndefined();
      expect(scrubbed.request?.data).toBe(REDACTED);
      expect(scrubbed.request?.url).not.toContain("?");
      expect(JSON.stringify(scrubbed)).not.toContain(SHARE_TOKEN);
    }
  });

  it("drops body and query on /invite, /r, and /admin identifier routes", () => {
    const cases = [
      `https://galaxiamea.com/invite/${INVITE_TOKEN}`,
      "https://galaxiamea.com/r/jane-doe",
      `https://galaxiamea.com/admin/users/${USER_ID}?q=jane@galaxia.test`,
      `https://galaxiamea.com/api/admin/users/${USER_ID}/resend-email`
    ];
    for (const url of cases) {
      const scrubbed = scrubSentryEvent({
        request: {
          url: `${url}${url.includes("?") ? "" : "?token=secret"}`,
          query_string: "token=secret",
          data: { birthDate: "1990-01-15" }
        }
      });
      expect(scrubbed.request?.query_string).toBeUndefined();
      expect(scrubbed.request?.data).toBe(REDACTED);
      expect(scrubbed.request?.url).not.toContain("?");
      expect(JSON.stringify(scrubbed)).not.toContain(INVITE_TOKEN);
      expect(JSON.stringify(scrubbed)).not.toContain(USER_ID);
      expect(JSON.stringify(scrubbed)).not.toContain("jane-doe");
    }
  });

  it("still redacts named fields on a non-sensitive route, but keeps the path query if it has none of those keys as query_string leftover", () => {
    const scrubbed = scrubSentryEvent({
      extra: { birthDate: "1990-01-15", ok: "fine" },
      request: {
        url: "https://galaxiamea.com/synastry-chart-meaning?utm=1",
        query_string: "utm=1",
        data: { ok: "fine" }
      }
    });
    expect(scrubbed.extra?.birthDate).toBe(REDACTED);
    expect(scrubbed.extra?.ok).toBe("fine");
    expect(scrubbed.request?.url).toContain("utm=1");
    expect(scrubbed.request?.query_string).toBe("utm=1");
    expect(scrubbed.request?.data).toEqual({ ok: "fine" });
  });

  it("redacts person ids in the URL, breadcrumbs, tags, and context", () => {
    const url = `https://galaxiamea.com/app/person/${PERSON_ID}`;
    const scrubbed = scrubSentryEvent({
      transaction: `GET /app/person/${PERSON_ID}`,
      culprit: `/app/person/${PERSON_ID}`,
      tags: { url, transaction: `/app/person/${PERSON_ID}` },
      contexts: {
        trace: { trace_id: "abcd".repeat(8) },
        nextjs: { route: `/app/person/${PERSON_ID}` }
      },
      extra: { href: url },
      request: {
        url: `${url}?threadId=${PERSON_ID}`,
        query_string: `threadId=${PERSON_ID}`,
        data: { note: "private" },
        headers: { Referer: `https://galaxiamea.com/app/person/${PERSON_ID}` }
      },
      breadcrumbs: [
        {
          category: "navigation",
          data: { from: "/app", to: `/app/person/${PERSON_ID}` }
        },
        {
          category: "http",
          data: { url, method: "GET" }
        }
      ]
    });

    const json = JSON.stringify(scrubbed);
    expect(json).not.toContain(PERSON_ID);
    expect(scrubbed.request?.url).toBe(`https://galaxiamea.com/app/person/${REDACTED}`);
    expect(scrubbed.request?.query_string).toBeUndefined();
    expect(scrubbed.request?.data).toBe(REDACTED);
    expect(scrubbed.transaction).toBe(`GET /app/person/${REDACTED}`);
    expect(scrubbed.culprit).toBe(`/app/person/${REDACTED}`);
    expect(scrubbed.tags?.url).toBe(`https://galaxiamea.com/app/person/${REDACTED}`);
    expect(scrubbed.tags?.transaction).toBe(`/app/person/${REDACTED}`);
    expect(scrubbed.contexts?.nextjs).toEqual({ route: `/app/person/${REDACTED}` });
    expect((scrubbed.contexts?.trace as { trace_id: string }).trace_id).toBe("abcd".repeat(8));
    expect(scrubbed.extra?.href).toBe(`https://galaxiamea.com/app/person/${REDACTED}`);
    expect(scrubbed.breadcrumbs?.[0]?.data).toEqual({ from: "/app", to: `/app/person/${REDACTED}` });
    expect((scrubbed.breadcrumbs?.[1]?.data as { url: string }).url).toBe(
      `https://galaxiamea.com/app/person/${REDACTED}`
    );
    expect((scrubbed.request?.headers as Record<string, unknown>).Referer).toBe(
      `https://galaxiamea.com/app/person/${REDACTED}`
    );
  });

  it("strips source-context and local vars from stack frames", () => {
    const scrubbed = scrubSentryEvent({
      exception: {
        values: [
          {
            type: "Error",
            value: "boom",
            stacktrace: {
              frames: [
                {
                  filename: "app/api/quick-chart/route.ts",
                  context_line: "throw err;",
                  pre_context: ['birthDate: "1990-01-15"'],
                  post_context: ["latitude: 40.7128"],
                  vars: { birth_time: "14:32" }
                }
              ]
            }
          }
        ]
      }
    });
    const frame = (
      scrubbed.exception?.values?.[0] as {
        stacktrace: { frames: Array<Record<string, unknown>> };
      }
    ).stacktrace.frames[0];
    expect(frame.pre_context).toBeUndefined();
    expect(frame.post_context).toBeUndefined();
    expect(frame.vars).toBeUndefined();
    expect(frame.filename).toBe("app/api/quick-chart/route.ts");
  });
});
