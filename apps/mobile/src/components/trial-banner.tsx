import { trialDaysRemaining } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { fonts } from "../lib/typography";
import { useEntitlement } from "../providers/entitlement-provider";

/**
 * Calm, non-urgent trial banner. Twin of `apps/web/components/trial-banner.tsx`.
 * Reads entitlement fields already on the provider (no second profiles fetch).
 * Shows only while trialing and not comped. Link goes to `/subscribe` (D1:
 * manage on the web; not an in-app purchase CTA).
 */
export function TrialBanner() {
  const { status, trialEndsAt, comped } = useEntitlement();
  if (comped || status !== "trialing" || !trialEndsAt) return null;
  const ends = new Date(trialEndsAt);
  if (Number.isNaN(ends.getTime())) return null;
  const daysLeft = trialDaysRemaining(trialEndsAt);
  const dateLabel = ends.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <View
      style={{
        backgroundColor: "rgba(183,154,216,0.08)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(183,154,216,0.16)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 12
      }}
    >
      <Text style={{ color: tokens.colors.mist, fontFamily: fonts.inter, fontSize: 13 }}>
        Trial ends {dateLabel}
        {daysLeft > 0 ? ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : ""}
      </Text>
      <Link href="/subscribe" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Continue with Galaxia">
          <Text style={{ color: tokens.colors.goldSoft, fontFamily: fonts.interSemi, fontSize: 13 }}>
            Continue with Galaxia →
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
