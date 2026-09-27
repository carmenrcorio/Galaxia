import {
  SHARED_WEEK_COMPACT_INTRO,
  SHARED_WEEK_EMPTY,
  SHARED_WEEK_FULL_INTRO,
  sharedWeekEmptyMessage,
  type SharedWeekCardModel,
} from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { fonts } from "../lib/typography";
import { GlassCard } from "./glass";
import { InitialAvatar } from "./initial-avatar";

export const THIS_WEEK_HOME_LIMIT = 3;

export const RELATIONAL_TRANSIT_FEED_LOADING = "Checking this week's shared transits.";
export const RELATIONAL_TRANSIT_FEED_ERROR =
  "This week's shared transits could not load. Try again.";
export const RELATIONAL_TRANSIT_FEED_RETRY = "Try again";
export const RELATIONAL_TRANSIT_FEED_OFF =
  "This week alerts are off. Turn them on in Settings to see shared transits.";
export const RELATIONAL_TRANSIT_FEED_EMPTY = SHARED_WEEK_EMPTY;
export const RELATIONAL_TRANSIT_FEED_EMPTY_TODAY = "See today's sky for each person";
export const RELATIONAL_TRANSIT_FEED_SEE_ALL = "See the full feed";
export const RELATIONAL_TRANSIT_FEED_COMPACT_INTRO = SHARED_WEEK_COMPACT_INTRO;

export function formatRelationalTransitQuietDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function relationalTransitFeedEmptyMessage(nextDateISO: string | null): string {
  if (!nextDateISO) return sharedWeekEmptyMessage(null);
  const label = formatRelationalTransitQuietDate(nextDateISO);
  if (!label) return sharedWeekEmptyMessage(null);
  return sharedWeekEmptyMessage(label);
}

const titleStyle = {
  color: tokens.colors.cream,
  fontFamily: fonts.frauncesSemi,
  fontSize: 18,
};

const bodyStyle = {
  color: tokens.colors.mist,
  fontFamily: fonts.inter,
  lineHeight: 20,
  fontSize: 14,
};

const linkStyle = {
  color: tokens.colors.goldSoft,
  fontSize: 13,
  fontFamily: fonts.interSemi,
};

export function ThisWeekCard({
  loading,
  preference,
  cards,
  nextDateISO,
  emptyMessage,
  compact,
  onSeeToday,
  personChip,
  error,
  onRetry,
}: {
  loading: boolean;
  preference: "all" | "major_only" | "off";
  cards: SharedWeekCardModel[];
  nextDateISO: string | null;
  emptyMessage?: string;
  compact: boolean;
  onSeeToday?: () => void;
  /** Sun + memorial from the people row — chips never invent a local color. */
  personChip?: Record<string, { sunSign?: string | null; memorial?: boolean }>;
  error?: boolean;
  onRetry?: () => void;
}) {
  const shown = cards.slice(0, THIS_WEEK_HOME_LIMIT);
  const pad = compact ? 10 : 12;

  if (loading) {
    return (
      <GlassCard padding={pad} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{RELATIONAL_TRANSIT_FEED_LOADING}</Text>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard padding={pad} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{RELATIONAL_TRANSIT_FEED_ERROR}</Text>
        {onRetry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={RELATIONAL_TRANSIT_FEED_RETRY} onPress={onRetry}>
            <Text style={linkStyle}>{RELATIONAL_TRANSIT_FEED_RETRY}</Text>
          </Pressable>
        ) : null}
      </GlassCard>
    );
  }

  if (preference === "off") {
    return (
      <GlassCard padding={pad} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{RELATIONAL_TRANSIT_FEED_OFF}</Text>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="Open settings">
            <Text style={linkStyle}>Settings</Text>
          </Pressable>
        </Link>
      </GlassCard>
    );
  }

  if (cards.length === 0) {
    return (
      <GlassCard padding={pad} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{emptyMessage ?? relationalTransitFeedEmptyMessage(nextDateISO)}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel={RELATIONAL_TRANSIT_FEED_EMPTY_TODAY} onPress={onSeeToday}>
          <Text style={linkStyle}>{RELATIONAL_TRANSIT_FEED_EMPTY_TODAY}</Text>
        </Pressable>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding={pad} testID="this-week-card">
      <Text style={titleStyle}>This week</Text>
      <Text style={{ color: tokens.colors.mist2, fontSize: compact ? 12 : 13, lineHeight: 17, fontFamily: fonts.inter }}>
        {compact ? SHARED_WEEK_COMPACT_INTRO : SHARED_WEEK_FULL_INTRO}
      </Text>
      {shown.map((row) => {
        return (
          <View
            key={row.id}
            style={{
              paddingVertical: compact ? 6 : 8,
              paddingHorizontal: 10,
              borderRadius: 10,
              borderLeftWidth: 2,
              borderLeftColor: tokens.colors.goldSoft,
              backgroundColor: "rgba(230,174,108,0.06)",
              gap: 2,
            }}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {row.people.map((p) => (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <InitialAvatar
                    name={p.name}
                    size="sm"
                    personId={p.id}
                    sunSign={personChip?.[p.id]?.sunSign}
                    memorial={personChip?.[p.id]?.memorial}
                  />
                  <Text style={{ color: tokens.colors.cream, fontFamily: fonts.interSemi, fontSize: compact ? 13 : 14 }}>{p.name}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: tokens.colors.mist, fontSize: compact ? 12 : 13, lineHeight: 17, fontFamily: fonts.inter }}>{row.lead}</Text>
            {compact ? null : (
              <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 18, fontFamily: fonts.inter }}>{row.body}</Text>
            )}
          </View>
        );
      })}
      {compact ? (
        <Link href="/this-week" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={RELATIONAL_TRANSIT_FEED_SEE_ALL}>
            <Text style={linkStyle}>
              {RELATIONAL_TRANSIT_FEED_SEE_ALL}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </GlassCard>
  );
}
