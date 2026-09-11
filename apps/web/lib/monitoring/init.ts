/**
 * Sentry initialisation. A no-op when neither `NEXT_PUBLIC_SENTRY_DSN`
 * nor `SENTRY_DSN` is set — monitoring is opt-in, never a boot failure.
 *
 * Does not wrap `next.config.mjs` (ENGINEERING.md §2). Server errors
 * arrive via `instrumentation.ts` `onRequestError`; client errors via
 * `instrumentation-client.ts` plus `app/global-error.tsx`.
 */
import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent, type ScrubbableEvent } from "./scrub";

export function getSentryDsn(): string {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "";
}

export function initMonitoring(): boolean {
  const dsn = getSentryDsn();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    // Exceptions only. Traces include URLs; session replay would record
    // birth-data forms. Neither is enabled.
    tracesSampleRate: 0,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV,
    integrations(integrations) {
      return integrations.filter((integration) => {
        const name = integration.name;
        // Local variables and request bodies are how birth data would leak
        // from /api/quick-chart. ContextLines attaches nearby source, which
        // can include fixture values in tests and logged payloads in app code.
        return (
          name !== "LocalVariables" &&
          name !== "LocalVariablesAsync" &&
          name !== "RequestData" &&
          name !== "ContextLines"
        );
      });
    },
    beforeSend(event) {
      return scrubSentryEvent(event as unknown as ScrubbableEvent) as unknown as typeof event;
    },
    beforeSendTransaction(event) {
      return scrubSentryEvent(event as unknown as ScrubbableEvent) as unknown as typeof event;
    }
  });
  return true;
}
