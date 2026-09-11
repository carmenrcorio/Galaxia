import { tokens } from "@galaxia/ui";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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

export default function SettingsScreen() {
  const { session } = useAuth();
  const { status: subStatus, trialDaysLeft, comped } = useEntitlement();
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [periodEndLabel, setPeriodEndLabel] = useState<string | null>(null);
  const [relationalTransitAlerts, setRelationalTransitAlerts] = useState<RelationalTransitAlertsPref>("all");
  const [savingRelationalPref, setSavingRelationalPref] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    void loadSettingsData();
  }, [session?.user.id]);

  const loadSettingsData = async () => {
    if (!session?.user.id) return;
    const [{ data: profile }, { data: peopleRows }, { data: groupRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("cancel_at_period_end, current_period_end, relational_transit_alerts")
        .eq("id", session.user.id)
        .maybeSingle(),
      supabase.from("people").select("id, display_name, relation").eq("owner_id", session.user.id).order("display_name", { ascending: true }),
      supabase.from("groups").select("id, name, kind").eq("owner_id", session.user.id).order("created_at", { ascending: false })
    ]);
    setCancelAtPeriodEnd(Boolean(profile?.cancel_at_period_end));
    setPeriodEndLabel(formatDate((profile?.current_period_end as string | null) ?? null));
    setRelationalTransitAlerts(isRelationalTransitAlertsPref(profile?.relational_transit_alerts) ? profile.relational_transit_alerts : "all");
    setPeople((peopleRows ?? []) as PersonLite[]);
    setGroups((groupRows ?? []) as GroupLite[]);
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
      setStatus(error.message);
    }
  };

  // FOUNDER-REVIEW: Settings subscription card copy — refine voice.
  let subscriptionBody: string;
  if (comped) {
    // FOUNDER-REVIEW: permanent comp access — not a subscription, not a trial.
    // FOUNDER-REVIEW: rewritten (no U+2014).
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink2 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 30, fontWeight: "700" }}>Settings</Text>

      <View style={cardStyle}>
        <Text style={cardTitle}>Subscription</Text>
        <Text style={cardBody}>{subscriptionBody}</Text>
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
        <Text style={cardTitle}>People</Text>
        {people.length === 0 ? (
          <Text style={cardBody}>No people yet.</Text>
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
          <Text style={cardBody}>No groups yet.</Text>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={listItem}>
              <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>{group.name}</Text>
              <Text style={{ color: tokens.colors.mist }}>{group.kind}</Text>
            </View>
          ))
        )}
      </View>

      {status ? <Text style={{ color: tokens.colors.gold }}>{status}</Text> : null}
    </ScrollView>
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

const listItem = {
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: 10,
  padding: 10
} as const;
