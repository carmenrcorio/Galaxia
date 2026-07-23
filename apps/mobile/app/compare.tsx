import {
  availableCompareRelationTypes,
  COMPARE_RELATION_SUGGESTION_HINT,
  compareGenerational,
  computeSynastry,
  defaultCompareRelationType,
  isRomanticRelation,
  suggestCompareRelationType,
  type GenSignature,
  type NatalChart,
  type RelationType
} from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";
import { useEntitlement } from "../src/providers/entitlement-provider";

interface PersonLite {
  id: string;
  display_name: string;
  relation: string;
  birth_date: string | null;
  birth_precision: "exact" | "date" | "year" | "none";
  is_minor?: boolean;
}

/**
 * Single source of truth for minor status on mobile Compare — same as web.
 * NEVER read person.is_minor directly; always run the age-aware backstop.
 */
function minorOf(p: PersonLite | null): boolean {
  return (
    Boolean(p) &&
    isMinorForSafety({
      isMinor: p!.is_minor ?? false,
      birthDate: p!.birth_date,
      birthPrecision: p!.birth_precision
    })
  );
}

export default function CompareScreen() {
  const { session } = useAuth();
  const { tier } = useEntitlement();
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [personAId, setPersonAId] = useState<string | null>(null);
  const [personBId, setPersonBId] = useState<string | null>(null);
  // SAFETY: never default to a romantic type — match web.
  const [relationType, setRelationType] = useState<RelationType>(defaultCompareRelationType(false));
  const userChoseTypeRef = useRef(false);
  const [result, setResult] = useState<{
    personA: PersonLite;
    personB: PersonLite;
    synastry: ReturnType<typeof computeSynastry>;
    generational: ReturnType<typeof compareGenerational>;
    ancestralHeadline: string | null;
  } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    if (!session?.user.id) return;
    void fetchPeople();
  }, [session?.user.id]);

  const fetchPeople = async () => {
    if (!session?.user.id) return;
    const { data, error } = await supabase
      .from("people")
      .select("id, display_name, relation, birth_date, birth_precision, is_minor")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setStatus(error.message);
      return;
    }
    const rows = (data ?? []) as PersonLite[];
    setPeople(rows);
    if (!personAId && rows[0]) setPersonAId(rows[0].id);
    if (!personBId && rows[1]) setPersonBId(rows[1].id);
  };

  const selectedA = useMemo(() => people.find((person) => person.id === personAId) ?? null, [people, personAId]);
  const selectedB = useMemo(() => people.find((person) => person.id === personBId) ?? null, [people, personBId]);

  // Tag-based suggestion: only when one side is the user (`self`). Two
  // user-relative tags are never inferred into a pair relation.
  const suggestedRelationType = suggestCompareRelationType(
    selectedA?.relation,
    selectedB?.relation
  );

  // Apply tag suggestion (or the adult fallback) when the pair changes —
  // never overrides an explicit user choice. Minor clamp runs AFTER this.
  useEffect(() => {
    if (userChoseTypeRef.current) return;
    setRelationType(suggestedRelationType ?? defaultCompareRelationType(false));
  }, [personAId, personBId, suggestedRelationType]);

  // Age-aware minor status of the currently-selected pair — never raw is_minor.
  const selectionHasMinor = minorOf(selectedA) || minorOf(selectedB);

  // Snap away from romantic framing when a minor enters the pairing — runs
  // LAST and always wins over tag suggestions.
  useEffect(() => {
    if (!selectionHasMinor) return;
    if (isRomanticRelation(relationType)) {
      setRelationType(defaultCompareRelationType(true));
      return;
    }
    if (!userChoseTypeRef.current) {
      setRelationType(defaultCompareRelationType(true));
    }
  }, [selectionHasMinor, relationType]);

  const availableTypes = availableCompareRelationTypes(selectionHasMinor);
  // Hint only when a real mapping is the currently selected type.
  const showSuggestionHint =
    suggestedRelationType !== null && relationType === suggestedRelationType;

  const runCompare = async () => {
    if (!selectedA || !selectedB) {
      setStatus("Pick two people first.");
      return;
    }
    if (selectedA.id === selectedB.id) {
      setStatus("Choose two different people.");
      return;
    }

    const [{ data: chartA }, { data: chartB }] = await Promise.all([
      supabase.from("charts").select("data").eq("person_id", selectedA.id).single(),
      supabase.from("charts").select("data").eq("person_id", selectedB.id).single()
    ]);

    if (!chartA?.data || !chartB?.data) {
      setStatus("Missing chart data for one or both people.");
      return;
    }

    const natalA = chartA.data as NatalChart;
    const natalB = chartB.data as NatalChart;
    const synastry = computeSynastry(natalA, natalB);
    const generational = compareGenerational(
      natalA.generational as GenSignature,
      natalB.generational as GenSignature,
      estimateYearGap(selectedA, selectedB)
    );

    const ageGap = estimateYearGap(selectedA, selectedB) ?? 0;
    const ancestralHeadline =
      relationType === "ancestor" || selectedA.relation === "ancestor" || selectedB.relation === "ancestor" || ageGap >= 18
        ? `This connection spans different eras — the generational layer is the headline. ${generational.theme}`
        : null;

    setResult({ personA: selectedA, personB: selectedB, synastry, generational, ancestralHeadline });
    setStatus(null);
  };

  const saveMoment = async () => {
    if (!session?.user.id || !result || !noteDraft.trim()) return;
    const [low, high] = [result.personA.id, result.personB.id].sort();
    const { error } = await supabase.from("notes").insert({
      owner_id: session.user.id,
      pair_low: low,
      pair_high: high,
      body: noteDraft.trim(),
      transit_snapshot: {
        relationType,
        score: result.synastry.scores.overall,
        generational: result.generational
      }
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setNoteDraft("");
    setStatus("Private moment logged to this pair.");
  };

  // Defense in depth: refuse to render a romantically framed reading about a minor.
  const pairHasMinor = minorOf(result?.personA ?? null) || minorOf(result?.personB ?? null);
  const blockRomanticMinorRender = pairHasMinor && isRomanticRelation(relationType);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink2 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 30, fontWeight: "700" }}>Compare</Text>
      <Text style={{ color: tokens.colors.mist, lineHeight: 21 }}>
        Choose any two people to see your dynamic, the astrology underneath, and the generational call-out.
      </Text>
      <Text style={{ color: tokens.colors.goldSoft }}>
        {tier === "plus" ? "Galaxia+ unlocked: full directional reads." : "Free plan: directional reads are abbreviated."}
      </Text>

      <View style={cardStyle}>
        <Text style={cardTitle}>Relationship type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {availableTypes.map((type) => (
            <Pressable
              key={type}
              onPress={() => {
                userChoseTypeRef.current = true;
                setRelationType(type);
              }}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: relationType === type ? tokens.colors.gold : tokens.colors.line,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <Text style={{ color: relationType === type ? tokens.colors.gold : tokens.colors.cream }}>{type}</Text>
            </Pressable>
          ))}
        </View>
        {showSuggestionHint ? (
          // FOUNDER-REVIEW: authored — refine voice.
          <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
            {COMPARE_RELATION_SUGGESTION_HINT}
          </Text>
        ) : null}
        {selectionHasMinor ? (
          <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
            A minor is part of this comparison, so only non-romantic readings are available. Romantic and partner framing is turned off for pairings involving a child.
          </Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Pick people</Text>
        <Text style={labelStyle}>Person A</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {people.map((person) => (
            <Pressable
              key={`a-${person.id}`}
              onPress={() => setPersonAId(person.id)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: personAId === person.id ? tokens.colors.gold : tokens.colors.line,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <Text style={{ color: personAId === person.id ? tokens.colors.gold : tokens.colors.cream }}>{person.display_name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={labelStyle}>Person B</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {people.map((person) => (
            <Pressable
              key={`b-${person.id}`}
              onPress={() => setPersonBId(person.id)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: personBId === person.id ? tokens.colors.gold : tokens.colors.line,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <Text style={{ color: personBId === person.id ? tokens.colors.gold : tokens.colors.cream }}>{person.display_name}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={runCompare} style={primaryButtonStyle}>
          <Text style={primaryLabelStyle}>Run comparison</Text>
        </Pressable>
      </View>

      {result && blockRomanticMinorRender ? (
        <View style={cardStyle}>
          <Text style={cardTitle}>Reading unavailable</Text>
          <Text style={cardBody}>
            This pairing includes a minor, so romantic / partner framing cannot be shown. Choose a non-romantic relationship type to continue.
          </Text>
        </View>
      ) : null}

      {result && !blockRomanticMinorRender ? (
        <>
          <View style={cardStyle}>
            <Text style={cardTitle}>
              {result.personA.display_name} × {result.personB.display_name}
            </Text>
            <Text style={headlineStyle}>
              {result.synastry.scores.overall >= 70
                ? "High flow dynamic with meaningful momentum."
                : result.synastry.scores.overall >= 50
                  ? "Balanced dynamic with both ease and growth edges."
                  : "Growth-heavy dynamic: more intentional care will help."}
            </Text>
            <Text style={cardBody}>
              Your dynamic: overall {result.synastry.scores.overall} · emotional {result.synastry.scores.emotional} · communication{" "}
              {result.synastry.scores.communication} · warmth {result.synastry.scores.warmth}
            </Text>
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>Where it flows / catches</Text>
            <Text style={cardBody}>Flow: {result.synastry.aspects.filter((aspect) => aspect.harmony > 0).length} supportive links.</Text>
            <Text style={cardBody}>Catch: {result.synastry.aspects.filter((aspect) => aspect.harmony < 0).length} tension links.</Text>
            <Text style={cardBody}>Top supportive aspect: {formatAspect(result.synastry.aspects.filter((a) => a.harmony > 0)[0])}</Text>
            <Text style={cardBody}>Top tension aspect: {formatAspect(result.synastry.aspects.filter((a) => a.harmony < 0)[0])}</Text>
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>Generational call-out</Text>
            <Text style={cardBody}>
              {result.generational.sameGeneration
                ? `Born under similar sky signatures (${result.generational.shared.map((s) => `${s.planet} in ${s.sign}`).join(", ")}).`
                : `Generational fault lines: ${result.generational.diverged.map((d) => `${d.planet} ${d.signA} vs ${d.signB}`).join(" · ")}.`}
            </Text>
            <Text style={cardBody}>{result.generational.theme}</Text>
            {result.ancestralHeadline ? <Text style={{ color: tokens.colors.goldSoft, lineHeight: 20 }}>{result.ancestralHeadline}</Text> : null}
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>Understand each other</Text>
            {tier === "plus" ? (
              <>
                <View style={directionalCard}>
                  <Text style={directionalTitle}>{result.personA.display_name} may need:</Text>
                  <Text style={cardBody}>
                    {result.synastry.scores.communication < 50
                      ? "slower, explicit check-ins and less assumption."
                      : "clear communication plus emotional follow-through."}
                  </Text>
                </View>
                <View style={directionalCard}>
                  <Text style={directionalTitle}>{result.personB.display_name} may need:</Text>
                  <Text style={cardBody}>
                    {result.synastry.scores.warmth < 50
                      ? "more visible affection and reassurance."
                      : "respect for autonomy with consistent appreciation."}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={cardBody}>Directional detail unlocks on Galaxia+.</Text>
            )}
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>The astrology underneath</Text>
            {result.synastry.aspects.slice(0, 10).map((aspect, idx) => (
              <Text key={`${aspect.from}-${aspect.to}-${idx}`} style={cardBody}>
                {aspect.from.toUpperCase()} {aspect.type} {aspect.to.toUpperCase()} · orb {aspect.orb.toFixed(1)}°
              </Text>
            ))}
          </View>

          <View style={cardStyle}>
            <Text style={cardTitle}>Log a moment (private)</Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="Capture what happened and what you noticed..."
              placeholderTextColor={tokens.colors.mist2}
              multiline
              style={noteInputStyle}
            />
            <Pressable onPress={saveMoment} style={primaryButtonStyle}>
              <Text style={primaryLabelStyle}>Save private moment</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
    </ScrollView>
  );
}

function estimateYearGap(a: PersonLite, b: PersonLite): number | undefined {
  if (!a.birth_date || !b.birth_date) return undefined;
  const yearA = Number(a.birth_date.slice(0, 4));
  const yearB = Number(b.birth_date.slice(0, 4));
  if (!Number.isFinite(yearA) || !Number.isFinite(yearB)) return undefined;
  return Math.abs(yearA - yearB);
}

function formatAspect(aspect?: ReturnType<typeof computeSynastry>["aspects"][number]): string {
  if (!aspect) return "No major aspect detected yet.";
  return `${aspect.from.toUpperCase()} ${aspect.type} ${aspect.to.toUpperCase()} (${aspect.orb.toFixed(1)}°)`;
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
  color: tokens.colors.cream,
  marginTop: 4,
  marginBottom: 2
} as const;

const headlineStyle = {
  color: tokens.colors.gold,
  lineHeight: 20
} as const;

const primaryButtonStyle = {
  backgroundColor: tokens.colors.gold,
  borderRadius: 999,
  paddingVertical: 12,
  marginTop: 8
} as const;

const primaryLabelStyle = {
  color: tokens.colors.ink,
  textAlign: "center",
  fontWeight: "700"
} as const;

const directionalCard = {
  borderRadius: 10,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  padding: 10,
  gap: 4
} as const;

const directionalTitle = {
  color: tokens.colors.cream,
  fontWeight: "700"
} as const;

const noteInputStyle = {
  backgroundColor: tokens.colors.ink2,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  color: tokens.colors.cream,
  minHeight: 90,
  textAlignVertical: "top",
  padding: 10
} as const;
