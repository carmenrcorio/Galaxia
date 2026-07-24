import {
  computeSynastry,
  interpretTransit,
  todayTransitsForChart,
  transitNotation,
  type NatalChart,
  type TransitHit
} from "@galaxia/astro";
import { isMinorForSafety, peopleForTodaySky } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { cacheGet, cacheSet } from "../src/lib/cache";
import { supabase } from "../src/lib/supabase";
import { useAccessibilitySettings } from "../src/providers/accessibility-provider";
import { useAuth } from "../src/providers/auth-provider";
import { useEntitlement } from "../src/providers/entitlement-provider";

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

/* One person's real sky today — computed from THEIR OWN natal chart.
   `transits` is empty for year-only / chart-less people (hedged in the UI). */
interface PersonSky {
  id: string;
  name: string;
  isSelf: boolean;
  isMinor: boolean;
  precision: PersonRow["birth_precision"];
  hasChart: boolean;
  transits: TransitHit[];
}

export default function HomeScreen() {
  const { session, loading, signOut } = useAuth();
  const { tier } = useEntitlement();
  const { reduceMotion } = useAccessibilitySettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [welcomeName, setWelcomeName] = useState("stargazer");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [personSkies, setPersonSkies] = useState<PersonSky[]>([]);
  const [threadChips, setThreadChips] = useState<ThreadChip[]>([]);
  const [homeStatus, setHomeStatus] = useState<string | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const shimmer = useRef(new Animated.Value(0.45)).current;

  const authenticate = async (mode: "sign-in" | "sign-up") => {
    setSubmitting(true);
    setError(null);
    try {
      const fn = mode === "sign-in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { data, error: authError } = await fn({ email, password });
      if (authError) {
        setError(authError.message);
      }
      if (mode === "sign-up" && data.user?.id) {
        await supabase.from("profiles").upsert({ id: data.user.id, display_name: email.split("@")[0] });
      }
    } finally {
      setSubmitting(false);
    }
  };

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

  const constellationPositions = useMemo(() => {
    const radius = 120;
    const centerX = 170;
    const centerY = 170;
    return people.map((person, index) => {
      const angle = (index / Math.max(people.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
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

  /* Nodes shimmer when that person has a real tight transit today — derived
     from each person's own computed sky, never a single shared flag. */
  const activeTransitIds = useMemo(
    () => personSkies.filter((sky) => sky.transits.length > 0).map((sky) => sky.id),
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
      const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", session.user.id).single(),
      supabase.from("people").select("id, display_name, relation, birth_precision, birth_date, is_self, is_minor, passed_at").eq("owner_id", session.user.id).order("created_at", { ascending: true }),
      supabase.from("charts").select("person_id, data").in(
        "person_id",
        (
          (
            await supabase.from("people").select("id").eq("owner_id", session.user.id)
          ).data ?? []
        ).map((row) => row.id)
      ),
      supabase.from("threads").select("id, mode").eq("owner_id", session.user.id).eq("status", "active").order("created_at", { ascending: false }).limit(8)
      ]);

      setWelcomeName(profile?.display_name ?? session.user.email?.split("@")[0] ?? "stargazer");
      const castPeople = (peopleRows ?? []) as PersonRow[];
      setPeople(castPeople);

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

      // Today's sky — living people only (peopleForTodaySky excludes anyone
      // with passed_at set — same grief-care hole as web). Transits are
      // computed PER PERSON against their OWN natal chart so every row is
      // that person's real transit (or an honest hedge for year-only /
      // chart-less people), never one shared summary line. Passed people
      // are excluded and their transits are never computed.
      const now = new Date().toISOString();
      const skies: PersonSky[] = peopleForTodaySky(castPeople).map((person) => {
        const chart = chartById.get(person.id);
        return {
          id: person.id,
          name: person.display_name,
          isSelf: person.is_self,
          /* Age-aware gate — never raw is_minor alone (ENGINEERING §9). */
          isMinor: isMinorForSafety({
            isMinor: person.is_minor,
            birthDate: person.birth_date,
            birthPrecision: person.birth_precision
          }),
          precision: person.birth_precision,
          hasChart: Boolean(chart),
          transits: todayTransitsForChart(chart, now)
        };
      });
      setPersonSkies(skies);

      const threads = (threadRows ?? []) as Array<{ id: string; mode: "ask" | "shared" }>;
      if (threads.length === 0) {
        setThreadChips([]);
        await cacheSet(cacheKey, { welcomeName: profile?.display_name, people: castPeople, links: finalLinks, personSkies: skies, threadChips: [] });
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
        welcomeName: profile?.display_name,
        people: castPeople,
        links: finalLinks,
        personSkies: skies,
        threadChips: computedThreadChips
      });
    } catch (error) {
      const cached = await cacheGet<{
        welcomeName?: string;
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.ink, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={tokens.colors.gold} />
      </View>
    );
  }

  if (!session) {
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
        <Text style={{ color: tokens.colors.cream, fontSize: 34, fontWeight: "700" }}>Galaxia</Text>
        <Text style={{ color: tokens.colors.mist, lineHeight: 22 }}>
          Sign in to begin your private constellation. Start with yourself, then add loved ones at any birth-data precision.
        </Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={tokens.colors.mist2}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={{
            backgroundColor: tokens.colors.ink2,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: tokens.colors.cream
          }}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={tokens.colors.mist2}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            backgroundColor: tokens.colors.ink2,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: tokens.colors.cream
          }}
        />
        {error ? <Text style={{ color: tokens.colors.rose }}>{error}</Text> : null}
        <Pressable
          onPress={() => authenticate("sign-in")}
          disabled={submitting}
          style={{ backgroundColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 12 }}
        >
          <Text style={{ color: tokens.colors.ink, textAlign: "center", fontWeight: "700" }}>
            {submitting ? "Please wait..." : "Sign in"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => authenticate("sign-up")}
          disabled={submitting}
          style={{
            borderWidth: 1,
            borderColor: tokens.colors.line,
            borderRadius: 999,
            paddingVertical: 12
          }}
        >
          <Text style={{ color: tokens.colors.cream, textAlign: "center", fontWeight: "700" }}>Create account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 33, fontWeight: "700" }}>Galaxia Mea</Text>
      <Text style={{ color: tokens.colors.mist, lineHeight: 21 }}>Welcome back, {welcomeName}. Here’s your constellation at a glance.</Text>
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
            ? "Real transits, computed against each person's own chart."
            : "No tight transits touching anyone's chart right now."}
        </Text>
        {[...personSkies.filter((sky) => sky.isSelf), ...personSkies.filter((sky) => !sky.isSelf)].map((sky) => {
          const top = sky.transits[0];
          /* Same shared interpretTransit path as web home — minorSafe keeps
             a child's reading age-appropriate (§9/§13). No mobile-only copy. */
          const meaning = top
            ? interpretTransit(top, {
                possessive: sky.isSelf ? "your" : "their",
                minorSafe: sky.isMinor
              }).short
            : null;
          const proof = top
            ? `${transitNotation(top)} · ${top.orb.toFixed(1)}°${sky.transits.length > 1 ? ` (+${sky.transits.length - 1} more)` : ""}`
            : null;
          const hedge =
            sky.precision === "year"
              ? "Birth year only — a birth date is needed for daily transits."
              : !sky.hasChart
                ? "No birth data yet."
                : "No tight transits today.";
          return (
            <Link key={sky.id} href={{ pathname: "/profile/[personId]", params: { personId: sky.id } }} asChild>
              <Pressable
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  borderLeftWidth: 2,
                  borderLeftColor: top ? tokens.colors.gold : tokens.colors.line,
                  backgroundColor: top ? "rgba(230,174,108,0.06)" : "transparent",
                  gap: 2
                }}
              >
                <Text style={{ color: tokens.colors.cream, fontWeight: "600", fontSize: 13 }}>
                  {sky.isSelf ? "You" : sky.name}
                </Text>
                {meaning && proof ? (
                  <>
                    <Text style={{ color: tokens.colors.cream, fontSize: 12, lineHeight: 17 }}>{meaning}</Text>
                    <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>{proof}</Text>
                  </>
                ) : (
                  <Text style={{ color: tokens.colors.mist2, fontSize: 12, fontStyle: "italic" }}>{hedge}</Text>
                )}
              </Pressable>
            </Link>
          );
        })}
        <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>
          Nodes shimmer when a person has an active tight transit (orb ≤ 1.5°).
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
