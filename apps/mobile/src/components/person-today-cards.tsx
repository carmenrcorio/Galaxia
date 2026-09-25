import type { PersonDailyNudgeRecord } from "@galaxia/astro";
import {
  ASPECT_GLYPH,
  BODY_GLYPH,
  DAILY_SKY_UNAVAILABLE_YEAR_BODY,
  DAILY_SKY_UNAVAILABLE_YEAR_FOLLOW_UP,
  PERSON_TAB_LABEL,
  PERSON_TAB_VOCAB,
  shouldShowLiveTransits
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { fonts } from "../lib/typography";
import type { PersonDepthRow } from "../lib/person-row";
import { GlassCard, Pill } from "./glass";

export type VelaPinRow = {
  id: string;
  body: string;
  created_at: string;
};

function titleCase(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value;
}

export function PersonTodayCards({
  person,
  dailyNudge,
  velaPins,
  showRemembrance,
  onUpgrade,
  includeRightNow = true,
  includeVela = true
}: {
  person: PersonDepthRow;
  dailyNudge: PersonDailyNudgeRecord | null;
  velaPins: VelaPinRow[];
  showRemembrance: boolean;
  onUpgrade?: () => void;
  includeRightNow?: boolean;
  includeVela?: boolean;
}) {
  const showActiveTodayNote =
    includeRightNow &&
    shouldShowLiveTransits(person) &&
    Boolean(dailyNudge && dailyNudge.copy_tier !== "empty_hedge" && dailyNudge.transit_body);
  const showActiveTodayPrecisionEmpty =
    includeRightNow &&
    shouldShowLiveTransits(person) && person.birth_precision === "year" && !showActiveTodayNote;
  const showVelaOnThem = includeVela && (!showRemembrance || velaPins.length > 0);

  if (!showActiveTodayNote && !showActiveTodayPrecisionEmpty && !showVelaOnThem) {
    return null;
  }

  return (
    <View testID="person-today" style={{ gap: 14 }}>
      {showActiveTodayNote && dailyNudge ? (
        <GlassCard
          style={{ borderColor: "rgba(230,174,108,0.28)" }}
          contentStyle={{ gap: 8 }}
        >
          <Text style={eyebrow}>{PERSON_TAB_LABEL["active-today"]}</Text>
          <Text style={vocab}>{PERSON_TAB_VOCAB["active-today"]}</Text>
          <Text style={{ color: tokens.colors.cream, fontSize: 15, lineHeight: 22 }}>
            {dailyNudge.copy_resolved}
          </Text>
          {dailyNudge.precision_mode === "exact" &&
          dailyNudge.transit_body &&
          dailyNudge.natal_body &&
          dailyNudge.aspect_type ? (
            <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
              <Text style={{ color: tokens.colors.goldSoft, fontFamily: fonts.zodiac }}>
                {BODY_GLYPH[dailyNudge.transit_body] ?? dailyNudge.transit_body}{" "}
                {ASPECT_GLYPH[dailyNudge.aspect_type] ?? ""}{" "}
                {BODY_GLYPH[dailyNudge.natal_body] ?? dailyNudge.natal_body}
              </Text>
              {"  "}
              {titleCase(dailyNudge.transit_body)} {dailyNudge.aspect_type} {titleCase(dailyNudge.natal_body)}
              {dailyNudge.orb_deg != null ? ` · ${dailyNudge.orb_deg.toFixed(1)}°` : ""}
              {dailyNudge.phase ? ` · ${dailyNudge.phase}` : ""}
            </Text>
          ) : null}
          <Link
            href={{
              pathname: "/vela",
              params: {
                subject: person.id,
                q: `How does today's ${dailyNudge.transit_body} ${dailyNudge.aspect_type} their natal ${dailyNudge.natal_body} affect us right now?`
              }
            }}
            asChild
          >
            <Pill accessibilityLabel="Ask Vela how this is showing up">Ask Vela how this is showing up</Pill>
          </Link>
        </GlassCard>
      ) : showActiveTodayPrecisionEmpty ? (
        <GlassCard contentStyle={{ gap: 8 }} style={{ borderStyle: "dashed", opacity: 0.85 }}>
          <Text style={eyebrow}>{PERSON_TAB_LABEL["active-today"]}</Text>
          <Text style={vocab}>{PERSON_TAB_VOCAB["active-today"]}</Text>
          <Text style={{ color: tokens.colors.mist, lineHeight: 20 }}>{DAILY_SKY_UNAVAILABLE_YEAR_BODY}</Text>
          <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
            {DAILY_SKY_UNAVAILABLE_YEAR_FOLLOW_UP}
          </Text>
          {onUpgrade ? (
            <Pressable
              onPress={onUpgrade}
              accessibilityRole="button"
              accessibilityLabel="Add a birth date"
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                borderWidth: 1,
                borderColor: tokens.colors.gold,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <Text style={{ color: tokens.colors.gold, fontFamily: fonts.interSemi }}>Add a birth date</Text>
            </Pressable>
          ) : null}
        </GlassCard>
      ) : null}

      {showVelaOnThem ? (
        <GlassCard style={{ borderColor: "rgba(183,154,216,0.2)" }} contentStyle={{ gap: 8 }}>
          <Text style={eyebrow}>{PERSON_TAB_LABEL["vela-on-them"]}</Text>
          <Text style={vocab}>{PERSON_TAB_VOCAB["vela-on-them"]}</Text>
          {velaPins.length > 0 ? (
            <View style={{ gap: 8 }}>
              {velaPins.slice(0, 5).map((pin) => (
                <View
                  key={pin.id}
                  style={{
                    borderLeftWidth: 2,
                    borderLeftColor: tokens.colors.air,
                    paddingLeft: 10,
                    gap: 4
                  }}
                >
                  <Text style={{ color: tokens.colors.cream, lineHeight: 20 }}>{pin.body}</Text>
                  <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>
                    {new Date(pin.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
              {!showRemembrance ? (
                <Link href={{ pathname: "/vela", params: { subject: person.id } }} asChild>
                  <Pill accessibilityLabel="Ask Vela more">Ask Vela more</Pill>
                </Link>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
                Nothing pinned yet. Ask Vela about {person.display_name}, then pin any insight worth keeping: it will live here.
              </Text>
              <Link href={{ pathname: "/vela", params: { subject: person.id } }} asChild>
                <Pill accessibilityLabel={`Ask Vela about ${person.display_name}`}>
                  Ask Vela about {person.display_name}
                </Pill>
              </Link>
            </View>
          )}
        </GlassCard>
      ) : null}
    </View>
  );
}

const eyebrow = {
  color: tokens.colors.cream,
  fontFamily: fonts.frauncesSemi,
  fontSize: 18
} as const;

const vocab = {
  color: tokens.colors.mist2,
  fontSize: 11,
  fontFamily: fonts.interSemi,
  letterSpacing: 1.4,
  textTransform: "uppercase" as const
};
