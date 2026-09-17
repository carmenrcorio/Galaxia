import type { HouseSystem } from "@galaxia/astro";
import { HOUSE_SYSTEM_OPTIONS, isHouseSystem } from "@galaxia/astro";
import {
  ACCOUNT_DELETE_COPY,
  ACCOUNT_EXPORT_COPY,
  DEFAULT_FETCH_TIMEOUT_MS,
  DELETE_CONFIRMATION_WORD,
  isDeleteConfirmation,
  shouldWarnBillingOnDelete,
  withTimeout
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { requestAccountDelete, requestAccountExport } from "../../src/lib/account-api";
import { siteUrlFor } from "../../src/lib/env";
import { supabase } from "../../src/lib/supabase";
import { useAuth } from "../../src/providers/auth-provider";
import { useEntitlement } from "../../src/providers/entitlement-provider";

interface PersonLite {
  id: string;
  display_name: string;
  relation: string;
}

interface GroupLite {
  id: string;
  name: string;
  kind: string;
}

/** Generations Feature 3 preference — mirrors the `profiles.relational_transit_alerts` check constraint (web parity: apps/web/app/app/settings/page.tsx). */
type RelationalTransitAlertsPref = "all" | "major_only" | "off";
const RELATIONAL_TRANSIT_ALERTS_OPTIONS: { value: RelationalTransitAlertsPref; label: string; description: string }[] = [
  { value: "all", label: "All transits", description: "Jupiter, Saturn, Uranus, Neptune, and Pluto." },
  { value: "major_only", label: "Major only", description: "Just Saturn, Uranus, and Pluto." },
  { value: "off", label: "Off", description: "No relational transit alerts, in the app or by push." }
];
function isRelationalTransitAlertsPref(value: unknown): value is RelationalTransitAlertsPref {
  return value === "all" || value === "major_only" || value === "off";
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

const SETTINGS_PREFS_LOADING = "Loading your settings.";
const SETTINGS_PREFS_ERROR = "Your settings could not load. Try again.";
const SETTINGS_PREFS_RETRY = "Try again";
const SETTINGS_PEOPLE_EMPTY = "No people yet. Add someone to your constellation.";
const SETTINGS_GROUPS_EMPTY = "No groups yet. Create one from Groups.";

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { status: subStatus, trialDaysLeft, comped } = useEntitlement();
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [periodEndLabel, setPeriodEndLabel] = useState<string | null>(null);
  const [houseSystem, setHouseSystem] = useState<HouseSystem>("placidus");
  const [savingHouseSystem, setSavingHouseSystem] = useState(false);
  const [houseSystemStatus, setHouseSystemStatus] = useState<string | null>(null);
  const [dailyNudgeEmailsEnabled, setDailyNudgeEmailsEnabled] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);
  const [weeklyLetterEnabled, setWeeklyLetterEnabled] = useState(true);
  const [savingWeeklyLetter, setSavingWeeklyLetter] = useState(false);
  const [weeklyLetterStatus, setWeeklyLetterStatus] = useState<string | null>(null);
  const [relationalTransitAlerts, setRelationalTransitAlerts] = useState<RelationalTransitAlertsPref>("all");
  const [savingRelationalPref, setSavingRelationalPref] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportBody, setSupportBody] = useState("");
  const [submittingSupport, setSubmittingSupport] = useState(false);
  const [supportStatus, setSupportStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsError, setPrefsError] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    void loadSettingsData();
  }, [session?.user.id]);

  const loadSettingsData = async () => {
    if (!session?.user.id) return;
    setPrefsLoading(true);
    setPrefsError(false);
    try {
      await withTimeout((async () => {
        const [{ data: profile }, { data: peopleRows }, { data: groupRows }] = await Promise.all([
          supabase
            .from("profiles")
            .select("cancel_at_period_end, current_period_end, house_system, daily_nudge_emails_enabled, weekly_constellation_letter_enabled, relational_transit_alerts")
            .eq("id", session.user.id)
            .maybeSingle(),
          supabase.from("people").select("id, display_name, relation").eq("owner_id", session.user.id).order("display_name", { ascending: true }),
          supabase.from("groups").select("id, name, kind").eq("owner_id", session.user.id).order("created_at", { ascending: false })
        ]);
        setCancelAtPeriodEnd(Boolean(profile?.cancel_at_period_end));
        setPeriodEndLabel(formatDate((profile?.current_period_end as string | null) ?? null));
        if (isHouseSystem(profile?.house_system)) setHouseSystem(profile.house_system);
        setDailyNudgeEmailsEnabled(profile?.daily_nudge_emails_enabled !== false);
        setWeeklyLetterEnabled(profile?.weekly_constellation_letter_enabled !== false);
        setRelationalTransitAlerts(isRelationalTransitAlertsPref(profile?.relational_transit_alerts) ? profile.relational_transit_alerts : "all");
        setPeople((peopleRows ?? []) as PersonLite[]);
        setGroups((groupRows ?? []) as GroupLite[]);
        setAccountEmail(session.user.email ?? null);
      })(), DEFAULT_FETCH_TIMEOUT_MS);
    } catch {
      setPrefsError(true);
    } finally {
      setPrefsLoading(false);
    }
  };

  const changeHouseSystem = async (next: HouseSystem) => {
    if (!session?.user.id || next === houseSystem) return;
    setSavingHouseSystem(true);
    setHouseSystemStatus(null);
    const previous = houseSystem;
    setHouseSystem(next);
    const { error } = await supabase.from("profiles").upsert({ id: session.user.id, house_system: next });
    setSavingHouseSystem(false);
    if (error) {
      setHouseSystem(previous);
      setHouseSystemStatus("House system could not be saved. Try again.");
      return;
    }
    setHouseSystemStatus("Saved. Each chart recomputes with the new system the next time you open it.");
  };

  const changeDailyNudgeEmails = async (next: boolean) => {
    if (!session?.user.id || next === dailyNudgeEmailsEnabled) return;
    setSavingConsent(true);
    setConsentStatus(null);
    const previous = dailyNudgeEmailsEnabled;
    setDailyNudgeEmailsEnabled(next);
    const { error } = await supabase.from("profiles").update({ daily_nudge_emails_enabled: next }).eq("id", session.user.id);
    setSavingConsent(false);
    if (error) {
      setDailyNudgeEmailsEnabled(previous);
      setConsentStatus("Daily sky email preference could not be saved. Try again.");
      return;
    }
    setConsentStatus(next ? "Saved. Daily sky emails are on." : "Saved. Daily sky emails are off.");
  };

  const changeWeeklyLetter = async (next: boolean) => {
    if (!session?.user.id || next === weeklyLetterEnabled) return;
    setSavingWeeklyLetter(true);
    setWeeklyLetterStatus(null);
    const previous = weeklyLetterEnabled;
    setWeeklyLetterEnabled(next);
    const { error } = await supabase.from("profiles").update({ weekly_constellation_letter_enabled: next }).eq("id", session.user.id);
    setSavingWeeklyLetter(false);
    if (error) {
      setWeeklyLetterEnabled(previous);
      setWeeklyLetterStatus("Weekly letter preference could not be saved. Try again.");
      return;
    }
    setWeeklyLetterStatus(next ? "Saved. The weekly letter is on." : "Saved. The weekly letter is off.");
  };

  const changeRelationalTransitAlerts = async (next: RelationalTransitAlertsPref) => {
    if (!session?.user.id || next === relationalTransitAlerts) return;
    setSavingRelationalPref(true);
    const previous = relationalTransitAlerts;
    setRelationalTransitAlerts(next);
    const { error } = await supabase.from("profiles").update({ relational_transit_alerts: next }).eq("id", session.user.id);
    setSavingRelationalPref(false);
    if (error) {
      setRelationalTransitAlerts(previous);
      setStatus("This week alerts preference could not be saved. Try again.");
    }
  };

  const submitSupportRequest = async () => {
    if (!session?.user.id) return;
    const subject = supportSubject.trim();
    const body = supportBody.trim();
    if (!subject || !body) {
      setSupportStatus("Please fill in both the subject and message.");
      return;
    }
    setSubmittingSupport(true);
    setSupportStatus(null);
    const { error } = await supabase.from("support_requests").insert({
      owner_id: session.user.id,
      email: accountEmail ?? "",
      subject,
      body
    });
    setSubmittingSupport(false);
    if (error) {
      setSupportStatus("The support message could not be sent. Try again.");
      return;
    }
    setSupportSubject("");
    setSupportBody("");
    setSupportStatus("Sent. We'll follow up by email.");
  };

  const downloadExport = async () => {
    const token = session?.access_token;
    if (!token) return;
    setExporting(true);
    setExportError(null);
    const result = await requestAccountExport(token);
    if (!result.ok) {
      setExportError(result.error);
      setExporting(false);
      return;
    }
    try {
      await Share.share({ title: result.filename, message: result.json });
    } catch {
      setExportError(ACCOUNT_EXPORT_COPY.errorGeneric);
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    const token = session?.access_token;
    if (!token || !isDeleteConfirmation(deleteTyped)) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await requestAccountDelete(token, deleteTyped);
    if (!result.ok) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    await signOut();
  };

  const openBillingOnWeb = () => {
    try {
      void Linking.openURL(siteUrlFor("account/cancel"));
    } catch {
      setStatus("We could not open billing on the web. Try again from a browser.");
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setStatus("Sign out could not finish. Try again.");
      setSigningOut(false);
    }
  };

  let subscriptionBody: string;
  if (comped) {
    subscriptionBody = "Permanent access. This account is complimentary. You are not billed.";
  } else if (subStatus === "trialing") {
    subscriptionBody = `14 days, everything included. ${trialDaysLeft} left in your trial.`;
  } else if (subStatus === "active" && cancelAtPeriodEnd) {
    subscriptionBody = periodEndLabel
      ? `Canceled. Access until ${periodEndLabel}. Manage billing on the web.`
      : "Canceled. Access continues until the end of your current period. Manage billing on the web.";
  } else if (subStatus === "canceled" || subStatus === "past_due") {
    subscriptionBody = "Your subscription has ended. Manage it on the web to continue.";
  } else {
    subscriptionBody = "You're subscribed. Cancel or manage billing on the web in Settings.";
  }

  const showBillingWarning = shouldWarnBillingOnDelete(subStatus);
  const canDelete = isDeleteConfirmation(deleteTyped);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink2 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 30, fontWeight: "700" }}>Settings</Text>

      {prefsLoading ? (
        <View style={cardStyle}>
          <Text style={cardBody}>{SETTINGS_PREFS_LOADING}</Text>
        </View>
      ) : prefsError ? (
        <View style={cardStyle}>
          <Text style={cardBody}>{SETTINGS_PREFS_ERROR}</Text>
          <Pressable onPress={() => void loadSettingsData()}>
            <Text style={{ color: tokens.colors.gold, fontWeight: "700" }}>{SETTINGS_PREFS_RETRY}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={cardStyle}>
        <Text style={cardTitle}>Subscription</Text>
        <Text style={cardBody}>{subscriptionBody}</Text>
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>House system</Text>
        <Text style={cardBody}>
          How the twelve houses are divided on charts with an exact birth time. Placidus is the default and matches astro.com and Cafe Astrology.
        </Text>
        <View style={{ gap: 8 }}>
          {HOUSE_SYSTEM_OPTIONS.map((option) => {
            const active = houseSystem === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => void changeHouseSystem(option.value)}
                disabled={savingHouseSystem}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? tokens.colors.gold : tokens.colors.line,
                  backgroundColor: active ? "rgba(230,174,108,0.09)" : "transparent",
                  padding: 10
                }}
              >
                <Text style={{ color: active ? tokens.colors.gold : tokens.colors.cream, fontWeight: "700", fontSize: 14 }}>
                  {option.label}{active ? " ✓ in use" : ""}
                </Text>
                <Text style={{ color: tokens.colors.mist2, fontSize: 12, marginTop: 2 }}>{option.description}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: tokens.colors.mist2, fontSize: 12, lineHeight: 18 }}>
          Placidus is undefined at polar latitudes (above roughly 66°). If a birth place is inside the polar circles, that chart shows Whole Sign instead: and says so.
        </Text>
        {houseSystemStatus ? (
          <Text style={{ color: houseSystemStatus.startsWith("Saved") ? tokens.colors.gold : tokens.colors.rose, fontSize: 13 }}>
            {houseSystemStatus}
          </Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Daily sky email</Text>
        <Text style={cardBody}>
          A short email with what's moving in your sky today, sent once a day. On by default. Turn it off any time here. Every email also has a one-click unsubscribe link.
        </Text>
        <Pressable
          onPress={() => void changeDailyNudgeEmails(!dailyNudgeEmailsEnabled)}
          disabled={savingConsent}
          accessibilityRole="button"
          accessibilityState={{ selected: dailyNudgeEmailsEnabled }}
          style={pillStyle}
        >
          <Text style={pillLabel}>{dailyNudgeEmailsEnabled ? "On (turn off)" : "Off (turn on)"}</Text>
        </Pressable>
        {consentStatus ? (
          <Text style={{ color: consentStatus.startsWith("Saved") ? tokens.colors.gold : tokens.colors.rose, fontSize: 13 }}>
            {consentStatus}
          </Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Weekly constellation letter</Text>
        <Text style={cardBody}>
          A Sunday letter about who in your circle has something real moving this week. On by default. Independent of the daily sky email. Turn it off any time here; every letter also has a one-click unsubscribe link.
        </Text>
        <Pressable
          onPress={() => void changeWeeklyLetter(!weeklyLetterEnabled)}
          disabled={savingWeeklyLetter}
          accessibilityRole="button"
          accessibilityState={{ selected: weeklyLetterEnabled }}
          style={pillStyle}
        >
          <Text style={pillLabel}>{weeklyLetterEnabled ? "On (turn off)" : "Off (turn on)"}</Text>
        </Pressable>
        {weeklyLetterStatus ? (
          <Text style={{ color: weeklyLetterStatus.startsWith("Saved") ? tokens.colors.gold : tokens.colors.rose, fontSize: 13 }}>
            {weeklyLetterStatus}
          </Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Generational transit alerts</Text>
        <Text style={cardBody}>Alerts when a slow-moving transit hits two or more people in your constellation at once.</Text>
        <View style={{ gap: 8, marginTop: 4 }}>
          {RELATIONAL_TRANSIT_ALERTS_OPTIONS.map((option) => {
            const active = relationalTransitAlerts === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => void changeRelationalTransitAlerts(option.value)}
                disabled={savingRelationalPref}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: active ? tokens.colors.gold : tokens.colors.line,
                  backgroundColor: active ? "rgba(230,174,108,0.09)" : "transparent",
                  padding: 10
                }}
              >
                <Text style={{ color: active ? tokens.colors.gold : tokens.colors.cream, fontWeight: "700", fontSize: 14 }}>
                  {option.label}{active ? " ✓" : ""}
                </Text>
                <Text style={{ color: tokens.colors.mist2, fontSize: 12, marginTop: 2 }}>{option.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Privacy & shared spaces</Text>
        <Text style={cardBody}>Private notes are owner-only and excluded from shared-mode Vela context.</Text>
        <Text style={cardBody}>Shared spaces require participant consent and are blocked for minor-involved scopes.</Text>
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Contact support</Text>
        <Text style={cardBody}>Send us a note: we'll reply to {accountEmail ?? "the email on this account"}.</Text>
        <TextInput
          value={supportSubject}
          onChangeText={setSupportSubject}
          placeholder="Subject"
          placeholderTextColor={tokens.colors.mist2}
          editable={!submittingSupport}
          maxLength={200}
          style={fieldStyle}
        />
        <TextInput
          value={supportBody}
          onChangeText={setSupportBody}
          placeholder="What's going on?"
          placeholderTextColor={tokens.colors.mist2}
          editable={!submittingSupport}
          maxLength={4000}
          multiline
          style={[fieldStyle, { minHeight: 96, textAlignVertical: "top" }]}
        />
        <Pressable
          onPress={() => void submitSupportRequest()}
          disabled={submittingSupport || !supportSubject.trim() || !supportBody.trim()}
          style={pillStyle}
        >
          <Text style={pillLabel}>{submittingSupport ? "Sending…" : "Send"}</Text>
        </Pressable>
        {supportStatus ? (
          <Text style={{ color: supportStatus.startsWith("Sent") ? tokens.colors.gold : tokens.colors.rose, fontSize: 13 }}>
            {supportStatus}
          </Text>
        ) : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>{ACCOUNT_EXPORT_COPY.title}</Text>
        <Text style={cardBody}>{ACCOUNT_EXPORT_COPY.lead}</Text>
        {accountEmail ? <Text style={{ color: tokens.colors.goldSoft, fontSize: 13 }}>Account: {accountEmail}</Text> : null}
        <Pressable onPress={() => void downloadExport()} disabled={exporting} style={pillStyle}>
          <Text style={pillLabel}>{exporting ? "Preparing…" : ACCOUNT_EXPORT_COPY.button}</Text>
        </Pressable>
        {exportError ? <Text style={{ color: tokens.colors.rose, fontSize: 13 }}>{exportError}</Text> : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>{ACCOUNT_DELETE_COPY.title}</Text>
        <Text style={cardBody}>{ACCOUNT_DELETE_COPY.lead}</Text>
        <Text style={cardBody}>{ACCOUNT_DELETE_COPY.irreversible}</Text>
        <Text style={cardBody}>{ACCOUNT_DELETE_COPY.shareHonesty}</Text>
        {showBillingWarning ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "rgba(230,174,108,0.35)",
              backgroundColor: "rgba(230,174,108,0.08)",
              borderRadius: 12,
              padding: 12,
              gap: 8
            }}
          >
            <Text style={{ color: tokens.colors.cream, lineHeight: 20 }}>{ACCOUNT_DELETE_COPY.billingWarning}</Text>
            <Pressable onPress={openBillingOnWeb}>
              <Text style={{ color: tokens.colors.gold, fontWeight: "700" }}>{ACCOUNT_DELETE_COPY.billingLinkLabel}</Text>
            </Pressable>
          </View>
        ) : null}
        {deleteStep === "idle" ? (
          <Pressable
            onPress={() => {
              setDeleteStep("confirm");
              setDeleteTyped("");
              setDeleteError(null);
            }}
            style={pillStyle}
          >
            <Text style={pillLabel}>Continue to delete…</Text>
          </Pressable>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={cardBody}>{ACCOUNT_DELETE_COPY.typePrompt}</Text>
            <TextInput
              value={deleteTyped}
              onChangeText={setDeleteTyped}
              placeholder={DELETE_CONFIRMATION_WORD}
              placeholderTextColor={tokens.colors.mist2}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
              style={fieldStyle}
            />
            <Pressable
              onPress={() => void deleteAccount()}
              disabled={!canDelete || deleting}
              style={[pillStyle, { opacity: !canDelete || deleting ? 0.5 : 1 }]}
            >
              <Text style={pillLabel}>{deleting ? "Deleting…" : ACCOUNT_DELETE_COPY.confirmButton}</Text>
            </Pressable>
            <Pressable
              disabled={deleting}
              onPress={() => {
                setDeleteStep("idle");
                setDeleteTyped("");
                setDeleteError(null);
              }}
            >
              <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>Never mind</Text>
            </Pressable>
          </View>
        )}
        {deleteError ? <Text style={{ color: tokens.colors.rose, fontSize: 13 }}>{deleteError}</Text> : null}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>People</Text>
        {people.length === 0 ? (
          <Link href="/onboarding" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Add someone">
              <Text style={cardBody}>{SETTINGS_PEOPLE_EMPTY}</Text>
            </Pressable>
          </Link>
        ) : (
          people.map((person) => (
            <View key={person.id} style={listItem}>
              <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>{person.display_name}</Text>
              <Text style={{ color: tokens.colors.mist }}>{person.relation}</Text>
            </View>
          ))
        )}
      </View>

      <View style={cardStyle}>
        <Text style={cardTitle}>Groups</Text>
        {groups.length === 0 ? (
          <Text style={cardBody}>{SETTINGS_GROUPS_EMPTY}</Text>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={listItem}>
              <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>{group.name}</Text>
              <Text style={{ color: tokens.colors.mist }}>{group.kind}</Text>
            </View>
          ))
        )}
      </View>

      <Pressable onPress={() => void handleSignOut()} disabled={signingOut} style={pillStyle}>
        <Text style={pillLabel}>{signingOut ? "Signing out…" : "Sign out"}</Text>
      </Pressable>
      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
    </ScrollView>
  );
}

const cardStyle = {
  backgroundColor: tokens.colors.ink3,
  borderRadius: tokens.radii.lg,
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

const listItem = {
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: 10,
  padding: 10
} as const;

const fieldStyle = {
  backgroundColor: tokens.colors.ink2,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: tokens.colors.cream
} as const;

const pillStyle = {
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: tokens.radii.pill,
  paddingVertical: 10,
  paddingHorizontal: 14,
  alignSelf: "flex-start"
} as const;

const pillLabel = {
  color: tokens.colors.cream,
  fontWeight: "700"
} as const;
