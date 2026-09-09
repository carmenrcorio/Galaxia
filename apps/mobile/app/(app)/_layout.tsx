import { tokens } from "@galaxia/ui";
import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { resolveAuthedRouteGate } from "../../src/lib/authed-route-gate";
import { registerForPushNotificationsAsync } from "../../src/lib/push-notifications";
import { useAccessibilitySettings } from "../../src/providers/accessibility-provider";
import { useAuth } from "../../src/providers/auth-provider";
import { useEntitlement } from "../../src/providers/entitlement-provider";

/**
 * Structural lockout for the whole authed tree. Session + hasAccess are decided
 * here once — not by per-screen render hiding. Soft feature banners (e.g.
 * canUseGroups) stay on individual screens.
 */
export default function AuthedLayout() {
  const { session, loading: authLoading } = useAuth();
  const { hasAccess, loading: entitlementLoading } = useEntitlement();
  const { reduceMotion } = useAccessibilitySettings();

  // Best-effort, fire-and-forget (Feature 3 push alerts) — see
  // push-notifications.ts for the untested-on-device caveat. Registers once
  // per authed session, never blocks the route gate above.
  useEffect(() => {
    if (!session?.user.id) return;
    void registerForPushNotificationsAsync(session.user.id);
  }, [session?.user.id]);

  const gate = resolveAuthedRouteGate({
    authLoading,
    sessionPresent: Boolean(session),
    entitlementLoading,
    hasAccess
  });

  if (gate.type === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.ink, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={tokens.colors.gold} />
      </View>
    );
  }

  if (gate.type === "redirect") {
    return <Redirect href={gate.href} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? "none" : "fade"
      }}
    />
  );
}
