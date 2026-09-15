import { ASK_BIRTH_DATA_TOGGLE, canCreateBirthDataInvite, type MinorSafetyInput } from "@galaxia/core";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Share, Text, View } from "react-native";
import { tokens } from "@galaxia/ui";
import {
  ASK_BIRTH_DATA_CREATING,
  ASK_BIRTH_DATA_REUSED,
  ASK_BIRTH_DATA_SHARE,
  askBirthDataAskCopy,
  askBirthDataSendCopy,
  ensureBirthDataInvite
} from "../lib/ensure-birth-data-invite";
import { supabase } from "../lib/supabase";

export function AskBirthData({
  personId,
  personName,
  userId,
  autoCreate = false,
  isMinor,
  birthDate,
  birthPrecision
}: {
  personId: string;
  personName: string;
  userId: string;
  autoCreate?: boolean;
  isMinor?: boolean | null;
  birthDate?: string | null;
  birthPrecision?: MinorSafetyInput["birthPrecision"];
}) {
  const person: MinorSafetyInput = { isMinor, birthDate, birthPrecision };
  const blocked = !canCreateBirthDataInvite(person);
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [reused, setReused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState(blocked);

  useEffect(() => {
    if (!userId || !personId || blocked) return;
    let cancelled = false;
    const run = async () => {
      if (autoCreate) setCreating(true);
      setError(null);
      try {
        const result = await ensureBirthDataInvite(supabase, {
          userId,
          personId,
          person,
          createIfMissing: autoCreate
        });
        if (cancelled) return;
        if (result.status === "refused") {
          setRefused(true);
          return;
        }
        if (result.status === "idle") return;
        setLink(result.url);
        setReused(result.reused);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to create a link.");
      } finally {
        if (!cancelled) setCreating(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, personId, autoCreate, blocked, isMinor, birthDate, birthPrecision]);

  async function createLink() {
    if (!userId) {
      setError("Please sign in first.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await ensureBirthDataInvite(supabase, {
        userId,
        personId,
        person,
        createIfMissing: true
      });
      if (result.status === "refused") {
        setRefused(true);
        return;
      }
      if (result.status === "idle") return;
      setLink(result.url);
      setReused(result.reused);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create a link.");
    } finally {
      setCreating(false);
    }
  }

  async function share() {
    if (!link) return;
    try {
      await Share.share({ message: `${askBirthDataSendCopy(personName)} ${link}` });
    } catch {
      /* cancelled */
    }
  }

  if (refused || blocked) return null;

  if (link) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: tokens.colors.mist, fontSize: 13, lineHeight: 18 }}>
          {askBirthDataSendCopy(personName)}
        </Text>
        {reused ? (
          <Text style={{ color: tokens.colors.mist2, fontSize: 12 }}>{ASK_BIRTH_DATA_REUSED}</Text>
        ) : null}
        <Text selectable style={{ color: tokens.colors.cream, fontSize: 13 }}>
          {link}
        </Text>
        <Pressable
          onPress={() => void share()}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            paddingVertical: 8,
            paddingHorizontal: 12,
            alignSelf: "flex-start"
          }}
        >
          <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>{ASK_BIRTH_DATA_SHARE}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => void createLink()}
        disabled={creating}
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: tokens.colors.line,
          paddingVertical: 8,
          paddingHorizontal: 12,
          alignSelf: "flex-start",
          flexDirection: "row",
          gap: 8,
          alignItems: "center"
        }}
      >
        {creating ? <ActivityIndicator size="small" color={tokens.colors.gold} /> : null}
        <Text style={{ color: tokens.colors.cream, fontWeight: "700" }}>
          {creating ? ASK_BIRTH_DATA_CREATING : askBirthDataAskCopy(personName)}
        </Text>
      </Pressable>
      {error ? <Text style={{ color: tokens.colors.rose, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

export { ASK_BIRTH_DATA_TOGGLE };
