import {
  coerceDailyNudgeRow,
  computeSynastry,
  ownerLocalDate,
  orderSkyRowsForHome,
  planDailyNudgeWrites,
  whenUTCForOwnerLocalDate,
  type NatalChart,
  type PersonDailyNudgeRecord
} from "@galaxia/astro";
import {
  galaxySeatXY,
  galaxySeatsResolved,
  isMinorForSafety,
  peopleForTodaySky,
  resolveAccountName,
  ringIndex,
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import { cacheGet, cacheSet } from "../../src/lib/cache";
import { supabase } from "../../src/lib/supabase";
import { backfillProfileTimezoneIfMissing } from "../../src/lib/timezone";
import { useAccessibilitySettings } from "../../src/providers/accessibility-provider";
import { useAuth } from "../../src/providers/auth-provider";
import { useEntitlement } from "../../src/providers/entitlement-provider";

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
}

interface LinkRow {
  fromId: string;
  toId: string;
  score: number;
}

interface ThreadChip {
  id: string;
  mode: "ask" | "shared";
  preview: string;
}

/* One person's sky today — durable person_daily_nudges row (frozen copy). */
interface PersonSky {
  id: string;
  name: string;
  isSelf: boolean;
  isMinor: boolean;
  precision: PersonRow["birth_precision"];
  hasChart: boolean;
  nudge: PersonDailyNudgeRecord;
}

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const { tier } = useEntitlement();
  const { reduceMotion } = useAccessibilitySettings();
  // First name only, from the shared resolver, or null when no name has been
  // captured. Never the local part of an email address.
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [personSkies, setPersonSkies] = useState<PersonSky[]>([]);
  const [threadChips, setThreadChips] = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus] = useState<string | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const shimmer = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (!session?.user.id) return;
    void loadHome();
  }, [session?.user.id]);

  useEffect(() => {
    if (reduceMotion) {
      shimmer.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.45, duration: 1200, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, shimmer]);

  /* Same learnable seats as web `/app`: f(id, own ring) via galaxySeatsResolved
     (near-collision nudge on the ring by stable id order). Fixed ellipse geom
     for the home glance card — not the full canvas, but the same norms. */
  const constellationPositions = useMemo(() => {
    const geom = { cx: 170, cy: 170, radX: 120, radY: 120 };
    const seats = galaxySeatsResolved(
      people.map((person) => ({
        id: person.id,
        isSelf: person.is_self,
        ring: ringIndex(person.is_self, person.relation, person.passed_at),
      })),
    );
    return people.map((person) => {
      const seat = seats.get(person.id) ?? { nx: 0, ny: 0, angle: 0, rn: 0 };
      const { x, y } = galaxySeatXY(seat, geom);
      return { personId: person.id, x, y };
    });
  }, [people]);

  const positionMap = useMemo(
    () =>
      new Map(
        constellationPositions.map((position) => [position.personId, { x: position.x, y: position.y }])
      ),
    [constellationPositions]
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
    try {
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
      const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }, { data: nudgeRows }, { data: recentNudgeRows }] = await Promise.all([
      supabase.from("profiles").select("display_name, pinned_sky_person_id, timezone").eq("id", session.user.id).single(),
      supabase.from("people").select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor, passed_at").eq("owner_id", session.user.id).order("created_at", { ascending: true }),
      personIds.length
        ? supabase.from("charts").select("person_id, data").in("person_id", personIds)
        : Promise.resolve({ data: [] as { person_id: string; data: NatalChart }[] }),
      supabase.from("threads").select("id, mode").eq("owner_id", session.user.id).eq("status", "active").order("created_at", { ascending: false }).limit(8),
      personIds.length
        ? supabase.from("person_daily_nudges").select("*").eq("owner_id", session.user.id).eq("date", localDate).in("person_id", personIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      personIds.length
        ? supabase.from("person_daily_nudges").select("person_id, pass_id").eq("owner_id", session.user.id).in("person_id", personIds).not("pass_id", "is", null).gte("date", new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)).neq("date", localDate)
        : Promise.resolve({ data: [] as { person_id: string; pass_id: string | null }[] }),
      ]);

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
      const calculatedLinks: LinkRow[] = [];
      for (let i = 0; i < castPeople.length; i += 1) {
        for (let j = i + 1; j < castPeople.length; j += 1) {
          const a = castPeople[i];
          const b = castPeople[j];
          const chartA = chartById.get(a.id);
          const chartB = chartById.get(b.id);
          if (!chartA || !chartB) continue;
          const synastry = computeSynastry(chartA, chartB);
          calculatedLinks.push({ fromId: a.id, toId: b.id, score: synastry.scores.overall });
        }
      }
      const finalLinks = calculatedLinks.sort((a, b) => b.score - a.score).slice(0, 14);
      setLinks(finalLinks);

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
          nudge
        };
      });
      setPersonSkies(skies);

      const threads = (threadRows ?? []) as Array<{ id: string; mode: "ask" | "shared" }>;
      if (threads.length === 0) {
        setThreadChips([]);
        await cacheSet(cacheKey, { welcomeName: resolvedFirstName, people: castPeople, links: finalLinks, personSkies: skies, threadChips: [] });
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
      const computedThreadChips = threads.map((thread) => ({
        id: thread.id,
        mode: thread.mode,
        preview: previewByThread.get(thread.id) ?? "Resume this thread"
      }));

      setThreadChips(computedThreadChips);
      await cacheSet(cacheKey, {
        welcomeName: resolvedFirstName,
        people: castPeople,
        links: finalLinks,
        personSkies: skies,
        threadChips: computedThreadChips
      });
    } catch (error) {
      const cached = await cacheGet<{
        welcomeName?: string | null;
        people: PersonRow[];
        links: LinkRow[];
        personSkies: PersonSky[];
        threadChips: ThreadChip[];
      }>(`home_state:${session.user.id}`);
      if (cached) {
        setWelcomeName(cached.welcomeName ?? welcomeName);
        setPeople(cached.people);
        setLinks(cached.links);
        setPersonSkies(cached.personSkies ?? []);
        setThreadChips(cached.threadChips);
        setHomeStatus("Offline mode: showing cached home.");
      } else {
        setHomeStatus(error instanceof Error ? error.message : "Unable to load home.");
      }
    } finally {
      setHomeLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 33, fontWeight: "700" }}>Galaxia Mea</Text>
      {/* FOUNDER-REVIEW: authored greeting, including the no-name variant. */}
      <Text style={{ color: tokens.colors.mist, lineHeight: 21 }}>
        {welcomeName ? `Welcome back, ${welcomeName}.` : "Welcome back."} Here’s your constellation at a glance.
      </Text>
      <Text style={{ color: tokens.colors.goldSoft }}>Plan: {tier === "plus" ? "Galaxia+" : "Free"}</Text>

      {homeLoading ? (
        <View style={cardStyle}>
          <Text style={cardBody}>Loading constellation…</Text>
        </View>
      ) : null}
      {!homeLoading && people.length === 0 ? (
        <View style={cardStyle}>
          <Text style={cardTitle}>No constellation yet</Text>
          <Text style={cardBody}>Add yourself and your people in onboarding to activate charts, links, and transit shimmer.</Text>
        </View>
      ) : null}
      {homeStatus ? <Text style={{ color: tokens.colors.gold }}>{homeStatus}</Text> : null}

      <View style={cardStyle}>
        <Text style={cardTitle}>Constellation</Text>
        <View style={{ height: 340, borderRadius: 16, borderWidth: 1, borderColor: tokens.colors.line, backgroundColor: tokens.colors.ink2, overflow: "hidden" }}>
          {links.map((link) => {
            const from = positionMap.get(link.fromId);
            const to = positionMap.get(link.toId);
            if (!from || !to) return null;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const scoreColor = link.score >= 62 ? tokens.colors.gold : tokens.colors.rose;
            return (
              <View
                key={`${link.fromId}-${link.toId}`}
                style={{
                  position: "absolute",
                  left: from.x,
                  top: from.y,
                  width: distance,
                  height: 2,
                  backgroundColor: scoreColor,
                  opacity: 0.65,
                  transform: [{ rotate: `${angle}deg` }]
                }}
              />
            );
          })}
          {constellationPositions.map((position) => {
            const person = people.find((row) => row.id === position.personId);
            if (!person) return null;
            const isActive = activeTransitIds.includes(person.id);
            return (
              <View key={person.id} style={{ position: "absolute", left: position.x - 24, top: position.y - 24, alignItems: "center", width: 48 }}>
                <Animated.View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    backgroundColor: person.is_self ? tokens.colors.gold : tokens.colors.teal,
                    borderWidth: 1,
                    borderColor: tokens.colors.cream,
                    opacity: isActive ? shimmer : 0.85
                  }}
                />
                <Text style={{ color: tokens.colors.cream, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                  {person.display_name}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={cardBody}>Links are weighted by composite compatibility score (gold flow / rose tension).</Text>
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Today in your sky</Text>
        <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
          {activeTransitIds.length > 0
            ? "Daily sky notes from each person's own chart — fixed once for the day."
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
                  gap: 2
                }}
              >
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
              </Pressable>
            </Link>
          );
        })}
        <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>
          Nodes shimmer when a person has an eligible daily sky note near an exact pass.
        </Text>
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Jump back in</Text>
        {threadChips.length === 0 ? (
          <Text style={cardBody}>No active Vela threads yet.</Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {threadChips.map((thread) => (
              <Link key={thread.id} href={{ pathname: "/vela", params: { threadId: thread.id } }} asChild>
                <Pressable style={{ borderRadius: 999, borderWidth: 1, borderColor: tokens.colors.line, paddingHorizontal: 12, paddingVertical: 8, maxWidth: "100%" }}>
                  <Text style={{ color: tokens.colors.goldSoft, fontSize: 12 }}>{thread.mode.toUpperCase()}</Text>
                  <Text style={{ color: tokens.colors.cream }} numberOfLines={1}>
                    {thread.preview}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Link href="/onboarding" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Open onboarding" style={pillButton}>
            <Text style={pillText}>Onboarding</Text>
          </Pressable>
        </Link>
        <Link href="/profile/self" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Open my profile" style={pillButton}>
            <Text style={pillText}>My profile</Text>
          </Pressable>
        </Link>
        <Link href="/compare" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Open compare" style={pillButton}>
            <Text style={pillText}>Compare</Text>
          </Pressable>
        </Link>
        <Link href="/groups" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Open groups" style={pillButton}>
            <Text style={pillText}>Groups</Text>
          </Pressable>
        </Link>
        <Link href="/vela" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Vela" style={pillButton}>
            <Text style={pillText}>Vela</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Open settings" style={pillButton}>
            <Text style={pillText}>Settings</Text>
          </Pressable>
        </Link>
      </View>

      <Pressable onPress={signOut} style={{ borderWidth: 1, borderColor: tokens.colors.line, borderRadius: 999, paddingVertical: 12 }}>
        <Text style={{ color: tokens.colors.cream, fontWeight: "700", textAlign: "center" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const cardStyle = {
  backgroundColor: tokens.colors.ink3,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  padding: 12,
  gap: 8
} as const;

const cardTitle = {
  color: tokens.colors.cream,
  fontWeight: "700",
  fontSize: 18
} as const;

const cardBody = {
  color: tokens.colors.mist,
  lineHeight: 20
} as const;

const pillButton = {
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 9
} as const;

const pillText = {
  color: tokens.colors.cream,
  fontWeight: "700"
} as const;
