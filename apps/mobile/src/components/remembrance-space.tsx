import type { NatalChart } from "@galaxia/astro";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  MEMORIAL_CONSTELLATIONS,
  MEMORIAL_CONSTELLATION_PICKER_COPY,
  REMEMBRANCE_NOTE_KIND,
  buildRemembranceNoteInsert,
  getMemorialConstellation,
  normalizeMemorialConstellationForWrite,
  remembranceChartLines,
  remembranceUsesAncientLight,
  shouldShowRemembranceSpace,
  withTimeout,
  type MemorialConstellationId
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { REMEMBRANCE_CHROME, remembranceVelaParams } from "../lib/remembrance-chrome";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/typography";
import { GlassCard, Pill } from "./glass";

interface RemembrancePerson {
  id: string;
  display_name: string;
  relation?: string | null;
  passed_at?: string | null;
  memorial_constellation?: string | null;
  is_self?: boolean;
}

interface ReflectionRow {
  id: string;
  body: string;
  created_at: string;
}

const REMEMBRANCE_LOADING = "Loading reflections…";
const REMEMBRANCE_EMPTY = "No reflections yet. Write the first one above.";
const REMEMBRANCE_LOAD_ERROR = "Reflections could not load. Try again.";
const REMEMBRANCE_SAVE_ERROR = "This reflection could not be saved. Try again.";

export const REMEMBRANCE_ANCHOR_ID = "remembrance";

