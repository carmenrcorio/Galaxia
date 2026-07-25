import { tokens } from "@galaxia/ui";
import { Redirect } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAuth } from "../src/providers/auth-provider";
import { useEntitlement } from "../src/providers/entitlement-provider";

/**
 * Paywall / continue surface for signed-in users without access.
 * Outside the `(app)` entitlement gate so the lockout has somewhere to land.
 * Billing is web-first (mobile not store-deployed yet).
 */
export default function SubscribeScreen() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { hasAccess, loading: entitlementLoading, status, trialDaysLeft, refresh } = useEntitlement();

  if (authLoading || (session && entitlementLoading)) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.ink, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={tokens.colors.gold} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  if (hasAccess) {
    return <Redirect href="/home" />;
  }

  // FOUNDER-REVIEW: authored — mobile paywall when trial/subscription ended.
  const body =
    status === "trialing" && trialDaysLeft === 0
      ? "Your trial has ended. Everything you've built is still here — every chart, every note, every constellation. Continue on the web whenever you're ready."
      : "Access is paused on this account. Everything you've built is still here. Continue on the web to keep using Galaxia.";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.ink,
        paddingHorizontal: 20,
        justifyContent: "center",
        gap: 14
      }}
    >
      <Text style={{ color: tokens.colors.goldSoft, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
        KEEP YOUR GALAXY
      </Text>
      <Text style={{ color: tokens.colors.cream, fontSize: 30, fontWeight: "700" }}>Continue on the web</Text>
      <Text style={{ color: tokens.colors.mist, lineHeight: 22 }}>{body}</Text>
      <Pressable
        onPress={() => void refresh()}
        style={{
          backgroundColor: tokens.colors.gold,
          borderRadius: 999,
          paddingVertical: 12
        }}
      >
        <Text style={{ color: tokens.colors.ink, textAlign: "center", fontWeight: "700" }}>I continued — refresh</Text>
      </Pressable>
      <Pressable
        onPress={() => void signOut()}
        style={{
          borderWidth: 1,
          borderColor: tokens.colors.line,
          borderRadius: 999,
          paddingVertical: 12
        }}
      >
        <Text style={{ color: tokens.colors.cream, textAlign: "center", fontWeight: "700" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
