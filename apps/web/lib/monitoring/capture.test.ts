import { afterEach, describe, expect, it } from "vitest";
import * as Sentry from "@sentry/node";
import { REDACTED, scrubSentryEvent, type ScrubbableEvent } from "./scrub";

/**
 * A deliberately thrown error goes through the same `beforeSend` scrubber
 * the SDK wires in `init.ts`. The capturing transport stands in for the
 * Sentry ingest — there is no DSN in this environment — and the envelope
 * must not contain birth data.
 */
describe("Sentry capture + scrubber", () => {
  afterEach(async () => {
    await Sentry.close();
  });

  it("delivers a test error to the transport with birth data stripped", async () => {
    const envelopes: unknown[] = [];

    Sentry.init({
      dsn: "https://publickey@o0.ingest.sentry.io/1",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        return scrubSentryEvent(event as unknown as ScrubbableEvent) as unknown as typeof event;
      },
      transport: () => ({
        send(envelope) {
          envelopes.push(envelope);
          return Promise.resolve({});
        },
        flush: async () => true
      })
    });

    Sentry.captureException(new Error("deliberate test error"), {
      extra: {
        birthDate: "1990-01-15",
        birth_time: "14:32",
        latitude: 40.7128,
        longitude: -74.006,
        notes: "private note about this person",
        email: "jane@galaxia.test",
        messages: [{ content: "What does her Moon mean?" }]
      }
    });

    await Sentry.flush(2000);

    expect(envelopes.length).toBeGreaterThan(0);
    const dumped = JSON.stringify(envelopes);
    expect(dumped).toContain("deliberate test error");
    expect(dumped).not.toContain("1990-01-15");
    expect(dumped).not.toContain("14:32");
    expect(dumped).not.toContain("40.7128");
    expect(dumped).not.toContain("-74.006");
    expect(dumped).not.toContain("private note");
    expect(dumped).not.toContain("jane@galaxia.test");
    expect(dumped).not.toContain("What does her Moon mean?");
    expect(dumped).toContain(REDACTED);
  });

  it("redacts a person id from a handled error on /app/person/[id]", async () => {
    const envelopes: unknown[] = [];
    const sentEvents: ScrubbableEvent[] = [];
    const personId = "550e8400-e29b-41d4-a716-446655440000";

    Sentry.init({
      dsn: "https://publickey@o0.ingest.sentry.io/1",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        const scrubbed = scrubSentryEvent(event as unknown as ScrubbableEvent);
        sentEvents.push(scrubbed);
        return scrubbed as unknown as typeof event;
      },
      transport: () => ({
        send(envelope) {
          envelopes.push(envelope);
          return Promise.resolve({});
        },
        flush: async () => true
      })
    });

    Sentry.withScope((scope) => {
      scope.setTag("url", `/app/person/${personId}`);
      scope.setExtra("href", `https://galaxiamea.com/app/person/${personId}`);
      scope.setContext("nextjs", { route: `/app/person/${personId}` });
      scope.addEventProcessor((event) => {
        event.transaction = `GET /app/person/${personId}`;
        event.request = {
          url: `https://galaxiamea.com/app/person/${personId}?threadId=${personId}`,
          query_string: `threadId=${personId}`,
          data: { personId },
          headers: { Referer: `https://galaxiamea.com/app/person/${personId}` }
        };
        event.breadcrumbs = [
          {
            category: "navigation",
            data: { from: "/app", to: `/app/person/${personId}` }
          }
        ];
        return event;
      });
      Sentry.captureException(new Error("handled person-detail error"));
    });

    await Sentry.flush(2000);

    expect(envelopes.length).toBeGreaterThan(0);
    expect(sentEvents.length).toBeGreaterThan(0);
    const payload = sentEvents[0];
    const dumped = JSON.stringify({ event: payload, envelope: envelopes });
    expect(dumped).toContain("handled person-detail error");
    expect(dumped).not.toContain(personId);
    expect(payload.request?.url).toBe(`https://galaxiamea.com/app/person/${REDACTED}`);
    expect(payload.request?.query_string).toBeUndefined();
    expect(payload.request?.data).toBe(REDACTED);
    expect(payload.transaction).toBe(`GET /app/person/${REDACTED}`);
    expect(payload.tags?.url).toBe(`/app/person/${REDACTED}`);
    expect(payload.extra?.href).toBe(`https://galaxiamea.com/app/person/${REDACTED}`);
    expect((payload.contexts?.nextjs as { route: string }).route).toBe(`/app/person/${REDACTED}`);
    expect(payload.breadcrumbs?.[0]?.data).toEqual({
      from: "/app",
      to: `/app/person/${REDACTED}`
    });
  });
});
