/**
 * Tap glossary sheet for Expo. Same slugs as web GlossaryTerm.
 * Bottom sheet follows the compare-person-picker panel--sheet recipe:
 * dark glass card, gold hairline, cream type.
 */

import {
  GLOSSARY_SEE_FULL_DEFINITION,
  getGlossaryTerm,
  glossaryPreview,
} from "@galaxia/core";
import { tokens } from "@galaxia/ui";
import { useState, type ReactNode } from "react";
import { Linking, Modal, Pressable, Text, type TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { siteUrl } from "../lib/env";
import { fonts } from "../lib/typography";

type Props = {
  glossarySlug?: string;
  term?: string;
  meaning?: string;
  children?: ReactNode;
  style?: TextStyle;
};

export function GlossaryTooltip({ glossarySlug, term, meaning, children, style }: Props) {
  const entry = glossarySlug ? getGlossaryTerm(glossarySlug) : undefined;
  const resolvedTerm = entry?.term ?? term ?? "";
  const resolvedMeaning = entry ? glossaryPreview(entry.definition) : meaning ?? "";
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  if ((glossarySlug && !entry) || !resolvedMeaning) {
    return <Text style={style}>{children ?? resolvedTerm}</Text>;
  }

  const origin = siteUrl();
  const href = origin && glossarySlug ? `${origin}/glossary#${glossarySlug}` : null;

  return (
    <View>
      <Text
        accessibilityRole="button"
        accessibilityLabel={resolvedTerm}
        accessibilityHint={resolvedMeaning}
        onPress={() => setOpen(true)}
        style={[
          {
            color: tokens.colors.cream,
            textDecorationLine: "underline",
            textDecorationStyle: "dotted",
            textDecorationColor: tokens.colors.gold,
          },
          style,
        ]}
      >
        {children ?? resolvedTerm}
      </Text>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss definition"
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(10, 7, 23, 0.55)",
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: tokens.colors.ink2,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(230, 174, 108, 0.22)",
              paddingTop: 18,
              paddingHorizontal: 16,
              paddingBottom: 20 + insets.bottom,
              gap: 10,
            }}
          >
            <Text
              style={{
                color: tokens.colors.gold,
                fontFamily: fonts.frauncesSemi,
                fontSize: 16,
              }}
            >
              {resolvedTerm}
            </Text>
            <Text style={{ color: tokens.colors.cream, fontSize: 14, lineHeight: 21 }}>
              {resolvedMeaning}
            </Text>
            {href ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={GLOSSARY_SEE_FULL_DEFINITION}
                onPress={() => void Linking.openURL(href)}
              >
                <Text
                  style={{
                    color: tokens.colors.mist,
                    fontSize: 13,
                    textDecorationLine: "underline",
                  }}
                >
                  {GLOSSARY_SEE_FULL_DEFINITION}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
