import { computeSynastry, computeTransits, type NatalChart } from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";

interface PersonRow {
  id: string;
  display_name: string;
  birth_precision: "exact" | "date" | "year";
  is_self: boolean;
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

export default function HomeScreen() {
  const { session, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [welcomeName, setWelcomeName] = useState("stargazer");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [activeTransitIds, setActiveTransitIds] = useState<string[]>([]);
  const [todayTransitSummary, setTodayTransitSummary] = useState<string>("No notable transits today.");
  const [threadChips, setThreadChips] = useState<ThreadChip[]>([]);
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
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.45, duration: 1200, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

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

  const loadHome = async () => {
    if (!session?.user.id) return;
    const [{ data: profile }, { data: peopleRows }, { data: chartRows }, { data: threadRows }] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("id", session.user.id).single(),
      supabase.from("people").select("id, display_name, birth_precision, is_self").eq("owner_id", session.user.id).order("created_at", { ascending: true }),
      supabase.from("charts").select("person_id, data").in(
        "person_id",
        (
          (
            await supabase.from("people").select("id").eq("owner_id", session.user.id)
          ).data ?? []
        ).map((row) => row.id)
      ),
      supabase.from("threads").select("id, mode").eq("owner_id", session.user.id).order("created_at", { ascending: false }).limit(8)
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
    setLinks(calculatedLinks.sort((a, b) => b.score - a.score).slice(0, 14));

    const transitActive: string[] = [];
    let transitSummary = "No notable transits today.";
    const now = new Date().toISOString();
    for (const person of castPeople) {
      if (person.birth_precision === "year") continue;
      const chart = chartById.get(person.id);
      if (!chart) continue;
      const hits = computeTransits(chart, now);
      const tightHits = hits.filter((hit) => hit.orb <= 1.5);
      if (tightHits.length > 0) {
        transitActive.push(person.id);
      }
      if (person.is_self && tightHits[0]) {
        transitSummary = `${tightHits[0].summary} (${tightHits[0].orb.toFixed(1)}° orb).`;
      }
    }
    setActiveTransitIds(transitActive);
    setTodayTransitSummary(transitSummary);

    const threads = (threadRows ?? []) as Array<{ id: string; mode: "ask" | "shared" }>;
    if (threads.length === 0) {
      setThreadChips([]);
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

    setThreadChips(
      threads.map((thread) => ({
        id: thread.id,
        mode: thread.mode,
        preview: previewByThread.get(thread.id) ?? "Resume this thread"
      }))
    );
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
        <Text style={cardBody}>{todayTransitSummary}</Text>
        <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
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
          <Pressable style={pillButton}>
            <Text style={pillText}>Onboarding</Text>
          </Pressable>
        </Link>
        <Link href="/profile/self" asChild>
          <Pressable style={pillButton}>
            <Text style={pillText}>My profile</Text>
          </Pressable>
        </Link>
        <Link href="/compare" asChild>
          <Pressable style={pillButton}>
            <Text style={pillText}>Compare</Text>
          </Pressable>
        </Link>
        <Link href="/groups" asChild>
          <Pressable style={pillButton}>
            <Text style={pillText}>Groups</Text>
          </Pressable>
        </Link>
        <Link href="/vela" asChild>
          <Pressable style={pillButton}>
            <Text style={pillText}>Vela</Text>
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
