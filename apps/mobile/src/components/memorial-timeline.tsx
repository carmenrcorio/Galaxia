import {
  computeLifespanTransits,
  interpretLifespanTransitEvent,
  type LifespanTransitEvent,
  type NatalChart
} from "@galaxia/astro";
import {
  MEMORIAL_MILESTONE_NOTE_MAX,
  MEMORIAL_MILESTONE_TITLE_MAX,
  MEMORIAL_TIMELINE_NEEDS_BIRTH_YEAR,
  memorialTimelinePrecision,
  memorialTimelineWindow,
  shouldShowMemorialTimeline,
  splitFullName,
  validateMemorialMilestoneInput
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/typography";
import { GlassCard, Pill } from "./glass";

interface TimelinePerson {
  id: string;
  display_name: string;
  passed_at?: string | null;
  died_on?: string | null;
  is_self?: boolean;
  birth_precision?: "none" | "exact" | "date" | "year";
  birth_date?: string | null;
  birth_time?: string | null;
  tz_offset_min?: number | null;
}

interface MilestoneRow {
  id: string;
  date: string;
  title: string;
  note: string | null;
}

function rebuildBirthDateUTC(person: TimelinePerson): string | null {
  if (!person.birth_date) return null;
  const [yr, mo, dy] = person.birth_date.slice(0, 10).split("-").map(Number);
  if (person.birth_precision === "exact") {
    if (!person.birth_time || person.tz_offset_min == null) return null;
    const [hr, mn] = person.birth_time.slice(0, 5).split(":").map(Number);
    return new Date(Date.UTC(yr!, mo! - 1, dy!, hr!, mn!, 0) - person.tz_offset_min * 60_000).toISOString();
  }
  if (person.birth_precision === "date") return `${person.birth_date.slice(0, 10)}T12:00:00.000Z`;
  return null;
}

function transitSampleDateUTC(person: TimelinePerson): string | null {
  if (person.birth_precision === "year" && person.birth_date) {
    const year = person.birth_date.slice(0, 4);
    return `${year}-07-01T12:00:00.000Z`;
  }
  return rebuildBirthDateUTC(person);
}

type TimelineEntry =
  | { kind: "anchor-birth"; sortKey: string; date: Date }
  | { kind: "anchor-passing"; sortKey: string; date: Date }
  | { kind: "transit"; sortKey: string; date: Date; event: LifespanTransitEvent }
  | { kind: "milestone"; sortKey: string; date: Date; milestone: MilestoneRow };

const MEMORIAL_GOLD = "#d4a855";

function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function MemorialTimeline({
  person,
  userId,
  chart,
  onDiedOnSaved
}: {
  person: TimelinePerson;
  userId: string;
  chart: NatalChart | null;
  onDiedOnSaved?: (diedOn: string) => void;
}) {
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [diedOnDraft, setDiedOnDraft] = useState("");
  const [savingDiedOn, setSavingDiedOn] = useState(false);
  const [editingDiedOn, setEditingDiedOn] = useState(false);

  const loadMilestones = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memorial_milestones")
      .select("id, date, title, note")
      .eq("profile_id", person.id)
      .order("date", { ascending: true });
    if (error) setStatus(error.message);
    else setMilestones((data ?? []) as MilestoneRow[]);
    setLoading(false);
  }, [person.id]);

  useEffect(() => {
    void loadMilestones();
  }, [loadMilestones]);

  const shouldShow = shouldShowMemorialTimeline(person, chart);
  const precision = memorialTimelinePrecision(person);
  const isApproximate = precision === "approximate";
  const birthDateUTC = rebuildBirthDateUTC(person);
  const transitSampleUTC = transitSampleDateUTC(person);
  const { endDateUTC, endIsKnown } = memorialTimelineWindow(person);
  const firstName = splitFullName(person.display_name).firstName || person.display_name;

  const lifespanEvents = useMemo(() => {
    if (!chart || !transitSampleUTC) return [] as LifespanTransitEvent[];
    try {
      return computeLifespanTransits(chart, transitSampleUTC, endDateUTC, precision);
    } catch {
      return [] as LifespanTransitEvent[];
    }
  }, [chart, transitSampleUTC, endDateUTC, precision]);

  const entries = useMemo(() => {
    const list: TimelineEntry[] = [];
    if (birthDateUTC) {
      const d = new Date(birthDateUTC);
      list.push({ kind: "anchor-birth", sortKey: d.toISOString(), date: d });
    }
    for (const event of lifespanEvents) {
      list.push({ kind: "transit", sortKey: event.dateUTC, date: new Date(event.dateUTC), event });
    }
    for (const m of milestones) {
      const d = new Date(`${m.date.slice(0, 10)}T12:00:00.000Z`);
      list.push({ kind: "milestone", sortKey: d.toISOString(), date: d, milestone: m });
    }
    if (endIsKnown) {
      const d = new Date(endDateUTC);
      list.push({ kind: "anchor-passing", sortKey: d.toISOString(), date: d });
    }
    return list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [birthDateUTC, lifespanEvents, milestones, endIsKnown, endDateUTC]);

  if (!shouldShow) return null;

  function beginAdd() {
    setEditingId(null);
    setDraftDate("");
    setDraftTitle("");
    setDraftNote("");
    setShowAddForm(true);
  }

  function beginEdit(m: MilestoneRow) {
    setEditingId(m.id);
    setDraftDate(m.date.slice(0, 10));
    setDraftTitle(m.title);
    setDraftNote(m.note ?? "");
    setShowAddForm(true);
  }

  async function saveMilestone() {
    const validation = validateMemorialMilestoneInput({ title: draftTitle, note: draftNote, date: draftDate });
    if (validation.ok === false) {
      setStatus(validation.error);
      return;
    }
    if (!DATE_RE.test(draftDate)) {
      setStatus("A date is required.");
      return;
    }
    setSaving(true);
    setStatus(null);
    const row = { profile_id: person.id, user_id: userId, date: draftDate, title: validation.title, note: validation.note };
    const { error } = editingId
      ? await supabase.from("memorial_milestones").update(row).eq("id", editingId)
      : await supabase.from("memorial_milestones").insert(row);
    setSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setShowAddForm(false);
    setEditingId(null);
    await loadMilestones();
  }

  async function deleteMilestone(id: string) {
    setStatus(null);
    const { error } = await supabase.from("memorial_milestones").delete().eq("id", id);
    if (error) {
      setStatus(error.message);
      return;
    }
    await loadMilestones();
  }

  async function saveDiedOn() {
    if (!diedOnDraft || !DATE_RE.test(diedOnDraft)) return;
    setSavingDiedOn(true);
    setStatus(null);
    const { error } = await supabase.from("people").update({ died_on: diedOnDraft }).eq("id", person.id).eq("owner_id", userId);
    setSavingDiedOn(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setEditingDiedOn(false);
    onDiedOnSaved?.(diedOnDraft);
  }

  return (
    <GlassCard testID="memorial-timeline" style={{ borderColor: "rgba(111,177,184,0.22)" }}>
      <Text style={{ color: "rgba(111,177,184,0.9)", fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>
        Timeline
      </Text>
      <Text style={{ color: tokens.colors.mist, fontSize: 14, lineHeight: 22 }}>
        {person.display_name}&apos;s major life transits, gently interleaved with the moments you&apos;ve chosen to keep. Their
        chart never changes. This is the layer that holds what mattered.
      </Text>

      {isApproximate ? (
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20, marginTop: 10 }}>
          {firstName}&apos;s birth date is recorded as a year only, so these moments are placed by age rather than by date.
        </Text>
      ) : null}

      {person.birth_precision === "none" ? (
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20, marginTop: 10 }}>
          {MEMORIAL_TIMELINE_NEEDS_BIRTH_YEAR}
        </Text>
      ) : null}

      {endIsKnown && !editingDiedOn ? (
        <Text style={{ color: tokens.colors.mist2, fontSize: 12, marginTop: 10 }}>
          Passing recorded as {formatLongDate(new Date(endDateUTC))}.
        </Text>
      ) : null}
      {endIsKnown && !editingDiedOn ? (
        <Pill
          accessibilityLabel="Correct this date"
          onPress={() => {
            setDiedOnDraft(person.died_on ?? "");
            setEditingDiedOn(true);
          }}
        >
          Correct this date
        </Pill>
      ) : null}

      {!endIsKnown || editingDiedOn ? (
        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: `${MEMORIAL_GOLD}40`,
            backgroundColor: `${MEMORIAL_GOLD}0f`,
            gap: 8
          }}
        >
          <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
            {editingDiedOn
              ? "Correct the date they passed."
              : "The date they passed isn't recorded, so their timeline runs from their birth to today. Add it to complete their timeline and see the full picture of their life."}
          </Text>
          <TextInput
            value={diedOnDraft}
            onChangeText={setDiedOnDraft}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={tokens.colors.mist2}
            accessibilityLabel={`Date ${person.display_name} passed`}
            style={fieldStyle}
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable
              onPress={() => void saveDiedOn()}
              disabled={savingDiedOn || !DATE_RE.test(diedOnDraft)}
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: tokens.colors.line,
                paddingHorizontal: 12,
                paddingVertical: 8,
                opacity: savingDiedOn || !DATE_RE.test(diedOnDraft) ? 0.45 : 1,
                flexDirection: "row",
                gap: 6,
                alignItems: "center"
              }}
            >
              {savingDiedOn ? <ActivityIndicator size="small" color={tokens.colors.gold} /> : null}
              <Text style={{ color: tokens.colors.cream, fontFamily: fonts.interSemi }}>
                {savingDiedOn ? "Saving…" : editingDiedOn ? "Save correction" : "Add date of passing"}
              </Text>
            </Pressable>
            {editingDiedOn ? (
              <Pill accessibilityLabel="Cancel" onPress={() => setEditingDiedOn(false)}>
                Cancel
              </Pill>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: 16, gap: 0 }}>
        {loading ? (
          <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>Gathering their timeline…</Text>
        ) : entries.length === 0 ? (
          <Text style={{ color: tokens.colors.mist, fontSize: 14, lineHeight: 22 }}>
            Their timeline is still quiet. Add the moments that mattered: a wedding, a move, the year they started
            something that became who they were.
          </Text>
        ) : (
          entries.map((entry, idx) => (
            <View
              key={`${entry.kind}-${entry.sortKey}-${idx}`}
              style={{
                paddingLeft: 22,
                paddingBottom: idx === entries.length - 1 ? 0 : 18,
                borderLeftWidth: idx === entries.length - 1 ? 0 : 1,
                borderLeftColor: "rgba(183,154,216,0.16)",
                marginLeft: 8
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: -9,
                  top: 2,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor:
                    entry.kind === "milestone"
                      ? `${MEMORIAL_GOLD}22`
                      : entry.kind.startsWith("anchor")
                        ? "rgba(111,177,184,0.22)"
                        : "rgba(111,177,184,0.12)",
                  borderWidth: 1,
                  borderColor: entry.kind === "milestone" ? `${MEMORIAL_GOLD}77` : "rgba(111,177,184,0.4)"
                }}
              />
              {entry.kind === "anchor-birth" ? (
                <View>
                  <Text style={{ color: tokens.colors.teal, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.1, textTransform: "uppercase" }}>
                    Born
                  </Text>
                  <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 16 }}>
                    {formatLongDate(entry.date)}
                  </Text>
                </View>
              ) : entry.kind === "anchor-passing" ? (
                <View>
                  <Text style={{ color: tokens.colors.teal, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.1, textTransform: "uppercase" }}>
                    Passed
                  </Text>
                  <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 16 }}>
                    {formatLongDate(entry.date)}
                  </Text>
                </View>
              ) : entry.kind === "transit" ? (
                (() => {
                  const copy = interpretLifespanTransitEvent(entry.event);
                  return (
                    <View>
                      {entry.event.isApproximate ? (
                        <Text style={{ color: tokens.colors.teal, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.1, textTransform: "uppercase" }}>
                          Around age {entry.event.ageEstimate}
                        </Text>
                      ) : null}
                      <Text style={{ color: tokens.colors.cream, fontFamily: fonts.fraunces, fontSize: 15, marginBottom: 3 }}>
                        {copy.headline}
                      </Text>
                      <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>{copy.body}</Text>
                    </View>
                  );
                })()
              ) : (
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <Text style={{ color: MEMORIAL_GOLD, fontFamily: fonts.fraunces, fontSize: 15, flex: 1 }}>
                      {entry.milestone.title}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable onPress={() => beginEdit(entry.milestone)}>
                        <Text style={{ color: tokens.colors.cream, fontSize: 12, fontFamily: fonts.interSemi }}>Edit</Text>
                      </Pressable>
                      <Pressable onPress={() => void deleteMilestone(entry.milestone.id)}>
                        <Text style={{ color: tokens.colors.cream, fontSize: 12, fontFamily: fonts.interSemi }}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                  <Text style={{ color: tokens.colors.mist2, fontSize: 12, marginBottom: 3 }}>{formatLongDate(entry.date)}</Text>
                  {entry.milestone.note ? (
                    <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>{entry.milestone.note}</Text>
                  ) : null}
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(183,154,216,0.1)" }}>
        {!showAddForm ? (
          <Pressable
            onPress={beginAdd}
            accessibilityRole="button"
            style={{
              alignSelf: "flex-start",
              backgroundColor: tokens.colors.gold,
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 10
            }}
          >
            <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>+ Add a memory</Text>
          </Pressable>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.2, textTransform: "uppercase" }}>
              {editingId ? "Edit this memory" : "Add the moments that mattered"}
            </Text>
            <TextInput
              value={draftDate}
              onChangeText={setDraftDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={tokens.colors.mist2}
              accessibilityLabel="Date"
              style={fieldStyle}
            />
            <TextInput
              value={draftTitle}
              onChangeText={(v) => setDraftTitle(v.slice(0, MEMORIAL_MILESTONE_TITLE_MAX))}
              placeholder={`e.g. "Married Mom", "Started the bakery"`}
              placeholderTextColor={tokens.colors.mist2}
              maxLength={MEMORIAL_MILESTONE_TITLE_MAX}
              accessibilityLabel="Title"
              style={fieldStyle}
            />
            <TextInput
              value={draftNote}
              onChangeText={(v) => setDraftNote(v.slice(0, MEMORIAL_MILESTONE_NOTE_MAX))}
              placeholder="A note, if you want one (optional)"
              placeholderTextColor={tokens.colors.mist2}
              maxLength={MEMORIAL_MILESTONE_NOTE_MAX}
              multiline
              accessibilityLabel="Note (optional)"
              style={[fieldStyle, { minHeight: 72, textAlignVertical: "top" }]}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => void saveMilestone()}
                disabled={saving || !draftDate || !draftTitle.trim()}
                style={{
                  backgroundColor: tokens.colors.gold,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  opacity: saving || !draftDate || !draftTitle.trim() ? 0.45 : 1,
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center"
                }}
              >
                {saving ? <ActivityIndicator size="small" color={tokens.colors.ink} /> : null}
                <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>{saving ? "Saving…" : "Save"}</Text>
              </Pressable>
              <Pill
                accessibilityLabel="Cancel"
                onPress={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Pill>
            </View>
          </View>
        )}
      </View>
      {status ? <Text style={{ color: tokens.colors.rose, fontSize: 13, marginTop: 8 }}>{status}</Text> : null}
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
