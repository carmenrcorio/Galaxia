import {
  coerceDailyNudgeRow,
  computeSynastry,
  findNextRelationalTransitDate,
  MAJOR_RELATIONAL_TRANSIT_BODIES,
  ownerLocalDate,
  orderSkyRowsForHome,
  planDailyNudgeWrites,
  whenUTCForOwnerLocalDate,
  type NatalChart,
  type PersonDailyNudgeRecord,
  type Precision,
  type RelationalTransitPersonInput
} from "@galaxia/astro";
import {
  ELEMENT_NODE_COLORS,
  galaxyGeometry,
  galaxySeatXY,
  constellationSkeletonSeats,
  DEFAULT_FETCH_TIMEOUT_MS,
  elementFromRelation,
  HONOR_LINE_STYLE,
  HONOR_RELATION_TYPE,
  honorEdgesFromDeclaredRows,
  isMinorForSafety,
  peopleForTodaySky,
  resolveAccountName,
  sunSignFromChart,
  withTimeout,
  type HonorEdge,
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { ConstellationMap } from "../../../src/components/constellation-map";
import { Chip, GlassCard, Pill } from "../../../src/components/glass";
import { InitialAvatar } from "../../../src/components/initial-avatar";
import { ThisWeekCard, type ThisWeekRow } from "../../../src/components/this-week-card";
import { cacheGet, cacheSet } from "../../../src/lib/cache";
import { constellationStageHeight, type SynastryLink } from "../../../src/lib/constellation-paint";
import { screenFill } from "../../../src/lib/screen";
import { supabase } from "../../../src/lib/supabase";
import { backfillProfileTimezoneIfMissing } from "../../../src/lib/timezone";
import { fonts } from "../../../src/lib/typography";
import { readUiSetting, SETTING_SHOW_RINGS, writeUiSetting } from "../../../src/lib/ui-settings";
import { useAccessibilitySettings } from "../../../src/providers/accessibility-provider";
import { useAuth } from "../../../src/providers/auth-provider";

interface PersonRow {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "exact" | "date" | "year" | "none";
  birth_date?: string | null;
  is_self: boolean;
  is_minor: boolean;
  /** Remembrance marker — passed people are excluded from live "Today in your sky". */
  passed_at?: string | null;
  custom_position?: { angle: number; radius_pct: number } | null;
  star_scale?: number | null;
  memorial_constellation?: string | null;
  star_color?: string | null;
  sunSign?: string | null;
}

type LinkRow = SynastryLink;

interface ThreadChipPerson {
  id: string;
  name: string;
  sunSign?: string | null;
  memorial?: boolean;
}

interface ThreadChip {
  id: string;
  mode: "ask" | "shared";
  preview: string;
  people: ThreadChipPerson[];
}

/* One person's sky today — durable person_daily_nudges row (frozen copy). */
interface PersonSky {
  id: string;
  name: string;
  isSelf: boolean;
  isMinor: boolean;
  precision: PersonRow["birth_precision"];
  hasChart: boolean;
  sunSign?: string | null;
  nudge: PersonDailyNudgeRecord;
}

/* Generations Feature 3 — mirrors relational_transits columns (web parity,
   apps/web/components/relational-transit-feed.tsx). Read-only here. */
type RelationalTransitRow = ThisWeekRow;

const SKELETON_SEATS = constellationSkeletonSeats();
const CONSTELLATION_CROSSFADE_MS = 250;

const CONSTELLATION_EMPTY = "Your constellation is empty. Add the first person to begin.";
const CONSTELLATION_EMPTY_ACTION = "Add the first person";
const CONSTELLATION_LOAD_ERROR = "The constellation could not load.";
const CONSTELLATION_RETRY = "Try again";

export default function HomeScreen() {
  const { session } = useAuth();
  const { reduceMotion } = useAccessibilitySettings();
  const router = useRouter();
  const { height: viewportHeight } = useWindowDimensions();
  // First name only, from the shared resolver, or null when no name has been
  // captured. Never the local part of an email address.
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [honorEdges, setHonorEdges] = useState<HonorEdge[]>([]);
  const [cohortByPerson, setCohortByPerson] = useState<Record<string, string>>({});
  const [personSkies, setPersonSkies] = useState<PersonSky[]>([]);
  const [relationalTransits, setRelationalTransits] = useState<RelationalTransitRow[]>([]);
  const [relationalPref, setRelationalPref] = useState<"all" | "major_only" | "off">("all");
  const [nextRelationalDateISO, setNextRelationalDateISO] = useState<string | null>(null);
  const [threadChips, setThreadChips] = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus] = useState<string | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const [constellationFailed, setConstellationFailed] = useState(false);
  const [boxWidth, setBoxWidth] = useState(340);
  const [showRings, setShowRings] = useState(true);
  const skeletonFade = useRef(new Animated.Value(1)).current;
  const liveFade = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const todayY = useRef(0);

  useEffect(() => {
    if (!session?.user.id) return;
    void loadHome();
  }, [session?.user.id]);

  useEffect(() => {
    void readUiSetting(SETTING_SHOW_RINGS).then((value) => {
      if (value === "false") setShowRings(false);
    });
  }, []);

  useEffect(() => {
    if (homeLoading) {
      liveFade.setValue(0);
      if (reduceMotion) {
        skeletonFade.setValue(0.28);
        return;
      }
      skeletonFade.setValue(0.28);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonFade, { toValue: 0.42, duration: 1900, useNativeDriver: false }),
          Animated.timing(skeletonFade, { toValue: 0.16, duration: 1900, useNativeDriver: false })
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    if (constellationFailed || people.length === 0) {
      skeletonFade.setValue(0);
      liveFade.setValue(0);
      return;
    }
    if (reduceMotion) {
      skeletonFade.setValue(0);
      liveFade.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(skeletonFade, { toValue: 0, duration: CONSTELLATION_CROSSFADE_MS, useNativeDriver: false }),
      Animated.timing(liveFade, { toValue: 1, duration: CONSTELLATION_CROSSFADE_MS, useNativeDriver: false })
    ]).start();
  }, [homeLoading, constellationFailed, people.length, reduceMotion, skeletonFade, liveFade]);

  const stageHeight = constellationStageHeight(boxWidth, viewportHeight);
  const constellationGeom = useMemo(
    () => galaxyGeometry(boxWidth, stageHeight),
    [boxWidth, stageHeight],
  );

  /* Nodes shimmer when that person has a real eligible nudge today. */
  const activeTransitIds = useMemo(
    () => personSkies.filter((sky) => sky.nudge.copy_tier !== "empty_hedge" && sky.nudge.transit_body).map((sky) => sky.id),
    [personSkies]
  );

  const loadHome = async () => {
    if (!session?.user.id) return;
    setHomeLoading(true);
    setHomeStatus(null);
    setConstellationFailed(false);
    try {
      await withTimeout((async () => {
      const cacheKey = `home_state:${session.user.id}`;
      /* FOUND HOLE CLOSED (web home parity): loadHome previously selected
         birth_precision but NOT is_minor / birth_date, so isMinorForSafety
         could not run on the sky module — a surface that renders content
         about a person. Galaxy safety now loads those fields (+ relation)
         and gates via isMinorForSafety — never raw is_minor alone. */
      const personIds = (
        (
          await supabase.from("people").select("id").eq("owner_id", session.user.id)
        ).data ?? []
      ).map((row) => row.id as string);
      const localDate = ownerLocalDate();
      const nowISO = new Date().toISOString();
      const [{ data: profile }, { data: peopleRows, error: peopleError }, { data: chartRows }, { data: threadRows }, { data: nudgeRows }, { data: recentNudgeRows }, { data: transitRows }, { data: upcomingRows }, { data: relRows }] = await Promise.all([
      supabase.from("profiles").select("display_name, pinned_sky_person_id, timezone, relational_transit_alerts").eq("id", session.user.id).single(),
      supabase.from("people").select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor, passed_at, star_color, memorial_constellation, custom_position, star_scale").eq("owner_id", session.user.id).order("created_at", { ascending: true }),
      personIds.length
        ? supabase.from("charts").select("person_id, data").in("person_id", personIds)
        : Promise.resolve({ data: [] as { person_id: string; data: NatalChart }[] }),
      supabase.from("threads").select("id, mode, subject_person, pair_low, pair_high").eq("owner_id", session.user.id).eq("status", "active").order("created_at", { ascending: false }).limit(8),
      personIds.length
        ? supabase.from("person_daily_nudges").select("*").eq("owner_id", session.user.id).eq("date", localDate).in("person_id", personIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      personIds.length
        ? supabase.from("person_daily_nudges").select("person_id, pass_id").eq("owner_id", session.user.id).in("person_id", personIds).not("pass_id", "is", null).gte("date", new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)).neq("date", localDate)
        : Promise.resolve({ data: [] as { person_id: string; pass_id: string | null }[] }),
      supabase
        .from("relational_transits")
        .select("id, transit_body, aspect_type, affected_profiles")
        .eq("owner_id", session.user.id)
        .lte("active_from", nowISO)
        .gte("active_to", nowISO)
        .order("active_from", { ascending: true })
        .limit(20),
      supabase
        .from("relational_transits")
        .select("active_from, transit_body")
        .eq("owner_id", session.user.id)
        .gt("active_from", nowISO)
        .order("active_from", { ascending: true })
        .limit(8),
      supabase.from("relationships").select("person_a, person_b, relation_type").eq("owner_id", session.user.id),
      ]);
      if (peopleError) throw peopleError;

      const castPeople = (peopleRows ?? []) as PersonRow[];
      // Same resolver as the web account screen and web home. This line used to
      // fall back to session.user.email?.split("@")[0], greeting people by a
      // fragment of their login address.
      const resolvedFirstName = resolveAccountName({
        profileDisplayName: profile?.display_name as string | null,
        selfPersonName: castPeople.find((person) => person.is_self === true)?.display_name ?? null
      }).firstName;
      setWelcomeName(resolvedFirstName);
      setPeople(castPeople);
      const relationalPrefValue = (profile as { relational_transit_alerts?: string | null } | null)?.relational_transit_alerts ?? "all";
      const pref = relationalPrefValue === "major_only" || relationalPrefValue === "off" ? relationalPrefValue : "all";
      setRelationalPref(pref);
      const allTransits = (transitRows ?? []) as RelationalTransitRow[];
      const visibleTransits =
        pref === "off"
          ? []
          : pref === "major_only"
            ? allTransits.filter((row) => MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body))
            : allTransits;
      setRelationalTransits(visibleTransits);

      const upcoming = ((upcomingRows ?? []) as Array<{ active_from: string; transit_body: RelationalTransitRow["transit_body"] }>).filter((row) =>
        pref === "off" ? false : pref === "major_only" ? MAJOR_RELATIONAL_TRANSIT_BODIES.includes(row.transit_body) : true
      );
      let nextISO: string | null = upcoming[0]?.active_from ?? null;
      if (!nextISO && visibleTransits.length === 0 && pref !== "off") {
        const chartByIdForNext = new Map<string, NatalChart>((chartRows ?? []).map((row) => [row.person_id as string, row.data as NatalChart]));
        const inputs: RelationalTransitPersonInput[] = [];
        for (const person of castPeople) {
          const chart = chartByIdForNext.get(person.id);
          if (!chart) continue;
          inputs.push({
            id: person.id,
            name: person.display_name,
            chart,
            birthDate: person.birth_date,
            birthPrecision: person.birth_precision as Precision | "none",
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
      setNextRelationalDateISO(nextISO);
      const pinnedSkyPersonId = (profile as { pinned_sky_person_id?: string | null } | null)?.pinned_sky_person_id ?? null;

      // Nudge-delivery Phase A backfill (mobile parity with web's
      // TimezoneSync) — reuses the profile row already fetched above
      // instead of an extra query. Write-amplification guard lives in
      // backfillProfileTimezoneIfMissing: no-ops once a value is stored, so
      // repeat home loads/session refreshes never re-write it.
      void backfillProfileTimezoneIfMissing(
        supabase,
        session.user.id,
        (profile as { timezone?: string | null } | null)?.timezone ?? null
      );

      const chartById = new Map<string, NatalChart>((chartRows ?? []).map((row) => [row.person_id as string, row.data as NatalChart]));
      for (const person of castPeople) {
        person.sunSign = sunSignFromChart(chartById.get(person.id));
      }
      setPeople([...castPeople]);
      const cohortMap: Record<string, string> = {};
      for (const person of castPeople) {
        const plutoSign = chartById.get(person.id)?.generational?.pluto?.sign;
        if (plutoSign) cohortMap[person.id] = plutoSign;
      }
      setCohortByPerson(cohortMap);
      const calculatedLinks: LinkRow[] = [];
      for (let i = 0; i < castPeople.length; i += 1) {
        for (let j = i + 1; j < castPeople.length; j += 1) {
          const chartA = chartById.get(castPeople[i].id);
          const chartB = chartById.get(castPeople[j].id);
          const score = chartA && chartB ? computeSynastry(chartA, chartB).scores.overall : 50;
          calculatedLinks.push({
            fromId: castPeople[i].id,
            toId: castPeople[j].id,
            scoreA: score,
            elA: elementFromRelation(castPeople[i].relation, castPeople[i].passed_at),
            elB: elementFromRelation(castPeople[j].relation, castPeople[j].passed_at),
          });
        }
      }
      const finalLinks = calculatedLinks.sort((a, b) => b.scoreA - a.scoreA).slice(0, 14);
      setLinks(finalLinks);
      const nextHonorEdges = honorEdgesFromDeclaredRows(
        (relRows ?? []) as Array<{ person_a: string; person_b: string; relation_type: string }>,
        castPeople,
      );
      setHonorEdges(nextHonorEdges);

      // Durable daily nudges — living people only; frozen copy_resolved.
      // Passed people are excluded via peopleForTodaySky (same care hole as web).
      const living = peopleForTodaySky(castPeople);
      const recentPassIdsByPerson = new Map<string, Set<string>>();
      for (const r of recentNudgeRows ?? []) {
        const pid = r.person_id as string;
        const pass = r.pass_id as string | null;
        if (!pass) continue;
        if (!recentPassIdsByPerson.has(pid)) recentPassIdsByPerson.set(pid, new Set());
        recentPassIdsByPerson.get(pid)!.add(pass);
      }
      const existing = (nudgeRows ?? []).map((r) => coerceDailyNudgeRow(r as Record<string, unknown>));
      const { rowsToUpsert, rowsForDisplay } = planDailyNudgeWrites({
        ownerId: session.user.id,
        date: localDate,
        whenUTC: whenUTCForOwnerLocalDate(localDate),
        people: living.map((person) => ({
          id: person.id,
          relation: person.relation,
          is_self: person.is_self,
          birth_precision: person.birth_precision,
          birth_date: person.birth_date,
          minorSafe: isMinorForSafety({
            isMinor: person.is_minor,
            birthDate: person.birth_date,
            birthPrecision: person.birth_precision
          })
        })),
        chartsById: chartById,
        existingRows: existing,
        recentPassIdsByPerson
      });
      if (rowsToUpsert.length) {
        await supabase.from("person_daily_nudges").upsert(rowsToUpsert, { onConflict: "person_id,date", ignoreDuplicates: true });
      }
      const displayOrdered = orderSkyRowsForHome(
        [
          ...rowsForDisplay.filter((r) => living.find((p) => p.id === r.person_id)?.is_self),
          ...rowsForDisplay.filter((r) => !living.find((p) => p.id === r.person_id)?.is_self)
        ],
        pinnedSkyPersonId
      );
      const skies: PersonSky[] = displayOrdered.map((nudge) => {
        const person = living.find((x) => x.id === nudge.person_id)!;
        return {
          id: person.id,
          name: person.display_name,
          isSelf: person.is_self,
          isMinor: isMinorForSafety({
            isMinor: person.is_minor,
            birthDate: person.birth_date,
            birthPrecision: person.birth_precision
          }),
          precision: person.birth_precision,
          hasChart: Boolean(chartById.get(person.id)),
          sunSign: person.sunSign ?? sunSignFromChart(chartById.get(person.id)),
          nudge
        };
      });
      setPersonSkies(skies);

      const threads = (threadRows ?? []) as Array<{
        id: string; mode: "ask" | "shared";
        subject_person: string | null; pair_low: string | null; pair_high: string | null;
      }>;
      if (threads.length === 0) {
        setThreadChips([]);
        await cacheSet(cacheKey, { welcomeName: resolvedFirstName, people: castPeople, links: finalLinks, honorEdges: nextHonorEdges, personSkies: skies, threadChips: [], cohortByPerson: cohortMap });
        return;
      }
      const { data: messages } = await supabase
      .from("messages")
      .select("thread_id, body, created_at")
      .in(
        "thread_id",
        threads.map((thread) => thread.id)
      )
      .order("created_at", { ascending: false });

      const previewByThread = new Map<string, string>();
      for (const messageRow of messages ?? []) {
        const threadId = messageRow.thread_id as string;
        if (!previewByThread.has(threadId)) {
          previewByThread.set(threadId, (messageRow.body as string).slice(0, 72));
        }
      }
      const byId = new Map(castPeople.map((p) => [p.id, p]));
      const chipPeople = (ids: Array<string | null>) =>
        [...new Set(ids.filter((id): id is string => Boolean(id)))].flatMap((id) => {
          const p = byId.get(id);
          return p ? [{ id: p.id, name: p.display_name, sunSign: p.sunSign, memorial: Boolean(p.passed_at) }] : [];
        });
      const computedThreadChips = threads.map((thread) => ({
        id: thread.id,
        mode: thread.mode,
        preview: previewByThread.get(thread.id) ?? "Resume this thread",
        people: chipPeople([thread.subject_person, thread.pair_low, thread.pair_high]),
      }));

      setThreadChips(computedThreadChips);
      await cacheSet(cacheKey, {
        welcomeName: resolvedFirstName,
        people: castPeople,
        links: finalLinks,
        honorEdges: nextHonorEdges,
        personSkies: skies,
        threadChips: computedThreadChips,
        cohortByPerson: cohortMap,
      });
      })(), DEFAULT_FETCH_TIMEOUT_MS);
    } catch {
      const cached = await cacheGet<{
        welcomeName?: string | null;
        people: PersonRow[];
        links: LinkRow[];
        honorEdges?: HonorEdge[];
        personSkies: PersonSky[];
        threadChips: ThreadChip[];
        cohortByPerson?: Record<string, string>;
      }>(`home_state:${session.user.id}`);
      if (cached) {
        setWelcomeName(cached.welcomeName ?? welcomeName);
        setPeople(cached.people);
        setLinks(cached.links);
        setHonorEdges(cached.honorEdges ?? []);
        setCohortByPerson(cached.cohortByPerson ?? {});
        setPersonSkies(cached.personSkies ?? []);
        setThreadChips(cached.threadChips);
        setHomeStatus("Offline mode: showing cached home.");
        setConstellationFailed(false);
      } else {
        setPeople([]);
        setLinks([]);
        setHonorEdges([]);
        setCohortByPerson({});
        setPersonSkies([]);
        setThreadChips([]);
        setConstellationFailed(true);
      }
    } finally {
      setHomeLoading(false);
    }
  };

  return (
    <ScrollView ref={scrollRef} style={screenFill} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 33, fontFamily: fonts.frauncesSemi }}>Galaxia Mea</Text>
            <Text style={{ color: tokens.colors.mist, lineHeight: 21, fontFamily: fonts.inter }}>
        {welcomeName ? `Welcome back, ${welcomeName}.` : "Welcome back."} Here’s your constellation.
      </Text>

      {homeStatus ? <Text style={{ color: tokens.colors.gold }}>{homeStatus}</Text> : null}

      <ThisWeekCard
        loading={homeLoading}
        error={constellationFailed}
        onRetry={() => void loadHome()}
        preference={relationalPref}
        rows={relationalTransits}
        nextDateISO={nextRelationalDateISO}
        compact
        onSeeToday={() => scrollRef.current?.scrollTo({ y: todayY.current, animated: true })}
        personChip={Object.fromEntries(
          people.map((p) => [p.id, { sunSign: p.sunSign, memorial: Boolean(p.passed_at) }])
        )}
      />

      <GlassCard padding={0}>
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.05)",
            flexDirection: "row",
            alignItems: "center",
            gap: 10
          }}
        >
          <View style={{ width: 24, height: 1, backgroundColor: tokens.colors.gold, opacity: 0.85 }} />
          <Text style={eyebrowGold}>Your constellation</Text>
        </View>
        <View
          style={{
            height: stageHeight,
            backgroundColor: tokens.colors.ink,
            overflow: "hidden"
          }}
          onLayout={(event) => {
            const w = event.nativeEvent.layout.width;
            if (w > 0) setBoxWidth(w);
          }}
        >
          {constellationFailed ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 12 }}>
                            <Text style={[cardBody, { textAlign: "center" }]}>{CONSTELLATION_LOAD_ERROR}</Text>
              <Pill accessibilityLabel={CONSTELLATION_RETRY} onPress={() => void loadHome()}>
                {CONSTELLATION_RETRY}
              </Pill>
            </View>
          ) : null}
          {!homeLoading && !constellationFailed && people.length === 0 ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 12 }}>
                            <Text style={[cardBody, { textAlign: "center" }]}>{CONSTELLATION_EMPTY}</Text>
              <Link href="/onboarding" asChild>
                <Pill accessibilityLabel={CONSTELLATION_EMPTY_ACTION}>{CONSTELLATION_EMPTY_ACTION}</Pill>
              </Link>
            </View>
          ) : null}
          {homeLoading || (!constellationFailed && people.length > 0) ? (
            <>
              <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: skeletonFade }}>
                {SKELETON_SEATS.map((seat) => {
                  const { x, y } = galaxySeatXY(seat, constellationGeom);
                  const size = 3 + seat.size * 3;
                  return (
                    <View
                      key={seat.id}
                      style={{
                        position: "absolute",
                        left: x - size / 2,
                        top: y - size / 2,
                        width: size,
                        height: size,
                        borderRadius: 999,
                        backgroundColor: seat.accent === "gold" ? tokens.colors.goldSoft : tokens.colors.air
                      }}
                    />
                  );
                })}
              </Animated.View>
              <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: liveFade }} pointerEvents={homeLoading ? "none" : "auto"}>
                {!homeLoading && people.length > 0 ? (
                  <ConstellationMap
                    width={boxWidth}
                    height={stageHeight}
                    people={people}
                    links={links}
                    honorEdges={honorEdges}
                    cohortByPerson={cohortByPerson}
                    activeTransitIds={activeTransitIds}
                    reduceMotion={reduceMotion}
                    showRings={showRings}
                    onSelectPerson={(personId) =>
                      router.push({ pathname: "/profile/[personId]", params: { personId } })
                    }
                  />
                ) : null}
              </Animated.View>
              {!homeLoading && people.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: showRings }}
                  accessibilityLabel={showRings ? "Hide orbital rings" : "Show orbital rings"}
                  onPress={() => {
                    setShowRings((current) => {
                      const next = !current;
                      void writeUiSetting(SETTING_SHOW_RINGS, next ? "true" : "false");
                      return next;
                    });
                  }}
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    zIndex: 10,
                    backgroundColor: "rgba(255,255,255,0.07)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6
                  }}
                >
                  <Text
                    style={{
                      color: showRings ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)",
                      fontSize: 12,
                      letterSpacing: 1.2,
                      fontFamily: fonts.interSemi
                    }}
                  >
                    RINGS
                  </Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
        {!homeLoading && !constellationFailed && people.length > 0 ? (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.05)",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
              alignItems: "center"
            }}
          >
            {[
              { label: "Partner / binary at core", color: ELEMENT_NODE_COLORS.air, honor: false },
              { label: "Ring 1 · children", color: ELEMENT_NODE_COLORS.earth, honor: false },
              { label: "Ring 2 · parents & siblings", color: ELEMENT_NODE_COLORS.water, honor: false },
              { label: "Ring 3 · friends & relatives", color: ELEMENT_NODE_COLORS.fire, honor: false },
              { label: "Ring 4 · colleagues", color: ELEMENT_NODE_COLORS.earth, honor: false },
              { label: "Remembered / ancient light", color: "#DA8C8C", honor: false },
              ...(honorEdges.some((edge) => edge.relationType === HONOR_RELATION_TYPE)
                ? [{ label: "Honor / remembrance light", color: HONOR_LINE_STYLE.water, honor: true }]
                : [])
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View
                  style={{
                    width: item.honor ? 14 : 8,
                    height: item.honor ? 2 : 8,
                    borderRadius: item.honor ? 1 : 999,
                    backgroundColor: item.color,
                    borderTopWidth: item.honor ? 1 : 0,
                    borderStyle: item.honor ? "dashed" : "solid",
                    borderTopColor: item.honor ? HONOR_LINE_STYLE.ancient : "transparent"
                  }}
                />
                <Text style={{ fontSize: 11, color: tokens.colors.mist2, fontFamily: fonts.inter }}>{item.label}</Text>
              </View>
            ))}
            <Text style={{ marginLeft: "auto", fontSize: 11, color: tokens.colors.mist2, fontFamily: fonts.inter }}>
              Tap a star to open
            </Text>
          </View>
        ) : null}
      </GlassCard>

      <GlassCard
        padding={12}
        onLayout={(event) => {
          todayY.current = event.nativeEvent.layout.y;
        }}
      >
        <Text style={cardTitle}>Today in your sky</Text>
        <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
          {activeTransitIds.length > 0
            ? "Daily sky notes from each person's own chart: fixed once for the day."
            : "No sky notes near an exact pass for anyone right now."}
        </Text>
        {personSkies.map((sky) => {
          const nudge = sky.nudge;
          const hasHit = nudge.copy_tier !== "empty_hedge" && Boolean(nudge.transit_body);
          const proof =
            hasHit && nudge.precision_mode === "exact" && nudge.transit_body && nudge.natal_body && nudge.aspect_type
              ? `${nudge.transit_body[0]!.toUpperCase()}${nudge.transit_body.slice(1)} ${nudge.aspect_type} ${nudge.natal_body[0]!.toUpperCase()}${nudge.natal_body.slice(1)}${nudge.orb_deg != null ? ` · ${nudge.orb_deg.toFixed(1)}°` : ""}${nudge.phase ? ` · ${nudge.phase}` : ""}`
              : null;
          return (
            <Link key={sky.id} href={{ pathname: "/profile/[personId]", params: { personId: sky.id } }} asChild>
              <Pressable
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderLeftWidth: 2,
                  borderLeftColor: hasHit ? tokens.colors.gold : tokens.colors.line,
                  backgroundColor: hasHit ? "rgba(230,174,108,0.06)" : "transparent",
                  gap: 2,
                  flexDirection: "row",
                  alignItems: "flex-start"
                }}
              >
                <InitialAvatar name={sky.name} size="sm" personId={sky.id} sunSign={sky.sunSign} />
                <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: tokens.colors.cream, fontWeight: "600", fontSize: 13 }}>
                  {sky.isSelf ? "You" : sky.name}
                </Text>
                <Text
                  style={{
                    color: hasHit ? tokens.colors.cream : tokens.colors.mist2,
                    fontSize: 12,
                    lineHeight: 17,
                    fontStyle: hasHit ? "normal" : "italic"
                  }}
                >
                  {nudge.copy_resolved}
                </Text>
                {proof ? <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>{proof}</Text> : null}
                </View>
              </Pressable>
            </Link>
          );
        })}
        <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>
          Nodes shimmer when a person has an eligible daily sky note near an exact pass.
        </Text>
      </GlassCard>

      <GlassCard padding={12}>
        <Text style={cardTitle}>Jump back in</Text>
        {threadChips.length === 0 ? (
          <Text style={cardBody}>No active Vela threads yet.</Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {threadChips.map((thread) => (
              <Link key={thread.id} href={{ pathname: "/vela", params: { threadId: thread.id } }} asChild>
                <Chip>
                  {thread.people?.slice(0, 2).map((person) => (
                    <InitialAvatar key={person.id} name={person.name} size="sm" personId={person.id} sunSign={person.sunSign} memorial={person.memorial} />
                  ))}
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ color: tokens.colors.goldSoft, fontSize: 12, fontFamily: fonts.interSemi }}>{thread.mode.toUpperCase()}</Text>
                    <Text style={{ color: tokens.colors.cream, fontFamily: fonts.inter }} numberOfLines={1}>
                      {thread.preview}
                    </Text>
                  </View>
                </Chip>
              </Link>
            ))}
          </View>
        )}
      </GlassCard>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Link href="/moment" asChild>
          <Pill accessibilityLabel="Capture a moment">Capture a moment</Pill>
        </Link>
        <Link href="/onboarding" asChild>
          <Pill accessibilityLabel="Open onboarding">Onboarding</Pill>
        </Link>
        <Link href="/profile/self" asChild>
          <Pill accessibilityLabel="Open my profile">My profile</Pill>
        </Link>
      </View>
    </ScrollView>
  );
}

const cardTitle = {
  color: tokens.colors.cream,
  fontFamily: fonts.frauncesSemi,
  fontSize: 18
} as const;

const eyebrowGold = {
  color: tokens.colors.gold,
  fontFamily: fonts.interSemi,
  fontSize: 11,
  letterSpacing: 3.1,
  textTransform: "uppercase" as const
} as const;

const cardBody = {
  color: tokens.colors.mist,
  fontFamily: fonts.inter,
  lineHeight: 20
} as const;
