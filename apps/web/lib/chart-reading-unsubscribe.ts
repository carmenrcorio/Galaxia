import { createHmac } from "node:crypto";

const TOKEN_MAC_LEN = 22;

export function chartReadingUnsubscribeToken(email: string, secret: string): string {
  const payload = Buffer.from(email, "utf8").toString("base64url");
  const mac = createHmac("sha256", secret).update(email).digest("base64url").slice(0, TOKEN_MAC_LEN);
  return `${payload}.${mac}`;
}

export function emailFromChartReadingUnsubscribeToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email || !email.includes("@")) return null;
  const expected = createHmac("sha256", secret).update(email).digest("base64url").slice(0, TOKEN_MAC_LEN);
  if (mac.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0 ? email : null;
}

export function chartReadingUnsubscribeUrl(siteUrl: string, email: string, secret: string): string {
  const origin = siteUrl.replace(/\/$/, "");
  return `${origin}/api/blog/chart-reading-unsubscribe?token=${encodeURIComponent(chartReadingUnsubscribeToken(email, secret))}`;
}
