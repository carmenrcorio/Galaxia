import { tokens } from "@galaxia/ui";
import { BlurView } from "expo-blur";
import { forwardRef, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { fonts } from "../lib/typography";

/**
 * Landing glass recipe (`apps/web/app/globals.css` `.glass-card`): gold
 * hairline, radius 22, blur 22px / saturate 1.15, cream wash, top catch light.
 * `expo-blur` stands in for backdrop-filter; the wash keeps Android from
 * collapsing to a flat ink3 slab.
 */

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padding?: number;
  testID?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function GlassCard({ children, style, contentStyle, padding = tokens.spacing.xl, testID, onLayout }: GlassCardProps) {
  return (
    <View testID={testID} onLayout={onLayout} style={[styles.card, style]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(255,255,255,0.035)",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: "rgba(255,255,255,0.06)"
          }
        ]}
      />
      <View style={[{ padding, gap: 8 }, contentStyle]}>{children}</View>
    </View>
  );
}

type PillProps = PressableProps & {
  children: ReactNode;
  accessibilityLabel: string;
};

export const Pill = forwardRef<View, PillProps>(function Pill(
  { children, accessibilityLabel, style, ...rest },
  ref
) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={(state) => [styles.pill, typeof style === "function" ? style(state) : style]}
      {...rest}
    >
      <Text style={styles.pillText}>{children}</Text>
    </Pressable>
  );
});

type ChipProps = PressableProps & {
  children: ReactNode;
};

export const Chip = forwardRef<View, ChipProps>(function Chip({ children, style, ...rest }, ref) {
  return (
    <Pressable
      ref={ref}
      style={(state) => [styles.chip, typeof style === "function" ? style(state) : style]}
      {...rest}
    >
      {children}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(230,174,108,0.13)",
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 24 }
  },
  pill: {
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  pillText: {
    color: tokens.colors.cream,
    fontFamily: fonts.interSemi
  },
  chip: {
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.03)"
  }
});
