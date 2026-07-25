/**
 * Pure resolver for the mobile authed route-group guard and the public `/`
 * entry. Kept free of React so vitest can assert redirect targets without
 * mounting Expo Router.
 */

export type AuthedGateResult =
  | { type: "loading" }
  | { type: "redirect"; href: "/" | "/subscribe" }
  | { type: "allow" };

export type PublicIndexGateResult =
  | { type: "loading" }
  | { type: "redirect"; href: "/home" | "/subscribe" }
  | { type: "show-sign-in" };

export function resolveAuthedRouteGate(input: {
  authLoading: boolean;
  sessionPresent: boolean;
  entitlementLoading: boolean;
  hasAccess: boolean;
}): AuthedGateResult {
  if (input.authLoading) return { type: "loading" };
  if (!input.sessionPresent) return { type: "redirect", href: "/" };
  if (input.entitlementLoading) return { type: "loading" };
  if (!input.hasAccess) return { type: "redirect", href: "/subscribe" };
  return { type: "allow" };
}

export function resolvePublicIndexGate(input: {
  authLoading: boolean;
  sessionPresent: boolean;
  entitlementLoading: boolean;
  hasAccess: boolean;
}): PublicIndexGateResult {
  if (input.authLoading) return { type: "loading" };
  if (!input.sessionPresent) return { type: "show-sign-in" };
  if (input.entitlementLoading) return { type: "loading" };
  if (!input.hasAccess) return { type: "redirect", href: "/subscribe" };
  return { type: "redirect", href: "/home" };
}