export function RemembranceSpace({
  person,
  userId,
  chart,
  subjectIsMinor,
  onSaved
}: {
  person: RemembrancePerson;
  userId: string;
  chart: NatalChart | null;
  subjectIsMinor: boolean;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadReflections = useCallback(async () => {
    if (!userId || !person.id) return;
    setLoading(true);
    setLoadFailed(false);
    try {
      const { data, error } = await withTimeout(
        (async () => {
          return await supabase
            .from("notes")
            .select("id, body, created_at")
            .eq("owner_id", userId)
            .eq("about_person", person.id)
            .eq("kind", REMEMBRANCE_NOTE_KIND)
            .order("created_at", { ascending: false })
            .limit(40);
        })(),
        DEFAULT_FETCH_TIMEOUT_MS
      );
      if (error) throw new Error("load");
      setReflections((data ?? []) as ReflectionRow[]);
    } catch {
      setStatus(REMEMBRANCE_LOAD_ERROR);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [userId, person.id]);

  useEffect(() => {
    void loadReflections();
  }, [loadReflections]);

  if (!shouldShowRemembranceSpace(person)) return null;

  const ancient = remembranceUsesAncientLight(person);
  const chartLines = remembranceChartLines(chart);
  const velaHref = remembranceVelaParams(person.id);

  async function saveReflection() {
    const body = draft.trim();
    if (!userId || !person.id || !body || saving) return;
    setSaving(true);
    setStatus(null);
    const row = buildRemembranceNoteInsert({ ownerId: userId, personId: person.id, body });
    const { error } = await supabase.from("notes").insert(row);
    setSaving(false);
    if (error) {
      setStatus(REMEMBRANCE_SAVE_ERROR);
      return;
    }
    setDraft("");
    await loadReflections();
    onSaved?.();
  }

  return (
    <GlassCard
      testID={REMEMBRANCE_ANCHOR_ID}
      style={{ borderColor: REMEMBRANCE_CHROME.border, backgroundColor: REMEMBRANCE_CHROME.background }}
    >
      <Text
        style={{
          color: REMEMBRANCE_CHROME.water,
          fontSize: 11,
          fontFamily: fonts.interSemi,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 8
        }}
      >
        Remembrance{ancient ? " · ancient light" : ""}
      </Text>
      <Text
        style={{
          color: tokens.colors.mist,
          fontSize: 14,
          lineHeight: 22,
          marginBottom: 16,
          borderLeftWidth: 2,
          borderLeftColor: REMEMBRANCE_CHROME.accentBorder,
          paddingLeft: 12
        }}
      >
        A private space for {person.display_name}. Only you see this. Their chart stays with you; nothing here is shared.
      </Text>

      <MemorialConstellationPicker
        personId={person.id}
        userId={userId}
        value={person.memorial_constellation}
        onChanged={() => onSaved?.()}
      />

      {chartLines.length > 0 ? (
        <View
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: REMEMBRANCE_CHROME.border,
            backgroundColor: "rgba(10,7,23,0.28)",
            gap: 6
          }}
        >
          <Text
            style={{
              color: REMEMBRANCE_CHROME.ancient,
              fontSize: 11,
              fontFamily: fonts.interSemi,
              letterSpacing: 1,
              textTransform: "uppercase"
            }}
          >
            Their chart · soft light
          </Text>
          {chartLines.map((line) => (
            <Text key={line} style={{ color: tokens.colors.cream, fontSize: 14, lineHeight: 20 }}>
              {line}
            </Text>
          ))}
          <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
            Only what you recorded: year-only and uncertain signs stay hedged. Nothing new is derived here.
          </Text>
        </View>
      ) : (
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
          No chart data yet: you can still write reflections below.
        </Text>
      )}

      <View style={{ gap: 10 }}>
        <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontFamily: fonts.interSemi, letterSpacing: 1.2, textTransform: "uppercase" }}>
          Your reflections
        </Text>
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
          Write what you want to hold. Nothing is generated for you.
          {subjectIsMinor ? " Guidance about a young person stays parenting-framed: never romantic." : ""}
        </Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`A memory, a feeling, something you want to remember about ${person.display_name}…`}
          placeholderTextColor={tokens.colors.mist2}
          multiline
          accessibilityLabel="Private remembrance reflection"
          style={{
            backgroundColor: tokens.colors.ink3,
            borderColor: tokens.colors.line,
            borderWidth: 1,
            borderRadius: 10,
            color: tokens.colors.cream,
            minHeight: 96,
            textAlignVertical: "top",
            padding: 10
          }}
        />
        <Pressable
          onPress={() => void saveReflection()}
          disabled={saving || !draft.trim()}
          accessibilityRole="button"
          style={{
            alignSelf: "flex-start",
            backgroundColor: tokens.colors.gold,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            opacity: saving || !draft.trim() ? 0.45 : 1,
            flexDirection: "row",
            gap: 8,
            alignItems: "center"
          }}
        >
          {saving ? <ActivityIndicator size="small" color={tokens.colors.ink} /> : null}
          <Text style={{ color: tokens.colors.ink, fontFamily: fonts.interSemi }}>{saving ? "Saving…" : "Save reflection"}</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={{ color: tokens.colors.mist, fontSize: 13, marginTop: 16 }}>{REMEMBRANCE_LOADING}</Text>
      ) : loadFailed ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>{REMEMBRANCE_LOAD_ERROR}</Text>
          <Pill accessibilityLabel="Try again" onPress={() => void loadReflections()}>
            Try again
          </Pill>
        </View>
      ) : reflections.length > 0 ? (
        <View style={{ marginTop: 16, gap: 10 }}>
          {reflections.map((r) => (
            <View
              key={r.id}
              style={{
                backgroundColor: "rgba(10,7,23,0.4)",
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderLeftWidth: 2,
                borderLeftColor: REMEMBRANCE_CHROME.water
              }}
            >
              <Text style={{ color: tokens.colors.cream, lineHeight: 22, fontSize: 14 }}>{r.body}</Text>
              <Text style={{ color: tokens.colors.mist2, fontSize: 11, marginTop: 4 }}>
                {new Date(r.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20, marginTop: 16 }}>{REMEMBRANCE_EMPTY}</Text>
      )}

      <View
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTopWidth: 1,
          borderTopColor: "rgba(111,177,184,0.18)",
          gap: 10
        }}
      >
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20 }}>
          Vela is available if you want company with their chart and your own words. Vela never starts the conversation:
          you open it when you choose.
        </Text>
        <Link href={velaHref} asChild>
          <Pill accessibilityLabel={`Ask Vela about ${person.display_name}`}>
            Ask Vela about {person.display_name}
          </Pill>
        </Link>
      </View>
      {status ? <Text style={{ color: tokens.colors.rose, fontSize: 13, marginTop: 8 }}>{status}</Text> : null}
    </GlassCard>
  );
}

