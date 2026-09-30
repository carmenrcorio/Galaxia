import {
  buildSharedWeekFeed,
  findNextSharedWeekDate,
  MAJOR_RELATIONAL_TRANSIT_BODIES,
  SHARED_WEEK_PAGE_INTRO,
  SHARED_WEEK_QUIET_REPEAT,
  WEEKLY_FEED_LIMIT,
  toSharedWeekCardModel,
  type RelationalTransitBody,
  type NatalChart,
  type Precision,
  type SharedTransitPersonInput,
  type SharedWeekCardModel,
} from "@galaxia/astro";
import { DEFAULT_FETCH_TIMEOUT_MS, isMinorForSafety, peopleForThisWeek, passedPersonIds, sunSignFromChart, thisWeekRowsFromStored, withTimeout } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { ThisWeekCard } from "../../src/components/this-week-card";
import { screenFill } from "../../src/lib/screen";
import { supabase } from "../../src/lib/supabase";
import { readShownSharedTransits, rememberShownSharedTransits } from "../../src/lib/this-week-seen";
import { fonts } from "../../src/lib/typography";
import { useAuth } from "../../src/providers/auth-provider";

export default function ThisWeekScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preference, setPreference] = useState<"all" | "major_only" | "off">("all");
  const [cards, setCards] = useState<SharedWeekCardModel[]>([]);
  const [nextDateISO, setNextDateISO] = useState<string | null>(null);
  const [quietRepeat, setQuietRepeat] = useState(false);
  const [personChip, setPersonChip] = useState<Record<string, { sunSign?: string | null; memorial?: boolean }>>({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!session?.user.id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        await withTimeout((async () => {
      const ownerId = session.user.id;
      const nowISO = new Date().toISOString();
      const [{ data: profile }, { data: peopleRows }, { data: upcomingRows }] = await Promise.all([
        supabase.from("profiles").select("relational_transit_alerts").eq("id", ownerId).maybeSingle(),
        supabase.from("people").select("id, display_name, relation, birth_date, birth_precision, is_self, is_minor, passed_at").eq("owner_id", ownerId),
        supabase
          .from("relational_transits")
          .select("active_from, transit_body, affected_profiles")
          .eq("owner_id", ownerId)
          .gt("active_from", nowISO)
          .order("active_from", { ascending: true })
          .limit(8),
      ]);
      const pref = ((profile as { relational_transit_alerts?: string | null } | null)?.relational_transit_alerts ?? "all") as "all" | "major_only" | "off";
      setPreference(pref === "major_only" || pref === "off" ? pref : "all");
      const peopleList = (peopleRows ?? []) as Array<{
        id: string;
        display_name: string;
        relation?: string | null;
        is_self: boolean;
        birth_date: string | null;
        birth_precision: Precision | "none" | null;
        is_minor?: boolean | null;
        passed_at?: string | null;
      }>;
      const memorialIds = passedPersonIds(peopleList);
      const livingPeople = peopleForThisWeek(peopleList);
      const ids = livingPeople.map((p) => p.id);
      const chip: Record<string, { sunSign?: string | null; memorial?: boolean }> = {};
      for (const p of peopleList) chip[p.id] = { memorial: Boolean(p.passed_at) };
      let chartById = new Map<string, NatalChart>();
      if (ids.length) {
        const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", ids);
        chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));
        for (const [id, chart] of chartById) {
          chip[id] = { ...chip[id], sunSign: sunSignFromChart(chart) };
        }
      }
      setPersonChip(chip);

      const bodies = pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES : undefined;
      const inputs: SharedTransitPersonInput[] = [];
      for (const raw of livingPeople) {
        const chart = chartById.get(raw.id);
        if (!chart) continue;
        inputs.push({
          id: raw.id,
          name: raw.display_name ?? (raw.is_self ? "You" : "Someone"),
          chart,
          birthDate: raw.birth_date,
          birthPrecision: raw.birth_precision,
          relation: raw.relation,
          isSelf: raw.is_self,
          isMinor: isMinorForSafety({
            isMinor: raw.is_minor,
            birthDate: raw.birth_date,
            birthPrecision: raw.birth_precision,
          }),
        });
      }
      const seen = await readShownSharedTransits(ownerId);
      const feed = pref === "off" || inputs.length < 2
        ? null
        : buildSharedWeekFeed(inputs, nowISO, { bodies, previouslyShown: seen, limit: WEEKLY_FEED_LIMIT });
      const weekly = feed?.weekly ?? [];
      const repeating = weekly.length === 0 && (feed?.relational.length ?? 0) > 0;
      if (pref !== "off") await rememberShownSharedTransits(ownerId, weekly, nowISO.slice(0, 10));
      setCards(weekly.map((event) => toSharedWeekCardModel(event, nowISO)));
      setQuietRepeat(repeating);

      const upcoming = thisWeekRowsFromStored(
        (upcomingRows ?? []) as Array<{ active_from: string; transit_body: RelationalTransitBody; affected_profiles: Array<{ profile_id: string }> }>,
        memorialIds
      ).filter((row) =>
        pref === "off" ? false : pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body) : true
      );
      let nextISO: string | null = weekly.length > 0 || repeating ? null : upcoming[0]?.active_from ?? null;
      if (!nextISO && weekly.length === 0 && !repeating && pref !== "off" && inputs.length >= 2) {
        nextISO = findNextSharedWeekDate(inputs, nowISO, { horizonDays: 28, stepDays: 7, bodies });
      }
      setNextDateISO(nextISO);
        })(), DEFAULT_FETCH_TIMEOUT_MS);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user.id, reload]);

  return (
    <ScrollView style={screenFill} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
            <Text style={{ color: tokens.colors.cream, fontSize: 28, fontFamily: fonts.frauncesSemi }}>Shared transits</Text>
            <Text style={{ color: tokens.colors.mist, lineHeight: 21, fontFamily: fonts.inter }}>
        {SHARED_WEEK_PAGE_INTRO}
      </Text>
      <ThisWeekCard
        loading={loading}
        error={loadError}
        onRetry={() => setReload((n) => n + 1)}
        preference={preference}
        cards={cards}
        nextDateISO={nextDateISO}
        emptyMessage={quietRepeat ? SHARED_WEEK_QUIET_REPEAT : undefined}
        compact={false}
        personChip={personChip}
      />
      <Link href="/home" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Back to home">
                    <Text style={{ color: tokens.colors.goldSoft, fontWeight: "600" }}>Back to home</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
