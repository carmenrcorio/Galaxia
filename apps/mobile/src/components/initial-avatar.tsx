import { personChipColor, personInitials } from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";

const SIZES = { sm: 28, md: 42, lg: 54 } as const;

export function InitialAvatar({
  name,
  size = "md",
  personId,
  sunSign,
  memorial = false,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  personId?: string;
  sunSign?: string | null;
  memorial?: boolean;
}) {
  const color = personChipColor({ id: personId || name, sunSign });
  const dim = SIZES[size];
  const label = memorial ? `${name}, remembered` : name;
  return (
    <View
      accessibilityLabel={label}
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: color.fill,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Text style={{ color: color.initial, fontWeight: "700", fontSize: Math.round(dim * 0.38) }}>
        {personInitials(name)}
      </Text>
      {memorial ? (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{
            position: "absolute",
            right: -3,
            bottom: -2,
            fontSize: Math.round(dim * 0.32),
            color: tokens.colors.goldSoft,
          }}
        >
          ✦
        </Text>
      ) : null}
    </View>
  );
}
