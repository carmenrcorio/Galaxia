import {
  captureMomentSnapshot,
  reflectMoment,
  type NatalChart
} from "@galaxia/astro";
import {
  MOMENT_NOTE_MAX,
  MOMENT_TYPE_IDS,
  MOMENT_TYPE_LABELS,
  momentRecordBody,
  orderPair,
  suggestPinTheme,
  type MomentTypeId
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/auth-provider";

interface PersonLite {
  id: string;
  display_name: string;
  is_self: boolean;
  passed_at: string | null;
}

// FOUNDER-REVIEW: authored. Mobile Moment flow copy.
const COPY = {
  eyebrow: "The Moment",
  title: "Sixty seconds",
  dek: "Person, what it was, two sentences if you want. The sky between you is attached automatically.",
  person: "Who is this about?",
  type: "What kind of moment?",
  note: "What happened (optional)",
  placeholder: "Two sentences is enough.",
  sky: "The current sky between you is attached. You never enter astrology data.",
  save: "Save this moment",
  reflection: "Vela's reflection",
  pin: "Pin this reflection",
  skip: "Skip",
  pinned: "Pinned to their record",
  openRecord: "Open their record",
  noPeople: "Add someone to your constellation before you can save a moment about them.",
  you: "You"
};

export default function MomentScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ personId?: string }>();
  const presetId = Array.isArray(params.personId) ? params.personId[0] : params.personId;

  const [people, setPeople] = useState<PersonLite[]>([]);
  const [charts, setCharts] = useState<Map<string, NatalChart>>(new Map());
  const [personId, setPersonId] = useState<string | null>(presetId ?? null);
  const [momentType, setMomentType] = useState<MomentTypeId | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  const self = people.find((p) => p.is_self) ?? null;
  const person = people.find((p) => p.id === personId) ?? null;

  useEffect(() => {
    if (!session?.user.id) return;
    void (async () => {
      const { data: rows } = await supabase
        .from("people")
        .select("id, display_name, is_self, passed_at")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: true });
      const list = (rows ?? []) as PersonLite[];
      setPeople(list);
      const ids = list.map((p) => p.id);
      if (ids.length === 0) return;
      const { data: chartRows } = await supabase.from("charts").select("person_id, data").in("person_id", ids);
      const next = new Map<string, NatalChart>();
      for (const row of chartRows ?? []) {
        if (row.person_id && row.data) next.set(row.person_id as string, row.data as NatalChart);
      }
      setCharts(next);
    })();
  }, [session?.user.id]);

  const save = async () => {
    if (!session?.user.id || !person || !momentType) return;
    const whenUTC = new Date().toISOString();
    const snapshot = captureMomentSnapshot({
      self: self
        ? { personId: self.id, chart: charts.get(self.id) ?? null, passedAt: self.passed_at, isSelf: true }
        : null,
      them: {
        personId: person.id,
        chart: charts.get(person.id) ?? null,
        passedAt: person.passed_at,
        isSelf: person.is_self
      },
      whenUTC
    });
    const text = reflectMoment({
      snapshot,
      personName: person.display_name,
      isSelf: person.is_self
    });
    const row: Record<string, unknown> = {
      owner_id: session.user.id,
      about_person: person.id,
      kind: "moment",
      body: momentRecordBody(momentType, note),
      tags: [momentType],
      transit_snapshot: snapshot,
      payload: { reflection: text, momentType }
    };
    if (self && self.id !== person.id) {
      const { pairLow, pairHigh } = orderPair(self.id, person.id);
      row.pair_low = pairLow;
      row.pair_high = pairHigh;
    }
    const { data, error } = await supabase.from("notes").insert(row).select("id").single();
    if (error || !data?.id) {
      setStatus(error?.message ?? "Could not save this moment.");
      return;
    }
    setSavedId(data.id as string);
    setReflection(text);
  };

  const pin = async () => {
    if (!session?.user.id || !person || !savedId || !reflection || pinned) return;
    const theme = suggestPinTheme(reflection);
    const row: Record<string, unknown> = {
      owner_id: session.user.id,
      about_person: person.id,
      kind: "vela_pin",
      body: reflection.trim(),
      theme,
      payload: { sourceMomentId: savedId }
    };
    if (self && self.id !== person.id) {
      const { pairLow, pairHigh } = orderPair(self.id, person.id);
      row.pair_low = pairLow;
      row.pair_high = pairHigh;
    }
    const { error } = await supabase.from("notes").insert(row);
    if (error) {
      setStatus(error.message);
      return;
    }
    setPinned(true);
  };

  const picker = self ? [self, ...people.filter((p) => !p.is_self)] : people;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 80 }}>
      <Text style={{ color: tokens.colors.goldSoft, letterSpacing: 1.2, fontSize: 12 }}>{COPY.eyebrow}</Text>
      <Text style={{ color: tokens.colors.cream, fontSize: 28, fontWeight: "700" }}>{COPY.title}</Text>
      <Text style={{ color: tokens.colors.mist, lineHeight: 21 }}>{COPY.dek}</Text>

      {people.length === 0 ? <Text style={{ color: tokens.colors.mist }}>{COPY.noPeople}</Text> : null}

      {!savedId && people.length > 0 ? (
        <View style={{ gap: 14 }}>
          <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>{COPY.person}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {picker.map((p) => {
              const on = personId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => { setPersonId(p.id); setMomentType(null); }}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: on ? tokens.colors.gold : tokens.colors.line,
                    backgroundColor: on ? "rgba(230,174,108,0.18)" : "transparent",
                    paddingHorizontal: 12,
                    paddingVertical: 8
                  }}
                >
                  <Text style={{ color: on ? tokens.colors.gold : tokens.colors.cream }}>
                    {p.is_self ? COPY.you : p.display_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {person ? (
            <>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>{COPY.type}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {MOMENT_TYPE_IDS.map((id) => {
                  const on = momentType === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setMomentType(id)}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: on ? tokens.colors.gold : tokens.colors.line,
                        backgroundColor: on ? "rgba(230,174,108,0.18)" : "transparent",
                        paddingHorizontal: 12,
                        paddingVertical: 8
                      }}
                    >
                      <Text style={{ color: on ? tokens.colors.gold : tokens.colors.cream }}>{MOMENT_TYPE_LABELS[id]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {person && momentType ? (
            <>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>{COPY.note}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                maxLength={MOMENT_NOTE_MAX}
                placeholder={COPY.placeholder}
                placeholderTextColor={tokens.colors.mist2}
                multiline
                style={{
                  backgroundColor: tokens.colors.ink3,
                  borderColor: tokens.colors.line,
                  borderWidth: 1,
                  borderRadius: 10,
                  color: tokens.colors.cream,
                  minHeight: 80,
                  textAlignVertical: "top",
                  padding: 10
                }}
              />
              <Text style={{ color: tokens.colors.mist, fontSize: 12 }}>{COPY.sky}</Text>
              <Pressable onPress={() => void save()} style={{ backgroundColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 12 }}>
                <Text style={{ color: tokens.colors.ink, fontWeight: "700", textAlign: "center" }}>{COPY.save}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {savedId && reflection && person ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: tokens.colors.goldSoft, letterSpacing: 1.2, fontSize: 12 }}>{COPY.reflection}</Text>
          <Text style={{ color: tokens.colors.cream, lineHeight: 22 }}>{reflection}</Text>
          {!pinned ? (
            <>
              <Pressable onPress={() => void pin()} style={{ backgroundColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 12 }}>
                <Text style={{ color: tokens.colors.ink, fontWeight: "700", textAlign: "center" }}>{COPY.pin}</Text>
              </Pressable>
              <Pressable onPress={() => router.push({ pathname: "/profile/[personId]", params: { personId: person.id } })}>
                <Text style={{ color: tokens.colors.goldSoft, textAlign: "center" }}>{COPY.skip}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: tokens.colors.mist }}>{COPY.pinned}</Text>
              <Pressable onPress={() => router.push({ pathname: "/profile/[personId]", params: { personId: person.id } })}>
                <Text style={{ color: tokens.colors.goldSoft }}>{COPY.openRecord}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
    </ScrollView>
  );
}
