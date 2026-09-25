import {
  findNextRelationalTransitDate,
  MAJOR_RELATIONAL_TRANSIT_BODIES,
  type NatalChart,
  type Precision,
  type RelationalTransitPersonInput,
} from "@galaxia/astro";
import { DEFAULT_FETCH_TIMEOUT_MS, peopleForThisWeek, passedPersonIds, sunSignFromChart, thisWeekRowsFromStored, withTimeout } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { ThisWeekCard, type ThisWeekRow } from "../../src/components/this-week-card";
import { screenFill } from "../../src/lib/screen";
import { supabase } from "../../src/lib/supabase";
import { fonts } from "../../src/lib/typography";
import { useAuth } from "../../src/providers/auth-provider";

export default function ThisWeekScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preference, setPreference] = useState<"all" | "major_only" | "off">("all");
  const [rows, setRows] = useState<ThisWeekRow[]>([]);
  const [nextDateISO, setNextDateISO] = useState<string | null>(null);
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
      const [{ data: profile }, { data: transitRows }, { data: peopleRows }, { data: upcomingRows }] = await Promise.all([
        supabase.from("profiles").select("relational_transit_alerts").eq("id", ownerId).maybeSingle(),
        supabase
          .from("relational_transits")
          .select("id, transit_body, aspect_type, affected_profiles")
          .eq("owner_id", ownerId)
          .lte("active_from", nowISO)
          .gte("active_to", nowISO)
          .order("active_from", { ascending: true })
          .limit(20),
        supabase.from("people").select("id, display_name, birth_date, birth_precision, is_self, passed_at").eq("owner_id", ownerId),
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
        is_self: boolean;
        birth_date: string | null;
        birth_precision: Precision | "none" | null;
        passed_at?: string | null;
      }>;
      const memorialIds = passedPersonIds(peopleList);
      const livingTransits = thisWeekRowsFromStored((transitRows ?? []) as ThisWeekRow[], memorialIds);
      const visible =
        pref === "off"
          ? []
          : pref === "major_only"
            ? livingTransits.filter((row) => MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body))
            : livingTransits;
      setRows(visible);

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

      const upcoming = thisWeekRowsFromStored(
        (upcomingRows ?? []) as Array<{ active_from: string; transit_body: ThisWeekRow["transit_body"]; affected_profiles: ThisWeekRow["affected_profiles"] }>,
        memorialIds
      ).filter((row) =>
        pref === "off" ? false : pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body) : true
      );
      let nextISO: string | null = upcoming[0]?.active_from ?? null;
      if (!nextISO && visible.length === 0 && pref !== "off") {
        if (ids.length >= 2) {
          const inputs: RelationalTransitPersonInput[] = [];
          for (const raw of livingPeople) {
            const chart = chartById.get(raw.id);
            if (!chart) continue;
            inputs.push({
              id: raw.id,
              name: raw.display_name ?? (raw.is_self ? "You" : "Someone"),
              chart,
              birthDate: raw.birth_date,
              birthPrecision: raw.birth_precision,
            });
          }
          if (inputs.length >= 2) {
            nextISO = findNextRelationalTransitDate(inputs, nowISO, {
              horizonDays: 56,
              stepDays: 7,
              bodies: pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES : undefined,
            });
          }
        }
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
        Every slow-moving transit currently pulling on two or more people in your circle at once.
      </Text>
      <ThisWeekCard
        loading={loading}
        error={loadError}
        onRetry={() => setReload((n) => n + 1)}
        preference={preference}
        rows={rows}
        nextDateISO={nextDateISO}
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
