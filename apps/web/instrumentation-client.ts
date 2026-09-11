/**
 * Client-side Sentry init. Runs before the app hydrates. No-op when
 * `NEXT_PUBLIC_SENTRY_DSN` is unset (the server-only `SENTRY_DSN` is not
 * inlined into the browser bundle).
 */
import { initMonitoring } from "./lib/monitoring/init";

initMonitoring();
