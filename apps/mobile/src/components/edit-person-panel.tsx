import {
  buildBirthInput,
  computeNatalChart,
  formatDateForConfirmation,
  searchPlaces,
  type BirthFormInput,
  type GeoCandidate,
  CHART_ENGINE_VERSION
} from "@galaxia/astro";
import {
  EXCLUDE_FROM_DAILIES_HELP,
  EXCLUDE_FROM_DAILIES_LABEL,
  OWNED_DELETE_COPY,
  STAR_COLOR_PALETTE,
  STAR_SCALE_MAX,
  STAR_SCALE_MIN,
  formatPersonDeleteConfirmation,
  groupsCollapsedByMemberRemoval,
  hasPassed,
  isMinorForSafety,
  normalizeStarColorForWrite,
  normalizeStarScale,
  usesAncientLight,
  type ChartPrecision
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { applyBirthFormUpgrade, birthFormFromPerson } from "../lib/birth-form-upgrade";
import { getPreferredHouseSystem } from "../lib/house-system";
import type { PersonDepthRow } from "../lib/person-row";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/typography";
import { AskBirthData } from "./ask-birth-data";
import { ConnectInviteButton } from "./connect-invite-button";
import { GlassCard, Pill } from "./glass";
import { RelationshipEdgesBox } from "./relationship-edges";

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

function parseOptionalInt(value: string, min: number, max: number): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return undefined;
  if (n < min || n > max) return undefined;
  return n;
}

