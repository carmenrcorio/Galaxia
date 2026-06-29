import { cohortOverlay, compareGenerational, type GenSignature, type NatalChart } from "@galaxia/astro";
import { tokens } from "@galaxia/ui";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";

type GroupKind = "siblings" | "friends" | "family" | "group";

interface PersonLite {
  id: string;
  display_name: string;
}

interface GroupRow {
  id: string;
  name: string;
  kind: GroupKind;
}

interface CohortState {
  groupLabel: string;
  memberNames: string[];
  overlay: ReturnType<typeof cohortOverlay>;
  pairHighlights: Array<{ pair: string; summary: string }>;
}

export default function GroupsScreen() {
  const { session } = useAuth();
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupKind, setGroupKind] = useState<GroupKind>("group");
  const [status, setStatus] = useState<string | null>(null);
  const [cohort, setCohort] = useState<CohortState | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    void Promise.all([fetchPeople(), fetchGroups()]);
  }, [session?.user.id]);

  const selectedNames = useMemo(
    () => people.filter((person) => selectedPersonIds.includes(person.id)).map((person) => person.display_name),
    [people, selectedPersonIds]
  );

  const fetchPeople = async () => {
    if (!session?.user.id) return;
    const { data, error } = await supabase
      .from("people")
      .select("id, display_name")
      .eq("owner_id", session.user.id)
      .order("display_name", { ascending: true });
    if (error) {
      setStatus(error.message);
      return;
    }
    setPeople((data ?? []) as PersonLite[]);
  };

  const fetchGroups = async () => {
    if (!session?.user.id) return;
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, kind")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setStatus(error.message);
      return;
    }
    setGroups((data ?? []) as GroupRow[]);
  };

  const toggleSelection = (personId: string) => {
    setSelectedPersonIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]
    );
  };

  const saveGroup = async () => {
    if (!session?.user.id) return;
    if (groupName.trim().length < 2) {
      setStatus("Give the group a name.");
      return;
    }
    if (selectedPersonIds.length < 3) {
      setStatus("Select at least 3 people for a cohort.");
      return;
    }

    const { data: createdGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        owner_id: session.user.id,
        name: groupName.trim(),
        kind: groupKind
      })
      .select("id, name, kind")
      .single();

    if (groupError || !createdGroup) {
      setStatus(groupError?.message ?? "Unable to create group.");
      return;
    }

    const memberRows = selectedPersonIds.map((personId) => ({ group_id: createdGroup.id, person_id: personId }));
    const { error: memberError } = await supabase.from("group_members").insert(memberRows);
    if (memberError) {
      setStatus(memberError.message);
      return;
    }

    setGroupName("");
    setGroupKind("group");
    setSelectedPersonIds([]);
    setSelectedGroupId(createdGroup.id);
    await fetchGroups();
    setStatus("Group saved.");
  };

  const loadGroupMembers = async (groupId: string) => {
    setSelectedGroupId(groupId);
    const { data, error } = await supabase.from("group_members").select("person_id").eq("group_id", groupId);
    if (error) {
      setStatus(error.message);
      return;
    }
    setSelectedPersonIds((data ?? []).map((row) => row.person_id as string));
  };

  const buildOverlay = async () => {
    if (selectedPersonIds.length < 3) {
      setStatus("Pick at least 3 people to build cohort overlay.");
      return;
    }

    const selectedPeople = people.filter((person) => selectedPersonIds.includes(person.id));
    const chartResponses = await Promise.all(
      selectedPeople.map(async (person) => {
        const { data } = await supabase.from("charts").select("data").eq("person_id", person.id).single();
        return { person, chart: data?.data as NatalChart | undefined };
      })
    );

    const missing = chartResponses.find((response) => !response.chart?.generational);
    if (missing) {
      setStatus(`Missing chart for ${missing.person.display_name}.`);
      return;
    }

    const overlay = cohortOverlay(
      chartResponses.map((row) => ({
        name: row.person.display_name,
        gen: row.chart!.generational as GenSignature
      }))
    );

    // Keep this bounded: top 3 pair highlights using generational relation only.
    const pairHighlights: Array<{ pair: string; summary: string }> = [];
    for (let i = 0; i < chartResponses.length; i += 1) {
      for (let j = i + 1; j < chartResponses.length; j += 1) {
        const a = chartResponses[i];
        const b = chartResponses[j];
        const relation = compareGenerational(a.chart!.generational as GenSignature, b.chart!.generational as GenSignature);
        pairHighlights.push({
          pair: `${a.person.display_name} × ${b.person.display_name}`,
          summary: relation.sameGeneration
            ? `Mostly same generation (${relation.shared.map((item) => `${item.planet} ${item.sign}`).join(", ")}).`
            : `Fault line: ${relation.diverged.map((item) => `${item.planet} ${item.signA}/${item.signB}`).join(" · ")}.`
        });
      }
    }

    const groupLabel = groups.find((group) => group.id === selectedGroupId)?.name ?? "Ad-hoc cohort";
    setCohort({
      groupLabel,
      memberNames: selectedPeople.map((person) => person.display_name),
      overlay,
      pairHighlights: pairHighlights.slice(0, 3)
    });
    setStatus(null);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink2 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 30, fontWeight: "700" }}>Groups & Cohorts</Text>
      <Text style={{ color: tokens.colors.mist, lineHeight: 21 }}>
        Build sibling/friend/family sets and see shared sky + generational fault lines.
      </Text>

      <View style={cardStyle}>
        <Text style={cardTitle}>Saved groups</Text>
        {groups.length === 0 ? (
          <Text style={cardBody}>No groups yet. Create one below.</Text>
        ) : (
          groups.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => loadGroupMembers(group.id)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: selectedGroupId === group.id ? tokens.colors.gold : tokens.colors.line,
                padding: 10
              }}
            >
              <Text style={{ color: selectedGroupId === group.id ? tokens.colors.gold : tokens.colors.cream, fontWeight: "700" }}>{group.name}</Text>
              <Text style={{ color: tokens.colors.mist }}>{group.kind}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Create / edit cohort</Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Group name (e.g. Siblings)"
          placeholderTextColor={tokens.colors.mist2}
          style={fieldStyle}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["siblings", "friends", "family", "group"] as GroupKind[]).map((kind) => (
            <Pressable
              key={kind}
              onPress={() => setGroupKind(kind)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: groupKind === kind ? tokens.colors.gold : tokens.colors.line,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <Text style={{ color: groupKind === kind ? tokens.colors.gold : tokens.colors.cream }}>{kind}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={labelStyle}>Select members (3+)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {people.map((person) => {
            const selected = selectedPersonIds.includes(person.id);
            return (
              <Pressable
                key={person.id}
                onPress={() => toggleSelection(person.id)}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selected ? tokens.colors.gold : tokens.colors.line,
                  paddingHorizontal: 12,
                  paddingVertical: 8
                }}
              >
                <Text style={{ color: selected ? tokens.colors.gold : tokens.colors.cream }}>{person.display_name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={cardBody}>Selected: {selectedNames.length > 0 ? selectedNames.join(", ") : "none"}</Text>
        <Pressable onPress={saveGroup} style={primaryButtonStyle}>
          <Text style={primaryLabelStyle}>Save group</Text>
        </Pressable>
        <Pressable
          onPress={buildOverlay}
          style={{ ...primaryButtonStyle, backgroundColor: tokens.colors.ink, borderWidth: 1, borderColor: tokens.colors.goldSoft }}
        >
          <Text style={{ ...primaryLabelStyle, color: tokens.colors.cream }}>Generate cohort overlay</Text>
        </Pressable>
      </View>

      {cohort ? (
        <>
          <View style={cardStyle}>
            <Text style={cardTitle}>{cohort.groupLabel}</Text>
            <Text style={cardBody}>Members: {cohort.memberNames.join(", ")}</Text>
            <Text style={[cardBody, { color: tokens.colors.goldSoft }]}>{cohort.overlay.label}</Text>
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>Shared sky</Text>
            {cohort.overlay.sharedSky.length === 0 ? (
              <Text style={cardBody}>No full-group shared outer-planet signatures.</Text>
            ) : (
              cohort.overlay.sharedSky.map((item) => (
                <Text key={`${item.planet}-${item.sign}`} style={cardBody}>
                  {item.planet.toUpperCase()} in {item.sign}
                </Text>
              ))
            )}
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>Fault lines</Text>
            {cohort.overlay.faultLines.length === 0 ? (
              <Text style={cardBody}>No major splits. This group is one generation sky-wise.</Text>
            ) : (
              cohort.overlay.faultLines.map((line) => (
                <View key={line.planet} style={{ gap: 4 }}>
                  <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>{line.planet.toUpperCase()}</Text>
                  {line.groups.map((group) => (
                    <Text key={`${line.planet}-${group.sign}`} style={cardBody}>
                      {group.sign}: {group.names.join(", ")}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>Light pair highlights</Text>
            {cohort.pairHighlights.map((item) => (
              <View key={item.pair} style={{ borderRadius: 10, borderWidth: 1, borderColor: tokens.colors.line, padding: 10, gap: 4 }}>
                <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>{item.pair}</Text>
                <Text style={cardBody}>{item.summary}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

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

const fieldStyle = {
  backgroundColor: tokens.colors.ink2,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  color: tokens.colors.cream,
  paddingHorizontal: 12,
  paddingVertical: 10
} as const;

const labelStyle = {
  color: tokens.colors.cream
} as const;

const primaryButtonStyle = {
  backgroundColor: tokens.colors.gold,
  borderRadius: 999,
  paddingVertical: 12
} as const;

const primaryLabelStyle = {
  color: tokens.colors.ink,
  textAlign: "center",
  fontWeight: "700"
} as const;
