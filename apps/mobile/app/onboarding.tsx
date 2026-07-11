import { computeNatalChart, type Precision } from "@galaxia/astro";
import { isMinorForSafety } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { buildBirthInput, type BirthFormInput } from "../src/lib/birth";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";
import { useEntitlement } from "../src/providers/entitlement-provider";

type Relation = "partner" | "child" | "parent" | "grandparent" | "sibling" | "friend" | "ancestor" | "self";

const precisionTiers: { key: Precision; label: string; unlocks: string }[] = [
  { key: "exact", label: "Exact", unlocks: "Full chart with houses, ascendant, and precise Moon details." },
  { key: "date", label: "Date only", unlocks: "Reliable planetary signs and generational layer." },
  { key: "year", label: "Year / decade", unlocks: "Generational layer and broad archetypal context." }
];

const relationOptions: Relation[] = ["partner", "child", "parent", "grandparent", "sibling", "friend", "ancestor"];

const baseInput: BirthFormInput = {
  precision: "date",
  date: "",
  time: "",
  year: "",
  lat: "",
  lng: ""
};

export default function OnboardingScreen() {
  const { session } = useAuth();
  const { tier, canAddPerson, peopleLimit } = useEntitlement();
  const [selfName, setSelfName] = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(baseInput);
  const [personName, setPersonName] = useState("");
  const [personRelation, setPersonRelation] = useState<Relation>("friend");
  const [personMinor, setPersonMinor] = useState(false);
  const [personInput, setPersonInput] = useState<BirthFormInput>(baseInput);
  const [people, setPeople] = useState<Array<{ id: string; display_name: string; relation: string; birth_precision: string; is_self?: boolean }>>([]);
  const [savingSelf, setSavingSelf] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canSaveSelf = useMemo(() => selfName.trim().length > 1, [selfName]);
  const canSavePerson = useMemo(() => personName.trim().length > 1, [personName]);

  useEffect(() => {
    if (!session?.user.id) return;
    void fetchPeople();
  }, [session?.user.id]);

  const fetchPeople = async () => {
    if (!session?.user.id) return;
    const { data } = await supabase
      .from("people")
      .select("id, display_name, relation, birth_precision, is_self")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });
    setPeople(data ?? []);
  };

  const selfPerson = people.find((p) => p.is_self) ?? null;

  const persistPerson = async ({
    displayName,
    relation,
    isSelf,
    isMinor,
    input
  }: {
    displayName: string;
    relation: Relation;
    isSelf: boolean;
    isMinor: boolean;
    input: BirthFormInput;
  }) => {
    if (!session?.user.id) {
      throw new Error("Please sign in first.");
    }

    const built = buildBirthInput(input);
    const natal = computeNatalChart({
      ...built.birth,
      houseSystem: "placidus"
    });
    // natal.houseSystem is the system the engine actually computed (it can
    // fall back to Whole Sign at polar latitudes) — store that, never a claim.

    // The age backstop runs at save time too, not only when a gate reads the
    // row later — so a child is protected even if the "This person is a
    // minor" switch was left off (it resets after every add on this form).
    const effectiveIsMinor = isMinorForSafety({ isMinor, birthDate: built.birthDate, birthPrecision: input.precision });

    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({
        owner_id: session.user.id,
        is_self: isSelf,
        display_name: displayName.trim(),
        relation,
        is_minor: effectiveIsMinor,
        birth_date: built.birthDate,
        birth_time: built.birthTime,
        birth_precision: input.precision,
        birth_lat: built.birth.lat,
        birth_lng: built.birth.lng
      })
      .select("id")
      .single();

    if (personError || !person) {
      throw new Error(personError?.message ?? "Failed to save person.");
    }

    const { error: chartError } = await supabase.from("charts").upsert({
      person_id: person.id,
      house_system: natal.houseSystem ?? null,
      data: natal,
      engine_version: 2
    });

    if (chartError) {
      throw new Error(chartError.message);
    }
  };

  const saveSelf = async () => {
    if (!session?.user.id) {
      setStatus("Please sign in first.");
      return;
    }
    setSavingSelf(true);
    setStatus(null);
    try {
      // This mobile screen previously had NO guard against creating a second
      // self — web's /welcome had a client-side check but mobile had none.
      // Re-check the database immediately before inserting (closes the race
      // a mount-only check would leave open); the unique index on
      // people(owner_id) WHERE is_self is the real backstop either way.
      const { data: existingSelf } = await supabase
        .from("people")
        .select("id")
        .eq("owner_id", session.user.id)
        .eq("is_self", true)
        .maybeSingle();
      if (existingSelf) {
        await fetchPeople();
        setStatus("You're already in your sky. Edit your profile from your chart.");
        return;
      }
      await persistPerson({
        displayName: selfName,
        relation: "self",
        isSelf: true,
        isMinor: false,
        input: selfInput
      });
      await fetchPeople();
      setStatus("Saved your profile and natal chart.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save your profile.";
      if (message.includes("people_one_self_per_owner")) {
        await fetchPeople();
        setStatus("You're already in your sky (added just now, perhaps on another device). Edit your profile from your chart.");
      } else {
        setStatus(message);
      }
    } finally {
      setSavingSelf(false);
    }
  };

  const savePerson = async () => {
    setSavingPerson(true);
    setStatus(null);
    try {
      if (!canAddPerson(people.length)) {
        setStatus(`Free tier limit reached (${peopleLimit} people). Upgrade in settings for unlimited people.`);
        return;
      }
      await persistPerson({
        displayName: personName,
        relation: personRelation,
        isSelf: false,
        isMinor: personMinor,
        input: personInput
      });
      setPersonName("");
      setPersonMinor(false);
      setPersonRelation("friend");
      setPersonInput(baseInput);
      await fetchPeople();
      setStatus("Person added to your constellation.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add person.");
    } finally {
      setSavingPerson(false);
    }
  };

  const PrecisionSelector = ({
    value,
    onChange
  }: {
    value: Precision;
    onChange: (next: Precision) => void;
  }) => (
    <View style={{ gap: 8 }}>
      {precisionTiers.map((tier) => (
        <Pressable
          key={tier.key}
          onPress={() => onChange(tier.key)}
          style={{
            backgroundColor: value === tier.key ? tokens.colors.ink3 : tokens.colors.ink2,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: value === tier.key ? tokens.colors.gold : tokens.colors.line,
            padding: 12,
            gap: 4
          }}
        >
          <Text style={{ color: value === tier.key ? tokens.colors.gold : tokens.colors.cream, fontWeight: "700" }}>{tier.label}</Text>
          <Text style={{ color: tokens.colors.mist, lineHeight: 18 }}>{tier.unlocks}</Text>
        </Pressable>
      ))}
    </View>
  );

  const BirthFields = ({
    input,
    onChange
  }: {
    input: BirthFormInput;
    onChange: (next: BirthFormInput) => void;
  }) => (
    <View style={{ gap: 10 }}>
      <PrecisionSelector value={input.precision} onChange={(precision) => onChange({ ...input, precision })} />
      {input.precision === "year" ? (
        <TextInput
          value={input.year}
          onChangeText={(year) => onChange({ ...input, year })}
          placeholder="Birth year (e.g. 1995)"
          keyboardType="numeric"
          placeholderTextColor={tokens.colors.mist2}
          style={fieldStyle}
        />
      ) : (
        <>
          <TextInput
            value={input.date}
            onChangeText={(date) => onChange({ ...input, date })}
            placeholder="Birth date (YYYY-MM-DD)"
            placeholderTextColor={tokens.colors.mist2}
            style={fieldStyle}
          />
          {input.precision === "exact" ? (
            <TextInput
              value={input.time}
              onChangeText={(time) => onChange({ ...input, time })}
              placeholder="Birth time (HH:MM 24h)"
              placeholderTextColor={tokens.colors.mist2}
              style={fieldStyle}
            />
          ) : null}
        </>
      )}
      <TextInput
        value={input.lat}
        onChangeText={(lat) => onChange({ ...input, lat })}
        placeholder="Latitude (optional)"
        placeholderTextColor={tokens.colors.mist2}
        style={fieldStyle}
      />
      <TextInput
        value={input.lng}
        onChangeText={(lng) => onChange({ ...input, lng })}
        placeholder="Longitude (optional)"
        placeholderTextColor={tokens.colors.mist2}
        style={fieldStyle}
      />
    </View>
  );

  return (
    <ScrollView
      style={{
        backgroundColor: tokens.colors.ink2,
      }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 80, gap: 18 }}
    >
      <Text style={{ color: tokens.colors.cream, fontSize: 28, fontWeight: "700" }}>
        You first
      </Text>
      {selfPerson ? (
        <>
          <Text style={{ color: tokens.colors.mist, fontSize: 15, lineHeight: 21 }}>
            You've already added yourself as {selfPerson.display_name}. Edit your birth data from your chart — no need to add yourself again.
          </Text>
          <Link href={`/profile/${selfPerson.id}`} asChild>
            <Pressable style={primaryButtonStyle}>
              <Text style={primaryButtonLabel}>View / edit my chart</Text>
            </Pressable>
          </Link>
        </>
      ) : (
        <>
          <Text style={{ color: tokens.colors.mist, fontSize: 15, lineHeight: 21 }}>
            Add your own birth data at any precision. Year-only is first-class for ancestors and loosely known friends.
          </Text>
          <Text style={{ color: tokens.colors.goldSoft }}>
            Plan: {tier === "plus" ? "Galaxia+" : "Free"} · {tier === "plus" ? "unlimited people" : `${peopleLimit} people max`}
          </Text>
          <TextInput
            value={selfName}
            onChangeText={setSelfName}
            placeholder="Your display name"
            placeholderTextColor={tokens.colors.mist2}
            style={fieldStyle}
          />
          <BirthFields input={selfInput} onChange={setSelfInput} />
          <Pressable onPress={saveSelf} disabled={!canSaveSelf || savingSelf} style={primaryButtonStyle}>
            <Text style={primaryButtonLabel}>{savingSelf ? "Saving..." : "Save your profile"}</Text>
          </Pressable>
        </>
      )}

      <View style={{ height: 1, backgroundColor: tokens.colors.line, marginVertical: 6 }} />

      <Text style={{ color: tokens.colors.cream, fontSize: 24, fontWeight: "700" }}>Add people</Text>
      <Link href="/groups" asChild>
        <Pressable style={{ borderRadius: 999, borderWidth: 1, borderColor: tokens.colors.line, paddingVertical: 10, paddingHorizontal: 12 }}>
          <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>Go to groups/cohorts</Text>
        </Pressable>
      </Link>
      <TextInput
        value={personName}
        onChangeText={setPersonName}
        placeholder="Person name"
        placeholderTextColor={tokens.colors.mist2}
        style={fieldStyle}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {relationOptions.map((relation) => (
          <Pressable
            key={relation}
            onPress={() => setPersonRelation(relation)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: personRelation === relation ? tokens.colors.gold : tokens.colors.line,
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: personRelation === relation ? tokens.colors.gold : tokens.colors.cream }}>
              {relation}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: tokens.colors.cream }}>This person is a minor</Text>
        <Switch value={personMinor} onValueChange={setPersonMinor} />
      </View>
      <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
        Galaxia also automatically protects anyone whose birth date shows they're under 18, even if this stays off.
      </Text>
      <BirthFields input={personInput} onChange={setPersonInput} />
      <Pressable onPress={savePerson} disabled={!canSavePerson || savingPerson} style={primaryButtonStyle}>
        <Text style={primaryButtonLabel}>{savingPerson ? "Saving..." : "Add person"}</Text>
      </Pressable>

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}

      <View style={{ gap: 8 }}>
        <Text style={{ color: tokens.colors.cream, fontSize: 20, fontWeight: "700" }}>Your constellation</Text>
        {people.length === 0 ? (
          <Text style={{ color: tokens.colors.mist }}>No people yet. Start with yourself, then add your first relationship.</Text>
        ) : (
          people.map((person) => (
            <Link key={person.id} href={`/profile/${person.id}`} asChild>
              <Pressable
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: tokens.colors.line,
                  padding: 12,
                  backgroundColor: tokens.colors.ink3
                }}
              >
                <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>{person.display_name}</Text>
                <Text style={{ color: tokens.colors.mist }}>
                  {person.relation} · {person.birth_precision}
                </Text>
              </Pressable>
            </Link>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const fieldStyle = {
  backgroundColor: tokens.colors.ink3,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: tokens.colors.cream
} as const;

const primaryButtonStyle = {
  backgroundColor: tokens.colors.gold,
  borderRadius: 999,
  paddingVertical: 13
} as const;

const primaryButtonLabel = {
  color: tokens.colors.ink,
  fontWeight: "700",
  textAlign: "center"
} as const;
