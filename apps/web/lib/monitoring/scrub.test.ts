import { describe, expect, it } from "vitest";
import {
  REDACTED,
  isSensitiveFieldName,
  isSensitiveRequestPath,
  scrubSentryEvent,
  type ScrubbableEvent
} from "./scrub";

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
  it("matches /api/quick-chart, /s/, and /app/", () => {
    expect(isSensitiveRequestPath("https://galaxiamea.com/api/quick-chart")).toBe(true);
    expect(isSensitiveRequestPath("/api/quick-chart?lat=1")).toBe(true);
    expect(isSensitiveRequestPath("/s/abc123")).toBe(true);
    expect(isSensitiveRequestPath("/app/person/1")).toBe(true);
    expect(isSensitiveRequestPath("/app")).toBe(true);
  });

  it("does not match public marketing routes", () => {
    expect(isSensitiveRequestPath("/synastry-chart-meaning")).toBe(false);
    expect(isSensitiveRequestPath("/chart")).toBe(false);
    expect(isSensitiveRequestPath("/blog")).toBe(false);
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
      "https://galaxiamea.com/s/tok123?lat=1&lng=2",
      "https://galaxiamea.com/app/compare?birthDate=1990-01-15"
    ]) {
      const scrubbed = scrubSentryEvent({
        request: { url, query_string: "lat=1", data: { birth_time: "12:00" } }
      });
      expect(scrubbed.request?.query_string).toBeUndefined();
      expect(scrubbed.request?.data).toBe(REDACTED);
      expect(scrubbed.request?.url).not.toContain("?");
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
});
