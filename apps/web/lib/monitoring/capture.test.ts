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
});
