import { cohortOverlay, compareGenerational, type GenSignature, type NatalChart } from "@galaxia/astro";
import {
  OWNED_DELETE_COPY,
  formatGroupDeleteConfirmation,
  isBelowGroupMinimum
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";
import { useEntitlement } from "../src/providers/entitlement-provider";

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

/** Single source of truth for the currently loaded saved group (or null = new draft). */
interface LoadedGroup {
  id: string;
  name: string;
  kind: GroupKind;
  memberIds: string[];
}

interface CohortState {
  memberNames: string[];
  memberIds: string[];
  overlay: ReturnType<typeof cohortOverlay>;
  pairHighlights: Array<{ pair: string; summary: string }>;
}

function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/**
 * FOUNDER-REVIEW preview titles. Never title an unsaved composition as a saved group.
 * - dirty + loaded: "Unsaved preview, based on {group name}"
 * - dirty / no loaded: "Unsaved preview"
 * - clean + loaded: saved group name
 */
function previewTitle(
  loaded: LoadedGroup | null,
  form: { name: string; kind: GroupKind; memberIds: string[] }
): string {
  if (!loaded) return "Unsaved preview";
  const dirty =
    form.name.trim() !== loaded.name ||
    form.kind !== loaded.kind ||
    !sameMembers(form.memberIds, loaded.memberIds);
  if (dirty) return `Unsaved preview, based on ${loaded.name}`;
  return loaded.name;
}

export default function GroupsScreen() {
  const { session } = useAuth();
  const { canUseGroups } = useEntitlement();
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loadedGroup, setLoadedGroup] = useState<LoadedGroup | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupKind, setGroupKind] = useState<GroupKind>("group");
  const [status, setStatus] = useState<string | null>(null);
  const [cohort, setCohort] = useState<CohortState | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    void Promise.all([fetchPeople(), fetchGroups()]);
  }, [session?.user.id]);

  const formComposition = useMemo(
    () => ({ name: groupName, kind: groupKind, memberIds: selectedPersonIds }),
    [groupName, groupKind, selectedPersonIds]
  );

  const cohortTitle = previewTitle(loadedGroup, formComposition);

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

  const loadedBelowMinimum = Boolean(loadedGroup && isBelowGroupMinimum(loadedGroup.memberIds.length));

  /** Explicit new-group state: clears loaded group so the next Save creates. */
  const startNewGroup = () => {
    setLoadedGroup(null);
    setGroupName("");
    setGroupKind("group");
    setSelectedPersonIds([]);
    setCohort(null);
    setStatus(null);
  };

  const deleteLoadedGroup = async () => {
    if (!loadedGroup || !session?.user.id) return;
    const { count, error: countError } = await supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("group_id", loadedGroup.id);
    if (countError) {
      setStatus(countError.message);
      return;
    }
    // FOUNDER-REVIEW: formatGroupDeleteConfirmation
    const warning = formatGroupDeleteConfirmation(loadedGroup.name, count ?? 0);
    Alert.alert("Delete group", warning, [
      { text: "Cancel", style: "cancel" },
      {
        text: OWNED_DELETE_COPY.groupConfirmButton,
        style: "destructive",
        onPress: () => {
          void (async () => {
            const { error } = await supabase.rpc("delete_own_group", { p_group_id: loadedGroup.id });
            if (error) {
              setStatus(error.message || OWNED_DELETE_COPY.groupErrorGeneric);
              return;
            }
            startNewGroup();
            await fetchGroups();
            setStatus("Group deleted.");
          })();
        }
      }
    ]);
  };

  const saveGroup = async () => {
    if (!canUseGroups) {
      setStatus("Groups are available on Galaxia+. Upgrade in settings.");
      return;
    }
    if (!session?.user.id) return;
    if (groupName.trim().length < 2) {
      setStatus("Give the group a name.");
      return;
    }
    if (selectedPersonIds.length < 3) {
      setStatus("Select at least 3 people for a cohort.");
      return;
    }

    const name = groupName.trim();
    const userId = session.user.id;

    if (loadedGroup) {
      // UPDATE existing group (same id). Never silently insert a duplicate.
      const { error: groupError } = await supabase
        .from("groups")
        .update({ name, kind: groupKind })
        .eq("id", loadedGroup.id)
        .eq("owner_id", userId);
      if (groupError) {
        setStatus(groupError.message);
        return;
      }

      const prev = new Set(loadedGroup.memberIds);
      const next = new Set(selectedPersonIds);
      const toRemove = loadedGroup.memberIds.filter((id) => !next.has(id));
      const toAdd = selectedPersonIds.filter((id) => !prev.has(id));

      if (toRemove.length > 0) {
        const { error: delError } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", loadedGroup.id)
          .in("person_id", toRemove);
        if (delError) {
          setStatus(delError.message);
          return;
        }
      }
      if (toAdd.length > 0) {
        const { error: addError } = await supabase.from("group_members").insert(
          toAdd.map((personId) => ({ group_id: loadedGroup.id, person_id: personId }))
        );
        if (addError) {
          setStatus(addError.message);
          return;
        }
      }

      const updated: LoadedGroup = {
        id: loadedGroup.id,
        name,
        kind: groupKind,
        memberIds: [...selectedPersonIds],
      };
      setLoadedGroup(updated);
      setGroupName(name);
      await fetchGroups();
      await buildOverlay(selectedPersonIds);
      setStatus("Group updated.");
      return;
    }

    // CREATE: only when no group is loaded (explicit new-group state).
    const { data: createdGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        owner_id: userId,
        name,
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

    const created: LoadedGroup = {
      id: createdGroup.id,
      name: createdGroup.name,
      kind: createdGroup.kind as GroupKind,
      memberIds: [...selectedPersonIds],
    };
    setLoadedGroup(created);
    setGroupName(created.name);
    setGroupKind(created.kind);
    await fetchGroups();
    await buildOverlay(selectedPersonIds);
    setStatus("Group saved.");
  };

  const loadGroup = async (groupId: string) => {
    const row = groups.find((group) => group.id === groupId);
    if (!row) return;
    const { data, error } = await supabase.from("group_members").select("person_id").eq("group_id", groupId);
    if (error) {
      setStatus(error.message);
      return;
    }
    const ids = (data ?? []).map((rowData) => rowData.person_id as string);
    const next: LoadedGroup = {
      id: groupId,
      name: row.name,
      kind: row.kind,
      memberIds: ids,
    };
    // Load populates the full model + form (id, name, kind, members).
    setLoadedGroup(next);
    setGroupName(row.name);
    setGroupKind(row.kind);
    setSelectedPersonIds(ids);
    setStatus(null);
    // Local overlay only (charts already on-device). Do not gate on canUseGroups:
    // hasAccess defaults false until profile refresh, so a fast tap would clear
    // the overlay for a paying user. Save stays gated below.
    if (ids.length >= 3) await buildOverlay(ids);
    else {
      setCohort(null);
      if (isBelowGroupMinimum(ids.length)) setStatus(OWNED_DELETE_COPY.belowMinimumNotice);
    }
  };

  /**
   * Build the overlay locally only (no DB write). Accepts an explicit id list so
   * load/save can run without waiting for setState to propagate. Preview title
   * is derived at render from loadedGroup + form dirty state (never fabricated).
   * Ungated: compute uses charts the user already has; save/paywall is separate.
   */
  const buildOverlay = async (idsArg?: string[]) => {
    const ids = idsArg ?? selectedPersonIds;
    if (ids.length < 3) {
      setStatus("Pick at least 3 people to build cohort overlay.");
      return;
    }

    const selectedPeople = people.filter((person) => ids.includes(person.id));
    const chartResponses = await Promise.all(
      selectedPeople.map(async (person) => {
        const { data } = await supabase.from("charts").select("data").eq("person_id", person.id).single();
        return { person, chart: data?.data as NatalChart | undefined };
      })
    );

    const missing = chartResponses.find((response) => !response.chart?.generational);
    if (missing) {
      setStatus(`Missing chart for ${missing.person.display_name}.`);
      setCohort(null);
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

    setCohort({
      memberNames: selectedPeople.map((person) => person.display_name),
      memberIds: selectedPeople.map((person) => person.id),
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
      {!canUseGroups ? <Text style={{ color: tokens.colors.goldSoft }}>Galaxia+ required for groups/cohorts.</Text> : null}

      <View style={cardStyle}>
        <Text style={cardTitle}>Saved groups</Text>
        {groups.length === 0 ? (
          <Text style={cardBody}>No groups yet. Create one below.</Text>
        ) : (
          groups.map((group) => (
            <Pressable
              key={group.id}
              onPress={() => loadGroup(group.id)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: loadedGroup?.id === group.id ? tokens.colors.gold : tokens.colors.line,
                padding: 10
              }}
            >
              <Text style={{ color: loadedGroup?.id === group.id ? tokens.colors.gold : tokens.colors.cream, fontWeight: "700" }}>{group.name}</Text>
              <Text style={{ color: tokens.colors.mist }}>{group.kind}</Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={cardStyle}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={cardTitle}>{loadedGroup ? "Edit cohort" : "Create cohort"}</Text>
          {loadedGroup ? (
            <Pressable
              onPress={startNewGroup}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: tokens.colors.line,
                paddingHorizontal: 12,
                paddingVertical: 6
              }}
            >
              <Text style={{ color: tokens.colors.cream, fontSize: 13 }}>New group</Text>
            </Pressable>
          ) : null}
        </View>
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
        {loadedBelowMinimum ? <Text style={cardBody}>{OWNED_DELETE_COPY.belowMinimumNotice}</Text> : null}
        <Pressable onPress={saveGroup} style={primaryButtonStyle}>
          <Text style={primaryLabelStyle}>{loadedGroup ? "Update group" : "Save group"}</Text>
        </Pressable>
        <Pressable
          onPress={() => buildOverlay()}
          disabled={loadedBelowMinimum}
          style={{
            ...primaryButtonStyle,
            backgroundColor: tokens.colors.ink,
            borderWidth: 1,
            borderColor: tokens.colors.goldSoft,
            opacity: loadedBelowMinimum ? 0.45 : 1
          }}
        >
          <Text style={{ ...primaryLabelStyle, color: tokens.colors.cream }}>Generate cohort overlay</Text>
        </Pressable>
        {loadedGroup ? (
          <Pressable
            onPress={() => void deleteLoadedGroup()}
            style={{
              ...primaryButtonStyle,
              backgroundColor: tokens.colors.ink,
              borderWidth: 1,
              borderColor: "rgba(218,140,140,.55)"
            }}
          >
            <Text style={{ ...primaryLabelStyle, color: "#da8c8c" }}>{OWNED_DELETE_COPY.groupConfirmButton}</Text>
          </Pressable>
        ) : null}
      </View>

      {cohort ? (
        <>
          <View style={cardStyle}>
            <Text style={cardTitle}>{cohortTitle}</Text>
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
