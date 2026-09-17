const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Access token from `Authorization: Bearer <jwt>`. Null when the header is
 * missing or not a Bearer token. Cookie sessions do not send this header.
 */
export function accessTokenFromAuthorizationHeader(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = BEARER.exec(header.trim());
  return match?.[1] ?? null;
}
