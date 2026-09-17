import {
  DECLARED_BOND_LABELS,
  DECLARED_BOND_TYPES,
  DEFAULT_FETCH_TIMEOUT_MS,
  buildRelationshipInsert,
  canonicalRelationshipPair,
  declaredBondExists,
  declaredBondsFromRows,
  partnerBondAllowed,
  withTimeout,
  type DeclaredBond,
  type DeclaredBondType,
  type HonorPerson
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/typography";
import { GlassCard, Pill } from "./glass";

export const RELATIONSHIP_EDGES_ANCHOR_ID = "relationship-edges";

export const RELATIONSHIP_PICKER_COPY = {
  eyebrow: "Lines on the constellation",
  lede: "Choose someone in your galaxy and the kind of bond. The line is only drawn when you add it.",
  remembranceNote: "Remembrance light is chosen separately, under who carries their light.",
  emptyGalaxy: "Add someone else to your galaxy first. Then you can draw a line here.",
  noneYet: "No lines yet. Nothing is guessed.",
  loading: "Loading the lines on this constellation.",
  personLabel: "Someone in your galaxy",
  typeLabel: "Kind of bond",
  personPlaceholder: "Choose a person",
  add: "Draw this line",
  adding: "Drawing…",
  remove: "Remove",
  saved: "Saved. The line will show on your constellation.",
  removed: "Removed. You can add it again anytime.",
  duplicate: "That line is already on the constellation.",
  self: "A line cannot connect a person to themselves.",
  loadError: "The lines on this constellation could not load. Try again.",
  saveError: "This constellation line could not be saved. Try again.",
  removeError: "This constellation line could not be removed. Try again.",
  partnerRefuse:
    "Partner is a bond between two adults. It is not drawn when either person is under 18. Family, friend, colleague, chosen, or other still can be."
} as const;

interface RelationshipPersonInput {
  id: string;
  display_name: string;
  is_self?: boolean;
  is_minor?: boolean | null;
  birth_date?: string | null;
  birth_precision?: HonorPerson["birth_precision"];
}

export function RelationshipEdgesBox({
  person,
  userId,
  subjectIsMinor,
  showRemembranceNote
}: {
  person: RelationshipPersonInput;
  userId: string;
  subjectIsMinor: boolean;
  showRemembranceNote?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<HonorPerson[]>([]);
  const [bonds, setBonds] = useState<DeclaredBond[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [otherId, setOtherId] = useState("");
  const [relationType, setRelationType] = useState<DeclaredBondType>("friend");

  const loadEdges = useCallback(async () => {
    if (!userId || !person.id) return;
    setLoading(true);
    setLoadFailed(false);
    setStatus(null);
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
          const nextPeople = (peopleRows ?? []) as HonorPerson[];
          setPeople(nextPeople);
          setBonds(
            declaredBondsFromRows(
              (relRows ?? []) as Array<{ person_a: string; person_b: string; relation_type: string }>,
              person.id
            )
          );
        })(),
        DEFAULT_FETCH_TIMEOUT_MS
      );
    } catch {
      setStatus(RELATIONSHIP_PICKER_COPY.loadError);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [userId, person.id]);

  useEffect(() => {
    void loadEdges();
  }, [loadEdges]);

  const candidates = useMemo(() => people.filter((p) => p.id !== person.id), [people, person.id]);
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const selectedOther = otherId ? peopleById.get(otherId) : undefined;
  const partnerBlocked =
    relationType === "partner" &&
    (subjectIsMinor ||
      (selectedOther
        ? !partnerBondAllowed(
            {
              isMinor: person.is_minor === true || subjectIsMinor,
              birthDate: person.birth_date,
              birthPrecision: person.birth_precision
            },
            {
              isMinor: selectedOther.is_minor,
              birthDate: selectedOther.birth_date,
              birthPrecision: selectedOther.birth_precision
            }
          )
        : false));
  const alreadyDrawn = Boolean(otherId) && declaredBondExists(bonds, otherId, relationType);
  const canDraw = Boolean(otherId) && !saving && !loading && !partnerBlocked && !alreadyDrawn;

  function nameFor(p: HonorPerson): string {
    return p.is_self ? "You" : p.display_name;
  }

  async function addBond() {
    if (!canDraw || !otherId) return;
    const built = buildRelationshipInsert({
      ownerId: userId,
      personAId: person.id,
      personBId: otherId,
      relationType,
      personA: {
        isMinor: person.is_minor === true || subjectIsMinor,
        birthDate: person.birth_date,
        birthPrecision: person.birth_precision
      },
      personB: {
        isMinor: selectedOther?.is_minor,
        birthDate: selectedOther?.birth_date,
        birthPrecision: selectedOther?.birth_precision
      }
    });
    if (built.ok === false) {
      const reason = built.reason;
      setStatus(
        reason === "partner-minor"
          ? RELATIONSHIP_PICKER_COPY.partnerRefuse
          : reason === "self"
            ? RELATIONSHIP_PICKER_COPY.self
            : RELATIONSHIP_PICKER_COPY.loadError
      );
      return;
    }
    setSaving(true);
    setStatus(null);
    const { error } = await supabase.from("relationships").insert(built.row);
    if (error) {
      setSaving(false);
      setStatus(error.code === "23505" ? RELATIONSHIP_PICKER_COPY.duplicate : RELATIONSHIP_PICKER_COPY.saveError);
      return;
    }
    setSaving(false);
    setStatus(RELATIONSHIP_PICKER_COPY.saved);
    setOtherId("");
    await loadEdges();
  }

  async function removeBond(bond: DeclaredBond) {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    const pair = canonicalRelationshipPair(person.id, bond.otherId);
    const { error } = await supabase
      .from("relationships")
      .delete()
      .eq("owner_id", userId)
      .eq("relation_type", bond.relationType)
      .eq("person_a", pair.person_a)
      .eq("person_b", pair.person_b);
    if (error) {
      setSaving(false);
      setStatus(RELATIONSHIP_PICKER_COPY.removeError);
      return;
    }
    setSaving(false);
    setStatus(RELATIONSHIP_PICKER_COPY.removed);
    await loadEdges();
  }

  return (
    <GlassCard testID={RELATIONSHIP_EDGES_ANCHOR_ID}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((prev) => !prev)}
        style={{ paddingVertical: 4 }}
      >
        <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.2, textTransform: "uppercase" }}>
          {RELATIONSHIP_PICKER_COPY.eyebrow}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
            {RELATIONSHIP_PICKER_COPY.lede}
            {showRemembranceNote ? ` ${RELATIONSHIP_PICKER_COPY.remembranceNote}` : ""}
          </Text>
          {loading ? (
            <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>{RELATIONSHIP_PICKER_COPY.loading}</Text>
          ) : loadFailed ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>{RELATIONSHIP_PICKER_COPY.loadError}</Text>
              <Pill accessibilityLabel="Try again" onPress={() => void loadEdges()}>
                Try again
              </Pill>
            </View>
          ) : candidates.length === 0 ? (
            <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
              {RELATIONSHIP_PICKER_COPY.emptyGalaxy}
            </Text>
          ) : (
            <>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>{RELATIONSHIP_PICKER_COPY.personLabel}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {candidates.map((c) => {
                  const selected = otherId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={nameFor(c)}
                      onPress={() => {
                        setOtherId(c.id);
                        setStatus(null);
                      }}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: selected ? tokens.colors.gold : tokens.colors.line,
                        backgroundColor: selected ? "rgba(230,174,108,0.12)" : "transparent",
                        paddingHorizontal: 12,
                        paddingVertical: 8
                      }}
                    >
                      <Text style={{ color: selected ? tokens.colors.gold : tokens.colors.cream, fontFamily: fonts.interSemi }}>
                        {nameFor(c)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>{RELATIONSHIP_PICKER_COPY.typeLabel}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {DECLARED_BOND_TYPES.map((type) => {
                  const selected = relationType === type;
                  return (
                    <Pressable
                      key={type}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={DECLARED_BOND_LABELS[type]}
                      onPress={() => {
                        setRelationType(type);
                        setStatus(null);
                      }}
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: selected ? tokens.colors.gold : tokens.colors.line,
                        backgroundColor: selected ? "rgba(230,174,108,0.12)" : "transparent",
                        paddingHorizontal: 12,
                        paddingVertical: 8
                      }}
                    >
                      <Text style={{ color: selected ? tokens.colors.gold : tokens.colors.cream, fontFamily: fonts.interSemi }}>
                        {DECLARED_BOND_LABELS[type]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {partnerBlocked ? (
                <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>{RELATIONSHIP_PICKER_COPY.partnerRefuse}</Text>
              ) : null}
              {alreadyDrawn ? (
                <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>{RELATIONSHIP_PICKER_COPY.duplicate}</Text>
              ) : null}
              <Pressable
                onPress={() => void addBond()}
                disabled={!canDraw}
                accessibilityRole="button"
                accessibilityLabel={RELATIONSHIP_PICKER_COPY.add}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: tokens.colors.gold,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  opacity: canDraw ? 1 : 0.45,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center"
                }}
              >
                {saving ? <ActivityIndicator size="small" color={tokens.colors.ink} /> : null}
                <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>
                  {saving ? RELATIONSHIP_PICKER_COPY.adding : RELATIONSHIP_PICKER_COPY.add}
                </Text>
              </Pressable>
            </>
          )}
          {!loading && bonds.length === 0 && candidates.length > 0 ? (
            <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>{RELATIONSHIP_PICKER_COPY.noneYet}</Text>
          ) : null}
          {bonds.length > 0 ? (
            <View style={{ gap: 8 }}>
              {bonds.map((bond) => {
                const other = peopleById.get(bond.otherId);
                const label = other
                  ? `${nameFor(other)} · ${DECLARED_BOND_LABELS[bond.relationType]}`
                  : DECLARED_BOND_LABELS[bond.relationType];
                return (
                  <View
                    key={`${bond.otherId}:${bond.relationType}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(255,255,255,0.03)"
                    }}
                  >
                    <Text style={{ color: tokens.colors.cream, flex: 1 }}>{label}</Text>
                    <Pill
                      accessibilityLabel={`Remove ${DECLARED_BOND_LABELS[bond.relationType]} with ${other ? nameFor(other) : "this person"}`}
                      disabled={saving}
                      onPress={() => void removeBond(bond)}
                    >
                      {RELATIONSHIP_PICKER_COPY.remove}
                    </Pill>
                  </View>
                );
              })}
            </View>
          ) : null}
          {status ? <Text style={{ color: tokens.colors.goldSoft, fontSize: 13, lineHeight: 20 }}>{status}</Text> : null}
        </View>
      ) : null}
    </GlassCard>
  );
}
