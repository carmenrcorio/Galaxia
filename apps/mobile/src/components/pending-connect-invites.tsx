import { DEFAULT_FETCH_TIMEOUT_MS, withTimeout } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  CONNECT_EMPTY_PENDING,
  CONNECT_GENERIC_ERROR,
  CONNECT_PENDING_LOADING,
  CONNECT_PENDING_TITLE,
  connectInviteTimeRemaining,
  connectRelationLabel
} from "../lib/connect-invite";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/typography";
import { useAuth } from "../providers/auth-provider";
import { GlassCard } from "./glass";

type PendingInvite = {
  token: string;
  relationship_type: string | null;
  expires_at: string;
  person_id: string | null;
  recipient_name: string | null;
};

export function PendingConnectInvites() {
  const { session } = useAuth();
  const [rows, setRows] = useState<PendingInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        await withTimeout(
          (async () => {
            const user = session?.user;
            if (!user) {
              setRows([]);
              return;
            }
            const { data, error: loadError } = await supabase
              .from("invites")
              .select("token, relationship_type, expires_at, person_id")
              .eq("from_user", user.id)
              .eq("kind", "constellation_connect")
              .eq("status", "pending")
              .order("created_at", { ascending: false });
            if (loadError) {
              setError(CONNECT_GENERIC_ERROR);
              setRows([]);
              return;
            }
            const invites = (data ?? []) as Array<{
              token: string;
              relationship_type: string | null;
              expires_at: string;
              person_id: string | null;
            }>;
            const personIds = invites.map((row) => row.person_id).filter((id): id is string => Boolean(id));
            const names = new Map<string, string>();
            if (personIds.length) {
              const { data: people } = await supabase.from("people").select("id, display_name").in("id", personIds);
              for (const person of people ?? []) {
                names.set(person.id as string, person.display_name as string);
              }
            }
            setRows(
              invites.map((row) => ({
                ...row,
                recipient_name: (row.person_id && names.get(row.person_id)) || null
              }))
            );
          })(),
          DEFAULT_FETCH_TIMEOUT_MS
        );
      } catch {
        setError(CONNECT_GENERIC_ERROR);
        setRows([]);
      }
    };
    void load();
  }, [session?.user.id]);

  const revoke = async (token: string) => {
    const snapshot = rows ?? [];
    const removed = snapshot.find((row) => row.token === token);
    setRevoking(token);
    setError(null);
    setRows(snapshot.filter((row) => row.token !== token));
    const { error: rpcError } = await supabase.rpc("revoke_connect_invite", { p_token: token });
    setRevoking(null);
    if (rpcError) {
      setError(CONNECT_GENERIC_ERROR);
      if (removed) {
        setRows((current) => {
          const list = current ?? [];
          if (list.some((row) => row.token === token)) return list;
          return [...list, removed];
        });
      }
    }
  };

  return (
    <GlassCard testID="pending-connections">
      <Text style={{ color: tokens.colors.cream, fontFamily: fonts.frauncesSemi, fontSize: 18 }}>
        {CONNECT_PENDING_TITLE}
      </Text>
      {rows === null ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <ActivityIndicator size="small" color={tokens.colors.gold} />
          <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>{CONNECT_PENDING_LOADING}</Text>
        </View>
      ) : rows.length === 0 ? (
        <Text style={{ color: tokens.colors.mist, lineHeight: 20 }}>{CONNECT_EMPTY_PENDING}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {rows.map((row) => {
            const relationLabel = connectRelationLabel(row.relationship_type);
            const named = Boolean(row.person_id && row.recipient_name);
            const primary = named ? row.recipient_name! : relationLabel;
            const meta: string[] = [];
            if (named && relationLabel) meta.push(relationLabel);
            meta.push(connectInviteTimeRemaining(row.expires_at));
            return (
              <View
                key={row.token}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.colors.line
                }}
              >
                <View style={{ flex: 1 }}>
                  {primary ? <Text style={{ color: tokens.colors.cream }}>{primary}</Text> : null}
                  <Text style={{ color: tokens.colors.mist, fontSize: 13 }}>{meta.join(" · ")}</Text>
                </View>
                <Pressable
                  onPress={() => void revoke(row.token)}
                  disabled={revoking === row.token}
                  accessibilityRole="button"
                  accessibilityLabel={primary ? `Revoke invite for ${primary}` : "Revoke"}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: tokens.colors.line,
                    paddingHorizontal: 12,
                    paddingVertical: 8
                  }}
                >
                  <Text style={{ color: tokens.colors.cream, fontFamily: fonts.interSemi, fontSize: 13 }}>
                    {revoking === row.token ? "Revoking…" : "Revoke"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
      {error ? <Text style={{ color: tokens.colors.rose, fontSize: 13 }}>{error}</Text> : null}
    </GlassCard>
  );
}