function MemorialConstellationPicker({
  personId,
  userId,
  value,
  onChanged
}: {
  personId: string;
  userId: string;
  value: string | null | undefined;
  onChanged?: (next: MemorialConstellationId | null) => void;
}) {
  const [selected, setSelected] = useState<MemorialConstellationId | null>(normalizeMemorialConstellationForWrite(value));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(normalizeMemorialConstellationForWrite(value));
  }, [value]);

  async function choose(next: MemorialConstellationId | null) {
    if (busy) return;
    const normalized = normalizeMemorialConstellationForWrite(next);
    if (normalized === selected) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: writeErr } = await supabase
      .from("people")
      .update({ memorial_constellation: normalized })
      .eq("id", personId)
      .eq("owner_id", userId);
    setBusy(false);
    if (writeErr) {
      setError(writeErr.message);
      return;
    }
    setSelected(normalized);
    setOpen(false);
    onChanged?.(normalized);
  }

  const pattern = selected ? getMemorialConstellation(selected) : null;
  const selectedName = pattern?.name ?? MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: REMEMBRANCE_CHROME.ancient,
          fontSize: 11,
          fontFamily: fonts.interSemi,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 8
        }}
      >
        {MEMORIAL_CONSTELLATION_PICKER_COPY.label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "flex-start",
          padding: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: REMEMBRANCE_CHROME.border,
          backgroundColor: "rgba(10,7,23,0.28)"
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: pattern ? "rgba(230,174,108,0.22)" : "rgba(111,177,184,0.28)",
            borderWidth: 1,
            borderColor: pattern ? "rgba(230,174,108,0.45)" : "rgba(111,177,184,0.25)"
          }}
        />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, color: pattern ? tokens.colors.gold : tokens.colors.cream }}>{selectedName}</Text>
          {pattern ? (
            <>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>{pattern.summary}</Text>
              <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 18, fontFamily: fonts.fraunces }}>
                {pattern.myth}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
                {MEMORIAL_CONSTELLATION_PICKER_COPY.noneHelper}
              </Text>
              <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 18, fontFamily: fonts.fraunces }}>
                {MEMORIAL_CONSTELLATION_PICKER_COPY.noneMyth}
              </Text>
            </>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change"
          disabled={busy}
          onPress={() => {
            setError(null);
            setOpen(true);
          }}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignSelf: "center"
          }}
        >
          <Text style={{ color: tokens.colors.cream, fontFamily: fonts.interSemi, fontSize: 12 }}>Change</Text>
        </Pressable>
      </View>
      {busy && !open ? (
        <Text style={{ color: tokens.colors.mist, fontSize: 12, marginTop: 8 }}>Saving constellation…</Text>
      ) : null}
      {error && !open ? <Text style={{ color: tokens.colors.rose, fontSize: 13, marginTop: 8 }}>{error}</Text> : null}

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => !busy && setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(10,7,23,0.75)", padding: 20, justifyContent: "flex-start" }}
          onPress={() => {
            if (!busy) setOpen(false);
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              marginTop: 40,
              maxHeight: "88%",
              borderRadius: 22,
              borderWidth: 1,
              borderColor: REMEMBRANCE_CHROME.border,
              backgroundColor: tokens.colors.ink2,
              overflow: "hidden"
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 }}>
              <Text
                style={{
                  color: REMEMBRANCE_CHROME.ancient,
                  fontSize: 11,
                  fontFamily: fonts.interSemi,
                  letterSpacing: 1.2,
                  textTransform: "uppercase"
                }}
              >
                {MEMORIAL_CONSTELLATION_PICKER_COPY.label}
              </Text>
              <Pill accessibilityLabel="Close constellation library" disabled={busy} onPress={() => setOpen(false)}>
                Close
              </Pill>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}>
              <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 20, marginBottom: 8 }}>
                {MEMORIAL_CONSTELLATION_PICKER_COPY.helper}
              </Text>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: selected === null }}
                accessibilityLabel={MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel}
                disabled={busy}
                onPress={() => void choose(null)}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: selected === null ? "rgba(230,174,108,0.55)" : REMEMBRANCE_CHROME.border,
                  backgroundColor: selected === null ? "rgba(230,174,108,0.10)" : "rgba(10,7,23,0.28)"
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(111,177,184,0.28)"
                  }}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: selected === null ? tokens.colors.gold : tokens.colors.cream }}>
                    {MEMORIAL_CONSTELLATION_PICKER_COPY.noneLabel}
                  </Text>
                  <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
                    {MEMORIAL_CONSTELLATION_PICKER_COPY.noneHelper}
                  </Text>
                  <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 18, fontFamily: fonts.fraunces }}>
                    {MEMORIAL_CONSTELLATION_PICKER_COPY.noneMyth}
                  </Text>
                </View>
              </Pressable>
              {MEMORIAL_CONSTELLATIONS.map((entry) => {
                const isSelected = selected === entry.id;
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={entry.name}
                    disabled={busy}
                    onPress={() => void choose(entry.id as MemorialConstellationId)}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "flex-start",
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isSelected ? "rgba(230,174,108,0.55)" : REMEMBRANCE_CHROME.border,
                      backgroundColor: isSelected ? "rgba(230,174,108,0.10)" : "rgba(10,7,23,0.28)"
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: isSelected ? "rgba(230,174,108,0.28)" : "rgba(230,174,108,0.12)"
                      }}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: isSelected ? tokens.colors.gold : tokens.colors.cream }}>
                        {entry.name}
                        <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>  {entry.iau}</Text>
                      </Text>
                      <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>{entry.summary}</Text>
                      <Text style={{ color: tokens.colors.mist, fontSize: 12, lineHeight: 18, fontFamily: fonts.fraunces }}>
                        {entry.myth}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {busy ? <Text style={{ color: tokens.colors.mist, fontSize: 12 }}>Saving constellation…</Text> : null}
              {error ? <Text style={{ color: tokens.colors.rose, fontSize: 13 }}>{error}</Text> : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
