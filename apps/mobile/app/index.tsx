import { tokens } from "@galaxia/ui";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function HomeScreen() {
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
        Galaxia
      </Text>
      <Text style={{ color: tokens.colors.mist, fontSize: 16, lineHeight: 22 }}>
        Mobile-first relationship intelligence with a deterministic astrology engine and private AI guidance.
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
            Start onboarding
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
