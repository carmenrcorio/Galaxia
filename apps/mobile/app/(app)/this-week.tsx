import {
  findNextRelationalTransitDate,
  MAJOR_RELATIONAL_TRANSIT_BODIES,
  type NatalChart,
  type Precision,
  type RelationalTransitPersonInput,
} from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { ThisWeekCard, type ThisWeekRow } from "../../src/components/this-week-card";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/auth-provider";

export default function ThisWeekScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preference, setPreference] = useState<"all" | "major_only" | "off">("all");
  const [rows, setRows] = useState<ThisWeekRow[]>([]);
  const [nextDateISO, setNextDateISO] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    void (async () => {
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
        supabase.from("people").select("id, display_name, birth_date, birth_precision, is_self").eq("owner_id", ownerId),
        supabase
          .from("relational_transits")
          .select("active_from, transit_body")
          .eq("owner_id", ownerId)
          .gt("active_from", nowISO)
          .order("active_from", { ascending: true })
          .limit(8),
      ]);
      const pref = ((profile as { relational_transit_alerts?: string | null } | null)?.relational_transit_alerts ?? "all") as "all" | "major_only" | "off";
      setPreference(pref === "major_only" || pref === "off" ? pref : "all");
      const allTransits = (transitRows ?? []) as ThisWeekRow[];
      const visible =
        pref === "off"
          ? []
          : pref === "major_only"
            ? allTransits.filter((row) => MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body))
            : allTransits;
      setRows(visible);

      const upcoming = ((upcomingRows ?? []) as Array<{ active_from: string; transit_body: ThisWeekRow["transit_body"] }>).filter((row) =>
        pref === "off" ? false : pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body) : true
      );
      let nextISO: string | null = upcoming[0]?.active_from ?? null;
      if (!nextISO && visible.length === 0 && pref !== "off") {
        const ids = ((peopleRows ?? []) as Array<{ id: string }>).map((p) => p.id);
        if (ids.length >= 2) {
          const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", ids);
          const chartById = new Map<string, NatalChart>((chartRows ?? []).map((r) => [r.person_id as string, r.data as NatalChart]));
          const inputs: RelationalTransitPersonInput[] = [];
          for (const raw of (peopleRows ?? []) as Array<{
            id: string;
            display_name: string;
            is_self: boolean;
            birth_date: string | null;
            birth_precision: Precision | "none" | null;
          }>) {
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
      setLoading(false);
    })();
  }, [session?.user.id]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      {/* FOUNDER-REVIEW: full-feed page title. */}
      <Text style={{ color: tokens.colors.cream, fontSize: 28, fontWeight: "700" }}>Shared transits</Text>
      {/* FOUNDER-REVIEW: full-feed page dek. */}
      <Text style={{ color: tokens.colors.mist, lineHeight: 21 }}>
        Every slow-moving transit currently pulling on two or more people in your circle at once.
      </Text>
      <ThisWeekCard loading={loading} preference={preference} rows={rows} nextDateISO={nextDateISO} compact={false} />
      <Link href="/home" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="Back to home">
          {/* FOUNDER-REVIEW: return to constellation home. */}
          <Text style={{ color: tokens.colors.goldSoft, fontWeight: "600" }}>Back to home</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
