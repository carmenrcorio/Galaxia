import { tokens } from "@galaxia/ui";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { cacheGet, cacheSet } from "../src/lib/cache";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";
import { useEntitlement } from "../src/providers/entitlement-provider";

type VelaMode = "ask" | "shared";
type Scope = "person" | "pair" | "group";

interface PersonLite {
  id: string;
  display_name: string;
  is_minor: boolean;
}

interface GroupLite {
  id: string;
  name: string;
}

interface ChatLine {
  role: "user" | "vela" | "system";
  text: string;
}

export default function VelaScreen() {
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const { session } = useAuth();
  const { canUseSharedSpaces, canSendVelaMessage, recordVelaMessageSent, dailyVelaLimit, velaUsedToday, tier } = useEntitlement();
  const [mode, setMode] = useState<VelaMode>("ask");
  const [scope, setScope] = useState<Scope>("person");
  const [relationshipType, setRelationshipType] = useState("general");
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [subjectPersonId, setSubjectPersonId] = useState<string | null>(null);
  const [pairPersonId, setPairPersonId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([
    {
      role: "system",
      text: "Private by default. In shared mode, no private notes are passed and consent is required."
    }
  ]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const initialThreadId = useMemo(() => {
    const value = params.threadId;
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }, [params.threadId]);

  useEffect(() => {
    if (!session?.user.id) return;
    void fetchScopeData();
  }, [session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || !initialThreadId) return;
    setThreadId(initialThreadId);
    void loadThreadHistory(initialThreadId);
  }, [initialThreadId, session?.user.id]);

  const selectedSubject = useMemo(() => people.find((person) => person.id === subjectPersonId) ?? null, [people, subjectPersonId]);
  const selectedPair = useMemo(() => people.find((person) => person.id === pairPersonId) ?? null, [people, pairPersonId]);
  const selectedGroup = useMemo(() => groups.find((group) => group.id === groupId) ?? null, [groups, groupId]);

  const minorInScope = useMemo(() => {
    if (scope === "person") return selectedSubject?.is_minor ?? false;
    if (scope === "pair") return Boolean(selectedSubject?.is_minor || selectedPair?.is_minor);
    return false;
  }, [scope, selectedSubject?.is_minor, selectedPair?.is_minor]);

  const sharedBlocked = mode === "shared" && minorInScope;
  const dailyBlocked = !canSendVelaMessage();

  const fetchScopeData = async () => {
    const [{ data: peopleData }, { data: groupData }] = await Promise.all([
      supabase.from("people").select("id, display_name, is_minor").eq("owner_id", session?.user.id).order("display_name", { ascending: true }),
      supabase.from("groups").select("id, name").eq("owner_id", session?.user.id).order("name", { ascending: true })
    ]);
    const allPeople = (peopleData ?? []) as PersonLite[];
    setPeople(allPeople);
    setGroups((groupData ?? []) as GroupLite[]);
    if (!subjectPersonId && allPeople[0]) setSubjectPersonId(allPeople[0].id);
    if (!pairPersonId && allPeople[1]) setPairPersonId(allPeople[1].id);
    if (!groupId && groupData?.[0]) setGroupId(groupData[0].id as string);
  };

  const loadThreadHistory = async (targetThreadId: string) => {
    const cacheKey = `vela_thread:${targetThreadId}`;
    const cached = await cacheGet<ChatLine[]>(cacheKey);
    if (cached && cached.length > 0) {
      setLines(cached);
    }

    const { data, error } = await supabase
      .from("messages")
      .select("sender, body")
      .eq("thread_id", targetThreadId)
      .order("created_at", { ascending: true })
      .limit(80);
    if (error) {
      setStatus(error.message);
      return;
    }
    const restored: ChatLine[] = [
      {
        role: "system",
        text: "Resumed thread. Private by default; shared mode excludes private notes."
      },
      ...(data ?? []).map((row) => ({
        role: row.sender === "vela" ? ("vela" as const) : ("user" as const),
        text: row.body as string
      }))
    ];
    setLines(restored);
    await cacheSet(cacheKey, restored);
    setStatus("Thread restored.");
  };

  const functionUrl = useMemo(() => {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
    const base = env.EXPO_PUBLIC_SUPABASE_URL;
    return base ? `${base}/functions/v1/vela-chat` : null;
  }, []);

  const sendConsent = async () => {
    if (!functionUrl || !session?.access_token) return;
    if (!threadId) {
      setStatus("Start a shared chat first to create a thread.");
      return;
    }
    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        action: "consent",
        mode,
        threadId
      })
    });
    if (!res.ok) {
      const body = await safeJson(res);
      setStatus(body?.error ?? "Unable to save consent.");
      return;
    }
    setStatus("Consent captured for this thread.");
  };

  const sendMessage = async () => {
    if (sending || !functionUrl || !session?.access_token || !message.trim()) return;
    if (dailyBlocked) {
      setStatus(`Daily Vela limit reached (${dailyVelaLimit}) on Free plan. Upgrade to Galaxia+ for unlimited.`);
      return;
    }
    if (mode === "shared" && !canUseSharedSpaces) {
      setStatus("Shared spaces are available on Galaxia+.");
      return;
    }
    if (sharedBlocked) {
      setStatus("Shared mode is disabled when a minor is in scope. Switch to ask mode for parenting guidance.");
      return;
    }
    if (!subjectPersonId && scope !== "group") {
      setStatus("Choose a person.");
      return;
    }
    if (scope === "pair" && (!subjectPersonId || !pairPersonId || subjectPersonId === pairPersonId)) {
      setStatus("Pick two different people for pair mode.");
      return;
    }
    if (scope === "group" && !groupId) {
      setStatus("Choose a group.");
      return;
    }

    const userText = message.trim();
    setMessage("");
    setSending(true);
    setStatus(null);
    setLines((current) => [...current, { role: "user", text: userText }, { role: "vela", text: "" }]);

    try {
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: "chat",
          mode,
          threadId,
          relationshipType,
          subjectPersonId: scope === "group" ? undefined : subjectPersonId,
          pairPersonIds: scope === "pair" && subjectPersonId && pairPersonId ? [subjectPersonId, pairPersonId] : undefined,
          groupId: scope === "group" ? groupId : undefined,
          userMessage: userText
        })
      });

      const nextThreadId = res.headers.get("x-thread-id");
      if (nextThreadId) setThreadId(nextThreadId);

      if (!res.ok) {
        const body = await safeJson(res);
        const errorMessage = body?.error ?? `Vela request failed (${res.status})`;
        setLines((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "vela", text: errorMessage };
          return next;
        });
        setStatus(errorMessage);
        return;
      }

      if (!res.body) {
        const text = await res.text();
        setLines((current) => {
          const next = [...current];
          next[next.length - 1] = { role: "vela", text: text || "Vela response unavailable." };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamed = "";
      while (!done) {
        const chunk = await reader.read();
        done = chunk.done;
        if (chunk.value) {
          streamed += decoder.decode(chunk.value, { stream: true });
          setLines((current) => {
            const next = [...current];
            next[next.length - 1] = { role: "vela", text: streamed };
            return next;
          });
        }
      }
      await recordVelaMessageSent();
      if (threadId) {
        await cacheSet(`vela_thread:${threadId}`, lines);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Network error talking to Vela.";
      setStatus(messageText);
      setLines((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "vela", text: messageText };
        return next;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink2 }} contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 12 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 30, fontWeight: "700" }}>Vela</Text>
      <Text style={{ color: tokens.colors.mist, lineHeight: 21 }}>
        Warm astrologer + practical coach, grounded in computed facts only.
      </Text>
      <Text style={{ color: tokens.colors.goldSoft }}>
        Plan: {tier === "plus" ? "Galaxia+" : "Free"} · {tier === "plus" ? "unlimited Vela" : `${dailyVelaLimit - velaUsedToday} messages left today`}
      </Text>

      <View style={cardStyle}>
        <Text style={cardTitle}>Mode</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["ask", "shared"] as VelaMode[]).map((value) => (
            <Pressable key={value} onPress={() => setMode(value)} style={chip(mode === value)}>
              <Text style={{ color: mode === value ? tokens.colors.gold : tokens.colors.cream }}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={cardBody}>
          {mode === "ask"
            ? "Ask mode is private and can include your private notes."
            : "Shared mode is neutral for all participants. Consent is required."}
        </Text>
        {mode === "shared" && !canUseSharedSpaces ? (
          <Text style={{ color: tokens.colors.goldSoft }}>Shared mode requires Galaxia+.</Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Scope</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["person", "pair", "group"] as Scope[]).map((value) => (
            <Pressable key={value} onPress={() => setScope(value)} style={chip(scope === value)}>
              <Text style={{ color: scope === value ? tokens.colors.gold : tokens.colors.cream }}>{value}</Text>
            </Pressable>
          ))}
        </View>

        {scope !== "group" ? (
          <>
            <Text style={labelStyle}>Primary person</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {people.map((person) => (
                <Pressable key={person.id} onPress={() => setSubjectPersonId(person.id)} style={chip(subjectPersonId === person.id)}>
                  <Text style={{ color: subjectPersonId === person.id ? tokens.colors.gold : tokens.colors.cream }}>
                    {person.display_name}
                    {person.is_minor ? " (minor)" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {scope === "pair" ? (
          <>
            <Text style={labelStyle}>Second person</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {people.map((person) => (
                <Pressable key={`pair-${person.id}`} onPress={() => setPairPersonId(person.id)} style={chip(pairPersonId === person.id)}>
                  <Text style={{ color: pairPersonId === person.id ? tokens.colors.gold : tokens.colors.cream }}>
                    {person.display_name}
                    {person.is_minor ? " (minor)" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {scope === "group" ? (
          <>
            <Text style={labelStyle}>Group</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {groups.map((group) => (
                <Pressable key={group.id} onPress={() => setGroupId(group.id)} style={chip(groupId === group.id)}>
                  <Text style={{ color: groupId === group.id ? tokens.colors.gold : tokens.colors.cream }}>{group.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <TextInput
          value={relationshipType}
          onChangeText={setRelationshipType}
          placeholder="relationship type (partner, sibling, general)"
          placeholderTextColor={tokens.colors.mist2}
          style={inputStyle}
        />

        {sharedBlocked ? <Text style={{ color: tokens.colors.rose }}>Minor safety rule: shared mode disabled for this scope.</Text> : null}
      </View>

      {mode === "shared" ? (
        <View style={cardStyle}>
          <Text style={cardTitle}>Consent gate</Text>
          <Text style={cardBody}>Shared threads need consented participants before Vela can respond in shared mode.</Text>
          <Pressable onPress={sendConsent} style={outlineButton}>
            <Text style={{ color: tokens.colors.cream, textAlign: "center", fontWeight: "700" }}>Confirm my consent for this thread</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={cardStyle}>
        <Text style={cardTitle}>Chat</Text>
        {lines.map((line, index) => (
          <View
            key={`${line.role}-${index}`}
            style={{
              alignSelf: line.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "90%",
              backgroundColor:
                line.role === "user" ? tokens.colors.goldSoft : line.role === "system" ? tokens.colors.ink : tokens.colors.ink2,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: line.role === "user" ? tokens.colors.gold : tokens.colors.line,
              padding: 10
            }}
          >
            <Text style={{ color: line.role === "user" ? tokens.colors.ink : tokens.colors.cream, lineHeight: 20 }}>{line.text}</Text>
          </View>
        ))}

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Ask Vela about this relationship dynamic..."
          placeholderTextColor={tokens.colors.mist2}
          multiline
          style={{ ...inputStyle, minHeight: 88, textAlignVertical: "top" }}
        />
        <Pressable onPress={sendMessage} disabled={sending} style={primaryButton}>
          <Text style={{ color: tokens.colors.ink, textAlign: "center", fontWeight: "700" }}>{sending ? "Vela is typing..." : "Send"}</Text>
        </Pressable>
      </View>

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
      <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
        Safety note: if someone may be in immediate danger, contact local emergency services or a crisis line now.
      </Text>
    </ScrollView>
  );
}

async function safeJson(response: Response) {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return null;
  }
}

function chip(active: boolean) {
  return {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: active ? tokens.colors.gold : tokens.colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8
  } as const;
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

const labelStyle = {
  color: tokens.colors.cream
} as const;

const inputStyle = {
  backgroundColor: tokens.colors.ink2,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  color: tokens.colors.cream,
  paddingHorizontal: 12,
  paddingVertical: 10
} as const;

const primaryButton = {
  backgroundColor: tokens.colors.gold,
  borderRadius: 999,
  paddingVertical: 12
} as const;

const outlineButton = {
  borderWidth: 1,
  borderColor: tokens.colors.goldSoft,
  borderRadius: 999,
  paddingVertical: 12
} as const;
