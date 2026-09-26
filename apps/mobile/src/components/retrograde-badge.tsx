/**
 * Natal retrograde indicator. Renders only when `Placement.retro` is true.
 * FOUNDER-REVIEW: "Rx" label and its position (inline after the sign,
 * or at the top-right of a glyph wrap).
 */

import {
  RETROGRADE_BADGE_ARIA_LABEL,
  RETROGRADE_BADGE_LABEL
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { Text, View } from "react-native";

export function RetrogradeBadge({
  retro,
  corner = false
}: {
  retro: boolean;
  corner?: boolean;
}) {
  if (!retro) return null;
  return (
    <View
      accessibilityLabel={RETROGRADE_BADGE_ARIA_LABEL}
      style={
        corner
          ? { position: "absolute", top: -3, right: -6 }
          : { marginLeft: 4 }
      }
    >
      <Text
        style={{
          color: tokens.colors.mist2,
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.4,
          lineHeight: 12
        }}
      >
        {RETROGRADE_BADGE_LABEL}
      </Text>
    </View>
  );
}
