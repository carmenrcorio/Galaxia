import {
  CHART_ENGINE_VERSION,
  ERA_READING_HEADING,
  ERA_READING_LABELS,
  WORK_VIEW_HEADING,
  WORK_VIEW_LABELS,
  buildPersonDailyNudge,
  coerceDailyNudgeRow,
  computeSynastry,
  formatMomentSkyContext,
  getPlutoEraReading,
  getPlutoWorkView,
  houseSystemLabelForChart,
  isProfessionalPersonRelation,
  ownerLocalDate,
  parseMomentTransitSnapshot,
  plutoSourceLine,
  selectNatalAspectGeometry,
  whenUTCForOwnerLocalDate,
  type NatalChart,
  type PersonDailyNudgeRecord,
  type SignKey,
  bodyDisplayName,
  isChartPoint
} from "@galaxia/astro";
import {
  ASPECTS_UNAVAILABLE_YEAR_BODY,
  ASPECTS_UNAVAILABLE_YEAR_FOLLOW_UP,
  CHART_PRECISION_DOES_NOT_HEADING,
  CHART_PRECISION_NONE_FACT,
  CHART_PRECISION_SUPPORTS_HEADING,
  CHART_PRECISION_WHY_HEADING,
  CHART_SAVED_DETAILS_NO_CHART_BODY,
  CHART_SAVED_DETAILS_NO_CHART_TITLE,
  chartPrecisionExplanation,
  chartPrecisionFact,
  describeGenerationalArchetype,
  hasPassed,
  housesUnavailableCopy,
  isMinorForSafety,
  PERSON_GROUP_LABEL,
  PERSON_TAB_LABEL,
  PERSON_TAB_VOCAB,
  shouldShowLiveTransits,
  shouldShowMemorialTimeline,
  shouldShowRemembranceSpace,
  signElement,
  sunSignFromChart,
  usesAncientLight,
  type ChartPrecision,
  type PersonGroupKey,
  DEFAULT_FETCH_TIMEOUT_MS,
  withTimeout
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { FlipSignCards } from "../../../src/components/flip-sign-cards";
import { RetrogradeBadge } from "../../../src/components/retrograde-badge";
import { ChartWheel } from "../../../src/components/chart-wheel";
import { ConnectInviteButton } from "../../../src/components/connect-invite-button";
import { EditPersonPanel } from "../../../src/components/edit-person-panel";
import { HonorDeclarationBox } from "../../../src/components/honor-declaration";
import { InitialAvatar } from "../../../src/components/initial-avatar";
import { MemorialTimeline } from "../../../src/components/memorial-timeline";
import { PersonTodayCards, type VelaPinRow } from "../../../src/components/person-today-cards";
import { RemembranceSpace } from "../../../src/components/remembrance-space";
import { Pill } from "../../../src/components/glass";
import { PERSON_DEPTH_SELECT, type PersonDepthRow } from "../../../src/lib/person-row";
import { screenFill } from "../../../src/lib/screen";
import { supabase } from "../../../src/lib/supabase";
import { fonts } from "../../../src/lib/typography";
import { useAuth } from "../../../src/providers/auth-provider";

type PersonRow = PersonDepthRow;

interface NoteRow {
  id: string;
  body: string;
  created_at: string;
  kind?: string | null;
  tags?: string[] | null;
  transit_snapshot?: unknown;
}

export default function PersonProfileScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const [person, setPerson] = useState<PersonRow | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [engineVersion, setEngineVersion] = useState<number>(CHART_ENGINE_VERSION);
  /** Set only when the chart read itself failed, never when a person simply has no chart. */
  const [chartLoadError, setChartLoadError] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  /** Today cards sit above the tab strip; they are never a selected group. Default Them. */
  const [activeGroup, setActiveGroup] = useState<PersonGroupKey>("them");
  const [dailyNudge, setDailyNudge] = useState<PersonDailyNudgeRecord | null>(null);
  const [velaPins, setVelaPins] = useState<VelaPinRow[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editUpgradeTo, setEditUpgradeTo] = useState<Exclude<ChartPrecision, "none"> | null>(null);

  const resolvedPersonId = useMemo(() => (Array.isArray(personId) ? personId[0] : personId), [personId]);

  useEffect(() => {
    if (!session?.user.id || !resolvedPersonId) return;
    void loadProfile();
  }, [resolvedPersonId, session?.user.id]);

  const loadProfile = async () => {
    if (!session?.user.id || !resolvedPersonId) return;

    // A unique index on people(owner_id) WHERE is_self guarantees at most
    // one row here — no ordering/limit tie-breaker needed.
    const actualPersonId =
      resolvedPersonId === "self"
        ? (
            await supabase
              .from("people")
              .select("id")
              .eq("owner_id", session.user.id)
              .eq("is_self", true)
              .maybeSingle()
          ).data?.id
        : resolvedPersonId;

    if (!actualPersonId) {
      setStatus("No self profile found yet. Save yourself in onboarding first.");
      return;
    }

    try {
    const [{ data: personData, error: personError }, { data: chartData, error: chartError }, { data: noteData, error: noteError }] = await withTimeout(Promise.all([
      supabase.from("people").select(PERSON_DEPTH_SELECT).eq("id", actualPersonId).single(),
      supabase.from("charts").select("data, house_system, engine_version").eq("person_id", actualPersonId).maybeSingle(),
      supabase.from("notes").select("id, body, created_at, kind, tags, transit_snapshot").eq("about_person", actualPersonId).order("created_at", { ascending: false }).limit(20)
    ]), DEFAULT_FETCH_TIMEOUT_MS);

    if (personError || !personData) {
      setStatus("This person could not load. Try again.");
      return;
    }
    // Progressive capture, web parity (apps/web/app/app/person/[id]/page.tsx): a
    // person saved with birth_precision "none" has no charts row at all. That is
    // not a failure, so the read uses maybeSingle and a null chart renders the
    // "no birth data yet" state instead of blocking the whole screen. A read that
    // actually failed is kept apart from that, so an outage is never shown as an
    // empty chart (ENGINEERING §12).
    if (noteError) {
      setStatus(noteError.message);
    }

    const personRow = personData as PersonRow;
    setPerson(personRow);
    const natal = (chartData?.data as NatalChart | undefined) ?? null;
    setChart(natal);
    setEngineVersion((chartData?.engine_version as number | null) ?? 1);
    setChartLoadError(chartError?.message ?? null);
    setNotes(noteData ?? []);

    void acknowledgeConnectIfNeeded(session.user.id, personRow);

    if (shouldShowLiveTransits(personRow)) {
      const localDate = ownerLocalDate();
      const { data: existingNudge } = await supabase
        .from("person_daily_nudges")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("person_id", actualPersonId)
        .eq("date", localDate)
        .maybeSingle();
      if (existingNudge) {
        setDailyNudge(coerceDailyNudgeRow(existingNudge as Record<string, unknown>));
      } else {
        const { data: recent } = await supabase
          .from("person_daily_nudges")
          .select("pass_id")
          .eq("person_id", actualPersonId)
          .not("pass_id", "is", null)
          .gte("date", new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10))
          .neq("date", localDate);
        const recentPassIds = new Set(
          (recent ?? []).map((r) => r.pass_id as string).filter(Boolean)
        );
        const row = buildPersonDailyNudge({
          ownerId: session.user.id,
          personId: actualPersonId,
          date: localDate,
          whenUTC: whenUTCForOwnerLocalDate(localDate),
          chart: natal,
          birthPrecision: personRow.birth_precision,
          birthDate: personRow.birth_date,
          relation: personRow.relation,
          isSelf: Boolean(personRow.is_self),
          minorSafe: isMinorForSafety({
            isMinor: personRow.is_minor,
            birthDate: personRow.birth_date,
            birthPrecision: personRow.birth_precision
          }),
          recentPassIds
        });
        await supabase.from("person_daily_nudges").upsert(row, { onConflict: "person_id,date", ignoreDuplicates: true });
        setDailyNudge(row);
      }
    } else {
      setDailyNudge(null);
    }

    const { data: pinRows } = await supabase
      .from("notes")
      .select("id, body, created_at")
      .eq("owner_id", session.user.id)
      .eq("kind", "vela_pin")
      .or(`about_person.eq.${actualPersonId},pair_low.eq.${actualPersonId},pair_high.eq.${actualPersonId}`)
      .order("created_at", { ascending: false })
      .limit(200);
    setVelaPins((pinRows ?? []) as VelaPinRow[]);
    } catch {
      setStatus("This person could not load. Try again.");
    }
  };

  async function acknowledgeConnectIfNeeded(uid: string, row: PersonRow) {
    if (row.is_self) return;
    const { data } = await supabase
      .from("invites")
      .select("id, person_id, accepted_by")
      .eq("from_user", uid)
      .eq("kind", "constellation_connect")
      .eq("status", "accepted")
      .is("sender_ack_at", null);
    const match = (data ?? []).find((invite) =>
      invite.person_id === row.id || (Boolean(row.linked_user_id) && invite.accepted_by === row.linked_user_id)
    );
    if (match) {
      await supabase.rpc("acknowledge_connect_accept", { p_invite_id: match.id });
    }
  }

  const saveNote = async () => {
    if (!session?.user.id || !person?.id || !noteDraft.trim()) return;
    const { error } = await supabase.from("notes").insert({
      owner_id: session.user.id,
      about_person: person.id,
      body: noteDraft.trim()
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setNoteDraft("");
    await loadProfile();
  };

  const natalAspects = useMemo(() => {
    if (!chart || chart.precision === "year") return [];
    return selectNatalAspectGeometry(computeSynastry(chart, chart).aspects);
  }, [chart]);

  const elementBalance = useMemo(() => {
    if (!chart) return null;
    return chart.placements.reduce(
      (acc, placement) => {
        if (isChartPoint(placement.body)) return acc;
        acc[signElement(placement.sign)] += 1;
        return acc;
      },
      { fire: 0, earth: 0, air: 0, water: 0 }
    );
  }, [chart]);

  if (!person) {
    return (
      <View style={{ flex: 1, backgroundColor: "transparent", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: tokens.colors.cream, textAlign: "center" }}>
                    {status ?? "Loading this person."}
        </Text>
        {status === "This person could not load. Try again." ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={() => void loadProfile()}
            style={{ marginTop: 14, backgroundColor: tokens.colors.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <Text style={{ color: tokens.colors.ink, fontWeight: "700" }}>Try again</Text>
          </Pressable>
        ) : (
          <Link href="/onboarding" asChild>
            <Pressable style={{ marginTop: 14, backgroundColor: tokens.colors.gold, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: tokens.colors.ink, fontWeight: "700" }}>Back to onboarding</Text>
            </Pressable>
          </Link>
        )}
      </View>
    );
  }

  const sun = chart?.placements.find((placement) => placement.body === "sun");
  const moon = chart?.placements.find((placement) => placement.body === "moon");
  const rising = chart?.asc;
  const isMemorial = hasPassed(person) && !person.is_self;
  const secondGroup: PersonGroupKey = isMemorial ? "remembrance" : "yours";
  const groupKeys: PersonGroupKey[] = ["them", secondGroup];
  const sunSign = sunSignFromChart(chart);
  const personIsMinor = isMinorForSafety({
    isMinor: person.is_minor,
    birthDate: person.birth_date,
    birthPrecision: person.birth_precision
  });
  const showRemembrance = shouldShowRemembranceSpace(person);
  const showHonorBox = showRemembrance && Boolean(session?.user.id);
  const showTimeline = shouldShowMemorialTimeline(person, chart);
  const hasBirthPlace = Boolean(person.birth_place && person.birth_lat != null && person.birth_lng != null);

  return (
    <ScrollView style={screenFill} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 90 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <InitialAvatar name={person.display_name} size="lg" personId={person.id} sunSign={sunSign} memorial={isMemorial} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: tokens.colors.cream, fontSize: 31, fontFamily: fonts.frauncesSemi }}>{person.display_name}</Text>
          <Text style={{ color: tokens.colors.mist }}>
            {person.relation}{isMemorial ? " · remembered" : ""}
          </Text>
          <ChartPrecisionFacts
            precision={person.birth_precision}
            hasBirthPlace={hasBirthPlace || Boolean(chart?.asc)}
          />
          {isMemorial ? (
            <Text style={{ color: tokens.colors.mist, fontSize: 14, lineHeight: 20, marginTop: 6, borderLeftWidth: 2, borderLeftColor: "rgba(230,174,108,0.4)", paddingLeft: 10 }}>
              Remembered: their chart stays with you. Their light softens into ancient light on your galaxy.
            </Text>
          ) : null}
        </View>
      </View>

      {chart ? <FlipSignCards chart={chart} minorSafe={personIsMinor} /> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <Link href="/compare" asChild>
          <Pill accessibilityLabel="Compare with someone">Compare</Pill>
        </Link>
        {session?.user.id && !usesAncientLight(person) ? <ConnectInviteButton person={person} compact /> : null}
        {!showRemembrance ? (
          <Link href={{ pathname: "/vela", params: { subject: person.id } }} asChild>
            <Pill accessibilityLabel="Ask Vela">Ask Vela</Pill>
          </Link>
        ) : null}
        {showHonorBox ? (
          <Pill
            accessibilityLabel="Who carries their light"
            onPress={() => setActiveGroup("remembrance")}
          >
            Who carries their light ↓
          </Pill>
        ) : null}
      </View>
      {session?.user.id ? (
        <EditPersonPanel
          person={person}
          userId={session.user.id}
          onSaved={() => void loadProfile()}
          onDeleted={() => router.replace("/home")}
          open={editOpen}
          onOpenChange={(next) => {
            setEditOpen(next);
            if (!next) setEditUpgradeTo(null);
          }}
          upgradeTo={editUpgradeTo}
        />
      ) : null}

      {chart ? (
        <View style={cardStyle}>
          <Text style={vocabSubhead}>
            {chart.precision === "exact" && chart.asc
              ? `Natal wheel · ${houseSystemLabelForChart(chart, engineVersion)}`
              : "Zodiac wheel"}
          </Text>
          <Text
            style={{
              color: tokens.colors.cream,
              fontFamily: fonts.fraunces,
              fontSize: 17,
              textAlign: "center",
              marginBottom: 4
            }}
          >
            {person.display_name}
          </Text>
          <ChartWheel chart={chart} aspects={natalAspects} />
          {chart.houseSystemFallbackReason ? (
            <Text style={cardBody}>{chart.houseSystemFallbackReason}</Text>
          ) : null}
          {chart.precision !== "exact" || !chart.asc ? (
            <Text style={cardBody}>
              Houses and rising sign need an exact birth time and location. Add a birth city to unlock the full wheel.
            </Text>
          ) : null}
        </View>
      ) : null}

      <PersonTodayCards
        person={person}
        dailyNudge={dailyNudge}
        velaPins={velaPins}
        showRemembrance={showRemembrance}
        includeVela={false}
        onUpgrade={() => {
          setEditUpgradeTo("date");
          setEditOpen(true);
        }}
      />

      <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6 }}>
        {groupKeys.map((key) => {
          const selected = activeGroup === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveGroup(key)}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
                backgroundColor: selected ? tokens.colors.gold : "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: selected ? tokens.colors.gold : tokens.colors.line
              }}
            >
                            <Text
                style={{
                  color: selected ? tokens.colors.ink : tokens.colors.mist,
                  fontWeight: "700",
                  fontSize: 13,
                  letterSpacing: 0.2
                }}
              >
                {PERSON_GROUP_LABEL[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeGroup === "them" ? (
        chart ? (
          <>
            <View style={cardStyle}>
                            <Text style={cardTitle}>{PERSON_TAB_LABEL["big-three"]}</Text>
              <Text style={vocabSubhead}>{PERSON_TAB_VOCAB["big-three"] ?? "Big three"}</Text>
                            <Text style={cardBody}>Sun: {sun?.confident === false ? "Uncertain (year-only birth data)" : sun?.sign ?? "·"}</Text>
              <Text style={cardBody}>Moon: {moon?.confident === false ? "Uncertain (year-only birth data)" : moon?.sign ?? "·"}</Text>
              <Text style={cardBody}>
                Rising: {rising ?? "Exact time and city needed"}
              </Text>
            </View>

            <View style={cardStyle}>
                            <Text style={cardTitle}>{PERSON_TAB_LABEL.placements}</Text>
              <Text style={vocabSubhead}>{PERSON_TAB_VOCAB.placements ?? "Placements"}</Text>
              {chart.placements
                .filter((placement) => placement.body !== "sun" && placement.body !== "moon")
                .map((placement) => (
                <View key={placement.body} style={{ flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <Text style={cardBody}>
                    {bodyDisplayName(placement.body)} {placement.sign} {placement.degree.toFixed(1)}°
                  </Text>
                  <RetrogradeBadge retro={placement.retro} />
                  {placement.house ? <Text style={cardBody}>{` · House ${placement.house}`}</Text> : null}
                </View>
              ))}
            </View>

            {chart.precision === "year" ? (
              <View style={cardStyle}>
                <Text style={cardTitle}>{PERSON_TAB_LABEL.aspects}</Text>
                <Text style={vocabSubhead}>{PERSON_TAB_VOCAB.aspects ?? "Aspects"}</Text>
                                <Text style={cardBody}>{ASPECTS_UNAVAILABLE_YEAR_BODY}</Text>
                                <Text style={cardBody}>{ASPECTS_UNAVAILABLE_YEAR_FOLLOW_UP}</Text>
              </View>
            ) : null}

            {!(chart.cusps && chart.cusps.length >= 12) ? (
              <View style={cardStyle}>
                <Text style={cardTitle}>{PERSON_TAB_LABEL.houses}</Text>
                <Text style={vocabSubhead}>{PERSON_TAB_VOCAB.houses ?? "Houses"}</Text>
                {(() => {
                  const copy = housesUnavailableCopy(chart.precision);
                  return (
                    <>
                      <Text style={cardBody}>{copy.body}</Text>
                      <Text style={cardBody}>{copy.followUp}</Text>
                    </>
                  );
                })()}
              </View>
            ) : null}

            <View style={cardStyle}>
                            <Text style={cardTitle}>{PERSON_TAB_LABEL.generational}</Text>
              <Text style={vocabSubhead}>{PERSON_TAB_VOCAB.generational ?? "Generational"}</Text>
              <Text style={badgeStyle}>Reads from your birth year</Text>
              <Text style={cardBody}>{chart.generational.cohortLabel}</Text>
              <Text style={cardBody}>
                Uranus in {chart.generational.uranus.sign}: {describeGenerationalArchetype("Uranus", chart.generational.uranus.sign)}
              </Text>
              <Text style={cardBody}>
                Neptune in {chart.generational.neptune.sign}: {describeGenerationalArchetype("Neptune", chart.generational.neptune.sign)}
              </Text>
              <Text style={cardBody}>
                Pluto in {chart.generational.pluto.sign}: {describeGenerationalArchetype("Pluto", chart.generational.pluto.sign)}
              </Text>
              {chart.generational.pluto.confident !== false ? (() => {
                const sign = chart.generational.pluto.sign as SignKey;
                const era = getPlutoEraReading(sign);
                const professional = isProfessionalPersonRelation(person.relation);
                const work = professional ? getPlutoWorkView(sign) : null;
                if (!era && !work) return null;
                return (
                  <View style={{ gap: 6, marginTop: 8 }}>
                    {work ? (
                      <>
                        <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
                          {WORK_VIEW_HEADING}
                        </Text>
                        <Text style={cardBody}>{WORK_VIEW_LABELS.respect}. {work.respect}</Text>
                        <Text style={cardBody}>{WORK_VIEW_LABELS.decisions}. {work.decisions}</Text>
                        <Text style={cardBody}>{WORK_VIEW_LABELS.friction}. {work.friction}</Text>
                      </>
                    ) : null}
                    {era ? (
                      <>
                        <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
                          {ERA_READING_HEADING}
                        </Text>
                        <Text style={cardBody}>{ERA_READING_LABELS.authority}. {era.authority}</Text>
                        <Text style={cardBody}>{ERA_READING_LABELS.institutions}. {era.institutions}</Text>
                        <Text style={cardBody}>{ERA_READING_LABELS.change}. {era.change}</Text>
                        <Text style={cardBody}>{ERA_READING_LABELS.trust}. {era.trust}</Text>
                      </>
                    ) : null}
                    <Text style={[cardBody, { color: tokens.colors.mist2 }]}>{plutoSourceLine(sign)}</Text>
                  </View>
                );
              })() : null}
              {chart.precision === "exact" ? (
                <Text style={[cardBody, { color: tokens.colors.goldSoft }]}>
                  Houses: Uranus {chart.generational.uranusHouse ?? "·"} · Neptune {chart.generational.neptuneHouse ?? "·"} · Pluto {chart.generational.plutoHouse ?? "·"}
                </Text>
              ) : null}
            </View>

            <View style={cardStyle}>
              <Text style={cardTitle}>Elemental balance</Text>
              {elementBalance ? (
                <Text style={cardBody}>
                  Fire {elementBalance.fire} · Earth {elementBalance.earth} · Air {elementBalance.air} · Water {elementBalance.water}
                </Text>
              ) : null}
            </View>
          </>
        ) : chartLoadError ? (
          <View style={cardStyle}>
                        <Text style={cardTitle}>Chart could not be loaded</Text>
            <Text style={cardBody}>{chartLoadError}</Text>
          </View>
        ) : person.birth_precision === "none" ? (
          <View style={cardStyle}>
                        <Text style={cardTitle}>{CHART_PRECISION_NONE_FACT}</Text>
            <Text style={cardBody}>
              There is no chart to show until {person.display_name}&apos;s birth data is added. A birth year on its own is
              enough for the generational layer.
            </Text>
          </View>
        ) : (
          <View style={cardStyle}>
                        <Text style={cardTitle}>{CHART_SAVED_DETAILS_NO_CHART_TITLE}</Text>
                        <Text style={cardBody}>{CHART_SAVED_DETAILS_NO_CHART_BODY}</Text>
          </View>
        )
      ) : null}

      {activeGroup === secondGroup ? (
        <>
          {showRemembrance && session?.user.id ? (
            <RemembranceSpace
              person={person}
              userId={session.user.id}
              chart={chart}
              subjectIsMinor={personIsMinor}
              onSaved={() => void loadProfile()}
            />
          ) : null}
          {showTimeline && session?.user.id ? (
            <MemorialTimeline
              person={person}
              userId={session.user.id}
              chart={chart}
              onDiedOnSaved={() => void loadProfile()}
            />
          ) : null}
          {showHonorBox && session?.user.id ? (
            <HonorDeclarationBox
              person={person}
              userId={session.user.id}
              subjectIsMinor={personIsMinor}
              onSaved={() => void loadProfile()}
            />
          ) : null}
        <View style={cardStyle}>
          <Text style={cardTitle}>Private notes</Text>
          <Pressable
            onPress={() => router.push({ pathname: "/moment", params: { personId: person.id } })}
            style={{ borderWidth: 1, borderColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 10 }}
          >
                        <Text style={{ color: tokens.colors.gold, fontWeight: "700", textAlign: "center" }}>Capture a moment</Text>
          </Pressable>
          <TextInput
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="Log a private moment..."
            placeholderTextColor={tokens.colors.mist2}
            multiline
            style={{
              backgroundColor: tokens.colors.ink3,
              borderColor: tokens.colors.line,
              borderWidth: 1,
              borderRadius: 10,
              color: tokens.colors.cream,
              minHeight: 80,
              textAlignVertical: "top",
              padding: 10
            }}
          />
          <Pressable onPress={saveNote} style={{ backgroundColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 10 }}>
            <Text style={{ color: tokens.colors.ink, fontWeight: "700", textAlign: "center" }}>Save private note</Text>
          </Pressable>
          {notes.length === 0 ? (
            <Text style={cardBody}>No notes yet. Notes are owner-only and never shared.</Text>
          ) : (
            notes.map((note) => {
              const snapshot = note.kind === "moment" ? parseMomentTransitSnapshot(note.transit_snapshot) : null;
              const sky = snapshot
                ? formatMomentSkyContext(snapshot, {
                    personName: person.display_name,
                    isSelf: Boolean(person.is_self)
                  })
                : null;
              return (
              <View key={note.id} style={{ borderWidth: 1, borderColor: tokens.colors.line, borderRadius: 10, padding: 10 }}>
                {note.kind === "moment" ? (
                  <Text style={{ color: tokens.colors.goldSoft, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Moment</Text>
                ) : null}
                <Text style={{ color: tokens.colors.cream }}>{note.body}</Text>
                {sky ? <Text style={{ color: tokens.colors.mist2, fontSize: 12, marginTop: 4 }}>{sky}</Text> : null}
                <Text style={{ color: tokens.colors.mist2, fontSize: 12, marginTop: 4 }}>{new Date(note.created_at).toLocaleString()}</Text>
              </View>
              );
            })
          )}
        </View>
        </>
      ) : null}

      <PersonTodayCards
        person={person}
        dailyNudge={dailyNudge}
        velaPins={velaPins}
        showRemembrance={showRemembrance}
        includeRightNow={false}
      />

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
    </ScrollView>
  );
}

function ChartPrecisionFacts({
  precision,
  hasBirthPlace
}: {
  precision: PersonRow["birth_precision"];
  hasBirthPlace: boolean;
}) {
  const [open, setOpen] = useState(false);
  const explanation = chartPrecisionExplanation(precision, { hasBirthPlace });
  const label = chartPrecisionFact(precision);

  return (
    <View style={{ marginTop: 6, gap: 8 }}>
      <Pressable onPress={() => setOpen((prev) => !prev)} accessibilityRole="button">
        <Text style={{ color: tokens.colors.mist2, fontSize: 14, textDecorationLine: "underline" }}>
          {label}
        </Text>
      </Pressable>
      {open ? (
        <View style={{ gap: 8 }}>
                    <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
            {CHART_PRECISION_SUPPORTS_HEADING}
          </Text>
          <Text style={{ color: tokens.colors.mist, lineHeight: 20 }}>{explanation.supports}</Text>
                    <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
            {CHART_PRECISION_DOES_NOT_HEADING}
          </Text>
          <Text style={{ color: tokens.colors.mist, lineHeight: 20 }}>{explanation.doesNot}</Text>
                    <Text style={{ color: tokens.colors.mist2, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>
            {CHART_PRECISION_WHY_HEADING}
          </Text>
          <Text style={{ color: tokens.colors.mist, lineHeight: 20 }}>{explanation.why}</Text>
        </View>
      ) : null}
    </View>
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

const vocabSubhead = {
  color: tokens.colors.mist2,
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 1.4,
  textTransform: "uppercase"
} as const;

const badgeStyle = {
  alignSelf: "flex-start",
  backgroundColor: tokens.colors.ink,
  color: tokens.colors.gold,
  borderWidth: 1,
  borderColor: tokens.colors.goldSoft,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
  overflow: "hidden"
} as const;
