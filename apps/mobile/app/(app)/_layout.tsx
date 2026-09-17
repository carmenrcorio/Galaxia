import { tokens } from "@galaxia/ui";
import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { CosmicBackground } from "../../src/components/cosmic-background";
import { TrialBanner } from "../../src/components/trial-banner";
import { resolveAuthedRouteGate } from "../../src/lib/authed-route-gate";
import { registerForPushNotificationsAsync } from "../../src/lib/push-notifications";
import { useAccessibilitySettings } from "../../src/providers/accessibility-provider";
import { useAuth } from "../../src/providers/auth-provider";
import { useEntitlement } from "../../src/providers/entitlement-provider";

export const unstable_settings = {
  initialRouteName: "(tabs)"
};

/**
 * Structural lockout for the whole authed tree. Session + hasAccess are decided
 * here once — not by per-screen render hiding. There is one product; screens
 * do not re-gate on a plan name. CosmicBackground + TrialBanner wrap the
 * stack so every authed surface sits on the same night sky as web `/app`.
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

  if (gate.type === "redirect") {
    return <Redirect href={gate.href} />;
  }

  if (gate.type === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.ink, justifyContent: "center", alignItems: "center" }}>
        <CosmicBackground />
        <ActivityIndicator color={tokens.colors.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.ink }}>
      <CosmicBackground />
      <View style={{ flex: 1, zIndex: 1 }}>
        <TrialBanner />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reduceMotion ? "none" : "fade",
            contentStyle: { backgroundColor: "transparent" }
          }}
        />
      </View>
    </View>
  );
}
