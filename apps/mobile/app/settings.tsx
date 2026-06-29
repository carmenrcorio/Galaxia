import { tokens } from "@galaxia/ui";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";
import { useEntitlement } from "../src/providers/entitlement-provider";

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

export default function SettingsScreen() {
  const { session } = useAuth();
  const { tier, setTier, refresh } = useEntitlement();
  const [people, setPeople] = useState<PersonLite[]>([]);
  const [groups, setGroups] = useState<GroupLite[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    void loadSettingsData();
  }, [session?.user.id]);

  const loadSettingsData = async () => {
    if (!session?.user.id) return;
    const [{ data: peopleRows }, { data: groupRows }] = await Promise.all([
      supabase.from("people").select("id, display_name, relation").eq("owner_id", session.user.id).order("display_name", { ascending: true }),
      supabase.from("groups").select("id, name, kind").eq("owner_id", session.user.id).order("created_at", { ascending: false })
    ]);
    setPeople((peopleRows ?? []) as PersonLite[]);
    setGroups((groupRows ?? []) as GroupLite[]);
  };

  const switchTier = async () => {
    const nextTier = tier === "free" ? "plus" : "free";
    await setTier(nextTier);
    await refresh();
    setStatus(nextTier === "plus" ? "Galaxia+ enabled (mock RevenueCat sync)." : "Switched to free tier.");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.colors.ink2 }} contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 100 }}>
      <Text style={{ color: tokens.colors.cream, fontSize: 30, fontWeight: "700" }}>Settings</Text>

      <View style={cardStyle}>
        <Text style={cardTitle}>Subscription</Text>
        <Text style={cardBody}>Current plan: {tier === "plus" ? "Galaxia+" : "Free"}</Text>
        <Pressable onPress={switchTier} style={primaryButton}>
          <Text style={{ color: tokens.colors.ink, textAlign: "center", fontWeight: "700" }}>
            {tier === "plus" ? "Switch to Free (debug)" : "Upgrade to Galaxia+ (debug)"}
          </Text>
        </Pressable>
        <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>
          RevenueCat wiring is scaffolded via `useEntitlement`; replace debug toggle with live purchase actions in production.
        </Text>
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

const primaryButton = {
  backgroundColor: tokens.colors.gold,
  borderRadius: 999,
  paddingVertical: 12
} as const;

const listItem = {
  borderWidth: 1,
  borderColor: tokens.colors.line,
  borderRadius: 10,
  padding: 10
} as const;
