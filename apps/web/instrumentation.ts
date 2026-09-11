/**
 * Next.js instrumentation hook (Node + Edge). Loads Sentry when a DSN is
 * set; otherwise `register` is a no-op. `onRequestError` is always
 * exported so Next can hook it; the SDK drops events until `init` runs.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) return;
  const { initMonitoring } = await import("./lib/monitoring/init");
  initMonitoring();
}

export const onRequestError = Sentry.captureRequestError;
