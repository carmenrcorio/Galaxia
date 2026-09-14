import { createHmac, timingSafeEqual } from "node:crypto";

const TIMESTAMP_TOLERANCE_SEC = 300;

export type ResendWebhookEventType = "email.opened" | "email.clicked" | string;

export interface ResendWebhookEvent {
  type: ResendWebhookEventType;
  data?: { email_id?: unknown };
}

/**
 * Svix signature check used by Resend webhooks. Fails closed on missing
 * headers, a stale timestamp, or any signature that does not match.
 */
export function verifyResendWebhookSignature(
  payload: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(nowSec - timestamp) > TIMESTAMP_TOLERANCE_SEC) return false;

  const key = secret.startsWith("whsec_") ? Buffer.from(secret.slice(6), "base64") : Buffer.from(secret, "utf8");
  const signed = `${headers.id}.${headers.timestamp}.${payload}`;
  const expected = createHmac("sha256", key).update(toBytes(signed)).digest();

  for (const part of headers.signature.split(" ")) {
    const comma = part.indexOf(",");
    if (comma < 0) continue;
    const version = part.slice(0, comma);
    const sig = part.slice(comma + 1);
    if (version !== "v1" || !sig) continue;
    const provided = Buffer.from(sig, "base64");
    if (provided.length !== expected.length) continue;
    if (timingSafeEqual(provided, expected)) return true;
  }
  return false;
}

function toBytes(value: string): Buffer {
  return Buffer.from(value, "utf8");
}

export function resendEmailIdFromEvent(event: ResendWebhookEvent | null | undefined): string | null {
  const id = event?.data?.email_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
