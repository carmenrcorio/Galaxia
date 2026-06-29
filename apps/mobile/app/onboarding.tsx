import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";

const precisionTiers = [
  { label: "Exact", unlocks: "Full chart with houses, ascendant, and precise Moon details." },
  { label: "Date only", unlocks: "Reliable planetary signs and generational layer." },
  { label: "Year / decade", unlocks: "Generational layer and broad archetypal context." }
];

export default function OnboardingScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.colors.ink2,
        paddingHorizontal: 20,
        paddingTop: 60,
        gap: 14
      }}
    >
      <Text style={{ color: tokens.colors.cream, fontSize: 28, fontWeight: "700" }}>
        You first
      </Text>
      <Text style={{ color: tokens.colors.mist, fontSize: 15, lineHeight: 21 }}>
        Add your own birth data at any precision. Year-only is first-class for ancestors and partial profiles.
      </Text>
      {precisionTiers.map((tier) => (
        <View
          key={tier.label}
          style={{
            backgroundColor: tokens.colors.ink3,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: tokens.colors.line,
            padding: 14,
            gap: 6
          }}
        >
          <Text style={{ color: tokens.colors.gold, fontSize: 16, fontWeight: "700" }}>{tier.label}</Text>
          <Text style={{ color: tokens.colors.cream, lineHeight: 20 }}>{tier.unlocks}</Text>
        </View>
      ))}
    </View>
  );
}
