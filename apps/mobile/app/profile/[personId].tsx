import type { NatalChart } from "@galaxia/astro";
import { describeGenerationalArchetype } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/auth-provider";

interface PersonRow {
  id: string;
  display_name: string;
  relation: string;
  birth_precision: "exact" | "date" | "year";
}

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
}

function elementForSign(sign: string): "fire" | "earth" | "air" | "water" {
  if (["Aries", "Leo", "Sagittarius"].includes(sign)) return "fire";
  if (["Taurus", "Virgo", "Capricorn"].includes(sign)) return "earth";
  if (["Gemini", "Libra", "Aquarius"].includes(sign)) return "air";
  return "water";
}

export default function PersonProfileScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { session } = useAuth();
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const resolvedPersonId = useMemo(() => (Array.isArray(personId) ? personId[0] : personId), [personId]);

  useEffect(() => {
    if (!session?.user.id || !resolvedPersonId) return;
    void loadProfile();
  }, [resolvedPersonId, session?.user.id]);

  const loadProfile = async () => {
    if (!session?.user.id || !resolvedPersonId) return;

    const actualPersonId =
      resolvedPersonId === "self"
        ? (
            await supabase
              .from("people")
              .select("id")
              .eq("owner_id", session.user.id)
              .eq("is_self", true)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()
          ).data?.id
        : resolvedPersonId;

    if (!actualPersonId) {
      setStatus("No self profile found yet. Save yourself in onboarding first.");
      return;
    }

    const [{ data: personData, error: personError }, { data: chartData, error: chartError }, { data: noteData, error: noteError }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation, birth_precision").eq("id", actualPersonId).single(),
      supabase.from("charts").select("data").eq("person_id", actualPersonId).single(),
      supabase.from("notes").select("id, body, created_at").eq("about_person", actualPersonId).order("created_at", { ascending: false }).limit(20)
    ]);

    if (personError || !personData) {
      setStatus(personError?.message ?? "Unable to load person.");
      return;
    }
    if (chartError || !chartData) {
      setStatus(chartError?.message ?? "Unable to load chart.");
      return;
    }
    if (noteError) {
      setStatus(noteError.message);
    }

    setPerson(personData);
    setChart(chartData.data as NatalChart);
    setNotes(noteData ?? []);
  };

  const saveNote = async () => {
    if (!session?.user.id || !person?.id || !noteDraft.trim()) return;
    const { error } = await supabase.from("notes").insert({
      owner_id: session.user.id,
      about_person: person.id,
      body: noteDraft.trim()
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setNoteDraft("");
    await loadProfile();
  };

  const elementBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce(
      (acc, placement) => {
        acc[elementForSign(placement.sign)] += 1;
        return acc;
      },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  if (!person || !chart) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.ink, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: tokens.colors.cream, textAlign: "center" }}>{status ?? "Loading profile..."}</Text>
        <Link href="/onboarding" asChild>
          <Pressable style={{ marginTop: 14, backgroundColor: tokens.colors.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: tokens.colors.ink, fontWeight: "700" }}>Back to onboarding</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const sun = chart.placements.find((placement) => placement.body === "sun");
  const moon = chart.placements.find((placement) => placement.body === "moon");
  const rising = chart.asc;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink2 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 90 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 31, fontWeight: "700" }}>{person.display_name}</Text>
      <Text style={{ color: tokens.colors.mist }}>
        {person.relation} · {person.birth_precision}
      </Text>

      <View style={cardStyle}>
        <Text style={cardTitle}>Big Three</Text>
        <Text style={cardBody}>Sun: {sun?.sign ?? "—"}</Text>
        <Text style={cardBody}>Moon: {moon?.sign ?? "—"}</Text>
        <Text style={cardBody}>Rising: {rising ?? "Unavailable without exact time/location"}</Text>
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>{chart.precision === "exact" ? "Natal wheel" : "Sign strip"}</Text>
        {chart.precision === "exact" ? (
          <View style={{ borderRadius: 999, borderWidth: 1, borderColor: tokens.colors.gold, width: 220, height: 220, alignSelf: "center", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: tokens.colors.gold }}>Wheel placeholder</Text>
            <Text style={{ color: tokens.colors.mist, fontSize: 12, marginTop: 4 }}>SVG wheel component next slice</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {chart.placements.map((placement) => (
              <View key={placement.body} style={{ borderRadius: 999, borderWidth: 1, borderColor: tokens.colors.line, paddingVertical: 6, paddingHorizontal: 10 }}>
                <Text style={{ color: tokens.colors.cream, textTransform: "capitalize" }}>
                  {placement.body}: {placement.sign}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Elemental balance</Text>
        {elementBalance ? (
          <Text style={cardBody}>
            Fire {elementBalance.fire} · Earth {elementBalance.earth} · Air {elementBalance.air} · Water {elementBalance.water}
          </Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Placements</Text>
        {chart.placements.map((placement) => (
          <Text key={placement.body} style={cardBody}>
            {placement.body.toUpperCase()} {placement.sign} {placement.degree.toFixed(1)}°{placement.house ? ` · House ${placement.house}` : ""}
          </Text>
        ))}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Generational layer</Text>
        <Text style={badgeStyle}>Reads from your birth year</Text>
        <Text style={cardBody}>{chart.generational.cohortLabel}</Text>
        <Text style={cardBody}>
          Uranus in {chart.generational.uranus.sign}: {describeGenerationalArchetype("Uranus", chart.generational.uranus.sign)}
        </Text>
        <Text style={cardBody}>
          Neptune in {chart.generational.neptune.sign}: {describeGenerationalArchetype("Neptune", chart.generational.neptune.sign)}
        </Text>
        <Text style={cardBody}>
          Pluto in {chart.generational.pluto.sign}: {describeGenerationalArchetype("Pluto", chart.generational.pluto.sign)}
        </Text>
        {chart.precision === "exact" ? (
          <Text style={[cardBody, { color: tokens.colors.goldSoft }]}>
            Houses: Uranus {chart.generational.uranusHouse ?? "—"} · Neptune {chart.generational.neptuneHouse ?? "—"} · Pluto {chart.generational.plutoHouse ?? "—"}
          </Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Private notes</Text>
        <TextInput
          value={noteDraft}
          onChangeText={setNoteDraft}
          placeholder="Log a private moment..."
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
        <Pressable onPress={saveNote} style={{ backgroundColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 10 }}>
          <Text style={{ color: tokens.colors.ink, fontWeight: "700", textAlign: "center" }}>Save private note</Text>
        </Pressable>
        {notes.length === 0 ? (
          <Text style={cardBody}>No notes yet. Notes are owner-only and never shared.</Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={{ borderWidth: 1, borderColor: tokens.colors.line, borderRadius: 10, padding: 10 }}>
              <Text style={{ color: tokens.colors.cream }}>{note.body}</Text>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12, marginTop: 4 }}>{new Date(note.created_at).toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
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

const badgeStyle = {
  alignSelf: "flex-start",
  backgroundColor: tokens.colors.ink,
  color: tokens.colors.gold,
  borderWidth: 1,
  borderColor: tokens.colors.goldSoft,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
  overflow: "hidden"
} as const;
