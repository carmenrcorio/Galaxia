/**
 * Tap detail sheet for a planet glyph on the natal wheel. Same content model
 * as the web hover card (`@galaxia/core` planetTooltipContent), rendered with
 * the bottom-sheet recipe the glossary tooltip already uses: dark glass card,
 * gold hairline, cream type.
 *
 * Dismiss: tap the scrim, drag the sheet down, or the OS back gesture
 * (`onRequestClose`).
 */

import {
  PLANET_TOOLTIP_DISMISS_LABEL,
  PLANET_TOOLTIP_FULL_READING_MOBILE,
  planetTooltipSummary,
  signElement,
  type PlanetTooltipContent,
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useRef } from "react";
import { Modal, PanResponder, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "../lib/typography";
import { RetrogradeBadge } from "./retrograde-badge";

/** Downward drag that counts as a dismiss. */
const SWIPE_DISMISS_PX = 56;

export type WheelPlanetSheetProps = {
  content: PlanetTooltipContent | null;
  /** Sign this glyph sits in, for the element tint on the sign line. */
  sign: string;
  onClose: () => void;
  onSeeFullReading: () => void;
};

export function WheelPlanetSheet({ content, sign, onClose, onSeeFullReading }: WheelPlanetSheetProps) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > SWIPE_DISMISS_PX) closeRef.current();
      },
    }),
  ).current;

  if (!content) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={PLANET_TOOLTIP_DISMISS_LABEL}
        onPress={onClose}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(10, 7, 23, 0.55)" }}
      >
        <Pressable
          accessibilityLabel={planetTooltipSummary(content)}
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: tokens.colors.ink2,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderWidth: 1,
            borderColor: "rgba(230, 174, 108, 0.22)",
            paddingTop: 10,
            paddingHorizontal: 18,
            paddingBottom: 20,
            gap: 6,
          }}
          {...pan.panHandlers}
        >
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 999,
              alignSelf: "center",
              marginBottom: 12,
              backgroundColor: "rgba(230, 174, 108, 0.35)",
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={{ color: tokens.colors.cream, fontFamily: fonts.frauncesSemi, fontSize: 19 }}>
              {content.name}
            </Text>
            <RetrogradeBadge retro={content.retroLabel != null} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text
              style={{
                color: tokens.colors[signElement(sign)],
                fontSize: 15,
                fontFamily: fonts.interSemi,
              }}
            >
              {content.signLine}
            </Text>
            {content.houseLine ? (
              <Text
                style={{
                  color: tokens.colors.goldSoft,
                  fontSize: 12,
                  borderWidth: 1,
                  borderColor: "rgba(230, 174, 108, 0.25)",
                  backgroundColor: "rgba(230, 174, 108, 0.12)",
                  borderRadius: 6,
                  overflow: "hidden",
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                }}
              >
                {content.houseLine}
              </Text>
            ) : null}
          </View>
          <Text
            style={{
              color: tokens.colors.mist2,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            {content.domain}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={PLANET_TOOLTIP_FULL_READING_MOBILE}
            onPress={onSeeFullReading}
            style={{
              marginTop: 12,
              borderWidth: 1,
              borderColor: tokens.colors.gold,
              borderRadius: 999,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: tokens.colors.gold, fontWeight: "700", textAlign: "center" }}>
              {PLANET_TOOLTIP_FULL_READING_MOBILE}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
