import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/providers/auth-provider";

export default function HomeScreen() {
  const { session, loading, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const authenticate = async (mode: "sign-in" | "sign-up") => {
    setSubmitting(true);
    setError(null);
    try {
      const fn = mode === "sign-in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { data, error: authError } = await fn({ email, password });
      if (authError) {
        setError(authError.message);
      }
      if (mode === "sign-up" && data.user?.id) {
        await supabase.from("profiles").upsert({ id: data.user.id, display_name: email.split("@")[0] });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.ink, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={tokens.colors.gold} />
      </View>
    );
  }

  if (!session) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.colors.ink,
          paddingHorizontal: 20,
          justifyContent: "center",
          gap: 14
        }}
      >
        <Text style={{ color: tokens.colors.cream, fontSize: 34, fontWeight: "700" }}>Galaxia</Text>
        <Text style={{ color: tokens.colors.mist, lineHeight: 22 }}>
          Sign in to begin your private constellation. Start with yourself, then add loved ones at any birth-data precision.
        </Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={tokens.colors.mist2}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={{
            backgroundColor: tokens.colors.ink2,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: tokens.colors.cream
          }}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={tokens.colors.mist2}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            backgroundColor: tokens.colors.ink2,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: tokens.colors.cream
          }}
        />
        {error ? <Text style={{ color: tokens.colors.rose }}>{error}</Text> : null}
        <Pressable
          onPress={() => authenticate("sign-in")}
          disabled={submitting}
          style={{ backgroundColor: tokens.colors.gold, borderRadius: 999, paddingVertical: 12 }}
        >
          <Text style={{ color: tokens.colors.ink, textAlign: "center", fontWeight: "700" }}>
            {submitting ? "Please wait..." : "Sign in"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => authenticate("sign-up")}
          disabled={submitting}
          style={{
            borderWidth: 1,
            borderColor: tokens.colors.line,
            borderRadius: 999,
            paddingVertical: 12
          }}
        >
          <Text style={{ color: tokens.colors.cream, textAlign: "center", fontWeight: "700" }}>Create account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.ink,
        paddingHorizontal: 20,
        justifyContent: "center",
        gap: 18
      }}
    >
      <Text style={{ color: tokens.colors.cream, fontSize: 34, fontWeight: "700" }}>
        Welcome back
      </Text>
      <Text style={{ color: tokens.colors.mist, fontSize: 16, lineHeight: 22 }}>
        Continue onboarding to save your chart and add people you care about.
      </Text>
      <Link href="/onboarding" asChild>
        <Pressable
          style={{
            backgroundColor: tokens.colors.gold,
            borderRadius: 999,
            paddingVertical: 14,
            paddingHorizontal: 18
          }}
        >
          <Text style={{ color: tokens.colors.ink, fontWeight: "700", textAlign: "center" }}>
            Open onboarding
          </Text>
        </Pressable>
      </Link>
      <Link href="/profile/self" asChild>
        <Pressable style={{ borderWidth: 1, borderColor: tokens.colors.goldSoft, borderRadius: 999, paddingVertical: 12 }}>
          <Text style={{ color: tokens.colors.cream, fontWeight: "700", textAlign: "center" }}>Open my profile</Text>
        </Pressable>
      </Link>
      <Link href="/compare" asChild>
        <Pressable style={{ borderWidth: 1, borderColor: tokens.colors.line, borderRadius: 999, paddingVertical: 12 }}>
          <Text style={{ color: tokens.colors.cream, fontWeight: "700", textAlign: "center" }}>Open compare</Text>
        </Pressable>
      </Link>
      <Pressable
        onPress={signOut}
        style={{ borderWidth: 1, borderColor: tokens.colors.line, borderRadius: 999, paddingVertical: 12 }}
      >
        <Text style={{ color: tokens.colors.cream, fontWeight: "700", textAlign: "center" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