export function EditPersonPanel({
  person,
  userId,
  onSaved,
  onDeleted,
  open,
  onOpenChange,
  upgradeTo
}: {
  person: PersonDepthRow;
  userId: string;
  onSaved: () => void;
  onDeleted: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upgradeTo?: Exclude<ChartPrecision, "none"> | null;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [confirmRemembrance, setConfirmRemembrance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [remembranceBusy, setRemembranceBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(person.display_name);
  const [relation, setRelation] = useState(person.relation);
  const [isMinor, setIsMinor] = useState(person.is_minor);
  const [passedAt, setPassedAt] = useState<string | null>(person.passed_at ?? null);
  const [starColor, setStarColor] = useState<string | null>(normalizeStarColorForWrite(person.star_color));
  const [customPosition, setCustomPosition] = useState(person.custom_position ?? null);
  const [starScale, setStarScale] = useState(() => normalizeStarScale(person.star_scale));
  const [excludeFromDailies, setExcludeFromDailies] = useState(person.exclude_from_dailies === true);
  const [resettingPosition, setResettingPosition] = useState(false);
  const [input, setInput] = useState<BirthFormInput>(() => birthFormFromPerson(person));
  const [cityQuery, setCityQuery] = useState(person.birth_place ?? "");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<GeoCandidate[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = birthFormFromPerson(person);
    setInput(upgradeTo ? applyBirthFormUpgrade(base, upgradeTo) : base);
    setDisplayName(person.display_name);
    setRelation(person.relation);
    setIsMinor(person.is_minor);
    setPassedAt(person.passed_at ?? null);
    setStarColor(normalizeStarColorForWrite(person.star_color));
    setCustomPosition(person.custom_position ?? null);
    setStarScale(normalizeStarScale(person.star_scale));
    setExcludeFromDailies(person.exclude_from_dailies === true);
    setCityQuery(person.birth_place ?? "");
    setCandidates([]);
    setSearchError(null);
    setStatus(null);
    setConfirmDelete(false);
    setConfirmRemembrance(false);
  }, [open, upgradeTo, person.id]);

  const resolvedPlace = Boolean(input.birthPlace && input.lat && input.lng);

  async function handleSearch() {
    const q = cityQuery.trim();
    if (!q) return;
    setSearching(true);
    setCandidates([]);
    setSearchError(null);
    const dateForGeo =
      input.year && input.month && input.day
        ? new Date(Date.UTC(input.year, input.month - 1, input.day, 12, 0, 0))
        : undefined;
    try {
      const results = await searchPlaces(q, dateForGeo);
      if (!results.length) setSearchError(`No places found for "${q}". Try adding a region or country.`);
      else setCandidates(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "The place search service couldn't be reached.");
    } finally {
      setSearching(false);
    }
  }

  function selectCandidate(c: GeoCandidate) {
    setInput((prev) => ({
      ...prev,
      birthPlace: c.label,
      lat: String(c.lat),
      lng: String(c.lng),
      tzOffsetMin: c.tzOffset ?? undefined,
      tzId: c.tzId
    }));
    setCityQuery(c.label);
    setCandidates([]);
  }

  async function save() {
    if (!displayName.trim()) {
      setStatus("Name is required.");
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const fi = { ...input };
      if (input.birthPlace?.trim() && !input.lat && !input.lng) {
        throw new Error(
          "Search for the birth city and pick it from the results, so the right place (and timezone) is used."
        );
      }
      const built = buildBirthInput(fi);
      const houseSystem = await getPreferredHouseSystem(supabase, userId);
      const natal = computeNatalChart({ ...built.birth, houseSystem });
      const effectiveIsMinor = isMinorForSafety({
        isMinor,
        birthDate: built.birthDate,
        birthPrecision: fi.precision
      });
      const { error: pErr } = await supabase
        .from("people")
        .update({
          display_name: displayName.trim(),
          relation,
          is_minor: effectiveIsMinor,
          birth_date: built.birthDate,
          birth_time: built.birthTime,
          birth_place: built.birthPlace,
          birth_precision: fi.precision,
          birth_lat: built.birth.lat ?? null,
          birth_lng: built.birth.lng ?? null,
          tz_offset_min: built.tzOffsetMin ?? null,
          star_color: normalizeStarColorForWrite(starColor),
          star_scale: normalizeStarScale(starScale),
          exclude_from_dailies: hasPassed({ passed_at: passedAt }) ? false : excludeFromDailies
        })
        .eq("id", person.id)
        .eq("owner_id", userId);
      if (pErr) throw new Error("This person's details could not be saved. Try again.");
      const { error: cErr } = await supabase.from("charts").upsert({
        person_id: person.id,
        house_system: natal.houseSystem ?? null,
        data: natal,
        engine_version: CHART_ENGINE_VERSION
      });
      if (cErr) throw new Error("This person's chart could not be saved. Try again.");
      setStatus("Saved.");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "This person could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function beginDeletePerson() {
    setStatus(null);
    const { data: memberships, error: memErr } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("person_id", person.id);
    if (memErr) {
      setStatus("This person could not be deleted. Try again.");
      return;
    }

    const groupIds = [...new Set((memberships ?? []).map((r) => r.group_id as string))];
    const memberCounts: Array<{ groupId: string; name: string; memberCount: number }> = [];
    for (const gid of groupIds) {
      const [{ data: gRow }, { count }] = await Promise.all([
        supabase.from("groups").select("id, name").eq("id", gid).eq("owner_id", userId).maybeSingle(),
        supabase.from("group_members").select("person_id", { count: "exact", head: true }).eq("group_id", gid)
      ]);
      if (gRow) {
        memberCounts.push({
          groupId: gid,
          name: gRow.name as string,
          memberCount: count ?? 0
        });
      }
    }
    const collapsing = groupsCollapsedByMemberRemoval(memberCounts);

    const { count: personThreadCount } = await supabase
      .from("threads")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .or(`subject_person.eq.${person.id},pair_low.eq.${person.id},pair_high.eq.${person.id}`);

    const collapsingGroups = [];
    for (const g of collapsing) {
      const { count: groupThreadCount } = await supabase
        .from("threads")
        .select("id", { count: "exact", head: true })
        .eq("group_id", g.groupId);
      collapsingGroups.push({
        groupId: g.groupId,
        name: g.name,
        conversationCount: groupThreadCount ?? 0
      });
    }

    setDeleteWarning(
      formatPersonDeleteConfirmation({
        personName: person.display_name,
        collapsingGroups,
        personConversationCount: personThreadCount ?? 0
      })
    );
    setConfirmDelete(true);
  }

  async function deletePerson() {
    setDeleting(true);
    setStatus(null);
    const { error } = await supabase.rpc("delete_own_person", { p_person_id: person.id });
    setDeleting(false);
    if (error) {
      setStatus(OWNED_DELETE_COPY.personErrorGeneric);
      return;
    }
    onDeleted();
  }

  async function setRemembrance(nextPassed: boolean) {
    setRemembranceBusy(true);
    setStatus(null);
    const value = nextPassed ? new Date().toISOString() : null;
    const { error } = await supabase.from("people").update({ passed_at: value }).eq("id", person.id).eq("owner_id", userId);
    setRemembranceBusy(false);
    if (error) {
      setStatus("Remembrance could not be updated. Try again.");
      return;
    }
    setPassedAt(value);
    setConfirmRemembrance(false);
    setStatus(
      nextPassed ? "Their light stays in your galaxy, remembered." : "Restored. They're held as present again."
    );
    onSaved();
  }

  async function resetPosition() {
    setResettingPosition(true);
    setStatus(null);
    const { error } = await supabase
      .from("people")
      .update({ custom_position: null })
      .eq("id", person.id)
      .eq("owner_id", userId);
    setResettingPosition(false);
    if (error) {
      setStatus("Their constellation seat could not be reset. Try again.");
      return;
    }
    setCustomPosition(null);
    setStatus("Back on their ring.");
    onSaved();
  }

  if (!open) {
    return (
      <Pill accessibilityLabel="Edit / delete" onPress={() => onOpenChange(true)}>
        Edit / delete
      </Pill>
    );
  }

  const currentYear = new Date().getFullYear();
  const daysInMonth = input.month && input.year ? new Date(input.year, input.month, 0).getDate() : 31;
  const displayDate =
    input.precision !== "year" && input.month && input.day && input.year
      ? formatDateForConfirmation(input.month, input.day, input.year)
      : null;
  const successStatus =
    status === "Saved." || Boolean(status && (status.includes("light") || status.includes("Restored") || status.includes("ring")));

  return (
    <GlassCard>
      <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>
        Edit profile
      </Text>
      <View style={{ gap: 10 }}>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={tokens.colors.mist2}
          style={fieldStyle}
        />
        <TextInput
          value={relation}
          onChangeText={setRelation}
          placeholder="Relation"
          placeholderTextColor={tokens.colors.mist2}
          style={fieldStyle}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isMinor }}
          onPress={() => setIsMinor((prev) => !prev)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: tokens.colors.gold,
              backgroundColor: isMinor ? tokens.colors.gold : "transparent"
            }}
          />
          <Text style={{ color: tokens.colors.cream }}>Minor</Text>
        </Pressable>
        <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
          Anyone whose birth date shows they&apos;re under 18 is automatically protected regardless of this box.
        </Text>
        {!hasPassed({ passed_at: passedAt }) ? (
          <>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: excludeFromDailies }}
              onPress={() => setExcludeFromDailies((prev) => !prev)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: tokens.colors.gold,
                  backgroundColor: excludeFromDailies ? tokens.colors.gold : "transparent"
                }}
              />
              <Text style={{ color: tokens.colors.cream, flex: 1 }}>{EXCLUDE_FROM_DAILIES_LABEL}</Text>
            </Pressable>
            <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
              {EXCLUDE_FROM_DAILIES_HELP}
            </Text>
          </>
        ) : null}
        {userId ? (
          <RelationshipEdgesBox
            person={person}
            userId={userId}
            subjectIsMinor={isMinorForSafety({
              isMinor,
              birthDate: person.birth_date,
              birthPrecision: person.birth_precision
            })}
            showRemembranceNote={hasPassed({ passed_at: passedAt }) && !person.is_self}
            embedded
          />
        ) : null}

        <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Star color</Text>
        <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 18 }}>
          On your constellation. Default follows their bond colour.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: starColor === null }}
            accessibilityLabel="Default, bond colour"
            onPress={() => setStarColor(null)}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: starColor === null ? "rgba(230,174,108,0.55)" : "rgba(183,154,216,0.22)",
              backgroundColor: starColor === null ? "rgba(230,174,108,0.12)" : "transparent",
              paddingHorizontal: 12,
              paddingVertical: 6
            }}
          >
            <Text style={{ color: starColor === null ? tokens.colors.gold : tokens.colors.mist, fontSize: 12 }}>Default</Text>
          </Pressable>
          {STAR_COLOR_PALETTE.map((swatch) => {
            const selected = starColor === swatch.hex;
            return (
              <Pressable
                key={swatch.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={swatch.label}
                onPress={() => setStarColor(swatch.hex)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: swatch.hex,
                  borderWidth: 2,
                  borderColor: selected ? tokens.colors.cream : "rgba(255,255,255,0.18)"
                }}
              />
            );
          })}
        </View>
        <Text style={{ color: starColor ? tokens.colors.mist : tokens.colors.mist2, fontSize: 12 }}>
          {starColor ? (STAR_COLOR_PALETTE.find((s) => s.hex === starColor)?.label ?? "Custom") : "Using bond colour"}
        </Text>

        <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Star size</Text>
        <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 18 }}>
          How large this star appears on your constellation. Does not move their seat.
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Smaller star"
            onPress={() => setStarScale(normalizeStarScale(starScale - 0.1))}
            style={pill}
          >
            <Text style={pillLabel}>-</Text>
          </Pressable>
          <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>{starScale.toFixed(1)}×</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Larger star"
            onPress={() => setStarScale(normalizeStarScale(starScale + 0.1))}
            style={pill}
          >
            <Text style={pillLabel}>+</Text>
          </Pressable>
        </View>
        <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>
          {STAR_SCALE_MIN.toFixed(1)}× to {STAR_SCALE_MAX.toFixed(1)}×
        </Text>

        {customPosition && !person.is_self ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Constellation seat</Text>
            <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 18 }}>
              You placed this star by hand. Reset returns them to their ring.
            </Text>
            <Pill
              accessibilityLabel="Reset position"
              disabled={resettingPosition}
              onPress={() => void resetPosition()}
            >
              {resettingPosition ? "Resetting…" : "Reset position"}
            </Pill>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 6 }}>
          {(["exact", "date", "year"] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() =>
                setInput((prev) => {
                  if (p === "date" || p === "exact") return applyBirthFormUpgrade(prev, p);
                  return { ...prev, precision: p };
                })
              }
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: input.precision === p ? "rgba(230,174,108,0.5)" : tokens.colors.line,
                paddingHorizontal: 12,
                paddingVertical: 8
              }}
            >
              <Text style={{ color: input.precision === p ? tokens.colors.gold : tokens.colors.cream, fontSize: 12 }}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        {input.precision === "year" ? (
          <TextInput
            value={input.yearOnly != null ? String(input.yearOnly) : ""}
            onChangeText={(year) =>
              setInput((p) => ({ ...p, yearOnly: parseOptionalInt(year, 1800, currentYear) }))
            }
            placeholder="Birth year (e.g. 1952)"
            keyboardType="numeric"
            placeholderTextColor={tokens.colors.mist2}
            style={fieldStyle}
          />
        ) : (
          <>
            <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Birth date</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={input.month != null ? String(input.month) : ""}
                onChangeText={(month) => setInput((p) => ({ ...p, month: parseOptionalInt(month, 1, 12) }))}
                placeholder="MM"
                keyboardType="numeric"
                placeholderTextColor={tokens.colors.mist2}
                style={[fieldStyle, { flex: 1 }]}
              />
              <TextInput
                value={input.day != null ? String(input.day) : ""}
                onChangeText={(day) => setInput((p) => ({ ...p, day: parseOptionalInt(day, 1, daysInMonth) }))}
                placeholder="DD"
                keyboardType="numeric"
                placeholderTextColor={tokens.colors.mist2}
                style={[fieldStyle, { flex: 1 }]}
              />
              <TextInput
                value={input.year != null ? String(input.year) : ""}
                onChangeText={(year) => setInput((p) => ({ ...p, year: parseOptionalInt(year, 1800, currentYear) }))}
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
                <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Birth time (local)</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={input.hour != null ? String(input.hour) : ""}
                    onChangeText={(hour) => setInput((p) => ({ ...p, hour: parseOptionalInt(hour, 0, 23) }))}
                    placeholder="HH"
                    keyboardType="numeric"
                    placeholderTextColor={tokens.colors.mist2}
                    style={[fieldStyle, { flex: 1 }]}
                  />
                  <TextInput
                    value={input.minute != null ? String(input.minute) : ""}
                    onChangeText={(minute) => setInput((p) => ({ ...p, minute: parseOptionalInt(minute, 0, 59) }))}
                    placeholder="MM"
                    keyboardType="numeric"
                    placeholderTextColor={tokens.colors.mist2}
                    style={[fieldStyle, { flex: 1 }]}
                  />
                </View>
              </>
            ) : null}
            <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>Birth city</Text>
            {resolvedPlace ? (
              <View
                style={{
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: "rgba(111,177,184,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(111,177,184,0.25)",
                  gap: 6
                }}
              >
                <Text style={{ color: tokens.colors.teal, fontSize: 13, fontFamily: fonts.interSemi }}>
                  ✓ {input.birthPlace}
                </Text>
                <Pressable
                  onPress={() => {
                    setInput((p) => ({ ...p, birthPlace: "", lat: "", lng: "", tzOffsetMin: undefined }));
                    setCityQuery("");
                  }}
                >
                  <Text style={{ color: tokens.colors.cream, fontSize: 12 }}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={cityQuery}
                    onChangeText={(v) => {
                      setCityQuery(v);
                      setCandidates([]);
                      setSearchError(null);
                    }}
                    placeholder="City, State / Country"
                    placeholderTextColor={tokens.colors.mist2}
                    style={[fieldStyle, { flex: 1 }]}
                  />
                  <Pressable
                    onPress={() => void handleSearch()}
                    disabled={searching || !cityQuery.trim()}
                    style={[pill, { opacity: searching || !cityQuery.trim() ? 0.5 : 1 }]}
                  >
                    {searching ? <ActivityIndicator size="small" color={tokens.colors.gold} /> : (
                      <Text style={pillLabel}>Search</Text>
                    )}
                  </Pressable>
                </View>
                {searchError ? <Text style={{ color: tokens.colors.rose, fontSize: 12 }}>{searchError}</Text> : null}
                {candidates.map((c) => (
                  <Pressable
                    key={`${c.label}-${c.lat}-${c.lng}`}
                    onPress={() => selectCandidate(c)}
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "rgba(183,154,216,0.15)",
                      backgroundColor: "rgba(23,17,48,0.8)",
                      padding: 10
                    }}
                  >
                    <Text style={{ color: tokens.colors.cream, fontSize: 13 }}>{c.label}</Text>
                    <Text style={{ color: tokens.colors.mist2, fontSize: 11 }}>{c.lat.toFixed(4)}°</Text>
                  </Pressable>
                ))}
              </>
            )}
          </>
        )}
      </View>

      {input.precision !== "exact" && userId && !usesAncientLight(person) ? (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(183,154,216,0.1)", gap: 8 }}>
          <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>
            Don&apos;t have their exact details? Let them fill it in:
          </Text>
          <AskBirthData
            personId={person.id}
            personName={person.display_name}
            userId={userId}
            isMinor={isMinorForSafety({
              isMinor: person.is_minor,
              birthDate: person.birth_date,
              birthPrecision: person.birth_precision
            })}
            birthDate={person.birth_date}
            birthPrecision={person.birth_precision}
          />
          <ConnectInviteButton person={person} />
        </View>
      ) : null}

      {!person.is_self ? (
        <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(183,154,216,0.12)", gap: 10 }}>
          <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Remembrance
          </Text>
          {passedAt ? (
            <>
              <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 15, lineHeight: 22 }}>
                Remembered: their light is still arriving.
              </Text>
              <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
                Their chart stays. They remain in your galaxy and in Compare. You can restore them as present anytime.
                Choose their constellation in the Remembrance space on this page.
              </Text>
              {!confirmRemembrance ? (
                <Pill accessibilityLabel="Hold them as present again" onPress={() => setConfirmRemembrance(true)}>
                  Hold them as present again
                </Pill>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: tokens.colors.mist, fontSize: 14, lineHeight: 22, borderLeftWidth: 2, borderLeftColor: "rgba(230,174,108,0.4)", paddingLeft: 10 }}>
                    Restore {displayName.trim() || "them"} as present in your galaxy? Their remembrance mark will clear; nothing else changes.
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Pressable
                      onPress={() => void setRemembrance(false)}
                      disabled={remembranceBusy}
                      style={{
                        backgroundColor: tokens.colors.gold,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center"
                      }}
                    >
                      {remembranceBusy ? <ActivityIndicator size="small" color={tokens.colors.ink} /> : null}
                      <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>
                        {remembranceBusy ? "Restoring…" : "Yes, hold them as present"}
                      </Text>
                    </Pressable>
                    <Pill accessibilityLabel="Never mind" onPress={() => setConfirmRemembrance(false)}>
                      Never mind
                    </Pill>
                  </View>
                </View>
              )}
            </>
          ) : !confirmRemembrance ? (
            <>
              <Text style={{ color: tokens.colors.mist, fontSize: 14, lineHeight: 22 }}>
                If they&apos;ve passed, you can remember them here. Their chart stays. Their light softens into ancient light
                on your galaxy: still with you, still comparable.
              </Text>
              <Pill accessibilityLabel="Remember them as passed" onPress={() => setConfirmRemembrance(true)}>
                Remember them as passed
              </Pill>
            </>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 20 }}>
                Remember {displayName.trim() || "them"}?
              </Text>
              <Text style={{ color: tokens.colors.mist, fontSize: 14, lineHeight: 22, borderLeftWidth: 2, borderLeftColor: "rgba(230,174,108,0.4)", paddingLeft: 10 }}>
                Their chart and place in your galaxy stay. On the constellation they&apos;ll shine as ancient light, soft, still arriving. You can reverse this anytime. This is remembrance, not removal.
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Pressable
                  onPress={() => void setRemembrance(true)}
                  disabled={remembranceBusy}
                  style={{
                    backgroundColor: tokens.colors.gold,
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center"
                  }}
                >
                  {remembranceBusy ? <ActivityIndicator size="small" color={tokens.colors.ink} /> : null}
                  <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>
                    {remembranceBusy ? "Holding…" : "Yes. Remember them"}
                  </Text>
                </Pressable>
                <Pill accessibilityLabel="Not now" onPress={() => setConfirmRemembrance(false)}>
                  Not now
                </Pill>
              </View>
            </View>
          )}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Pressable
          onPress={() => void save()}
          disabled={saving}
          style={{
            backgroundColor: tokens.colors.gold,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            gap: 8,
            alignItems: "center"
          }}
        >
          {saving ? <ActivityIndicator size="small" color={tokens.colors.ink} /> : null}
          <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>{saving ? "Saving…" : "Save changes"}</Text>
        </Pressable>
        <Pill accessibilityLabel="Cancel" onPress={() => onOpenChange(false)}>
          Cancel
        </Pill>
        {!person.is_self ? (
          !confirmDelete ? (
            <Pressable
              onPress={() => void beginDeletePerson()}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(218,140,140,0.4)",
                paddingHorizontal: 12,
                paddingVertical: 9
              }}
            >
              <Text style={{ color: tokens.colors.rose, fontFamily: fonts.interSemi }}>Delete</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => void deletePerson()}
                disabled={deleting}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: tokens.colors.rose,
                  backgroundColor: "rgba(218,140,140,0.15)",
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center"
                }}
              >
                {deleting ? <ActivityIndicator size="small" color={tokens.colors.rose} /> : null}
                <Text style={{ color: tokens.colors.rose, fontFamily: fonts.interSemi }}>
                  {deleting ? OWNED_DELETE_COPY.personConfirmingButton : OWNED_DELETE_COPY.personConfirmButton}
                </Text>
              </Pressable>
              <Pill
                accessibilityLabel="Cancel delete"
                onPress={() => {
                  setConfirmDelete(false);
                  setDeleteWarning(null);
                }}
              >
                Cancel
              </Pill>
            </>
          )
        ) : null}
      </View>
      {confirmDelete && deleteWarning ? (
        <Text style={{ color: tokens.colors.rose, fontSize: 13, marginTop: 8 }}>{deleteWarning}</Text>
      ) : null}
      {status ? (
        <Text style={{ color: successStatus ? tokens.colors.gold : tokens.colors.rose, fontSize: 13, marginTop: 8 }}>
          {status}
        </Text>
      ) : null}
    </GlassCard>
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

const pill = {
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: 999,
  paddingHorizontal: 12,
  paddingVertical: 8
} as const;

const pillLabel = {
  color: tokens.colors.cream,
  fontFamily: fonts.interSemi
} as const;
