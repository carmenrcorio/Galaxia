import {
  formatDateForConfirmation,
  searchPlaces,
  type BirthFormInput,
  type FormPrecision,
  type GeoCandidate
} from "@galaxia/astro";
import {
  ASK_BIRTH_DATA_TOGGLE,
  CHART_PRECISION_NONE_TIER,
  GALAXY_RELATION_PICKER_OPTIONS,
  type GalaxyPickerRelation
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { AskBirthData } from "../../src/components/ask-birth-data";
import { persistPerson } from "../../src/lib/persist-person";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/auth-provider";
import { useEntitlement } from "../../src/providers/entitlement-provider";

type Relation = GalaxyPickerRelation | "self";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

type PrecisionTier = { key: FormPrecision; label: string; unlocks: string };

const precisionTiers: PrecisionTier[] = [
  { key: "exact", label: "Exact", unlocks: "Full chart with houses, ascendant, and precise Moon details. Requires birth place + timezone." },
  { key: "date", label: "Date only", unlocks: "Reliable planetary signs and generational layer. No timezone needed." },
  { key: "year", label: "Year / decade", unlocks: "Generational layer and broad archetypal context. No timezone needed." }
];

// FOUNDER-REVIEW: new mobile precision option. Label and description are web's
// existing "Add birth data later" tier verbatim (apps/web/components/birth-fields.tsx)
// so the two surfaces offer the same choice in the same words.
const deferredTier: PrecisionTier = {
  key: CHART_PRECISION_NONE_TIER.key,
  label: CHART_PRECISION_NONE_TIER.label,
  unlocks: CHART_PRECISION_NONE_TIER.unlocks
};

// FOUNDER-REVIEW: picker labels — refine voice before merge.
const relationOptions = GALAXY_RELATION_PICKER_OPTIONS;

const baseInput: BirthFormInput = {
  precision: "date",
  month: undefined,
  day: undefined,
  year: undefined,
  hour: undefined,
  minute: undefined,
  yearOnly: undefined,
  birthPlace: "",
  lat: "",
  lng: "",
  tzOffsetMin: undefined,
  tzId: undefined
};

function parseOptionalInt(value: string, min: number, max: number): number | undefined {
  if (!value.trim()) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return undefined;
  return n;
}

export default function OnboardingScreen() {
  const { session } = useAuth();
  const { tier, canAddPerson, peopleLimit } = useEntitlement();
  const [selfName, setSelfName] = useState("");
  const [selfInput, setSelfInput] = useState<BirthFormInput>(baseInput);
  const [personName, setPersonName] = useState("");
  const [personRelation, setPersonRelation] = useState<Relation>("friend");
  const [personMinor, setPersonMinor] = useState(false);
  const [personInput, setPersonInput] = useState<BirthFormInput>(baseInput);
  const [askThem, setAskThem] = useState(false);
  const [lastSaved, setLastSaved] = useState<{
    personId: string;
    displayName: string;
    isMinor: boolean;
    askForBirthData: boolean;
  } | null>(null);
  const [people, setPeople] = useState<Array<{ id: string; display_name: string; relation: string; birth_precision: string; is_self?: boolean }>>([]);
  const [savingSelf, setSavingSelf] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canSaveSelf = useMemo(() => selfName.trim().length > 1, [selfName]);
  const canSavePerson = useMemo(() => personName.trim().length > 1, [personName]);

  useEffect(() => {
    if (personMinor) {
      setAskThem(false);
      return;
    }
    if (personInput.precision === "none") setAskThem(true);
  }, [personInput.precision, personMinor]);

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
      await persistPerson(supabase, {
        userId: session.user.id,
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
      if (!session?.user.id) {
        setStatus("Please sign in first.");
        return;
      }
      if (!canAddPerson(people.length)) {
        setStatus(`Free tier limit reached (${peopleLimit} people). Upgrade in settings for unlimited people.`);
        return;
      }
      const deferred = personInput.precision === "none";
      const savedName = personName.trim();
      const created = await persistPerson(supabase, {
        userId: session.user.id,
        displayName: personName,
        relation: personRelation === "self" ? "friend" : personRelation,
        isSelf: false,
        isMinor: personMinor,
        input: personInput
      });
      setPersonName("");
      setPersonMinor(false);
      setPersonRelation("friend");
      setPersonInput(baseInput);
      await fetchPeople();
      setLastSaved({
        personId: created.personId,
        displayName: savedName,
        isMinor: created.isMinor,
        askForBirthData: askThem && !created.isMinor
      });
      setStatus(
        deferred
          // FOUNDER-REVIEW: success copy. Ask now lives on this screen.
          ? `${savedName} is in your sky. You can send them a link from this screen, or add a date whenever you're ready.`
          : `${savedName} is in your constellation.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add person.");
    } finally {
      setSavingPerson(false);
    }
  };

  return (
    <ScrollView
      style={{
        backgroundColor: tokens.colors.ink2
      }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 80, gap: 18 }}
    >
      <Text style={{ color: tokens.colors.cream, fontSize: 28, fontWeight: "700" }}>You first</Text>
      {selfPerson ? (
        <>
          <Text style={{ color: tokens.colors.mist, fontSize: 15, lineHeight: 21 }}>
            {/* FOUNDER-REVIEW: rewritten (no U+2014). */}
            You've already added yourself as {selfPerson.display_name}. Edit your birth data from your chart. No need to add yourself again.
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
            {/* FOUNDER-REVIEW: layer-one onboarding. Outcome first. */}
            Galaxia helps you show up for the people already in your life. We start with you, then add the rest of your circle. A birth date is enough. A time sharpens the picture.
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
        {relationOptions.map(({ value, label }) => (
          <Pressable
            key={value}
            onPress={() => setPersonRelation(value)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: personRelation === value ? tokens.colors.gold : tokens.colors.line,
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            {/* FOUNDER-REVIEW: picker label */}
            <Text style={{ color: personRelation === value ? tokens.colors.gold : tokens.colors.cream }}>{label}</Text>
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
      <BirthFields input={personInput} onChange={setPersonInput} allowNone />
      {!personMinor ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: tokens.colors.cream, flex: 1, paddingRight: 12 }}>{ASK_BIRTH_DATA_TOGGLE}</Text>
          <Switch
            value={askThem}
            onValueChange={setAskThem}
            disabled={personMinor}
          />
        </View>
      ) : null}
      <Pressable onPress={savePerson} disabled={!canSavePerson || savingPerson} style={primaryButtonStyle}>
        <Text style={primaryButtonLabel}>{savingPerson ? "Saving..." : "Add person"}</Text>
      </Pressable>

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
      {lastSaved && session?.user.id ? (
        <AskBirthData
          personId={lastSaved.personId}
          personName={lastSaved.displayName}
          userId={session.user.id}
          autoCreate={lastSaved.askForBirthData}
          isMinor={lastSaved.isMinor}
        />
      ) : null}

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

function BirthFields({
  input,
  onChange,
  allowNone = false
}: {
  input: BirthFormInput;
  onChange: (next: BirthFormInput) => void;
  /**
   * Offer the "add birth data later" tier. Web parity: only the add-person form
   * passes it, so your own profile still starts from a real birth date.
   */
  allowNone?: boolean;
}) {
  const [cityQuery, setCityQuery] = useState(input.birthPlace ?? "");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<GeoCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const daysInMonth = useMemo(() => {
    if (!input.month || !input.year) return 31;
    return new Date(input.year, input.month, 0).getDate();
  }, [input.month, input.year]);

  const dateForGeo =
    input.year && input.month && input.day
      ? new Date(Date.UTC(input.year, input.month - 1, input.day, 12, 0, 0))
      : undefined;

  const displayDate =
    input.precision !== "year" && input.month && input.day && input.year
      ? formatDateForConfirmation(input.month, input.day, input.year)
      : input.precision === "year" && input.yearOnly
        ? String(input.yearOnly)
        : null;

  const resolvedPlace = Boolean(input.birthPlace && input.lat && input.lng);
  const needsPlaceForExact = input.precision === "exact" && (!resolvedPlace || input.tzOffsetMin == null);

  const handleSearch = async () => {
    const q = cityQuery.trim();
    if (!q) return;
    setSearching(true);
    setCandidates([]);
    setSearchError(null);
    try {
      const results = await searchPlaces(q, dateForGeo);
      if (!results.length) {
        setSearchError(`No places found for "${q}". Try adding a region or country (e.g. "Jacksonville, Arkansas").`);
      } else {
        setCandidates(results);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "The place search service couldn't be reached.");
    } finally {
      setSearching(false);
    }
  };

  const selectCandidate = (c: GeoCandidate) => {
    onChange({
      ...input,
      birthPlace: c.label,
      lat: String(c.lat),
      lng: String(c.lng),
      tzOffsetMin: c.tzOffset ?? undefined,
      tzId: c.tzId
    });
    setCandidates([]);
    setCityQuery(c.label);
    setSearchError(null);
  };

  const clearPlace = () => {
    onChange({ ...input, birthPlace: "", lat: "", lng: "", tzOffsetMin: undefined, tzId: undefined });
    setCityQuery("");
    setCandidates([]);
    setSearchError(null);
  };

  // Deferred birth data: the tier picker is the whole form. No date, no time,
  // and no place to collect, so nothing below is rendered.
  if (input.precision === "none") {
    return (
      <View style={{ gap: 10 }}>
        <PrecisionPicker input={input} onChange={onChange} allowNone={allowNone} />
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <PrecisionPicker input={input} onChange={onChange} allowNone={allowNone} />

      {input.precision === "year" ? (
        <TextInput
          value={input.yearOnly != null ? String(input.yearOnly) : ""}
          onChangeText={(year) => onChange({ ...input, yearOnly: parseOptionalInt(year, 1800, new Date().getFullYear() + 1) })}
          placeholder="Birth year (e.g. 1995)"
          keyboardType="numeric"
          placeholderTextColor={tokens.colors.mist2}
          style={fieldStyle}
        />
      ) : (
        <>
          <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Month (1–12) · Day · Year</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={input.month != null ? String(input.month) : ""}
              onChangeText={(month) => onChange({ ...input, month: parseOptionalInt(month, 1, 12) })}
              placeholder="MM"
              keyboardType="numeric"
              placeholderTextColor={tokens.colors.mist2}
              style={[fieldStyle, { flex: 1 }]}
            />
            <TextInput
              value={input.day != null ? String(input.day) : ""}
              onChangeText={(day) => onChange({ ...input, day: parseOptionalInt(day, 1, daysInMonth) })}
              placeholder="DD"
              keyboardType="numeric"
              placeholderTextColor={tokens.colors.mist2}
              style={[fieldStyle, { flex: 1 }]}
            />
            <TextInput
              value={input.year != null ? String(input.year) : ""}
              onChangeText={(year) => onChange({ ...input, year: parseOptionalInt(year, 1800, new Date().getFullYear() + 1) })}
              placeholder="YYYY"
              keyboardType="numeric"
              placeholderTextColor={tokens.colors.mist2}
              style={[fieldStyle, { flex: 1.4 }]}
            />
          </View>
          {input.month ? (
            <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
              {MONTHS[input.month - 1]}
              {displayDate ? ` · ${displayDate}` : ""}
            </Text>
          ) : null}

          {input.precision === "exact" ? (
            <>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Birth time (24h): hour · minute</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={input.hour != null ? String(input.hour) : ""}
                  onChangeText={(hour) => onChange({ ...input, hour: parseOptionalInt(hour, 0, 23) })}
                  placeholder="HH"
                  keyboardType="numeric"
                  placeholderTextColor={tokens.colors.mist2}
                  style={[fieldStyle, { flex: 1 }]}
                />
                <TextInput
                  value={input.minute != null ? String(input.minute) : ""}
                  onChangeText={(minute) => onChange({ ...input, minute: parseOptionalInt(minute, 0, 59) })}
                  placeholder="MM"
                  keyboardType="numeric"
                  placeholderTextColor={tokens.colors.mist2}
                  style={[fieldStyle, { flex: 1 }]}
                />
              </View>
            </>
          ) : null}
        </>
      )}

      <Text style={{ color: tokens.colors.cream, fontWeight: "600" }}>
        Birth place {input.precision === "exact" ? "(required for exact time)" : "(optional)"}
      </Text>
      <TextInput
        value={cityQuery}
        onChangeText={setCityQuery}
        placeholder='City (e.g. "Jacksonville, Arkansas")'
        placeholderTextColor={tokens.colors.mist2}
        style={fieldStyle}
      />
      <Pressable
        onPress={handleSearch}
        disabled={searching || !cityQuery.trim()}
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: tokens.colors.line,
          paddingVertical: 10,
          paddingHorizontal: 12,
          opacity: searching || !cityQuery.trim() ? 0.5 : 1
        }}
      >
        {searching ? (
          <ActivityIndicator color={tokens.colors.gold} />
        ) : (
          <Text style={{ color: tokens.colors.cream, fontWeight: "700", textAlign: "center" }}>Search places</Text>
        )}
      </Pressable>
      {searchError ? <Text style={{ color: tokens.colors.rose, fontSize: 12 }}>{searchError}</Text> : null}
      {candidates.map((c) => (
        <Pressable
          key={`${c.label}-${c.lat}-${c.lng}`}
          onPress={() => selectCandidate(c)}
          style={{
            borderRadius: 10,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            padding: 10,
            backgroundColor: tokens.colors.ink3
          }}
        >
          <Text style={{ color: tokens.colors.cream }}>{c.label}</Text>
          <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
            {c.tzId}
            {c.tzOffset != null ? ` · UTC${c.tzOffset >= 0 ? "+" : ""}${(c.tzOffset / 60).toFixed(0)}h` : " · timezone unresolved"}
          </Text>
        </Pressable>
      ))}
      {resolvedPlace ? (
        <View style={{ gap: 4 }}>
          <Text style={{ color: tokens.colors.goldSoft, fontSize: 12 }}>
            {input.birthPlace}
            {input.tzId
              ? input.tzOffsetMin != null
                ? ` · ${input.tzId} (UTC${input.tzOffsetMin >= 0 ? "+" : ""}${(input.tzOffsetMin / 60).toFixed(0)}h)`
                : ` · ${input.tzId} (timezone offset could not be resolved)`
              : ""}
          </Text>
          <Pressable onPress={clearPlace}>
            <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Clear place</Text>
          </Pressable>
        </View>
      ) : null}
      {needsPlaceForExact ? (
        <Text style={{ color: tokens.colors.rose, fontSize: 12, lineHeight: 18 }}>
          Exact birth time needs a birth place with a resolved timezone. Without it, local time cannot be converted to UTC and the chart would be wrong.
        </Text>
      ) : null}
      {input.precision !== "exact" ? (
        <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
          Date-only and year-only charts do not need a timezone: they stay honestly hedged without Ascendant or houses.
        </Text>
      ) : null}
    </View>
  );
}

function PrecisionPicker({
  input,
  onChange,
  allowNone
}: {
  input: BirthFormInput;
  onChange: (next: BirthFormInput) => void;
  allowNone: boolean;
}) {
  const tiers = allowNone ? [...precisionTiers, deferredTier] : precisionTiers;

  return (
    <View style={{ gap: 8 }}>
      {tiers.map((tier) => (
        <Pressable
          key={tier.key}
          onPress={() => onChange({ ...baseInput, precision: tier.key })}
          style={{
            backgroundColor: input.precision === tier.key ? tokens.colors.ink3 : tokens.colors.ink2,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: input.precision === tier.key ? tokens.colors.gold : tokens.colors.line,
            padding: 12,
            gap: 4
          }}
        >
          <Text style={{ color: input.precision === tier.key ? tokens.colors.gold : tokens.colors.cream, fontWeight: "700" }}>
            {tier.label}
          </Text>
          <Text style={{ color: tokens.colors.mist, lineHeight: 18 }}>{tier.unlocks}</Text>
        </Pressable>
      ))}
    </View>
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
