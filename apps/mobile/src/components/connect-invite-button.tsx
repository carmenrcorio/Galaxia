import {
  CONNECT_GENERIC_ERROR,
  CONNECT_INVITE_ACTION,
  CONNECT_LINK_CREATE_FAILED,
  CONNECT_LINK_EXPIRES,
  CONNECT_PENDING_TITLE,
  CONNECT_RATE_LIMIT,
  CONNECT_SHARE_TEXT,
  CONNECT_SHARE_TITLE,
  canOfferConnectInvite,
  connectPath,
  connectRelationForPerson,
  isConnectMergeTarget,
  isConnectRateLimitError,
  type ConnectPersonGate
} from "../lib/connect-invite";
import { siteUrlFor } from "../lib/env";
import { supabase } from "../lib/supabase";
import { fonts } from "../lib/typography";
import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Share, Text, View } from "react-native";

export function ConnectInviteButton({
  person,
  compact = false
}: {
  person: ConnectPersonGate & { id: string; display_name: string };
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  if (!canOfferConnectInvite(person)) return null;

  const createLink = async () => {
    setBusy(true);
    setError(null);
    setRateLimited(false);
    const merge = isConnectMergeTarget(person);
    const { data, error: rpcError } = await supabase.rpc("create_connect_invite", {
      p_relation: connectRelationForPerson(person.relation),
      p_person_id: merge ? person.id : null,
      p_share_back: false
    });
    setBusy(false);
    if (rpcError) {
      if (isConnectRateLimitError(rpcError.message)) {
        setRateLimited(true);
        setError(CONNECT_RATE_LIMIT);
        return;
      }
      setError(CONNECT_GENERIC_ERROR);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    const token = row?.token as string | undefined;
    if (!token) {
      setError(CONNECT_LINK_CREATE_FAILED);
      return;
    }
    try {
      const path = connectPath(token).replace(/^\//, "");
      setLink(siteUrlFor(path));
    } catch {
      setError(CONNECT_LINK_CREATE_FAILED);
    }
  };

  const share = async () => {
    if (!link) return;
    try {
      await Share.share({ title: CONNECT_SHARE_TITLE, message: `${CONNECT_SHARE_TEXT} ${link}` });
    } catch {
      /* cancelled */
    }
  };

  if (link) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 18 }}>{CONNECT_LINK_EXPIRES}</Text>
        <Text selectable style={{ color: tokens.colors.cream, fontSize: 13 }}>
          {link}
        </Text>
        <Pressable
          onPress={() => void share()}
          accessibilityRole="button"
          accessibilityLabel="Share"
          style={pill}
        >
          <Text style={pillLabel}>Share</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => void createLink()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={CONNECT_INVITE_ACTION}
        style={[pill, { flexDirection: "row", gap: 8, alignItems: "center" }]}
      >
        {busy ? <ActivityIndicator size="small" color={tokens.colors.gold} /> : null}
        <Text style={[pillLabel, { fontSize: compact ? 13 : 14 }]}>
          {busy ? "Creating link…" : CONNECT_INVITE_ACTION}
        </Text>
      </Pressable>
      {error ? (
        <Text style={{ color: tokens.colors.rose, fontSize: 12, lineHeight: 18 }}>
          {error}
          {rateLimited ? " " : ""}
        </Text>
      ) : null}
      {rateLimited ? (
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={CONNECT_PENDING_TITLE}>
            <Text style={{ color: tokens.colors.gold, fontFamily: fonts.interSemi, fontSize: 13 }}>
              {CONNECT_PENDING_TITLE}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const pill = {
  alignSelf: "flex-start" as const,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: tokens.colors.line,
  paddingHorizontal: 12,
  paddingVertical: 9,
  backgroundColor: "rgba(255,255,255,0.03)"
};

const pillLabel = {
  color: tokens.colors.cream,
  fontFamily: fonts.interSemi
};
