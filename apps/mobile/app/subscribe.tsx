import { tokens } from "@galaxia/ui";
import { Redirect } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { siteUrlFor } from "../src/lib/env";
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

  // This screen's whole job is to send the person to the web, so it is the
  // first consumer of EXPO_PUBLIC_SITE_URL. A build without that variable gets
  // no link at all rather than one pointing at a guessed host (ENGINEERING.md
  // §12), and the failure is logged naming the variable (§6).
  const webLink = useMemo<{ url: string } | { error: string }>(() => {
    try {
      return { url: siteUrlFor("subscribe") };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, []);

  useEffect(() => {
    if ("error" in webLink) {
      console.error(`[paywall] cannot build the web link: ${webLink.error}`);
    }
  }, [webLink]);

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

  const body =
    status === "trialing" && trialDaysLeft === 0
      ? "Your trial has ended. Everything you've built is still here: every chart, every note, every constellation. Continue on the web whenever you're ready."
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
      {"url" in webLink ? (
        <Pressable
          onPress={() => void Linking.openURL(webLink.url)}
          style={{
            backgroundColor: tokens.colors.gold,
            borderRadius: 999,
            paddingVertical: 12
          }}
        >
                    <Text style={{ color: tokens.colors.ink, textAlign: "center", fontWeight: "700" }}>Open Galaxia on the web</Text>
        </Pressable>
      ) : (
        <Text style={{ color: tokens.colors.mist2, lineHeight: 22 }}>
          This build cannot open the web link for you. Visit Galaxia in your browser to continue.
        </Text>
      )}
      <Pressable
        onPress={() => void refresh()}
        style={
          "url" in webLink
            ? { borderWidth: 1, borderColor: tokens.colors.line, borderRadius: 999, paddingVertical: 12 }
            : { backgroundColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 12 }
        }
      >
        <Text
          style={{
            color: "url" in webLink ? tokens.colors.cream : tokens.colors.ink,
            textAlign: "center",
            fontWeight: "700"
          }}
        >
          I continued: refresh
        </Text>
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
