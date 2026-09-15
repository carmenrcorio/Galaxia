import {
  interpretRelationalTransitDynamicLead,
  interpretRelationalTransitPlanetNote,
  type AffectedProfileHit,
  type AspectType,
  type RelationalTransitBody,
} from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { InitialAvatar } from "./initial-avatar";

export interface ThisWeekRow {
  id: string;
  transit_body: RelationalTransitBody;
  aspect_type: AspectType;
  affected_profiles: Array<{
    profile_id: string;
    profile_name: string;
    natal_body: string;
    natal_sign: string;
    orb_deg: number;
    exact_at: string;
  }>;
}

export const THIS_WEEK_HOME_LIMIT = 3;

// FOUNDER-REVIEW: loading line while the feed is fetching.
export const RELATIONAL_TRANSIT_FEED_LOADING = "Checking this week's shared transits.";
// FOUNDER-REVIEW: the feed fetch failed or timed out.
export const RELATIONAL_TRANSIT_FEED_ERROR =
  "This week's shared transits could not load. Try again.";
// FOUNDER-REVIEW: retry after a feed load failure.
export const RELATIONAL_TRANSIT_FEED_RETRY = "Try again";
// FOUNDER-REVIEW: empty because the owner turned alerts off.
export const RELATIONAL_TRANSIT_FEED_OFF =
  "This week alerts are off. Turn them on in Settings to see shared transits.";
// FOUNDER-REVIEW: empty because no active overlapping transits, and no next date is computable.
export const RELATIONAL_TRANSIT_FEED_EMPTY =
  "Nothing is currently pulling on two people in your circle at once. The sky is quiet this week.";
// FOUNDER-REVIEW: next action when the week is quiet.
export const RELATIONAL_TRANSIT_FEED_EMPTY_TODAY = "See today's sky for each person";
// FOUNDER-REVIEW: link from the compact home card to the full feed.
export const RELATIONAL_TRANSIT_FEED_SEE_ALL = "See the full feed";
// FOUNDER-REVIEW: compact intro.
export const RELATIONAL_TRANSIT_FEED_COMPACT_INTRO =
  "What is pulling on two people in your circle at once.";

export function formatRelationalTransitQuietDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function relationalTransitFeedEmptyMessage(nextDateISO: string | null): string {
  if (!nextDateISO) return RELATIONAL_TRANSIT_FEED_EMPTY;
  const label = formatRelationalTransitQuietDate(nextDateISO);
  if (!label) return RELATIONAL_TRANSIT_FEED_EMPTY;
  // FOUNDER-REVIEW: empty with a real next window from stored rows or scanned geometry.
  return `Nothing is currently pulling on two people in your circle at once. The next shared pull begins around ${label}.`;
}

function toAffectedHits(row: ThisWeekRow): AffectedProfileHit[] {
  return row.affected_profiles.map((a) => ({
    personId: a.profile_id,
    personName: a.profile_name,
    natalBody: a.natal_body as AffectedProfileHit["natalBody"],
    natalSign: a.natal_sign as AffectedProfileHit["natalSign"],
    aspectType: row.aspect_type,
    orbDeg: a.orb_deg,
    exactAtUTC: a.exact_at,
  }));
}

const cardStyle = {
  backgroundColor: tokens.colors.ink3,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  padding: 12,
  gap: 8,
} as const;

export function ThisWeekCard({
  loading,
  preference,
  rows,
  nextDateISO,
  compact,
  onSeeToday,
  personChip,
  error,
  onRetry,
}: {
  loading: boolean;
  preference: "all" | "major_only" | "off";
  rows: ThisWeekRow[];
  nextDateISO: string | null;
  compact: boolean;
  onSeeToday?: () => void;
  /** Sun + memorial from the people row — chips never invent a local color. */
  personChip?: Record<string, { sunSign?: string | null; memorial?: boolean }>;
  error?: boolean;
  onRetry?: () => void;
}) {
  const shown = compact ? rows.slice(0, THIS_WEEK_HOME_LIMIT) : rows;
  const overflow = compact ? Math.max(0, rows.length - shown.length) : 0;

  if (loading) {
    return (
      <View style={cardStyle} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{RELATIONAL_TRANSIT_FEED_LOADING}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={cardStyle} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{RELATIONAL_TRANSIT_FEED_ERROR}</Text>
        {onRetry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={RELATIONAL_TRANSIT_FEED_RETRY} onPress={onRetry}>
            <Text style={linkStyle}>{RELATIONAL_TRANSIT_FEED_RETRY}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (preference === "off") {
    return (
      <View style={cardStyle} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{RELATIONAL_TRANSIT_FEED_OFF}</Text>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="Open settings">
            <Text style={linkStyle}>Settings</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={cardStyle} testID="this-week-card">
        <Text style={titleStyle}>This week</Text>
        <Text style={bodyStyle}>{relationalTransitFeedEmptyMessage(nextDateISO)}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel={RELATIONAL_TRANSIT_FEED_EMPTY_TODAY} onPress={onSeeToday}>
          <Text style={linkStyle}>{RELATIONAL_TRANSIT_FEED_EMPTY_TODAY}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[cardStyle, compact ? { padding: 10, gap: 6 } : null]} testID="this-week-card">
      <Text style={titleStyle}>This week</Text>
      <Text style={{ color: tokens.colors.mist2, fontSize: compact ? 12 : 13, lineHeight: 17 }}>
        {compact ? RELATIONAL_TRANSIT_FEED_COMPACT_INTRO : "Transits moving across more than one person in your constellation at once."}
      </Text>
      {shown.map((row) => {
        const affected = toAffectedHits(row);
        const dynamicLead = interpretRelationalTransitDynamicLead({ aspectType: row.aspect_type });
        const planetNote = interpretRelationalTransitPlanetNote({
          transitBody: row.transit_body,
          aspectType: row.aspect_type,
          affected,
        });
        const uniquePeople = Array.from(new Map(affected.map((a) => [a.personId, a])).values());
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
              {uniquePeople.map((p) => (
                <View key={p.personId} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <InitialAvatar
                    name={p.personName}
                    size="sm"
                    personId={p.personId}
                    sunSign={personChip?.[p.personId]?.sunSign}
                    memorial={personChip?.[p.personId]?.memorial}
                  />
                  <Text style={{ color: tokens.colors.cream, fontWeight: "700", fontSize: compact ? 13 : 14 }}>{p.personName}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: tokens.colors.mist, fontSize: compact ? 12 : 13, lineHeight: 17 }}>{dynamicLead}</Text>
            <Text style={{ color: tokens.colors.goldSoft, fontSize: 11 }}>{planetNote}</Text>
          </View>
        );
      })}
      {compact ? (
        <Link href="/this-week" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={RELATIONAL_TRANSIT_FEED_SEE_ALL}>
            <Text style={linkStyle}>
              {overflow > 0 ? `${RELATIONAL_TRANSIT_FEED_SEE_ALL} (${rows.length})` : RELATIONAL_TRANSIT_FEED_SEE_ALL}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const titleStyle = {
  color: tokens.colors.cream,
  fontWeight: "700" as const,
  fontSize: 18,
};

const bodyStyle = {
  color: tokens.colors.mist,
  lineHeight: 20,
  fontSize: 14,
};

const linkStyle = {
  color: tokens.colors.goldSoft,
  fontSize: 13,
  fontWeight: "600" as const,
};
