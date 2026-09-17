import {
  DEFAULT_FETCH_TIMEOUT_MS,
  HONOR_RELATION_TYPE,
  buildHonorRelationshipInsert,
  connectionDiff,
  livingHonorCandidates,
  livingIdsFromHonorRows,
  shouldShowRemembranceSpace,
  withTimeout,
  type HonorPerson
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { REMEMBRANCE_CHROME } from "../lib/remembrance-chrome";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/typography";
import { GlassCard } from "./glass";

export const HONOR_LIGHT_ANCHOR_ID = "honor-light";

export const HONOR_LOADING = "Loading who carries their light.";
export const HONOR_LOAD_ERROR = "Who carries their light could not load. Try again.";
export const HONOR_SAVE_ERROR = "Who carries their light could not be saved. Try again.";

interface HonorPersonInput {
  id: string;
  display_name: string;
  passed_at?: string | null;
  is_self?: boolean;
}

export function HonorDeclarationBox({
  person,
  userId,
  subjectIsMinor,
  onSaved
}: {
  person: HonorPersonInput;
  userId: string;
  subjectIsMinor: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<HonorPerson[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [honorLoading, setHonorLoading] = useState(true);
  const [honorFailed, setHonorFailed] = useState(false);
  const [honorSaving, setHonorSaving] = useState(false);
  const [honorStatus, setHonorStatus] = useState<string | null>(null);

  const loadHonorConnections = useCallback(async () => {
    if (!userId || !person.id) return;
    setHonorLoading(true);
    setHonorFailed(false);
    setHonorStatus(null);
    try {
      await withTimeout(
        (async () => {
          const [{ data: peopleRows, error: peopleErr }, { data: relRows, error: relErr }] = await Promise.all([
            supabase
              .from("people")
              .select("id, display_name, is_self, is_minor, birth_date, birth_precision, passed_at")
              .eq("owner_id", userId)
              .order("created_at", { ascending: true }),
            supabase.from("relationships").select("id, person_a, person_b, relation_type").eq("owner_id", userId)
          ]);
          if (peopleErr || relErr) throw new Error("load");
          const people = (peopleRows ?? []) as HonorPerson[];
          const living = livingHonorCandidates(people, person.id);
          const declared = livingIdsFromHonorRows(
            (relRows ?? []) as Array<{ person_a: string; person_b: string; relation_type: string }>,
            person.id
          ).filter((id) => living.some((c) => c.id === id));
          setCandidates(living);
          setSavedIds(declared);
          setSelectedIds(declared);
        })(),
        DEFAULT_FETCH_TIMEOUT_MS
      );
    } catch {
      setHonorStatus(HONOR_LOAD_ERROR);
      setHonorFailed(true);
    } finally {
      setHonorLoading(false);
    }
  }, [userId, person.id]);

  useEffect(() => {
    void loadHonorConnections();
  }, [loadHonorConnections]);

  if (!shouldShowRemembranceSpace(person)) return null;

  const honorDirty = [...selectedIds].sort().join(",") !== [...savedIds].sort().join(",");

  function toggleCarrier(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setHonorStatus(null);
  }

  async function saveHonorConnections() {
    if (!userId || !person.id || honorSaving || !honorDirty) return;
    setHonorSaving(true);
    setHonorStatus(null);
    const { toAdd, toRemove } = connectionDiff(savedIds, selectedIds);

    for (const livingId of toRemove) {
      const { error } = await supabase
        .from("relationships")
        .delete()
        .eq("owner_id", userId)
        .eq("relation_type", HONOR_RELATION_TYPE)
        .or(
          `and(person_a.eq.${person.id},person_b.eq.${livingId}),and(person_a.eq.${livingId},person_b.eq.${person.id})`
        );
      if (error) {
        setHonorSaving(false);
        setHonorStatus(HONOR_SAVE_ERROR);
        return;
      }
    }

    for (const livingId of toAdd) {
      const row = buildHonorRelationshipInsert({
        ownerId: userId,
        passedPersonId: person.id,
        livingPersonId: livingId
      });
      const { error } = await supabase.from("relationships").insert(row);
      if (error) {
        setHonorSaving(false);
        setHonorStatus(HONOR_SAVE_ERROR);
        return;
      }
    }

    setSavedIds([...selectedIds]);
    setHonorSaving(false);
    setHonorStatus(
      selectedIds.length === 0
        ? "No one carries their light on the constellation: you can add someone anytime."
        : "Saved. Their light will reach the people you chose on your constellation."
    );
    onSaved?.();
  }

  return (
    <GlassCard
      testID={HONOR_LIGHT_ANCHOR_ID}
      style={{ borderColor: REMEMBRANCE_CHROME.border, backgroundColor: REMEMBRANCE_CHROME.background }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Who carries ${person.display_name}'s light`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={{ paddingVertical: 4 }}
      >
        <Text
          style={{
            color: REMEMBRANCE_CHROME.ancient,
            fontSize: 11,
            fontFamily: fonts.interSemi,
            letterSpacing: 1.2,
            textTransform: "uppercase"
          }}
        >
          Who carries their light?
        </Text>
      </Pressable>
      {open ? (
        <View style={{ gap: 10, marginTop: 12 }}>
          <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
            Choose the living people in your galaxy who hold a thread of continuity with {person.display_name}. Only
            what you pick is drawn: nothing is guessed.
            {subjectIsMinor ? " This is remembrance light, never romantic." : ""}
          </Text>
          {honorLoading ? (
            <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>{HONOR_LOADING}</Text>
          ) : honorFailed ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>{HONOR_LOAD_ERROR}</Text>
              <Pressable onPress={() => void loadHonorConnections()}>
                <Text style={{ color: tokens.colors.gold, fontFamily: fonts.interSemi }}>Try again</Text>
              </Pressable>
            </View>
          ) : candidates.length === 0 ? (
            <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
              Add someone living to your galaxy first. Then you can connect their light here.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {candidates.map((c) => {
                const checked = selectedIds.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={`${c.display_name}${c.is_self ? " (you)" : ""}`}
                    onPress={() => toggleCarrier(c.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      minHeight: 48,
                      borderWidth: 1,
                      borderColor: checked ? REMEMBRANCE_CHROME.water : "rgba(255,255,255,0.08)",
                      backgroundColor: checked ? "rgba(111,177,184,0.12)" : "rgba(255,255,255,0.03)"
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: REMEMBRANCE_CHROME.water,
                        backgroundColor: checked ? REMEMBRANCE_CHROME.water : "transparent"
                      }}
                    />
                    <Text style={{ color: tokens.colors.cream, fontSize: 15 }}>{c.is_self ? "You" : c.display_name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {candidates.length > 0 ? (
            <Pressable
              onPress={() => void saveHonorConnections()}
              disabled={honorSaving || !honorDirty}
              accessibilityRole="button"
              style={{
                alignSelf: "flex-start",
                backgroundColor: tokens.colors.gold,
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: honorSaving || !honorDirty ? 0.45 : 1,
                flexDirection: "row",
                gap: 8,
                alignItems: "center"
              }}
            >
              {honorSaving ? <ActivityIndicator size="small" color={tokens.colors.ink} /> : null}
              <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>
                {honorSaving
                  ? "Saving…"
                  : selectedIds.length === 0 && savedIds.length > 0
                    ? "Clear connections"
                    : "Save connections"}
              </Text>
            </Pressable>
          ) : null}
          {honorStatus ? (
            <Text style={{ color: REMEMBRANCE_CHROME.water, fontSize: 13, lineHeight: 20 }}>{honorStatus}</Text>
          ) : null}
        </View>
      ) : null}
    </GlassCard>
  );
}
